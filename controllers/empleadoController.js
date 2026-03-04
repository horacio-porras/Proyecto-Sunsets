const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { registrarCambio } = require('../utils/auditoria');

//Función para obtener todos los empleados (solo administradores)
const getEmpleados = async (req, res) => {
    try {
        const userId = req.user.id;

        const userQuery = `
            SELECT u.id_usuario, r.nombre_rol 
            FROM usuario u 
            INNER JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ?
        `;
        
        const [userRows] = await pool.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        if (user.nombre_rol !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver la información de empleados'
            });
        }

        const empleadosQuery = `
            SELECT 
                u.id_usuario as id,
                u.nombre,
                u.correo,
                u.telefono,
                r.nombre_rol as tipoUsuario,
                COALESCE(e.area_trabajo, 'todas') as area_trabajo,
                COALESCE(e.fecha_contratacion, u.fecha_registro) as fecha_contratacion,
                CASE WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END as estado,
                u.fecha_registro as created_at,
                u.fecha_registro as updated_at
            FROM usuario u
            INNER JOIN rol r ON u.id_rol = r.id_rol
            LEFT JOIN empleado e ON u.id_usuario = e.id_usuario
            WHERE r.nombre_rol IN ('Empleado', 'Administrador')
            ORDER BY u.nombre ASC
        `;

        const [empleadosRows] = await pool.execute(empleadosQuery);

        const empleados = empleadosRows.map(empleado => ({
            id: empleado.id,
            nombre: empleado.nombre,
            correo: empleado.correo,
            telefono: empleado.telefono,
            tipoUsuario: empleado.tipoUsuario,
            area_trabajo: empleado.area_trabajo,
            fecha_contratacion: empleado.fecha_contratacion ? 
                new Date(empleado.fecha_contratacion).toLocaleDateString('es-ES') : 
                'No disponible',
            estado: empleado.estado,
            created_at: empleado.created_at,
            updated_at: empleado.updated_at
        }));

        res.json({
            success: true,
            data: {
                total_empleados: empleados.length,
                empleados: empleados
            }
        });

    } catch (error) {
        console.error('Error en getEmpleados:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener empleados',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Función para crear un nuevo empleado
const crearEmpleado = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nombre, correo, telefono, area_trabajo, tipoUsuario, contrasena } = req.body;

        const userQuery = `
            SELECT u.id_usuario, r.nombre_rol 
            FROM usuario u 
            INNER JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ?
        `;
        
        const [userRows] = await pool.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        if (user.nombre_rol !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para crear empleados'
            });
        }

        if (!nombre || !correo || !telefono || !area_trabajo || !tipoUsuario || !contrasena) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        const tiposValidos = ['Empleado', 'Administrador'];
        if (!tiposValidos.includes(tipoUsuario)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de usuario no válido'
            });
        }

        const areasValidas = ['cocina', 'bebidas', 'postres', 'almacen', 'todas'];
        if (!areasValidas.includes(area_trabajo)) {
            return res.status(400).json({
                success: false,
                message: 'Área de trabajo no válida'
            });
        }

        const correoQuery = `
            SELECT id_usuario FROM usuario WHERE correo = ?
        `;
        
        const [correoRows] = await pool.execute(correoQuery, [correo]);
        
        if (correoRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
        }

        // Validar que la contraseña no esté vacía
        if (!contrasena || contrasena.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña no puede estar vacía'
            });
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(contrasena.trim(), saltRounds);
        
        // Verificar que el hash se generó correctamente
        if (!hashedPassword || !hashedPassword.startsWith('$2')) {
            throw new Error('Error al generar hash de contraseña');
        }

        const [roleResult] = await pool.execute(
            'SELECT id_rol FROM rol WHERE nombre_rol = ?',
            [tipoUsuario]
        );

        if (roleResult.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de usuario no válido'
            });
        }

        const roleId = roleResult[0].id_rol;

        // Intentar insertar con contrasena_temporal, si falla, intentar sin ella
        let result;
        try {
            const insertQuery = `
                INSERT INTO usuario (
                    nombre, 
                    correo, 
                    telefono, 
                    contrasena, 
                    id_rol, 
                    fecha_registro,
                    activo,
                    contrasena_temporal
                ) VALUES (?, ?, ?, ?, ?, NOW(), 1, 1)
            `;

            [result] = await pool.execute(insertQuery, [
                nombre,
                correo,
                telefono,
                hashedPassword,
                roleId
            ]);
            
            // Verificar que se insertó correctamente
            if (!result || !result.insertId) {
                throw new Error('Error al insertar usuario en la base de datos');
            }
        } catch (insertError) {
            // Si la columna contrasena_temporal no existe, intentar sin ella
            if (insertError.code === 'ER_BAD_FIELD_ERROR' && insertError.message.includes('contrasena_temporal')) {
                console.warn('Columna contrasena_temporal no existe, creando empleado sin marcar contraseña como temporal');
                const insertQueryWithoutTemporal = `
                    INSERT INTO usuario (
                        nombre, 
                        correo, 
                        telefono, 
                        contrasena, 
                        id_rol, 
                        fecha_registro,
                        activo
                    ) VALUES (?, ?, ?, ?, ?, NOW(), 1)
                `;

                [result] = await pool.execute(insertQueryWithoutTemporal, [
                    nombre,
                    correo,
                    telefono,
                    hashedPassword,
                    roleId
                ]);
                
                // Verificar que se insertó correctamente
                if (!result || !result.insertId) {
                    throw new Error('Error al insertar usuario en la base de datos');
                }
            } else {
                throw insertError;
            }
        }

        const newUserId = result.insertId;
        
        // Verificar que el usuario se creó correctamente
        const [verifyUser] = await pool.execute(
            'SELECT id_usuario, correo, activo, contrasena, LENGTH(contrasena) as longitud_contrasena FROM usuario WHERE id_usuario = ?',
            [newUserId]
        );

        if (verifyUser.length === 0) {
            throw new Error('Error: Usuario creado pero no encontrado en la base de datos');
        }

        if (verifyUser[0].activo !== 1) {
            console.warn('Usuario creado pero no está activo:', verifyUser[0]);
        }
        
        if (!verifyUser[0].contrasena || verifyUser[0].longitud_contrasena === 0) {
            console.error('Usuario creado pero sin contraseña en la base de datos');
            throw new Error('Error: Usuario creado sin contraseña');
        }
        
        // Verificar que la contraseña tiene formato bcrypt
        if (!verifyUser[0].contrasena.startsWith('$2')) {
            console.error('Contraseña guardada no tiene formato bcrypt válido');
            console.error('Longitud:', verifyUser[0].longitud_contrasena);
            console.error('Primeros caracteres:', verifyUser[0].contrasena.substring(0, 10));
            throw new Error('Error: Contraseña no tiene formato bcrypt válido');
        }
        
        // Log de éxito (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.log('✓ Usuario creado exitosamente:', {
                id: newUserId,
                correo: verifyUser[0].correo,
                activo: verifyUser[0].activo,
                longitud_hash: verifyUser[0].longitud_contrasena
            });
        }

        if (tipoUsuario === 'Empleado') {
            await pool.execute(
                'INSERT INTO empleado (id_usuario, area_trabajo, fecha_contratacion, archivado) VALUES (?, ?, NOW(), FALSE)',
                [newUserId, area_trabajo]
            );
        }

        // Registrar cambio en auditoría
        await registrarCambio({
            id_usuario: userId,
            tabla_afectada: 'usuario',
            id_registro_afectado: newUserId,
            accion_realizada: 'CREATE',
            datos_nuevos: {
                nombre,
                correo,
                telefono,
                tipoUsuario,
                area_trabajo: tipoUsuario === 'Empleado' ? area_trabajo : null
            },
            ip_usuario: req.ip || req.connection?.remoteAddress
        });

        res.status(201).json({
            success: true,
            message: 'Empleado creado exitosamente',
            data: {
                id: newUserId,
                nombre,
                correo,
                telefono,
                tipoUsuario,
                area_trabajo
            }
        });

    } catch (error) {
        console.error('Error en crearEmpleado:', error);
        
        // Mensaje de error más descriptivo
        let errorMessage = 'Error interno del servidor al crear empleado';
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('contrasena_temporal')) {
            errorMessage = 'La columna contrasena_temporal no existe en la base de datos. Por favor, ejecuta el script ALTER TABLE para agregarla.';
        } else if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'El correo electrónico ya está registrado';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Función para actualizar un empleado
