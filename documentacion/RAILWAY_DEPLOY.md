# 🚂 Guía de Deployment en Railway

Esta guía te ayudará a desplegar el proyecto **Sunset's Tarbaca** en Railway para pruebas.

## 📋 Requisitos Previos

1. **Cuenta de GitHub** (si no tienes una, créala en [github.com](https://github.com))
2. **Cuenta de Railway** (gratis, con $5 de crédito mensual)
3. **Repositorio en GitHub** con tu código

## 🚀 Paso 1: Preparar el Repositorio

### 1.1 Subir el código a GitHub

Si aún no has subido tu código a GitHub:

```bash
# Inicializar git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Preparación para deployment en Railway"

# Crear repositorio en GitHub y luego:
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

## 🚂 Paso 2: Configurar Railway

### 2.1 Crear cuenta en Railway

1. Ve a [railway.app](https://railway.app)
2. Haz clic en **"Start a New Project"**
3. Selecciona **"Login with GitHub"**
4. Autoriza Railway para acceder a tu GitHub

### 2.2 Crear nuevo proyecto

1. En el dashboard de Railway, haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Elige tu repositorio del proyecto
4. Railway detectará automáticamente que es un proyecto Node.js

## 🗄️ Paso 3: Configurar Base de Datos MySQL

### 3.1 Agregar servicio MySQL

1. En tu proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"Database"** → **"Add MySQL"**
3. Railway creará automáticamente una base de datos MySQL
4. **Anota las credenciales** que Railway te proporciona (las necesitarás después)

### 3.2 Obtener variables de conexión

1. Haz clic en el servicio MySQL que acabas de crear
2. Ve a la pestaña **"Variables"**
3. Verás las siguientes variables (anótalas):
   - `MYSQLHOST` (host)
   - `MYSQLPORT` (puerto)
   - `MYSQLDATABASE` (nombre de la base de datos)
   - `MYSQLUSER` (usuario)
   - `MYSQLPASSWORD` (contraseña)
   - `MYSQL_URL` (URL completa de conexión)

## ⚙️ Paso 4: Configurar Variables de Entorno

### 4.1 Variables del servicio web

1. En Railway, haz clic en tu **servicio web** (el que tiene el código)
2. Ve a la pestaña **"Variables"**
3. Haz clic en **"New Variable"** y agrega las siguientes:

#### Variables de Base de Datos
```
DB_HOST = [valor de MYSQLHOST del servicio MySQL]
DB_USER = [valor de MYSQLUSER del servicio MySQL]
DB_PASSWORD = [valor de MYSQLPASSWORD del servicio MySQL]
DB_NAME = [valor de MYSQLDATABASE del servicio MySQL]
```

**💡 Tip:** Puedes hacer referencia a las variables del servicio MySQL usando la sintaxis:
```
DB_HOST = ${{MySQL.MYSQLHOST}}
DB_USER = ${{MySQL.MYSQLUSER}}
DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}
DB_NAME = ${{MySQL.MYSQLDATABASE}}
```

#### Variables del Servidor
```
PORT = ${{PORT}}
NODE_ENV = production
```

#### Variables de JWT
```
JWT_SECRET = sunsets_tarbaca_secret_key_2025_production
```

#### Variables de CORS
```
CORS_ORIGIN = https://tu-proyecto.up.railway.app
```
*(Reemplaza `tu-proyecto` con el nombre real de tu proyecto en Railway)*

#### Variables de Correo (SMTP)
```
MAIL_PROVIDER = smtp
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_SECURE = false
SMTP_USER = sunsettarb@gmail.com
SMTP_PASS = oivlmxzjfgnhsijq
MAIL_FROM = Sunsets Tarbaca <sunsettarb@gmail.com>
REPLY_TO = sunsettarb@gmail.com
```

#### Variables de Resend (Opcional - si prefieres usar Resend)
```
RESEND_API_KEY = [tu-api-key-de-resend]
```

### 4.2 Conectar servicios (Reference Variables)

Para que el servicio web pueda acceder a las variables de MySQL:

1. En las variables del servicio web, usa la sintaxis:
   ```
   DB_HOST = ${{MySQL.MYSQLHOST}}
   DB_USER = ${{MySQL.MYSQLUSER}}
   DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}
   DB_NAME = ${{MySQL.MYSQLDATABASE}}
   ```

2. O haz clic en **"Add Reference"** y selecciona las variables del servicio MySQL

## 📦 Paso 5: Importar Base de Datos

### 5.1 Opción A: Usando Railway CLI (Recomendado)

1. Instala Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Inicia sesión:
   ```bash
   railway login
   ```

3. Conecta a tu proyecto:
   ```bash
   railway link
   ```

4. Conecta a MySQL:
   ```bash
   railway connect mysql
   ```

5. Importa el archivo SQL:
   ```bash
   mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < SunsetsDB.sql
   ```

### 5.2 Opción B: Usando MySQL Workbench o DBeaver

1. Obtén la URL de conexión desde Railway (pestaña "Connect" del servicio MySQL)
2. Conéctate usando un cliente MySQL (Workbench, DBeaver, etc.)
3. Importa el archivo `SunsetsDB.sql`

### 5.3 Opción C: Usando phpMyAdmin (si Railway lo ofrece)

1. Accede al panel de MySQL en Railway
2. Usa la interfaz web para importar el archivo SQL

## 🚀 Paso 6: Deploy

### 6.1 Deploy automático

Railway hará deploy automáticamente cuando:
- Haces push a la rama principal
- Cambias variables de entorno
- Haces clic en "Redeploy"

### 6.2 Verificar el deploy

1. Ve a la pestaña **"Deployments"** en Railway
2. Espera a que el build termine (verás logs en tiempo real)
3. Una vez completado, haz clic en **"Settings"** → **"Generate Domain"**
4. Railway te dará una URL como: `https://tu-proyecto.up.railway.app`

