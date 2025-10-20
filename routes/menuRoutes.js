const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

//GET /api/menu/products - Obtiene todos los productos del menú
router.get('/products', async (req, res) => {
    try {
        const [products] = await pool.query(`
            SELECT 
                p.id_producto,
                p.nombre,
                p.descripcion,
                p.ingredientes,
                p.precio,
                p.imagen_url,
                p.vegetariano,
                p.vegano,
                p.sin_gluten,
                p.disponible,
                p.tiempo_preparacion,
                c.nombre_categoria as categoria
            FROM producto p
            JOIN categoria c ON p.id_categoria = c.id_categoria
            WHERE p.disponible = 1 AND c.activa = 1
            ORDER BY c.nombre_categoria, p.nombre
        `);

        //Transforma los datos para el frontend
        const formattedProducts = products.map(product => ({
            id: product.id_producto,
            name: product.nombre,
            description: product.descripcion,
            ingredients: product.ingredientes,
            price: product.precio,
            image: product.imagen_url,
            category: product.categoria,
            dietary: {
                vegetariano: product.vegetariano,
                vegano: product.vegano,
                sinGluten: product.sin_gluten
            },
            available: product.disponible,
            prepTime: product.tiempo_preparacion
        }));

        res.json({
            success: true,
            data: formattedProducts
        });

    } catch (error) {
        console.error('Error al obtener productos del menú:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

//GET /api/menu/categories - Obtiene todas las categorías activas
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.query(`
            SELECT 
                id_categoria,
                nombre_categoria,
                descripcion
            FROM categoria
            WHERE activa = 1
            ORDER BY nombre_categoria
        `);

        const formattedCategories = categories.map(category => ({
            id: category.id_categoria,
            name: category.nombre_categoria,
            description: category.descripcion
        }));

        res.json({
            success: true,
            data: formattedCategories
        });

    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

module.exports = router;

