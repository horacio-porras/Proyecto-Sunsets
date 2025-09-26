const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

// Función para generar JWT
const generateToken = (userId, userType) => {
    return jwt.sign(
        { userId, userType },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Registro de usuario
const register = async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const {
            nombre,
            correo,
            telefono,
            contrasena,
            notificacionesActivas = false
        } = req.body;

        // Verificar si el usuario ya existe
        const [existingUser] = await pool.execute(
            'SELECT id_usuario FROM usuario WHERE correo = ?',
            [correo]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un usuario con este correo electrónico'
            });
        }

        // Hash de la contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(contrasena, saltRounds);

        // Obtener ID del rol cliente (id_rol = 3 según tu especificación)
        const [roleResult] = await pool.execute(
            'SELECT id_rol FROM rol WHERE nombre_rol = ?',
            ['Cliente']
        );

        if (roleResult.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Error interno: Rol de cliente no encontrado'
            });
        }

        const clienteRoleId = roleResult[0].id_rol;

        // Insertar nuevo usuario
        const [userResult] = await pool.execute(
            `INSERT INTO usuario (
                nombre, correo, telefono, contrasena, id_rol, 
                fecha_registro, activo
            ) VALUES (?, ?, ?, ?, ?, NOW(), TRUE)`,
            [
                nombre,
                correo,
                telefono,
                passwordHash,
                clienteRoleId
            ]
        );

        const userId = userResult.insertId;

        // Crear registro en tabla cliente
        await pool.execute(
            `INSERT INTO cliente (
                id_usuario, puntos_acumulados, fecha_registro_programa, 
                notificaciones_activas
            ) VALUES (?, 0, NOW(), ?)`,
            [userId, notificacionesActivas]
        );

        // Generar token
        const token = generateToken(userId, 'Cliente');

        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: userId,
                    nombre,
                    correo,
                    id_rol: clienteRoleId,
                    tipoUsuario: 'Cliente'
                },
                token
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Login de usuario
const login = async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { correo, contrasena } = req.body;

        // Buscar usuario con información del rol
        const [users] = await pool.execute(
            `SELECT u.id_usuario, u.nombre, u.correo, u.contrasena, u.activo, u.id_rol, r.nombre_rol
             FROM usuario u 
             INNER JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.correo = ? AND u.activo = 1`,
            [correo]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const user = users[0];

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(contrasena, user.contrasena);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Generar token
        const token = generateToken(user.id_usuario, user.nombre_rol);

        // Respuesta exitosa
        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user.id_usuario,
                    nombre: user.nombre,
                    correo: user.correo,
                    id_rol: user.id_rol,
                    tipoUsuario: user.nombre_rol
                },
                token
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Verificar token (para mantener sesión)
const verifyToken = async (req, res) => {
    try {
        // El middleware de autenticación ya verificó el token
        res.json({
            success: true,
            message: 'Token válido',
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Error al verificar token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Logout (opcional - para invalidar tokens del lado del servidor)
const logout = async (req, res) => {
    try {
        // En un sistema más complejo, podrías agregar el token a una lista negra
        // Por ahora, simplemente confirmamos el logout
        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener perfil completo del usuario
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.tipoUsuario;

        // Obtener datos básicos del usuario
        const [userData] = await pool.execute(
            `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.id_rol, u.fecha_registro, r.nombre_rol
             FROM usuario u 
             INNER JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.id_usuario = ?`,
            [userId]
        );

        if (userData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        let profileData = userData[0];

        // Agregar datos específicos del rol
        if (userRole === 'Cliente') {
            const [clienteData] = await pool.execute(
                'SELECT puntos_acumulados, notificaciones_activas, fecha_registro_programa FROM cliente WHERE id_usuario = ?',
                [userId]
            );
            if (clienteData.length > 0) {
                profileData = { ...profileData, ...clienteData[0] };
            }
        } else if (userRole === 'Empleado') {
            const [empleadoData] = await pool.execute(
                'SELECT id_empleado, area_trabajo, fecha_contratacion, archivado FROM empleado WHERE id_usuario = ?',
                [userId]
            );
            if (empleadoData.length > 0) {
                profileData = { ...profileData, ...empleadoData[0] };
            }
        } else if (userRole === 'Administrador') {
            const [adminData] = await pool.execute(
                'SELECT id_admin, permisos_especiales FROM administrador WHERE id_usuario = ?',
                [userId]
            );
            if (adminData.length > 0) {
                profileData = { ...profileData, ...adminData[0] };
            }
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: profileData.id_usuario,
                    nombre: profileData.nombre,
                    correo: profileData.correo,
                    telefono: profileData.telefono,
                    id_rol: profileData.id_rol,
                    tipoUsuario: profileData.nombre_rol,
                    fecha_registro: profileData.fecha_registro,
                    ...profileData
                }
            }
        });

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar perfil de usuario
const updateProfile = async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const userRole = req.user.tipoUsuario;
        const {
            nombre,
            correo,
            telefono,
            contrasenaActual,
            nuevaContrasena,
            notificacionesActivas
        } = req.body;

        // Verificar si el usuario existe
        const [existingUser] = await pool.execute(
            'SELECT * FROM usuario WHERE id_usuario = ?',
            [userId]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = existingUser[0];

        // Verificar contraseña actual si se quiere cambiar la contraseña
        if (nuevaContrasena && contrasenaActual) {
            const isValidPassword = await bcrypt.compare(contrasenaActual, user.contrasena);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña actual es incorrecta'
                });
            }
        }

        // Verificar si el correo ya existe en otro usuario
        if (correo && correo !== user.correo) {
            const [emailExists] = await pool.execute(
                'SELECT id_usuario FROM usuario WHERE correo = ? AND id_usuario != ?',
                [correo, userId]
            );

            if (emailExists.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un usuario con este correo electrónico'
                });
            }
        }

        // Preparar datos para actualizar
        const updateData = {};
        if (nombre) updateData.nombre = nombre;
        if (correo) updateData.correo = correo;
        if (telefono) updateData.telefono = telefono;
        if (nuevaContrasena) {
            const saltRounds = 12;
            updateData.contrasena = await bcrypt.hash(nuevaContrasena, saltRounds);
        }

        // Actualizar datos del usuario
        if (Object.keys(updateData).length > 0) {
            const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updateData);
            values.push(userId);

            await pool.execute(
                `UPDATE usuario SET ${setClause} WHERE id_usuario = ?`,
                values
            );
        }

        // Actualizar datos específicos del rol
        if (userRole === 'Cliente' && notificacionesActivas !== undefined) {
            await pool.execute(
                'UPDATE cliente SET notificaciones_activas = ? WHERE id_usuario = ?',
                [notificacionesActivas, userId]
            );
        }

        // Obtener datos actualizados del usuario
        const [updatedUser] = await pool.execute(
            `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.id_rol, u.fecha_registro, r.nombre_rol
             FROM usuario u 
             INNER JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.id_usuario = ?`,
            [userId]
        );

        let userData = updatedUser[0];

        // Agregar datos específicos del rol
        if (userRole === 'Cliente') {
            const [clienteData] = await pool.execute(
                'SELECT puntos_acumulados, notificaciones_activas FROM cliente WHERE id_usuario = ?',
                [userId]
            );
            if (clienteData.length > 0) {
                userData = { ...userData, ...clienteData[0] };
            }
        } else if (userRole === 'Empleado') {
            const [empleadoData] = await pool.execute(
                'SELECT id_empleado, area_trabajo, fecha_contratacion, archivado FROM empleado WHERE id_usuario = ?',
                [userId]
            );
            if (empleadoData.length > 0) {
                userData = { ...userData, ...empleadoData[0] };
            }
        } else if (userRole === 'Administrador') {
            const [adminData] = await pool.execute(
                'SELECT id_admin, permisos_especiales FROM administrador WHERE id_usuario = ?',
                [userId]
            );
            if (adminData.length > 0) {
                userData = { ...userData, ...adminData[0] };
            }
        }

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: {
                user: {
                    id: userData.id_usuario,
                    nombre: userData.nombre,
                    correo: userData.correo,
                    telefono: userData.telefono,
                    id_rol: userData.id_rol,
                    tipoUsuario: userData.nombre_rol,
                    fecha_registro: userData.fecha_registro,
                    ...userData
                }
            }
        });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    register,
    login,
    verifyToken,
    logout,
    getProfile,
    updateProfile
};
