# 🚀 Inicio Rápido - Railway Deployment

## ⚡ 5 Pasos para Desplegar

### 1️⃣ Crear Proyecto en Railway
- Ve a [railway.app](https://railway.app)
- Login con GitHub
- "New Project" → "Deploy from GitHub repo"
- Selecciona tu repositorio

### 2️⃣ Agregar MySQL
- En tu proyecto: "+ New" → "Database" → "Add MySQL"
- Anota las credenciales (MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE)

### 3️⃣ Configurar Variables de Entorno

En el servicio web, agrega estas variables:

**Base de Datos (usa referencias):**
```
DB_HOST = ${{MySQL.MYSQLHOST}}
DB_USER = ${{MySQL.MYSQLUSER}}
DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}
DB_NAME = ${{MySQL.MYSQLDATABASE}}
```

**Servidor:**
```
PORT = ${{PORT}}
NODE_ENV = production
```

**JWT:**
```
JWT_SECRET = sunsets_tarbaca_secret_key_2025_production
```

**CORS (reemplaza con tu URL de Railway):**
```
CORS_ORIGIN = https://tu-proyecto.up.railway.app
```

**Correo:**
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

### 4️⃣ Importar Base de Datos

**Opción A - Railway CLI:**
```bash
npm install -g @railway/cli
railway login
railway link
railway connect mysql
mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < SunsetsDB.sql
```

**Opción B - Cliente MySQL:**
- Usa la URL de conexión de Railway
- Conéctate con MySQL Workbench o DBeaver
- Importa `SunsetsDB.sql`

### 5️⃣ Verificar Deployment

1. Railway hará deploy automáticamente
2. Ve a "Settings" → "Generate Domain"
3. Visita: `https://tu-proyecto.up.railway.app/api/health`
4. Deberías ver: `{"success": true, "message": "Servidor funcionando correctamente"}`

## ✅ Listo!

Tu sistema está desplegado. Para más detalles, consulta **[RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)**

---

## 📋 Checklist Rápido

- [ ] Proyecto creado en Railway
- [ ] MySQL agregado
- [ ] Variables de entorno configuradas
- [ ] Base de datos importada
- [ ] Deploy completado
- [ ] Health check funciona
- [ ] Credenciales documentadas

---

## 🆘 ¿Problemas?

Consulta la sección "Solución de Problemas" en **[RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)**

