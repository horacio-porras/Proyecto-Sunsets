const express = require('express');
const router = express.Router();

const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getPromociones,
    getPromocionesActivasPublic,
    createPromocion,
    updatePromocion,
    actualizarEstadoPromocion,
    deletePromocion
} = require('../controllers/promocionController');

router.get('/public/activas', getPromocionesActivasPublic);

//Rutas de inventario
router.get('/', authenticateToken, authorizeRoles('Administrador'), getPromociones);
router.post('/', authenticateToken, authorizeRoles('Administrador'), createPromocion);
router.put('/:id', authenticateToken, authorizeRoles('Administrador'), updatePromocion);
router.patch('/:id/estado', authenticateToken, authorizeRoles('Administrador'), actualizarEstadoPromocion);
router.delete('/:id', authenticateToken, authorizeRoles('Administrador'), deletePromocion);

module.exports = router;

