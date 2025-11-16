//Componente Navbar

//Función para cargar el navbar en cualquier página
function loadNavbar(currentPage = null) {
    //Busca el contenedor del navbar
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) {
        console.warn('No se encontró el contenedor del navbar con id "navbar-container"');
        return;
    }

    //Carga el contenido del navbar
    fetch('/components/navbar.html')
        .then(response => response.text())
        .then(html => {
            navbarContainer.innerHTML = html;
            initializeNavbar();
            initializeForgotPasswordModal();
            if (currentPage) {
                highlightCurrentPage(currentPage);
            }
        })
        .catch(error => {
            console.error('Error al cargar el navbar:', error);
        });
}

//Función para resaltar la página actual en el navbar
function highlightCurrentPage(currentPage) {
    document.querySelectorAll('nav a, #dashboardLink a, #mobileDashboardLink a, #roleSpecificMenu a, #mobileRoleSpecificMenu a').forEach(link => {
        link.classList.remove('border-b-2', 'border-white', 'text-orange-400', 'text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'text-white');
        link.classList.add('hover:text-white');
        link.style.backgroundImage = '';
        link.style.backgroundSize = '';
        link.style.backgroundPosition = '';
        link.style.backgroundRepeat = '';
        link.style.paddingBottom = '';
        link.style.borderBottom = '';
        link.style.background = '';
        link.style.webkitBackgroundClip = '';
        link.style.webkitTextFillColor = '';
        link.style.backgroundClip = '';
    });
    
    //Resalta el logo cuando se esta en el index
    const logoLink = document.querySelector('nav a[href="/"]');
    if (logoLink) {
        const sunsetText = logoLink.querySelector('.text-2xl');
        if (sunsetText) {
            if (currentPage === '/' || currentPage === '/index.html' || currentPage === 'index.html') {
                sunsetText.classList.remove('text-gray-300');
                sunsetText.classList.add('text-white');
            } else {
                sunsetText.classList.remove('text-white');
                sunsetText.classList.add('text-gray-300');
            }
        }
    }
    
    //Resalta la página actual con gradiente (incluyendo enlaces del dropdown)
    const currentLink = document.querySelector(`nav a[href="${currentPage}"], #dashboardLink a[href="${currentPage}"], #mobileDashboardLink a[href="${currentPage}"], #roleSpecificMenu a[href="${currentPage}"], #mobileRoleSpecificMenu a[href="${currentPage}"]`);
    if (currentLink && currentPage !== '/' && currentPage !== '/index.html' && currentPage !== 'index.html') {
        currentLink.style.background = 'linear-gradient(to right, #f97316, #ef4444)';
        currentLink.style.webkitBackgroundClip = 'text';
        currentLink.style.webkitTextFillColor = 'transparent';
        currentLink.style.backgroundClip = 'text';
        currentLink.classList.remove('hover:text-white');
    }
}

//Función para inicializar las funcionalidades del navbar
function initializeNavbar() {
    updateAuthState();
    configureRoleSpecificMenus();
    addNavbarEventListeners();
}

//Función para actualizar el estado de autenticación en el navbar
function updateAuthState() {
    const user = getCurrentUser();
    const hasValidSession = user && localStorage.getItem('authToken');
    
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
        configureRoleSpecificMenus();
        
        // Mostrar notificaciones solo para Clientes
        const notificationsContainer = document.getElementById('notificationsContainer');
        if (notificationsContainer) {
            if (user && user.tipoUsuario === 'Cliente') {
                notificationsContainer.classList.remove('hidden');
                
                setTimeout(() => {
                    const currentPath = window.location.pathname;
                    const currentPage = currentPath === '/' ? '/index.html' : currentPath;
                    highlightCurrentPage(currentPage);
                    // Cargar panel y badge de notificaciones
                    loadLatestNotifications();
                    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
                }, 100);

                // Actualizar badge de notificaciones no leídas y establecer polling
                if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
                // limpiar intervalos previos
                if (window._notifPollInterval) clearInterval(window._notifPollInterval);
                window._notifPollInterval = setInterval(() => {
                    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
                    loadLatestNotifications(true);
                }, 60000); // cada 60s
            } else {
                notificationsContainer.classList.add('hidden');
                // Limpiar intervalos si no es cliente
                if (window._notifPollInterval) {
                    clearInterval(window._notifPollInterval);
                    window._notifPollInterval = null;
                }
            }
        }
        
        setTimeout(() => {
            const currentPath = window.location.pathname;
            const currentPage = currentPath === '/' ? '/index.html' : currentPath;
            highlightCurrentPage(currentPage);
        }, 100);
    } else {
        //Usuario no logeado
        if (userNotLoggedIn) userNotLoggedIn.classList.remove('hidden');
        if (userLoggedIn) userLoggedIn.classList.add('hidden');
        if (mobileUserNotLoggedIn) mobileUserNotLoggedIn.classList.remove('hidden');
        if (mobileUserLoggedIn) mobileUserLoggedIn.classList.add('hidden');
        
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.classList.remove('dropdown-show', 'dropdown-hide');
        }
        const panel = document.getElementById('notifPanel');
        if (panel) panel.classList.add('hidden');
        const notificationsContainer = document.getElementById('notificationsContainer');
        if (notificationsContainer) notificationsContainer.classList.add('hidden');
    }
}

