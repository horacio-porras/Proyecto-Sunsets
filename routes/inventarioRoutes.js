const express = require('express');
const router = express.Router();
const { authenticateToken, requireEmployee } = require('../middleware/auth');
const inventarioController = require('../controllers/inventarioController');

// GET /api/inventario?area=cocina
router.get('/', authenticateToken, requireEmployee, inventarioController.getInventarioPorArea);

module.exports = router;
