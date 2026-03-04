const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { registerValidation, loginValidation, profileUpdateValidation } = require('../validators/authValidator');

//Ruta de registro
router.post('/register', registerValidation, authController.register);

//Ruta de login
router.post('/login', loginValidation, authController.login);

//Ruta para verificar token
router.get('/verify', authenticateToken, authController.verifyToken);

//Ruta de logout
router.post('/logout', authenticateToken, authController.logout);

//Ruta para obtener perfil
router.get('/profile', authenticateToken, authController.getProfile);

//Ruta para actualizar perfil
router.put('/profile', authenticateToken, profileUpdateValidation, authController.updateProfile);

//Ruta para solicitar recuperación de contraseña (sin autenticación requerida)
router.post('/forgot-password', authController.forgotPassword);

//Ruta para cambiar contraseña usando token del link (sin autenticación requerida)
router.post('/reset-password', authController.resetPassword);

//Ruta para cambiar contraseña temporal (requiere autenticación)
router.post('/change-temporary-password', authenticateToken, authController.cambiarContrasenaTemporal);

module.exports = router;

