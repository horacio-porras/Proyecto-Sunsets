const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getInventario,
    crearItemInventario,
    actualizarItemInventario,
    eliminarItemInventario,
    registrarMovimiento,
    obtenerMovimientosInventario,
    getEstadisticasInventario,
    getProductos,
    actualizarDisponibilidadProducto,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    getCategorias
} = require('../controllers/inventarioController');

//Rutas de inventario
router.get('/', authenticateToken, authorizeRoles('Administrador', 'Empleado'), getInventario);
router.post('/', authenticateToken, authorizeRoles('Administrador'), crearItemInventario);
router.put('/:itemId', authenticateToken, authorizeRoles('Administrador'), actualizarItemInventario);
router.delete('/:itemId', authenticateToken, authorizeRoles('Administrador'), eliminarItemInventario);

//Rutas de movimientos
router.get('/:itemId/movimientos', authenticateToken, authorizeRoles('Administrador', 'Empleado'), obtenerMovimientosInventario);
router.post('/:itemId/movimientos', authenticateToken, authorizeRoles('Administrador', 'Empleado'), registrarMovimiento);

//Rutas de estadísticas
router.get('/stats', authenticateToken, authorizeRoles('Administrador', 'Empleado'), getEstadisticasInventario);

//Rutas de productos
router.get('/productos', authenticateToken, authorizeRoles('Administrador', 'Empleado'), getProductos);
router.post('/productos', authenticateToken, authorizeRoles('Administrador'), crearProducto);
router.put('/productos/:productoId', authenticateToken, authorizeRoles('Administrador'), actualizarProducto);
router.delete('/productos/:productoId', authenticateToken, authorizeRoles('Administrador'), eliminarProducto);
router.put('/productos/:productoId/disponibilidad', authenticateToken, authorizeRoles('Administrador', 'Empleado'), actualizarDisponibilidadProducto);

//Rutas de categorías
router.get('/categorias', authenticateToken, authorizeRoles('Administrador', 'Empleado'), getCategorias);

module.exports = router;
