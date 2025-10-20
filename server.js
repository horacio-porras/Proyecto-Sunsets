const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
//Carga las variables de entorno desde config.env
require('dotenv').config({ path: './config.env' });

const { testConnection, initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');

//Importa las rutas del chatbot
const chatbotRoutes = require('./routes/chatbotRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

//Configuración de seguridad
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

//Configuración de CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

//Rate limiting
const isDevelopment = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000 : 100,
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Rate limiting para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 50 : 5,
    message: {
        success: false,
        message: 'Demasiados intentos de autenticación, intenta de nuevo más tarde'
    },
    skipSuccessfulRequests: true
});

//Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

//Servir archivos estáticos
app.use(express.static('.'));

//Rutas de API
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/chatbot', chatbotRoutes);

//Ruta de salud del servidor
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

//Ruta para limpiar rate limiting en desarrollo
if (isDevelopment) {
    app.post('/api/clear-rate-limit', (req, res) => {
        req.rateLimit = { remaining: 1000 };
        res.json({
            success: true,
            message: 'Rate limiting limpiado para esta IP',
            timestamp: new Date().toISOString()
        });
    });

}

//Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

//Ruta de login
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

//Ruta de registro
app.get('/registro', (req, res) => {
    res.sendFile(__dirname + '/registro.html');
});

//Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

//Middleware global de manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(error.status || 500).json({
        success: false,
        message: isDevelopment ? error.message : 'Error interno del servidor',
        ...(isDevelopment && { stack: error.stack })
    });
});

//Función para inicializar el servidor
async function startServer() {
    try {
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('No se pudo conectar a la base de datos');
            process.exit(1);
        }

        const dbInitialized = await initializeDatabase();
        if (!dbInitialized) {
            console.error('No se pudo inicializar la base de datos');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`Servidor iniciado en puerto ${PORT}`);
            console.log(`Frontend: http://localhost:${PORT}`);
            console.log(`API: http://localhost:${PORT}/api`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
            console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

//Manejo de cierre graceful del servidor
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Recibida señal SIGINT, cerrando servidor...');
    process.exit(0);
});

//Inicia el servidor
startServer();
