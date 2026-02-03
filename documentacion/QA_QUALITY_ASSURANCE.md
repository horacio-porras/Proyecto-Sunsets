# Quality Assurance (QA) - Sunset's Tarbaca

## Necesidades de Recursos y Medio Ambiente

### Herramientas de Prueba

#### Herramienta de Seguimiento de Requisitos
- **Jira** o **Azure DevOps** - Para gestionar historias de usuario, casos de prueba y seguimiento de requisitos funcionales y no funcionales
- **Confluence** - Para documentación de requisitos y casos de uso
- **Trello** - Alternativa ligera para seguimiento de requisitos en proyectos pequeños

#### Herramienta de Seguimiento de Errores
- **Jira** - Sistema integrado de gestión de incidencias y seguimiento de bugs
- **GitHub Issues** - Para proyectos que utilizan GitHub como repositorio
- **Bugzilla** - Herramienta open-source para seguimiento de defectos
- **MantisBT** - Sistema de seguimiento de errores web-based

#### Herramientas de Automatización
- **Jest** - Framework de pruebas unitarias para Node.js y JavaScript
- **Supertest** - Para pruebas de integración de APIs REST
- **Mocha + Chai** - Framework alternativo para pruebas de backend
- **Selenium WebDriver** - Para pruebas end-to-end (E2E) del frontend
- **Cypress** - Framework moderno para pruebas E2E de aplicaciones web
- **Postman** - Para pruebas manuales y automatizadas de APIs REST
- **Newman** - Ejecutor de colecciones de Postman para CI/CD
- **Artillery** - Para pruebas de carga y rendimiento de APIs

#### Requisitos para Probar el Proyecto
- **Node.js** versión 14.0.0 o superior
- **npm** versión 6.0.0 o superior
- **MySQL** versión 5.7 o superior (o MySQL 8.0)
- **Git** - Para control de versiones y despliegue
- **Postman** o **Insomnia** - Cliente HTTP para pruebas de API
- **Navegadores web** - Chrome, Firefox, Edge, Safari (últimas versiones)
- **Herramientas de desarrollo del navegador** - DevTools para debugging
- **Base de datos de prueba** - Instancia separada de MySQL para pruebas
- **Variables de entorno de prueba** - Archivo `config.env` configurado para ambiente de pruebas

---

## Entorno de Pruebas

### Requisitos Mínimos de Hardware

#### Servidor de Desarrollo/Pruebas
- **Procesador**: Intel Core i5 o equivalente (4 núcleos, 2.0 GHz o superior)
- **Memoria RAM**: 8 GB mínimo (16 GB recomendado)
- **Almacenamiento**: 20 GB de espacio libre en disco duro
- **Conexión a Internet**: Banda ancha estable para descargar dependencias y acceder a servicios externos

#### Estación de Trabajo del Tester
- **Procesador**: Intel Core i3 o equivalente (2 núcleos, 1.8 GHz o superior)
- **Memoria RAM**: 4 GB mínimo (8 GB recomendado)
- **Almacenamiento**: 10 GB de espacio libre
- **Pantalla**: Resolución mínima 1366x768 (1920x1080 recomendado)
- **Conexión a Internet**: Banda ancha para pruebas de funcionalidades en línea

#### Dispositivos Móviles (Pruebas Responsive)
- **Smartphone**: Android 8.0+ o iOS 12.0+
- **Tablet**: Android 8.0+ o iPadOS 12.0+

### Software Requerido

#### Sistema Operativo
- **Windows 8.1** y versiones superiores (Windows 10/11 recomendado)
- **macOS** 10.14 (Mojave) o superior
- **Linux** Ubuntu 18.04 LTS o superior / Debian 10 o superior

#### Software de Desarrollo y Pruebas
- **Node.js** versión 14.0.0 o superior (LTS recomendado)
- **npm** versión 6.0.0 o superior (incluido con Node.js)
- **MySQL Server** versión 5.7 o superior (MySQL 8.0 recomendado)
- **MySQL Workbench** o **phpMyAdmin** - Para gestión y visualización de base de datos
- **Git** versión 2.20 o superior - Para control de versiones
- **Visual Studio Code** o editor de código preferido - Para desarrollo y debugging