const actualizarEmpleado = async (req, res) => {
    try {
        const userId = req.user.id;
        const { empleadoId } = req.params;
        const { nombre, correo, telefono, area_trabajo, tipoUsuario, estado, contrasena } = req.body;

        const userQuery = `
            SELECT u.id_usuario, r.nombre_rol 
            FROM usuario u 
            INNER JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ?
        `;
        
        const [userRows] = await pool.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        if (user.nombre_rol !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para actualizar empleados'
            });
        }

        // Obtener datos anteriores para auditoría
        const empleadoAnteriorQuery = `
            SELECT u.*, r.nombre_rol, e.area_trabajo
            FROM usuario u 
            INNER JOIN rol r ON u.id_rol = r.id_rol
            LEFT JOIN empleado e ON u.id_usuario = e.id_usuario
            WHERE u.id_usuario = ? AND r.nombre_rol IN ('Empleado', 'Administrador')
        `;
        
        const [empleadoRows] = await pool.execute(empleadoAnteriorQuery, [empleadoId]);
        
        if (empleadoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        const empleado = empleadoRows[0];
        const datosAnteriores = empleadoRows[0];

        if (correo && correo !== empleado.correo) {
            const correoQuery = `
                SELECT id_usuario FROM usuario WHERE correo = ? AND id_usuario != ?
            `;
            
            const [correoRows] = await pool.execute(correoQuery, [correo, empleadoId]);
            
            if (correoRows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El correo electrónico ya está registrado'
                });
            }
        }

        if (tipoUsuario) {
            const tiposValidos = ['Empleado', 'Administrador'];
            if (!tiposValidos.includes(tipoUsuario)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de usuario no válido'
                });
            }
        }

        if (area_trabajo) {
            const areasValidas = ['cocina', 'bebidas', 'postres', 'almacen', 'todas'];
            if (!areasValidas.includes(area_trabajo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Área de trabajo no válida'
                });
            }
        }

        if (estado) {
            const estadosValidos = ['activo', 'inactivo'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado no válido'
                });
            }
        }

        const updateFields = [];
        const updateValues = [];
        
        // Manejar actualización de contraseña
        let hashedPassword = null;
        if (contrasena && contrasena.trim().length > 0) {
            const saltRounds = 12;
            hashedPassword = await bcrypt.hash(contrasena.trim(), saltRounds);
            
            // Verificar que el hash se generó correctamente
            if (!hashedPassword || !hashedPassword.startsWith('$2')) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al generar hash de contraseña'
                });
            }
            
            if (process.env.NODE_ENV === 'development') {
                console.log('Hash generado (primeros 50 chars):', hashedPassword.substring(0, 50));
                console.log('Longitud hash generado:', hashedPassword.length);
            }
            
            // Agregar contraseña
            updateFields.push('contrasena = ?');
            updateValues.push(hashedPassword);
            
            // Intentar agregar contrasena_temporal si la columna existe
            try {
                // Verificar si la columna existe intentando una consulta
                await pool.execute('SELECT contrasena_temporal FROM usuario LIMIT 1');
                updateFields.push('contrasena_temporal = 1');
                
                // Log de éxito (solo en desarrollo)
                if (process.env.NODE_ENV === 'development') {
                    console.log('✓ Contraseña temporal agregada a updateFields para empleado:', empleadoId);
                    console.log('updateFields completo:', updateFields);
                }
            } catch (colError) {
                // Si la columna no existe, simplemente no la actualizamos
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Columna contrasena_temporal no existe, no se marcará como temporal');
                }
            }
        }

        if (nombre) {
            updateFields.push('nombre = ?');
            updateValues.push(nombre);
        }
        if (correo) {
            updateFields.push('correo = ?');
            updateValues.push(correo);
        }
        if (telefono) {
            updateFields.push('telefono = ?');
            updateValues.push(telefono);
        }
        if (tipoUsuario) {
            const [roleResult] = await pool.execute(
                'SELECT id_rol FROM rol WHERE nombre_rol = ?',
                [tipoUsuario]
            );
            if (roleResult.length > 0) {
                updateFields.push('id_rol = ?');
                updateValues.push(roleResult[0].id_rol);
            }
        }
        if (estado) {
            updateFields.push('activo = ?');
            updateValues.push(estado === 'activo' ? 1 : 0);
        }

        if (updateFields.length > 0) {
            updateValues.push(empleadoId);
            const updateQuery = `
                UPDATE usuario 
                SET ${updateFields.join(', ')}
                WHERE id_usuario = ?
            `;
            
            if (process.env.NODE_ENV === 'development') {
                console.log('Actualizando empleado:', empleadoId);
                console.log('Campos a actualizar:', updateFields);
                console.log('Query completa:', updateQuery);
            }
            
            const [updateResult] = await pool.execute(updateQuery, updateValues);
            
            if (process.env.NODE_ENV === 'development') {
                console.log('Resultado de actualización - Filas afectadas:', updateResult.affectedRows);
                console.log('Query ejecutada:', updateQuery);
                console.log('Valores:', updateValues);
            }
            
            // Verificar directamente el valor de contrasena_temporal después de actualizar
            if (hashedPassword) {
                // Verificar inmediatamente después de la actualización
                try {
                    const [checkTemporal] = await pool.execute(
                        'SELECT contrasena_temporal FROM usuario WHERE id_usuario = ?',
                        [empleadoId]
                    );
                    if (checkTemporal.length > 0 && process.env.NODE_ENV === 'development') {
                        console.log('✓ Valor de contrasena_temporal DESPUÉS de UPDATE:', checkTemporal[0].contrasena_temporal);
                        console.log('Tipo:', typeof checkTemporal[0].contrasena_temporal);
                    }
                } catch (err) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('No se pudo verificar contrasena_temporal:', err.message);
                    }
                }
            }
            
            // Verificar que la contraseña se actualizó correctamente (solo si se actualizó)
            if (hashedPassword) {
                // Esperar un momento para que la actualización se complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                let verifyUpdate;
                try {
                    // Intentar con contrasena_temporal - leer tanto directo como COALESCE
                    [verifyUpdate] = await pool.execute(
                        `SELECT contrasena, LENGTH(contrasena) as longitud_contrasena, 
                                contrasena_temporal,
                                COALESCE(contrasena_temporal, 0) as contrasena_temporal_coalesce
                         FROM usuario WHERE id_usuario = ?`,
                        [empleadoId]
                    );
                } catch (colError) {
                    // Si la columna no existe, consultar sin ella
                    if (colError.code === 'ER_BAD_FIELD_ERROR' && colError.message.includes('contrasena_temporal')) {
                        [verifyUpdate] = await pool.execute(
                            `SELECT contrasena, LENGTH(contrasena) as longitud_contrasena
                             FROM usuario WHERE id_usuario = ?`,
                            [empleadoId]
                        );
                    } else {
                        throw colError;
                    }
                }
                
                if (verifyUpdate && verifyUpdate.length > 0) {
                    const savedHash = verifyUpdate[0].contrasena;
                    
                    if (!savedHash || !savedHash.startsWith('$2')) {
                        console.error('Error: Contraseña actualizada pero no tiene formato bcrypt válido');
                        throw new Error('Error al actualizar contraseña');
                    }
                    
                    if (process.env.NODE_ENV === 'development') {
                        console.log('\n=== VERIFICACIÓN DE CONTRASEÑA ACTUALIZADA ===');
                        console.log('Empleado ID:', empleadoId);
                        console.log('Hash generado (primeros 50):', hashedPassword.substring(0, 50));
                        console.log('Hash guardado (primeros 50):', savedHash.substring(0, 50));
                        console.log('¿Hashes son idénticos?', hashedPassword === savedHash);
                        console.log('Longitud hash guardado:', verifyUpdate[0].longitud_contrasena);
                        if (verifyUpdate[0].contrasena_temporal !== undefined) {
                            console.log('contrasena_temporal (directo):', verifyUpdate[0].contrasena_temporal);
                            console.log('contrasena_temporal (COALESCE):', verifyUpdate[0].contrasena_temporal_coalesce);
                            console.log('Tipo (directo):', typeof verifyUpdate[0].contrasena_temporal);
                            console.log('Tipo (COALESCE):', typeof verifyUpdate[0].contrasena_temporal_coalesce);
                        }
                        
                        // Probar la contraseña inmediatamente con diferentes variantes
                        const originalPassword = contrasena;
                        const trimmedPassword = contrasena.trim();
                        
                        console.log('\nProbando comparaciones:');
                        console.log('  Contraseña original (longitud):', originalPassword.length);
                        console.log('  Contraseña trim (longitud):', trimmedPassword.length);
                        
                        const test1 = await bcrypt.compare(originalPassword, savedHash);
                        const test2 = await bcrypt.compare(trimmedPassword, savedHash);
                        
                        console.log('  Test con original:', test1 ? '✓ COINCIDE' : '✗ NO COINCIDE');
                        console.log('  Test con trim:', test2 ? '✓ COINCIDE' : '✗ NO COINCIDE');
                        
                        if (!test1 && !test2) {
                            console.error('\n⚠️ ADVERTENCIA CRÍTICA: La contraseña NO coincide después de actualizarla!');
                            console.error('  Hash generado (completo, primeros 100):', hashedPassword.substring(0, 100));
                            console.error('  Hash guardado (completo, primeros 100):', savedHash.substring(0, 100));
                            console.error('  ¿Son idénticos?', hashedPassword === savedHash);
                        } else {
                            console.log('\n✓ La contraseña se actualizó correctamente y es verificable');
                        }
                    }
                } else {
                    console.error('Error: No se pudo verificar la actualización de la contraseña');
                }
            }
        }

        if (area_trabajo) {
            const [empleadoCheck] = await pool.execute(
                'SELECT id_empleado FROM empleado WHERE id_usuario = ?',
                [empleadoId]
            );

            if (empleadoCheck.length > 0) {
                await pool.execute(
                    'UPDATE empleado SET area_trabajo = ? WHERE id_usuario = ?',
                    [area_trabajo, empleadoId]
                );
            } else {
                await pool.execute(
                    'INSERT INTO empleado (id_usuario, area_trabajo, fecha_contratacion, archivado) VALUES (?, ?, NOW(), 0)',
                    [empleadoId, area_trabajo]
                );
            }
        }

        // Registrar cambio en auditoría
        await registrarCambio({
            id_usuario: userId,
            tabla_afectada: 'usuario',
            id_registro_afectado: empleadoId,
            accion_realizada: 'UPDATE',
            datos_anteriores: datosAnteriores,
            datos_nuevos: {
                nombre: nombre || empleado.nombre,
                correo: correo || empleado.correo,
                telefono: telefono || empleado.telefono,
                tipoUsuario: tipoUsuario || datosAnteriores.nombre_rol,
                estado: estado || (empleado.activo ? 'activo' : 'inactivo'),
                area_trabajo: area_trabajo || datosAnteriores.area_trabajo
            },
            ip_usuario: req.ip || req.connection?.remoteAddress
        });

        res.json({
            success: true,
            message: 'Empleado actualizado exitosamente',
            data: {
                id: empleadoId,
                nombre: nombre || empleado.nombre,
                correo: correo || empleado.correo
            }
        });

    } catch (error) {
        console.error('Error en actualizarEmpleado:', error);
        console.error('Stack trace:', error.stack);
        
        // Mensaje de error más descriptivo
        let errorMessage = 'Error interno del servidor al actualizar empleado';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = `Error de base de datos: ${error.sqlMessage || error.message}`;
        } else if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'El correo electrónico ya está registrado';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            } : undefined
        });
    }
};

