// Funciones de autenticación comunes para Sunset's Tarbaca

// Función para cerrar sesión
function logout() {
    // Limpiar datos del localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Redirigir a la página principal
    window.location.href = '/';
}

// Función para verificar si el usuario está autenticado
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
        // No hay sesión activa, redirigir al login
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}

// Función para obtener datos del usuario actual
function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

// Función para verificar si el usuario tiene un rol específico
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.tipoUsuario === role;
}

// Función para redirigir según el id_rol del usuario
function redirectBasedOnRole(id_rol) {
    switch (id_rol) {
        case 1: // Administrador
            window.location.href = '/admin/dashboard.html';
            break;
        case 2: // Empleado
            window.location.href = '/empleado/dashboard.html';
            break;
        case 3: // Cliente
            window.location.href = '/cliente/dashboard.html';
            break;
        default:
            console.error('Rol no reconocido:', id_rol);
            window.location.href = '/';
            break;
    }
}

// Función para mostrar información del usuario en la interfaz
function displayUserInfo() {
    const user = getCurrentUser();
    if (user) {
        // Buscar elementos comunes donde mostrar la información del usuario
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        const userRoleElements = document.querySelectorAll('.user-role');
        
        userNameElements.forEach(el => el.textContent = user.nombre);
        userEmailElements.forEach(el => el.textContent = user.correo);
        userRoleElements.forEach(el => el.textContent = user.tipoUsuario);
    }
}

// Función para agregar botón de logout a la interfaz
function addLogoutButton() {
    // Buscar si ya existe un botón de logout
    if (document.getElementById('logoutBtn')) {
        return;
    }
    
    // Crear botón de logout
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt mr-2"></i>Cerrar Sesión';
    logoutBtn.onclick = logout;
    
    // Buscar un lugar común para agregar el botón (header, nav, etc.)
    const header = document.querySelector('header nav');
    const userActions = document.querySelector('.user-actions');
    const nav = document.querySelector('nav .flex:last-child');
    
    if (userActions) {
        userActions.appendChild(logoutBtn);
    } else if (nav) {
        nav.appendChild(logoutBtn);
    } else if (header) {
        header.appendChild(logoutBtn);
    }
}

// Función para inicializar la autenticación en la página
function initAuth() {
    const currentPage = window.location.pathname;
    
    // Verificar si hay una sesión activa
    const user = getCurrentUser();
    const hasValidSession = user && localStorage.getItem('authToken');
    
    // Si estamos en el index, mostrar/ocultar elementos según el estado de autenticación
    if (currentPage === '/' || currentPage === '/index.html') {
        const userNotLoggedIn = document.getElementById('userNotLoggedIn');
        const userLoggedIn = document.getElementById('userLoggedIn');
        const mobileUserNotLoggedIn = document.getElementById('mobileUserNotLoggedIn');
        const mobileUserLoggedIn = document.getElementById('mobileUserLoggedIn');
        
        if (hasValidSession) {
            // Usuario logueado
            if (userNotLoggedIn) userNotLoggedIn.classList.add('hidden');
            if (userLoggedIn) userLoggedIn.classList.remove('hidden');
            if (mobileUserNotLoggedIn) mobileUserNotLoggedIn.classList.add('hidden');
            if (mobileUserLoggedIn) mobileUserLoggedIn.classList.remove('hidden');
            
            displayUserInfo();
        } else {
            // Usuario no logueado
            if (userNotLoggedIn) userNotLoggedIn.classList.remove('hidden');
            if (userLoggedIn) userLoggedIn.classList.add('hidden');
            if (mobileUserNotLoggedIn) mobileUserNotLoggedIn.classList.remove('hidden');
            if (mobileUserLoggedIn) mobileUserLoggedIn.classList.add('hidden');
            
            // Asegurar que el dropdown esté cerrado
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.classList.add('hidden');
            }
        }
    }
    
    // Verificar autenticación si estamos en una página protegida
    const protectedPages = ['/cliente/dashboard.html', '/empleado/dashboard.html', '/admin/dashboard.html'];
    
    if (protectedPages.some(page => currentPage.includes(page))) {
        if (!checkAuth()) {
            return;
        }
        
        // Mostrar información del usuario
        displayUserInfo();
        
        // Agregar botón de logout
        addLogoutButton();
        
        // Verificar que el usuario tenga el rol correcto para la página
        if (user && user.id_rol) {
            // Redirigir al dashboard correcto si el usuario está en una página que no le corresponde
            if (currentPage.includes('/cliente/') && user.id_rol !== 3) {
                redirectBasedOnRole(user.id_rol);
                return;
            }
            if (currentPage.includes('/empleado/') && user.id_rol !== 2) {
                redirectBasedOnRole(user.id_rol);
                return;
            }
            if (currentPage.includes('/admin/') && user.id_rol !== 1) {
                redirectBasedOnRole(user.id_rol);
                return;
            }
        }
    }
}

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

// Función para toggle del dropdown del usuario
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    const chevron = document.querySelector('#userDropdownBtn i.fa-chevron-down');
    
    if (dropdown && chevron) {
        if (dropdown.classList.contains('hidden')) {
            dropdown.classList.remove('hidden');
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');
        } else {
            dropdown.classList.add('hidden');
            chevron.classList.remove('fa-chevron-up');
            chevron.classList.add('fa-chevron-down');
        }
    }
}

// Exportar funciones para uso en otros archivos
window.AuthUtils = {
    logout,
    checkAuth,
    getCurrentUser,
    hasRole,
    redirectBasedOnRole,
    displayUserInfo,
    addLogoutButton,
    initAuth,
    toggleUserDropdown
};

// Hacer disponible globalmente
window.toggleUserDropdown = toggleUserDropdown;
