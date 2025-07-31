# Sunset's Tabarca - Sistema de Restaurante

## Descripción

Sunset's Tabarca es un prototipo completo de aplicación web para un restaurante-pizzería, desarrollado exclusivamente con HTML y Tailwind CSS. El sistema incluye funcionalidades para clientes, empleados y administradores, con navegación entre módulos y interfaces responsivas.

## Características Principales

### 🍕 Módulos Implementados

#### **Módulo Roles, Accesos y Seguridad**
- ✅ Registro de usuarios (Cliente)
- ✅ Inicio de sesión multi-rol (Cliente, Empleado, Administrador)
- ✅ Acceso como invitado
- ✅ Formularios de autenticación responsivos

#### **Módulo Página Principal**
- ✅ Menú del día y productos destacados
- ✅ Exploración por categorías (pizzas, platos, bebidas)
- ✅ Filtros por tipo de dieta (vegetariano, vegano, sin gluten)
- ✅ Opiniones y calificaciones de usuarios
- ✅ Información del restaurante y contacto
- ✅ ChatBot integrado
- ✅ Enlaces a redes sociales

#### **Módulo Express, Pedidos y Pagos**
- ✅ Selección y personalización de productos
- ✅ Carrito de compras funcional
- ✅ Cálculo de totales en tiempo real
- ✅ Múltiples métodos de pago (efectivo, tarjeta, SINPE móvil)
- ✅ Proceso de pedido completo
- ✅ Facturación digital

#### **Módulo Reservaciones**
- ✅ Calendario interactivo
- ✅ Selección de horarios disponibles
- ✅ Formulario de reservación completo
- ✅ Confirmación automática
- ✅ Gestión de reservaciones

#### **Módulo Cliente**
- ✅ Dashboard personal con estadísticas
- ✅ Historial de pedidos
- ✅ Programa de lealtad con puntos
- ✅ Gestión de reservaciones
- ✅ Perfil editable
- ✅ Múltiples direcciones de entrega

#### **Módulo Administrador**
- ✅ Panel de administración completo
- ✅ Gestión de personal
- ✅ Monitoreo de pedidos en tiempo real
- ✅ Alertas de inventario
- ✅ Reportes de ventas
- ✅ Moderación de opiniones
- ✅ Control de auditoría

#### **Módulo Empleado**
- ✅ Dashboard de empleado
- ✅ Gestión de pedidos asignados
- ✅ Verificación de inventario
- ✅ Horarios y rendimiento
- ✅ Chat del equipo
- ✅ Notificaciones en tiempo real

#### **Módulo Inventario**
- ✅ Alertas de stock bajo
- ✅ Verificación de ingredientes
- ✅ Estado de herramientas
- ✅ Reportes de inventario

#### **Módulo Programa de Lealtad**
- ✅ Acumulación de puntos
- ✅ Canje de recompensas
- ✅ Niveles de fidelidad
- ✅ Notificaciones de promociones

#### **Módulo Opiniones y Recomendaciones**
- ✅ Sistema de calificaciones
- ✅ Comentarios de usuarios
- ✅ Moderación de contenido
- ✅ Filtros por calificación

## 🚀 Tecnologías Utilizadas

- **HTML5** - Estructura semántica
- **Tailwind CSS** - Framework de estilos
- **JavaScript** - Interactividad y funcionalidad
- **Font Awesome** - Iconografía
- **Responsive Design** - Compatible con móviles y desktop

## 📁 Estructura del Proyecto

```
Proyecto-Final-Grupo-7/
├── index.html                 # Página principal
├── login.html                 # Inicio de sesión
├── registro.html              # Registro de usuarios
├── menu.html                  # Catálogo de productos
├── reservaciones.html         # Sistema de reservaciones
├── about.html                 # Información del restaurante
├── contacto.html              # Página de contacto
├── pedidos.html               # Proceso de pedidos
├── cliente/
│   └── dashboard.html         # Dashboard del cliente
├── admin/
│   └── dashboard.html         # Dashboard del administrador
├── empleado/
│   └── dashboard.html         # Dashboard del empleado
└── README.md                  # Documentación
```

