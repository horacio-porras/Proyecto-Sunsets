const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { sendPasswordResetEmail } = require('../utils/mailer');

//Función para generar JWT
const generateToken = (userId, userType) => {
    return jwt.sign(
        { userId, userType },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

//Registro de usuario
const register = async (req, res) => {
    try {
        //Verificar errores de validación
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

        //Verifica si el usuario ya existe
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

        //Hash de la contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(contrasena, saltRounds);

        //Obtener ID del rol cliente
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

        //Inserta nuevo usuario
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

        //Crea registro en la tabla cliente
        await pool.execute(
            `INSERT INTO cliente (
                id_usuario, puntos_acumulados, fecha_registro_programa, 
                notificaciones_activas
            ) VALUES (?, 0, NOW(), ?)`,
            [userId, notificacionesActivas]
        );

        //Genera el token
        const token = generateToken(userId, 'Cliente');

        //Respuesta exitosa
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

//Login de usuario
const login = async (req, res) => {
    try {
        //Verifica errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { correo, contrasena } = req.body;

        // Log inicial (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.log('\n=== INICIO DE LOGIN ===');
            console.log('Correo recibido:', correo);
            console.log('Contraseña recibida (longitud):', contrasena ? contrasena.length : 0);
        }

        // Función helper para normalizar correo de Gmail (remover puntos de la parte local)
        const normalizeGmail = (email) => {
            const [localPart, domain] = email.split('@');
            if (domain && domain.toLowerCase() === 'gmail.com') {
                return `${localPart.replace(/\./g, '')}@${domain}`;
            }
            return email;
        };

        // Buscar primero con el correo exacto, luego con versión normalizada de Gmail
        const normalizedCorreo = normalizeGmail(correo);
        const searchEmails = correo === normalizedCorreo ? [correo] : [correo, normalizedCorreo];

        //Busca el usuario con información del rol
        // Intentar con contrasena_temporal, si falla, intentar sin ella
        let users = [];
        let hasTemporalPasswordColumn = true;
        
        try {
            // Buscar con ambos correos (original y normalizado para Gmail)
            for (const searchEmail of searchEmails) {
                if (users.length > 0) break; // Si ya encontramos, no seguir buscando
                
                [users] = await pool.execute(
                    `SELECT u.id_usuario, u.nombre, u.correo, u.contrasena, u.activo, u.id_rol, r.nombre_rol, 
                            u.contrasena_temporal,
                            COALESCE(u.contrasena_temporal, 0) as contrasena_temporal_coalesce
                     FROM usuario u 
                     INNER JOIN rol r ON u.id_rol = r.id_rol 
                     WHERE u.correo = ? AND u.activo = 1`,
                    [searchEmail]
                );
                
                if (process.env.NODE_ENV === 'development' && users.length > 0) {
                    console.log(`✓ Usuario encontrado con correo: ${searchEmail}`);
                    // Verificar directamente el valor en la BD
                    const [dbCheck] = await pool.execute(
                        'SELECT contrasena_temporal, COALESCE(contrasena_temporal, 0) as temp_coalesce FROM usuario WHERE correo = ?',
                        [searchEmail]
                    );
                    if (dbCheck.length > 0) {
                        console.log('Valor directo de BD (contrasena_temporal):', dbCheck[0].contrasena_temporal);
                        console.log('Tipo del valor:', typeof dbCheck[0].contrasena_temporal);
                        console.log('Valor con COALESCE:', dbCheck[0].temp_coalesce);
                    }
                }
            }
            
            if (process.env.NODE_ENV === 'development') {
                console.log('Usuarios encontrados con contrasena_temporal:', users.length);
            }
        } catch (error) {
            // Si la columna contrasena_temporal no existe, intentar sin ella
            if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('contrasena_temporal')) {
                hasTemporalPasswordColumn = false;
                if (process.env.NODE_ENV === 'development') {
                    console.log('Columna contrasena_temporal no existe, consultando sin ella...');
                }
                
                users = [];
                for (const searchEmail of searchEmails) {
                    if (users.length > 0) break;
                    
                    [users] = await pool.execute(
                        `SELECT u.id_usuario, u.nombre, u.correo, u.contrasena, u.activo, u.id_rol, r.nombre_rol
                         FROM usuario u 
                         INNER JOIN rol r ON u.id_rol = r.id_rol 
                         WHERE u.correo = ? AND u.activo = 1`,
                        [searchEmail]
                    );
                }
                
                if (process.env.NODE_ENV === 'development') {
                    console.log('Usuarios encontrados sin contrasena_temporal:', users.length);
                }
            } else {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error en consulta de usuario:', error.message);
                }
                throw error;
            }
        }

        if (users.length === 0) {
            if (process.env.NODE_ENV === 'development') {
                console.error('❌ No se encontró usuario con correo:', correo);
                // Verificar si el correo existe pero está inactivo
                const [inactiveUsers] = await pool.execute(
                    'SELECT correo, activo FROM usuario WHERE correo = ?',
                    [correo]
                );
                if (inactiveUsers.length > 0) {
                    console.error('Usuario encontrado pero inactivo:', inactiveUsers[0]);
                }
            }
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const user = users[0];

        if (process.env.NODE_ENV === 'development') {
            console.log('Usuario encontrado:', user.correo);
            console.log('Usuario activo:', user.activo);
            console.log('Usuario tiene contraseña:', !!user.contrasena);
            if (user.contrasena) {
                console.log('Longitud contraseña en BD:', user.contrasena.length);
                console.log('Formato bcrypt:', user.contrasena.startsWith('$2'));
            }
        }

        //Verifica la contraseña
        if (!user.contrasena) {
            console.error('Usuario sin contraseña en la base de datos:', user.correo);
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar que la contraseña tiene el formato correcto de bcrypt
        if (!user.contrasena.startsWith('$2')) {
            console.error('Contraseña no tiene formato bcrypt válido para usuario:', user.correo);
            console.error('Primeros caracteres de la contraseña:', user.contrasena.substring(0, 20));
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Log para debugging (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.log('=== INTENTO DE LOGIN ===');
            console.log('Usuario:', user.correo);
            console.log('ID Usuario:', user.id_usuario);
            console.log('Contraseña ingresada (longitud):', contrasena.length);
            console.log('Contraseña ingresada (primeros 3 chars):', contrasena.substring(0, 3));
            console.log('Hash en BD (longitud):', user.contrasena.length);
            console.log('Hash en BD (primeros 30 chars):', user.contrasena.substring(0, 30));
            console.log('Hash en BD (últimos 10 chars):', user.contrasena.substring(user.contrasena.length - 10));
        }
        
        // Comparar contraseña - probar diferentes variantes
        let isValidPassword = false;
        let matchedVariant = null;
        
        const passwordVariants = [
            { value: contrasena, name: 'original' },
            { value: contrasena.trim(), name: 'trim' },
            { value: contrasena.replace(/\s/g, ''), name: 'sin espacios' },
            { value: contrasena.trim().replace(/\s/g, ''), name: 'trim + sin espacios' }
        ];
        
        for (const variant of passwordVariants) {
            try {
                const testResult = await bcrypt.compare(variant.value, user.contrasena);
                if (testResult) {
                    isValidPassword = true;
                    matchedVariant = variant.name;
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`✓ Contraseña válida (variante: ${variant.name})`);
                    }
                    break;
                }
            } catch (compareError) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`Error al comparar variante ${variant.name}:`, compareError.message);
                }
            }
        }
        
        if (!isValidPassword) {
            // Log detallado para debugging (solo en desarrollo)
            if (process.env.NODE_ENV === 'development') {
                console.error('❌ Todas las variantes de contraseña fallaron');
                console.error('Usuario:', user.correo);
                console.error('Hash en BD completo (primeros 50 chars):', user.contrasena.substring(0, 50));
                
                // Verificar directamente en la BD qué hash tiene
                const [dbCheck] = await pool.execute(
                    'SELECT contrasena, LENGTH(contrasena) as len FROM usuario WHERE id_usuario = ?',
                    [user.id_usuario]
                );
                if (dbCheck.length > 0) {
                    console.error('Hash directo de BD (primeros 50 chars):', dbCheck[0].contrasena.substring(0, 50));
                    console.error('Longitud hash en BD:', dbCheck[0].len);
                }
            }
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }
        
        // Log de éxito (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.log('✓ Login exitoso para:', user.correo);
        }

        //Genera el token
        const token = generateToken(user.id_usuario, user.nombre_rol);

        // Determinar si requiere cambio de contraseña
        // MySQL devuelve BOOLEAN como TINYINT (0 o 1), así que comparamos de manera flexible
        let contrasenaTemporal = false;
        if (hasTemporalPasswordColumn) {
            // Usar el valor directo si está disponible, sino usar el COALESCE
            const temporalValue = user.contrasena_temporal !== undefined && user.contrasena_temporal !== null
                ? user.contrasena_temporal
                : (user.contrasena_temporal_coalesce !== undefined ? user.contrasena_temporal_coalesce : 0);
            
            // Convertir a número y comparar (maneja 1, '1', true, etc.)
            const temporalNumber = Number(temporalValue);
            contrasenaTemporal = temporalNumber === 1 || temporalValue === true || temporalValue === '1';
        }
        
        // Log para debugging (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.log('=== INFORMACIÓN DE CONTRASEÑA TEMPORAL ===');
            console.log('hasTemporalPasswordColumn:', hasTemporalPasswordColumn);
            console.log('user.contrasena_temporal (directo):', user.contrasena_temporal);
            console.log('user.contrasena_temporal_coalesce:', user.contrasena_temporal_coalesce);
            console.log('Tipo (directo):', typeof user.contrasena_temporal);
            console.log('Tipo (coalesce):', typeof user.contrasena_temporal_coalesce);
            console.log('Número (directo):', Number(user.contrasena_temporal));
            console.log('Número (coalesce):', Number(user.contrasena_temporal_coalesce));
            console.log('contrasenaTemporal (calculated):', contrasenaTemporal);
        }
        
        //Respuesta exitosa
        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user.id_usuario,
                    nombre: user.nombre,
                    correo: user.correo,
                    id_rol: user.id_rol,
                    tipoUsuario: user.nombre_rol,
                    contrasena_temporal: contrasenaTemporal
                },
                token,
                requiereCambioContrasena: contrasenaTemporal
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

