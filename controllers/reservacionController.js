const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
const { sendReservationEmail } = require('../utils/mailer');

const MAX_PERSONAS_RESERVA = parseInt(process.env.RESERVA_MAX_PERSONAS, 10) || 8;
const ESTADO_RESERVA_PENDIENTE = 'pendiente';
const ESTADO_RESERVA_CANCELADA = 'cancelada';
const ESTADOS_NO_MODIFICABLES = new Set(['cancelada', 'rechazada', 'completada']);

const buildValidationError = (field, message) => ({ field, message });

const validateReservaPayload = ({ fecha_reserva, hora_reserva, cantidad_personas }) => {
    const errors = [];

    if (!fecha_reserva) {
        errors.push(buildValidationError('fecha_reserva', 'La fecha de la reservación es obligatoria.'));
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_reserva)) {
        errors.push(buildValidationError('fecha_reserva', 'La fecha debe tener el formato YYYY-MM-DD.'));
    }

    if (!hora_reserva) {
        errors.push(buildValidationError('hora_reserva', 'La hora de la reservación es obligatoria.'));
    } else if (!/^\d{2}:\d{2}$/.test(hora_reserva)) {
        errors.push(buildValidationError('hora_reserva', 'La hora debe tener el formato HH:MM en 24 horas.'));
    }

    if (cantidad_personas === undefined || cantidad_personas === null || cantidad_personas === '') {
        errors.push(buildValidationError('cantidad_personas', 'La cantidad de personas es obligatoria.'));
    } else {
        const cantidadParsed = Number(cantidad_personas);
        if (!Number.isInteger(cantidadParsed) || cantidadParsed <= 0) {
            errors.push(buildValidationError('cantidad_personas', 'La cantidad de personas debe ser un número entero positivo.'));
        } else if (cantidadParsed > MAX_PERSONAS_RESERVA) {
            errors.push(buildValidationError(
                'cantidad_personas',
                `La capacidad máxima por reservación es de ${MAX_PERSONAS_RESERVA} personas.`
            ));
        }
    }

    if (!fecha_reserva || !hora_reserva || errors.length > 0) {
        return errors;
    }

    const fechaHora = new Date(`${fecha_reserva}T${hora_reserva}:00`);
    if (Number.isNaN(fechaHora.getTime())) {
        errors.push(buildValidationError('fecha_reserva', 'La combinación de fecha y hora no es válida.'));
    } else {
        const now = new Date();
        if (fechaHora < now) {
            errors.push(buildValidationError('fecha_reserva', 'La reservación debe ser para una fecha y hora futuras.'));
        }
    }

    return errors;
};

const buildNotasFinales = (notas, preferenciaMesa) => {
    const notasLimpias = notas && notas.trim().length > 0 ? notas.trim() : null;
    const preferenciaTexto = preferenciaMesa && preferenciaMesa.trim().length > 0
        ? `Preferencia de mesa: ${preferenciaMesa.trim()}`
        : null;

    if (notasLimpias && preferenciaTexto) {
        return `${notasLimpias}\n${preferenciaTexto}`;
    }
    if (notasLimpias) {
        return notasLimpias;
    }
    if (preferenciaTexto) {
        return preferenciaTexto;
    }
    return null;
};

