const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
//Carga las variables de entorno desde config.env
require('dotenv').config({ path: './config.env' });

const { testConnection, initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const promocionesRoutes = require('./routes/promocionesRoutes');
const reservacionesRoutes = require('./routes/reservacionesRoutes');
const recompensasRoutes = require('./routes/recompensasRoutes');
const { sendDailyReminders } = require('./utils/reminderService');
const reminderRoutes = require('./routes/reminderRoutes');
const opinionesRoutes = require('./routes/opinionesRoutes');
const facturaRoutes = require('./routes/facturaRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const reportesRoutes = require('./routes/reportesRoutes');

//Importa las rutas del chatbot
const chatbotRoutes = require('./routes/chatbotRoutes');

const app = express();
// Railway asigna el puerto automáticamente, si no está definido usa 3000
// Maneja el caso de PORT vacío o inválido
let PORT = 3000;
if (process.env.PORT) {
    const portNum = parseInt(process.env.PORT, 10);
    if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
        PORT = portNum;
    }
}

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
// Detectar Railway: Railway expone estas variables de entorno
const isRailway = !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_SERVICE_NAME ||
    process.env.RAILWAY_PROJECT_NAME ||
    (process.env.PORT && process.env.PORT.length > 4) // Railway asigna puertos > 9999
);

// Determina los límites según el entorno
// Railway y producción: límites mucho más altos para evitar bloqueos
// Development: límites muy altos para desarrollo local
const getMaxRequests = () => {
    if (isDevelopment) return 1000;
    if (isRailway || process.env.NODE_ENV === 'production') return 1000; // Aumentado significativamente para Railway
    return 200; // Límite base aumentado
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: getMaxRequests(),
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Excluir endpoints de polling y archivos estáticos del rate limiting
    skip: (req) => {
        // Excluir archivos estáticos (HTML, CSS, JS, imágenes, etc.)
        if (req.path.match(/\.(html|css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)) {
            return true;
        }
        // Excluir endpoints de polling que se llaman frecuentemente
        const pollingEndpoints = [
            '/api/pedidos/assigned',
            '/api/pedidos/unassigned',
            '/api/cliente/notificaciones',
            '/api/health'
        ];
        return pollingEndpoints.some(endpoint => req.path.startsWith(endpoint));
    }
});

app.use(limiter);

//Rate limiting para autenticación (más restrictivo)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 50 : (isRailway ? 30 : 15), // Aumentado para Railway
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
app.use('/api/menu', menuRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/reservaciones', reservacionesRoutes);
app.use('/api/promociones', promocionesRoutes);
app.use('/api/recompensas', recompensasRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/opiniones', opinionesRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/reportes', reportesRoutes);
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
            console.log(`Railway detectado: ${isRailway ? 'Sí' : 'No'}`);
            console.log(`Rate limiting: ${getMaxRequests()} requests por 15 minutos`);
            
            //Inicializa la tarea programada de recordatorios
            //Se ejecuta todos los días a las 10:00 AM
            cron.schedule('0 10 * * *', async () => {
                console.log('[CRON] Ejecutando tarea de recordatorios diarios...');
                try {
                    await sendDailyReminders();
                } catch (error) {
                    console.error('[CRON] Error en tarea de recordatorios:', error);
                }
            });
            
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
