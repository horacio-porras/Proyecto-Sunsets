const express = require('express');
const router = express.Router();
const opinionController = require('../controllers/opinionController');
const { authenticateToken } = require('../middleware/auth');

// GET opiniones de un producto (público)
router.get('/producto/:id_producto', opinionController.obtenerOpinionesPorProducto);

// GET promedio de calificaciones de un producto (público)
router.get('/producto/:id_producto/promedio', opinionController.obtenerPromedioProducto);

// GET opiniones del restaurante para carrusel (público)
router.get('/restaurante', opinionController.obtenerOpinionesRestaurante);

// GET verificar si el cliente puede opinar sobre un producto (requiere autenticación)
router.get('/verificar/producto/:id_producto', authenticateToken, opinionController.verificarPuedeOpinar);

// GET verificar si el cliente puede opinar sobre el restaurante (requiere autenticación)
router.get('/verificar/restaurante', authenticateToken, opinionController.verificarPuedeOpinarRestaurante);

// POST nueva opinión (requiere autenticación)
router.post('/', authenticateToken, opinionController.crearOpinion);

// GET opiniones del cliente autenticado (requiere autenticación)
router.get('/mis-opiniones', authenticateToken, opinionController.obtenerOpinionesCliente);

// PUT actualizar opinión del cliente (requiere autenticación)
router.put('/:id_opinion', authenticateToken, opinionController.actualizarOpinion);

// Rutas de moderación (solo administradores)
const { authorizeRoles } = require('../middleware/auth');

// GET opiniones pendientes de moderación (requiere autenticación y rol Administrador)
// IMPORTANTE: Esta ruta debe estar ANTES de las rutas dinámicas
router.get('/pendientes', authenticateToken, authorizeRoles('Administrador'), opinionController.obtenerOpinionesPendientes);

// POST aprobar opinión (requiere autenticación y rol Administrador)
router.post('/:id_opinion/aprobar', authenticateToken, authorizeRoles('Administrador'), opinionController.aprobarOpinion);

// DELETE rechazar/eliminar opinión (requiere autenticación y rol Administrador)
router.delete('/:id_opinion/rechazar', authenticateToken, authorizeRoles('Administrador'), opinionController.rechazarOpinion);

module.exports = router;
