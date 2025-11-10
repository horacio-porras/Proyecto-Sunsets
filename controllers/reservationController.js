const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
const { sendReservationEmail } = require('../utils/mailer');

exports.createReservation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const {
      nombre,
      correo,
      telefono,
      fecha_reserva,
      hora_reserva,
      cantidad_personas,
      solicitudes_especiales,
      preferencia_mesa
    } = req.body;

    // Insertar reservación (recordatorio_enviado = FALSE por defecto)
    // Guardamos nombre, correo y teléfono en notas_especiales como JSON para poder enviar recordatorios
    const datosInvitado = JSON.stringify({ nombre, correo, telefono, notas: solicitudes_especiales || '' });
    
    const [result] = await pool.execute(
      `INSERT INTO reservacion (id_cliente, fecha_reserva, hora_reserva, cantidad_personas, estado_reserva, notas_especiales, fecha_creacion, recordatorio_enviado)
       VALUES (NULL, ?, ?, ?, 'Confirmada', ?, NOW(), FALSE)`,
      [fecha_reserva, hora_reserva, cantidad_personas, datosInvitado]
    );

    const idReserva = result.insertId;
    const numeroReserva = `R-${String(idReserva).padStart(6, '0')}`;

    // Enviar correo (si SMTP configurado)
    try {
      const { previewUrl } = await sendReservationEmail({
        to: correo,
        nombre,
        numeroReserva,
        fecha: fecha_reserva,
        hora: hora_reserva,
        personas: cantidad_personas
      });
      req._emailPreviewUrl = previewUrl;
    } catch (mailErr) {
      console.warn('No se pudo enviar correo de confirmación:', mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Reservación creada exitosamente',
      data: { id_reservacion: idReserva, numero_reserva: numeroReserva, preview_url: req._emailPreviewUrl }
    });
  } catch (error) {
    console.error('Error createReservation:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