// Obtener y mostrar contador de notificaciones no leídas
async function updateNotificationBadge() {
    try {
        const user = getCurrentUser();
        if (!user || user.tipoUsuario !== 'Cliente') return;
        
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const res = await fetch('/api/cliente/notificaciones/count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) return;

        const count = data.no_leidas || 0;
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        if (count > 0) {
            badge.classList.remove('hidden');
            badge.textContent = count > 99 ? '99+' : count;
        } else {
            badge.classList.add('hidden');
        }
    } catch (err) {
        console.error('Error al obtener contador de notificaciones:', err);
    }
}

// Cargar últimas notificaciones en el panel
async function loadLatestNotifications(silent = false) {
    try {
        const user = getCurrentUser();
        if (!user || user.tipoUsuario !== 'Cliente') return;
        
        const token = localStorage.getItem('authToken');
        const body = document.getElementById('notifPanelBody');
        if (!token || !body) return;
        if (!silent) body.innerHTML = '<div class="p-4 text-sm text-gray-500">Cargando notificaciones...</div>';

        const res = await fetch('/api/cliente/notificaciones', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) {
            body.innerHTML = '<div class="p-4 text-sm text-red-600">No se pudieron cargar las notificaciones.</div>';
            return;
        }
        // Solo mostrar no leídas en el panel del navbar
        const list = (data.notificaciones || []).filter(n => !n.leida).slice(0, 6);
        if (list.length === 0) {
            body.innerHTML = '<div class="p-4 text-sm text-gray-600">No tienes notificaciones pendientes.</div>';
            return;
        }
        
        // Función para extraer descuento, vigencia y alcance del contenido
        const parseNotificationContent = (contenido) => {
            if (!contenido) return { descuento: '', vigencia: '', alcance: '' };
            
            // Separar el contenido antes del " — " (que es donde empieza la descripción)
            const contenidoSinDescripcion = contenido.split(' — ')[0];
            
            // El formato es "Descuento: X%" donde X puede ser un número entero o decimal
            const descuentoMatch = contenidoSinDescripcion.match(/Descuento:\s*(\d+(?:\.\d+)?)%/);
            const vigenciaMatch = contenidoSinDescripcion.match(/Vigencia:\s*([^•]+?)(?:\s*•|$)/);
            const alcanceMatch = contenidoSinDescripcion.match(/Alcance:\s*([^•]+?)(?:\s*•|$)/);
            
            return {
                descuento: descuentoMatch ? `${descuentoMatch[1]}%` : '',
                vigencia: vigenciaMatch ? vigenciaMatch[1].trim() : '',
                alcance: alcanceMatch ? alcanceMatch[1].trim() : ''
            };
        };
        
        body.innerHTML = list.map(n => {
            const parsed = parseNotificationContent(n.contenido);
            return `
                <div class="p-3 border-b hover:bg-gray-50" data-notif-id="${n.id_notificacion}">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1">
                            <div class="text-sm font-semibold text-gray-800">${n.titulo || 'Notificación'}</div>
                            ${parsed.descuento ? `<div class="text-sm text-orange-600 font-medium mt-1">${parsed.descuento}</div>` : ''}
                            ${parsed.vigencia ? `<div class="text-xs text-gray-500 mt-1">${parsed.vigencia}</div>` : ''}
                            ${parsed.alcance ? `<div class="text-xs text-gray-500 mt-1">${parsed.alcance}</div>` : ''}
                        </div>
                        <div class="flex items-center gap-3">
                            ${n.leida ? '' : `<button class="notif-mark-read text-xs text-blue-600 hover:underline" data-id="${n.id_notificacion}">Marcar como leída</button>`}
                            ${n.leida ? '' : '<span class="mt-1 inline-flex h-2 w-2 rounded-full bg-red-500"></span>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach mark-as-read handlers
        body.querySelectorAll('.notif-mark-read').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                await markNotificationAsRead(id, btn);
            });
        });
    } catch (e) {
        const body = document.getElementById('notifPanelBody');
        if (body) body.innerHTML = '<div class="p-4 text-sm text-red-600">Error al cargar notificaciones.</div>';
    }
}

// Toggle panel
function toggleNotificationsPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    document.querySelectorAll('#notifPanel').forEach(p => p.classList.add('hidden'));
    if (isHidden) {
        panel.classList.remove('hidden');
        loadLatestNotifications();
    } else {
        panel.classList.add('hidden');
    }
}

function goToAllNotifications() {
    window.location.href = '/cliente/notificaciones.html';
}

// Marcar notificación como leída (y remover del panel)
async function markNotificationAsRead(id, btnEl) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token || !id) return;
        const res = await fetch(`/api/cliente/notificaciones/${id}/leida`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            return;
        }
        // Remove item from panel
        const item = btnEl.closest('[data-notif-id]');
        if (item && item.parentElement) {
            item.parentElement.removeChild(item);
        }
        // Refresh badge count
        if (typeof updateNotificationBadge === 'function') {
            updateNotificationBadge();
        }
        // If no items left, show vacío
        const body = document.getElementById('notifPanelBody');
        if (body && body.children.length === 0) {
            body.innerHTML = '<div class="p-4 text-sm text-gray-600">No hay notificaciones.</div>';
        }
    } catch (err) {
        // Silencioso para no interrumpir UX del panel
        console.error('Error al marcar notificación como leída:', err);
    }
}

//Función para configurar menús específicos por rol
function configureRoleSpecificMenus() {
    const user = getCurrentUser();
    if (!user) return;

    const userRole = user.tipoUsuario;
    
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
            <a href="${dashboardUrl}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                <i class="${dashboardIcon} mr-2 text-gray-700"></i>${dashboardText}
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
    
    const roleSpecificMenu = document.getElementById('roleSpecificMenu');
    const mobileRoleSpecificMenu = document.getElementById('mobileRoleSpecificMenu');
    
    let roleMenuItems = '';
    let mobileRoleMenuItems = '';
    
    switch(userRole) {
        case 'Cliente':
            roleMenuItems = `
                <a href="/cliente/perfil.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-user mr-2 text-gray-700"></i>Mi Perfil
                </a>
                <a href="/cliente/mis-pedidos.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-shopping-bag mr-2 text-gray-700"></i>Mis Pedidos
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="/cliente/perfil.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-user mr-2"></i>Mi Perfil
                </a>
                <a href="/cliente/mis-pedidos.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-shopping-bag mr-2"></i>Mis Pedidos
                </a>
            `;
            break;
        case 'Empleado':
            roleMenuItems = `
                <a href="/empleado/perfil.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-user-shield mr-2 text-gray-700"></i>Mi Perfil
                </a>
                <a href="/empleado/pedidos.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-list mr-2 text-gray-700"></i>Pedidos
                </a>
                <a href="/empleado/inventario.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-boxes mr-2 text-gray-700"></i>Inventario
                </a>
                <a href="/empleado/productos.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-utensils mr-2 text-gray-700"></i>Productos
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="/empleado/perfil.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-user-shield mr-2"></i>Mi Perfil
                </a>
                <a href="/empleado/pedidos.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-list mr-2"></i>Pedidos
                </a>
                <a href="/empleado/inventario.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-boxes mr-2"></i>Inventario
                </a>
                <a href="/empleado/productos.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-utensils mr-2"></i>Productos
                </a>
            `;
            break;
        case 'Administrador':
            roleMenuItems = `
                <a href="/admin/perfil.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-user-shield mr-2 text-gray-700"></i>Mi Perfil
                </a>
                <a href="/admin/personal.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-users mr-2 text-gray-700"></i>Personal
                </a>
                <a href="/admin/inventario.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-boxes mr-2 text-gray-700"></i>Inventario
                </a>
                <a href="/admin/productos.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-utensils mr-2 text-gray-700"></i>Productos
                </a>
                <a href="/admin/promociones.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-tags mr-2 text-gray-700"></i>Promociones
                </a>
                <a href="/admin/recompensas.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-gift mr-2 text-gray-700"></i>Recompensas
                </a>
                <a href="/admin/pedidos.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-clipboard-list mr-2 text-gray-700"></i>Historial de Pedidos
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-chart-bar mr-2 text-gray-700"></i>Reportes
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-cog mr-2 text-gray-700"></i>Configuración
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="/admin/perfil.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-user-shield mr-2"></i>Mi Perfil
                </a>
                <a href="/admin/personal.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-users mr-2"></i>Personal
                </a>
                <a href="/admin/inventario.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-boxes mr-2"></i>Inventario
                </a>
                <a href="/admin/productos.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-utensils mr-2"></i>Productos
                </a>
                <a href="/admin/promociones.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-tags mr-2"></i>Promociones
                </a>
                <a href="/admin/recompensas.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-gift mr-2"></i>Recompensas
                </a>
                <a href="/admin/pedidos.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-clipboard-list mr-2"></i>Historial de Pedidos
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
    
    const currentPath = window.location.pathname;
    const currentPage = currentPath === '/' ? '/index.html' : currentPath;
    highlightCurrentPage(currentPage);
}

//Función para agregar event listeners del navbar
function addNavbarEventListeners() {
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('userDropdown');
        const dropdownBtn = document.getElementById('userDropdownBtn');
        const notifPanel = document.getElementById('notifPanel');
        const notifBtn = document.getElementById('notifBellBtn');
        
        if (dropdown && dropdownBtn) {
            if (!dropdownBtn.contains(event.target) && !dropdown.contains(event.target)) {
                if (!dropdown.classList.contains('hidden')) {
                    dropdown.classList.remove('dropdown-show');
                    dropdown.classList.add('dropdown-hide');
                    const chevron = document.querySelector('#userDropdownBtn i.fa-chevron-up, #userDropdownBtn i.fa-chevron-down');
                    if (chevron) {
                        chevron.classList.remove('fa-chevron-up');
                        chevron.classList.add('fa-chevron-down');
                    }
                    
                    setTimeout(() => {
                        dropdown.classList.add('hidden');
                        dropdown.classList.remove('dropdown-hide');
                    }, 200);
                }
            }
        }

        if (notifPanel && notifBtn) {
            const clickInside = notifPanel.contains(event.target) || notifBtn.contains(event.target);
            if (!clickInside) {
                notifPanel.classList.add('hidden');
            }
        }
        
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        
        if (loginModal && !loginModal.classList.contains('hidden')) {
            const isClickOnModalBackground = event.target === loginModal || 
                (event.target.closest('#loginModal') === loginModal && 
                 !event.target.closest('.bg-white'));
            
            if (isClickOnModalBackground) {
                closeLoginModal();
            }
        }
        
        if (registerModal && !registerModal.classList.contains('hidden')) {
            const isClickOnModalBackground = event.target === registerModal || 
                (event.target.closest('#registerModal') === registerModal && 
                 !event.target.closest('.bg-white'));
            
            if (isClickOnModalBackground) {
                closeRegisterModal();
            }
        }
    });
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Register form submitted');
            handleRegister();
        });
    } else {
        console.error('Register form not found');
    }
}