#### Navegadores Web (Últimas Versiones)
- **Google Chrome** - Navegador principal para pruebas
- **Mozilla Firefox** - Navegador secundario para compatibilidad
- **Microsoft Edge** - Para pruebas de compatibilidad
- **Safari** (solo macOS) - Para pruebas en macOS

#### Herramientas Adicionales
- **Postman** o **Insomnia** - Cliente REST para pruebas de API
- **DBeaver** o **MySQL Workbench** - Cliente de base de datos
- **Fiddler** o **Charles Proxy** - Para análisis de tráfico HTTP/HTTPS (opcional)
- **Wireshark** - Para análisis de red avanzado (opcional)

#### Software de Oficina (si aplica)
- **Microsoft Office 2013** o versiones superiores - Para documentación y reportes
- **LibreOffice** - Alternativa open-source
- **Google Workspace** - Para colaboración en documentación

#### Software de Comunicación
- **Cliente de correo electrónico** - Para pruebas de funcionalidad de envío de emails
- **Navegador web con soporte SMTP** - Para verificar correos de prueba

---

## Términos/Acrónimos

| TÉRMINO/ACRÓNIMO | DEFINICIÓN |
|------------------|------------|
| **API** | Application Programming Interface (Interfaz de Programa de Aplicación) - Conjunto de endpoints REST que permiten la comunicación entre el frontend y backend |
| **AUT** | Application Under Test (Aplicación bajo Prueba) - Se refiere al sistema Sunset's Tarbaca que está siendo probado |
| **JWT** | JSON Web Token - Token de autenticación utilizado para mantener sesiones de usuario de forma segura |
| **REST** | Representational State Transfer - Arquitectura de API utilizada para la comunicación cliente-servidor |
| **CORS** | Cross-Origin Resource Sharing - Mecanismo que permite solicitudes HTTP desde diferentes orígenes |
| **CRUD** | Create, Read, Update, Delete - Operaciones básicas de base de datos |
| **E2E** | End-to-End - Pruebas que validan el flujo completo de la aplicación desde el inicio hasta el final |
| **QA** | Quality Assurance (Aseguramiento de Calidad) - Proceso sistemático para garantizar la calidad del software |
| **CI/CD** | Continuous Integration/Continuous Deployment - Integración y despliegue continuo |
| **SMTP** | Simple Mail Transfer Protocol - Protocolo utilizado para el envío de correos electrónicos |
| **SQL** | Structured Query Language - Lenguaje de consulta estructurado para bases de datos |
| **HTTP** | Hypertext Transfer Protocol - Protocolo de comunicación web |
| **HTTPS** | Hypertext Transfer Protocol Secure - Versión segura de HTTP con cifrado SSL/TLS |
| **JSON** | JavaScript Object Notation - Formato de intercambio de datos utilizado en las APIs |
| **MVC** | Model-View-Controller - Patrón de arquitectura de software utilizado en el proyecto |
| **ORM** | Object-Relational Mapping - Mapeo objeto-relacional (aunque este proyecto usa consultas SQL directas) |
| **BCrypt** | Algoritmo de hash utilizado para encriptar contraseñas de usuarios |
| **Rate Limiting** | Limitación de tasa - Mecanismo de seguridad que limita el número de solicitudes por IP |
| **Helmet** | Middleware de seguridad para Express.js que ayuda a proteger la aplicación de vulnerabilidades comunes |
| **Nodemon** | Herramienta de desarrollo que reinicia automáticamente el servidor Node.js cuando detecta cambios |
| **Railway** | Plataforma de despliegue en la nube utilizada para hosting de la aplicación |
| **Middleware** | Software intermedio que procesa solicitudes HTTP antes de que lleguen a las rutas finales |
| **Pool de Conexiones** | Grupo de conexiones a base de datos reutilizables para mejorar el rendimiento |
| **Cron Job** | Tarea programada que se ejecuta automáticamente en intervalos específicos (ej: recordatorios diarios) |
| **QR Code** | Quick Response Code - Código de barras bidimensional utilizado para facturas y reservaciones |
| **PDF** | Portable Document Format - Formato de documento utilizado para generar facturas |
| **Excel** | Formato de hoja de cálculo utilizado para exportación de reportes |
| **Frontend** | Parte de la aplicación que interactúa directamente con el usuario (HTML, CSS, JavaScript) |
| **Backend** | Parte de la aplicación que procesa la lógica de negocio y se comunica con la base de datos (Node.js, Express) |
| **Dashboard** | Panel de control que muestra información resumida y estadísticas del sistema |
| **Auditoría** | Registro de todas las acciones realizadas en el sistema para trazabilidad y seguridad |
| **Rol** | Nivel de acceso y permisos asignado a un usuario (Cliente, Empleado, Administrador) |
| **Token** | Credencial de autenticación que identifica a un usuario autenticado |
| **Session** | Sesión de usuario activa en el sistema |
| **Cookie** | Pequeño archivo almacenado en el navegador que contiene información de sesión |
| **LocalStorage** | Almacenamiento local del navegador utilizado para guardar datos del cliente |
| **Responsive Design** | Diseño web que se adapta a diferentes tamaños de pantalla y dispositivos |
| **Tailwind CSS** | Framework de CSS utility-first utilizado para el diseño del frontend |
| **SweetAlert2** | Biblioteca JavaScript para mostrar alertas y modales elegantes |
| **Font Awesome** | Biblioteca de iconos utilizada en la interfaz de usuario |
| **DevOps** | Conjunto de prácticas que combina desarrollo de software y operaciones de TI |
| **Unit Test** | Prueba unitaria - Prueba de una función o componente individual |
| **Integration Test** | Prueba de integración - Prueba que valida la interacción entre diferentes componentes |
| **Regression Test** | Prueba de regresión - Prueba que verifica que cambios nuevos no rompan funcionalidades existentes |
| **Performance Test** | Prueba de rendimiento - Prueba que mide el tiempo de respuesta y capacidad del sistema |
| **Security Test** | Prueba de seguridad - Prueba que identifica vulnerabilidades y problemas de seguridad |
| **Load Test** | Prueba de carga - Prueba que evalúa el comportamiento del sistema bajo carga normal |
| **Stress Test** | Prueba de estrés - Prueba que evalúa el comportamiento del sistema bajo carga extrema |
| **UAT** | User Acceptance Testing - Pruebas de aceptación de usuario |
| **Bug** | Error o defecto en el software |
| **Defect** | Cualquier desviación del comportamiento esperado del software |
| **Test Case** | Caso de prueba - Conjunto de condiciones y pasos para validar una funcionalidad |
| **Test Plan** | Plan de pruebas - Documento que describe el enfoque, alcance y recursos para las pruebas |
| **Test Script** | Script de prueba - Secuencia automatizada de pasos de prueba |
| **Test Environment** | Entorno de pruebas - Configuración de hardware y software donde se ejecutan las pruebas |
| **Production** | Producción - Entorno donde la aplicación está disponible para usuarios finales |
| **Staging** | Entorno de pre-producción que replica el entorno de producción |
| **Development** | Desarrollo - Entorno donde los desarrolladores trabajan en nuevas funcionalidades |

---

## Notas Adicionales

### Ambientes de Prueba
El proyecto requiere configurar al menos tres ambientes:
1. **Desarrollo (Development)** - Para desarrollo activo y pruebas iniciales
2. **Staging** - Para pruebas de integración y validación antes de producción
3. **Producción (Production)** - Entorno final donde los usuarios utilizan la aplicación

### Configuración de Base de Datos para Pruebas
- Se recomienda tener una base de datos separada para pruebas (ej: `SunsetsDB_Test`)
- Los datos de prueba deben ser restaurados después de cada ciclo de pruebas
- No utilizar datos de producción en pruebas

### Variables de Entorno
El archivo `config.env` debe configurarse específicamente para cada ambiente de pruebas con:
- Credenciales de base de datos de prueba
- JWT_SECRET diferente para cada ambiente
- Configuración de correo para pruebas
- CORS_ORIGIN apropiado para el ambiente

---

**Documento generado para:** Proyecto Sunset's Tarbaca  
**Fecha:** 2025  
**Versión del Sistema:** 1.0.0
