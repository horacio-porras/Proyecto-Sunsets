const { pool } = require('../config/database');
const nodemailer = require('nodemailer');
let Queue = null;
try {
    Queue = require('bull');
} catch (e) {
    Queue = null;
}

let emailQueue = null;
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
        const redisConfig = process.env.REDIS_URL
            ? process.env.REDIS_URL
            : {
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

const normalizeBoolean = (value) => ['true', '1', 1, true, 'on', 'yes'].includes(value);

const parsePromocionPayload = (payload = {}) => {
    const nombrePromocion = payload.nombrePromocion || payload.nombre || '';
    if (!nombrePromocion || !nombrePromocion.trim()) {
        throw new Error('El nombre de la promoción es obligatorio');
    }

    const alcance = payload.alcance === 'producto' ? 'producto' : 'general';

    const porcentajeRaw = payload.porcentajeDescuento ?? payload.valorDescuento;
    if (porcentajeRaw === undefined || porcentajeRaw === null || porcentajeRaw === '') {
        throw new Error('Debes especificar el porcentaje de descuento');
    }

    const porcentajeDescuento = parseFloat(porcentajeRaw);
    if (Number.isNaN(porcentajeDescuento) || porcentajeDescuento <= 0 || porcentajeDescuento > 100) {
        throw new Error('El porcentaje de descuento debe estar entre 0 y 100');
    }

    let productosSeleccionados = [];
    if (alcance === 'producto') {
        const productosPayload = payload.productos || payload.productosSeleccionados || [];
        if (!Array.isArray(productosPayload) || productosPayload.length === 0) {
            throw new Error('Selecciona al menos un producto para aplicar el descuento');
        }

        productosSeleccionados = productosPayload
            .map((value) => parseInt(value, 10))
            .filter((value) => !Number.isNaN(value));

        if (productosSeleccionados.length === 0) {
            throw new Error('Selecciona al menos un producto válido para la promoción');
        }
    }

    const parseDateTime = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new Error('Las fechas de la promoción deben tener un formato válido');
        }
        return date;
    };

    const fechaInicio = parseDateTime(payload.fechaInicio);
    const fechaFin = parseDateTime(payload.fechaFin);

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        throw new Error('La fecha de inicio no puede ser posterior a la fecha de finalización');
    }

    return {
        nombrePromocion: nombrePromocion.trim(),
        descripcion: payload.descripcion ? payload.descripcion.trim() : null,
        porcentajeDescuento,
        fechaInicio,
        fechaFin,
        activa: normalizeBoolean(payload.activa),
        alcance,
        productosSeleccionados
    };
};

const buildVigenciaLabel = (inicio, fin) => {
    if (!inicio && !fin) return 'Sin límite definido';

    const format = (date) =>
        date.toLocaleString('es-CR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    if (inicio && fin) {
        return `Del ${format(inicio)} al ${format(fin)}`;
    }

    if (inicio) {
        return `Disponible a partir del ${format(inicio)}`;
    }

    return `Disponible hasta ${format(fin)}`;
};

const mapProductosPorPromocion = (productosRelacionados) => {
    const mapa = new Map();
    productosRelacionados.forEach((item) => {
        if (!mapa.has(item.id_promocion)) {
            mapa.set(item.id_promocion, []);
        }
        mapa.get(item.id_promocion).push({
            id_producto: item.id_producto,
            nombre: item.nombre_producto
        });
    });
    return mapa;
};