//Función para mostrar/ocultar contraseña en login
function toggleLoginPassword() {
    const passwordInput = document.getElementById('loginPassword');
    const passwordIcon = document.getElementById('loginPasswordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
    }
}

//Función para mostrar/ocultar contraseña en registro
function toggleRegisterPassword(fieldId) {
    const passwordInput = document.getElementById(fieldId);
    const passwordIcon = document.getElementById(fieldId + 'Icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
    }
}

//Función para mostrar mensajes en login
function showLoginMessage(message, isError = true) {
    const errorDiv = document.getElementById('loginErrorMessage');
    const successDiv = document.getElementById('loginSuccessMessage');
    const errorText = document.getElementById('loginErrorText');
    const successText = document.getElementById('loginSuccessText');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    if (isError) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    } else {
        successText.textContent = message;
        successDiv.classList.remove('hidden');
    }
}

//Función para mostrar mensajes en registro
function showRegisterMessage(message, isError = true) {
    const errorDiv = document.getElementById('registerErrorMessage');
    const successDiv = document.getElementById('registerSuccessMessage');
    const errorText = document.getElementById('registerErrorText');
    const successText = document.getElementById('registerSuccessText');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    if (isError) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    } else {
        successText.textContent = message;
        successDiv.classList.remove('hidden');
    }
}

