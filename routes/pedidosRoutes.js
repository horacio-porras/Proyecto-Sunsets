const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

//Middleware para verificar autenticación
const { authenticateToken } = require('../middleware/auth');

//Función para determinar el área de asignación basada en las categorías de productos
async function determinarAreaAsignacion(items, connection) {
    try {
        const productIds = items.map(item => item.id).filter(id => id !== null);
        
        if (productIds.length === 0) {
            return 'cocina';
        }

        const [categoriaRows] = await connection.execute(`
            SELECT DISTINCT c.nombre_categoria 
            FROM producto p 
            JOIN categoria c ON p.id_categoria = c.id_categoria 
            WHERE p.id_producto IN (${productIds.map(() => '?').join(',')})
        `, productIds);

        const categorias = categoriaRows.map(row => row.nombre_categoria.toLowerCase());
        
        //Lógica de asignación: Bebidas y Postres van a sus áreas específicas, todo lo demás a Cocina
        if (categorias.some(cat => cat.includes('bebida') || cat.includes('bebidas'))) {
            return 'bebidas';
        }
        
        if (categorias.some(cat => cat.includes('postre') || cat.includes('postres'))) {
            return 'postres';
        }
        
        return 'cocina';
        
    } catch (error) {
        console.error('Error al determinar área de asignación:', error);
        return 'cocina';
    }
}

