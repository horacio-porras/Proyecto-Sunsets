const { body } = require('express-validator');

//Validaciones para registro
const registerValidation = [
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),

    body('correo')
        .isEmail()
        .withMessage('Debe proporcionar un correo electrónico válido')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('El correo electrónico es demasiado largo'),

    body('telefono')
        .trim()
        .isLength({ min: 8, max: 20 })
        .withMessage('El teléfono debe tener entre 8 y 20 caracteres')
        .matches(/^[\+]?[0-9\s\-\(\)]+$/)
        .withMessage('Formato de teléfono inválido'),

    body('contrasena')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número')
        .isLength({ max: 255 })
        .withMessage('La contraseña es demasiado larga'),

    body('notificacionesActivas')
        .optional()
        .isBoolean()
        .withMessage('Las notificaciones activas deben ser un valor booleano')
];

//Validaciones para login
const loginValidation = [
    body('correo')
        .isEmail()
        .withMessage('Debe proporcionar un correo electrónico válido')
        .normalizeEmail(),

    body('contrasena')
        .notEmpty()
        .withMessage('La contraseña es requerida')
        .isLength({ min: 1 })
        .withMessage('La contraseña no puede estar vacía')
];

//Validaciones para cambio de contraseña
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('La contraseña actual es requerida'),

    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número')
        .isLength({ max: 128 })
        .withMessage('La nueva contraseña es demasiado larga'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            return true;
        })
];

//Validaciones para actualización de perfil
const profileUpdateValidation = [
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),

    body('correo')
        .optional()
        .isEmail()
        .withMessage('Debe proporcionar un correo electrónico válido')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('El correo electrónico es demasiado largo'),

    body('telefono')
        .optional()
        .trim()
        .isLength({ min: 8, max: 20 })
        .withMessage('El teléfono debe tener entre 8 y 20 caracteres')
        .matches(/^[\+]?[0-9\s\-\(\)]+$/)
        .withMessage('Formato de teléfono inválido'),

    body('nuevaContrasena')
        .optional()
        .isLength({ min: 8 })
        .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número')
        .isLength({ max: 128 })
        .withMessage('La nueva contraseña es demasiado larga'),

    body('contrasenaActual')
        .optional()
        .notEmpty()
        .withMessage('La contraseña actual es requerida para cambiar la contraseña'),

    body('notificacionesActivas')
        .optional()
        .isBoolean()
        .withMessage('Las notificaciones activas deben ser un valor booleano')
];

module.exports = {
    registerValidation,
    loginValidation,
    changePasswordValidation,
    profileUpdateValidation
};
