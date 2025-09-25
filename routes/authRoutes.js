const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../validators/authValidator');

// Ruta de registro
router.post('/register', registerValidation, authController.register);

// Ruta de login
router.post('/login', loginValidation, authController.login);

// Ruta para verificar token
router.get('/verify', authenticateToken, authController.verifyToken);

// Ruta de logout
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;

