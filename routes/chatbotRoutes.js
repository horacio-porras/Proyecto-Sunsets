const express = require('express');
const router = express.Router();
const { registerConversation, procesarPregunta } = require('../controllers/chatbotController');

// Ruta para procesar preguntas del chatbot
router.post('/ask', procesarPregunta);

// Ruta de registro del chatbot (mantener para compatibilidad)
router.post('/', registerConversation);

module.exports = router;

