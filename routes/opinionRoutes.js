const express = require('express');
const router = express.Router();
const opinionesController = require('../controllers/opinionesController');

// GET opiniones de un producto
router.get('/producto/:id_producto', opinionesController.obtenerOpinionesPorProducto);

// POST nueva opinión
router.post('/', opinionesController.crearOpinion);

module.exports = router;
