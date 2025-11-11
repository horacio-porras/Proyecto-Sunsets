const nodemailer = require('nodemailer');
const { Resend } = require('resend');

/**
 * Obtiene el proveedor de correo configurado
 * Soporta: Resend (recomendado), Gmail SMTP, o Ethereal (testing)
 */
async function getMailProvider() {
  const {
    MAIL_PROVIDER,
    RESEND_API_KEY,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
    SMTP_SERVICE
  } = process.env;

  const provider = (MAIL_PROVIDER || 'smtp').toLowerCase();

  // Opción 1: Resend (mejor entregabilidad)
  if (provider === 'resend') {
    if (!RESEND_API_KEY || !MAIL_FROM) {
      throw new Error('RESEND_API_KEY y MAIL_FROM son requeridos para usar Resend');
    }
    const resend = new Resend(RESEND_API_KEY);
    console.info('[Mailer] Usando Resend como proveedor de correo');
    return { type: 'resend', client: resend, from: MAIL_FROM };
  }

  // Opción 2: SMTP (Gmail u otro)
  if (provider === 'smtp') {
    if (!SMTP_USER || !SMTP_PASS || !MAIL_FROM || (!SMTP_HOST && !SMTP_SERVICE)) {
      console.warn('[Mailer] SMTP no configurado completamente. Usando cuenta de prueba Ethereal...');
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      return { type: 'smtp-test', transporter, from: `Sunset's Tarbaca <no-reply@sunsets.test>` };
    }

    const transporterOptions = SMTP_SERVICE
      ? {
          service: SMTP_SERVICE,
          auth: { user: SMTP_USER, pass: SMTP_PASS }
        }
      : {
          host: SMTP_HOST,
          port: Number(SMTP_PORT || 587),
          secure: String(SMTP_SECURE || 'false') === 'true',
          auth: { user: SMTP_USER, pass: SMTP_PASS }
        };

    const transporter = nodemailer.createTransport(transporterOptions);

    try {
      await transporter.verify();
      console.info(`[Mailer] Conexión SMTP verificada con ${SMTP_SERVICE || SMTP_HOST}:${transporterOptions.port || ''}`);
    } catch (verifyErr) {
      console.error('[Mailer] Error verificando conexión SMTP:', verifyErr.message);
      throw verifyErr;
    }

    return { type: 'smtp', transporter, from: MAIL_FROM };
  }

  throw new Error(`Proveedor de correo no soportado: ${provider}`);
}

async function sendReservationEmail({ to, nombre, numeroReserva, fecha, hora, personas }) {
  const provider = await getMailProvider();
  const { MAIL_BCC, REPLY_TO } = process.env;

  const subject = `Confirmacion de Reservacion #${numeroReserva} - Sunsets Tarbaca`;
  
  // HTML simple sin caracteres especiales problemáticos
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Reservacion Confirmada</h2>
  
  <p>Hola <strong>${nombre || 'Cliente'}</strong>,</p>
  
  <p>Gracias por reservar en <strong>Sunsets Tarbaca</strong>.</p>
  
  <div style="background-color: #f9f9f9; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Numero de reserva:</strong> ${numeroReserva}</p>
    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${fecha}</p>
    <p style="margin: 5px 0;"><strong>Hora:</strong> ${hora}</p>
    <p style="margin: 5px 0;"><strong>Personas:</strong> ${personas}</p>
  </div>
  
  <p>Presenta tu numero de reserva al llegar.</p>
  
  <p>Para modificar o cancelar, contactanos al <strong>+506 6171-4020</strong>.</p>
  
  <p>Te esperamos!</p>
  
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #777;">Este es un correo automatico. Por favor no respondas a este mensaje.</p>
</body>
</html>`;

  const text = `Reservacion Confirmada\n\n` +
    `Hola ${nombre || 'Cliente'},\n\n` +
    `Gracias por reservar en Sunsets Tarbaca.\n\n` +
    `Detalles de tu reservacion:\n` +
    `- Numero de reserva: ${numeroReserva}\n` +
    `- Fecha: ${fecha}\n` +
    `- Hora: ${hora}\n` +
    `- Personas: ${personas}\n\n` +
    `Presenta tu numero de reserva al llegar.\n\n` +
    `Para modificar o cancelar, contactanos al +506 6171-4020.\n\n` +
    `Te esperamos!\n\n` +
    `---\n` +
    `Este es un correo automatico.`;

  try {
    console.log(`[Mailer] Intentando enviar correo a: ${to}`);
    console.log(`[Mailer] Proveedor: ${provider.type}`);
    console.log(`[Mailer] Desde: ${provider.from}`);

    let result;

    // Enviar con Resend
    if (provider.type === 'resend') {
      const emailData = {
        from: provider.from,
        to: [to],
        subject,
        text,
        html,
        reply_to: REPLY_TO && REPLY_TO.trim().length > 0 ? REPLY_TO : undefined,
      };

      // Resend no soporta BCC directamente, pero podemos enviar un correo separado
      result = await provider.client.emails.send(emailData);
      
      // Enviar BCC como correo separado si está configurado
      if (MAIL_BCC && MAIL_BCC.trim().length > 0) {
        await provider.client.emails.send({
          ...emailData,
          to: [MAIL_BCC],
          subject: `[BCC] ${subject}`,
        });
      }

      console.log(`[Mailer] ✓ Correo enviado vía Resend. ID: ${result.data?.id || result.id}`);
      return { info: result, previewUrl: undefined };
    }

    // Enviar con SMTP (Gmail u otro)
    if (provider.type === 'smtp' || provider.type === 'smtp-test') {
      const headers = {
        'List-Unsubscribe': '<mailto:sunsettarb@gmail.com?subject=BAJA>',
      };

      const info = await provider.transporter.sendMail({
        from: provider.from,
        to,
        bcc: MAIL_BCC && MAIL_BCC.trim().length > 0 ? MAIL_BCC : undefined,
        replyTo: REPLY_TO && REPLY_TO.trim().length > 0 ? REPLY_TO : undefined,
        subject,
        text,
        html,
        headers
      });

      const accepted = Array.isArray(info.accepted) ? info.accepted.join(', ') : String(info.accepted);
      const rejected = Array.isArray(info.rejected) ? info.rejected.join(', ') : String(info.rejected);
      console.log(`[Mailer] ✓ Correo enviado vía SMTP. Message-ID: ${info.messageId}`);
      console.log(`[Mailer] SMTP response: ${info.response || '(sin response)'}`);
      console.log(`[Mailer] accepted: ${accepted || '[]'} | rejected: ${rejected || '[]'}`);

      const previewUrl = provider.type === 'smtp-test' ? nodemailer.getTestMessageUrl(info) : undefined;
      if (previewUrl) {
        console.log(`[Mailer] Preview URL: ${previewUrl}`);
      }

      return { info, previewUrl };
    }

    throw new Error(`Tipo de proveedor no soportado: ${provider.type}`);
  } catch (error) {
    console.error(`[Mailer] ✗ ERROR enviando correo a ${to}:`, error.message);
    console.error(`[Mailer] Detalles del error:`, error);
    throw error;
  }
}

module.exports = {
  sendReservationEmail,
  getMailProvider
};
