const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
const { sendReservationEmail } = require('../utils/mailer');

const MAX_PERSONAS_RESERVA = parseInt(process.env.RESERVA_MAX_PERSONAS, 10) || 8;
const TOTAL_MESAS_RESTAURANTE = parseInt(process.env.RESERVA_TOTAL_MESAS, 10) || 12;
const DURACION_RESERVA_MINUTOS = parseInt(process.env.RESERVA_DURACION_MINUTOS, 10) || 120;
const ESTADO_RESERVA_PENDIENTE = 'pendiente';
const ESTADO_RESERVA_CONFIRMADA = 'confirmada';
const ESTADO_RESERVA_CANCELADA = 'cancelada';
const ESTADOS_NO_MODIFICABLES = new Set(['cancelada', 'rechazada', 'completada']);

const enviarCorreoReservacionEnSegundoPlano = ({ to, nombre, numeroReserva, fecha, hora, personas, contexto }) => {
    setTimeout(async () => {
        try {
            console.log(`[Reservación] (${contexto}) Enviando correo de confirmación a: ${to}`);
            await sendReservationEmail({
                to,
                nombre,
                numeroReserva,
                fecha,
                hora,
                personas
            });
            console.log(`[Reservación] (${contexto}) ✓ Correo de confirmación enviado exitosamente`);
        } catch (mailErr) {
            console.error(`[Reservación] (${contexto}) ✗ ERROR al enviar correo de confirmación:`, mailErr.message);
            console.error(`[Reservación] (${contexto}) Detalles completos del error:`, mailErr);
        }
    }, 0);
};

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
    const preferenciaFinal = preferenciaMesa && preferenciaMesa.trim().length > 0
        ? preferenciaMesa.trim()
        : 'Cualquiera';
    const preferenciaTexto = `Preferencia de mesa: ${preferenciaFinal}`;

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

const obtenerReservacionActivaCliente = async (idCliente) => {
    const [rows] = await pool.execute(
        `SELECT id_reservacion, fecha_reserva, hora_reserva, estado_reserva
         FROM reservacion
         WHERE id_cliente = ?
           AND (estado_reserva IS NULL OR LOWER(estado_reserva) NOT IN ('cancelada', 'rechazada', 'completada'))
           AND fecha_reserva >= CURDATE()
         ORDER BY fecha_reserva ASC, hora_reserva ASC
         LIMIT 1`,
        [idCliente]
    );

    return rows[0] || null;
};

const normalizarHoraReserva = (horaReserva) => {
    if (typeof horaReserva !== 'string') return horaReserva;
    return /^\d{2}:\d{2}$/.test(horaReserva) ? `${horaReserva}:00` : horaReserva;
};

