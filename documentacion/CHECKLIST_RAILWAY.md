# ✅ Checklist de Deployment en Railway

Usa este checklist para asegurarte de que todo esté configurado correctamente antes de entregar las credenciales.

## 📦 Pre-Deployment

- [ ] Código subido a GitHub
- [ ] `.gitignore` incluye `config.env` y `node_modules`
- [ ] `package.json` tiene el script `start` configurado
- [ ] `server.js` usa `process.env.PORT` (ya configurado ✅)
- [ ] Base de datos SQL lista para importar (`SunsetsDB.sql`)

## 🚂 Configuración en Railway

### Servicio Web
- [ ] Proyecto creado en Railway
- [ ] Repositorio de GitHub conectado
- [ ] Deploy inicial completado sin errores

### Base de Datos MySQL
- [ ] Servicio MySQL agregado
- [ ] Base de datos creada
- [ ] Variables de MySQL anotadas

### Variables de Entorno
- [ ] `DB_HOST` configurada (referencia a MySQL)
- [ ] `DB_USER` configurada (referencia a MySQL)
- [ ] `DB_PASSWORD` configurada (referencia a MySQL)
- [ ] `DB_NAME` configurada (referencia a MySQL)
- [ ] `PORT` configurada (usar `${{PORT}}`)
- [ ] `NODE_ENV` = `production`
- [ ] `JWT_SECRET` configurada
- [ ] `CORS_ORIGIN` configurada con URL de Railway
- [ ] Variables de correo configuradas (SMTP o Resend)

## 🗄️ Base de Datos

- [ ] Base de datos importada (`SunsetsDB.sql`)
- [ ] Tablas principales verificadas (usuario, cliente, producto, etc.)
- [ ] Datos de prueba insertados (usuarios admin, cliente, empleado)

## 🧪 Pruebas

### Funcionalidad Básica
- [ ] Servidor responde en `/api/health`
- [ ] Frontend carga correctamente
- [ ] Login funciona
- [ ] Registro funciona

### Funcionalidad por Rol

#### Administrador
- [ ] Puede iniciar sesión
- [ ] Puede ver dashboard
- [ ] Puede gestionar productos
- [ ] Puede ver reportes

#### Cliente
- [ ] Puede iniciar sesión
- [ ] Puede ver menú
- [ ] Puede hacer pedidos
- [ ] Puede ver historial

#### Empleado
- [ ] Puede iniciar sesión
- [ ] Puede ver pedidos asignados
- [ ] Puede gestionar inventario

## 📝 Documentación

- [ ] Credenciales documentadas en `CREDENCIALES_PLANTILLA.md`
- [ ] URL del sistema anotada
- [ ] Usuarios de prueba creados y documentados
- [ ] Contraseñas seguras pero fáciles de recordar

## 🔒 Seguridad

- [ ] `JWT_SECRET` es único y seguro
- [ ] Variables sensibles NO están en el código
- [ ] `config.env` NO está en GitHub
- [ ] HTTPS funcionando (automático en Railway)

## 📊 Monitoreo

- [ ] Logs accesibles en Railway
- [ ] Métricas visibles (CPU, memoria)
- [ ] No hay errores críticos en los logs

## 🎯 Entrega Final

- [ ] URL del sistema funcionando
- [ ] Credenciales preparadas para la profesora
- [ ] Documento de credenciales completado
- [ ] Sistema probado completamente
- [ ] Listo para entregar ✅

---

## 🚨 Problemas Comunes

### El servidor no inicia
- Verifica los logs en Railway
- Asegúrate de que las variables de entorno estén correctas
- Verifica que la base de datos esté conectada

### Error de conexión a base de datos
- Verifica que el servicio MySQL esté corriendo
- Revisa las variables `DB_*`
- Asegúrate de usar la sintaxis de referencia: `${{MySQL.MYSQLHOST}}`

### El frontend no carga
- Verifica que `express.static('.')` esté configurado (ya está ✅)
- Revisa la URL del sistema
- Verifica los logs del servidor

---

**Fecha de verificación:** _______________
**Verificado por:** _______________

