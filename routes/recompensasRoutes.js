const express = require('express');
const router = express.Router();

const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getRecompensasAdmin,
    createRecompensa,
    updateRecompensa,
    actualizarEstadoRecompensa,
    deleteRecompensa
} = require('../controllers/recompensaController');

router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador'),
    getRecompensasAdmin
);

router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador'),
    createRecompensa
);

router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador'),
    updateRecompensa
);

router.patch(
    '/:id/estado',
    authenticateToken,
    authorizeRoles('Administrador'),
    actualizarEstadoRecompensa
);

router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador'),
    deleteRecompensa
);

module.exports = router;