//Función para obtener un empleado disponible del área especificada
async function obtenerEmpleadoDisponible(area, connection) {
    try {
        //Busca empleados activos del área especificada, ordenados por menor carga de trabajo
        const [empleadoRows] = await connection.execute(`
            SELECT e.id_empleado, e.area_trabajo, u.nombre,
                   COUNT(p.id_pedido) as pedidos_activos
            FROM empleado e
            JOIN usuario u ON e.id_usuario = u.id_usuario
            LEFT JOIN pedido p ON e.id_empleado = p.id_empleado_asignado 
                AND p.estado_pedido IN ('pendiente', 'confirmado', 'preparando')
            WHERE e.area_trabajo = ? AND e.archivado = 0
            GROUP BY e.id_empleado, e.area_trabajo, u.nombre
            ORDER BY pedidos_activos ASC, e.id_empleado ASC
            LIMIT 1
        `, [area]);

        return empleadoRows.length > 0 ? empleadoRows[0].id_empleado : null;
        
    } catch (error) {
        console.error('Error al obtener empleado disponible:', error);
        return null;
    }
}

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

        //Verifica el tipo de usuario
        const [userRows] = await connection.execute(
            `SELECT u.id_usuario, r.nombre_rol FROM usuario u 
             JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.id_usuario = ?`,
            [userId]
        );

        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        const userRole = userRows[0].nombre_rol;
        let clienteId = null;

        //Si es cliente, obtiene su id_cliente
        if (userRole === 'Cliente') {
            const [clienteRows] = await connection.execute(
                `SELECT c.id_cliente FROM cliente c WHERE c.id_usuario = ?`,
                [userId]
            );
            if (clienteRows.length > 0) {
                clienteId = clienteRows[0].id_cliente;
            }
        }
        //Para empleados y administradores, clienteId será null (pedido como invitado)

        //Determina el área de asignación y obtiene empleado disponible
        const areaAsignacion = await determinarAreaAsignacion(items, connection);
        const empleadoAsignado = await obtenerEmpleadoDisponible(areaAsignacion, connection);


        const [pedidoResult] = await connection.execute(
            `INSERT INTO pedido (
                id_cliente, 
                id_direccion,
                id_empleado_asignado,
                subtotal, 
                impuestos, 
                descuentos,
                total, 
                estado_pedido, 
                fecha_pedido, 
                metodo_pago, 
                notas_especiales,
                puntos_otorgados
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', NOW(), ?, ?, ?)`,
            [
                clienteId,
                delivery.addressId || null,
                empleadoAsignado,
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
        
        //Solo aplica puntos de lealtad si es un cliente registrado
        if (clienteId && userRole === 'Cliente') {
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

//Endpoint para que invitados vean detalles de su pedido (sin autenticación)
router.get('/guest/:id', async (req, res) => {
    try {
        const pedidoId = req.params.id;
        
        const [pedidoRows] = await pool.execute(`
            SELECT p.id_pedido, p.estado_pedido, p.subtotal, p.impuestos, p.descuentos, p.total, p.fecha_pedido,
                   p.fecha_entrega_estimada, p.metodo_pago, p.notas_especiales, p.puntos_otorgados,
                   COALESCE(c.nombre, p.cliente_invitado_nombre) as cliente_nombre,
                   COALESCE(c.telefono, p.cliente_invitado_telefono) as cliente_telefono,
                   COALESCE(c.correo, p.cliente_invitado_email) as cliente_email,
                   d.direccion_completa, d.referencia
            FROM pedido p
            LEFT JOIN cliente cl ON p.id_cliente = cl.id_cliente
            LEFT JOIN usuario c ON cl.id_usuario = c.id_usuario
            LEFT JOIN direccion d ON p.id_direccion = d.id_direccion
            WHERE p.id_pedido = ? AND p.id_cliente IS NULL
        `, [pedidoId]);
        
        if (pedidoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado o no es un pedido de invitado'
            });
        }
        
        const pedido = pedidoRows[0];
        
        const [productosRows] = await pool.execute(`
            SELECT dp.id_detalle, dp.cantidad, dp.precio_unitario, dp.subtotal_item, dp.personalizaciones,
                   dp.notas_producto, pr.nombre as producto_nombre, pr.descripcion as producto_descripcion
            FROM detalle_pedido dp
            LEFT JOIN producto pr ON dp.id_producto = pr.id_producto
            WHERE dp.id_pedido = ?
        `, [pedidoId]);
        
        pedido.productos = productosRows;
        
        res.json({
            success: true,
            data: { pedido: pedido }
        });
        
    } catch (error) {
        console.error('Error al obtener detalles del pedido de invitado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
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

//Obtiene pedidos asignados a un empleado
router.get('/assigned', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.tipoUsuario;
        

        //Verifica que el usuario es un empleado
        if (userRole !== 'Empleado') {
            return res.status(403).json({
                success: false,
                message: 'Solo los empleados pueden ver pedidos asignados'
            });
        }

        const [empleadoRows] = await pool.execute(
            'SELECT id_empleado FROM empleado WHERE id_usuario = ?',
            [userId]
        );

        if (empleadoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        const empleadoId = empleadoRows[0].id_empleado;

        //Obtiene pedidos asignados al empleado
        const [pedidos] = await pool.execute(`
            SELECT 
                p.id_pedido,
                p.estado_pedido,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                p.total,
                p.fecha_pedido,
                p.fecha_entrega_estimada,
                p.metodo_pago,
                p.notas_especiales,
                COALESCE(c.nombre, p.cliente_invitado_nombre) as cliente_nombre,
                COALESCE(c.telefono, p.cliente_invitado_telefono) as cliente_telefono,
                COALESCE(c.correo, p.cliente_invitado_email) as cliente_email,
                d.direccion_completa,
                d.referencia,
                COUNT(dp.id_detalle) as total_items
            FROM pedido p
            LEFT JOIN cliente cl ON p.id_cliente = cl.id_cliente
            LEFT JOIN usuario c ON cl.id_usuario = c.id_usuario
            LEFT JOIN direccion d ON p.id_direccion = d.id_direccion
            LEFT JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
            WHERE p.id_empleado_asignado = ? 
            AND p.estado_pedido IN ('pendiente', 'confirmado', 'preparando', 'listo', 'en_camino')
            GROUP BY p.id_pedido
            ORDER BY p.fecha_pedido DESC
        `, [empleadoId]);


        res.json({
            success: true,
            data: {
                pedidos: pedidos
            }
        });

    } catch (error) {
        console.error('Error al obtener pedidos asignados:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

//Endpoint para obtener detalles completos de un pedido específico (para empleados y administradores)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pedidoId = req.params.id;
        const userRole = req.user.tipoUsuario;
        

        if (!['Empleado', 'Administrador', 'Cliente'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver detalles de pedidos'
            });
        }

        //Construye la consulta según el tipo de usuario
        let query = `
            SELECT 
                p.id_pedido,
                p.estado_pedido,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                p.total,
                p.fecha_pedido,
                p.fecha_entrega_estimada,
                p.metodo_pago,
                p.notas_especiales,
                p.puntos_otorgados,
                COALESCE(c.nombre, p.cliente_invitado_nombre) as cliente_nombre,
                COALESCE(c.telefono, p.cliente_invitado_telefono) as cliente_telefono,
                COALESCE(c.correo, p.cliente_invitado_email) as cliente_email,
                d.direccion_completa,
                d.referencia
            FROM pedido p
            LEFT JOIN cliente cl ON p.id_cliente = cl.id_cliente
            LEFT JOIN usuario c ON cl.id_usuario = c.id_usuario
            LEFT JOIN direccion d ON p.id_direccion = d.id_direccion
            WHERE p.id_pedido = ?
        `;
        
        let queryParams = [pedidoId];
        
        //Si es cliente, solo puede ver sus propios pedidos
        if (userRole === 'Cliente') {
            query += ` AND cl.id_usuario = ?`;
            queryParams.push(userId);
        }
        
        const [pedidoRows] = await pool.execute(query, queryParams);

        if (pedidoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        const pedido = pedidoRows[0];

        //Obtiene productos del pedido
        const [productosRows] = await pool.execute(`
            SELECT 
                dp.id_detalle,
                dp.cantidad,
                dp.precio_unitario,
                dp.subtotal_item,
                dp.personalizaciones,
                dp.notas_producto,
                pr.nombre as producto_nombre,
                pr.descripcion as producto_descripcion
            FROM detalle_pedido dp
            LEFT JOIN producto pr ON dp.id_producto = pr.id_producto
            WHERE dp.id_pedido = ?
        `, [pedidoId]);

        pedido.productos = productosRows;

        res.json({
            success: true,
            data: {
                pedido: pedido
            }
        });

    } catch (error) {
        console.error('Error al obtener detalles del pedido:', error);
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

        const areaAsignacion = await determinarAreaAsignacion(items, connection);
        const empleadoAsignado = await obtenerEmpleadoDisponible(areaAsignacion, connection);

        //Crea dirección para invitado
        let direccionId = null;
        if (addressText) {
            const [direccionResult] = await connection.execute(
                `INSERT INTO direccion (
                    id_cliente,
                    direccion_completa,
                    referencia
                ) VALUES (?, ?, ?)`,
                [
                    null,
                    addressText,
                    delivery.reference || null
                ]
            );
            direccionId = direccionResult.insertId;
        }

        //Crear el pedido para invitado (sin cliente_id)
        const [pedidoResult] = await connection.execute(
            `INSERT INTO pedido (
                id_cliente, 
                cliente_invitado_nombre,
                cliente_invitado_telefono,
                cliente_invitado_email,
                id_direccion, 
                id_empleado_asignado,
                subtotal, 
                impuestos, 
                descuentos, 
                total, 
                estado_pedido, 
                fecha_pedido, 
                metodo_pago, 
                notas_especiales,
                puntos_otorgados
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', NOW(), ?, ?, ?)`,
            [
                null,
                customer.name,
                customer.phone,
                customer.email || null,
                direccionId,
                empleadoAsignado,
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


//Endpoint para obtener empleados disponibles por área (para administradores)
router.get('/empleados-disponibles/:area', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { area } = req.params;

        //Verifica que el usuario sea administrador
        const [userRows] = await pool.execute(
            `SELECT r.nombre_rol FROM usuario u 
             JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.id_usuario = ?`,
            [userId]
        );

        if (userRows.length === 0 || userRows[0].nombre_rol !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a esta información'
            });
        }

        //Obtiene empleados del área especificada con su carga de trabajo
        const [empleadoRows] = await pool.execute(`
            SELECT 
                e.id_empleado,
                u.nombre,
                u.correo,
                e.area_trabajo,
                e.fecha_contratacion,
                COUNT(p.id_pedido) as pedidos_activos,
                GROUP_CONCAT(
                    CASE 
                        WHEN p.estado_pedido = 'pendiente' THEN CONCAT('Pendiente: ', p.id_pedido)
                        WHEN p.estado_pedido = 'confirmado' THEN CONCAT('Confirmado: ', p.id_pedido)
                        WHEN p.estado_pedido = 'preparando' THEN CONCAT('Preparando: ', p.id_pedido)
                    END
                    SEPARATOR ', '
                ) as pedidos_detalle
            FROM empleado e
            JOIN usuario u ON e.id_usuario = u.id_usuario
            LEFT JOIN pedido p ON e.id_empleado = p.id_empleado_asignado 
                AND p.estado_pedido IN ('pendiente', 'confirmado', 'preparando')
            WHERE e.area_trabajo = ? AND e.archivado = 0
            GROUP BY e.id_empleado, u.nombre, u.correo, e.area_trabajo, e.fecha_contratacion
            ORDER BY pedidos_activos ASC, u.nombre ASC
        `, [area]);

        res.json({
            success: true,
            data: {
                area: area,
                empleados: empleadoRows
            }
        });

    } catch (error) {
        console.error('Error al obtener empleados disponibles:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
