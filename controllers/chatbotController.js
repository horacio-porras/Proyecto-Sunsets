const { pool } = require('../config/database');

// Función para generar respuesta basada en palabras clave
const generarRespuesta = async (pregunta) => {
    const preguntaLower = pregunta.toLowerCase().trim();
    
    // Información del restaurante
    const horarios = 'Miércoles - Domingo, 12:00 PM - 08:00 PM';
    const ubicacion = 'San José, Costa Rica, Tarbaca';
    const telefono = '+506 6171-4020';
    const email = 'sunsetstarbaca@gmail.com';
    
    // Categorías de consulta y respuestas
    const categorias = {
        horario: ['horario', 'horarios', 'hora', 'abierto', 'cierra', 'abre', 'atencion', 'atención'],
        ubicacion: ['ubicacion', 'ubicación', 'direccion', 'dirección', 'donde', 'dónde', 'lugar', 'dirección', 'direccion', 'tarbaca'],
        contacto: ['contacto', 'telefono', 'teléfono', 'email', 'correo', 'llamar', 'llamada', 'comunicar'],
        menu: ['menu', 'menú', 'comida', 'plato', 'platos', 'producto', 'productos', 'pizza', 'pizzas', 'bebida', 'bebidas', 'categoria', 'categoría'],
        reservacion: ['reservacion', 'reservación', 'reservar', 'mesa', 'mesas', 'reserva'],
        pedido: ['pedido', 'pedidos', 'orden', 'ordenar', 'comprar', 'delivery', 'domicilio', 'entrega'],
        promocion: ['promocion', 'promoción', 'descuento', 'descuentos', 'oferta', 'ofertas', 'rebaja'],
        general: ['hola', 'buenos dias', 'buenos días', 'buenas tardes', 'buenas noches', 'ayuda', 'informacion', 'información']
    };
    
    // Detectar categoría
    let categoria = 'general';
    for (const [cat, palabras] of Object.entries(categorias)) {
        if (palabras.some(palabra => preguntaLower.includes(palabra))) {
            categoria = cat;
            break;
        }
    }
    
    // Generar respuesta según categoría
    let respuesta = '';
    
    switch (categoria) {
        case 'horario':
            respuesta = `Nuestros horarios de atención son: ${horarios}. ¡Te esperamos! 🕐`;
            break;
            
        case 'ubicacion':
            respuesta = `Estamos ubicados en ${ubicacion}. ¡Ven a visitarnos! 📍`;
            break;
            
        case 'contacto':
            respuesta = `Puedes contactarnos por:\n📞 Teléfono: ${telefono}\n📧 Email: ${email}\n\n¡Estamos para ayudarte! 💬`;
            break;
            
        case 'menu':
            try {
                // Obtener categorías del menú
                const [categorias] = await pool.query(`
                    SELECT DISTINCT nombre_categoria 
                    FROM categoria 
                    WHERE activa = 1 
                    ORDER BY nombre_categoria
                `);
                
                if (categorias.length > 0) {
                    const listaCategorias = categorias.map(c => c.nombre_categoria).join(', ');
                    respuesta = `Tenemos las siguientes categorías en nuestro menú: ${listaCategorias}.\n\nPuedes ver nuestro menú completo en la sección "Ver Menú" de nuestra página. 🍕🍽️`;
                } else {
                    respuesta = 'Puedes ver nuestro menú completo en la sección "Ver Menú" de nuestra página. Ofrecemos pizzas artesanales, desayunos, bebidas y más. 🍕🍽️';
                }
            } catch (error) {
                console.error('Error al obtener categorías:', error);
                respuesta = 'Puedes ver nuestro menú completo en la sección "Ver Menú" de nuestra página. Ofrecemos pizzas artesanales, desayunos, bebidas y más. 🍕🍽️';
            }
            break;
            
        case 'reservacion':
            respuesta = `Para hacer una reservación, puedes:\n1. Visitar nuestra página de reservaciones\n2. Llamarnos al ${telefono}\n3. Enviarnos un email a ${email}\n\n¡Estaremos encantados de recibirte! 🎉`;
            break;
            
        case 'pedido':
            respuesta = `Puedes hacer tu pedido directamente desde nuestra página web. Visita la sección "Menú" para ver nuestros productos y realizar tu pedido. También puedes llamarnos al ${telefono}. 🛒`;
            break;
            
        case 'promocion':
            respuesta = `Tenemos promociones especiales disponibles. Visita nuestra página para conocer las ofertas actuales. También puedes seguirnos en nuestras redes sociales para estar al día con nuestras promociones. 🎁`;
            break;
            
        case 'general':
        default:
            if (preguntaLower.includes('hola') || preguntaLower.includes('buenos') || preguntaLower.includes('buenas')) {
                respuesta = '¡Hola! 👋 Bienvenido a Sunset\'s Tarbaca. ¿En qué puedo ayudarte? Puedo informarte sobre nuestros horarios, ubicación, menú, reservaciones y más.';
            } else if (preguntaLower.includes('ayuda')) {
                respuesta = 'Estoy aquí para ayudarte. Puedo informarte sobre:\n• Horarios de atención\n• Ubicación\n• Menú y productos\n• Reservaciones\n• Pedidos\n• Promociones\n\n¿Sobre qué te gustaría saber? 😊';
            } else {
                respuesta = 'Gracias por tu consulta. Puedo ayudarte con información sobre nuestros horarios, ubicación, menú, reservaciones, pedidos y promociones. ¿Sobre qué te gustaría saber más? 😊';
            }
            break;
    }
    
    return { respuesta, categoria };
};

// Procesar pregunta del usuario
const procesarPregunta = async (req, res) => {
    try {
        const { pregunta, id_usuario } = req.body;
        
        if (!pregunta || pregunta.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'La pregunta es requerida'
            });
        }
        
        // Generar respuesta
        const { respuesta, categoria } = await generarRespuesta(pregunta);
        
        // Guardar en la base de datos si hay usuario
        let idConversacion = null;
        if (id_usuario) {
            try {
                const [result] = await pool.execute(
                    `INSERT INTO chat_bot (
                        id_usuario, pregunta, respuesta, categoria_consulta,
                        fecha_consulta, resuelto
                    ) VALUES (?, ?, ?, ?, NOW(), 1)`,
                    [id_usuario, pregunta, respuesta, categoria]
                );
                idConversacion = result.insertId;
            } catch (error) {
                console.error('Error al guardar conversación:', error);
                // Continuar aunque falle el guardado
            }
        }
        
        return res.json({
            success: true,
            respuesta: respuesta,
            categoria: categoria,
            id_conversacion: idConversacion
        });
        
    } catch (error) {
        console.error('Error al procesar pregunta:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al procesar la pregunta'
        });
    }
};

//Registro de conversación del ChatBot
const registerConversation = async (req, res) => {
    try {
        const {
            id_usuario,
            pregunta,
            respuesta,
            categoria_consulta,
        } = req.body;

        //Validación básica
        if (!id_usuario || !pregunta || !respuesta || !categoria_consulta) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios'
            });
        }

        //Inserción en la tabla chat_bot
        await pool.execute(
            `INSERT INTO chat_bot (
                id_usuario, pregunta, respuesta, categoria_consulta,
                fecha_consulta
            ) VALUES (?, ?, ?, ?, NOW())`,
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

module.exports = { 
    registerConversation,
    procesarPregunta
};