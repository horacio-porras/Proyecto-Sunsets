const { pool } = require('../config/database');

// Actualiza la preferencia de notificaciones del cliente
exports.actualizarPreferenciaNotificacion = async (req, res) => {
    try {
        const userId = req.user.id;
        const { activa } = req.body;

        if (typeof activa !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El valor de "activa" debe ser booleano (true o false)'
            });
        }

        const [clienteRows] = await pool.execute(
            `SELECT id_cliente FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        const clienteId = clienteRows[0].id_cliente;

        await pool.execute(
            `UPDATE cliente SET notificaciones_activas = ? WHERE id_cliente = ?`,
            [activa, clienteId]
        );

        res.json({
            success: true,
            message: 'Preferencia de notificaciones actualizada'
        });

    } catch (error) {
        console.error('Error al actualizar preferencia de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtiene promociones personalizadas según historial de compras
exports.obtenerPromocionesPersonalizadas = async (req, res) => {
    try {
        const userId = req.user.id;

        const [clienteRows] = await pool.execute(
            `SELECT id_cliente FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        const clienteId = clienteRows[0].id_cliente;

        const [productosFrecuentes] = await pool.execute(`
            SELECT dp.id_producto FROM detalle_pedido dp
            JOIN pedido p ON dp.id_pedido = p.id_pedido
            WHERE p.id_cliente = ?
            GROUP BY dp.id_producto
            ORDER BY COUNT(*) DESC
            LIMIT 5
        `, [clienteId]);

        const ids = productosFrecuentes.map(p => p.id_producto);

        if (ids.length === 0) {
            return res.json({ success: true, promociones: [] });
        }

        const placeholders = ids.map(() => '?').join(',');
        const [promociones] = await pool.execute(`
            SELECT DISTINCT p.id_promocion, p.nombre_promocion, p.descripcion
            FROM producto_promocion pp
            JOIN promocion p ON pp.id_promocion = p.id_promocion
            WHERE pp.id_producto IN (${placeholders}) AND p.activa = TRUE
        `, ids);

        res.json({ success: true, promociones });

    } catch (error) {
        console.error('Error al obtener promociones personalizadas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Verifica promociones válidas según horario actual
exports.verificarPromocionesPorHorario = async (req, res) => {
  try {
    const { id_producto } = req.body;
    if (!id_producto) {
      return res.status(400).json({ success: false, message: 'Falta id_producto' });
    }

    const ahora = new Date();
    const fechaActual = ahora.toISOString().slice(0, 10);
    const horaActual = ahora.toTimeString().slice(0, 5);

    const [promos] = await pool.execute(`
      SELECT p.id_promocion, p.nombre_promocion, p.descripcion, p.valor_descuento
      FROM promocion p
      JOIN producto_promocion pp ON p.id_promocion = pp.id_promocion
      WHERE pp.id_producto = ?
        AND ? BETWEEN p.fecha_inicio AND p.fecha_fin
        AND ? BETWEEN p.hora_inicio AND p.hora_fin
        AND p.activa = TRUE
    `, [id_producto, fechaActual, horaActual]);

    if (promos.length === 0) {
      return res.json({ success: true, promocion: null });
    }

    const promo = promos[0];
    res.json({
      success: true,
      promocion: {
        nombre: promo.nombre_promocion,
        descripcion: promo.descripcion,
        descuento: promo.valor_descuento
      }
    });
  } catch (error) {
    console.error('Error al verificar promoción por horario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Obtiene las notificaciones del usuario (últimas 20)
exports.obtenerNotificaciones = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.execute(`
            SELECT id_notificacion, titulo, contenido, tipo_notificacion, leida, fecha_envio, canal_envio
            FROM notificacion
            WHERE id_usuario = ?
            ORDER BY fecha_envio DESC
            LIMIT 20
        `, [userId]);

        res.json({ success: true, notificaciones: rows });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Marca una notificación como leída
exports.marcarNotificacionLeida = async (req, res) => {
    try {
        const userId = req.user.id;
        const idNotificacion = req.params.id;

        const [rows] = await pool.execute(
            `SELECT id_notificacion FROM notificacion WHERE id_notificacion = ? AND id_usuario = ?`,
            [idNotificacion, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
        }

        await pool.execute(
            `UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?`,
            [idNotificacion, userId]
        );

        res.json({ success: true, message: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Obtener cantidad de notificaciones no leídas
exports.obtenerNoLeidas = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            `SELECT COUNT(*) as count FROM notificacion WHERE id_usuario = ? AND leida = FALSE`,
            [userId]
        );
        const count = rows && rows[0] ? rows[0].count : 0;
        res.json({ success: true, no_leidas: count });
    } catch (error) {
        console.error('Error al obtener notificaciones no leídas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};