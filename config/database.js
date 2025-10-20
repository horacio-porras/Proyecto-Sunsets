const mysql = require('mysql2');
//Carga las variables de entorno desde config.env
require('dotenv').config({ path: './config.env' });

//Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '3Qarelo81*',
    database: process.env.DB_NAME || 'SunsetsDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

//Crea el pool de conexiones
const pool = mysql.createPool(dbConfig);

//Promisify para usar async/await
const promisePool = pool.promise();

//Función para probar la conexión
async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('Conexión a MySQL establecida correctamente');
        connection.release();
        return true;
    } catch (error) {
        console.error('Error al conectar con MySQL:', error.message);
        return false;
    }
}

//Función para verificar la conexión a la base de datos existente
async function initializeDatabase() {
    try {
        //Verifica que la base de datos existe y las tablas principales están disponibles
        const [tables] = await promisePool.query('SHOW TABLES');
        console.log('Base de datos SunsetsDB conectada correctamente');
        console.log(`Tablas encontradas: ${tables.length}`);
        
        //Verifica que las tablas principales existen
        const tableNames = tables.map(table => Object.values(table)[0]);
        const requiredTables = ['usuario', 'rol', 'cliente', 'empleado', 'administrador'];
        
        for (const table of requiredTables) {
            if (!tableNames.includes(table)) {
                throw new Error(`Tabla requerida '${table}' no encontrada`);
            }
        }
        
        console.log('Todas las tablas requeridas están disponibles');
        return true;
    } catch (error) {
        console.error('Error al verificar la base de datos:', error.message);
        return false;
    }
}

module.exports = {
    pool: promisePool,
    testConnection,
    initializeDatabase
};
