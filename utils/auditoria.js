const { pool } = require('../config/database');

/**
 * Registra un cambio en el historial de auditoría
 * @param {Object} cambio - Objeto con los datos del cambio
 * @param {number} cambio.id_usuario - ID del usuario que realizó el cambio
 * @param {string} cambio.tabla_afectada - Nombre de la tabla afectada
 * @param {number} cambio.id_registro_afectado - ID del registro afectado
 * @param {string} cambio.accion_realizada - Acción realizada (CREATE, UPDATE, DELETE)
 * @param {Object} cambio.datos_anteriores - Datos anteriores (opcional)
 * @param {Object} cambio.datos_nuevos - Datos nuevos (opcional)
 * @param {string} cambio.ip_usuario - IP del usuario (opcional)
 */
async function registrarCambio(cambio) {
    try {
        const {
            id_usuario,
            tabla_afectada,
            id_registro_afectado,
            accion_realizada,
            datos_anteriores = null,
            datos_nuevos = null,
            ip_usuario = null
        } = cambio;

        // Validar campos requeridos
        if (!id_usuario || !tabla_afectada || !accion_realizada) {
            console.error('[Auditoría] Faltan campos requeridos para registrar el cambio:', { id_usuario, tabla_afectada, accion_realizada });
            return false;
        }

        // Convertir objetos a JSON strings si son objetos
        let datosAnterioresStr = null;
        let datosNuevosStr = null;
        
        if (datos_anteriores) {
            datosAnterioresStr = typeof datos_anteriores === 'string' ? datos_anteriores : JSON.stringify(datos_anteriores);
        }
        
        if (datos_nuevos) {
            datosNuevosStr = typeof datos_nuevos === 'string' ? datos_nuevos : JSON.stringify(datos_nuevos);
        }

        await pool.execute(
            `INSERT INTO historial_cambios 
            (id_usuario, tabla_afectada, id_registro_afectado, accion_realizada, 
             datos_anteriores, datos_nuevos, fecha_cambio, ip_usuario)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
            [
                id_usuario,
                tabla_afectada,
                id_registro_afectado || null,
                accion_realizada.toUpperCase(),
                datosAnterioresStr,
                datosNuevosStr,
                ip_usuario || null
            ]
        );
        
        return true;
    } catch (error) {
        // No lanzar error para no interrumpir el flujo principal, pero loguear el error
        console.error('[Auditoría] Error al registrar cambio:', error.message);
        console.error('[Auditoría] Stack:', error.stack);
        return false;
    }
}

/**
 * Middleware para registrar automáticamente cambios en operaciones CRUD
 * Debe ser usado después de authenticateToken
 */
const registrarCambioMiddleware = (tabla, accion) => {
    return async (req, res, next) => {
        // Guardar la función original de res.json
        const originalJson = res.json.bind(res);
        
        // Interceptar la respuesta
        res.json = async function(data) {
            // Si la operación fue exitosa, registrar el cambio
            if (data.success) {
                try {
                    const id_usuario = req.user?.id;
                    const ip_usuario = req.ip || req.connection.remoteAddress;
                    
                    let id_registro_afectado = null;
                    let datos_nuevos = null;
                    let datos_anteriores = null;

                    // Obtener ID del registro afectado según la acción
                    if (accion === 'CREATE' && data.data) {
                        // Para CREATE, el ID suele venir en data.data.id o similar
                        id_registro_afectado = data.data.id || data.data.id_usuario || 
                                              data.data.id_producto || data.data.id_pedido ||
                                              data.data.id_empleado || data.data.id_cliente ||
                                              data.data.id_inventario || data.data.id_promocion ||
                                              data.data.id_recompensa || null;
                        datos_nuevos = data.data;
                    } else if (accion === 'UPDATE') {
                        // Para UPDATE, el ID viene en los params o body
                        id_registro_afectado = req.params.id || req.body.id || null;
                        datos_nuevos = req.body;
                        // Intentar obtener datos anteriores si es posible
                        // Esto requeriría una consulta adicional, por ahora lo dejamos null
                    } else if (accion === 'DELETE') {
                        // Para DELETE, el ID viene en los params
                        id_registro_afectado = req.params.id || null;
                    }

                    if (id_usuario) {
                        await registrarCambio({
                            id_usuario,
                            tabla_afectada: tabla,
                            id_registro_afectado,
                            accion_realizada: accion,
                            datos_anteriores,
                            datos_nuevos,
                            ip_usuario
                        });
                    }
                } catch (error) {
                    console.error('[Auditoría] Error en middleware:', error.message);
                }
            }
            
            // Llamar a la función original
            return originalJson(data);
        };
        
        next();
    };
};

module.exports = {
    registrarCambio,
    registrarCambioMiddleware
};

