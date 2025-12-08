const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
    generarPDFVentas,
    generarPDFClientes,
    generarPDFPedidos,
    generarPDFActividad,
    generarExcelVentas,
    generarExcelClientes,
    generarExcelPedidos,
    generarExcelActividad
} = require('../utils/reportes');

/**
 * GET /api/reportes/ventas
 * Genera reporte de ventas en PDF o Excel
 */
router.get('/ventas', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.tipoUsuario;
        
        if (userRole !== 'Administrador') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a esta información' 
            });
        }

        const formato = req.query.formato || 'pdf'; // pdf o excel
        const fechaDesde = req.query.fechaDesde || null;
        const fechaHasta = req.query.fechaHasta || null;

        // Obtener datos de ventas
        let query = `
            SELECT 
                p.id_pedido,
                p.fecha_pedido,
                p.estado_pedido,
                p.total,
                COALESCE(u.nombre, p.cliente_invitado_nombre) as cliente_nombre
            FROM pedido p
            LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE 1=1
        `;

        const params = [];

        if (fechaDesde) {
            query += ` AND DATE(p.fecha_pedido) >= ?`;
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            query += ` AND DATE(p.fecha_pedido) <= ?`;
            params.push(fechaHasta);
        }

        query += ` ORDER BY p.fecha_pedido DESC`;

        const [pedidos] = await pool.execute(query, params);

        // Calcular estadísticas
        const totalPedidos = pedidos.length;
        const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
        const promedioPedido = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

        const datos = {
            pedidos,
            totalPedidos,
            totalVentas,
            promedioPedido,
            fechaDesde,
            fechaHasta
        };

        // Generar archivo según formato
        if (formato === 'excel') {
            const buffer = await generarExcelVentas(datos);
            const filename = `reporte_ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } else {
            const pdfBuffer = await generarPDFVentas(datos);
            const filename = `reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfBuffer);
        }

    } catch (error) {
        console.error('Error al generar reporte de ventas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/reportes/clientes
 * Genera reporte de clientes en PDF o Excel
 */
router.get('/clientes', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.tipoUsuario;
        
        if (userRole !== 'Administrador') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a esta información' 
            });
        }

        const formato = req.query.formato || 'pdf';

        // Obtener datos de clientes
        const query = `
            SELECT 
                c.id_cliente,
                u.nombre,
                u.correo,
                u.telefono,
                u.activo,
                COUNT(DISTINCT p.id_pedido) as total_pedidos
            FROM cliente c
            INNER JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN pedido p ON c.id_cliente = p.id_cliente
            GROUP BY c.id_cliente, u.nombre, u.correo, u.telefono, u.activo
            ORDER BY total_pedidos DESC, u.nombre ASC
        `;

        const [clientes] = await pool.execute(query);

        const clientesActivos = clientes.filter(c => c.activo === 1).length;

        const datos = {
            clientes,
            totalClientes: clientes.length,
            clientesActivos
        };

        // Generar archivo según formato
        if (formato === 'excel') {
            const buffer = await generarExcelClientes(datos);
            const filename = `reporte_clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } else {
            const pdfBuffer = await generarPDFClientes(datos);
            const filename = `reporte_clientes_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfBuffer);
        }

    } catch (error) {
        console.error('Error al generar reporte de clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/reportes/pedidos
 * Genera reporte de pedidos en PDF o Excel
 */
router.get('/pedidos', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.tipoUsuario;
        
        if (userRole !== 'Administrador') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a esta información' 
            });
        }

        const formato = req.query.formato || 'pdf';
        const fechaDesde = req.query.fechaDesde || null;
        const fechaHasta = req.query.fechaHasta || null;
        const estado = req.query.estado || null;

        // Obtener datos de pedidos
        let query = `
            SELECT 
                p.id_pedido,
                p.fecha_pedido,
                p.estado_pedido,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                p.total,
                p.metodo_pago,
                COALESCE(u.nombre, p.cliente_invitado_nombre) as cliente_nombre
            FROM pedido p
            LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE 1=1
        `;

        const params = [];

        if (fechaDesde) {
            query += ` AND DATE(p.fecha_pedido) >= ?`;
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            query += ` AND DATE(p.fecha_pedido) <= ?`;
            params.push(fechaHasta);
        }

        if (estado) {
            query += ` AND p.estado_pedido = ?`;
            params.push(estado);
        }

        query += ` ORDER BY p.fecha_pedido DESC`;

        const [pedidos] = await pool.execute(query, params);

        const totalPedidos = pedidos.length;
        const totalIngresos = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);

        const datos = {
            pedidos,
            totalPedidos,
            totalIngresos,
            fechaDesde,
            fechaHasta
        };

        // Generar archivo según formato
        if (formato === 'excel') {
            const buffer = await generarExcelPedidos(datos);
            const filename = `reporte_pedidos_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } else {
            const pdfBuffer = await generarPDFPedidos(datos);
            const filename = `reporte_pedidos_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfBuffer);
        }

    } catch (error) {
        console.error('Error al generar reporte de pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/reportes/actividad
 * Genera reporte de actividad en PDF o Excel
 */
router.get('/actividad', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.tipoUsuario;
        
        if (userRole !== 'Administrador') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a esta información' 
            });
        }

        const formato = req.query.formato || 'pdf';
        const fechaDesde = req.query.fechaDesde || null;
        const fechaHasta = req.query.fechaHasta || null;
        const tabla = req.query.tabla || null;

        // Obtener datos de actividad
        let query = `
            SELECT 
                hc.id_cambio,
                hc.fecha_cambio,
                u.nombre as usuario_nombre,
                hc.tabla_afectada,
                hc.accion_realizada
            FROM historial_cambios hc
            LEFT JOIN usuario u ON hc.id_usuario = u.id_usuario
            WHERE 1=1
        `;

        const params = [];

        if (fechaDesde) {
            query += ` AND DATE(hc.fecha_cambio) >= ?`;
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            query += ` AND DATE(hc.fecha_cambio) <= ?`;
            params.push(fechaHasta);
        }

        if (tabla) {
            query += ` AND hc.tabla_afectada = ?`;
            params.push(tabla);
        }

        query += ` ORDER BY hc.fecha_cambio DESC`;

        const [cambios] = await pool.execute(query, params);

        // Obtener tablas únicas afectadas
        const tablasAfectadas = [...new Set(cambios.map(c => c.tabla_afectada))].filter(t => t).length;

        const datos = {
            cambios,
            totalCambios: cambios.length,
            tablasAfectadas,
            fechaDesde,
            fechaHasta
        };

        // Generar archivo según formato
        if (formato === 'excel') {
            const buffer = await generarExcelActividad(datos);
            const filename = `reporte_actividad_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } else {
            const pdfBuffer = await generarPDFActividad(datos);
            const filename = `reporte_actividad_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfBuffer);
        }

    } catch (error) {
        console.error('Error al generar reporte de actividad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

