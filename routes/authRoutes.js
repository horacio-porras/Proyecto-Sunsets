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

module.exports = router;

