const express = require('express');
const router = express.Router();
const { sendDailyReminders } = require('../utils/reminderService');

// Endpoint manual para testing (solo en desarrollo)
router.post('/send-reminders-now', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      success: false, 
      message: 'Este endpoint solo está disponible en desarrollo' 
    });
  }

  try {
    const result = await sendDailyReminders();
    res.json({
      success: true,
      message: 'Recordatorios procesados',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error procesando recordatorios',
      error: error.message
    });
  }
});

module.exports = router;