//Función para mostrar/ocultar loading en login
function toggleLoginLoading(show) {
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnSpinner = document.getElementById('loginBtnSpinner');

    if (show) {
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Iniciando sesión...';
        loginBtnSpinner.classList.remove('hidden');
    } else {
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Iniciar Sesión';
        loginBtnSpinner.classList.add('hidden');
    }
}

//Función para mostrar/ocultar loading en registro
function toggleRegisterLoading(show) {
    const registerBtn = document.getElementById('registerBtn');
    const registerBtnText = document.getElementById('registerBtnText');
    const registerBtnSpinner = document.getElementById('registerBtnSpinner');

    if (show) {
        registerBtn.disabled = true;
        registerBtnText.textContent = 'Creando cuenta...';
        registerBtnSpinner.classList.remove('hidden');
    } else {
        registerBtn.disabled = false;
        registerBtnText.textContent = 'Crear Cuenta';
        registerBtnSpinner.classList.add('hidden');
    }
}

//Función para manejar el login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showLoginMessage('Por favor, completa todos los campos requeridos');
        return;
    }

    toggleLoginLoading(true);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                correo: email,
                contrasena: password
            })
        });

        const data = await response.json();

        if (data.success) {
            //Guarda el token en localStorage
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('userData', JSON.stringify(data.data.user));
            
            if (typeof handleUserChange === 'function') {
                handleUserChange();
            }
            
            showLoginMessage('¡Login exitoso! Redirigiendo...', false);
            
            setTimeout(() => {
                closeLoginModal();
                updateAuthState();
                configureRoleSpecificMenus();
            }, 1500);
        } else {
            showLoginMessage(data.message || 'Error al iniciar sesión');
            const pwd = document.getElementById('loginPassword');
            if (pwd) {
                pwd.value = '';
                pwd.focus();
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showLoginMessage('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
        toggleLoginLoading(false);
    }
}

//Validación de contraseñas para registro
function validateRegisterPasswords() {
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        showRegisterMessage('Las contraseñas no coinciden');
        return false;
    }

    if (password.length < 8) {
        showRegisterMessage('La contraseña debe tener al menos 8 caracteres');
        return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        showRegisterMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número');
        return false;
    }

    return true;
}

