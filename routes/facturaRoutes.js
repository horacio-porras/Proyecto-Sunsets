const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const {
    obtenerFactura,
    descargarFacturaPDF,
    obtenerFacturasCliente,
    generarFacturaAutomatica
} = require('../controllers/facturaController');

// Obtener facturas del cliente autenticado
router.get('/cliente', authenticateToken, obtenerFacturasCliente);

// Generar factura para un pedido específico (si no existe)
router.post('/pedido/:pedidoId/generar', authenticateToken, async (req, res) => {
    try {
        const { pedidoId } = req.params;
        const userId = req.user.id;

        // Verificar que el pedido pertenece al cliente
        const [pedidoRows] = await pool.execute(`
            SELECT p.id_pedido, p.id_cliente, c.id_usuario
            FROM pedido p
            LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
            WHERE p.id_pedido = ?
        `, [pedidoId]);

        if (pedidoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        const pedido = pedidoRows[0];
        if (pedido.id_cliente && pedido.id_usuario !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a este pedido'
            });
        }

        // Verificar si ya existe factura
        const [facturaExistente] = await pool.execute(
            'SELECT id_factura FROM factura WHERE id_pedido = ?',
            [pedidoId]
        );

        if (facturaExistente.length > 0) {
            return res.json({
                success: true,
                message: 'La factura ya existe para este pedido',
                factura_id: facturaExistente[0].id_factura
            });
        }

        // Generar factura
        const connection = await pool.getConnection();
        try {
            const idFactura = await generarFacturaAutomatica(pedidoId, connection);
            res.json({
                success: true,
                message: 'Factura generada exitosamente',
                factura_id: idFactura
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error al generar factura manual:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar la factura: ' + (error.message || 'Error desconocido')
        });
    }
});

// Obtener factura por ID
router.get('/:id', authenticateToken, obtenerFactura);

// Descargar PDF de factura
router.get('/:id/pdf', authenticateToken, descargarFacturaPDF);

module.exports = router;

