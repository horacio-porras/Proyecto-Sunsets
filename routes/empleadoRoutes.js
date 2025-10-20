const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const empleadoController = require('../controllers/empleadoController');

// GET /api/empleados - Obtener todos los empleados
router.get('/', authenticateToken, requireAdmin, empleadoController.getEmpleados);

// GET /api/empleados/stats - Obtener estadísticas de empleados
router.get('/stats', authenticateToken, requireAdmin, empleadoController.getEstadisticasEmpleados);

// POST /api/empleados - Crear nuevo empleado
router.post('/', authenticateToken, requireAdmin, empleadoController.crearEmpleado);

// PUT /api/empleados/:empleadoId - Actualizar empleado
router.put('/:empleadoId', authenticateToken, requireAdmin, empleadoController.actualizarEmpleado);

// DELETE /api/empleados/:empleadoId - Eliminar empleado (cambiar estado a inactivo)
router.delete('/:empleadoId', authenticateToken, requireAdmin, empleadoController.eliminarEmpleado);

module.exports = router;
