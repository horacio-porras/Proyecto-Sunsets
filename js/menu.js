//Variables globales para el menú
let menuProducts = [];
let currentCategory = 'all';
let activeDietaryFilters = [];

//Función para cargar productos desde la API
async function loadMenuProducts() {
    try {
        const response = await fetch('/api/menu/products');
        const data = await response.json();
        
        if (data.success) {
            menuProducts = data.data;
            renderMenu();
            hideLoading();
            showMenuContent();
        } else {
            throw new Error(data.message || 'Error al cargar el menú');
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        hideLoading();
        showError();
    }
}

//Función para renderizar el menú
function renderMenu() {
    const menuContent = document.getElementById('menu-content');
    menuContent.innerHTML = '';
    
    const productsByCategory = groupProductsByCategory(menuProducts);
    
    Object.keys(productsByCategory).forEach((category, index) => {
        if (index > 0) {
            menuContent.appendChild(createSeparator());
        }
        
        const categorySection = createCategorySection(category, productsByCategory[category]);
        menuContent.appendChild(categorySection);
    });
    
    applyFilters();
}

//Función para agrupar productos por categoría
function groupProductsByCategory(products) {
    const grouped = {};
    
    products.forEach(product => {
        let category = product.category.toLowerCase().trim();
        
        const categoryMapping = {
            'pizzas': 'pizzas',
            'entradas': 'entradas', 
            'principales': 'principales',
            'bebidas': 'bebidas',
            'postres': 'postres'
        };
        
        category = categoryMapping[category] || category;
        
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(product);
    });
    
    return grouped;
}

//Función para crear separador
function createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'separator my-16';
    separator.innerHTML = '<div class="h-2 bg-gradient-to-r from-transparent via-orange-500 to-red-500 rounded-full"></div>';
    return separator;
}

//Función para crear sección de categoría
function createCategorySection(categoryName, products) {
    const section = document.createElement('div');
    section.className = 'menu-section';
    section.setAttribute('data-category', categoryName);
    
    const title = document.createElement('h2');
    title.className = 'text-3xl font-bold text-center mb-12';
    title.textContent = getCategoryDisplayName(categoryName);
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch';
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        grid.appendChild(productCard);
    });
    
    section.appendChild(title);
    section.appendChild(grid);
    
    return section;
}

//Función para obtener nombre de categoría para mostrar
function getCategoryDisplayName(categoryName) {
    const categoryNames = {
        'pizzas': 'Pizzas Artesanales',
        'entradas': 'Entradas',
        'principales': 'Platos Principales',
        'bebidas': 'Bebidas',
        'postres': 'Postres'
    };
    
    return categoryNames[categoryName] || categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
}

