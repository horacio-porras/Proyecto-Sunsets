const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

//Middleware para verificar JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        //Verifica que el usuario existe y está activo
        const [rows] = await pool.execute(
            `SELECT u.id_usuario, u.nombre, u.correo, u.activo, u.id_rol, r.nombre_rol
             FROM usuario u 
             INNER JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.id_usuario = ? AND u.activo = 1`,
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        const user = rows[0];
        req.user = {
            id: user.id_usuario,
            nombre: user.nombre,
            correo: user.correo,
            id_rol: user.id_rol,
            tipoUsuario: user.nombre_rol,
            activo: user.activo
        };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }
        
        return res.status(403).json({
            success: false,
            message: 'Token inválido'
        });
    }
};

//Middleware para verificar roles específicos
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        if (!roles.includes(req.user.tipo_usuario)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a este recurso'
            });
        }

        next();
    };
};

//Middleware para verificar si es administrador
const requireAdmin = authorizeRoles('administrador');

//Middleware para verificar si es empleado o administrador
const requireEmployee = authorizeRoles('empleado', 'administrador');

//Middleware para verificar si es cliente, empleado o administrador
const requireUser = authorizeRoles('cliente', 'empleado', 'administrador');

module.exports = {
    authenticateToken,
    authorizeRoles,
    requireAdmin,
    requireEmployee,
    requireUser
};