//Verifica el token (para mantener sesión)
const verifyToken = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Obtener datos actualizados del usuario incluyendo contrasena_temporal
        let userData;
        try {
            [userData] = await pool.execute(
                `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.id_rol, r.nombre_rol,
                        COALESCE(u.contrasena_temporal, 0) as contrasena_temporal
                 FROM usuario u
                 INNER JOIN rol r ON u.id_rol = r.id_rol
                 WHERE u.id_usuario = ? AND u.activo = 1`,
                [userId]
            );
        } catch (error) {
            // Si la columna no existe, obtener sin ella
            if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('contrasena_temporal')) {
                [userData] = await pool.execute(
                    `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.id_rol, r.nombre_rol
                     FROM usuario u
                     INNER JOIN rol r ON u.id_rol = r.id_rol
                     WHERE u.id_usuario = ? AND u.activo = 1`,
                    [userId]
                );
            } else {
                throw error;
            }
        }
        
        if (userData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        const user = userData[0];
        const contrasenaTemporal = user.contrasena_temporal !== undefined 
            ? (Number(user.contrasena_temporal) === 1 || user.contrasena_temporal === true || user.contrasena_temporal === '1')
            : false;
        
        res.json({
            success: true,
            message: 'Token válido',
            data: {
                user: {
                    id: user.id_usuario,
                    nombre: user.nombre,
                    correo: user.correo,
                    telefono: user.telefono,
                    id_rol: user.id_rol,
                    tipoUsuario: user.nombre_rol,
                    contrasena_temporal: contrasenaTemporal
                }
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

//Logout
const logout = async (req, res) => {
    try {
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

//Obtiene el perfil completo del usuario
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.tipoUsuario;

        //Obtiene datos básicos del usuario
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

        //Agrega datos específicos del rol
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

//Actualiza el perfil de usuario
const updateProfile = async (req, res) => {
    try {
        //Verifica errores de validación
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

        //Verifica si el usuario existe
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

        //Verifica la contraseña actual si se quiere cambiar la contraseña
        if (nuevaContrasena && contrasenaActual) {
            const isValidPassword = await bcrypt.compare(contrasenaActual, user.contrasena);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña actual es incorrecta'
                });
            }
        }

        //Verifica si el correo ya existe en otro usuario
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

        //Prepara los datos para actualizar
        const updateData = {};
        if (nombre) updateData.nombre = nombre;
        if (correo) updateData.correo = correo;
        if (telefono) updateData.telefono = telefono;
        if (nuevaContrasena) {
            const saltRounds = 12;
            updateData.contrasena = await bcrypt.hash(nuevaContrasena, saltRounds);
        }

        //Actualiza los datos del usuario
        if (Object.keys(updateData).length > 0) {
            const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updateData);
            values.push(userId);

            await pool.execute(
                `UPDATE usuario SET ${setClause} WHERE id_usuario = ?`,
                values
            );
        }

        //Actualiza los datos específicos del rol
        if (userRole === 'Cliente' && notificacionesActivas !== undefined) {
            await pool.execute(
                'UPDATE cliente SET notificaciones_activas = ? WHERE id_usuario = ?',
                [notificacionesActivas, userId]
            );
        }

        //Obtiene los datos actualizados del usuario
        const [updatedUser] = await pool.execute(
            `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.id_rol, u.fecha_registro, r.nombre_rol
             FROM usuario u 
             INNER JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.id_usuario = ?`,
            [userId]
        );

        let userData = updatedUser[0];

        //Agrega datos específicos del rol
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

// Función para solicitar recuperación de contraseña (envía correo con link)
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validar datos requeridos
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico es requerido'
            });
        }

        // Verificar que el usuario existe
        const [users] = await pool.execute(
            'SELECT id_usuario, nombre FROM usuario WHERE correo = ?',
            [email]
        );

        // Por seguridad, siempre devolvemos el mismo mensaje aunque el usuario no exista
        // Esto previene que atacantes descubran qué emails están registrados
        if (users.length === 0) {
            return res.json({
                success: true,
                message: 'Si el correo existe, recibirás un enlace para recuperar tu contraseña'
            });
        }

        const user = users[0];

        // Generar token JWT para reset de contraseña (expira en 1 hora)
        const resetToken = jwt.sign(
            { userId: user.id_usuario, email: email, type: 'password-reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Construir URL del frontend (usar CORS_ORIGIN si está disponible, sino localhost)
        const frontendUrl = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password.html?token=${resetToken}`;

        try {
            // Enviar correo de recuperación
            await sendPasswordResetEmail({
                to: email,
                nombre: user.nombre,
                resetLink: resetLink
            });

            console.log(`[Password Reset] Correo de recuperación enviado a: ${email}`);
        } catch (emailError) {
            console.error('[Password Reset] Error al enviar correo:', emailError);
            // Aún así devolvemos éxito para no revelar información
        }

        res.json({
            success: true,
            message: 'Si el correo existe, recibirás un enlace para recuperar tu contraseña'
        });

    } catch (error) {
        console.error('Error al procesar solicitud de recuperación:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Función para cambiar contraseña usando el token del link
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validar datos requeridos
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token y nueva contraseña son requeridos'
            });
        }

        // Verificar y decodificar el token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Verificar que el token es de tipo password-reset
            if (decoded.type !== 'password-reset') {
                return res.status(400).json({
                    success: false,
                    message: 'Token inválido'
                });
            }
        } catch (jwtError) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        // Validar requisitos de contraseña
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        if (!/(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe incluir al menos una mayúscula y un número'
            });
        }

        // Verificar que el usuario existe
        const [users] = await pool.execute(
            'SELECT id_usuario FROM usuario WHERE id_usuario = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Hash de la nueva contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Actualizar la contraseña en la base de datos
        await pool.execute(
            'UPDATE usuario SET contrasena = ?, contrasena_temporal = 0 WHERE id_usuario = ?',
            [passwordHash, decoded.userId]
        );

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

//Cambia la contraseña temporal obligatoriamente
const cambiarContrasenaTemporal = async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('\n=== CAMBIO DE CONTRASEÑA TEMPORAL - INICIO ===');
            console.log('req.user:', req.user);
            console.log('req.body:', req.body);
        }
        
        const userId = req.user?.id;
        if (!userId) {
            console.error('❌ No se encontró userId en req.user');
            console.error('req.user completo:', JSON.stringify(req.user, null, 2));
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }
        
        // Asegurar que userId sea un número
        const userIdNumber = parseInt(userId, 10);
        if (isNaN(userIdNumber)) {
            console.error('❌ userId no es un número válido:', userId);
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido'
            });
        }
        
        const { nuevaContrasena } = req.body;

        if (process.env.NODE_ENV === 'development') {
            console.log('Usuario ID (original):', userId);
            console.log('Usuario ID (número):', userIdNumber);
            console.log('Tipo de userId:', typeof userId);
            console.log('Nueva contraseña recibida:', nuevaContrasena ? `Longitud: ${nuevaContrasena.length}` : 'No recibida');
        }

        if (!nuevaContrasena || nuevaContrasena.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        //Verifica que el usuario existe
        let users;
        let hasTemporalPasswordColumn = true;
        
        try {
            [users] = await pool.execute(
                `SELECT id_usuario, contrasena_temporal 
                 FROM usuario 
                 WHERE id_usuario = ? AND activo = 1`,
                [userIdNumber]
            );
        } catch (error) {
            // Si la columna contrasena_temporal no existe, intentar sin ella
            if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('contrasena_temporal')) {
                hasTemporalPasswordColumn = false;
                [users] = await pool.execute(
                    `SELECT id_usuario 
                     FROM usuario 
                     WHERE id_usuario = ? AND activo = 1`,
                    [userIdNumber]
                );
            } else {
                throw error;
            }
        }

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = users[0];

        // Si la columna no existe, no se puede cambiar contraseña temporal
        if (!hasTemporalPasswordColumn) {
            return res.status(400).json({
                success: false,
                message: 'La funcionalidad de contraseñas temporales no está disponible. Por favor, ejecuta el script ALTER TABLE para agregar la columna contrasena_temporal.'
            });
        }

        // Verificar que realmente tiene contraseña temporal
        // MySQL devuelve BOOLEAN como TINYINT (0 o 1), así que comparamos de manera flexible
        const temporalValue = user.contrasena_temporal;
        const temporalNumber = Number(temporalValue);
        const hasTemporalPassword = temporalNumber === 1 || temporalValue === true || temporalValue === '1';

        if (process.env.NODE_ENV === 'development') {
            console.log('\n=== VERIFICACIÓN DE CONTRASEÑA TEMPORAL ===');
            console.log('Usuario ID:', userId);
            console.log('contrasena_temporal (raw):', temporalValue);
            console.log('contrasena_temporal (type):', typeof temporalValue);
            console.log('contrasena_temporal (Number):', temporalNumber);
            console.log('hasTemporalPassword:', hasTemporalPassword);
        }

        if (!hasTemporalPassword) {
            return res.status(400).json({
                success: false,
                message: 'No se requiere cambio de contraseña'
            });
        }

        //Hash de la nueva contraseña
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(nuevaContrasena, saltRounds);

        if (process.env.NODE_ENV === 'development') {
            console.log('\n=== CAMBIO DE CONTRASEÑA TEMPORAL ===');
            console.log('Usuario ID:', userId);
            console.log('Nueva contraseña (longitud):', nuevaContrasena.length);
            console.log('Hash generado (primeros 50 chars):', hashedPassword.substring(0, 50));
            console.log('Hash generado (longitud):', hashedPassword.length);
        }

        //Actualiza la contraseña y marca como no temporal
        if (process.env.NODE_ENV === 'development') {
            console.log('\n=== EJECUTANDO UPDATE ===');
            console.log('Query: UPDATE usuario SET contrasena = ?, contrasena_temporal = 0 WHERE id_usuario = ?');
            console.log('Parámetros:');
            console.log('  - hashedPassword (primeros 50):', hashedPassword.substring(0, 50));
            console.log('  - hashedPassword (longitud):', hashedPassword.length);
            console.log('  - userId:', userIdNumber);
            console.log('  - userId (type):', typeof userId);
            
            // Verificar que el usuario existe antes del UPDATE
            const [userCheck] = await pool.execute(
                'SELECT id_usuario, correo, contrasena_temporal FROM usuario WHERE id_usuario = ?',
                [userIdNumber]
            );
            console.log('Usuario antes del UPDATE:', userCheck.length > 0 ? {
                id: userCheck[0].id_usuario,
                correo: userCheck[0].correo,
                contrasena_temporal: userCheck[0].contrasena_temporal
            } : 'NO ENCONTRADO');
        }
        
        const [updateResult] = await pool.execute(
            `UPDATE usuario 
             SET contrasena = ?, contrasena_temporal = 0 
             WHERE id_usuario = ?`,
            [hashedPassword, userIdNumber]
        );

        if (process.env.NODE_ENV === 'development') {
            console.log('Resultado del UPDATE:');
            console.log('  - Filas afectadas:', updateResult.affectedRows);
            console.log('  - Filas cambiadas:', updateResult.changedRows);
            console.log('  - Info:', updateResult.info);
        }

        // Verificar que se guardó correctamente
        if (updateResult.affectedRows === 0) {
            console.error('❌ No se actualizó ninguna fila');
            // Verificar si el usuario existe
            const [userCheck] = await pool.execute(
                'SELECT id_usuario FROM usuario WHERE id_usuario = ?',
                [userIdNumber]
            );
            console.error('Usuario existe en BD:', userCheck.length > 0);
            return res.status(500).json({
                success: false,
                message: 'Error: No se pudo actualizar la contraseña. Verifica que el usuario existe.'
            });
        }
        
        if (updateResult.changedRows === 0 && updateResult.affectedRows > 0) {
            console.warn('⚠️ Se afectó una fila pero no se cambió ningún valor. Esto puede indicar que los valores son idénticos.');
        }

        // Esperar un momento para que la actualización se complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar directamente en la BD que se guardó
        const [verifyUpdate] = await pool.execute(
            `SELECT contrasena, LENGTH(contrasena) as longitud_contrasena, 
                    contrasena_temporal
             FROM usuario WHERE id_usuario = ?`,
            [userIdNumber]
        );

        if (verifyUpdate.length === 0) {
            console.error('❌ Error: Usuario no encontrado después del UPDATE');
            return res.status(500).json({
                success: false,
                message: 'Error: No se pudo verificar la actualización'
            });
        }
        
        const savedHash = verifyUpdate[0].contrasena;
        const temporalAfterUpdate = verifyUpdate[0].contrasena_temporal;
        const temporalAfterUpdateNumber = Number(temporalAfterUpdate);
        
        if (process.env.NODE_ENV === 'development') {
            console.log('\n=== VERIFICACIÓN POST-UPDATE ===');
            console.log('Hash guardado (primeros 50 chars):', savedHash.substring(0, 50));
            console.log('Longitud hash guardado:', verifyUpdate[0].longitud_contrasena);
            console.log('¿Hashes coinciden?', hashedPassword === savedHash);
            console.log('contrasena_temporal después de UPDATE (raw):', temporalAfterUpdate);
            console.log('contrasena_temporal después de UPDATE (type):', typeof temporalAfterUpdate);
            console.log('contrasena_temporal después de UPDATE (Number):', temporalAfterUpdateNumber);
            
            // Probar la contraseña inmediatamente
            const testMatch = await bcrypt.compare(nuevaContrasena, savedHash);
            console.log('¿Contraseña coincide con hash guardado?', testMatch);
        }
        
        // Verificar que la contraseña se guardó correctamente
        if (!savedHash || !savedHash.startsWith('$2')) {
            console.error('❌ Error: Contraseña guardada no tiene formato bcrypt válido');
            return res.status(500).json({
                success: false,
                message: 'Error: La contraseña no se guardó correctamente'
            });
        }
        
        // Verificar que contrasena_temporal se actualizó a 0
        if (temporalAfterUpdateNumber !== 0 && temporalAfterUpdate !== false && temporalAfterUpdate !== '0') {
            console.error('❌ Error: contrasena_temporal no se actualizó a 0');
            console.error('  - Valor actual:', temporalAfterUpdate);
            console.error('  - Tipo:', typeof temporalAfterUpdate);
            console.error('  - Como número:', temporalAfterUpdateNumber);
            
            // Intentar actualizar de nuevo
            console.log('Intentando actualizar contrasena_temporal de nuevo...');
            try {
                const [retryUpdate] = await pool.execute(
                    'UPDATE usuario SET contrasena_temporal = 0 WHERE id_usuario = ?',
                    [userIdNumber]
                );
                console.log('Reintento - Filas afectadas:', retryUpdate.affectedRows);
            } catch (retryError) {
                console.error('Error en reintento:', retryError.message);
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error: No se pudo actualizar el estado de contraseña temporal'
            });
        }
        
        if (process.env.NODE_ENV === 'development') {
            console.log('✓ Verificación exitosa: contraseña y contrasena_temporal actualizados correctamente');
        }

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });

    } catch (error) {
        console.error('Error en cambiarContrasenaTemporal:', error);
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
    updateProfile,
    forgotPassword,
    resetPassword,
    cambiarContrasenaTemporal
};
