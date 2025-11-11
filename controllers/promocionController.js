const { pool } = require('../config/database');

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
            .map(value => parseInt(value, 10))
            .filter(value => !Number.isNaN(value));

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

const mapProductosPorPromocion = (productosRelacionados) => {
    const mapa = new Map();
    productosRelacionados.forEach(item => {
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

        const promociones = promocionesRows.map(row => {
            const fechaInicio = row.fecha_inicio ? new Date(row.fecha_inicio) : null;
            const fechaFin = row.fecha_fin ? new Date(row.fecha_fin) : null;

            return {
                ...row,
                vigencia: buildVigenciaLabel(fechaInicio, fechaFin),
                porcentaje_descuento: row.valor_descuento,
                productos: row.alcance === 'producto'
                    ? (mapaProductos.get(row.id_promocion) || [])
                    : []
            };
        });

        res.json({
            success: true,
            data: {
                promociones
            }
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
                data: {
                    promociones: []
                }
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
            productos: row.alcance === 'producto'
                ? (productosPorPromocion.get(row.id_promocion) || [])
                : []
        }));

        res.json({
            success: true,
            data: {
                promociones
            }
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
            const valores = productosSeleccionados.map(productoId => [productoId, idPromocion, new Date()]);
            await connection.query(
                `INSERT INTO producto_promocion (id_producto, id_promocion, fecha_aplicacion)
                 VALUES ?`,
                [valores]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Promoción creada correctamente',
            data: {
                id_promocion: idPromocion
            }
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

        await connection.execute(
            `DELETE FROM producto_promocion WHERE id_promocion = ?`,
            [promocionId]
        );

        if (alcance === 'producto' && productosSeleccionados.length > 0) {
            const valores = productosSeleccionados.map(productoId => [productoId, promocionId, new Date()]);
            await connection.query(
                `INSERT INTO producto_promocion (id_producto, id_promocion, fecha_aplicacion)
                 VALUES ?`,
                [valores]
            );
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

        await pool.execute(
            `UPDATE promocion SET activa = ? WHERE id_promocion = ?`,
            [normalizeBoolean(activa) ? 1 : 0, promocionId]
        );

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

        await connection.execute(
            `DELETE FROM producto_promocion WHERE id_promocion = ?`,
            [promocionId]
        );

        await connection.execute(
            `DELETE FROM promocion WHERE id_promocion = ?`,
            [promocionId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Promoción eliminada correctamente'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error al eliminar promoción:', error);
        res.status(500).json({
            success: false,
            message: 'No se pudo eliminar la promoción'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getPromociones,
    getPromocionesActivasPublic,
    createPromocion,
    updatePromocion,
    actualizarEstadoPromocion,
    deletePromocion
};

