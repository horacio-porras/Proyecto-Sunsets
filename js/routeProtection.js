//Protección de rutas para Sunset's Tarbaca
//Protege las rutas que requieren autenticación

//Rutas que requieren autenticación
const PROTECTED_ROUTES = {
    '/cliente/dashboard.html': 'Cliente',
    '/cliente/perfil.html': 'Cliente',
    '/cliente/pedidos.html': 'Cliente',
    '/cliente/mis-pedidos.html': 'Cliente',
    '/cliente/mis-opiniones.html': 'Cliente',
    '/cliente/mis-reservas.html': 'Cliente',
    '/pedidos.html': 'Cliente', // Solo clientes pueden hacer pedidos
    
    '/empleado/dashboard.html': 'Empleado',
    '/empleado/perfil.html': 'Empleado',
    '/empleado/productos.html': 'Empleado',
    '/empleado/inventario.html': 'Empleado',
    
    '/admin/dashboard.html': 'Administrador',
    '/admin/perfil.html': 'Administrador',
    '/admin/productos.html': 'Administrador',
    '/admin/inventario.html': 'Administrador',
    '/admin/personal.html': 'Administrador',
    '/admin/pedidos.html': 'Administrador',
    '/admin/reservaciones.html': 'Administrador',
    '/admin/auditoria.html': 'Administrador',
    '/admin/reportes.html': 'Administrador',
    '/admin/moderacion-opiniones.html': 'Administrador'
};

//Rutas que son públicas (no requieren autenticación)
const PUBLIC_ROUTES = [
    '/',
    '/index.html',
    '/menu.html',
    '/reservaciones.html',
    '/about.html',
    '/contacto.html'
];

//Función para obtener el usuario actual desde localStorage
function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

//Función para verificar si el usuario tiene una sesión válida
function hasValidSession() {
    const user = getCurrentUser();
    const authToken = localStorage.getItem('authToken');
    return user && authToken;
}

//Función para verificar si el usuario tiene el rol requerido
function hasRequiredRole(requiredRole) {
    const user = getCurrentUser();
    return user && user.tipoUsuario === requiredRole;
}

//Función para redirigir a la página principal
function redirectToHome() {
    window.location.href = '/';
}

//Función para verificar la protección de la ruta
function checkRouteProtection() {
    const currentPath = window.location.pathname;
    
    //Verifica si la ruta actual es pública
    if (PUBLIC_ROUTES.includes(currentPath)) {
        return;
    }
    
    //Bloquear acceso de admin y empleado a pedidos.html
    if (currentPath === '/pedidos.html') {
        const user = getCurrentUser();
        if (user && (user.tipoUsuario === 'Administrador' || user.tipoUsuario === 'Empleado')) {
            console.log('Admin/Empleado cannot access pedidos.html, redirecting to home');
            redirectToHome();
            return;
        }
    }
    
    //Verifica si la ruta actual requiere autenticación
    const requiredRole = PROTECTED_ROUTES[currentPath];
    if (!requiredRole) {
        return;
    }
    
    //Verifica si el usuario tiene una sesión válida
    if (!hasValidSession()) {
        console.log('User not authenticated, redirecting to home');
        redirectToHome();
        return;
    }
    
    //Verifica si el usuario tiene el rol requerido
    if (!hasRequiredRole(requiredRole)) {
        console.log('User does not have required role, redirecting to home');
        redirectToHome();
        return;
    }
    
    console.log('Route access granted');
}

//Función para inicializar la protección de la ruta
function initializeRouteProtection() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkRouteProtection);
    } else {
        checkRouteProtection();
    }
}

//Funciones para uso global
window.RouteProtection = {
    checkRouteProtection,
    initializeRouteProtection,
    getCurrentUser,
    hasValidSession,
    hasRequiredRole,
    redirectToHome
};

//Inicializa cuando se carga el script
initializeRouteProtection();
