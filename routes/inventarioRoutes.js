const express = require('express');
const router = express.Router();
const { authenticateToken, requireEmployee } = require('../middleware/auth');
const inventarioController = require('../controllers/inventarioController');

// GET /api/inventario?area=cocina - Obtener inventario por área
router.get('/', authenticateToken, requireEmployee, inventarioController.getInventarioPorArea);

// GET /api/inventario/areas - Obtener todas las áreas disponibles
router.get('/areas', authenticateToken, requireEmployee, inventarioController.getAreasInventario);

// PUT /api/inventario/:itemId - Actualizar cantidad de un item
router.put('/:itemId', authenticateToken, requireEmployee, inventarioController.actualizarCantidadItem);

module.exports = router;
