const db = require('../config/database');

// Función para obtener inventario por área
const getInventarioPorArea = async (req, res) => {
    try {
        const { area } = req.query;
        const userId = req.user.id;

        // Validar que se proporcione el área
        if (!area) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro área es requerido'
            });
        }

        // Validar que el área sea válida
        const areasValidas = ['cocina', 'bebidas', 'postres', 'almacen'];
        if (!areasValidas.includes(area)) {
            return res.status(400).json({
                success: false,
                message: 'Área no válida. Las áreas válidas son: cocina, bebidas, postres, almacen'
            });
        }

        // Verificar que el usuario tenga permisos para ver el inventario
        const userQuery = `
            SELECT u.id, u.tipoUsuario, u.area_trabajo 
            FROM usuarios u 
            WHERE u.id = ?
        `;
        
        const [userRows] = await db.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        // Verificar permisos: empleados y administradores pueden ver inventario
        if (user.tipoUsuario !== 'Empleado' && user.tipoUsuario !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver el inventario'
            });
        }

        // Si es empleado, verificar que tenga acceso al área específica
        if (user.tipoUsuario === 'Empleado' && user.area_trabajo !== area && user.area_trabajo !== 'todas') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver el inventario de esta área'
            });
        }

        // Consultar inventario del área específica
        const inventarioQuery = `
            SELECT 
                i.id,
                i.nombre_item,
                i.cantidad_actual,
                i.cantidad_minima,
                i.unidad_medida,
                i.area,
                i.ultima_actualizacion,
                i.observaciones,
                i.estado
            FROM inventario i
            WHERE i.area = ? AND i.estado = 'activo'
            ORDER BY 
                CASE 
                    WHEN i.cantidad_actual <= i.cantidad_minima THEN 1
                    WHEN i.cantidad_actual <= i.cantidad_minima * 2 THEN 2
                    ELSE 3
                END,
                i.nombre_item ASC
        `;

        const [inventarioRows] = await db.execute(inventarioQuery, [area]);

        // Formatear la respuesta
        const inventario = inventarioRows.map(item => ({
            id: item.id,
            nombre_item: item.nombre_item,
            cantidad_actual: item.cantidad_actual,
            cantidad_minima: item.cantidad_minima,
            unidad_medida: item.unidad_medida,
            area: item.area,
            ultima_actualizacion: item.ultima_actualizacion ? 
                new Date(item.ultima_actualizacion).toLocaleDateString('es-ES') : 
                'No disponible',
            observaciones: item.observaciones,
            estado: item.estado,
            stock_bajo: item.cantidad_actual <= item.cantidad_minima,
            stock_medio: item.cantidad_actual <= item.cantidad_minima * 2 && item.cantidad_actual > item.cantidad_minima
        }));

        res.json({
            success: true,
            data: {
                area: area,
                total_items: inventario.length,
                items_bajo_stock: inventario.filter(item => item.stock_bajo).length,
                items: inventario
            }
        });

    } catch (error) {
        console.error('Error en getInventarioPorArea:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener el inventario'
        });
    }
};

// Función para obtener todas las áreas de inventario disponibles
const getAreasInventario = async (req, res) => {
    try {
        const userId = req.user.id;

        // Verificar que el usuario tenga permisos
        const userQuery = `
            SELECT u.id, u.tipoUsuario, u.area_trabajo 
            FROM usuarios u 
            WHERE u.id = ?
        `;
        
        const [userRows] = await db.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        if (user.tipoUsuario !== 'Empleado' && user.tipoUsuario !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver las áreas de inventario'
            });
        }

        // Obtener áreas disponibles
        const areasQuery = `
            SELECT DISTINCT area, COUNT(*) as total_items
            FROM inventario 
            WHERE estado = 'activo'
            GROUP BY area
            ORDER BY area
        `;

        const [areasRows] = await db.execute(areasQuery);

        const areas = areasRows.map(row => ({
            nombre: row.area,
            total_items: row.total_items,
            accesible: user.tipoUsuario === 'Administrador' || 
                      user.area_trabajo === row.area || 
                      user.area_trabajo === 'todas'
        }));

        res.json({
            success: true,
            data: {
                areas: areas
            }
        });

    } catch (error) {
        console.error('Error en getAreasInventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener las áreas'
        });
    }
};

// Función para actualizar cantidad de un item del inventario
const actualizarCantidadItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { nueva_cantidad, observaciones } = req.body;
        const userId = req.user.id;

        // Validar datos de entrada
        if (!nueva_cantidad || nueva_cantidad < 0) {
            return res.status(400).json({
                success: false,
                message: 'La nueva cantidad debe ser un número positivo'
            });
        }

        // Verificar que el usuario tenga permisos
        const userQuery = `
            SELECT u.id, u.tipoUsuario, u.area_trabajo 
            FROM usuarios u 
            WHERE u.id = ?
        `;
        
        const [userRows] = await db.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        if (user.tipoUsuario !== 'Empleado' && user.tipoUsuario !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para actualizar el inventario'
            });
        }

        // Verificar que el item existe y obtener su información
        const itemQuery = `
            SELECT id, nombre_item, area, cantidad_actual
            FROM inventario 
            WHERE id = ? AND estado = 'activo'
        `;

        const [itemRows] = await db.execute(itemQuery, [itemId]);

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item de inventario no encontrado'
            });
        }

        const item = itemRows[0];

        // Si es empleado, verificar que tenga acceso al área del item
        if (user.tipoUsuario === 'Empleado' && user.area_trabajo !== item.area && user.area_trabajo !== 'todas') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para actualizar items de esta área'
            });
        }

        // Actualizar la cantidad del item
        const updateQuery = `
            UPDATE inventario 
            SET 
                cantidad_actual = ?,
                ultima_actualizacion = NOW(),
                observaciones = COALESCE(?, observaciones)
            WHERE id = ?
        `;

        await db.execute(updateQuery, [nueva_cantidad, observaciones, itemId]);

        res.json({
            success: true,
            message: `Cantidad de ${item.nombre_item} actualizada exitosamente`,
            data: {
                item_id: itemId,
                nombre_item: item.nombre_item,
                cantidad_anterior: item.cantidad_actual,
                cantidad_nueva: nueva_cantidad,
                area: item.area
            }
        });

    } catch (error) {
        console.error('Error en actualizarCantidadItem:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar el inventario'
        });
    }
};

module.exports = {
    getInventarioPorArea,
    getAreasInventario,
    actualizarCantidadItem
};
