const express = require('express');
const router = express.Router();

const {
    createReservation,
    createPublicReservation,
    getActiveReservations,
    getAllReservations,
    updateReservation,
    cancelReservation
} = require('../controllers/reservacionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createReservationValidation } = require('../validators/authValidator');

router.post('/', createReservationValidation, (req, res, next) => {
    const authHeader = req.headers.authorization || '';

    if (authHeader) {
        return authenticateToken(req, res, () => authorizeRoles('Cliente')(req, res, () => createReservation(req, res, next)));
    }

    return createPublicReservation(req, res, next);
});

router.get(
    '/activas',
    authenticateToken,
    authorizeRoles('Cliente'),
    getActiveReservations
);

router.get(
    '/todas',
    authenticateToken,
    authorizeRoles('Cliente'),
    getAllReservations
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

