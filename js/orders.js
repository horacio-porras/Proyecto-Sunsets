//Variables globales para el sistema de pedidos
let orderCart = [];
let deliveryFee = 1500;
let taxRate = 0.05;

//Función para cargar el carrito desde localStorage
async function loadOrderCart() {
    const savedCart = localStorage.getItem('sunsets-cart');
    
    if (savedCart) {
        try {
            orderCart = JSON.parse(savedCart);
            renderOrderCart();
            await updateOrderSummary();
        } catch (error) {
            console.error('Error al cargar carrito:', error);
            orderCart = [];
        }
    }
    
    if (orderCart.length === 0) {
        showEmptyCart();
    }
}

//Función para mostrar mensaje de carrito vacío
function showEmptyCart() {
    const mainContent = document.querySelector('.max-w-6xl');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="text-center py-16">
                <div class="bg-white rounded-lg shadow-md p-12">
                    <i class="fas fa-shopping-cart text-6xl text-gray-300 mb-6"></i>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-4">Tu carrito está vacío</h2>
                    <p class="text-gray-600 mb-8">Agrega algunos productos deliciosos antes de continuar con tu pedido.</p>
                    <a href="/menu.html" class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition font-semibold">
                        Ver Menú
                    </a>
                </div>
            </div>
        `;
    }
}

//Función para renderizar el carrito en la página de pedidos
function renderOrderCart() {
    const cartItemsContainer = document.getElementById('order-cart-items');
    
    if (!cartItemsContainer) {
        return;
    }
    
    cartItemsContainer.innerHTML = '';
    
    if (orderCart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-shopping-cart text-4xl mb-4"></i>
                <p>No hay productos en tu carrito</p>
            </div>
        `;
        return;
    }
    
    orderCart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'flex items-center space-x-4';
        
        const dietaryBadges = createDietaryBadges(item.dietary);
        
        const hasValidImage = item.image && item.image.trim() !== '';
        const imageHtml = hasValidImage
            ? `<img src="${item.image}" alt="${item.name}" class="w-20 h-20 rounded-lg object-cover">`
            : `<div class="w-20 h-20 bg-gray-300 rounded-lg flex items-center justify-center">
                 <i class="fas fa-image text-gray-500 text-xl"></i>
               </div>`;
        
        cartItem.innerHTML = `
            ${imageHtml}
            <div class="flex-1 min-w-0">
                <h3 class="font-semibold">${item.name}</h3>
                <p class="text-sm text-gray-600 max-w-xs truncate" title="${item.description || 'No hay descripción'}">${item.description || 'No hay descripción'}</p>
                <div class="flex items-center space-x-2 mt-2">
                    ${dietaryBadges}
                </div>
            </div>
            <div class="flex items-center space-x-4 flex-shrink-0">
                <div class="flex items-center gap-2 w-32 justify-center">
                    <button class="cart-btn-decrease" onclick="updateOrderQuantity(${index}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="w-8 text-center">${item.quantity}</span>
                    <button class="cart-btn-increase" onclick="updateOrderQuantity(${index}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="cart-btn-remove" onclick="removeOrderItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="text-right w-24">
                    <p class="font-semibold">₡${(item.price * item.quantity).toLocaleString()}</p>
                </div>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItem);
    });
    
    const cartTitle = document.querySelector('.bg-white.rounded-lg.shadow-md .text-xl.font-semibold');
    if (cartTitle) {
        const totalItems = orderCart.reduce((sum, item) => sum + item.quantity, 0);
        cartTitle.textContent = `Tu Carrito (${totalItems} ${totalItems === 1 ? 'item' : 'items'})`;
    }
}

//Función para crear badges dietéticos
function createDietaryBadges(dietary) {
    const badges = [];
    
    if (dietary.vegetariano) {
        badges.push('<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Vegetariano</span>');
    }
    if (dietary.vegano) {
        badges.push('<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Vegano</span>');
    }
    if (dietary.sinGluten) {
        badges.push('<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Sin Gluten</span>');
    }
    
    return badges.join('');
}

//Función para actualizar cantidad de un item en el carrito
async function updateOrderQuantity(index, change) {
    if (index < 0 || index >= orderCart.length) return;
    
    orderCart[index].quantity += change;
    
    if (orderCart[index].quantity <= 0) {
        orderCart.splice(index, 1);
    }
    
    localStorage.setItem('sunsets-cart', JSON.stringify(orderCart));
    
    renderOrderCart();
    await updateOrderSummary();
    
    if (orderCart.length === 0) {
        showEmptyCart();
    }
}

//Función para eliminar un item del carrito
async function removeOrderItem(index) {
    if (index < 0 || index >= orderCart.length) return;
    
    orderCart.splice(index, 1);
    
    localStorage.setItem('sunsets-cart', JSON.stringify(orderCart));
    
    renderOrderCart();
    await updateOrderSummary();
    
    if (orderCart.length === 0) {
        showEmptyCart();
    }
}

//Función para actualizar el resumen del pedido
async function updateOrderSummary() {
    const summaryContainer = document.getElementById('order-summary');
    if (!summaryContainer) return;
    
    const subtotal = orderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxes = subtotal * taxRate;
    const total = subtotal + deliveryFee + taxes;
    
    summaryContainer.innerHTML = '';
    
    orderCart.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'flex justify-between';
        itemRow.innerHTML = `
            <span class="text-gray-600">${item.name} x${item.quantity}</span>
            <span>₡${(item.price * item.quantity).toLocaleString()}</span>
        `;
        summaryContainer.appendChild(itemRow);
    });
    
    const separator1 = document.createElement('hr');
    separator1.className = 'my-3';
    summaryContainer.appendChild(separator1);
    
    const subtotalRow = document.createElement('div');
    subtotalRow.className = 'flex justify-between';
    subtotalRow.innerHTML = `
        <span class="text-gray-600">Subtotal</span>
        <span>₡${subtotal.toLocaleString()}</span>
    `;
    summaryContainer.appendChild(subtotalRow);
    
    const deliveryRow = document.createElement('div');
    deliveryRow.className = 'flex justify-between';
    deliveryRow.innerHTML = `
        <span class="text-gray-600">Costo de entrega</span>
        <span>₡${deliveryFee.toLocaleString()}</span>
    `;
    summaryContainer.appendChild(deliveryRow);
    
    const taxRow = document.createElement('div');
    taxRow.className = 'flex justify-between';
    taxRow.innerHTML = `
        <span class="text-gray-600">Impuestos</span>
        <span>₡${Math.round(taxes).toLocaleString()}</span>
    `;
    summaryContainer.appendChild(taxRow);
    
    const separator2 = document.createElement('hr');
    separator2.className = 'my-3';
    summaryContainer.appendChild(separator2);
    
    const totalRow = document.createElement('div');
    totalRow.className = 'flex justify-between font-semibold text-lg';
    totalRow.innerHTML = `
        <span>Total</span>
        <span id="orderTotal">₡${Math.round(total).toLocaleString()}</span>
    `;
    summaryContainer.appendChild(totalRow);
    
    await updateLoyaltyInfo(subtotal);
}

//Función para obtener puntos del usuario logueado
async function getUserLoyaltyPoints() {
    try {
        // Usar la clave estándar 'authToken' definida en auth.js
        const token = localStorage.getItem('authToken');
        console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');

        if (!token) {
            console.log('⚠️ No hay token de autenticación');
            return 0;
        }
        
        const response = await fetch('/api/cliente/puntos', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Respuesta API puntos:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Datos de puntos recibidos:', data);
            return data.puntos_acumulados || 0;
        } else {
            const errorData = await response.text();
            console.error('Error al obtener puntos de lealtad:', response.status, errorData);
            return 0;
        }
    } catch (error) {
        console.error('Error de conexión al obtener puntos de lealtad:', error);
        return 0;
    }
}

//Función para actualizar información de puntos de lealtad
async function updateLoyaltyInfo(subtotal) {
    const pointsToEarn = Math.floor(subtotal / 100);
    
    const userPoints = await getUserLoyaltyPoints();
    
    const loyaltyPointsAvailable = document.getElementById('loyalty-points-available');
    if (loyaltyPointsAvailable) {
        loyaltyPointsAvailable.textContent = userPoints.toLocaleString();
    }
    
    const loyaltyPointsToEarn = document.getElementById('loyalty-points-to-earn');
    if (loyaltyPointsToEarn) {
        loyaltyPointsToEarn.textContent = `Ganarás ${pointsToEarn} puntos con este pedido`;
    }
    
    const loyaltySections = document.querySelectorAll('.bg-white.rounded-lg.shadow-md.p-6');
    loyaltySections.forEach(section => {
        const paragraphs = section.querySelectorAll('p');
        paragraphs.forEach(p => {
            if (p.textContent.includes('Ganarás') && !p.id) {
                p.textContent = `Ganarás ${pointsToEarn} puntos con este pedido`;
            }
        });
    });
    
    updateLoyaltyCheckbox(userPoints);
}

//Función para actualizar el checkbox de lealtad con los puntos del usuario
function updateLoyaltyCheckbox(userPoints) {
    const loyaltyCheckbox = document.getElementById('loyalty');
    const loyaltyLabel = document.querySelector('label[for="loyalty"]');
    
    if (loyaltyCheckbox && loyaltyLabel) {
        const pointsNeeded = 500;
        const discountAmount = 2500;
        
        if (userPoints >= pointsNeeded) {
            loyaltyCheckbox.disabled = false;
            loyaltyLabel.textContent = `Usar ${pointsNeeded} puntos de lealtad (-₡${discountAmount.toLocaleString()})`;
            loyaltyLabel.style.color = '#374151';
            
            const pointsInfo = loyaltyLabel.parentElement.querySelector('.points-info');
            if (!pointsInfo) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'points-info text-xs text-gray-500 mt-1';
                infoDiv.textContent = `Puntos disponibles: ${userPoints}`;
                loyaltyLabel.parentElement.appendChild(infoDiv);
            }
        } else {
            loyaltyCheckbox.disabled = true;
            loyaltyCheckbox.checked = false;
            loyaltyLabel.textContent = `Puntos insuficientes (necesitas ${pointsNeeded}, tienes ${userPoints})`;
            loyaltyLabel.style.color = '#9CA3AF';
            
            const pointsInfo = loyaltyLabel.parentElement.querySelector('.points-info');
            if (pointsInfo) {
                pointsInfo.remove();
            }
        }
    }
}

//Función para procesar el pedido
function placeOrder() {
    if (orderCart.length === 0) {
        alert('Tu carrito está vacío. Agrega algunos productos antes de continuar.');
        return;
    }
    
    if (typeof validateOrderForm === 'function' && !validateOrderForm()) {
        return;
    }
    
    const orderData = typeof getOrderData === 'function' ? getOrderData() : null;
    if (!orderData) {
        alert('Error al obtener los datos del pedido. Por favor intenta de nuevo.');
        return;
    }
    
    const order = {
        items: orderCart,
        customer: orderData.customer,
        delivery: orderData.delivery,
        subtotal: orderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        deliveryFee: deliveryFee,
        taxes: orderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * taxRate,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    order.total = order.subtotal + order.deliveryFee + order.taxes;
    
    console.log('Datos del pedido preparados:', order);
    
    localStorage.setItem('sunsets-order-data', JSON.stringify(order));
    
    window.location.href = '/pago.html';
}

//Función para validar el formulario de entrega
function validateDeliveryForm() {
    const name = document.querySelector('input[type="text"]').value.trim();
    const phone = document.querySelector('input[type="tel"]').value.trim();
    const address = document.querySelector('select').value.trim();
    const instructions = document.querySelector('textarea').value.trim();
    
    if (!name) {
        alert('Por favor ingresa tu nombre completo.');
        return null;
    }
    
    if (!phone) {
        alert('Por favor ingresa tu número de teléfono.');
        return null;
    }
    
    if (!address) {
        alert('Por favor selecciona una dirección de entrega.');
        return null;
    }
    
    return {
        name: name,
        phone: phone,
        address: address,
        instructions: instructions
    };
}

//Función para generar ID de pedido
function generateOrderId() {
    return Math.floor(10000 + Math.random() * 90000);
}

//Función para verificar si el usuario está autenticado
function isUserLoggedIn() {
    const userData = localStorage.getItem('userData');
    const authToken = localStorage.getItem('authToken');
    return userData && authToken;
}

//Función para manejar la visibilidad de elementos de lealtad
function handleLoyaltyElements() {
    const loyaltyCheckbox = document.getElementById('loyalty');
    const loyaltyLabel = document.querySelector('label[for="loyalty"]');
    
    if (!isUserLoggedIn()) {
        if (loyaltyCheckbox) {
            loyaltyCheckbox.style.display = 'none';
        }
        if (loyaltyLabel) {
            loyaltyLabel.style.display = 'none';
        }
        
        const loyaltySection = document.querySelector('.bg-white.rounded-lg.shadow-md.p-6:last-child');
        if (loyaltySection && loyaltySection.textContent.includes('Programa de Lealtad')) {
            loyaltySection.style.display = 'none';
        }
    }
}

//Función para manejar el toggle de puntos de lealtad
function setupLoyaltyToggle() {
    const loyaltyCheckbox = document.getElementById('loyalty');
    if (loyaltyCheckbox) {
        loyaltyCheckbox.addEventListener('change', function() {
            const totalElement = document.getElementById('orderTotal');
            const subtotal = orderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const taxes = subtotal * taxRate;
            const total = subtotal + deliveryFee + taxes;
            
            if (this.checked) {
                const discount = 2500;
                const discountedTotal = Math.max(0, total - discount);
                totalElement.textContent = `₡${Math.round(discountedTotal).toLocaleString()}`;
            } else {
                totalElement.textContent = `₡${Math.round(total).toLocaleString()}`;
            }
        });
    }
}

//Funciones globales para onclick
window.updateOrderQuantity = updateOrderQuantity;
window.removeOrderItem = removeOrderItem;
window.placeOrder = placeOrder;

//Función para inicializar puntos de lealtad
async function initializeLoyaltyPoints() {
    try {
        const userPoints = await getUserLoyaltyPoints();
        
        const loyaltyPointsAvailable = document.getElementById('loyalty-points-available');
        if (loyaltyPointsAvailable) {
            loyaltyPointsAvailable.textContent = userPoints.toLocaleString();
        }
        
        updateLoyaltyCheckbox(userPoints);
    } catch (error) {
        console.error('Error al inicializar puntos de lealtad:', error);
    }
}

//Inicializa cuando se carga la página
document.addEventListener('DOMContentLoaded', async function() {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/cliente/')) {
        if (typeof verifyFullAuth === 'function' && !verifyFullAuth()) {
            window.location.href = '/';
            return;
        }
        
        if (typeof handleUserChange === 'function') {
            handleUserChange();
        }
        
        await loadOrderCart();
        await initializeLoyaltyPoints();
        handleLoyaltyElements();
        setupLoyaltyToggle();
    } else {
        await loadOrderCart();
        
        const userData = localStorage.getItem('userData');
        const authToken = localStorage.getItem('authToken');
        
        if (userData && authToken) {
            await initializeLoyaltyPoints();
            handleLoyaltyElements();
            setupLoyaltyToggle();
        }
    }
});
