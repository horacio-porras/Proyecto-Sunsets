// Navbar Component Manager for Sunset's Tarbaca

// Función para cargar el navbar en cualquier página
function loadNavbar(currentPage = null) {
    // Buscar el contenedor del navbar
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) {
        console.warn('No se encontró el contenedor del navbar con id "navbar-container"');
        return;
    }

    // Cargar el contenido del navbar
    fetch('/components/navbar.html')
        .then(response => response.text())
        .then(html => {
            navbarContainer.innerHTML = html;
            // Inicializar funcionalidades del navbar después de cargarlo
            initializeNavbar();
            // Resaltar página actual si se especifica
            if (currentPage) {
                highlightCurrentPage(currentPage);
            }
        })
        .catch(error => {
            console.error('Error al cargar el navbar:', error);
        });
}

// Función para resaltar la página actual en el navbar
function highlightCurrentPage(currentPage) {
    // Remover resaltado de todas las páginas
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('border-b-2', 'border-white', 'text-orange-400');
    });
    
    // Resaltar la página actual
    const currentLink = document.querySelector(`nav a[href="${currentPage}"]`);
    if (currentLink) {
        currentLink.classList.add('border-b-2', 'border-white', 'text-orange-400');
    }
}

// Función para inicializar las funcionalidades del navbar
function initializeNavbar() {
    // Mostrar/ocultar elementos según el estado de autenticación
    updateAuthState();
    
    // Configurar menús específicos por rol
    configureRoleSpecificMenus();
    
    // Agregar event listeners
    addNavbarEventListeners();
}

// Función para actualizar el estado de autenticación en el navbar
function updateAuthState() {
    const user = getCurrentUser();
    const hasValidSession = user && localStorage.getItem('authToken');
    
    // Elementos desktop
    const userNotLoggedIn = document.getElementById('userNotLoggedIn');
    const userLoggedIn = document.getElementById('userLoggedIn');
    
    // Elementos móvil
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

// Función para configurar menús específicos por rol
function configureRoleSpecificMenus() {
    const user = getCurrentUser();
    if (!user) return;

    const userRole = user.tipoUsuario;
    
    // Configurar enlace del dashboard
    const dashboardLink = document.getElementById('dashboardLink');
    const mobileDashboardLink = document.getElementById('mobileDashboardLink');
    
    let dashboardUrl = '';
    let dashboardText = '';
    let dashboardIcon = '';
    
    switch(userRole) {
        case 'Cliente':
            dashboardUrl = '/cliente/dashboard.html';
            dashboardText = 'Dashboard';
            dashboardIcon = 'fas fa-tachometer-alt';
            break;
        case 'Empleado':
            dashboardUrl = '/empleado/dashboard.html';
            dashboardText = 'Dashboard';
            dashboardIcon = 'fas fa-tachometer-alt';
            break;
        case 'Administrador':
            dashboardUrl = '/admin/dashboard.html';
            dashboardText = 'Dashboard';
            dashboardIcon = 'fas fa-tachometer-alt';
            break;
    }
    
    if (dashboardLink) {
        dashboardLink.innerHTML = `
            <a href="${dashboardUrl}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                <i class="${dashboardIcon} mr-2"></i>${dashboardText}
            </a>
        `;
    }
    
    if (mobileDashboardLink) {
        mobileDashboardLink.innerHTML = `
            <a href="${dashboardUrl}" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                <i class="${dashboardIcon} mr-2"></i>${dashboardText}
            </a>
        `;
    }
    
    // Configurar menús específicos por rol
    const roleSpecificMenu = document.getElementById('roleSpecificMenu');
    const mobileRoleSpecificMenu = document.getElementById('mobileRoleSpecificMenu');
    
    let roleMenuItems = '';
    let mobileRoleMenuItems = '';
    
    switch(userRole) {
        case 'Cliente':
            roleMenuItems = `
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-shopping-bag mr-2"></i>Mis Pedidos
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-calendar mr-2"></i>Mis Reservaciones
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-shopping-bag mr-2"></i>Mis Pedidos
                </a>
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-calendar mr-2"></i>Mis Reservaciones
                </a>
            `;
            break;
        case 'Empleado':
            roleMenuItems = `
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-list mr-2"></i>Gestionar Pedidos
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-boxes mr-2"></i>Inventario
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-list mr-2"></i>Gestionar Pedidos
                </a>
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-boxes mr-2"></i>Inventario
                </a>
            `;
            break;
        case 'Administrador':
            roleMenuItems = `
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-users-cog mr-2"></i>Gestionar Usuarios
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-chart-bar mr-2"></i>Reportes
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-cog mr-2"></i>Configuración
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-users-cog mr-2"></i>Gestionar Usuarios
                </a>
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-chart-bar mr-2"></i>Reportes
                </a>
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-cog mr-2"></i>Configuración
                </a>
            `;
            break;
    }
    
    if (roleSpecificMenu) {
        roleSpecificMenu.innerHTML = roleMenuItems;
    }
    
    if (mobileRoleSpecificMenu) {
        mobileRoleSpecificMenu.innerHTML = mobileRoleMenuItems;
    }
}

// Función para agregar event listeners del navbar
function addNavbarEventListeners() {
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('userDropdown');
        const dropdownBtn = document.getElementById('userDropdownBtn');
        
        if (dropdown && dropdownBtn) {
            if (!dropdownBtn.contains(event.target) && !dropdown.contains(event.target)) {
                dropdown.classList.add('hidden');
                const chevron = document.querySelector('#userDropdownBtn i.fa-chevron-up');
                if (chevron) {
                    chevron.classList.remove('fa-chevron-up');
                    chevron.classList.add('fa-chevron-down');
                }
            }
        }
    });
}

// Función para toggle del menú móvil
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

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

// Función para mostrar información del usuario
function displayUserInfo() {
    const user = getCurrentUser();
    if (user) {
        document.querySelectorAll('.user-name').forEach(el => el.textContent = user.nombre);
        document.querySelectorAll('.user-email').forEach(el => el.textContent = user.correo);
        document.querySelectorAll('.user-role').forEach(el => el.textContent = user.tipoUsuario);
    }
}

// Función para obtener usuario actual (debe estar definida en auth.js)
function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

// Función para logout (debe estar definida en auth.js)
function logout() {
    // Limpiar datos del localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Redirigir a la página principal
    window.location.href = '/';
}

// Exportar funciones para uso global
window.NavbarManager = {
    loadNavbar,
    initializeNavbar,
    updateAuthState,
    configureRoleSpecificMenus,
    toggleMobileMenu,
    toggleUserDropdown,
    displayUserInfo
};

// Hacer disponibles globalmente
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserDropdown = toggleUserDropdown;

// Cargar navbar automáticamente cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    // Detectar página actual basada en la URL
    const currentPath = window.location.pathname;
    const currentPage = currentPath === '/' ? '/index.html' : currentPath;
    
    loadNavbar(currentPage);
});