### 6.3 Verificar que funciona

1. Visita: `https://tu-proyecto.up.railway.app/api/health`
2. Deberías ver:
   ```json
   {
     "success": true,
     "message": "Servidor funcionando correctamente",
     "timestamp": "...",
     "environment": "production"
   }
   ```

## 🔧 Paso 7: Configurar Dominio Personalizado (Opcional)

Si quieres un dominio personalizado:

1. En Railway, ve a **Settings** → **Networking**
2. Haz clic en **"Custom Domain"**
3. Sigue las instrucciones para configurar tu dominio

## 📝 Paso 8: Credenciales para la Profesora

Prepara un documento con las siguientes credenciales:

### Información de Acceso

**URL del Sistema:**
```
https://tu-proyecto.up.railway.app
```

**Credenciales de Administrador:**
- Usuario: [el usuario admin que creaste]
- Contraseña: [la contraseña del admin]

**Credenciales de Cliente de Prueba:**
- Usuario: [un usuario cliente de prueba]
- Contraseña: [la contraseña del cliente]

**Credenciales de Empleado de Prueba:**
- Usuario: [un usuario empleado de prueba]
- Contraseña: [la contraseña del empleado]

### Notas Importantes

- El sistema está en modo de producción
- Los datos son de prueba
- El sistema se reinicia automáticamente si hay errores
- Los logs están disponibles en Railway

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"

**Solución:**
1. Verifica que las variables de entorno de la base de datos estén correctas
2. Asegúrate de que el servicio MySQL esté corriendo
3. Verifica que hayas importado la base de datos

### Error: "Port already in use"

**Solución:**
- Railway asigna el puerto automáticamente, asegúrate de usar `process.env.PORT` (ya está configurado)

### Error: "Module not found"

**Solución:**
1. Verifica que `package.json` tenga todas las dependencias
2. Railway debería ejecutar `npm install` automáticamente
3. Revisa los logs de build en Railway

### El sitio no carga

**Solución:**
1. Verifica los logs en Railway (pestaña "Deployments" → "View Logs")
2. Asegúrate de que el servicio esté "Active"
3. Verifica que la URL sea correcta

## 📊 Monitoreo

### Ver logs en tiempo real

1. En Railway, ve a tu servicio
2. Haz clic en **"Deployments"**
3. Selecciona el deployment más reciente
4. Haz clic en **"View Logs"**

### Métricas

Railway muestra automáticamente:
- Uso de CPU
- Uso de memoria
- Tráfico de red
- Tiempo de respuesta

## 💰 Costos

- **Tier Gratuito:** $5 de crédito mensual
- **MySQL:** ~$5/mes (dentro del crédito gratuito)
- **Web Service:** Gratis dentro del crédito

**Nota:** Para pruebas académicas, el tier gratuito debería ser suficiente.

## 🔒 Seguridad

### Variables Sensibles

- **NUNCA** subas `config.env` a GitHub (ya está en `.gitignore`)
- Usa variables de entorno en Railway para datos sensibles
- Cambia `JWT_SECRET` en producción

### HTTPS

Railway proporciona HTTPS automáticamente para todos los dominios.

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway
2. Consulta la [documentación de Railway](https://docs.railway.app)
3. Verifica que todas las variables de entorno estén configuradas

---

## ✅ Checklist Final

Antes de entregar las credenciales a la profesora, verifica:

- [ ] El sistema está desplegado y funcionando
- [ ] La base de datos está importada y tiene datos de prueba
- [ ] Todas las funcionalidades principales funcionan
- [ ] Las credenciales de prueba están documentadas
- [ ] La URL del sistema es accesible
- [ ] Los logs no muestran errores críticos
- [ ] El sistema responde correctamente en `/api/health`

---

**¡Listo!** Tu sistema debería estar funcionando en Railway. 🎉

