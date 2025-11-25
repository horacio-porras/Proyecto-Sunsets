const { pool } = require('../config/database');

const normalizeBoolean = (value) => ['true', '1', 1, true, 'on', 'yes'].includes(value);

const parseDateTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Las fechas deben tener un formato válido');
    }
    return date;
};

const buildVigenciaLabel = (inicio, fin) => {
    if (!inicio && !fin) return 'Sin límite definido';

    const format = (date) => date.toLocaleString('es-CR', {
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

const parseRecompensaPayload = (payload = {}) => {
    const nombre = payload.nombreRecompensa || payload.nombre || '';
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la recompensa es obligatorio');
    }

    const tipo = (payload.tipoRecompensa || payload.tipo || '').toLowerCase();
    // Aceptar los nuevos tipos y mantener compatibilidad con tipos antiguos
    const tiposValidos = ['descuento_colones', 'descuento_porcentaje', 'descuento', 'producto', 'experiencia'];
    if (!tiposValidos.includes(tipo)) {
        throw new Error('Tipo de recompensa no válido. Debe ser "descuento_colones" o "descuento_porcentaje"');
    }

    const valorRaw = payload.valorRecompensa ?? payload.valor ?? '';
    const valor = valorRaw !== '' ? parseFloat(valorRaw) : null;
    if (valor !== null && Number.isNaN(valor)) {
        throw new Error('El valor de la recompensa debe ser un número válido');
    }

    const puntosRaw = payload.puntosRequeridos ?? payload.puntos ?? '';
    const puntos = puntosRaw !== '' ? parseInt(puntosRaw, 10) : null;
    if (puntos === null || Number.isNaN(puntos) || puntos < 0) {
        throw new Error('Los puntos requeridos deben ser un número mayor o igual a 0');
    }

    const fechaInicio = parseDateTime(payload.fechaInicio);
    const fechaFin = parseDateTime(payload.fechaFin);

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        throw new Error('La fecha de inicio no puede ser posterior a la fecha de finalización');
    }

    return {
        nombre: nombre.trim(),
        descripcion: payload.descripcion ? payload.descripcion.trim() : null,
        tipo,
        valor,
        puntos,
        fechaInicio,
        fechaFin,
        activa: normalizeBoolean(payload.activa)
    };
};

const mapRecompensaRow = (row, canjeInfo = null) => {
    const fechaInicio = row.fecha_inicio ? new Date(row.fecha_inicio) : null;
    const fechaFin = row.fecha_fin ? new Date(row.fecha_fin) : null;
    const ahora = new Date();

    const disponibleTemporalmente =
        (!fechaInicio || fechaInicio <= ahora) &&
        (!fechaFin || fechaFin >= ahora);

    return {
        id_recompensa: row.id_recompensa,
        nombre_recompensa: row.nombre_recompensa,
        descripcion: row.descripcion,
        tipo_recompensa: row.tipo_recompensa,
        valor_recompensa: row.valor_recompensa != null ? Number(row.valor_recompensa) : null,
        puntos_requeridos: row.puntos_requeridos != null ? Number(row.puntos_requeridos) : 0,
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        activa: !!row.activa,
        vigencia: buildVigenciaLabel(fechaInicio, fechaFin),
        disponible: !!row.activa && disponibleTemporalmente,
        ya_canjeada: !!canjeInfo,
        estado_canje_cliente: canjeInfo ? canjeInfo.estado_canje : null
    };
};

const getRecompensasAdmin = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                id_recompensa,
                nombre_recompensa,
                descripcion,
                tipo_recompensa,
                valor_recompensa,
                puntos_requeridos,
                fecha_inicio,
                fecha_fin,
                activa
            FROM recompensa
            ORDER BY fecha_inicio DESC, nombre_recompensa ASC
        `);

        const recompensas = rows.map(row => mapRecompensaRow(row));

        res.json({
            success: true,
            data: {
                recompensas
            }
        });
    } catch (error) {
        console.error('Error al obtener recompensas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const createRecompensa = async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            tipo,
            valor,
            puntos,
            fechaInicio,
            fechaFin,
            activa
        } = parseRecompensaPayload(req.body);

        await pool.execute(
            `INSERT INTO recompensa (
                nombre_recompensa,
                descripcion,
                tipo_recompensa,
                valor_recompensa,
                puntos_requeridos,
                fecha_inicio,
                fecha_fin,
                activa
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                descripcion,
                tipo,
                valor,
                puntos,
                fechaInicio,
                fechaFin,
                activa ? 1 : 0
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Recompensa creada correctamente'
        });
    } catch (error) {
        console.error('Error al crear recompensa:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'No se pudo crear la recompensa'
        });
    }
};

