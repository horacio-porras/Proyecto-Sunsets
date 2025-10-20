const { pool } = require('../config/database');

// Registro de conversación del ChatBot
const registerConversation = async (req, res) => {
    try {
        const {
            id_usuario,
            pregunta,
            respuesta,
            categoria_consulta,
        } = req.body;

        // Validación básica
        if (!id_usuario || !pregunta || !respuesta || !categoria_consulta) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios'
            });
        }

        // Inserción en la tabla chat_bot
        await pool.execute(
            `INSERT INTO chat_bot (
                id_usuario, pregunta, respuesta, categoria_consulta,
                fecha_consulta
            ) VALUES (?, ?, ?, ?, NOW(), ?)`,
            [id_usuario, pregunta, respuesta, categoria_consulta]
        );

        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Conversación registrada exitosamente',
            data: {
                id_usuario,
                pregunta,
                respuesta,
                categoria_consulta,
                
            }
        });

    } catch (error) {
        console.error('Error al registrar conversación:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = { registerConversation };