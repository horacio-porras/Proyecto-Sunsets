const express = require('express');
const router = express.Router();

const { createReservation, getActiveReservations, updateReservation, cancelReservation } = require('../controllers/reservacionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post(
    '/',
    authenticateToken,
    authorizeRoles('Cliente'),
    createReservation
);

router.get(
    '/activas',
    authenticateToken,
    authorizeRoles('Cliente'),
    getActiveReservations
);

router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Cliente'),
    updateReservation
);

router.patch(
    '/:id/cancel',
    authenticateToken,
    authorizeRoles('Cliente'),
    cancelReservation
);

module.exports = router;