const updateRecompensa = async (req, res) => {
    try {
        const recompensaId = req.params.id;

        const [existingRows] = await pool.execute(
            `SELECT id_recompensa FROM recompensa WHERE id_recompensa = ?`,
            [recompensaId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa no encontrada'
            });
        }

        const {
            nombre,
            descripcion,
            tipo,
            valor,
            puntos,
            fechaInicio,
            fechaFin,
            activa
        } = parseRecompensaPayload(req.body);

        await pool.execute(
            `UPDATE recompensa
             SET nombre_recompensa = ?, descripcion = ?, tipo_recompensa = ?, valor_recompensa = ?,
                 puntos_requeridos = ?, fecha_inicio = ?, fecha_fin = ?, activa = ?
             WHERE id_recompensa = ?`,
            [
                nombre,
                descripcion,
                tipo,
                valor,
                puntos,
                fechaInicio,
                fechaFin,
                activa ? 1 : 0,
                recompensaId
            ]
        );

        res.json({
            success: true,
            message: 'Recompensa actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar recompensa:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'No se pudo actualizar la recompensa'
        });
    }
};

const actualizarEstadoRecompensa = async (req, res) => {
    try {
        const recompensaId = req.params.id;
        const { activa } = req.body;

        if (activa === undefined) {
            return res.status(400).json({
                success: false,
                message: 'El campo "activa" es obligatorio'
            });
        }

        const [existingRows] = await pool.execute(
            `SELECT id_recompensa FROM recompensa WHERE id_recompensa = ?`,
            [recompensaId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa no encontrada'
            });
        }

        await pool.execute(
            `UPDATE recompensa SET activa = ? WHERE id_recompensa = ?`,
            [normalizeBoolean(activa) ? 1 : 0, recompensaId]
        );

        res.json({
            success: true,
            message: `Recompensa ${normalizeBoolean(activa) ? 'activada' : 'desactivada'} correctamente`
        });
    } catch (error) {
        console.error('Error al actualizar estado de recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'No se pudo actualizar el estado de la recompensa'
        });
    }
};

