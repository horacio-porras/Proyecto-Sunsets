const { pool } = require('../config/database');
const nodemailer = require('nodemailer');
let Queue = null;
try {
  Queue = require('bull');
} catch (e) {
  Queue = null;
}

// Si hay configuración de Redis, inicializar la cola de correos
let emailQueue = null;
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    const redisConfig = process.env.REDIS_URL ? process.env.REDIS_URL : {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      password: process.env.REDIS_PASS || undefined
    };
    if (Queue) {
      emailQueue = new Queue('emailQueue', redisConfig);
    }
  } catch (err) {
    console.warn('No se pudo inicializar la cola de correos (Redis). Se usará envío directo si está disponible.');
    emailQueue = null;
  }
}

// Crear una nueva promoción
const crearPromocion = async (req, res) => {
    try {
        const {
            nombre_promocion,
            descripcion,
            tipo_promocion,
            valor_descuento,
            fecha_inicio,
            fecha_fin,
            hora_inicio,
            hora_fin,
            activa,
            puntos_requeridos
        } = req.body;

        const [result] = await pool.execute(`
            INSERT INTO promocion (
                nombre_promocion, descripcion, tipo_promocion, valor_descuento,
                fecha_inicio, fecha_fin, hora_inicio, hora_fin, activa, puntos_requeridos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nombre_promocion, descripcion, tipo_promocion, valor_descuento,
            fecha_inicio, fecha_fin, hora_inicio, hora_fin, activa, puntos_requeridos
        ]);

        const idPromocion = result.insertId;

        // Si está activa, enviar notificaciones
        if (activa) {
            await enviarNotificacionesPromocion(idPromocion, nombre_promocion, descripcion);
        }

        res.json({
            success: true,
            id_promocion: idPromocion,
            message: 'Promoción creada correctamente'
        });

    } catch (error) {
        console.error('Error al crear promoción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Notificaciones personalizadas según historial
const enviarNotificacionesPromocion = async (idPromocion, titulo, contenido) => {
  try {
    // Traer correo y nombre para envío de correo opcional
    const [clientes] = await pool.execute(`
      SELECT u.id_usuario, u.correo, u.nombre FROM cliente c
      JOIN usuario u ON c.id_usuario = u.id_usuario
      WHERE c.notificaciones_activas = TRUE
    `);

    // Configurar transporter si hay credenciales SMTP en el entorno
    let transporter = null;
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: (process.env.SMTP_SECURE === 'true'),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      }
    } catch (err) {
      console.warn('No se pudo configurar transporter SMTP, continuará sin envío de correo:', err.message || err);
      transporter = null;
    }

    for (const cliente of clientes) {
      // Inserta notificación en la base de datos (sistema)
      await pool.execute(`
        INSERT INTO notificacion (
          id_usuario, titulo, contenido, tipo_notificacion,
          leida, fecha_envio, canal_envio
        ) VALUES (?, ?, ?, 'Promoción', FALSE, NOW(), 'Correo')
      `, [cliente.id_usuario, titulo, contenido]);

      // Si hay cola de correo configurada en Redis, encolar el envío
      if (emailQueue && cliente.correo) {
        try {
          await emailQueue.add('sendEmail', {
            to: cliente.correo,
            subject: `[Sunset's Tarbaca] ${titulo}`,
            text: contenido,
            html: `<p>${contenido}</p>`,
            from: process.env.EMAIL_FROM || 'no-reply@sunsets.local'
          }, { attempts: 3, backoff: 5000 });
        } catch (qErr) {
          console.error('Error al encolar correo:', qErr);
          // fallback: enviar directamente si transporter disponible
          if (transporter && cliente.correo) {
            try {
              await transporter.sendMail({
                from: process.env.EMAIL_FROM || 'no-reply@sunsets.local',
                to: cliente.correo,
                subject: `[Sunset's Tarbaca] ${titulo}`,
                text: contenido,
                html: `<p>${contenido}</p>`
              });
            } catch (mailErr) {
              console.error(`Error al enviar correo por fallback a ${cliente.correo}:`, mailErr.message || mailErr);
            }
          }
        }
      } else {
        // No hay cola: enviar directo si hay transporter
        if (transporter && cliente.correo) {
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || 'no-reply@sunsets.local',
              to: cliente.correo,
              subject: `[Sunset's Tarbaca] ${titulo}`,
              text: contenido,
              html: `<p>${contenido}</p>`
            });
          } catch (mailErr) {
            console.error(`Error al enviar correo a ${cliente.correo}:`, mailErr.message || mailErr);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error al enviar notificaciones de promoción:', error);
  }
};

// Obtener promociones activas por fecha y hora actual
const obtenerPromocionesActivas = async (req, res) => {
  try {
    const [promociones] = await pool.execute(`
      SELECT * FROM promocion
      WHERE CURDATE() BETWEEN fecha_inicio AND fecha_fin
        AND CURTIME() BETWEEN hora_inicio AND hora_fin
        AND activa = 1
      ORDER BY tipo_promocion ASC
    `);
    res.json({ success: true, promociones });
  } catch (error) {
    console.error('Error al obtener promociones activas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Verificar si una promoción está vigente para un producto específico
const verificarPromocionVigente = async (id_producto) => {
  const ahora = new Date();
  const fechaActual = ahora.toISOString().slice(0, 10);
  const horaActual = ahora.toTimeString().slice(0, 5);

  const [promos] = await pool.execute(`
    SELECT * FROM promocion
    WHERE ? BETWEEN fecha_inicio AND fecha_fin
      AND ? BETWEEN hora_inicio AND hora_fin
      AND activa = 1
      AND id_producto = ?
  `, [fechaActual, horaActual, id_producto]);

  return promos;
};

// Obtener promociones futuras
const obtenerPromocionesFuturas = async (req, res) => {
  try {
    const [promociones] = await pool.execute(`
      SELECT * FROM promocion
      WHERE fecha_inicio > CURDATE()
      ORDER BY fecha_inicio ASC
    `);
    res.json({ success: true, promociones });
  } catch (error) {
    console.error('Error al obtener promociones futuras:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};


module.exports = {
    crearPromocion,
    obtenerPromocionesActivas,
    obtenerPromocionesFuturas
};