const enviarNotificacionesPromocion = async (idPromocion, titulo, contenido) => {
    try {
        // Cargar detalles de la promoción para enriquecer el contenido
        let promoDetalle = null;
        let productosNombres = [];
        try {
            const [promoRows] = await pool.execute(
                `SELECT 
                    id_promocion, nombre_promocion, descripcion, valor_descuento, 
                    fecha_inicio, fecha_fin, alcance
                 FROM promocion
                 WHERE id_promocion = ?`,
                [idPromocion]
            );
            if (promoRows.length > 0) {
                promoDetalle = promoRows[0];
                if (promoDetalle.alcance === 'producto') {
                    const [prodRows] = await pool.execute(
                        `SELECT p.nombre AS nombre_producto
                         FROM producto_promocion pp
                         INNER JOIN producto p ON p.id_producto = pp.id_producto
                         WHERE pp.id_promocion = ?`,
                        [idPromocion]
                    );
                    productosNombres = prodRows.map(r => r.nombre_producto).filter(Boolean);
                }
            }
        } catch (e) {
            console.warn('No se pudieron cargar detalles de la promoción para la notificación:', e?.message || e);
        }

        // Construir contenido enriquecido
        let contenidoDetallado = contenido || '';
        if (promoDetalle) {
            const inicio = promoDetalle.fecha_inicio ? new Date(promoDetalle.fecha_inicio) : null;
            const fin = promoDetalle.fecha_fin ? new Date(promoDetalle.fecha_fin) : null;
            const vigencia = buildVigenciaLabel(inicio, fin);
            const porcentaje = Number(promoDetalle.valor_descuento) || 0;
            const alcance = promoDetalle.alcance === 'producto' ? 'Productos específicos' : 'Aplicable a todo el menú';
            const productosTexto = productosNombres.length > 0 ? `Productos: ${productosNombres.slice(0, 6).join(', ')}${productosNombres.length > 6 ? '…' : ''}` : '';

            const detalleLineas = [
                `Descuento: ${porcentaje}%`,
                `Vigencia: ${vigencia}`,
                `Alcance: ${alcance}`,
                productosTexto
            ].filter(Boolean);

            const resumen = detalleLineas.join(' • ');
            contenidoDetallado = resumen + (contenidoDetallado ? ` — ${contenidoDetallado}` : '');
        }

        const [clientes] = await pool.execute(`
            SELECT u.id_usuario, u.correo, u.nombre
            FROM cliente c
            JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE c.notificaciones_activas = TRUE
        `);

        let transporter = null;
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER) {
                transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587', 10),
                    secure: process.env.SMTP_SECURE === 'true',
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
            await pool.execute(
                `INSERT INTO notificacion (
                    id_usuario, titulo, contenido, tipo_notificacion,
                    leida, fecha_envio, canal_envio
                ) VALUES (?, ?, ?, 'Promoción', FALSE, NOW(), 'Correo')`,
                [cliente.id_usuario, titulo, contenidoDetallado]
            );

            if (emailQueue && cliente.correo) {
                try {
                    await emailQueue.add(
                        'sendEmail',
                        {
                            to: cliente.correo,
                            subject: `[Sunset's Tarbaca] ${titulo}`,
                            text: contenidoDetallado,
                            html: `<p>${contenidoDetallado}</p>`,
                            from: process.env.EMAIL_FROM || 'no-reply@sunsets.local'
                        },
                        { attempts: 3, backoff: 5000 }
                    );
                    continue;
                } catch (queueError) {
                    console.error('Error al encolar correo:', queueError);
                }
            }

            if (transporter && cliente.correo) {
                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_FROM || 'no-reply@sunsets.local',
                        to: cliente.correo,
                        subject: `[Sunset's Tarbaca] ${titulo}`,
                        text: contenidoDetallado,
                        html: `<p>${contenidoDetallado}</p>`
                    });
                } catch (mailErr) {
                    console.error(`Error al enviar correo a ${cliente.correo}:`, mailErr.message || mailErr);
                }
            }
        }
    } catch (error) {
        console.error('Error al enviar notificaciones de promoción:', error);
    }
};

const getPromociones = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const [promocionesRows] = await connection.execute(`
            SELECT 
                id_promocion,
                nombre_promocion,
                descripcion,
                valor_descuento,
                fecha_inicio,
                fecha_fin,
                activa,
                alcance
            FROM promocion
            ORDER BY fecha_inicio DESC, nombre_promocion ASC
        `);

        const [productosRelacionados] = await connection.execute(`
            SELECT 
                pp.id_promocion,
                pp.id_producto,
                p.nombre AS nombre_producto
            FROM producto_promocion pp
            INNER JOIN producto p ON p.id_producto = pp.id_producto
        `);

        const mapaProductos = mapProductosPorPromocion(productosRelacionados);

        const promociones = promocionesRows.map((row) => {
            const fechaInicio = row.fecha_inicio ? new Date(row.fecha_inicio) : null;
            const fechaFin = row.fecha_fin ? new Date(row.fecha_fin) : null;

            return {
                ...row,
                vigencia: buildVigenciaLabel(fechaInicio, fechaFin),
                porcentaje_descuento: row.valor_descuento,
                productos: row.alcance === 'producto' ? mapaProductos.get(row.id_promocion) || [] : []
            };
        });

        res.json({
            success: true,
            data: { promociones }
        });
    } catch (error) {
        console.error('Error al obtener promociones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        connection.release();
    }
};

