const { pool } = require('../config/database');

exports.getInventarioPorArea = async (req, res) => {
    try {
        const area = req.query.area;
        const user = req.user;

        // Validar área
        if (!area) {
            return res.status(400).json({ success: false, message: 'Área requerida' });
        }

        // Validar permisos (solo empleados y admins pueden ver inventario)
        if (user.tipoUsuario !== 'Empleado' && user.tipoUsuario !== 'Administrador') {
            return res.status(403).json({ success: false, message: 'Permiso denegado' });
        }

        // Consulta inventario filtrado por área
        const [items] = await pool.execute(
            'SELECT nombre_item, cantidad_actual, cantidad_minima, unidad_medida, ultima_actualizacion FROM inventario WHERE area = ?',
            [area]
        );

        // Marcar stock bajo
        const inventario = items.map(item => ({
            ...item,
            stock_bajo: item.cantidad_actual <= item.cantidad_minima
        }));

        res.json({ success: true, items: inventario });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
