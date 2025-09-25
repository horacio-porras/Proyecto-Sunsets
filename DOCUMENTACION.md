# 📚 Documentación Completa - Sunset's Tarbaca

Sistema completo de autenticación y gestión para el restaurante Sunset's Tarbaca desarrollado con Node.js, Express, MySQL y frontend HTML/CSS/JavaScript.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar base de datos MySQL
- Crear base de datos: `SunsetsDB`
- Editar `config.env` con tus credenciales de MySQL

### 3. Iniciar servidor
```bash
npm run dev
```

### 4. Acceder a la aplicación
- Frontend: http://localhost:3000
- API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

---

## 🛠️ Instalación Detallada

### Prerrequisitos
- Node.js (versión 16 o superior)
- MySQL (versión 5.7 o superior)
- npm o yarn

### Configuración de Variables de Entorno

Edita el archivo `config.env` con tus credenciales:
```env
# Configuración de Base de Datos MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=SunsetsDB

# Configuración del Servidor
PORT=3000
NODE_ENV=development

# JWT Secret Key (cambia esto por una clave secreta segura)
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui

# Configuración de CORS
CORS_ORIGIN=http://localhost:3000
```

### Configuración de Base de Datos
- Asegúrate de que la base de datos `SunsetsDB` exista
- El sistema verificará que las tablas necesarias estén disponibles

---

## 🗄️ Estructura de la Base de Datos

El sistema utiliza la base de datos **SunsetsDB** existente con las siguientes tablas principales:

### Tabla `usuario`
- `id_usuario` - ID único del usuario
- `nombre` - Nombre del usuario
- `correo` - Correo electrónico (único)
- `telefono` - Número de teléfono
- `contrasena` - Hash de la contraseña
- `id_rol` - Referencia al rol del usuario
- `fecha_registro` - Fecha de registro
- `activo` - Estado del usuario

### Tabla `rol`
- `id_rol` - ID único del rol
- `nombre_rol` - Nombre del rol (Administrador, Empleado, Cliente)

### Tabla `cliente`
- `id_cliente` - ID único del cliente
- `id_usuario` - Referencia al usuario
- `puntos_acumulados` - Puntos del programa de lealtad
- `fecha_registro_programa` - Fecha de registro en el programa
- `notificaciones_activas` - Estado de las notificaciones

### Otras tablas del sistema:
- `empleado` - Información de empleados
- `administrador` - Información de administradores
- `direccion` - Direcciones de clientes
- `producto` - Catálogo de productos
- `pedido` - Órdenes de pedidos
- Y muchas más...

---

## 🔌 API Endpoints

### Autenticación

#### POST `/api/auth/register`
Registrar un nuevo usuario.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "correo": "juan@email.com",
  "telefono": "+506 8888-8888",
  "contrasena": "MiPassword123",
  "notificacionesActivas": false
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "correo": "juan@email.com",
      "id_rol": 3,
      "tipoUsuario": "Cliente"
    },
    "token": "jwt_token_aqui"
  }
}
```

#### POST `/api/auth/login`
Iniciar sesión.

**Body:**
```json
{
  "correo": "juan@email.com",
  "contrasena": "MiPassword123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "correo": "juan@email.com",
      "id_rol": 3,
      "tipoUsuario": "Cliente"
    },
    "token": "jwt_token_aqui"
  }
}
```

#### GET `/api/auth/verify`
Verificar token JWT.

**Headers:**
```
Authorization: Bearer jwt_token_aqui
```

#### POST `/api/auth/logout`
Cerrar sesión.

**Headers:**
```
Authorization: Bearer jwt_token_aqui
```

### Utilidades

#### GET `/api/health`
Verificar estado del servidor.

**Respuesta:**
```json
{
  "success": true,
  "message": "Servidor funcionando correctamente",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "environment": "development"
}
```

---

## 🎯 Tipos de Usuario y Redirección Automática

El sistema utiliza `id_rol` para determinar automáticamente el dashboard al que debe redirigir al usuario:

- **Administrador** (`id_rol: 1`) → `/admin/dashboard.html`
- **Empleado** (`id_rol: 2`) → `/empleado/dashboard.html`  
- **Cliente** (`id_rol: 3`) → `/cliente/dashboard.html`

### Funcionalidad de Redirección:
- **Login**: Después del login exitoso, el usuario es redirigido automáticamente al dashboard correspondiente según su `id_rol`
- **Registro**: Los nuevos usuarios se registran como Cliente (`id_rol: 3`) y son redirigidos al dashboard de cliente
- **Verificación de sesión**: Si un usuario accede a un dashboard que no le corresponde, es redirigido automáticamente al correcto
- **Protección de rutas**: El sistema verifica que el usuario tenga acceso al dashboard que está intentando visitar

---

## 🔐 Seguridad

- **JWT Tokens:** Expiran en 24 horas
- **Rate Limiting:** 100 requests por IP cada 15 minutos
- **Rate Limiting de Auth:** 5 intentos de login/registro por IP cada 15 minutos
- **Hash de Contraseñas:** bcrypt con 12 rounds de salt
- **Validaciones:** express-validator con validaciones robustas
- **CORS:** Configurado para permitir orígenes específicos
- **Helmet:** Headers de seguridad

---

## 🏗️ Estructura del Proyecto

```
├── config/
│   └── database.js          # Configuración de MySQL
├── controllers/
│   └── authController.js    # Controladores de autenticación
├── middleware/
│   └── auth.js             # Middleware de autenticación JWT
├── routes/
│   └── authRoutes.js       # Rutas de autenticación
├── validators/
│   └── authValidator.js    # Validaciones de entrada
├── components/
│   └── navbar.html         # Componente navbar unificado
├── js/
│   ├── auth.js             # Funciones de autenticación
│   └── navbar.js           # Lógica del navbar
├── server.js               # Servidor principal
├── package.json            # Dependencias y scripts
└── config.env.example      # Variables de entorno de ejemplo
```

---

## 🚀 Scripts Disponibles

- `npm start` - Iniciar servidor en modo producción
- `npm run dev` - Iniciar servidor en modo desarrollo con nodemon
- `npm test` - Ejecutar pruebas (pendiente de implementar)

---

## 🎨 Sistema de Navbar Unificado

### Descripción
Este sistema unifica todos los navbars del proyecto en un componente reutilizable, eliminando la duplicación de código y facilitando el mantenimiento.

### Archivos principales:
- `components/navbar.html` - Componente HTML del navbar
- `js/navbar.js` - Lógica JavaScript para el navbar
- `js/auth.js` - Funciones de autenticación

### Cómo usar en cualquier página HTML:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- ... otros meta tags ... -->
    <script src="/js/auth.js"></script>
    <script src="/js/navbar.js"></script>
</head>
<body>
    <!-- Contenedor del navbar -->
    <div id="navbar-container"></div>
    
    <!-- Resto del contenido de la página -->
</body>
</html>
```