const getPromocionesActivasPublic = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const [promocionesRows] = await connection.execute(`
            SELECT 
                id_promocion,
                nombre_promocion,
                descripcion,
                valor_descuento,
                fecha_inicio,
                fecha_fin,
                alcance
            FROM promocion
            WHERE activa = 1
              AND (fecha_inicio IS NULL OR fecha_inicio <= NOW())
              AND (fecha_fin IS NULL OR fecha_fin >= NOW())
        `);

        if (promocionesRows.length === 0) {
            return res.json({
                success: true,
                data: { promociones: [] }
            });
        }

        const promocionesProducto = promocionesRows
            .filter((row) => row.alcance === 'producto')
            .map((row) => row.id_promocion);

        const productosPorPromocion = new Map();

        if (promocionesProducto.length > 0) {
            const placeholders = promocionesProducto.map(() => '?').join(',');
            const [productosRows] = await connection.execute(
                `SELECT id_promocion, id_producto FROM producto_promocion WHERE id_promocion IN (${placeholders})`,
                promocionesProducto
            );

            productosRows.forEach((row) => {
                if (!productosPorPromocion.has(row.id_promocion)) {
                    productosPorPromocion.set(row.id_promocion, []);
                }
                productosPorPromocion.get(row.id_promocion).push(row.id_producto);
            });
        }

        const promociones = promocionesRows.map((row) => ({
            id_promocion: row.id_promocion,
            nombre_promocion: row.nombre_promocion,
            descripcion: row.descripcion,
            porcentaje_descuento: Number(row.valor_descuento) || 0,
            alcance: row.alcance,
            fecha_inicio: row.fecha_inicio,
            fecha_fin: row.fecha_fin,
            productos: row.alcance === 'producto' ? productosPorPromocion.get(row.id_promocion) || [] : []
        }));

        res.json({
            success: true,
            data: { promociones }
        });
    } catch (error) {
        console.error('Error al obtener promociones activas:', error);
        res.status(500).json({
            success: false,
            message: 'No se pudieron obtener las promociones activas'
        });
    } finally {
        connection.release();
    }
};