const deleteRecompensa = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const recompensaId = req.params.id;

        await connection.beginTransaction();

        const [existingRows] = await connection.execute(
            `SELECT id_recompensa FROM recompensa WHERE id_recompensa = ?`,
            [recompensaId]
        );

        if (existingRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Recompensa no encontrada'
            });
        }

        await connection.execute(
            `UPDATE canje_puntos
             SET id_recompensa = NULL
             WHERE id_recompensa = ?`,
            [recompensaId]
        );

        await connection.execute(
            `DELETE FROM recompensa WHERE id_recompensa = ?`,
            [recompensaId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Recompensa eliminada correctamente'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error al eliminar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'No se pudo eliminar la recompensa'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const getRecompensasCliente = async (req, res) => {
    try {
        const userId = req.user.id;

        const [clienteRows] = await pool.execute(
            `SELECT id_cliente, puntos_acumulados FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        const cliente = clienteRows[0];

        const [canjeRows] = await pool.execute(
            `SELECT id_recompensa, estado_canje
             FROM canje_puntos
             WHERE id_cliente = ?
               AND estado_canje IN ('pendiente', 'aplicado', 'completado')`,
            [cliente.id_cliente]
        );
        const canjesMap = new Map(canjeRows.map(row => [row.id_recompensa, row]));

        const [rows] = await pool.execute(
            `SELECT 
                id_recompensa,
                nombre_recompensa,
                descripcion,
                tipo_recompensa,
                valor_recompensa,
                puntos_requeridos,
                fecha_inicio,
                fecha_fin,
                activa
             FROM recompensa`
        );

        const recompensas = rows.map(row => mapRecompensaRow(row, canjesMap.get(row.id_recompensa)));

        // Calcular puntos disponibles: puntos_acumulados - puntos ya usados
        const [puntosUsadosRows] = await pool.execute(
            `SELECT COALESCE(SUM(puntos_utilizados), 0) as puntos_usados
             FROM canje_puntos
             WHERE id_cliente = ? AND estado_canje IN ('pendiente', 'aplicado', 'completado')`,
            [cliente.id_cliente]
        );
        
        const puntosUsados = Number(puntosUsadosRows[0]?.puntos_usados || 0);
        const puntosAcumulados = Number(cliente.puntos_acumulados || 0);
        const puntosDisponibles = Math.max(0, puntosAcumulados - puntosUsados);

        res.json({
            success: true,
            data: {
                puntosActuales: puntosDisponibles, // Puntos disponibles para usar
                puntosAcumulados: puntosAcumulados, // Puntos acumulados totales (para nivel)
                recompensas
            }
        });
    } catch (error) {
        console.error('Error al obtener recompensas para cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const canjearRecompensa = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const userId = req.user.id;
        const recompensaId = req.params.id;

        await connection.beginTransaction();

        const [clienteRows] = await connection.execute(
            `SELECT id_cliente, puntos_acumulados FROM cliente WHERE id_usuario = ? FOR UPDATE`,
            [userId]
        );

        if (clienteRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        const cliente = clienteRows[0];

        const [recompensaRows] = await connection.execute(
            `SELECT 
                id_recompensa,
                nombre_recompensa,
                tipo_recompensa,
                valor_recompensa,
                puntos_requeridos,
                fecha_inicio,
                fecha_fin,
                activa
             FROM recompensa
             WHERE id_recompensa = ? FOR UPDATE`,
            [recompensaId]
        );

        if (recompensaRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Recompensa no encontrada'
            });
        }

        const recompensa = recompensaRows[0];

        const [existingCanje] = await connection.execute(
            `SELECT id_canje, estado_canje
             FROM canje_puntos
             WHERE id_cliente = ? AND id_recompensa = ? AND estado_canje IN ('pendiente', 'aplicado', 'completado')
             LIMIT 1`,
            [cliente.id_cliente, recompensaId]
        );

        if (existingCanje.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Ya has canjeado esta recompensa.'
            });
        }

        const ahora = new Date();
        const fechaInicio = recompensa.fecha_inicio ? new Date(recompensa.fecha_inicio) : null;
        const fechaFin = recompensa.fecha_fin ? new Date(recompensa.fecha_fin) : null;

        if (!recompensa.activa ||
            (fechaInicio && fechaInicio > ahora) ||
            (fechaFin && fechaFin < ahora)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Esta recompensa no está disponible actualmente'
            });
        }

        // Calcular puntos disponibles: puntos_acumulados - puntos ya usados
        // Los puntos_acumulados solo aumentan (nunca disminuyen) para mantener el nivel del cliente
        const [puntosUsadosRows] = await connection.execute(
            `SELECT COALESCE(SUM(puntos_utilizados), 0) as puntos_usados
             FROM canje_puntos
             WHERE id_cliente = ? AND estado_canje IN ('pendiente', 'aplicado', 'completado')`,
            [cliente.id_cliente]
        );
        
        const puntosUsados = Number(puntosUsadosRows[0]?.puntos_usados || 0);
        const puntosAcumulados = Number(cliente.puntos_acumulados || 0);
        const puntosDisponibles = Math.max(0, puntosAcumulados - puntosUsados);

        // Validar que tenga suficientes puntos disponibles para canjear la recompensa
        if (puntosDisponibles < recompensa.puntos_requeridos) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'No tienes suficientes puntos disponibles para canjear esta recompensa'
            });
        }

        // NO restamos los puntos de puntos_acumulados porque estos nunca deben disminuir
        // ya que afectan el nivel del cliente (Bronce, Plata, Oro, Diamante)
        // Los puntos acumulados solo aumentan con cada compra

        // Registrar el movimiento de puntos en programa_lealtad
        // Nota: Los puntos acumulados NO se restan, solo se registra el uso en programa_lealtad
        const nuevosPuntosDisponibles = puntosDisponibles - recompensa.puntos_requeridos;
        await connection.execute(
            `INSERT INTO programa_lealtad (
                id_cliente,
                puntos_movimiento,
                tipo_transaccion,
                descripcion,
                fecha_transaccion,
                id_pedido_relacionado
            ) VALUES (?, ?, 'canje', ?, NOW(), NULL)`,
            [
                cliente.id_cliente,
                -Math.abs(recompensa.puntos_requeridos),
                `Canje de puntos por ${recompensa.nombre_recompensa} (puntos disponibles restantes: ${nuevosPuntosDisponibles})`
            ]
        );

        const [canjeResult] = await connection.execute(
            `INSERT INTO canje_puntos (
                id_cliente,
                puntos_utilizados,
                producto_canjeado,
                valor_canje,
                fecha_canje,
                estado_canje,
                id_recompensa
            ) VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
            [
                cliente.id_cliente,
                recompensa.puntos_requeridos,
                recompensa.nombre_recompensa,
                recompensa.valor_recompensa || 0,
                (recompensa.tipo_recompensa === 'descuento' || recompensa.tipo_recompensa === 'descuento_colones' || recompensa.tipo_recompensa === 'descuento_porcentaje') ? 'pendiente' : 'completado',
                recompensa.id_recompensa
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: (recompensa.tipo_recompensa === 'descuento' || recompensa.tipo_recompensa === 'descuento_colones' || recompensa.tipo_recompensa === 'descuento_porcentaje')
                ? '¡Descuento canjeado! Se aplicará automáticamente en tu próxima compra.'
                : 'Canje realizado con éxito. Pronto recibirás más detalles en tu correo.',
            data: {
                puntos_restantes: nuevosPuntosDisponibles, // Puntos disponibles después del canje
                recompensa: {
                    id_recompensa: recompensa.id_recompensa,
                    nombre_recompensa: recompensa.nombre_recompensa,
                    tipo_recompensa: recompensa.tipo_recompensa,
                    valor_recompensa: recompensa.valor_recompensa || 0
                },
                canje: {
                    id_canje: canjeResult.insertId,
                    estado_canje: recompensa.tipo_recompensa === 'descuento' ? 'pendiente' : 'completado',
                    fecha_canje: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al canjear recompensa:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor'
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    // Admin
    getRecompensasAdmin,
    createRecompensa,
    updateRecompensa,
    actualizarEstadoRecompensa,
    deleteRecompensa,
    // Cliente
    getRecompensasCliente,
    canjearRecompensa
};