## 🎨 Características de Diseño

### Paleta de Colores
- **Primario**: Naranja (#EA580C) - Representa la calidez mediterránea
- **Secundario**: Rojo (#DC2626) - Complementa la temática gastronómica
- **Neutros**: Grises para texto y fondos

### Componentes Reutilizables
- Header con navegación responsiva
- Footer con información de contacto
- Cards de productos con hover effects
- Formularios con validación visual
- Botones con estados interactivos

### Responsive Design
- **Mobile First** - Optimizado para dispositivos móviles
- **Breakpoints**: sm, md, lg, xl
- **Navegación**: Menú hamburguesa en móviles
- **Grid System**: Adaptativo según el tamaño de pantalla

## 🔧 Funcionalidades Implementadas

### Autenticación y Roles
- Sistema de login multi-rol
- Registro de clientes con validación
- Acceso como invitado
- Redirección automática según rol

### Gestión de Productos
- Catálogo con categorías
- Filtros por dieta y preferencias
- Carrito de compras persistente
- Personalización de productos

### Sistema de Pedidos
- Proceso de checkout completo
- Múltiples métodos de pago
- Cálculo de impuestos y envío
- Integración con programa de lealtad

### Reservaciones
- Calendario interactivo
- Selección de horarios
- Formulario de reservación
- Confirmación automática

### Dashboards Específicos
- **Cliente**: Historial, puntos, reservaciones
- **Administrador**: Ventas, personal, inventario
- **Empleado**: Pedidos asignados, rendimiento

## 📱 Compatibilidad

- ✅ Chrome, Firefox, Safari, Edge
- ✅ iOS Safari, Chrome Mobile
- ✅ Android Chrome, Samsung Internet
- ✅ Tablets y dispositivos táctiles

## 🚀 Cómo Usar

1. **Clonar el repositorio**
   ```bash
   git clone [url-del-repositorio]
   cd Proyecto-Final-Grupo-7
   ```

2. **Abrir en el navegador**
   - Abrir `index.html` en cualquier navegador moderno
   - No requiere servidor web ni instalaciones adicionales

3. **Navegar por los módulos**
   - Página principal: `index.html`
   - Menú: `menu.html`
   - Reservaciones: `reservaciones.html`
   - Login: `login.html`
   - Registro: `registro.html`

## 🎯 Casos de Uso

### Cliente Invitado
1. Visitar la página principal
2. Explorar el menú
3. Hacer reservación
4. Contactar al restaurante

### Cliente Registrado
1. Iniciar sesión
2. Acceder al dashboard personal
3. Ver historial de pedidos
4. Gestionar reservaciones
5. Canjear puntos de lealtad

### Empleado
1. Iniciar sesión como empleado
2. Ver pedidos asignados
3. Actualizar estado de pedidos
4. Verificar inventario
5. Comunicarse con el equipo

### Administrador
1. Iniciar sesión como administrador
2. Monitorear pedidos en tiempo real
3. Gestionar personal
4. Revisar alertas de inventario
5. Generar reportes

## 🔮 Próximas Mejoras

- [ ] Integración con base de datos
- [ ] Sistema de notificaciones push
- [ ] Pago en línea real
- [ ] Geolocalización para entregas
- [ ] App móvil nativa
- [ ] Integración con redes sociales
- [ ] Sistema de recomendaciones IA

## 👥 Equipo de Desarrollo

**Grupo 7** - Proyecto Final
- Desarrollo frontend con HTML y Tailwind CSS
- Prototipo funcional sin backend
- Interfaz responsiva y accesible

## 📄 Licencia

Este proyecto es un prototipo educativo desarrollado para demostrar capacidades de desarrollo web frontend.

---

**Sunset's Tabarca** - Sabor mediterráneo en cada bocado 🍕✨
