const { pool } = require('../config/database');

// Obtener opiniones por producto
exports.obtenerOpinionesPorProducto = async (req, res) => {
    const { id_producto } = req.params;

    try {
        const [opiniones] = await pool.query(
            `SELECT 
                o.id_opinion,
                o.calificacion,
                o.comentario,
                o.fecha_opinion,
                o.aprobada,
                c.id_cliente,
                u.nombre AS nombre_cliente,
                CASE 
                    WHEN EXISTS(
                        SELECT 1 
                        FROM pedido p
                        JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
                        WHERE p.id_cliente = o.id_cliente AND dp.id_producto = o.id_producto
                    ) THEN TRUE
                    ELSE FALSE
                END AS verificado
            FROM opinion o
            JOIN cliente c ON o.id_cliente = c.id_cliente
            JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE o.id_producto = ? AND o.aprobada = TRUE
            ORDER BY o.fecha_opinion DESC`,
            [id_producto]
        );

        // Calcular promedio de calificaciones
        const promedio = opiniones.length > 0
            ? (opiniones.reduce((sum, op) => sum + op.calificacion, 0) / opiniones.length).toFixed(1)
            : 0;

        return res.json({ 
            success: true, 
            opiniones,
            promedio: parseFloat(promedio),
            total: opiniones.length
        });
    } catch (error) {
        console.error("Error en obtenerOpinionesPorProducto:", error.message);
        return res.status(500).json({ 
            success: false, 
            mensaje: 'Error al obtener opiniones', 
            error: error.message 
        });
    }
};

// Obtener promedio de calificaciones por producto
exports.obtenerPromedioProducto = async (req, res) => {
    const { id_producto } = req.params;

    try {
        const [result] = await pool.query(
            `SELECT 
                AVG(calificacion) as promedio,
                COUNT(*) as total
            FROM opinion
            WHERE id_producto = ? AND aprobada = TRUE`,
            [id_producto]
        );

        const promedio = result[0].promedio ? parseFloat(result[0].promedio).toFixed(1) : 0;
        const total = result[0].total || 0;

        return res.json({ 
            success: true, 
            promedio: parseFloat(promedio),
            total: parseInt(total)
        });
    } catch (error) {
        console.error("Error en obtenerPromedioProducto:", error.message);
        return res.status(500).json({ 
            success: false, 
            mensaje: 'Error al obtener promedio', 
            error: error.message 
        });
    }
};

// Obtener opiniones del restaurante (para carrusel)
exports.obtenerOpinionesRestaurante = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const [opiniones] = await pool.query(
            `SELECT 
                o.id_opinion,
                o.calificacion,
                o.comentario,
                o.fecha_opinion,
                u.nombre AS nombre_cliente,
                p.nombre AS nombre_producto,
                o.tipo_opinion
            FROM opinion o
            JOIN cliente c ON o.id_cliente = c.id_cliente
            JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN producto p ON o.id_producto = p.id_producto
            WHERE o.aprobada = TRUE
            ORDER BY o.fecha_opinion DESC
            LIMIT ?`,
            [limit]
        );

        return res.json({ 
            success: true, 
            opiniones 
        });
    } catch (error) {
        console.error("Error en obtenerOpinionesRestaurante:", error.message);
        return res.status(500).json({ 
            success: false, 
            mensaje: 'Error al obtener opiniones', 
            error: error.message 
        });
    }
};