//Función para manejar el registro
async function handleRegister() {
    console.log('handleRegister called');
    const nombre = document.getElementById('registerNombre').value;
    const email = document.getElementById('registerEmail').value;
    const telefono = document.getElementById('registerTelefono').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const notificacionesActivas = document.getElementById('registerNotificacionesActivas').checked;

    if (!nombre || !email || !telefono || !password || !confirmPassword) {
        showRegisterMessage('Por favor, completa todos los campos requeridos');
        return;
    }

    if (password !== confirmPassword) {
        showRegisterMessage('Las contraseñas no coinciden');
        return;
    }

    if (!validateRegisterPasswords()) {
        return;
    }

    toggleRegisterLoading(true);

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nombre: nombre,
                correo: email,
                telefono: telefono,
                contrasena: password,
                notificacionesActivas: notificacionesActivas
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('userData', JSON.stringify(data.data.user));
            
            showRegisterMessage('¡Cuenta creada exitosamente! Redirigiendo...', false);
            
            setTimeout(() => {
                closeRegisterModal();
                updateAuthState();
                configureRoleSpecificMenus();
            }, 2000);
        } else {
            if (data.errors && data.errors.length > 0) {
                const errorMessages = data.errors.map(error => error.msg).join(', ');
                showRegisterMessage(errorMessages);
            } else {
                showRegisterMessage(data.message || 'Error al crear la cuenta');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showRegisterMessage('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
        toggleRegisterLoading(false);
    }
}

//Función para controlar el gradiente del icono del navbar
function setNavbarIconGradient(active) {
    const userButton = document.querySelector('#userNotLoggedIn button');
    const mobileUserButton = document.querySelector('#mobileUserNotLoggedIn button');
    const userIcon = document.querySelector('#userNotLoggedIn button i');
    const mobileUserIcon = document.querySelector('#mobileUserNotLoggedIn button i');
    
    if (active) {
        if (userIcon) {
            userIcon.classList.remove('text-gray-300');
            userIcon.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-orange-500', 'to-red-500');
        }
        if (mobileUserIcon) {
            mobileUserIcon.classList.remove('text-gray-300');
            mobileUserIcon.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-orange-500', 'to-red-500');
        }
    } else {
        if (userIcon && userButton) {
            userIcon.classList.remove('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-orange-500', 'to-red-500');
            userIcon.classList.add('text-gray-300');
            userButton.classList.add('hover:text-white');
        }
        if (mobileUserIcon && mobileUserButton) {
            mobileUserIcon.classList.remove('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-orange-500', 'to-red-500');
            mobileUserIcon.classList.add('text-gray-300');
            mobileUserButton.classList.add('hover:text-white');
        }
    }
}

//Función para toggle del menú móvil
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

//Función para toggle del dropdown del usuario
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    const chevron = document.querySelector('#userDropdownBtn i.fa-chevron-down, #userDropdownBtn i.fa-chevron-up');
    
    if (dropdown && chevron) {
        if (dropdown.classList.contains('hidden')) {
            dropdown.classList.remove('hidden');
            dropdown.classList.remove('dropdown-hide');
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');
            
            setTimeout(() => {
                dropdown.classList.add('dropdown-show');
            }, 10);
        } else {
            dropdown.classList.remove('dropdown-show');
            dropdown.classList.add('dropdown-hide');
            chevron.classList.remove('fa-chevron-up');
            chevron.classList.add('fa-chevron-down');
            
            setTimeout(() => {
                dropdown.classList.add('hidden');
                dropdown.classList.remove('dropdown-hide');
            }, 200);
        }
    }
}