//Función para eliminar un empleado (cambiar estado a inactivo)
const eliminarEmpleado = async (req, res) => {
    try {
        const userId = req.user.id;
        const { empleadoId } = req.params;

        const userQuery = `
            SELECT u.id_usuario, r.nombre_rol 
            FROM usuario u 
            INNER JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ?
        `;
        
        const [userRows] = await pool.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        if (user.nombre_rol !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para eliminar empleados'
            });
        }

        const empleadoQuery = `
            SELECT u.*, r.nombre_rol, e.area_trabajo
            FROM usuario u 
            INNER JOIN rol r ON u.id_rol = r.id_rol
            LEFT JOIN empleado e ON u.id_usuario = e.id_usuario
            WHERE u.id_usuario = ? AND r.nombre_rol IN ('Empleado', 'Administrador')
        `;
        
        const [empleadoRows] = await pool.execute(empleadoQuery, [empleadoId]);
        
        if (empleadoRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        const empleado = empleadoRows[0];
        const datosAnteriores = empleadoRows[0];

        if (parseInt(empleadoId) === parseInt(userId)) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propia cuenta'
            });
        }

        const updateQuery = `
            UPDATE usuario 
            SET activo = 0
            WHERE id_usuario = ?
        `;

        await pool.execute(updateQuery, [empleadoId]);

        // Registrar cambio en auditoría
        await registrarCambio({
            id_usuario: userId,
            tabla_afectada: 'usuario',
            id_registro_afectado: empleadoId,
            accion_realizada: 'DELETE',
            datos_anteriores: datosAnteriores,
            ip_usuario: req.ip || req.connection?.remoteAddress
        });

        res.json({
            success: true,
            message: 'Empleado eliminado exitosamente',
            data: {
                id: empleadoId,
                nombre: empleado.nombre
            }
        });

    } catch (error) {
        console.error('Error en eliminarEmpleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar empleado'
        });
    }
};

