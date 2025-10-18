const pool = require('../config/database');

// Crear producto
exports.crearProducto = async (req, res) => {
    const { nombre, descripcion, precio, id_categoria } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO producto (nombre, descripcion, precio, id_categoria, fecha_creacion) VALUES (?, ?, ?, ?, NOW())',
            [nombre, descripcion, precio, id_categoria]
        );
        res.status(201).json({ mensaje: 'Producto creado', id_producto: result.insertId });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear producto', error });
    }
};

// Listar productos
exports.obtenerProductos = async (req, res) => {
    try {
        const [productos] = await pool.query(
            `SELECT p.id_producto, p.nombre, p.descripcion, p.precio, c.nombre_categoria
             FROM producto p
             LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria`
        );
        res.json(productos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener productos', error });
    }
};

// Editar producto
exports.editarProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, id_categoria } = req.body;
    try {
        await pool.query(
            'UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, id_categoria = ? WHERE id_producto = ?',
            [nombre, descripcion, precio, id_categoria, id]
        );
        res.json({ mensaje: 'Producto actualizado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar producto', error });
    }
};

// Eliminar producto
exports.eliminarProducto = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM producto WHERE id_producto = ?', [id]);
        res.json({ mensaje: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar producto', error });
    }
};