//Función para mostrar información del usuario
function displayUserInfo() {
    const user = getCurrentUser();
    if (user) {
        document.querySelectorAll('.user-name').forEach(el => el.textContent = user.nombre);
        document.querySelectorAll('.user-email').forEach(el => el.textContent = user.correo);
        document.querySelectorAll('.user-role').forEach(el => el.textContent = user.tipoUsuario);
    }
}

//Función para obtener usuario actual (debe estar definida en auth.js)
function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

//Funciones para manejar modales de login y registro
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('hidden');
        setNavbarIconGradient(true);
        disableChatAndCartButtons();
    }
}

//Función para cerrar el modal de login
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        
        if (modalContent) {
            modal.style.transition = 'opacity 0.3s ease-out';
            modalContent.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            
            modal.style.opacity = '0';
            modalContent.style.transform = 'scale(0.95)';
            modalContent.style.opacity = '0';
            
            setTimeout(() => {
                modal.classList.add('hidden');
                setNavbarIconGradient(false);
                enableChatAndCartButtons();
                
                const form = document.getElementById('loginForm');
                if (form) form.reset();
                
                const errorDiv = document.getElementById('loginErrorMessage');
                const successDiv = document.getElementById('loginSuccessMessage');
                if (errorDiv) errorDiv.classList.add('hidden');
                if (successDiv) successDiv.classList.add('hidden');
                
                modal.style.transition = '';
                modal.style.opacity = '';
                modalContent.style.transition = '';
                modalContent.style.transform = '';
                modalContent.style.opacity = '';
            }, 300);
        } else {
            modal.classList.add('hidden');
            setNavbarIconGradient(false);
            enableChatAndCartButtons();
            
            const form = document.getElementById('loginForm');
            if (form) form.reset();
            
            const errorDiv = document.getElementById('loginErrorMessage');
            const successDiv = document.getElementById('loginSuccessMessage');
            if (errorDiv) errorDiv.classList.add('hidden');
            if (successDiv) successDiv.classList.add('hidden');
        }
    }
}

//Función para abrir el modal de registro
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.remove('hidden');
        setNavbarIconGradient(true);
        disableChatAndCartButtons();
        console.log('Register modal opened');
    } else {
        console.error('Register modal not found');
    }
}

//Función para cerrar el modal de registro
function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        
        if (modalContent) {
            modal.style.transition = 'opacity 0.3s ease-out';
            modalContent.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            
            modal.style.opacity = '0';
            modalContent.style.transform = 'scale(0.95)';
            modalContent.style.opacity = '0';
            
            setTimeout(() => {
                modal.classList.add('hidden');
                setNavbarIconGradient(false);
                enableChatAndCartButtons();
                
                const form = document.getElementById('registerForm');
                if (form) form.reset();
                
                const errorDiv = document.getElementById('registerErrorMessage');
                const successDiv = document.getElementById('registerSuccessMessage');
                if (errorDiv) errorDiv.classList.add('hidden');
                if (successDiv) successDiv.classList.add('hidden');
                
                modal.style.transition = '';
                modal.style.opacity = '';
                modalContent.style.transition = '';
                modalContent.style.transform = '';
                modalContent.style.opacity = '';
            }, 300);
        } else {
            modal.classList.add('hidden');
            setNavbarIconGradient(false);
            enableChatAndCartButtons();
            
            const form = document.getElementById('registerForm');
            if (form) form.reset();
            
            const errorDiv = document.getElementById('registerErrorMessage');
            const successDiv = document.getElementById('registerSuccessMessage');
            if (errorDiv) errorDiv.classList.add('hidden');
            if (successDiv) successDiv.classList.add('hidden');
        }
    }
}

//Función para cambiar al modal de registro
function switchToRegister() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (loginModal && registerModal) {
        loginModal.classList.add('hidden');
        registerModal.classList.remove('hidden');
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        
        const loginErrorDiv = document.getElementById('loginErrorMessage');
        const loginSuccessDiv = document.getElementById('loginSuccessMessage');
        if (loginErrorDiv) loginErrorDiv.classList.add('hidden');
        if (loginSuccessDiv) loginSuccessDiv.classList.add('hidden');
    }
}

