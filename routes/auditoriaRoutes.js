const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/auditoria
 * Obtiene el historial de cambios del sistema
 * Solo accesible para administradores
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.tipoUsuario;
        
        // Verificar que el usuario es administrador
        if (userRole !== 'Administrador') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a esta información' 
            });
        }

        // Parámetros de filtrado y paginación
        const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit)) || 100 : 100;
        const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset)) || 0 : 0;
        const tabla = req.query.tabla || null;
        const accion = req.query.accion || null;
        const fechaDesde = req.query.fechaDesde || null;
        const fechaHasta = req.query.fechaHasta || null;
        const idUsuario = req.query.idUsuario || null;

        // Construir query base
        let query = `
            SELECT 
                hc.id_cambio,
                hc.id_usuario,
                u.nombre as usuario_nombre,
                u.correo as usuario_correo,
                r.nombre_rol as usuario_rol,
                hc.tabla_afectada,
                hc.id_registro_afectado,
                hc.accion_realizada,
                hc.datos_anteriores,
                hc.datos_nuevos,
                hc.fecha_cambio,
                hc.ip_usuario
            FROM historial_cambios hc
            LEFT JOIN usuario u ON hc.id_usuario = u.id_usuario
            LEFT JOIN rol r ON u.id_rol = r.id_rol
            WHERE 1=1
        `;

        const params = [];

        // Aplicar filtros
        if (tabla) {
            query += ` AND hc.tabla_afectada = ?`;
            params.push(tabla);
        }

        if (accion) {
            query += ` AND hc.accion_realizada = ?`;
            params.push(accion.toUpperCase());
        }

        if (fechaDesde) {
            query += ` AND DATE(hc.fecha_cambio) >= ?`;
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            query += ` AND DATE(hc.fecha_cambio) <= ?`;
            params.push(fechaHasta);
        }

        if (idUsuario) {
            query += ` AND hc.id_usuario = ?`;
            params.push(idUsuario);
        }

        // Ordenar por fecha más reciente primero
        query += ` ORDER BY hc.fecha_cambio DESC`;

        // Aplicar límite y offset (deben ser números literales, no parámetros)
        // Validar que son números válidos para evitar inyección SQL
        const limitNum = parseInt(limit) || 100;
        const offsetNum = parseInt(offset) || 0;
        query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

        // Ejecutar query
        let cambios = [];
        try {
            [cambios] = await pool.execute(query, params);
        } catch (dbError) {
            // Si la tabla no existe, retornar array vacío
            if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes("doesn't exist") || dbError.message.includes("Table") && dbError.message.includes("doesn't exist")) {
                cambios = [];
            } else {
                // Re-lanzar el error para que se capture en el catch principal
                throw dbError;
            }
        }

        // Obtener total de registros para paginación
        let countQuery = `
            SELECT COUNT(*) as total
            FROM historial_cambios hc
            WHERE 1=1
        `;
        const countParams = [];

        if (tabla) {
            countQuery += ` AND hc.tabla_afectada = ?`;
            countParams.push(tabla);
        }

        if (accion) {
            countQuery += ` AND hc.accion_realizada = ?`;
            countParams.push(accion.toUpperCase());
        }

        if (fechaDesde) {
            countQuery += ` AND DATE(hc.fecha_cambio) >= ?`;
            countParams.push(fechaDesde);
        }

        if (fechaHasta) {
            countQuery += ` AND DATE(hc.fecha_cambio) <= ?`;
            countParams.push(fechaHasta);
        }

        if (idUsuario) {
            countQuery += ` AND hc.id_usuario = ?`;
            countParams.push(idUsuario);
        }

        let total = 0;
        try {
            const [countResult] = await pool.execute(countQuery, countParams);
            total = countResult[0]?.total || 0;
        } catch (dbError) {
            // Si la tabla no existe, total es 0
            if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes("doesn't exist") || dbError.message.includes("Table") && dbError.message.includes("doesn't exist")) {
                total = 0;
            } else {
                throw dbError;
            }
        }

        // Procesar datos para parsear JSON strings
        const cambiosProcesados = cambios.map(cambio => {
            try {
                let datosAnteriores = null;
                let datosNuevos = null;

                // Intentar parsear datos_anteriores
                if (cambio.datos_anteriores) {
                    try {
                        datosAnteriores = JSON.parse(cambio.datos_anteriores);
                    } catch (e) {
                        // Si falla el parseo, mantener como string
                        datosAnteriores = cambio.datos_anteriores;
                    }
                }

                // Intentar parsear datos_nuevos
                if (cambio.datos_nuevos) {
                    try {
                        datosNuevos = JSON.parse(cambio.datos_nuevos);
                    } catch (e) {
                        // Si falla el parseo, mantener como string
                        datosNuevos = cambio.datos_nuevos;
                    }
                }

                return {
                    ...cambio,
                    datos_anteriores: datosAnteriores,
                    datos_nuevos: datosNuevos
                };
            } catch (error) {
                console.error('Error al procesar cambio:', error);
                return {
                    ...cambio,
                    datos_anteriores: cambio.datos_anteriores || null,
                    datos_nuevos: cambio.datos_nuevos || null
                };
            }
        });

        res.json({
            success: true,
            data: {
                cambios: cambiosProcesados,
                paginacion: {
                    total,
                    limit,
                    offset,
                    totalPaginas: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error al obtener historial de cambios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/auditoria/tablas
 * Obtiene lista de tablas únicas que tienen registros de auditoría
 */
router.get('/tablas', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.tipoUsuario;
        
        if (userRole !== 'Administrador') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a esta información' 
            });
        }

        let tablas = [];
        try {
            const [tablasResult] = await pool.execute(
                `SELECT DISTINCT tabla_afectada 
                 FROM historial_cambios 
                 WHERE tabla_afectada IS NOT NULL
                 ORDER BY tabla_afectada`
            );
            tablas = tablasResult.map(t => t.tabla_afectada);
        } catch (dbError) {
            // Si la tabla no existe, retornar array vacío
            if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes("doesn't exist")) {
                tablas = [];
            } else {
                throw dbError;
            }
        }

        res.json({
            success: true,
            data: {
                tablas: tablas
            }
        });

    } catch (error) {
        console.error('Error al obtener tablas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