### Funcionalidades del Navbar

#### ✅ Autenticación automática
- Detecta si el usuario está logueado
- Muestra botones de "Iniciar Sesión" / "Registrarse" si no está logueado
- Muestra dropdown del usuario si está logueado

#### ✅ Menús específicos por rol
- **Cliente**: Dashboard, Mi Perfil, Mis Pedidos, Mis Reservaciones
- **Empleado**: Dashboard, Mi Perfil, Gestionar Pedidos, Inventario
- **Administrador**: Dashboard, Mi Perfil, Gestionar Usuarios, Reportes, Configuración

#### ✅ Responsive design
- Menú hamburguesa en dispositivos móviles
- Dropdown adaptado para móvil
- Navegación optimizada para todos los tamaños de pantalla

#### ✅ Interactividad
- Dropdown del usuario con toggle
- Menú móvil con toggle
- Cierre automático al hacer clic fuera

### Páginas actualizadas
Las siguientes páginas ya usan el navbar unificado:
- ✅ `index.html`
- ✅ `login.html`
- ✅ `registro.html`
- ✅ `menu.html`
- ✅ `reservaciones.html`
- ✅ `about.html`
- ✅ `contacto.html`
- ✅ `pedidos.html`
- ✅ `cliente/dashboard.html`
- ✅ `empleado/dashboard.html`
- ✅ `admin/dashboard.html`

---

## 🔧 Configuración de Desarrollo

### Variables de entorno recomendadas para desarrollo:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=SunsetsDB
JWT_SECRET=desarrollo_secret_key
CORS_ORIGIN=*
```

### Para producción, asegúrate de:
- Cambiar `JWT_SECRET` por una clave segura
- Configurar `CORS_ORIGIN` con el dominio correcto
- Establecer `NODE_ENV=production`
- Configurar credenciales de base de datos seguras

---

## 🐛 Solución de Problemas

### Error de conexión a MySQL
- Verifica que MySQL esté ejecutándose
- Confirma las credenciales en el archivo `config.env`
- Asegúrate de que la base de datos `SunsetsDB` exista

### Error de JWT
- Verifica que `JWT_SECRET` esté configurado
- Confirma que el token no haya expirado
- Revisa que el header `Authorization` esté presente

### Error de CORS
- Configura `CORS_ORIGIN` correctamente
- Para desarrollo, puedes usar `*` (no recomendado para producción)

### El navbar no se carga:
1. Verificar que `js/navbar.js` esté incluido en la página
2. Verificar que `components/navbar.html` exista
3. Revisar la consola del navegador para errores

### Los menús específicos por rol no aparecen:
1. Verificar que `js/auth.js` esté incluido
2. Verificar que el usuario tenga datos válidos en localStorage
3. Revisar la función `getCurrentUser()` en `js/auth.js`

### El dropdown no funciona:
1. Verificar que Font Awesome esté cargado
2. Revisar la consola para errores JavaScript
3. Verificar que las funciones estén definidas globalmente

---

## 📝 Notas Importantes

- El sistema verifica automáticamente las tablas de la base de datos al iniciar
- Los usuarios se registran por defecto como "Cliente"
- El tipo de usuario "Empleado" y "Administrador" debe ser asignado manualmente en la base de datos
- Los tokens JWT se almacenan en localStorage en el frontend
- El sistema verifica automáticamente la validez de los tokens en cada request autenticado
- El navbar se carga automáticamente al cargar cualquier página
- No es necesario llamar manualmente a `loadNavbar()`
- Todas las funciones están disponibles globalmente
- El sistema es compatible con el sistema de autenticación existente

---

## 🔄 Actualizaciones futuras

### Para mantener el navbar actualizado:
1. **Cambios de diseño**: Editar solo `components/navbar.html`
2. **Nueva funcionalidad**: Editar `js/navbar.js`
3. **Nuevos roles**: Actualizar `configureRoleSpecificMenus()` en `js/navbar.js`

### Para agregar nuevos enlaces de navegación:
1. Editar `components/navbar.html` en la sección desktop y móvil
2. Agregar el enlace en ambas versiones del menú

### Para agregar nuevos elementos al menú de usuario:
Editar `js/navbar.js` en la función `configureRoleSpecificMenus()` para cada rol.

---

## 📞 Soporte

Para soporte técnico o reportar bugs, contacta al equipo de desarrollo de Sunset's Tarbaca.

---

**¡Listo! Tu sistema está funcionando** 🎉