//Función para cambiar al modal de login
function switchToLogin() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (loginModal && registerModal) {
        registerModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
        
        const registerForm = document.getElementById('registerForm');
        if (registerForm) registerForm.reset();
        
        const registerErrorDiv = document.getElementById('registerErrorMessage');
        const registerSuccessDiv = document.getElementById('registerSuccessMessage');
        if (registerErrorDiv) registerErrorDiv.classList.add('hidden');
        if (registerSuccessDiv) registerSuccessDiv.classList.add('hidden');
    }
}

//Función para deshabilitar botones de ChatBot y Carrito
function disableChatAndCartButtons() {
    const chatButton = document.querySelector('button[onclick="toggleChat()"]');
    if (chatButton) {
        chatButton.disabled = true;
        chatButton.classList.add('opacity-50', 'cursor-not-allowed');
        chatButton.classList.remove('hover:from-orange-600', 'hover:to-red-600');
    }
    
    const cartButton = document.querySelector('button[onclick="toggleCart()"]');
    if (cartButton) {
        cartButton.disabled = true;
        cartButton.classList.add('opacity-50', 'cursor-not-allowed');
        cartButton.classList.remove('hover:from-orange-600', 'hover:to-red-600');
    }
}

//Función para habilitar botones de ChatBot y Carrito
function enableChatAndCartButtons() {
    const chatButton = document.querySelector('button[onclick="toggleChat()"]');
    if (chatButton) {
        chatButton.disabled = false;
        chatButton.classList.remove('opacity-50', 'cursor-not-allowed');
        chatButton.classList.add('hover:from-orange-600', 'hover:to-red-600');
    }
    
    const cartButton = document.querySelector('button[onclick="toggleCart()"]');
    if (cartButton) {
        cartButton.disabled = false;
        cartButton.classList.remove('opacity-50', 'cursor-not-allowed');
        cartButton.classList.add('hover:from-orange-600', 'hover:to-red-600');
    }
}

//Funciones para uso global
window.NavbarManager = {
    loadNavbar,
    initializeNavbar,
    updateAuthState,
    configureRoleSpecificMenus,
    toggleMobileMenu,
    toggleUserDropdown,
    toggleNotificationsPanel,
    goToAllNotifications,
    displayUserInfo,
    openLoginModal,
    closeLoginModal,
    openRegisterModal,
    closeRegisterModal,
    switchToRegister,
    switchToLogin,
    setNavbarIconGradient,
    disableChatAndCartButtons,
    enableChatAndCartButtons
};

//Disponibilidad global
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserDropdown = toggleUserDropdown;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.toggleLoginPassword = toggleLoginPassword;
window.toggleRegisterPassword = toggleRegisterPassword;
window.setNavbarIconGradient = setNavbarIconGradient;
window.disableChatAndCartButtons = disableChatAndCartButtons;
window.enableChatAndCartButtons = enableChatAndCartButtons;