//Función para crear tarjeta de producto
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'menu-item bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition flex flex-col';
    card.style.minHeight = '320px';
    
    const dietaryFilters = [];
    if (product.dietary.vegetariano) dietaryFilters.push('vegetariano');
    if (product.dietary.vegano) dietaryFilters.push('vegano');
    if (product.dietary.sinGluten) dietaryFilters.push('sin-gluten');
    
    card.setAttribute('data-dietary', dietaryFilters.join(' '));
    
    const imageHtml = product.image && product.image.trim() !== '' 
        ? `<img src="${product.image}" alt="${product.name}" class="w-full h-40 object-cover">`
        : `<div class="w-full h-40 bg-gray-300 flex items-center justify-center">
             <i class="fas fa-image text-gray-500 text-3xl"></i>
           </div>`;
    
    card.innerHTML = `
        ${imageHtml}
        <div class="p-3 flex flex-col" style="min-height: 160px;">
            <!-- Título y precio - altura fija -->
            <div class="flex justify-between items-start mb-2" style="min-height: 40px;">
                <h3 class="text-base font-semibold leading-tight">${product.name}</h3>
                <span class="text-orange-600 font-bold text-sm">₡${product.price.toLocaleString()}</span>
            </div>
            
            <!-- Descripción - altura fija -->
            <div class="mb-2" style="min-height: 48px; max-height: 48px; overflow: hidden;">
                ${product.description && product.description.trim() !== ''
                    ? `<p class="text-sm text-gray-600">${product.description}</p>`
                    : `<div style="height: 48px;"></div>`
                }
            </div>
            
                    <!-- Badges - altura fija -->
                    <div class="mb-3" style="min-height: 24px;">
                        <div class="flex flex-wrap gap-1">
                            ${dietaryFilters.map(filter => {
                                let badgeClass = '';
                                switch(filter) {
                                    case 'vegetariano':
                                        badgeClass = 'bg-green-100 text-green-800';
                                        break;
                                    case 'vegano':
                                        badgeClass = 'bg-blue-100 text-blue-800';
                                        break;
                                    case 'sin-gluten':
                                        badgeClass = 'bg-purple-100 text-purple-800';
                                        break;
                                    default:
                                        badgeClass = 'bg-green-100 text-green-800';
                                }
                                return `<span class="${badgeClass} text-xs px-2 py-1 rounded">${getDietaryDisplayName(filter)}</span>`;
                            }).join('')}
                        </div>
                    </div>
            
            <!-- Espacio flexible para empujar el botón hacia abajo -->
            <div style="flex: 1; min-height: 10px;"></div>
            
            <!-- Botón - altura fija y siempre visible -->
            <div class="flex justify-end pt-1" style="min-height: 44px; margin-top: auto;">
                <button onclick="addToCart('${product.name}', ${product.price}, this)" 
                        class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full hover:from-orange-600 hover:to-red-600 transition flex items-center justify-center flex-shrink-0 shadow-lg">
                    <i class="fas fa-plus text-lg"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

//Función para obtener nombre de filtro dietético para mostrar
function getDietaryDisplayName(filter) {
    const names = {
        'vegetariano': 'Vegetariano',
        'vegano': 'Vegano',
        'sin-gluten': 'Sin Gluten'
    };
    
    return names[filter] || filter;
}

//Función para aplicar filtros
function applyFilters() {
    const sections = document.querySelectorAll('.menu-section');
    const separators = document.querySelectorAll('.separator');
    const menuContent = document.getElementById('menu-content');
    const menuEmpty = document.getElementById('menu-empty');
    
    let hasVisibleProducts = false;
    
    sections.forEach(section => {
        const category = section.getAttribute('data-category');
        let showSection = false;
        
        if (currentCategory === 'all' || category === currentCategory) {
            showSection = true;
        }
        
        if (showSection && activeDietaryFilters.length > 0) {
            const products = section.querySelectorAll('.menu-item');
            let hasMatchingProducts = false;
            
            products.forEach(product => {
                const productDietary = product.getAttribute('data-dietary').split(' ');
                const matchesFilter = activeDietaryFilters.some(filter => 
                    productDietary.includes(filter)
                );
                
                if (matchesFilter) {
                    product.style.display = 'block';
                    hasMatchingProducts = true;
                } else {
                    product.style.display = 'none';
                }
            });
            
            showSection = hasMatchingProducts;
        } else if (showSection) {
            const products = section.querySelectorAll('.menu-item');
            products.forEach(product => {
                product.style.display = 'block';
            });
        }
        
        if (showSection) {
            section.classList.remove('hidden');
            hasVisibleProducts = true;
        } else {
            section.classList.add('hidden');
        }
    });
    
    if (!hasVisibleProducts) {
        menuContent.classList.add('hidden');
        menuEmpty.classList.remove('hidden');
    } else {
        menuContent.classList.remove('hidden');
        menuEmpty.classList.add('hidden');
        
        separators.forEach(separator => {
            separator.classList.add('hidden');
        });
        
        const visibleSections = document.querySelectorAll('.menu-section:not(.hidden)');
        if (visibleSections.length > 1) {
            visibleSections.forEach((section, index) => {
                if (index < visibleSections.length - 1) {
                    const nextSibling = section.nextElementSibling;
                    if (nextSibling && nextSibling.classList.contains('separator')) {
                        nextSibling.classList.remove('hidden');
                    }
                }
            });
        }
    }
}

//Función para limpiar todos los filtros
function clearAllFilters() {
    activeDietaryFilters = [];
    document.querySelectorAll('.dietary-filter').forEach(filter => {
        const checkbox = filter.querySelector('input[type="checkbox"]');
        const span = filter.querySelector('span');
        
        checkbox.checked = false;
        filter.classList.remove('bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'hover:from-orange-600', 'hover:to-red-600');
        filter.classList.add('bg-gray-100', 'hover:bg-gray-200');
        span.classList.remove('text-white');
        span.classList.add('text-gray-700');
    });
    
    currentCategory = 'all';
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'text-white', 'hover:from-orange-600', 'hover:to-red-600');
        btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        
        const icons = btn.querySelectorAll('i');
        icons.forEach(icon => {
            icon.classList.remove('text-white');
            icon.classList.add('text-gray-700');
        });
    });
    
    const allBtn = document.querySelector('.category-btn[onclick="filterCategory(\'all\')"]');
    if (allBtn) {
        allBtn.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        allBtn.classList.add('active', 'bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'text-white', 'hover:from-orange-600', 'hover:to-red-600');
        
        // Actualizar íconos del botón "Todos" a blanco
        const allIcons = allBtn.querySelectorAll('i');
        allIcons.forEach(icon => {
            icon.classList.remove('text-gray-700');
            icon.classList.add('text-white');
        });
    }
    
    applyFilters();
}

//Función para filtrar por categoría
function filterCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'text-white', 'hover:from-orange-600', 'hover:to-red-600');
        btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        
        const icons = btn.querySelectorAll('i');
        icons.forEach(icon => {
            icon.classList.remove('text-white');
            icon.classList.add('text-gray-700');
        });
    });
    
    const clickedElement = event.target;
    const button = clickedElement.closest('.category-btn');
    
    if (button) {
        button.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        button.classList.add('bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'text-white', 'hover:from-orange-600', 'hover:to-red-600');
        
        const icons = button.querySelectorAll('i');
        icons.forEach(icon => {
            icon.classList.remove('text-gray-700');
            icon.classList.add('text-white');
        });
    }
    
    applyFilters();
}

//Función para filtrar por preferencias dietéticas
function filterDietary() {
    activeDietaryFilters = [];
    
    document.querySelectorAll('.dietary-filter').forEach(filter => {
        const checkbox = filter.querySelector('input[type="checkbox"]');
        const span = filter.querySelector('span');
        
        if (checkbox.checked) {
            filter.classList.remove('bg-gray-100', 'hover:bg-gray-200');
            filter.classList.add('bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'hover:from-orange-600', 'hover:to-red-600');
            span.classList.remove('text-gray-700');
            span.classList.add('text-white');
            
            const filterName = span.textContent.toLowerCase().replace(' ', '-');
            activeDietaryFilters.push(filterName);
        } else {
            filter.classList.remove('bg-gradient-to-r', 'from-orange-500', 'to-red-500', 'hover:from-orange-600', 'hover:to-red-600');
            filter.classList.add('bg-gray-100', 'hover:bg-gray-200');
            span.classList.remove('text-white');
            span.classList.add('text-gray-700');
        }
    });
    
    applyFilters();
}

//Funciones de utilidad para mostrar/ocultar elementos
function hideLoading() {
    document.getElementById('menu-loading').classList.add('hidden');
}

function showError() {
    document.getElementById('menu-error').classList.remove('hidden');
}

function showMenuContent() {
    document.getElementById('menu-content').classList.remove('hidden');
}

let cart = [];
let cartTotal = 0;

//Carga el carrito desde localStorage al inicializar
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('sunsets-cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', updateCartDisplay);
            } else {
                updateCartDisplay();
            }
        } catch (error) {
            console.error('Error al cargar el carrito desde localStorage:', error);
            cart = [];
        }
    }
}

//Guarda el carrito en localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('sunsets-cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error al guardar el carrito en localStorage:', error);
    }
}

//Función para crear animación de agregar al carrito
function createAddToCartAnimation(buttonElement, productName) {
    if (!buttonElement) return;
    
    buttonElement.classList.add('pulse-add');
    setTimeout(() => {
        buttonElement.classList.remove('pulse-add');
    }, 300);
    
    const cartButton = document.getElementById('cartButton');
    
    if (cartButton) {
        setTimeout(() => {
            cartButton.classList.add('pulse-add');
            setTimeout(() => {
                cartButton.classList.remove('pulse-add');
            }, 300);
        }, 100);
    }
}

//Funciones del carrito en scope global para que estén disponibles desde onclick
window.addToCart = function(name, price, buttonElement) {
    const product = menuProducts.find(p => p.name === name);
    
    createAddToCartAnimation(buttonElement, name);
    
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            price: price,
            quantity: 1,
            image: product ? product.image : null,
            description: product ? product.description : null,
            dietary: product ? product.dietary : { vegetariano: false, vegano: false, sinGluten: false }
        });
    }
    
    updateCartDisplay();
    saveCartToStorage();
};

window.removeFromCart = function(name) {
    cart = cart.filter(item => item.name !== name);
    updateCartDisplay();
    saveCartToStorage();
};

window.updateQuantity = function(name, change) {
    const item = cart.find(item => item.name === name);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(name);
        } else {
            updateCartDisplay();
            saveCartToStorage();
        }
    }
};

window.toggleCart = function() {
    const cartElement = document.getElementById('cart');
    const cartButton = document.getElementById('cartButton');
    
    if (cartElement) {
        const isHidden = cartElement.classList.contains('hidden');
        
        if (isHidden) {
            cartElement.classList.remove('hidden');
            setTimeout(() => {
                cartElement.classList.add('show');
            }, 10);
        } else {
            cartElement.classList.remove('show');
            setTimeout(() => {
                cartElement.classList.add('hidden');
            }, 300);
        }
    }
    
    if (cartButton) {
        cartButton.classList.add('pulse-add');
        setTimeout(() => {
            cartButton.classList.remove('pulse-add');
        }, 300);
    }
};

window.clearCart = function() {
    cart = [];
    updateCartDisplay();
    saveCartToStorage();
};


//Función para actualizar la visualización del carrito
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    
    if (!cartItems || !cartTotalElement || !cartCount) {
        setTimeout(updateCartDisplay, 100);
        return;
    }
    
    cartItems.innerHTML = '';
    cartTotal = 0;
    let totalItems = 0;
    
    cart.forEach(item => {
        cartTotal += item.price * item.quantity;
        totalItems += item.quantity;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'flex items-center justify-between border-b pb-2';
        itemElement.innerHTML = `
            <div class="flex-1">
                <h4 class="font-medium">${item.name}</h4>
                <p class="text-sm text-gray-600">₡${item.price.toLocaleString()} c/u</p>
            </div>
            <div class="flex items-center gap-2">
                <button class="cart-btn-decrease" onclick="updateQuantity('${item.name}', -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="w-8 text-center">${item.quantity}</span>
                <button class="cart-btn-increase" onclick="updateQuantity('${item.name}', 1)">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="cart-btn-remove" onclick="removeFromCart('${item.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItems.appendChild(itemElement);
    });
    
    cartTotalElement.textContent = `₡${cartTotal.toLocaleString()}`;
    cartCount.textContent = totalItems;
}