const createPromocion = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            nombrePromocion,
            descripcion,
            porcentajeDescuento,
            fechaInicio,
            fechaFin,
            activa,
            alcance,
            productosSeleccionados
        } = parsePromocionPayload(req.body);

        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO promocion (
                nombre_promocion,
                descripcion,
                tipo_promocion,
                valor_descuento,
                fecha_inicio,
                fecha_fin,
                hora_inicio,
                hora_fin,
                activa,
                puntos_requeridos,
                alcance
            ) VALUES (?, ?, 'descuento', ?, ?, ?, ?, ?, ?, NULL, ?)`,
            [
                nombrePromocion,
                descripcion,
                porcentajeDescuento,
                fechaInicio,
                fechaFin,
                fechaInicio ? fechaInicio.toTimeString().slice(0, 8) : null,
                fechaFin ? fechaFin.toTimeString().slice(0, 8) : null,
                activa ? 1 : 0,
                alcance
            ]
        );

        const idPromocion = result.insertId;

        if (alcance === 'producto' && productosSeleccionados.length > 0) {
            const valores = productosSeleccionados.map((productoId) => [productoId, idPromocion, new Date()]);
            await connection.query(
                `INSERT INTO producto_promocion (id_producto, id_promocion, fecha_aplicacion)
                 VALUES ?`,
                [valores]
            );

            // Sincronizar descuentos de promoción con productos
            if (activa) {
                for (const productoId of productosSeleccionados) {
                    await connection.execute(
                        `UPDATE producto 
                         SET descuento_activo = 1,
                             porcentaje_descuento = ?,
                             fecha_inicio_descuento = ?,
                             fecha_fin_descuento = ?
                         WHERE id_producto = ?`,
                        [porcentajeDescuento, fechaInicio, fechaFin, productoId]
                    );
                }
            }
        }

        await connection.commit();

        if (activa) {
            enviarNotificacionesPromocion(idPromocion, nombrePromocion, descripcion || '');
        }

        res.status(201).json({
            success: true,
            message: 'Promoción creada correctamente',
            data: { id_promocion: idPromocion }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al crear promoción:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'No se pudo crear la promoción'
        });
    } finally {
        connection.release();
    }
};

const updatePromocion = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const promocionId = req.params.id;

        const [existingRows] = await connection.execute(
            `SELECT id_promocion FROM promocion WHERE id_promocion = ?`,
            [promocionId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Promoción no encontrada'
            });
        }

        const {
            nombrePromocion,
            descripcion,
            porcentajeDescuento,
            fechaInicio,
            fechaFin,
            activa,
            alcance,
            productosSeleccionados
        } = parsePromocionPayload(req.body);

        await connection.beginTransaction();

        await connection.execute(
            `UPDATE promocion
             SET nombre_promocion = ?, descripcion = ?, valor_descuento = ?, 
                 fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?, activa = ?, alcance = ?
             WHERE id_promocion = ?`,
            [
                nombrePromocion,
                descripcion,
                porcentajeDescuento,
                fechaInicio,
                fechaFin,
                fechaInicio ? fechaInicio.toTimeString().slice(0, 8) : null,
                fechaFin ? fechaFin.toTimeString().slice(0, 8) : null,
                activa ? 1 : 0,
                alcance,
                promocionId
            ]
        );

        // Obtener productos actuales de la promoción antes de eliminar
        const [productosActuales] = await connection.execute(
            `SELECT id_producto FROM producto_promocion WHERE id_promocion = ?`,
            [promocionId]
        );
        const idsProductosActuales = productosActuales.map(p => p.id_producto);

        await connection.execute(`DELETE FROM producto_promocion WHERE id_promocion = ?`, [promocionId]);

        // Desactivar descuentos en productos que ya no están en la promoción
        if (idsProductosActuales.length > 0) {
            await connection.execute(
                `UPDATE producto 
                 SET descuento_activo = 0,
                     porcentaje_descuento = NULL,
                     fecha_inicio_descuento = NULL,
                     fecha_fin_descuento = NULL
                 WHERE id_producto IN (${idsProductosActuales.map(() => '?').join(',')})`,
                idsProductosActuales
            );
        }

        if (alcance === 'producto' && productosSeleccionados.length > 0) {
            const valores = productosSeleccionados.map((productoId) => [productoId, promocionId, new Date()]);
            await connection.query(
                `INSERT INTO producto_promocion (id_producto, id_promocion, fecha_aplicacion)
                 VALUES ?`,
                [valores]
            );

            // Sincronizar descuentos de promoción con productos
            if (activa) {
                for (const productoId of productosSeleccionados) {
                    await connection.execute(
                        `UPDATE producto 
                         SET descuento_activo = 1,
                             porcentaje_descuento = ?,
                             fecha_inicio_descuento = ?,
                             fecha_fin_descuento = ?
                         WHERE id_producto = ?`,
                        [porcentajeDescuento, fechaInicio, fechaFin, productoId]
                    );
                }
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Promoción actualizada correctamente'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar promoción:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'No se pudo actualizar la promoción'
        });
    } finally {
        connection.release();
    }
};

const actualizarEstadoPromocion = async (req, res) => {
    try {
        const promocionId = req.params.id;
        const { activa } = req.body;

        if (activa === undefined) {
            return res.status(400).json({
                success: false,
                message: 'El campo "activa" es obligatorio'
            });
        }

        const [existingRows] = await pool.execute(
            `SELECT id_promocion FROM promocion WHERE id_promocion = ?`,
            [promocionId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Promoción no encontrada'
            });
        }

        await pool.execute(`UPDATE promocion SET activa = ? WHERE id_promocion = ?`, [normalizeBoolean(activa) ? 1 : 0, promocionId]);

        // Sincronizar estado con productos si la promoción es de alcance "producto"
        const [promocion] = await pool.execute(
            `SELECT alcance FROM promocion WHERE id_promocion = ?`,
            [promocionId]
        );

        if (promocion.length > 0 && promocion[0].alcance === 'producto') {
            const [productosPromocion] = await pool.execute(
                `SELECT id_producto FROM producto_promocion WHERE id_promocion = ?`,
                [promocionId]
            );

            const [promocionDetalle] = await pool.execute(
                `SELECT valor_descuento, fecha_inicio, fecha_fin FROM promocion WHERE id_promocion = ?`,
                [promocionId]
            );

            const estaActiva = normalizeBoolean(activa);
            const porcentajeDescuento = promocionDetalle[0]?.valor_descuento || null;
            const fechaInicio = promocionDetalle[0]?.fecha_inicio || null;
            const fechaFin = promocionDetalle[0]?.fecha_fin || null;

            // Sincronizar estado con productos
            for (const productoPromo of productosPromocion) {
                if (estaActiva) {
                    await pool.execute(
                        `UPDATE producto 
                         SET descuento_activo = 1,
                             porcentaje_descuento = ?,
                             fecha_inicio_descuento = ?,
                             fecha_fin_descuento = ?
                         WHERE id_producto = ?`,
                        [porcentajeDescuento, fechaInicio, fechaFin, productoPromo.id_producto]
                    );
                } else {
                    await pool.execute(
                        `UPDATE producto 
                         SET descuento_activo = 0,
                             porcentaje_descuento = NULL,
                             fecha_inicio_descuento = NULL,
                             fecha_fin_descuento = NULL
                         WHERE id_producto = ?`,
                        [productoPromo.id_producto]
                    );
                }
            }
        }

        res.json({
            success: true,
            message: `Promoción ${normalizeBoolean(activa) ? 'activada' : 'desactivada'} correctamente`
        });
    } catch (error) {
        console.error('Error al actualizar estado de promoción:', error);
        res.status(500).json({
            success: false,
            message: 'No se pudo actualizar el estado de la promoción'
        });
    }
};

const deletePromocion = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const promocionId = req.params.id;

        await connection.beginTransaction();

        const [existingRows] = await connection.execute(
            `SELECT id_promocion FROM promocion WHERE id_promocion = ?`,
            [promocionId]
        );

        if (existingRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Promoción no encontrada'
            });
        }

        // Obtener productos de la promoción antes de eliminar
        const [productosPromocion] = await connection.execute(
            `SELECT id_producto FROM producto_promocion WHERE id_promocion = ?`,
            [promocionId]
        );
        const idsProductos = productosPromocion.map(p => p.id_producto);

        await connection.execute(`DELETE FROM producto_promocion WHERE id_promocion = ?`, [promocionId]);
        await connection.execute(`DELETE FROM promocion WHERE id_promocion = ?`, [promocionId]);

        // Desactivar descuentos en productos que estaban en esta promoción
        if (idsProductos.length > 0) {
            await connection.execute(
                `UPDATE producto 
                 SET descuento_activo = 0,
                     porcentaje_descuento = NULL,
                     fecha_inicio_descuento = NULL,
                     fecha_fin_descuento = NULL
                 WHERE id_producto IN (${idsProductos.map(() => '?').join(',')})`,
                idsProductos
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Promoción eliminada correctamente'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar promoción:', error);
        res.status(500).json({
            success: false,
            message: 'No se pudo eliminar la promoción'
        });
    } finally {
        connection.release();
    }
};

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

        const [result] = await pool.execute(
            `INSERT INTO promocion (
                nombre_promocion, descripcion, tipo_promocion, valor_descuento,
                fecha_inicio, fecha_fin, hora_inicio, hora_fin, activa, puntos_requeridos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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
            ]
        );

        const idPromocion = result.insertId;

        if (activa) {
            enviarNotificacionesPromocion(idPromocion, nombre_promocion, descripcion || '');
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

const obtenerPromocionesActivas = async (req, res) => {
    try {
        const [promociones] = await pool.execute(`
            SELECT * FROM promocion
            WHERE activa = 1
              AND (fecha_inicio IS NULL OR CURDATE() >= fecha_inicio)
              AND (fecha_fin IS NULL OR CURDATE() <= fecha_fin)
              AND (hora_inicio IS NULL OR CURTIME() >= hora_inicio)
              AND (hora_fin IS NULL OR CURTIME() <= hora_fin)
            ORDER BY tipo_promocion ASC
        `);
        res.json({ success: true, promociones });
    } catch (error) {
        console.error('Error al obtener promociones activas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const obtenerPromocionesFuturas = async (req, res) => {
    try {
        const [promociones] = await pool.execute(`
            SELECT * FROM promocion
            WHERE fecha_inicio IS NOT NULL
              AND fecha_inicio > CURDATE()
            ORDER BY fecha_inicio ASC
        `);
        res.json({ success: true, promociones });
    } catch (error) {
        console.error('Error al obtener promociones futuras:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    getPromociones,
    getPromocionesActivasPublic,
    createPromocion,
    updatePromocion,
    actualizarEstadoPromocion,
    deletePromocion,
    crearPromocion,
    obtenerPromocionesActivas,
    obtenerPromocionesFuturas
};