const createReservation = async (req, res) => {
    try {
        const userId = req.user.id;
        const userNombre = req.user.nombre;
        const userCorreo = req.user.correo;
        const {
            fecha_reserva,
            hora_reserva,
            cantidad_personas,
            notas_especiales,
            preferencia_mesa
        } = req.body;

        const validationErrors = validateReservaPayload({
            fecha_reserva,
            hora_reserva,
            cantidad_personas
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos de reservación inválidos',
                errors: validationErrors
            });
        }

        const [clienteRows] = await pool.execute(
            'SELECT id_cliente FROM cliente WHERE id_usuario = ?',
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        const cantidadFinal = Number(cantidad_personas);
        const horaFinal = `${hora_reserva}:00`;

        const notasFinales = buildNotasFinales(notas_especiales, preferencia_mesa);

        const [result] = await pool.execute(
            `INSERT INTO reservacion (
                id_cliente,
                fecha_reserva,
                hora_reserva,
                cantidad_personas,
                estado_reserva,
                notas_especiales,
                fecha_creacion,
                recordatorio_enviado
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), FALSE)`,
            [
                clienteRows[0].id_cliente,
                fecha_reserva,
                horaFinal,
                cantidadFinal,
                ESTADO_RESERVA_PENDIENTE,
                notasFinales
            ]
        );

        // Generar número de reservación y enviar correo de confirmación al usuario autenticado
        const idReserva = result.insertId;
        const numeroReserva = `R-${String(idReserva).padStart(6, '0')}`;

        try {
            console.log(`[Reservación] (Auth) Enviando correo de confirmación a: ${userCorreo}`);
            const { previewUrl } = await sendReservationEmail({
                to: userCorreo,
                nombre: userNombre,
                numeroReserva,
                fecha: fecha_reserva,
                hora: hora_reserva,
                personas: cantidad_personas
            });
            req._emailPreviewUrl = previewUrl;
            console.log(`[Reservación] (Auth) ✓ Correo de confirmación enviado exitosamente`);
        } catch (mailErr) {
            console.error('[Reservación] (Auth) ✗ ERROR al enviar correo de confirmación:', mailErr.message);
            console.error('[Reservación] (Auth) Detalles completos del error:', mailErr);
            // No fallar la reservación si el correo falla
        }

        return res.status(201).json({
            success: true,
            message: 'Reservación creada exitosamente',
            data: {
                reservacion: {
                    id_reservacion: result.insertId,
                    fecha_reserva,
                    hora_reserva: horaFinal,
                    cantidad_personas: cantidadFinal,
                    estado_reserva: ESTADO_RESERVA_PENDIENTE
                },
                max_capacidad: MAX_PERSONAS_RESERVA,
                numero_reserva: numeroReserva,
                preview_url: req._emailPreviewUrl
            }
        });
    } catch (error) {
        console.error('Error al crear reservación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const createPublicReservation = async (req, res) => {
    try {
    console.log('[Reservación] Iniciando creación de reservación pública');
    console.log('[Reservación] Datos recibidos:', req.body);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: errors.array()
            });
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

        const datosInvitado = JSON.stringify({
            nombre,
            correo,
            telefono,
            notas: solicitudes_especiales || '',
            preferencia: preferencia_mesa || ''
        });

        const [result] = await pool.execute(
            `INSERT INTO reservacion (
                id_cliente,
                fecha_reserva,
                hora_reserva,
                cantidad_personas,
                estado_reserva,
                notas_especiales,
                fecha_creacion,
                recordatorio_enviado
            ) VALUES (NULL, ?, ?, ?, 'Confirmada', ?, NOW(), FALSE)`,
            [fecha_reserva, hora_reserva, cantidad_personas, datosInvitado]
        );

        const idReserva = result.insertId;
        const numeroReserva = `R-${String(idReserva).padStart(6, '0')}`;

        try {
            console.log(`[Reservación] Enviando correo de confirmación a: ${correo}`);
            const { previewUrl } = await sendReservationEmail({
                to: correo,
                nombre,
                numeroReserva,
                fecha: fecha_reserva,
                hora: hora_reserva,
                personas: cantidad_personas
            });
            req._emailPreviewUrl = previewUrl;
            console.log(`[Reservación] ✓ Correo de confirmación enviado exitosamente`);
        } catch (mailErr) {
            console.error('[Reservación] ✗ ERROR al enviar correo de confirmación:', mailErr.message);
            console.error('[Reservación] Detalles completos del error:', mailErr);
            // No fallar la reservación si el correo falla
        }

        return res.status(201).json({
            success: true,
            message: 'Reservación creada exitosamente',
            data: {
                id_reservacion: idReserva,
                numero_reserva: numeroReserva,
                preview_url: req._emailPreviewUrl
            }
        });
    } catch (error) {
        console.error('Error al crear reservación pública:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const parseNotas = (notasRaw) => {
    if (!notasRaw) {
        return {
            notas: null,
            preferenciaMesa: null
        };
    }

    const lines = notasRaw.split('\n');
    let preferenciaMesa = null;
    const otrasNotas = [];

    lines.forEach(linea => {
        if (linea.toLowerCase().startsWith('preferencia de mesa:')) {
            preferenciaMesa = linea.split(':')[1]?.trim() || null;
        } else if (linea.trim().length > 0) {
            otrasNotas.push(linea.trim());
        }
    });

    return {
        notas: otrasNotas.length > 0 ? otrasNotas.join('\n') : null,
        preferenciaMesa
    };
};

const getActiveReservations = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.execute(
            `SELECT 
                r.id_reservacion,
                r.fecha_reserva,
                r.hora_reserva,
                r.cantidad_personas,
                r.estado_reserva,
                r.notas_especiales,
                r.fecha_creacion
            FROM reservacion r
            INNER JOIN cliente c ON r.id_cliente = c.id_cliente
            WHERE c.id_usuario = ?
              AND (
                    r.fecha_reserva > CURDATE()
                 OR (r.fecha_reserva = CURDATE() AND r.hora_reserva >= CURTIME())
              )
              AND (r.estado_reserva IS NULL OR r.estado_reserva NOT IN ('cancelada', 'rechazada', 'completada'))
            ORDER BY r.fecha_reserva ASC, r.hora_reserva ASC`,
            [userId]
        );

        const reservaciones = rows.map(reserva => {
            const { notas, preferenciaMesa } = parseNotas(reserva.notas_especiales);
            return {
                id_reservacion: reserva.id_reservacion,
                fecha_reserva: reserva.fecha_reserva,
                hora_reserva: reserva.hora_reserva,
                cantidad_personas: reserva.cantidad_personas,
                estado_reserva: reserva.estado_reserva || ESTADO_RESERVA_PENDIENTE,
                notas_especiales: notas,
                preferencia_mesa: preferenciaMesa,
                fecha_creacion: reserva.fecha_creacion
            };
        });

        return res.json({
            success: true,
            data: {
                reservaciones,
                max_capacidad: MAX_PERSONAS_RESERVA
            }
        });
    } catch (error) {
        console.error('Error al obtener reservaciones activas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const updateReservation = async (req, res) => {
    try {
        const userId = req.user.id;
        const reservacionId = req.params.id;
        const {
            fecha_reserva,
            hora_reserva,
            cantidad_personas,
            notas_especiales,
            preferencia_mesa
        } = req.body;

        const validationErrors = validateReservaPayload({
            fecha_reserva,
            hora_reserva,
            cantidad_personas
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos de reservación inválidos',
                errors: validationErrors
            });
        }

        const [rows] = await pool.execute(
            `SELECT 
                r.id_reservacion,
                r.estado_reserva,
                r.fecha_reserva,
                r.hora_reserva,
                c.id_cliente
            FROM reservacion r
            INNER JOIN cliente c ON r.id_cliente = c.id_cliente
            WHERE r.id_reservacion = ? AND c.id_usuario = ?`,
            [reservacionId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservación no encontrada'
            });
        }

        const reservacionActual = rows[0];

        if (reservacionActual.estado_reserva && ESTADOS_NO_MODIFICABLES.has(reservacionActual.estado_reserva)) {
            return res.status(400).json({
                success: false,
                message: 'Esta reservación no se puede modificar en su estado actual'
            });
        }

        const fechaHoraNueva = new Date(`${fecha_reserva}T${hora_reserva}:00`);
        if (Number.isNaN(fechaHoraNueva.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'La combinación de fecha y hora no es válida'
            });
        }

        const ahora = new Date();
        if (fechaHoraNueva < ahora) {
            return res.status(400).json({
                success: false,
                message: 'La reservación debe mantenerse en una fecha y hora futuras'
            });
        }

        const notasFinales = buildNotasFinales(notas_especiales, preferencia_mesa);
        const horaFinal = `${hora_reserva}:00`;
        const cantidadFinal = Number(cantidad_personas);

        await pool.execute(
            `UPDATE reservacion
             SET fecha_reserva = ?, hora_reserva = ?, cantidad_personas = ?, notas_especiales = ?
             WHERE id_reservacion = ?`,
            [
                fecha_reserva,
                horaFinal,
                cantidadFinal,
                notasFinales,
                reservacionId
            ]
        );

        return res.json({
            success: true,
            message: 'Reservación actualizada correctamente',
            data: {
                reservacion: {
                    id_reservacion: Number(reservacionId),
                    fecha_reserva,
                    hora_reserva: horaFinal,
                    cantidad_personas: cantidadFinal,
                    estado_reserva: reservacionActual.estado_reserva || ESTADO_RESERVA_PENDIENTE,
                    notas_especiales: notas_especiales || null,
                    preferencia_mesa: preferencia_mesa || null
                }
            }
        });
    } catch (error) {
        console.error('Error al actualizar reservación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const cancelReservation = async (req, res) => {
    try {
        const userId = req.user.id;
        const reservacionId = req.params.id;

        const [rows] = await pool.execute(
            `SELECT 
                r.id_reservacion,
                r.estado_reserva,
                c.id_cliente
            FROM reservacion r
            INNER JOIN cliente c ON r.id_cliente = c.id_cliente
            WHERE r.id_reservacion = ? AND c.id_usuario = ?`,
            [reservacionId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservación no encontrada'
            });
        }

        const reservacionActual = rows[0];

        if (reservacionActual.estado_reserva && ESTADOS_NO_MODIFICABLES.has(reservacionActual.estado_reserva)) {
            return res.status(400).json({
                success: false,
                message: 'Esta reservación no se puede cancelar en su estado actual'
            });
        }

        await pool.execute(
            `UPDATE reservacion
             SET estado_reserva = ?
             WHERE id_reservacion = ?`,
            [
                ESTADO_RESERVA_CANCELADA,
                reservacionId
            ]
        );

        return res.json({
            success: true,
            message: 'Reservación cancelada correctamente',
            data: {
                reservacion: {
                    id_reservacion: Number(reservacionId),
                    estado_reserva: ESTADO_RESERVA_CANCELADA
                }
            }
        });
    } catch (error) {
        console.error('Error al cancelar reservación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    createReservation,
    createPublicReservation,
    getActiveReservations,
    updateReservation,
    cancelReservation,
    MAX_PERSONAS_RESERVA
};