//Variable para evitar múltiples event listeners
let cartClickOutsideSetup = false;

//Función para configurar el cierre del carrito al hacer clic fuera
function setupCartClickOutside() {
    if (cartClickOutsideSetup) return;
    
    document.addEventListener('click', function(event) {
        const cart = document.getElementById('cart');
        const cartToggle = document.querySelector('[onclick="toggleCart()"]');
        
        if (cart && !cart.classList.contains('hidden')) {
            const isCartButton = event.target.closest('.cart-btn-increase, .cart-btn-decrease, .cart-btn-remove');
            
            const isMenuAddButton = event.target.closest('button[onclick*="addToCart"]');
            
            const isClickInsideCart = cart.contains(event.target);
            const isClickOnToggle = cartToggle && cartToggle.contains(event.target);
            
            if (!isClickInsideCart && !isClickOnToggle && !isCartButton && !isMenuAddButton) {
                // Cerrar carrito con la misma animación que toggleCart
                cart.classList.remove('show');
                setTimeout(() => {
                    cart.classList.add('hidden');
                }, 300);
            }
        }
    });
    
    cartClickOutsideSetup = true;
}

//Función para proceder al checkout
window.checkout = function() {
    window.location.href = '/pedidos.html';
};

//Carga el menú cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    if (typeof handleUserChange === 'function') {
        handleUserChange();
    }
    
    loadCartFromStorage();
    loadMenuProducts();
    
    setupCartClickOutside();
    
    setTimeout(updateCartDisplay, 500);
});

//Asegura que las funciones estén disponibles inmediatamente
//(antes de que se ejecute DOMContentLoaded)
loadCartFromStorage();
