const express = require('express');
const router = express.Router();
const { authenticateToken, requireEmployee } = require('../middleware/auth');
const pedidoController = require('../controllers/pedidoController');

// GET /api/pedidos/assigned -> pedidos asignados al empleado autenticado
router.get('/assigned', authenticateToken, requireEmployee, pedidoController.getPedidosAsignados);

// PUT /api/pedidos/:id/status -> actualizar estado del pedido
router.put('/:id/status', authenticateToken, requireEmployee, pedidoController.updateEstadoPedido);

module.exports = router;