//Funciones para el modal de olvidé mi contraseña
function openForgotPasswordModal() {
    console.log('Abriendo modal de olvidé mi contraseña...');
    
    const loginModal = document.getElementById('loginModal');
    const forgotModal = document.getElementById('forgotPasswordModal');
    const forgotModalContent = document.getElementById('forgotPasswordModalContent');
    
    if (!forgotModal) {
        console.error('Modal no encontrado');
        return;
    }
    
    disableChatAndCartButtons();
    
    if (loginModal && !loginModal.classList.contains('hidden')) {
        const loginModalContent = loginModal.querySelector('.modal-content');
        
        if (loginModalContent) {
            loginModalContent.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            loginModalContent.style.transform = 'scale(0.95)';
            loginModalContent.style.opacity = '0';
            
            setTimeout(() => {
                loginModal.classList.add('hidden');
                
                const loginForm = document.getElementById('loginForm');
                if (loginForm) loginForm.reset();
                
                const errorDiv = document.getElementById('loginErrorMessage');
                const successDiv = document.getElementById('loginSuccessMessage');
                if (errorDiv) errorDiv.classList.add('hidden');
                if (successDiv) successDiv.classList.add('hidden');
                
                loginModalContent.style.transition = '';
                loginModalContent.style.transform = '';
                loginModalContent.style.opacity = '';
                
                forgotModal.classList.remove('hidden');
                
                setTimeout(() => {
                    forgotModalContent.classList.remove('scale-95', 'opacity-0');
                    forgotModalContent.classList.add('scale-100', 'opacity-100');
                }, 10);
                
                const form = document.getElementById('forgotPasswordForm');
                if (form) {
                    form.reset();
                }
            }, 300);
        } else {
            closeLoginModal();
            forgotModal.classList.remove('hidden');
            
            setTimeout(() => {
                forgotModalContent.classList.remove('scale-95', 'opacity-0');
                forgotModalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
            
            const form = document.getElementById('forgotPasswordForm');
            if (form) {
                form.reset();
            }
        }
    } else {
        forgotModal.classList.remove('hidden');
        
        setTimeout(() => {
            forgotModalContent.classList.remove('scale-95', 'opacity-0');
            forgotModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        const form = document.getElementById('forgotPasswordForm');
        if (form) {
            form.reset();
        }
    }
}

//Función para cerrar el modal de olvidé mi contraseña
function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    const modalContent = document.getElementById('forgotPasswordModalContent');
    
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        enableChatAndCartButtons();
        openLoginModal();
    }, 300);
}

//Función para mostrar/ocultar contraseña en el modal de olvidé mi contraseña
function toggleForgotPasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

//Función para procesar el cambio de contraseña
async function processForgotPassword(email, newPassword) {
    try {
        const btn = document.getElementById('forgotPasswordBtn');
        const btnText = document.getElementById('forgotPasswordBtnText');
        const btnSpinner = document.getElementById('forgotPasswordBtnSpinner');
        
        btn.disabled = true;
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                newPassword: newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al cambiar la contraseña');
        }
        
        const modal = document.getElementById('forgotPasswordModal');
        const modalContent = document.getElementById('forgotPasswordModalContent');
        
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            enableChatAndCartButtons();
        }, 300);
        
        await Swal.fire({
            title: '¡Contraseña Cambiada!',
            html: `
                <div class="text-center py-4">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                        <i class="fas fa-check text-white text-2xl"></i>
                    </div>
                    <p class="text-gray-700 text-lg">Tu contraseña ha sido cambiada exitosamente</p>
                    <p class="text-gray-600 text-sm mt-2">Ya puedes iniciar sesión con tu nueva contraseña</p>
                </div>
            `,
            confirmButtonText: '<i class="fas fa-check mr-2"></i>Entendido',
            confirmButtonColor: '#10b981',
            buttonsStyling: false,
            customClass: {
                confirmButton: 'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition'
            }
        });
        
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        
        await Swal.fire({
            title: 'Error',
            html: `
                <div class="text-center py-4">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                        <i class="fas fa-times text-white text-2xl"></i>
                    </div>
                    <p class="text-gray-700 text-lg">Error al cambiar la contraseña</p>
                    <p class="text-gray-600 text-sm mt-2">${error.message}</p>
                </div>
            `,
            confirmButtonText: '<i class="fas fa-times mr-2"></i>Entendido',
            confirmButtonColor: '#ef4444',
            buttonsStyling: false,
            customClass: {
                confirmButton: 'bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition'
            }
        });
    } finally {
        const btn = document.getElementById('forgotPasswordBtn');
        const btnText = document.getElementById('forgotPasswordBtnText');
        const btnSpinner = document.getElementById('forgotPasswordBtnSpinner');
        
        if (btn && btnText && btnSpinner) {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }
}


//Inicializar el modal de olvidé mi contraseña
function initializeForgotPasswordModal() {
    const form = document.getElementById('forgotPasswordForm');
    const modal = document.getElementById('forgotPasswordModal');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('forgotPasswordEmail').value.trim();
            const newPassword = document.getElementById('forgotPasswordNewPassword').value;
            const confirmPassword = document.getElementById('forgotPasswordConfirmPassword').value;
            
            if (!email) {
                Swal.fire({
                    title: 'Error',
                    text: 'Por favor ingresa tu correo electrónico.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }
            
            if (!newPassword) {
                Swal.fire({
                    title: 'Error',
                    text: 'Por favor ingresa una nueva contraseña.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }
            
            if (newPassword !== confirmPassword) {
                Swal.fire({
                    title: 'Error',
                    text: 'Las contraseñas no coinciden.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }
            
            if (newPassword.length < 8) {
                Swal.fire({
                    title: 'Error',
                    text: 'La contraseña debe tener al menos 8 caracteres.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }
            
            if (!/(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
                Swal.fire({
                    title: 'Error',
                    text: 'La contraseña debe incluir al menos una mayúscula y un número.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }
            
            await processForgotPassword(email, newPassword);
        });
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeForgotPasswordModal();
            }
        });
    }
}

//Funciones globales
window.openForgotPasswordModal = openForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.toggleForgotPasswordVisibility = toggleForgotPasswordVisibility;

//Carga el navbar automáticamente cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath === '/' ? '/index.html' : currentPath;
    
    loadNavbar(currentPage);
});
