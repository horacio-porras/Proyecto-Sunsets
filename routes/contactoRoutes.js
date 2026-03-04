const express = require('express');
const { getMailProvider } = require('../utils/mailer');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      telefono = '',
      asunto,
      mensaje
    } = req.body || {};

    const nombreLimpio = String(nombre || '').trim();
    const apellidoLimpio = String(apellido || '').trim();
    const correoLimpio = String(correo || '').trim().toLowerCase();
    const asuntoLimpio = String(asunto || '').trim();
    const mensajeLimpio = String(mensaje || '').trim();
    const telefonoLimpio = String(telefono || '').replace(/\D/g, '');

    if (!nombreLimpio || !apellidoLimpio || !correoLimpio || !asuntoLimpio || !mensajeLimpio) {
      return res.status(400).json({
        success: false,
        message: 'Debes completar todos los campos obligatorios.'
      });
    }

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio);
    if (!correoValido) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no es válido.'
      });
    }

    if (telefono && !/^\d{8}$/.test(telefonoLimpio)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono debe tener exactamente 8 dígitos.'
      });
    }

    const provider = await getMailProvider();
    const empresaEmail = process.env.CONTACT_EMAIL || 'hoxttonx@gmail.com';
    const nombreCompleto = `${nombreLimpio} ${apellidoLimpio}`.trim();

    const subject = `Nuevo mensaje de contacto: ${asuntoLimpio}`;
    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${nombreCompleto}</p>
      <p><strong>Correo:</strong> ${correoLimpio}</p>
      <p><strong>Teléfono:</strong> ${telefonoLimpio || 'No indicado'}</p>
      <p><strong>Asunto:</strong> ${asuntoLimpio}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${mensajeLimpio.replace(/\n/g, '<br>')}</p>
    `;

    const text = [
      'Nuevo mensaje de contacto',
      `Nombre: ${nombreCompleto}`,
      `Correo: ${correoLimpio}`,
      `Telefono: ${telefonoLimpio || 'No indicado'}`,
      `Asunto: ${asuntoLimpio}`,
      '',
      'Mensaje:',
      mensajeLimpio
    ].join('\n');

    if (provider.type === 'resend') {
      await provider.client.emails.send({
        from: provider.from,
        to: [empresaEmail],
        subject,
        text,
        html,
        reply_to: correoLimpio
      });
    } else {
      await provider.transporter.sendMail({
        from: provider.from,
        to: empresaEmail,
        replyTo: correoLimpio,
        subject,
        text,
        html
      });
    }

    return res.json({
      success: true,
      message: 'Mensaje enviado correctamente.'
    });
  } catch (error) {
    console.error('Error al enviar mensaje de contacto:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudo enviar el mensaje de contacto.'
    });
  }
});

module.exports = router;