const calcularDisponibilidadMesas = async ({ fechaReserva, horaReserva, reservacionIdExcluir = null }) => {
    const horaNormalizada = normalizarHoraReserva(horaReserva);
    const inicioReserva = `${fechaReserva} ${horaNormalizada}`;

    let query = `
        SELECT COUNT(*) AS mesas_ocupadas
        FROM reservacion
        WHERE estado_reserva = ?
          AND TIMESTAMP(fecha_reserva, hora_reserva) < DATE_ADD(?, INTERVAL ? MINUTE)
          AND DATE_ADD(TIMESTAMP(fecha_reserva, hora_reserva), INTERVAL ? MINUTE) > ?
    `;
    const params = [
        ESTADO_RESERVA_CONFIRMADA,
        inicioReserva,
        DURACION_RESERVA_MINUTOS,
        DURACION_RESERVA_MINUTOS,
        inicioReserva
    ];

    if (reservacionIdExcluir) {
        query += ' AND id_reservacion <> ?';
        params.push(reservacionIdExcluir);
    }

    const [[ocupadasRow]] = await pool.execute(query, params);
    const mesasOcupadas = Number(ocupadasRow?.mesas_ocupadas || 0);
    const mesasDisponibles = Math.max(TOTAL_MESAS_RESTAURANTE - mesasOcupadas, 0);

    return {
        mesasOcupadas,
        mesasDisponibles,
        totalMesas: TOTAL_MESAS_RESTAURANTE,
        hayMesasDisponibles: mesasDisponibles > 0
    };
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
        const horaFinal = normalizarHoraReserva(hora_reserva);

        const reservacionActiva = await obtenerReservacionActivaCliente(clienteRows[0].id_cliente);
        if (reservacionActiva) {
            return res.status(409).json({
                success: false,
                message: 'Ya tienes una reservación activa. Podrás crear una nueva al día siguiente de tu reservación actual.',
                data: {
                    reservacion_activa: {
                        id_reservacion: reservacionActiva.id_reservacion,
                        fecha_reserva: reservacionActiva.fecha_reserva,
                        hora_reserva: reservacionActiva.hora_reserva,
                        estado_reserva: (reservacionActiva.estado_reserva || ESTADO_RESERVA_PENDIENTE).toLowerCase()
                    }
                }
            });
        }

        const notasFinales = buildNotasFinales(notas_especiales, preferencia_mesa);
        const disponibilidad = await calcularDisponibilidadMesas({
            fechaReserva: fecha_reserva,
            horaReserva: horaFinal
        });
        const estadoAutomatico = disponibilidad.hayMesasDisponibles
            ? ESTADO_RESERVA_CONFIRMADA
            : ESTADO_RESERVA_PENDIENTE;

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
                estadoAutomatico,
                notasFinales
            ]
        );

        // Generar número de reservación y enviar correo de confirmación al usuario autenticado
        const idReserva = result.insertId;
        const numeroReserva = `R-${String(idReserva).padStart(6, '0')}`;

        enviarCorreoReservacionEnSegundoPlano({
            to: userCorreo,
            nombre: userNombre,
            numeroReserva,
            fecha: fecha_reserva,
            hora: hora_reserva,
            personas: cantidad_personas,
            contexto: 'Auth'
        });

        return res.status(201).json({
            success: true,
            message: estadoAutomatico === ESTADO_RESERVA_CONFIRMADA
                ? 'Reservación creada y confirmada automáticamente'
                : 'Reservación creada en estado pendiente por falta de mesas disponibles en ese horario',
            data: {
                reservacion: {
                    id_reservacion: result.insertId,
                    fecha_reserva,
                    hora_reserva: horaFinal,
                    cantidad_personas: cantidadFinal,
                    estado_reserva: estadoAutomatico
                },
                max_capacidad: MAX_PERSONAS_RESERVA,
                total_mesas: TOTAL_MESAS_RESTAURANTE,
                duracion_reserva_minutos: DURACION_RESERVA_MINUTOS,
                numero_reserva: numeroReserva,
                preview_url: null
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
            preferencia: (preferencia_mesa && preferencia_mesa.trim()) || 'Cualquiera'
        });

        const horaFinal = normalizarHoraReserva(hora_reserva);
        const disponibilidad = await calcularDisponibilidadMesas({
            fechaReserva: fecha_reserva,
            horaReserva: horaFinal
        });
        const estadoAutomatico = disponibilidad.hayMesasDisponibles
            ? ESTADO_RESERVA_CONFIRMADA
            : ESTADO_RESERVA_PENDIENTE;

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
            ) VALUES (NULL, ?, ?, ?, ?, ?, NOW(), FALSE)`,
            [fecha_reserva, horaFinal, cantidad_personas, estadoAutomatico, datosInvitado]
        );

        const idReserva = result.insertId;
        const numeroReserva = `R-${String(idReserva).padStart(6, '0')}`;

        enviarCorreoReservacionEnSegundoPlano({
            to: correo,
            nombre,
            numeroReserva,
            fecha: fecha_reserva,
            hora: hora_reserva,
            personas: cantidad_personas,
            contexto: 'Pública'
        });

        return res.status(201).json({
            success: true,
            message: estadoAutomatico === ESTADO_RESERVA_CONFIRMADA
                ? 'Reservación creada y confirmada automáticamente'
                : 'Reservación creada en estado pendiente por falta de mesas disponibles en ese horario',
            data: {
                id_reservacion: idReserva,
                estado_reserva: estadoAutomatico,
                total_mesas: TOTAL_MESAS_RESTAURANTE,
                duracion_reserva_minutos: DURACION_RESERVA_MINUTOS,
                numero_reserva: numeroReserva,
                preview_url: null
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
                estado_reserva: (reserva.estado_reserva || ESTADO_RESERVA_PENDIENTE).toLowerCase(),
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

const getAllReservations = async (req, res) => {
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
            ORDER BY r.fecha_reserva DESC, r.hora_reserva DESC`,
            [userId]
        );

        // Actualizar automáticamente las reservaciones que ya pasaron su fecha/hora a "completada"
        const now = new Date();
        const reservacionesToUpdate = [];

        for (const reserva of rows) {
            // Solo actualizar si no está cancelada, rechazada o ya completada
            if (reserva.estado_reserva &&
                !['cancelada', 'rechazada', 'completada'].includes(String(reserva.estado_reserva).toLowerCase())) {
                
                const reservaDateTime = new Date(`${reserva.fecha_reserva}T${reserva.hora_reserva}`);
                
                // Si la fecha/hora de la reserva ya pasó, actualizar a "completada"
                if (reservaDateTime < now) {
                    reservacionesToUpdate.push(reserva.id_reservacion);
                }
            }
        }

        // Actualizar en lote todas las reservaciones que deben cambiar a "completada"
        if (reservacionesToUpdate.length > 0) {
            try {
                const placeholders = reservacionesToUpdate.map(() => '?').join(',');
                await pool.execute(
                    `UPDATE reservacion 
                     SET estado_reserva = 'completada' 
                     WHERE id_reservacion IN (${placeholders})`,
                    reservacionesToUpdate
                );
                console.log(`[Reservaciones] Actualizadas ${reservacionesToUpdate.length} reservaciones a estado "completada"`);
            } catch (updateError) {
                console.error('Error al actualizar estados de reservaciones:', updateError);
                // Continuar aunque falle la actualización
            }
        }

        // Volver a consultar para obtener los estados actualizados
        const [updatedRows] = await pool.execute(
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
            ORDER BY r.fecha_reserva DESC, r.hora_reserva DESC`,
            [userId]
        );

        const reservaciones = updatedRows.map(reserva => {
            const { notas, preferenciaMesa } = parseNotas(reserva.notas_especiales);
            return {
                id_reservacion: reserva.id_reservacion,
                fecha_reserva: reserva.fecha_reserva,
                hora_reserva: reserva.hora_reserva,
                cantidad_personas: reserva.cantidad_personas,
                estado_reserva: (reserva.estado_reserva || ESTADO_RESERVA_PENDIENTE).toLowerCase(),
                notas_especiales: notas,
                preferencia_mesa: preferenciaMesa,
                fecha_creacion: reserva.fecha_creacion
            };
        });

        return res.json({
            success: true,
            reservaciones
        });
    } catch (error) {
        console.error('Error al obtener todas las reservaciones:', error);
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

        const estadoActual = (reservacionActual.estado_reserva || '').toLowerCase();
        if (estadoActual && ESTADOS_NO_MODIFICABLES.has(estadoActual)) {
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
        const horaFinal = normalizarHoraReserva(hora_reserva);
        const cantidadFinal = Number(cantidad_personas);
        const disponibilidad = await calcularDisponibilidadMesas({
            fechaReserva: fecha_reserva,
            horaReserva: horaFinal,
            reservacionIdExcluir: reservacionId
        });
        const estadoAutomatico = disponibilidad.hayMesasDisponibles
            ? ESTADO_RESERVA_CONFIRMADA
            : ESTADO_RESERVA_PENDIENTE;

        await pool.execute(
            `UPDATE reservacion
             SET fecha_reserva = ?, hora_reserva = ?, cantidad_personas = ?, notas_especiales = ?, estado_reserva = ?
             WHERE id_reservacion = ?`,
            [
                fecha_reserva,
                horaFinal,
                cantidadFinal,
                notasFinales,
                estadoAutomatico,
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
                    estado_reserva: estadoAutomatico,
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

        const estadoActual = (reservacionActual.estado_reserva || '').toLowerCase();
        if (estadoActual && ESTADOS_NO_MODIFICABLES.has(estadoActual)) {
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

const getAllReservationsAdmin = async (req, res) => {
    try {
        const [reservaciones] = await pool.execute(`
            SELECT 
                r.id_reservacion,
                r.fecha_reserva,
                r.hora_reserva,
                r.cantidad_personas,
                r.estado_reserva,
                r.notas_especiales,
                r.fecha_creacion,
                COALESCE(u.nombre, JSON_UNQUOTE(JSON_EXTRACT(r.notas_especiales, '$.nombre'))) as nombre_cliente,
                COALESCE(u.correo, JSON_UNQUOTE(JSON_EXTRACT(r.notas_especiales, '$.correo'))) as correo_cliente,
                COALESCE(u.telefono, JSON_UNQUOTE(JSON_EXTRACT(r.notas_especiales, '$.telefono'))) as telefono_cliente
            FROM reservacion r
            LEFT JOIN cliente c ON r.id_cliente = c.id_cliente
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            ORDER BY r.fecha_creacion DESC
        `);

        const reservacionesFormateadas = reservaciones.map(reserva => {
            const notasParsed = parseNotas(reserva.notas_especiales);
            return {
                id_reservacion: reserva.id_reservacion,
                fecha_reserva: reserva.fecha_reserva,
                hora_reserva: reserva.hora_reserva,
                cantidad_personas: reserva.cantidad_personas,
                estado_reserva: (reserva.estado_reserva || ESTADO_RESERVA_PENDIENTE).toLowerCase(),
                fecha_creacion: reserva.fecha_creacion,
                nombre_cliente: reserva.nombre_cliente || 'Invitado',
                correo_cliente: reserva.correo_cliente || 'No disponible',
                telefono_cliente: reserva.telefono_cliente || 'No disponible',
                notas_especiales: notasParsed.notas,
                preferencia_mesa: notasParsed.preferenciaMesa
            };
        });

        return res.json({
            success: true,
            data: {
                reservaciones: reservacionesFormateadas
            }
        });
    } catch (error) {
        console.error('Error al obtener reservaciones (admin):', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const cancelReservationAdmin = async (req, res) => {
    try {
        const reservacionId = req.params.id;

        const [rows] = await pool.execute(
            `SELECT id_reservacion, estado_reserva
             FROM reservacion
             WHERE id_reservacion = ?`,
            [reservacionId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservación no encontrada'
            });
        }

        const reservacionActual = rows[0];

        const estadoActual = (reservacionActual.estado_reserva || '').toLowerCase();
        if (estadoActual && ESTADOS_NO_MODIFICABLES.has(estadoActual)) {
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
        console.error('Error al cancelar reservación (admin):', error);
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
    getAllReservations,
    updateReservation,
    cancelReservation,
    getAllReservationsAdmin,
    cancelReservationAdmin,
    MAX_PERSONAS_RESERVA
};

