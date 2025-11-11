const express = require('express');
const router = express.Router();
const opinionController = require('../controllers/opinionController');

// GET opiniones de un producto
router.get('/producto/:id_producto', opinionController.obtenerOpinionesPorProducto);

// POST nueva opinión
router.post('/', opinionController.crearOpinion);

module.exports = router;
