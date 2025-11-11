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

        return res.json({ success: true, opiniones });
    } catch (error) {
        console.error("Error en obtenerOpinionesPorProducto:", error.message);
        return res.status(500).json({ 
            success: false, 
            mensaje: 'Error al obtener opiniones', 
            error: error.message 
        });
    }
};

// Crear opinión
exports.crearOpinion = async (req, res) => {
    let { id_producto, id_cliente, calificacion, comentario } = req.body;


    if (!id_cliente || id_cliente == 0) {
        id_cliente = 1; 
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO opinion (id_producto, id_cliente, calificacion, comentario, fecha_opinion, aprobada, tipo_opinion)
            VALUES (?, ?, ?, ?, NOW(), FALSE, 'producto')`,
            [id_producto, id_cliente, calificacion, comentario]
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Opinión creada correctamente',
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