// Verificar si el cliente puede opinar sobre un producto
exports.verificarPuedeOpinar = async (req, res) => {
    const { id_producto } = req.params;
    const userId = req.user.id;

    try {
        // Obtener id_cliente desde id_usuario
        const [clienteRows] = await pool.query(
            `SELECT id_cliente FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.json({
                success: true,
                puedeOpinar: false,
                razon: 'No eres un cliente registrado'
            });
        }

        const id_cliente = clienteRows[0].id_cliente;

        // Verificar si el cliente ha realizado un pedido con este producto que esté "entregado"
        const [pedidos] = await pool.query(
            `SELECT DISTINCT p.id_pedido
            FROM pedido p
            JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
            WHERE p.id_cliente = ? AND dp.id_producto = ? AND p.estado_pedido = 'entregado'`,
            [id_cliente, id_producto]
        );

        // Verificar si ya opinó sobre este producto
        const [opinionExistente] = await pool.query(
            `SELECT id_opinion FROM opinion 
            WHERE id_cliente = ? AND id_producto = ?`,
            [id_cliente, id_producto]
        );

        const puedeOpinar = pedidos.length > 0 && opinionExistente.length === 0;

        return res.json({
            success: true,
            puedeOpinar,
            razon: !puedeOpinar 
                ? (pedidos.length === 0 
                    ? 'Debes realizar un pedido con este producto y que esté entregado antes de opinar'
                    : 'Ya has opinado sobre este producto')
                : 'Puedes opinar'
        });
    } catch (error) {
        console.error("Error en verificarPuedeOpinar:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al verificar',
            error: error.message
        });
    }
};

// Verificar si el cliente puede opinar sobre el restaurante
exports.verificarPuedeOpinarRestaurante = async (req, res) => {
    const userId = req.user.id;

    try {
        // Obtener id_cliente desde id_usuario
        const [clienteRows] = await pool.query(
            `SELECT id_cliente FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.json({
                success: true,
                puedeOpinar: false,
                razon: 'No eres un cliente registrado'
            });
        }

        const id_cliente = clienteRows[0].id_cliente;

        // Verificar si el cliente ha realizado un pedido o reservación
        const [pedidos] = await pool.query(
            `SELECT id_pedido FROM pedido WHERE id_cliente = ?`,
            [id_cliente]
        );

        const [reservaciones] = await pool.query(
            `SELECT id_reservacion FROM reservacion WHERE id_cliente = ?`,
            [id_cliente]
        );

        // Verificar si ya opinó sobre el restaurante
        const [opinionExistente] = await pool.query(
            `SELECT id_opinion FROM opinion 
            WHERE id_cliente = ? AND tipo_opinion = 'restaurante'`,
            [id_cliente]
        );

        const puedeOpinar = (pedidos.length > 0 || reservaciones.length > 0) && opinionExistente.length === 0;

        return res.json({
            success: true,
            puedeOpinar,
            razon: !puedeOpinar 
                ? ((pedidos.length === 0 && reservaciones.length === 0)
                    ? 'Debes realizar un pedido o reservación antes de opinar'
                    : 'Ya has opinado sobre el restaurante')
                : 'Puedes opinar'
        });
    } catch (error) {
        console.error("Error en verificarPuedeOpinarRestaurante:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al verificar',
            error: error.message
        });
    }
};

