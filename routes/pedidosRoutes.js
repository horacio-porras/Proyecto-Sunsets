const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

//Middleware para verificar autenticación
const { authenticateToken } = require('../middleware/auth');

//Crea un nuevo pedido (para usuarios autenticados)
router.post('/', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.user.id;
        const { 
            items, 
            customer, 
            delivery, 
            payment, 
            subtotal, 
            deliveryFee, 
            taxes, 
            total,
            loyaltyPointsUsed 
        } = req.body;

        const [clienteRows] = await connection.execute(
            `SELECT c.id_cliente FROM cliente c JOIN usuario u ON c.id_usuario = u.id_usuario WHERE u.id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            });
        }

        const clienteId = clienteRows[0].id_cliente;

        const [pedidoResult] = await connection.execute(
            `INSERT INTO pedido (
                id_cliente, 
                id_direccion,
                subtotal, 
                impuestos, 
                descuentos,
                total, 
                estado_pedido, 
                fecha_pedido, 
                metodo_pago, 
                notas_especiales,
                puntos_otorgados
            ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', NOW(), ?, ?, ?)`,
            [
                clienteId,
                delivery.addressId || null,
                subtotal,
                taxes,
                loyaltyPointsUsed || 0,
                total,
                payment.method,
                delivery.instructions || null,
                Math.floor(subtotal / 100)
            ]
        );

        const pedidoId = pedidoResult.insertId;

        for (const item of items) {
            await connection.execute(
                `INSERT INTO detalle_pedido (
                    id_pedido, 
                    id_producto, 
                    cantidad, 
                    precio_unitario, 
                    subtotal_item
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    pedidoId,
                    item.id || null,
                    item.quantity,
                    item.price,
                    item.price * item.quantity
                ]
            );
        }

        const puntosGanados = Math.floor(subtotal / 100);
        
        if (loyaltyPointsUsed && loyaltyPointsUsed > 0) {
            await connection.execute(
                `UPDATE cliente 
                 SET puntos_acumulados = puntos_acumulados - ? + ? 
                 WHERE id_cliente = ?`,
                [loyaltyPointsUsed, puntosGanados, clienteId]
            );
        } else {
            await connection.execute(
                `UPDATE cliente 
                 SET puntos_acumulados = puntos_acumulados + ? 
                 WHERE id_cliente = ?`,
                [puntosGanados, clienteId]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: {
                pedidoId: pedidoId,
                numeroPedido: `#${pedidoId.toString().padStart(6, '0')}`
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        connection.release();
    }
});

//Obtiene los pedidos del cliente autenticado
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [clienteRows] = await pool.execute(
            `SELECT c.id_cliente FROM cliente c JOIN usuario u ON c.id_usuario = u.id_usuario WHERE u.id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            });
        }

        const clienteId = clienteRows[0].id_cliente;

        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        
        let query = `SELECT 
                p.id_pedido,
                p.fecha_pedido,
                p.estado_pedido,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                p.total,
                p.metodo_pago,
                p.notas_especiales,
                p.puntos_otorgados,
                COUNT(dp.id_detalle) as total_items
             FROM pedido p
             LEFT JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
             WHERE p.id_cliente = ?
             GROUP BY p.id_pedido
             ORDER BY p.fecha_pedido DESC`;
        
        if (limit && limit > 0) {
            query += ` LIMIT ${limit}`;
        }

        const [pedidos] = await pool.execute(query, [clienteId]);

        for (let pedido of pedidos) {
            const [detalles] = await pool.execute(
                `SELECT 
                    dp.id_producto,
                    dp.cantidad,
                    dp.precio_unitario,
                    dp.subtotal_item,
                    pr.nombre as producto_nombre,
                    pr.descripcion as producto_descripcion
                 FROM detalle_pedido dp
                 LEFT JOIN producto pr ON dp.id_producto = pr.id_producto
                 WHERE dp.id_pedido = ?`,
                [pedido.id_pedido]
            );
            
            pedido.items = detalles;
        }

        res.json({
            success: true,
            pedidos: pedidos
        });

    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

//Obtiene un pedido específico
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pedidoId = req.params.id;
        
        const [clienteRows] = await pool.execute(
            `SELECT c.id_cliente FROM cliente c JOIN usuario u ON c.id_usuario = u.id_usuario WHERE u.id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            });
        }

        const clienteId = clienteRows[0].id_cliente;

        const [pedidos] = await pool.execute(
            `SELECT 
                p.id_pedido,
                p.fecha_pedido,
                p.estado_pedido,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                p.total,
                p.metodo_pago,
                p.notas_especiales,
                p.puntos_otorgados
             FROM pedido p
             WHERE p.id_pedido = ? AND p.id_cliente = ?`,
            [pedidoId, clienteId]
        );

        if (pedidos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        const pedido = pedidos[0];

        const [detalles] = await pool.execute(
            `SELECT 
                dp.id_producto,
                dp.cantidad,
                dp.precio_unitario,
                dp.subtotal_item,
                pr.nombre as producto_nombre,
                pr.descripcion as producto_descripcion
             FROM detalle_pedido dp
             LEFT JOIN producto pr ON dp.id_producto = pr.id_producto
             WHERE dp.id_pedido = ?`,
            [pedidoId]
        );

        pedido.items = detalles;

        res.json({
            success: true,
            pedido: pedido
        });

    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

//Actualiza el estado del pedido (solo para empleados/admin)
router.put('/:id/estado', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pedidoId = req.params.id;
        const { estado } = req.body;

        const [userRows] = await pool.execute(
            `SELECT r.nombre_rol FROM usuario u 
             JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.id_usuario = ?`,
            [userId]
        );

        if (userRows.length === 0 || !['Empleado', 'Administrador'].includes(userRows[0].nombre_rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para actualizar pedidos'
            });
        }

        const estadosValidos = ['pendiente', 'confirmado', 'preparando', 'listo', 'en_camino', 'entregado', 'cancelado'];
        
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        await pool.execute(
            `UPDATE pedido SET estado_pedido = ? WHERE id_pedido = ?`,
            [estado, pedidoId]
        );

        res.json({
            success: true,
            message: 'Estado del pedido actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar estado del pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

//Crea un nuevo pedido (para invitados - sin autenticación)
router.post('/guest', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            items, 
            customer, 
            delivery, 
            payment, 
            subtotal, 
            deliveryFee, 
            taxes, 
            total, 
            loyaltyPointsUsed 
        } = req.body;

        console.log('Datos recibidos en /api/pedidos/guest:', {
            customer,
            delivery,
            hasAddressText: !!delivery?.addressText,
            hasAddressFields: !!(delivery?.address && delivery?.district && delivery?.canton && delivery?.province)
        });

        //Validar datos requeridos
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items del pedido son requeridos'
            });
        }

        if (!customer || !customer.name || !customer.phone) {
            return res.status(400).json({
                success: false,
                message: 'Datos del cliente son requeridos'
            });
        }

        //Validar dirección de entrega (puede venir en diferentes formatos)
        let addressText = '';
        if (delivery.addressText) {
            //Formato para usuarios autenticados
            addressText = delivery.addressText;
        } else if (delivery.address && delivery.district && delivery.canton && delivery.province) {
            //Formato para invitados
            addressText = `${delivery.address}, ${delivery.district}, ${delivery.canton}, ${delivery.province}`;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Dirección de entrega es requerida'
            });
        }

        //Crear el pedido para invitado (sin cliente_id)
        const [pedidoResult] = await connection.execute(
            `INSERT INTO pedido (
                id_cliente, 
                id_direccion, 
                subtotal, 
                impuestos, 
                descuentos, 
                total, 
                estado_pedido, 
                fecha_pedido, 
                metodo_pago, 
                notas_especiales,
                puntos_otorgados
            ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', NOW(), ?, ?, ?)`,
            [
                null,
                null,
                subtotal, 
                taxes, 
                loyaltyPointsUsed || 0, 
                total, 
                payment.method, 
                delivery.instructions || '', 
                0
            ]
        );

        const pedidoId = pedidoResult.insertId;

        //Inserta detalles del pedido
        for (const item of items) {
            await connection.execute(
                `INSERT INTO detalle_pedido (
                    id_pedido, 
                    id_producto, 
                    cantidad, 
                    precio_unitario, 
                    subtotal_item
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    pedidoId,
                    item.id,
                    item.quantity,
                    item.price,
                    item.price * item.quantity
                ]
            );
        }

        await connection.commit();

        //Genera el número de pedido
        const numeroPedido = `PED-${pedidoId.toString().padStart(6, '0')}`;

        res.json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: {
                pedidoId,
                numeroPedido,
                total,
                status: 'pendiente'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear pedido de invitado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
