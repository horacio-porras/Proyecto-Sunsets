# Configuración de Correos - Sunset's Tarbaca

## ¿Por qué Resend?

El sistema ahora soporta **Resend** como proveedor principal de correos porque:

- ✅ **Entregabilidad superior**: Los correos llegan a Gmail, Outlook, Yahoo, etc. sin problemas
- ✅ **Sin spam**: Resend tiene excelente reputación con todos los proveedores
- ✅ **Gratis hasta 3,000 correos/mes**: Suficiente para empezar
- ✅ **Fácil de configurar**: Solo necesitas una API key
- ✅ **Monitoreo**: Dashboard para ver todos los correos enviados y su estado

## Configuración Paso a Paso

### Opción 1: Resend (Recomendado para Producción)

1. **Crear cuenta en Resend** (gratis)
   - Ve a: https://resend.com/signup
   - Regístrate con tu correo

2. **Obtener API Key**
   - Una vez dentro, ve a "API Keys" en el menú lateral
   - Click en "Create API Key"
   - Dale un nombre (ej: "Sunsets Production")
   - Selecciona permisos: "Sending access"
   - Click "Create"
   - **Copia la API key** (empieza con `re_...`)

3. **Configurar en el proyecto**
   - Abre el archivo `config.env`
   - Cambia la línea:
     ```
     MAIL_PROVIDER=resend
     ```
   - Pega tu API key en:
     ```
     RESEND_API_KEY=re_tu_api_key_aqui
     ```
   - Actualiza el email de envío:
     ```
     MAIL_FROM="Sunset's Tarbaca <noreply@tudominio.com>"
     ```
     *(Nota: Resend funciona con cualquier email, pero para mejor entregabilidad verifica tu dominio)*

4. **Verificar dominio (Opcional pero recomendado)**
   - En Resend, ve a "Domains"
   - Click "Add Domain"
   - Ingresa tu dominio (ej: `sunsetstarbaca.com`)
   - Sigue las instrucciones para agregar registros DNS
   - Una vez verificado, puedes usar `reservaciones@sunsetstarbaca.com`

5. **Reiniciar el servidor**
   ```powershell
   # Detener el servidor (Ctrl+C)
   # Iniciar nuevamente
   node server.js
   ```

6. **Probar**
   - Haz una reservación de prueba
   - El correo llegará instantáneamente a cualquier proveedor
   - Verifica en el dashboard de Resend que se envió correctamente

### Opción 2: Gmail SMTP (Actual - Limitado)

Si prefieres seguir usando Gmail:

1. Cambia en `config.env`:
   ```
   MAIL_PROVIDER=smtp
   ```

2. Mantén las credenciales actuales de Gmail

**Limitaciones de Gmail:**
- Los correos pueden ir a Spam en proveedores externos
- Límite de 500 correos por día
- Puede ser bloqueado por actividad sospechosa
- Solo funciona bien para correos @gmail.com

## ¿Qué hacer si no puedes usar Resend ahora?

Si no puedes configurar Resend inmediatamente, puedes:

1. **Usar Gmail SMTP temporalmente**:
   - Mantén `MAIL_PROVIDER=smtp` en config.env
   - Los correos funcionarán pero pueden ir a spam

2. **Avisar a los clientes**:
   - Que revisen carpeta de Spam/Promociones
   - Que agreguen sunsettarb@gmail.com a contactos

## Monitoreo

### Con Resend
- Dashboard: https://resend.com/emails
- Ver todos los correos enviados
- Estado: delivered, bounced, opened, clicked
- Logs completos

### Con Gmail SMTP
- Solo logs en la terminal del servidor
- Sin tracking de entrega

## Costos

| Proveedor | Plan Gratis | Costo después |
|-----------|-------------|---------------|
| Resend    | 3,000/mes   | $20/mes por 50,000 |
| Gmail     | 500/día     | N/A (no escalable) |

## Soporte

Si tienes problemas:
1. Revisa los logs del servidor (terminal donde corre `node server.js`)
2. Verifica que `MAIL_PROVIDER` y las credenciales estén correctas
3. Prueba con un correo tuyo primero

## Resumen Rápido

**Para producción (funciona con cualquier correo):**
```env
MAIL_PROVIDER=resend
RESEND_API_KEY=re_tu_api_key_aqui
MAIL_FROM="Sunset's Tarbaca <noreply@tudominio.com>"
```

**Para desarrollo/pruebas (solo Gmail confiable):**
```env
MAIL_PROVIDER=smtp
MAIL_FROM="Sunset's Tarbaca <sunsettarb@gmail.com>"
```
