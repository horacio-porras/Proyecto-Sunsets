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
async function renderMenu() {
    const menuContent = document.getElementById('menu-content');
    menuContent.innerHTML = '';
    
    const productsByCategory = groupProductsByCategory(menuProducts);
    
    const categories = Object.keys(productsByCategory);
    for (let index = 0; index < categories.length; index++) {
        const category = categories[index];
        if (index > 0) {
            menuContent.appendChild(createSeparator());
        }
        
        const categorySection = await createCategorySection(category, productsByCategory[category]);
        menuContent.appendChild(categorySection);
    }
    
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
async function createCategorySection(categoryName, products) {
    const section = document.createElement('div');
    section.className = 'menu-section';
    section.setAttribute('data-category', categoryName);
    
    const title = document.createElement('h2');
    title.className = 'text-3xl font-bold text-center mb-12';
    title.textContent = getCategoryDisplayName(categoryName);
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch';
    
    for (const product of products) {
        const productCard = await createProductCard(product);
        grid.appendChild(productCard);
    }
    
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

// Función helper para formatear precios con 2 decimales
function formatPrice(price) {
    return parseFloat(price || 0).toLocaleString('es-CR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

//Función para crear tarjeta de producto
async function createProductCard(product) {
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
    
    // Cargar promedio de calificaciones
    let promedioHtml = '';
    try {
        const response = await fetch(`/api/opiniones/producto/${product.id}/promedio`);
        const data = await response.json();
        if (data.success && data.promedio > 0) {
            const estrellasLlenas = Math.floor(data.promedio);
            const tieneMedia = data.promedio % 1 >= 0.5;
            const estrellasVacias = 5 - estrellasLlenas - (tieneMedia ? 1 : 0);
            
            promedioHtml = `
                <div class="flex items-center gap-1">
                    <div class="flex text-yellow-400">
                        ${'★'.repeat(estrellasLlenas)}${tieneMedia ? '☆' : ''}${'☆'.repeat(estrellasVacias)}
                    </div>
                    <span class="text-xs text-gray-600">${data.promedio} (${data.total})</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar promedio:', error);
    }
    
    // Calcular precio a mostrar
    const displayPrice = product.hasDiscount ? product.finalPrice : product.price;
    const priceHtml = product.hasDiscount
        ? `
            <div class="flex flex-col items-end">
                <span class="text-gray-400 line-through text-xs">₡${formatPrice(product.price)}</span>
                <span class="text-gray-800 font-bold text-sm">₡${formatPrice(displayPrice)}</span>
                <span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold mt-1">-${product.discountPercentage}%</span>
            </div>
        `
        : `<span class="text-gray-800 font-bold text-sm">₡${formatPrice(displayPrice)}</span>`;

    card.innerHTML = `
        ${imageHtml}
        <div class="p-3 flex flex-col" style="min-height: 160px;">
            <!-- Título y precio - altura fija -->
            <div class="flex justify-between items-start mb-2" style="min-height: 40px;">
                <h3 class="text-base font-semibold leading-tight">${product.name}</h3>
                ${priceHtml}
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
            
            <!-- Calificaciones y Botón - en la misma fila -->
            <div class="flex justify-between items-center pt-1" style="min-height: 44px; margin-top: auto;">
                <!-- Calificaciones alineadas a la izquierda -->
                <div class="flex items-center">
                    ${promedioHtml || '<div class="flex items-center gap-1"><span class="text-xs text-gray-400">Sin calificaciones</span></div>'}
                </div>
                <!-- Botón alineado a la derecha -->
                <button onclick="addToCart('${product.name}', ${displayPrice}, this)" 
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
        // Guardar precio original y precio con descuento
        const originalPrice = product ? product.price : price;
        const finalPrice = product && product.hasDiscount ? product.finalPrice : price;
        const hasDiscount = product ? product.hasDiscount : false;
        const discountPercentage = product ? product.discountPercentage : null;
        
        cart.push({
            id: product.id,
            name: name,
            price: finalPrice, // Precio que se usa para calcular (con descuento si aplica)
            originalPrice: originalPrice, // Precio original del producto
            finalPrice: finalPrice, // Precio final (con descuento si aplica)
            hasDiscount: hasDiscount,
            discountPercentage: discountPercentage,
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
    
    const cartFooter = document.getElementById('cartFooter');
    
    // Mostrar mensaje si el carrito está vacío
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-shopping-cart text-4xl mb-3 text-gray-300"></i>
                <p class="text-sm font-medium">Tu carrito está vacío</p>
                <p class="text-xs mt-1">Agrega productos deliciosos para comenzar</p>
            </div>
        `;
        cartTotalElement.textContent = '₡0';
        cartCount.textContent = '0';
        // Ocultar footer cuando el carrito está vacío
        if (cartFooter) {
            cartFooter.classList.add('hidden');
        }
        return;
    }
    
    // Mostrar footer cuando hay productos
    if (cartFooter) {
        cartFooter.classList.remove('hidden');
    }
    
    cart.forEach(item => {
        // Usar originalPrice si existe, sino usar price
        const originalPrice = item.originalPrice || item.price;
        const finalPrice = item.finalPrice || item.price;
        const hasDiscount = item.hasDiscount && originalPrice > finalPrice;
        
        cartTotal += finalPrice * item.quantity;
        totalItems += item.quantity;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'flex items-start gap-3 border-b pb-3 mb-3';
        
        const totalItem = finalPrice * item.quantity;
        const totalOriginal = originalPrice * item.quantity;
        
        let priceHtml = '';
        if (hasDiscount) {
            priceHtml = `
                <div class="flex flex-col items-end flex-shrink-0" style="width: 100px;">
                    <span class="text-xs text-gray-400 line-through mb-1">₡${formatPrice(totalOriginal)}</span>
                    <span class="text-sm font-semibold text-gray-800">₡${formatPrice(totalItem)}</span>
                </div>
            `;
        } else {
            priceHtml = `
                <div class="flex flex-col items-end flex-shrink-0" style="width: 100px;">
                    <span class="text-sm font-semibold text-gray-800">₡${formatPrice(totalItem)}</span>
                </div>
            `;
        }
        
        itemElement.innerHTML = `
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-sm text-gray-800 mb-1">${item.name}</h4>
                ${hasDiscount ? `
                    <div class="text-xs text-gray-400 line-through mb-1">₡${formatPrice(originalPrice)}</div>
                    <div class="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                        <span>₡${formatPrice(finalPrice)} c/u</span>
                        <span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                            -${item.discountPercentage || Math.round(((originalPrice - finalPrice) / originalPrice) * 100)}%
                        </span>
                    </div>
                ` : `
                    <div class="text-xs text-gray-500">
                        <span>₡${formatPrice(finalPrice)} c/u</span>
                    </div>
                `}
            </div>
            <div class="flex items-center justify-center gap-2 flex-shrink-0" style="width: 140px; margin-left: 8px;">
                <button class="cart-btn-decrease" onclick="updateQuantity('${item.name}', -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="w-8 text-center text-sm font-medium">${item.quantity}</span>
                <button class="cart-btn-increase" onclick="updateQuantity('${item.name}', 1)">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="cart-btn-remove" onclick="removeFromCart('${item.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            ${priceHtml}
        `;
        cartItems.appendChild(itemElement);
    });
    
    cartTotalElement.textContent = `₡${formatPrice(cartTotal)}`;
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
