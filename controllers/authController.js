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

module.exports = {
    register,
    login,
    verifyToken,
    logout
};