// Crear opinión
exports.crearOpinion = async (req, res) => {
    const { id_producto, calificacion, comentario, tipo_opinion } = req.body;
    const userId = req.user.id;

    if (!calificacion || calificacion < 1 || calificacion > 5) {
        return res.status(400).json({
            success: false,
            mensaje: 'La calificación debe estar entre 1 y 5'
        });
    }

    try {
        // Obtener id_cliente desde id_usuario
        const [clienteRows] = await pool.query(
            `SELECT id_cliente FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(403).json({
                success: false,
                mensaje: 'No eres un cliente registrado'
            });
        }

        const id_cliente = clienteRows[0].id_cliente;
        const tipo = tipo_opinion || (id_producto ? 'producto' : 'restaurante');

        // Verificar si es opinión de producto y si puede opinar
        if (tipo === 'producto' && id_producto) {
            const [pedidos] = await pool.query(
                `SELECT DISTINCT p.id_pedido
                FROM pedido p
                JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
                WHERE p.id_cliente = ? AND dp.id_producto = ? AND p.estado_pedido = 'entregado'`,
                [id_cliente, id_producto]
            );

            if (pedidos.length === 0) {
                return res.status(403).json({
                    success: false,
                    mensaje: 'Debes realizar un pedido con este producto y que esté entregado antes de opinar'
                });
            }

            // Verificar si ya opinó
            const [opinionExistente] = await pool.query(
                `SELECT id_opinion FROM opinion 
                WHERE id_cliente = ? AND id_producto = ?`,
                [id_cliente, id_producto]
            );

            if (opinionExistente.length > 0) {
                return res.status(403).json({
                    success: false,
                    mensaje: 'Ya has opinado sobre este producto'
                });
            }
        } else if (tipo === 'restaurante') {
            // Verificar si ya opinó sobre el restaurante
            const [opinionExistente] = await pool.query(
                `SELECT id_opinion FROM opinion 
                WHERE id_cliente = ? AND tipo_opinion = 'restaurante'`,
                [id_cliente]
            );

            if (opinionExistente.length > 0) {
                return res.status(403).json({
                    success: false,
                    mensaje: 'Ya has opinado sobre el restaurante'
                });
            }
        }

        const [result] = await pool.query(
            `INSERT INTO opinion (id_producto, id_cliente, calificacion, comentario, fecha_opinion, aprobada, tipo_opinion)
            VALUES (?, ?, ?, ?, NOW(), FALSE, ?)`,
            [id_producto || null, id_cliente, calificacion, comentario, tipo]
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Opinión creada correctamente. Será revisada antes de ser publicada.',
            id_opinion: result.insertId
        });
    } catch (error) {
        console.error("Error en crearOpinion:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al agregar opinión',
            error: error.message
        });
    }
};

// Obtener opiniones del cliente autenticado
exports.obtenerOpinionesCliente = async (req, res) => {
    const userId = req.user.id;

    try {
        // Obtener id_cliente desde id_usuario
        const [clienteRows] = await pool.query(
            `SELECT id_cliente FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.json({
                success: true,
                opiniones: []
            });
        }

        const id_cliente = clienteRows[0].id_cliente;

        const [opiniones] = await pool.query(
            `SELECT 
                o.id_opinion,
                o.calificacion,
                o.comentario,
                o.fecha_opinion,
                o.aprobada,
                o.tipo_opinion,
                p.nombre AS nombre_producto,
                p.id_producto
            FROM opinion o
            LEFT JOIN producto p ON o.id_producto = p.id_producto
            WHERE o.id_cliente = ?
            ORDER BY o.fecha_opinion DESC`,
            [id_cliente]
        );

        return res.json({
            success: true,
            opiniones
        });
    } catch (error) {
        console.error("Error en obtenerOpinionesCliente:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al obtener opiniones',
            error: error.message
        });
    }
};

// Obtener opiniones pendientes de moderación
exports.obtenerOpinionesPendientes = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        
        // Obtener total de opiniones pendientes
        const [totalRows] = await pool.query(
            `SELECT COUNT(*) as total FROM opinion WHERE aprobada = FALSE`
        );
        const total = totalRows[0].total;

        const [opiniones] = await pool.query(
            `SELECT 
                o.id_opinion,
                o.calificacion,
                o.comentario,
                o.fecha_opinion,
                o.tipo_opinion,
                u.nombre AS nombre_cliente,
                u.correo AS correo_cliente,
                p.nombre AS nombre_producto,
                p.id_producto
            FROM opinion o
            JOIN cliente c ON o.id_cliente = c.id_cliente
            JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN producto p ON o.id_producto = p.id_producto
            WHERE o.aprobada = FALSE
            ORDER BY o.fecha_opinion DESC
            LIMIT ${limit} OFFSET ${offset}`
        );

        return res.json({
            success: true,
            opiniones,
            total: parseInt(total),
            limit,
            offset
        });
    } catch (error) {
        console.error("Error en obtenerOpinionesPendientes:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al obtener opiniones pendientes',
            error: error.message
        });
    }
};