//Función para obtener estadísticas de empleados
const getEstadisticasEmpleados = async (req, res) => {
    try {
        const userId = req.user.id;

        const userQuery = `
            SELECT u.id_usuario, r.nombre_rol 
            FROM usuario u 
            INNER JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ?
        `;
        
        const [userRows] = await pool.execute(userQuery, [userId]);
        
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userRows[0];

        if (user.nombre_rol !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver estadísticas de empleados'
            });
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_empleados,
                SUM(CASE WHEN u.activo = 1 THEN 1 ELSE 0 END) as empleados_activos,
                SUM(CASE WHEN u.activo = 0 THEN 1 ELSE 0 END) as empleados_inactivos,
                SUM(CASE WHEN r.nombre_rol = 'Administrador' THEN 1 ELSE 0 END) as administradores,
                SUM(CASE WHEN r.nombre_rol = 'Empleado' THEN 1 ELSE 0 END) as empleados,
                SUM(CASE WHEN e.area_trabajo = 'cocina' THEN 1 ELSE 0 END) as cocina,
                SUM(CASE WHEN e.area_trabajo = 'bebidas' THEN 1 ELSE 0 END) as bebidas,
                SUM(CASE WHEN e.area_trabajo = 'postres' THEN 1 ELSE 0 END) as postres,
                SUM(CASE WHEN e.area_trabajo = 'almacen' THEN 1 ELSE 0 END) as almacen,
                SUM(CASE WHEN e.area_trabajo = 'todas' OR e.area_trabajo IS NULL THEN 1 ELSE 0 END) as todas_areas
            FROM usuario u
            INNER JOIN rol r ON u.id_rol = r.id_rol
            LEFT JOIN empleado e ON u.id_usuario = e.id_usuario
            WHERE r.nombre_rol IN ('Empleado', 'Administrador')
        `;

        const [statsRows] = await pool.execute(statsQuery);
        const stats = statsRows[0];

        res.json({
            success: true,
            data: {
                total_empleados: stats.total_empleados,
                empleados_activos: stats.empleados_activos,
                empleados_inactivos: stats.empleados_inactivos,
                administradores: stats.administradores,
                empleados: stats.empleados,
                por_area: {
                    cocina: stats.cocina,
                    bebidas: stats.bebidas,
                    postres: stats.postres,
                    almacen: stats.almacen,
                    todas: stats.todas_areas
                }
            }
        });

    } catch (error) {
        console.error('Error en getEstadisticasEmpleados:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener estadísticas'
        });
    }
};

module.exports = {
    getEmpleados,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado,
    getEstadisticasEmpleados
};
