const { body } = require('express-validator');

const createReservationValidation = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('correo')
    .isEmail()
    .withMessage('Debe proporcionar un correo válido')
    .normalizeEmail(),
  body('telefono')
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('El teléfono debe tener entre 8 y 20 caracteres'),
  body('fecha_reserva')
    .isISO8601()
    .withMessage('La fecha de reserva debe estar en formato YYYY-MM-DD'),
  body('hora_reserva')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('La hora debe estar en formato HH:MM'),
  body('cantidad_personas')
    .isInt({ min: 1, max: 20 })
    .withMessage('La cantidad de personas debe estar entre 1 y 20'),
  body('solicitudes_especiales')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las solicitudes especiales no pueden exceder 1000 caracteres'),
  body('preferencia_mesa')
    .optional()
    .isIn([
      'Interior',
      'Terraza',
      'Ventana',
      'Cualquiera',
      'indoor',
      'outdoor',
      'window',
      'any'
    ])
    .withMessage('Preferencia de mesa inválida')
];

module.exports = { createReservationValidation };
