// Route Protection System for Sunset's Tarbaca
// Protects routes that require authentication

// Routes that require authentication
const PROTECTED_ROUTES = {
    // Client routes
    '/cliente/dashboard.html': 'Cliente',
    '/cliente/perfil.html': 'Cliente',
    
    // Employee routes
    '/empleado/dashboard.html': 'Empleado',
    '/empleado/perfil.html': 'Empleado',
    
    // Admin routes
    '/admin/dashboard.html': 'Administrador',
    '/admin/perfil.html': 'Administrador',
    
    // Order page
    '/pedidos.html': 'Cliente'
};

// Routes that are public (no authentication required)
const PUBLIC_ROUTES = [
    '/',
    '/index.html',
    '/menu.html',
    '/reservaciones.html',
    '/about.html',
    '/contacto.html'
];

// Function to get current user from localStorage
function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

// Function to check if user has valid session
function hasValidSession() {
    const user = getCurrentUser();
    const authToken = localStorage.getItem('authToken');
    return user && authToken;
}

// Function to check if user has required role
function hasRequiredRole(requiredRole) {
    const user = getCurrentUser();
    return user && user.tipoUsuario === requiredRole;
}

// Function to redirect to home page
function redirectToHome() {
    window.location.href = '/';
}

// Function to check route protection
function checkRouteProtection() {
    const currentPath = window.location.pathname;
    
    // Check if current route is public
    if (PUBLIC_ROUTES.includes(currentPath)) {
        return; // No protection needed
    }
    
    // Check if current route requires authentication
    const requiredRole = PROTECTED_ROUTES[currentPath];
    if (!requiredRole) {
        return; // Route not in protection list
    }
    
    // Check if user is authenticated
    if (!hasValidSession()) {
        console.log('User not authenticated, redirecting to home');
        redirectToHome();
        return;
    }
    
    // Check if user has required role
    if (!hasRequiredRole(requiredRole)) {
        console.log('User does not have required role, redirecting to home');
        redirectToHome();
        return;
    }
    
    console.log('Route access granted');
}

// Function to initialize route protection
function initializeRouteProtection() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkRouteProtection);
    } else {
        checkRouteProtection();
    }
}

// Export functions for global use
window.RouteProtection = {
    checkRouteProtection,
    initializeRouteProtection,
    getCurrentUser,
    hasValidSession,
    hasRequiredRole,
    redirectToHome
};

// Auto-initialize when script loads
initializeRouteProtection();
