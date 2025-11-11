const { pool } = require('../config/database');
const { sendReservationEmail } = require('./mailer');

/**
 * Busca reservaciones para el día siguiente que necesitan recordatorio
 * y envía correos automáticamente
 */
async function sendDailyReminders() {
  try {
    console.log('[RECORDATORIOS] Iniciando búsqueda de reservaciones para mañana...');
    
    // Buscar reservaciones para el día siguiente que:
    // 1. No se haya enviado recordatorio aún (recordatorio_enviado = FALSE o NULL)
    // 2. Estado sea 'confirmada' o 'pendiente'
    // 3. Tengan correo válido
    const query = `
      SELECT 
        r.id_reservacion,
        r.fecha_reserva,
        r.hora_reserva,
        r.cantidad_personas,
        r.notas_especiales,
        CONCAT('R-', LPAD(r.id_reservacion, 6, '0')) as numero_reserva,
        u.nombre as nombre_usuario,
        u.correo as correo_usuario
      FROM reservacion r
      LEFT JOIN cliente c ON r.id_cliente = c.id_cliente
      LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
      WHERE r.fecha_reserva = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        AND (r.recordatorio_enviado = FALSE OR r.recordatorio_enviado IS NULL)
        AND r.estado_reserva IN ('confirmada', 'pendiente', 'Confirmada', 'Pendiente')
    `;

    const [reservaciones] = await pool.query(query);
    
    // Filtrar y extraer datos de invitados de notas_especiales
    const reservacionesConCorreo = reservaciones.map(r => {
      let nombre = r.nombre_usuario;
      let correo = r.correo_usuario;
      
      // Si es invitado (no tiene usuario), extraer datos de notas_especiales
      if (!correo && r.notas_especiales) {
        try {
          const datos = JSON.parse(r.notas_especiales);
          if (datos.correo) {
            nombre = datos.nombre || nombre;
            correo = datos.correo;
          }
        } catch (e) {
          // Si no es JSON, ignorar
        }
      }
      
      return { ...r, nombre, correo };
    }).filter(r => r.correo); // Solo reservaciones con correo válido

    if (reservacionesConCorreo.length === 0) {
      console.log('[RECORDATORIOS] No hay reservaciones para mañana que requieran recordatorio.');
      return { sent: 0, failed: 0 };
    }

    console.log(`[RECORDATORIOS] Se encontraron ${reservacionesConCorreo.length} reservacion(es) para enviar recordatorio.`);

    let sent = 0;
    let failed = 0;

    // Enviar recordatorio por cada reservación
    for (const reservacion of reservacionesConCorreo) {
      try {
        await sendReminderEmail(reservacion);
        
        // Marcar como enviado
        await pool.query(
          'UPDATE reservacion SET recordatorio_enviado = TRUE WHERE id_reservacion = ?',
          [reservacion.id_reservacion]
        );
        
        sent++;
        console.log(`[RECORDATORIOS] ✅ Recordatorio enviado para reservación #${reservacion.numero_reserva}`);
      } catch (error) {
        failed++;
        console.error(`[RECORDATORIOS] ❌ Error enviando recordatorio para #${reservacion.numero_reserva}:`, error.message);
      }
    }

    console.log(`[RECORDATORIOS] Proceso completado: ${sent} enviados, ${failed} fallidos.`);
    return { sent, failed, total: reservacionesConCorreo.length };

  } catch (error) {
    console.error('[RECORDATORIOS] Error en el proceso de recordatorios:', error);
    throw error;
  }
}

/**
 * Envía un correo de recordatorio para una reservación específica
 * Usa el mismo sistema de mailer.js para consistencia
 */
async function sendReminderEmail(reservacion) {
  const { nombre, correo, numero_reserva, fecha_reserva, hora_reserva, cantidad_personas } = reservacion;

  // Formatear fecha
  const fechaFormateada = new Date(fecha_reserva).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const { getMailProvider } = require('./mailer');
  const nodemailer = require('nodemailer');
  const { MAIL_FROM, REPLY_TO } = process.env;

  const provider = await getMailProvider();

  const subject = `⏰ Recordatorio: Tu reservación en Sunset's Tarbaca es mañana`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="color:#ef4444;">🍽️ ¡Recordatorio de Reservación!</h2>
      <p>Hola ${nombre || 'Cliente'},</p>
      <p>Te recordamos que tienes una reservación <strong>mañana</strong> en <strong>Sunset's Tarbaca</strong>:</p>
      
      <div style="background-color: #fef2f2; padding: 16px; border-left: 4px solid #ef4444; margin: 16px 0;">
        <p style="margin: 8px 0;"><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
        <p style="margin: 8px 0;"><strong>🕐 Hora:</strong> ${hora_reserva}</p>
        <p style="margin: 8px 0;"><strong>👥 Personas:</strong> ${cantidad_personas}</p>
        <p style="margin: 8px 0;"><strong>🎫 Número de reserva:</strong> ${numero_reserva}</p>
      </div>

      <p>¡Estamos listos para recibirte! Si necesitas modificar o cancelar, contáctanos al <a href="tel:+50661714020">+506 6171-4020</a>.</p>
      <p>Nos vemos mañana 😊</p>
      
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />
      <small style="color: #666;">
        Si ya no deseas recibir recordatorios, puedes desactivarlos en tu próxima reservación.
      </small>
    </div>
  `;

  const text = `Recordatorio de Reservación\n\n` +
    `Hola ${nombre || 'Cliente'},\n` +
    `Te recordamos que tienes una reservación mañana en Sunset's Tarbaca:\n\n` +
    `Fecha: ${fechaFormateada}\n` +
    `Hora: ${hora_reserva}\n` +
    `Personas: ${cantidad_personas}\n` +
    `Número de reserva: ${numero_reserva}\n\n` +
    `Si necesitas modificar o cancelar, contáctanos al +506 6171-4020.\n` +
    `Nos vemos mañana!`;

  // Enviar según el proveedor configurado
  if (provider.type === 'resend') {
    await provider.client.emails.send({
      from: provider.from,
      to: [correo],
      subject,
      text,
      html,
      reply_to: REPLY_TO || undefined,
    });
  } else if (provider.type === 'smtp' || provider.type === 'smtp-test') {
    await provider.transporter.sendMail({
      from: provider.from,
      to: correo,
      replyTo: REPLY_TO || undefined,
      subject,
      text,
      html
    });
  }
}

module.exports = {
  sendDailyReminders,
  sendReminderEmail
};
