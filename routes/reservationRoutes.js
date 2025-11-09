const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { createReservationValidation } = require('../validators/reservationValidator');

// Crear nueva reservación (pública)
router.post('/', createReservationValidation, reservationController.createReservation);

module.exports = router;
