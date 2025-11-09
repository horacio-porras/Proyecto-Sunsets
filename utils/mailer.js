const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

async function getTransport() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    console.warn('SMTP no configurado completamente. Usando cuenta de prueba Ethereal...');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    return { transporter, from: `Sunset's Tarbaca <no-reply@sunsets.test>`, isTest: true };
  } else {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: String(SMTP_SECURE || 'false') === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    return { transporter, from: MAIL_FROM, isTest: false };
  }
}

async function sendReservationEmail({ to, nombre, numeroReserva, fecha, hora, personas }) {
  const { transporter, from, isTest } = await getTransport();

  const subject = `Confirmación de Reservación #${numeroReserva} - Sunset's Tarbaca`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="color:#ef4444;">¡Reservación Confirmada!</h2>
      <p>Hola ${nombre || ''},</p>
      <p>Gracias por reservar en <strong>Sunset's Tarbaca</strong>. Estos son los detalles de tu reservación:</p>
      <ul>
        <li><strong>Número de reserva:</strong> ${numeroReserva}</li>
        <li><strong>Fecha:</strong> ${fecha}</li>
        <li><strong>Hora:</strong> ${hora}</li>
        <li><strong>Personas:</strong> ${personas}</li>
      </ul>
      <p>Presenta tu número de reserva al llegar para agilizar tu registro.</p>
      <p>Si necesitas modificar o cancelar, contáctanos al <a href="tel:+50661714020">+506 6171-4020</a>.</p>
      <p>¡Te esperamos!</p>
      <hr />
      <small>Este es un correo automático, por favor no respondas a este mensaje.</small>
    </div>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html
  });

  const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) : undefined;
  return { info, previewUrl };
}

module.exports = {
  sendReservationEmail
};