// Aprobar una opinión
exports.aprobarOpinion = async (req, res) => {
    const { id_opinion } = req.params;
    const userId = req.user.id;

    try {
        // Obtener id_admin desde id_usuario
        const [adminRows] = await pool.query(
            `SELECT id_admin FROM administrador WHERE id_usuario = ?`,
            [userId]
        );

        if (adminRows.length === 0) {
            return res.status(403).json({
                success: false,
                mensaje: 'No eres un administrador'
            });
        }

        const id_admin = adminRows[0].id_admin;

        // Verificar que la opinión existe y no está aprobada
        const [opinionRows] = await pool.query(
            `SELECT id_opinion, aprobada FROM opinion WHERE id_opinion = ?`,
            [id_opinion]
        );

        if (opinionRows.length === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Opinión no encontrada'
            });
        }

        if (opinionRows[0].aprobada) {
            return res.status(400).json({
                success: false,
                mensaje: 'La opinión ya está aprobada'
            });
        }

        // Aprobar la opinión
        await pool.query(
            `UPDATE opinion 
            SET aprobada = TRUE, id_moderador = ? 
            WHERE id_opinion = ?`,
            [id_admin, id_opinion]
        );

        return res.json({
            success: true,
            mensaje: 'Opinión aprobada correctamente'
        });
    } catch (error) {
        console.error("Error en aprobarOpinion:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al aprobar opinión',
            error: error.message
        });
    }
};

// Actualizar una opinión del cliente
exports.actualizarOpinion = async (req, res) => {
    const { id_opinion } = req.params;
    const { calificacion, comentario } = req.body;
    const userId = req.user.id;

    if (!calificacion || calificacion < 1 || calificacion > 5) {
        return res.status(400).json({
            success: false,
            mensaje: 'La calificación debe estar entre 1 y 5'
        });
    }

    try {
        // Obtener id_cliente desde id_usuario
        const [clienteRows] = await pool.query(
            `SELECT id_cliente FROM cliente WHERE id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(403).json({
                success: false,
                mensaje: 'No eres un cliente registrado'
            });
        }

        const id_cliente = clienteRows[0].id_cliente;

        // Verificar que la opinión pertenezca al cliente
        const [opinionRows] = await pool.query(
            `SELECT id_opinion FROM opinion WHERE id_opinion = ? AND id_cliente = ?`,
            [id_opinion, id_cliente]
        );

        if (opinionRows.length === 0) {
            return res.status(403).json({
                success: false,
                mensaje: 'No tienes permiso para editar esta opinión'
            });
        }

        // Actualizar la opinión y poner aprobada = FALSE para que vuelva a necesitar aprobación
        await pool.query(
            `UPDATE opinion 
            SET calificacion = ?, comentario = ?, fecha_opinion = NOW(), aprobada = FALSE, id_moderador = NULL
            WHERE id_opinion = ? AND id_cliente = ?`,
            [calificacion, comentario || null, id_opinion, id_cliente]
        );

        return res.json({
            success: true,
            mensaje: 'Opinión actualizada correctamente. Será revisada nuevamente antes de ser publicada.'
        });
    } catch (error) {
        console.error("Error en actualizarOpinion:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar opinión',
            error: error.message
        });
    }
};

// Rechazar/eliminar una opinión
exports.rechazarOpinion = async (req, res) => {
    const { id_opinion } = req.params;
    const userId = req.user.id;

    try {
        // Obtener id_admin desde id_usuario
        const [adminRows] = await pool.query(
            `SELECT id_admin FROM administrador WHERE id_usuario = ?`,
            [userId]
        );

        if (adminRows.length === 0) {
            return res.status(403).json({
                success: false,
                mensaje: 'No eres un administrador'
            });
        }

        // Verificar que la opinión existe
        const [opinionRows] = await pool.query(
            `SELECT id_opinion FROM opinion WHERE id_opinion = ?`,
            [id_opinion]
        );

        if (opinionRows.length === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Opinión no encontrada'
            });
        }

        // Eliminar la opinión
        await pool.query(
            `DELETE FROM opinion WHERE id_opinion = ?`,
            [id_opinion]
        );

        return res.json({
            success: true,
            mensaje: 'Opinión rechazada y eliminada correctamente'
        });
    } catch (error) {
        console.error("Error en rechazarOpinion:", error.message);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al rechazar opinión',
            error: error.message
        });
    }
};

