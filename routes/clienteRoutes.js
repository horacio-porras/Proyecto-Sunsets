const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

//Middleware para verificar autenticación
const { authenticateToken } = require('../middleware/auth');
const {
    getRecompensasCliente,
    canjearRecompensa
} = require('../controllers/recompensaController');

// Controladores del cliente
const { actualizarPreferenciaNotificacion, obtenerPromocionesPersonalizadas, verificarPromocionesPorHorario, obtenerNotificaciones, marcarNotificacionLeida } = require('../controllers/clienteController');

// Actualiza la preferencia de notificaciones
router.patch('/notificaciones', authenticateToken, actualizarPreferenciaNotificacion);

// Obtiene promociones personalizadas según historial
router.get('/notificaciones/personalizadas', authenticateToken, obtenerPromocionesPersonalizadas);

// Obtiene notificaciones del usuario
router.get('/notificaciones', authenticateToken, obtenerNotificaciones);

// Obtener cantidad de notificaciones no leídas
router.get('/notificaciones/count', authenticateToken, async (req, res, next) => {
    try {
        return await require('../controllers/clienteController').obtenerNoLeidas(req, res);
    } catch (err) {
        next(err);
    }
});

// Marca una notificación como leída
router.patch('/notificaciones/:id/leida', authenticateToken, marcarNotificacionLeida);

// Verifica promociones válidas según horario actual
router.post('/verificar-promocion-horaria', authenticateToken, verificarPromocionesPorHorario);

//Obtiene los puntos de lealtad del cliente logueado
router.get('/puntos', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const clienteQuery = `
            SELECT puntos_acumulados 
            FROM cliente 
            WHERE id_usuario = ?
        `;
        
        const [clienteRows] = await pool.execute(clienteQuery, [userId]);
        
        if (clienteRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }
        
        const puntos = clienteRows[0].puntos_acumulados || 0;
        
        res.json({
            success: true,
            puntos_acumulados: puntos
        });
        
    } catch (error) {
        console.error('Error al obtener puntos de lealtad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

//Actualiza los puntos de lealtad después de un pedido
router.post('/puntos/actualizar', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { puntosGanados, puntosUtilizados } = req.body;
        
        const clienteQuery = `
            SELECT id_cliente, puntos_acumulados 
            FROM cliente 
            WHERE id_usuario = ?
        `;
        
        const [clienteRows] = await pool.execute(clienteQuery, [userId]);
        
        if (clienteRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }
        
        const cliente = clienteRows[0];
        let nuevosPuntos = cliente.puntos_acumulados + (puntosGanados || 0) - (puntosUtilizados || 0);
        
        nuevosPuntos = Math.max(0, nuevosPuntos);
        
        const updateQuery = `
            UPDATE cliente 
            SET puntos_acumulados = ? 
            WHERE id_cliente = ?
        `;
        
        await pool.execute(updateQuery, [nuevosPuntos, cliente.id_cliente]);
        
        res.json({
            success: true,
            puntos_acumulados: nuevosPuntos,
            message: 'Puntos actualizados correctamente'
        });
        
    } catch (error) {
        console.error('Error al actualizar puntos de lealtad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

//Catálogo de recompensas disponible para clientes
router.get('/recompensas', authenticateToken, getRecompensasCliente);

//Canje de recompensas
router.post('/recompensas/:id/canjear', authenticateToken, canjearRecompensa);
//Obtiene las direcciones del cliente logueado
router.get('/direcciones', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [clienteRows] = await pool.execute(
            `SELECT c.id_cliente FROM cliente c JOIN usuario u ON c.id_usuario = u.id_usuario WHERE u.id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const clienteId = clienteRows[0].id_cliente;

        const [direcciones] = await pool.execute(
            `SELECT id_direccion, direccion_completa, referencia, provincia, canton, distrito, direccion_principal 
             FROM direccion WHERE id_cliente = ? ORDER BY direccion_principal DESC, id_direccion ASC`,
            [clienteId]
        );

        res.json({ success: true, direcciones });

    } catch (error) {
        console.error('Error al obtener direcciones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//Agrega una nueva dirección para el cliente logueado
router.post('/direcciones', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { direccion_completa, provincia, canton, distrito, referencia, direccion_principal } = req.body;

        if (!direccion_completa || !provincia || !canton || !distrito) {
            return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
        }

        const [clienteRows] = await pool.execute(
            `SELECT c.id_cliente FROM cliente c JOIN usuario u ON c.id_usuario = u.id_usuario WHERE u.id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const clienteId = clienteRows[0].id_cliente;

        if (direccion_principal) {
            await pool.execute(
                `UPDATE direccion SET direccion_principal = 0 WHERE id_cliente = ?`,
                [clienteId]
            );
        }

        const [result] = await pool.execute(
            `INSERT INTO direccion (id_cliente, direccion_completa, referencia, provincia, canton, distrito, direccion_principal) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [clienteId, direccion_completa, referencia || null, provincia, canton, distrito, direccion_principal || false]
        );

        res.json({ 
            success: true, 
            message: 'Dirección guardada exitosamente',
            direccion_id: result.insertId 
        });

    } catch (error) {
        console.error('Error al guardar dirección:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//Actualiza la dirección del cliente logueado
router.put('/direcciones/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const direccionId = req.params.id;
        const { direccion_completa, provincia, canton, distrito, referencia, direccion_principal } = req.body;

        if (!direccion_completa || !provincia || !canton || !distrito) {
            return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
        }

        const [clienteRows] = await pool.execute(
            `SELECT c.id_cliente FROM cliente c JOIN usuario u ON c.id_usuario = u.id_usuario WHERE u.id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const clienteId = clienteRows[0].id_cliente;

        const [direccionRows] = await pool.execute(
            `SELECT id_direccion FROM direccion WHERE id_direccion = ? AND id_cliente = ?`,
            [direccionId, clienteId]
        );

        if (direccionRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dirección no encontrada' });
        }

        if (direccion_principal) {
            await pool.execute(
                `UPDATE direccion SET direccion_principal = 0 WHERE id_cliente = ? AND id_direccion != ?`,
                [clienteId, direccionId]
            );
        }

        await pool.execute(
            `UPDATE direccion SET direccion_completa = ?, referencia = ?, provincia = ?, canton = ?, distrito = ?, direccion_principal = ?
             WHERE id_direccion = ? AND id_cliente = ?`,
            [direccion_completa, referencia || null, provincia, canton, distrito, direccion_principal || false, direccionId, clienteId]
        );

        res.json({ success: true, message: 'Dirección actualizada exitosamente' });

    } catch (error) {
        console.error('Error al actualizar dirección:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//Elimina la dirección del cliente logueado
router.delete('/direcciones/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const direccionId = req.params.id;

        const [clienteRows] = await pool.execute(
            `SELECT c.id_cliente FROM cliente c JOIN usuario u ON c.id_usuario = u.id_usuario WHERE u.id_usuario = ?`,
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const clienteId = clienteRows[0].id_cliente;

        const [direccionRows] = await pool.execute(
            `SELECT id_direccion FROM direccion WHERE id_direccion = ? AND id_cliente = ?`,
            [direccionId, clienteId]
        );

        if (direccionRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dirección no encontrada' });
        }

        await pool.execute(
            `DELETE FROM direccion WHERE id_direccion = ? AND id_cliente = ?`,
            [direccionId, clienteId]
        );

        res.json({ success: true, message: 'Dirección eliminada exitosamente' });

    } catch (error) {
        console.error('Error al eliminar dirección:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
