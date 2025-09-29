//Funciones de autenticación comunes para Sunset's Tarbaca

//Función para cerrar sesión
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    window.location.href = '/';
}

//Función para verificar si el usuario está autenticado
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
        window.location.href = '/';
        return false;
    }
    
    return true;
}

//Función para obtener datos del usuario actual
function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

//Función para verificar si el usuario tiene un rol específico
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.tipoUsuario === role;
}

//Función para redirigir según el id_rol del usuario
function redirectBasedOnRole(id_rol) {
    switch (id_rol) {
        case 1:
            window.location.href = '/admin/dashboard.html';
            break;
        case 2:
            window.location.href = '/empleado/dashboard.html';
            break;
        case 3:
            window.location.href = '/cliente/dashboard.html';
            break;
        default:
            console.error('Rol no reconocido:', id_rol);
            window.location.href = '/';
            break;
    }
}

//Función para mostrar información del usuario en la interfaz
function displayUserInfo() {
    const user = getCurrentUser();
    if (user) {
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        const userRoleElements = document.querySelectorAll('.user-role');
        
        userNameElements.forEach(el => el.textContent = user.nombre);
        userEmailElements.forEach(el => el.textContent = user.correo);
        userRoleElements.forEach(el => el.textContent = user.tipoUsuario);
    }
}

//Función para agregar botón de logout a la interfaz
function addLogoutButton() {
    if (document.getElementById('logoutBtn')) {
        return;
    }
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt mr-2"></i>Cerrar Sesión';
    logoutBtn.onclick = logout;
    
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

//Función para inicializar la autenticación en la página
function initAuth() {
    const currentPage = window.location.pathname;
    
    const user = getCurrentUser();
    const hasValidSession = user && localStorage.getItem('authToken');
    
    if (currentPage === '/' || currentPage === '/index.html') {
        const userNotLoggedIn = document.getElementById('userNotLoggedIn');
        const userLoggedIn = document.getElementById('userLoggedIn');
        const mobileUserNotLoggedIn = document.getElementById('mobileUserNotLoggedIn');
        const mobileUserLoggedIn = document.getElementById('mobileUserLoggedIn');
        
        if (hasValidSession) {
            //Usuario logeado
            if (userNotLoggedIn) userNotLoggedIn.classList.add('hidden');
            if (userLoggedIn) userLoggedIn.classList.remove('hidden');
            if (mobileUserNotLoggedIn) mobileUserNotLoggedIn.classList.add('hidden');
            if (mobileUserLoggedIn) mobileUserLoggedIn.classList.remove('hidden');
            
            displayUserInfo();
        } else {
            //Usuario no logeado
            if (userNotLoggedIn) userNotLoggedIn.classList.remove('hidden');
            if (userLoggedIn) userLoggedIn.classList.add('hidden');
            if (mobileUserNotLoggedIn) mobileUserNotLoggedIn.classList.remove('hidden');
            if (mobileUserLoggedIn) mobileUserLoggedIn.classList.add('hidden');
            
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.classList.add('hidden');
            }
        }
    }
    
    //Verifica la autenticación si estamos en una página protegida
    const protectedPages = ['/cliente/dashboard.html', '/empleado/dashboard.html', '/admin/dashboard.html'];
    
    if (protectedPages.some(page => currentPage.includes(page))) {
        if (!checkAuth()) {
            return;
        }
        
        displayUserInfo();
        
        addLogoutButton();
        
        //Verifica que el usuario tenga el rol correcto para la página
        if (user && user.id_rol) {
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

//Se ejecuta cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

//Función para toggle del dropdown del usuario
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

//Funciones para uso en otros archivos
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

//Disponibilidad global
window.toggleUserDropdown = toggleUserDropdown;
