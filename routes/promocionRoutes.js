const express = require('express');
const router = express.Router();
const promocionController = require('../controllers/promocionController');
const { authenticateToken } = require('../middleware/auth');

// Crear promoción (requiere autenticación)
router.post('/crear', authenticateToken, promocionController.crearPromocion);

// Obtener promociones activas y futuras (público o autenticado según necesidad)
router.get('/activas', authenticateToken, promocionController.obtenerPromocionesActivas);
router.get('/futuras', authenticateToken, promocionController.obtenerPromocionesFuturas);

module.exports = router;