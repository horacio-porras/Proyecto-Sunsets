const express = require('express');
const router = express.Router();
//const chatbotController = require('../controllers/chatbotController');
const { registerConversation } = require('../controllers/chatbotController');

//Ruta de registro del chatbot
router.post('/', registerConversation);

module.exports = router;

