const { pool } = require('../config/database');

//Obtiene inventario
const getInventario = async (req, res) => {
    try {
        const userId = req.user.id;
        const { area, limit, priority } = req.query;

        let inventarioQuery = `
            SELECT 
                i.id_inventario as id,
                i.nombre_item as nombre,
                i.cantidad_actual,
                i.cantidad_minima,
                i.unidad_medida,
                i.costo_unitario,
                i.ultima_actualizacion,
                i.area,
                CASE 
                    WHEN i.cantidad_actual <= i.cantidad_minima THEN 'bajo'
                    WHEN i.cantidad_actual <= (i.cantidad_minima * 1.5) THEN 'medio'
                    ELSE 'alto'
                END as estado_stock,
                u.nombre as responsable_nombre
            FROM inventario i
            LEFT JOIN empleado e ON i.id_responsable = e.id_empleado
            LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
        `;

        if (area) {
            inventarioQuery += ` WHERE i.area = '${area}'`;
        }

        if (priority === 'stock') {
            inventarioQuery += ` ORDER BY 
                CASE 
                    WHEN i.cantidad_actual <= i.cantidad_minima THEN 1
                    WHEN i.cantidad_actual <= (i.cantidad_minima * 1.5) THEN 2
                    ELSE 3
                END ASC,
                i.nombre_item ASC`;
        } else {
            inventarioQuery += ` ORDER BY i.nombre_item ASC`;
        }

        if (limit) {
            inventarioQuery += ` LIMIT ${parseInt(limit)}`;
        }

        const [inventarioRows] = await pool.execute(inventarioQuery);

        res.json({
            success: true,
            data: {
                items: inventarioRows
            }
        });
    } catch (error) {
        console.error('Error en getInventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener inventario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crea un item de inventario
const crearItemInventario = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nombre, cantidad_actual, cantidad_minima, unidad_medida, costo_unitario, area } = req.body;

        if (!nombre || cantidad_actual === undefined || cantidad_minima === undefined || !unidad_medida || costo_unitario === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        if (cantidad_actual < 0 || cantidad_minima < 0 || costo_unitario < 0) {
            return res.status(400).json({
                success: false,
                message: 'Los valores numéricos no pueden ser negativos'
            });
        }

        let idResponsable = null;
        let tipoResponsable = 'empleado';
        
        const empleadoQuery = `SELECT id_empleado FROM empleado WHERE id_usuario = ?`;
        const [empleadoRows] = await pool.execute(empleadoQuery, [userId]);
        
        if (empleadoRows.length > 0) {
            idResponsable = empleadoRows[0].id_empleado;
            tipoResponsable = 'empleado';
        } else {
            const adminQuery = `SELECT id_admin FROM administrador WHERE id_usuario = ?`;
            const [adminRows] = await pool.execute(adminQuery, [userId]);
            
            if (adminRows.length > 0) {
                idResponsable = adminRows[0].id_admin;
                tipoResponsable = 'administrador';
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Usuario no autorizado para crear items de inventario'
                });
            }
        }

        const insertQuery = `
            INSERT INTO inventario (nombre_item, cantidad_actual, cantidad_minima, unidad_medida, costo_unitario, area, id_responsable, ultima_actualizacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        const [result] = await pool.execute(insertQuery, [
            nombre,
            cantidad_actual,
            cantidad_minima,
            unidad_medida,
            costo_unitario,
            area || null,
            idResponsable
        ]);

        res.status(201).json({
            success: true,
            message: 'Item de inventario creado exitosamente',
            data: {
                id: result.insertId
            }
        });
    } catch (error) {
        console.error('Error en crearItemInventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al crear item de inventario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualiza un item de inventario
const actualizarItemInventario = async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = req.params.itemId;
        const { nombre, cantidad_actual, cantidad_minima, unidad_medida, costo_unitario, area } = req.body;

        if (!nombre || cantidad_actual === undefined || cantidad_minima === undefined || !unidad_medida || costo_unitario === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        if (cantidad_actual < 0 || cantidad_minima < 0 || costo_unitario < 0) {
            return res.status(400).json({
                success: false,
                message: 'Los valores numéricos no pueden ser negativos'
            });
        }

        const itemQuery = `SELECT id_inventario FROM inventario WHERE id_inventario = ?`;
        const [itemRows] = await pool.execute(itemQuery, [itemId]);

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item de inventario no encontrado'
            });
        }

        const updateQuery = `
            UPDATE inventario 
            SET nombre_item = ?, cantidad_actual = ?, cantidad_minima = ?, unidad_medida = ?, costo_unitario = ?, area = ?, ultima_actualizacion = NOW()
            WHERE id_inventario = ?
        `;

        await pool.execute(updateQuery, [
            nombre,
            cantidad_actual,
            cantidad_minima,
            unidad_medida,
            costo_unitario,
            area || null,
            itemId
        ]);

        res.json({
            success: true,
            message: 'Item de inventario actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error en actualizarItemInventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al actualizar item de inventario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Elimina un item de inventario
const eliminarItemInventario = async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = req.params.itemId;

        const itemQuery = `SELECT id_inventario FROM inventario WHERE id_inventario = ?`;
        const [itemRows] = await pool.execute(itemQuery, [itemId]);

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item de inventario no encontrado'
            });
        }

        const deleteQuery = `DELETE FROM inventario WHERE id_inventario = ?`;
        await pool.execute(deleteQuery, [itemId]);

        res.json({
            success: true,
            message: 'Item de inventario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error en eliminarItemInventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al eliminar item de inventario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Registra un movimiento de inventario
const registrarMovimiento = async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = req.params.itemId;
        const { tipo_movimiento, cantidad, motivo, observaciones } = req.body;

        console.log('RegistrarMovimiento - Datos recibidos:');
        console.log('  - userId:', userId);
        console.log('  - itemId:', itemId);
        console.log('  - tipo_movimiento:', tipo_movimiento);
        console.log('  - cantidad:', cantidad);
        console.log('  - motivo:', motivo);
        console.log('  - observaciones:', observaciones);

        if (!tipo_movimiento || cantidad === undefined || !motivo) {
            console.log('Validación fallida: campos obligatorios faltantes');
            return res.status(400).json({
                success: false,
                message: 'Tipo de movimiento, cantidad y motivo son obligatorios'
            });
        }

        if (!['entrada', 'salida', 'ajuste'].includes(tipo_movimiento)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de movimiento no válido'
            });
        }

        if (cantidad <= 0) {
            return res.status(400).json({
                success: false,
                message: 'La cantidad debe ser mayor a 0'
            });
        }

        let idResponsable = null;
        let tipoResponsable = 'empleado';
        
        console.log('Buscando usuario responsable...');
        
        const empleadoQuery = `SELECT id_empleado FROM empleado WHERE id_usuario = ?`;
        const [empleadoRows] = await pool.execute(empleadoQuery, [userId]);
        console.log('Resultado búsqueda empleado:', empleadoRows);
        
        if (empleadoRows.length > 0) {
            idResponsable = empleadoRows[0].id_empleado;
            tipoResponsable = 'empleado';
            console.log('Usuario encontrado como empleado:', idResponsable);
        } else {
            const adminQuery = `SELECT id_admin FROM administrador WHERE id_usuario = ?`;
            const [adminRows] = await pool.execute(adminQuery, [userId]);
            console.log('Resultado búsqueda administrador:', adminRows);
            
            if (adminRows.length > 0) {
                idResponsable = adminRows[0].id_admin;
                tipoResponsable = 'administrador';
                console.log('Usuario encontrado como administrador:', idResponsable);
            } else {
                console.log('Usuario no encontrado ni como empleado ni como administrador');
                return res.status(400).json({
                    success: false,
                    message: 'Usuario no autorizado para realizar movimientos de inventario'
                });
            }
        }

        const itemQuery = `SELECT cantidad_actual FROM inventario WHERE id_inventario = ?`;
        const [itemRows] = await pool.execute(itemQuery, [itemId]);

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item de inventario no encontrado'
            });
        }

        const cantidadActual = itemRows[0].cantidad_actual;
        let nuevaCantidad;

        if (tipo_movimiento === 'entrada') {
            nuevaCantidad = cantidadActual + cantidad;
        } else if (tipo_movimiento === 'salida') {
            if (cantidad > cantidadActual) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay suficiente stock para esta salida'
                });
            }
            nuevaCantidad = cantidadActual - cantidad;
        } else {
            nuevaCantidad = cantidad;
        }

        console.log('🔄 Iniciando transacción...');
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const insertMovimientoQuery = `
                INSERT INTO movimiento_inventario (id_inventario, id_responsable, tipo_responsable, tipo_movimiento, cantidad, motivo, fecha_movimiento)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;

            console.log('Insertando movimiento con datos:');
            console.log('  - itemId:', itemId);
            console.log('  - idResponsable:', idResponsable);
            console.log('  - tipoResponsable:', tipoResponsable);
            console.log('  - tipo_movimiento:', tipo_movimiento);
            console.log('  - cantidad:', cantidad);
            console.log('  - motivo:', motivo);

            const [movimientoResult] = await connection.execute(insertMovimientoQuery, [
                itemId,
                idResponsable,
                tipoResponsable,
                tipo_movimiento,
                cantidad,
                motivo
            ]);

            console.log('Movimiento insertado exitosamente:', movimientoResult);

            const updateInventarioQuery = `
                UPDATE inventario 
                SET cantidad_actual = ?, ultima_actualizacion = NOW()
                WHERE id_inventario = ?
            `;

            await connection.execute(updateInventarioQuery, [nuevaCantidad, itemId]);

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Movimiento registrado exitosamente',
                data: {
                    cantidad_anterior: cantidadActual,
                    cantidad_nueva: nuevaCantidad
                }
            });
        } catch (error) {
            console.error('Error en transacción:', error);
            console.error('Stack trace:', error.stack);
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error en registrarMovimiento:', error);
        console.error('Stack trace completo:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al registrar movimiento',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtiene las estadísticas de inventario
const getEstadisticasInventario = async (req, res) => {
    try {
        const userId = req.user.id;

        const statsQuery = `
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN cantidad_actual <= cantidad_minima THEN 1 ELSE 0 END) as stock_bajo,
                SUM(CASE WHEN cantidad_actual <= (cantidad_minima * 1.5) AND cantidad_actual > cantidad_minima THEN 1 ELSE 0 END) as stock_medio,
                SUM(CASE WHEN cantidad_actual > (cantidad_minima * 1.5) THEN 1 ELSE 0 END) as stock_alto,
                SUM(cantidad_actual * costo_unitario) as valor_total
            FROM inventario
        `;

        const [statsRows] = await pool.execute(statsQuery);

        res.json({
            success: true,
            data: {
                estadisticas: statsRows[0]
            }
        });
    } catch (error) {
        console.error('Error en getEstadisticasInventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener estadísticas de inventario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtiene productos
const getProductos = async (req, res) => {
    try {
        const userId = req.user.id;

        const productosQuery = `
            SELECT 
                p.id_producto as id,
                p.nombre,
                p.descripcion,
                p.ingredientes,
                p.precio,
                p.imagen_url,
                p.vegetariano,
                p.vegano,
                p.sin_gluten,
                p.disponible,
                p.tiempo_preparacion,
                c.id_categoria as categoria_id,
                c.nombre_categoria as categoria
            FROM producto p
            INNER JOIN categoria c ON p.id_categoria = c.id_categoria
            ORDER BY c.nombre_categoria, p.nombre ASC
        `;

        const [productosRows] = await pool.execute(productosQuery);

        res.json({
            success: true,
            data: {
                productos: productosRows
            }
        });
    } catch (error) {
        console.error('Error en getProductos:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener productos',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualiza la disponibilidad de producto
const actualizarDisponibilidadProducto = async (req, res) => {
    try {
        const userId = req.user.id;
        const productoId = req.params.productoId;
        const { disponible } = req.body;

        if (typeof disponible !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El campo disponible debe ser un valor booleano'
            });
        }

        const productoQuery = `SELECT id_producto FROM producto WHERE id_producto = ?`;
        const [productoRows] = await pool.execute(productoQuery, [productoId]);

        if (productoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const updateQuery = `
            UPDATE producto 
            SET disponible = ?
            WHERE id_producto = ?
        `;

        await pool.execute(updateQuery, [disponible ? 1 : 0, productoId]);

        res.json({
            success: true,
            message: `Producto ${disponible ? 'activado' : 'desactivado'} exitosamente`
        });
    } catch (error) {
        console.error('Error en actualizarDisponibilidadProducto:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al actualizar disponibilidad del producto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crea un producto
const crearProducto = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nombre, categoria, precio, disponible, descripcion, imagen } = req.body;

        if (!nombre || !categoria || precio === undefined || disponible === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, categoría, precio y disponibilidad son obligatorios'
            });
        }

        if (precio < 0) {
            return res.status(400).json({
                success: false,
                message: 'El precio no puede ser negativo'
            });
        }

        const categoriaQuery = `SELECT id_categoria FROM categoria WHERE id_categoria = ? AND activa = 1`;
        const [categoriaRows] = await pool.execute(categoriaQuery, [categoria]);
        
        if (categoriaRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Categoría no válida o inactiva'
            });
        }

        const idCategoria = categoriaRows[0].id_categoria;

        const insertQuery = `
            INSERT INTO producto (id_categoria, nombre, precio, disponible, descripcion, imagen_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.execute(insertQuery, [
            idCategoria,
            nombre,
            precio,
            disponible ? 1 : 0,
            descripcion || null,
            imagen || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            data: {
                id: result.insertId
            }
        });
    } catch (error) {
        console.error('Error en crearProducto:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al crear producto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualiza producto
const actualizarProducto = async (req, res) => {
    try {
        console.log('=== ACTUALIZAR PRODUCTO ===');
        console.log('User ID:', req.user.id);
        console.log('Producto ID:', req.params.productoId);
        console.log('Body:', req.body);
        
        const userId = req.user.id;
        const productoId = req.params.productoId;
        const { nombre, categoria, precio, disponible, descripcion, imagen } = req.body;

        console.log('Datos extraídos:', { nombre, categoria, precio, disponible, descripcion, imagen });

        if (!nombre || !categoria || precio === undefined || disponible === undefined) {
            console.log('Error: Campos obligatorios faltantes');
            return res.status(400).json({
                success: false,
                message: 'Nombre, categoría, precio y disponibilidad son obligatorios'
            });
        }

        if (precio < 0) {
            console.log('Error: Precio negativo');
            return res.status(400).json({
                success: false,
                message: 'El precio no puede ser negativo'
            });
        }

        console.log('Validando categoría:', categoria);
        const categoriaQuery = `SELECT id_categoria FROM categoria WHERE id_categoria = ? AND activa = 1`;
        const [categoriaRows] = await pool.execute(categoriaQuery, [categoria]);
        
        console.log('Resultado validación categoría:', categoriaRows);
        
        if (categoriaRows.length === 0) {
            console.log('Error: Categoría no válida o inactiva');
            return res.status(400).json({
                success: false,
                message: 'Categoría no válida o inactiva'
            });
        }

        const idCategoria = categoriaRows[0].id_categoria;
        console.log('ID de categoría válida:', idCategoria);

        console.log('Verificando que el producto existe:', productoId);
        const productoQuery = `SELECT id_producto FROM producto WHERE id_producto = ?`;
        const [productoRows] = await pool.execute(productoQuery, [productoId]);

        console.log('Resultado verificación producto:', productoRows);

        if (productoRows.length === 0) {
            console.log('Error: Producto no encontrado');
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const updateQuery = `
            UPDATE producto 
            SET id_categoria = ?, nombre = ?, precio = ?, disponible = ?, descripcion = ?, imagen_url = ?
            WHERE id_producto = ?
        `;

        console.log('Ejecutando query de actualización:', updateQuery);
        console.log('Parámetros:', [idCategoria, nombre, precio, disponible ? 1 : 0, descripcion || null, imagen || null, productoId]);

        await pool.execute(updateQuery, [
            idCategoria,
            nombre,
            precio,
            disponible ? 1 : 0,
            descripcion || null,
            imagen || null,
            productoId
        ]);

        console.log('Producto actualizado exitosamente');

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error en actualizarProducto:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al actualizar producto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Elimina producto
const eliminarProducto = async (req, res) => {
    try {
        const userId = req.user.id;
        const productoId = req.params.productoId;

        const productoQuery = `SELECT id_producto FROM producto WHERE id_producto = ?`;
        const [productoRows] = await pool.execute(productoQuery, [productoId]);

        if (productoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const deleteQuery = `DELETE FROM producto WHERE id_producto = ?`;
        await pool.execute(deleteQuery, [productoId]);

        res.json({
            success: true,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error en eliminarProducto:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al eliminar producto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtiene las categorías activas
const getCategorias = async (req, res) => {
    try {
        const categoriasQuery = `
            SELECT 
                id_categoria as id,
                nombre_categoria as nombre,
                descripcion,
                activa
            FROM categoria 
            WHERE activa = 1
            ORDER BY nombre_categoria ASC
        `;

        const [categoriasRows] = await pool.execute(categoriasQuery);

        res.json({
            success: true,
            data: {
                categorias: categoriasRows
            }
        });
    } catch (error) {
        console.error('Error en getCategorias:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener categorías',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getInventario,
    crearItemInventario,
    actualizarItemInventario,
    eliminarItemInventario,
    registrarMovimiento,
    getEstadisticasInventario,
    getProductos,
    actualizarDisponibilidadProducto,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    getCategorias
};
