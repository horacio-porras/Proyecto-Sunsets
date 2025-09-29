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
        }
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
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-shopping-bag mr-2 text-gray-700"></i>Mis Pedidos
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="/cliente/perfil.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-user mr-2"></i>Mi Perfil
                </a>
                <a href="#" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-shopping-bag mr-2"></i>Mis Pedidos
                </a>
            `;
            break;
        case 'Empleado':
            roleMenuItems = `
                <a href="/empleado/perfil.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-user-shield mr-2 text-gray-700"></i>Privacidad
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-list mr-2 text-gray-700"></i>Gestionar Pedidos
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-boxes mr-2 text-gray-700"></i>Inventario
                </a>
            `;
            mobileRoleMenuItems = `
                <a href="/empleado/perfil.html" class="block bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition text-center">
                    <i class="fas fa-user-shield mr-2"></i>Privacidad
                </a>
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
                <a href="/admin/perfil.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-user-shield mr-2 text-gray-700"></i>Privacidad
                </a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition" style="color: #374151 !important;" onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#374151'">
                    <i class="fas fa-users-cog mr-2 text-gray-700"></i>Gestionar Usuarios
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
                    <i class="fas fa-user-shield mr-2"></i>Privacidad
                </a>
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
    
    const currentPath = window.location.pathname;
    const currentPage = currentPath === '/' ? '/index.html' : currentPath;
    highlightCurrentPage(currentPage);
}

//Función para agregar event listeners del navbar
function addNavbarEventListeners() {
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
        
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        
        if (loginModal && !loginModal.classList.contains('hidden')) {
            if (event.target === loginModal) {
                closeLoginModal();
            }
        }
        
        if (registerModal && !registerModal.classList.contains('hidden')) {
            if (event.target === registerModal) {
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
            
            showLoginMessage('¡Login exitoso! Redirigiendo...', false);
            
            //Cierra el modal y actualiza el navbar
            setTimeout(() => {
                closeLoginModal();
                updateAuthState();
                configureRoleSpecificMenus();
            }, 1500);
        } else {
            showLoginMessage(data.message || 'Error al iniciar sesión');
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
            //Guarda el token en localStorage
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('userData', JSON.stringify(data.data.user));
            
            showRegisterMessage('¡Cuenta creada exitosamente! Redirigiendo...', false);
            
            //Cierra el modal y actualiza el navbar
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

//Función para logout (debe estar definida en auth.js)
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    updateAuthState();
    
    window.location.href = '/';
}

//Funciones para manejar modales de login y registro
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setNavbarIconGradient(true);
    }
}

//Función para cerrar el modal de login
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        setNavbarIconGradient(false);
        
        const form = document.getElementById('loginForm');
        if (form) form.reset();
        
        const errorDiv = document.getElementById('loginErrorMessage');
        const successDiv = document.getElementById('loginSuccessMessage');
        if (errorDiv) errorDiv.classList.add('hidden');
        if (successDiv) successDiv.classList.add('hidden');
    }
}

//Función para abrir el modal de registro
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        setNavbarIconGradient(true); // Activar gradiente del icono
        console.log('Register modal opened');
    } else {
        console.error('Register modal not found');
    }
}

//Función para cerrar el modal de registro
function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        setNavbarIconGradient(false);
        
        const form = document.getElementById('registerForm');
        if (form) form.reset();
        
        const errorDiv = document.getElementById('registerErrorMessage');
        const successDiv = document.getElementById('registerSuccessMessage');
        if (errorDiv) errorDiv.classList.add('hidden');
        if (successDiv) successDiv.classList.add('hidden');
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

//Funciones para uso global
window.NavbarManager = {
    loadNavbar,
    initializeNavbar,
    updateAuthState,
    configureRoleSpecificMenus,
    toggleMobileMenu,
    toggleUserDropdown,
    displayUserInfo,
    openLoginModal,
    closeLoginModal,
    openRegisterModal,
    closeRegisterModal,
    switchToRegister,
    switchToLogin,
    setNavbarIconGradient
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

//Carga el navbar automáticamente cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath === '/' ? '/index.html' : currentPath;
    
    loadNavbar(currentPage);
});
