//Variables globales para el sistema de pedidos
let orderCart = [];
let deliveryFee = 1500;
let taxRate = 0.13;

// Función helper para formatear precios con 2 decimales
function formatPrice(price) {
    return parseFloat(price || 0).toLocaleString('es-CR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getActiveReward() {
    const stored = localStorage.getItem('sunsets-active-reward');
    if (!stored) return null;
    try {
        const reward = JSON.parse(stored);
        const isValidType = reward && (
            reward.tipo_promocion === 'descuento' || 
            reward.tipo_promocion === 'descuento_colones' || 
            reward.tipo_promocion === 'descuento_porcentaje'
        );
        if (!isValidType || reward.estado_canje === 'aplicado') {
            return null;
        }
        return reward;
    } catch (error) {
        console.error('Error al parsear recompensa activa:', error);
        return null;
    }
}

function clearActiveReward() {
    localStorage.removeItem('sunsets-active-reward');
}

let activePromotions = [];
let promotionsLoaded = false;
let promotionsLoadingPromise = null;

function normalizePromotion(promo) {
    const porcentaje = Number(
        promo?.porcentaje_descuento ??
        promo?.valor_descuento ??
        promo?.porcentaje ??
        promo?.valor ??
        0
    );

    let productos = [];
    if (Array.isArray(promo?.productos)) {
        productos = promo.productos
            .map((producto) => Number(producto?.id_producto ?? producto?.id ?? producto))
            .filter((id) => !Number.isNaN(id));
    }

    return {
        id: Number(promo?.id_promocion ?? promo?.id ?? 0),
        nombre: promo?.nombre_promocion ?? promo?.nombre ?? 'Promoción',
        descripcion: promo?.descripcion ?? '',
        alcance: promo?.alcance === 'producto' ? 'producto' : 'general',
        porcentaje: porcentaje > 0 ? porcentaje : 0,
        productos
    };
}

async function loadActivePromotions() {
    if (promotionsLoaded) {
        return activePromotions;
    }

    if (promotionsLoadingPromise) {
        return promotionsLoadingPromise;
    }

    promotionsLoadingPromise = (async () => {
        try {
            const response = await fetch('/api/promociones/public/activas');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const promociones = data?.data?.promociones || data?.promociones || [];
            activePromotions = Array.isArray(promociones)
                ? promociones
                    .map(normalizePromotion)
                    .filter((promo) => promo.porcentaje > 0)
                : [];
        } catch (error) {
            console.error('Error al cargar promociones activas:', error);
            activePromotions = [];
        } finally {
            promotionsLoaded = true;
            promotionsLoadingPromise = null;
        }

        return activePromotions;
    })();

    return promotionsLoadingPromise;
}

function calculatePromotionsDiscount(subtotal, cartItems, promotions) {
    if (!Array.isArray(cartItems) || cartItems.length === 0 || !Array.isArray(promotions) || promotions.length === 0) {
        return { discount: 0, breakdown: [] };
    }

    // Crear un mapa de productos con descuento individual
    const productosConDescuentoIndividual = new Set();
    cartItems.forEach((item) => {
        if (item && item.hasDiscount && item.originalPrice && item.finalPrice) {
            const originalPrice = Number(item.originalPrice) || 0;
            const finalPrice = Number(item.finalPrice) || 0;
            if (originalPrice > finalPrice) {
                const productId = Number(item.id);
                if (!Number.isNaN(productId)) {
                    productosConDescuentoIndividual.add(productId);
                }
            }
        }
    });

    // Mapa de subtotales por producto usando precio ORIGINAL (sin descuento individual)
    const subtotalByProduct = new Map();

    cartItems.forEach((item) => {
        if (!item) return;
        const quantity = Number(item.quantity);
        // Usar precio original para calcular promociones
        const originalPrice = Number(item.originalPrice || item.price);
        if (Number.isNaN(quantity) || Number.isNaN(originalPrice) || quantity <= 0 || originalPrice < 0) {
            return;
        }

        const lineSubtotal = originalPrice * quantity;
        const productId = Number(item.id);

        if (!Number.isNaN(productId)) {
            subtotalByProduct.set(productId, (subtotalByProduct.get(productId) || 0) + lineSubtotal);
        }
    });

    let totalDiscount = 0;
    const breakdown = [];

    promotions.forEach((promo) => {
        if (!promo || promo.porcentaje <= 0) {
            return;
        }

        const porcentaje = promo.porcentaje / 100;
        let applicableSubtotal = 0;

        if (promo.alcance === 'producto') {
            if (!Array.isArray(promo.productos) || promo.productos.length === 0) {
                return;
            }

            // Filtrar productos que ya tienen descuento individual
            // Si todos los productos de la promoción tienen descuento individual, no aplicar la promoción
            const productosAplicables = promo.productos.filter((productId) => {
                return !productosConDescuentoIndividual.has(Number(productId));
            });

            if (productosAplicables.length === 0) {
                // Todos los productos ya tienen descuento individual, saltar esta promoción
                return;
            }

            productosAplicables.forEach((productId) => {
                const subtotalProducto = subtotalByProduct.get(Number(productId));
                if (subtotalProducto) {
                    applicableSubtotal += subtotalProducto;
                }
            });
        } else {
            // Para promociones generales, calcular sobre productos sin descuento individual
            cartItems.forEach((item) => {
                if (!item) return;
                const productId = Number(item.id);
                // Solo incluir productos sin descuento individual
                if (!Number.isNaN(productId) && !productosConDescuentoIndividual.has(productId)) {
                    const originalPrice = Number(item.originalPrice || item.price);
                    const quantity = Number(item.quantity);
                    if (!Number.isNaN(originalPrice) && !Number.isNaN(quantity) && originalPrice > 0 && quantity > 0) {
                        applicableSubtotal += originalPrice * quantity;
                    }
                }
            });
        }

        if (applicableSubtotal <= 0) {
            return;
        }

        const discountAmount = applicableSubtotal * porcentaje;

        if (discountAmount <= 0) {
            return;
        }

        totalDiscount += discountAmount;
        breakdown.push({
            label: promo.nombre,
            amount: discountAmount,
            alcance: promo.alcance
        });
    });

    if (totalDiscount > subtotal) {
        totalDiscount = subtotal;
    }

    return {
        discount: totalDiscount,
        breakdown
    };
}

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
        
        // Obtener precios original y con descuento
        const originalPrice = item.originalPrice || item.price;
        const finalPrice = item.finalPrice || item.price;
        const hasDiscount = item.hasDiscount && originalPrice > finalPrice;
        
        let priceHtml = '';
        if (hasDiscount) {
            const totalOriginal = originalPrice * item.quantity;
            const totalFinal = finalPrice * item.quantity;
            priceHtml = `
                <div class="text-right w-32">
                    <div class="text-xs text-gray-400 line-through">₡${formatPrice(totalOriginal)}</div>
                    <div class="text-black-600 font-semibold">₡${formatPrice(totalFinal)}</div>
                    <div class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">
                        -${item.discountPercentage || Math.round(((originalPrice - finalPrice) / originalPrice) * 100)}%
                    </div>
                </div>
            `;
        } else {
            priceHtml = `
                <div class="text-right w-24">
                    <p class="font-semibold">₡${formatPrice(finalPrice * item.quantity)}</p>
                </div>
            `;
        }
        
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
                ${priceHtml}
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

    await loadActivePromotions();

    // Calcular subtotal con precio original (sin descuentos de producto)
    const subtotalOriginal = orderCart.reduce((sum, item) => {
        const originalPrice = item.originalPrice || item.price;
        return sum + (originalPrice * item.quantity);
    }, 0);
    
    // Calcular subtotal con precio final (con descuentos de producto aplicados)
    const subtotalConDescuentos = orderCart.reduce((sum, item) => {
        const finalPrice = item.finalPrice || item.price;
        return sum + (finalPrice * item.quantity);
    }, 0);
    
    // Descuento por descuentos de productos
    const descuentoProductos = subtotalOriginal - subtotalConDescuentos;
    
    // Calcular descuentos de promociones (esta función ahora excluye productos con descuento individual)
    // Usar subtotal original para calcular, pero la función ya filtra productos con descuento individual
    const { discount: promotionsDiscountRaw, breakdown: promotionsBreakdown } = calculatePromotionsDiscount(subtotalOriginal, orderCart, activePromotions);
    
    // El descuento de promociones se aplica sobre el subtotal con descuentos de productos
    // pero solo sobre productos que NO tienen descuento individual
    const promotionsDiscount = Math.min(subtotalConDescuentos, promotionsDiscountRaw || 0);
    const subtotalAfterPromotions = Math.max(0, subtotalConDescuentos - promotionsDiscount);

    const activeReward = getActiveReward();
    let rewardDiscount = 0;
    
    // Calcular descuento de recompensa si existe
    if (activeReward && activeReward.valor_canje) {
        // Calcular descuento según el tipo de recompensa
        // Verificar tanto tipo_promocion (de localStorage) como tipo (de order.rewardCanje)
        const rewardType = activeReward.tipo_promocion || activeReward.tipo;
        if (rewardType === 'descuento_porcentaje') {
            // Para porcentajes, calcular sobre el subtotal después de promociones
            const porcentaje = Number(activeReward.valor_canje) / 100;
            rewardDiscount = subtotalAfterPromotions * porcentaje;
        } else {
            // Para descuentos fijos, usar el valor directamente pero limitado al subtotal
            rewardDiscount = Math.min(Number(activeReward.valor_canje), subtotalAfterPromotions);
        }
    }

    summaryContainer.innerHTML = '';

    orderCart.forEach((item) => {
        const originalPrice = item.originalPrice || item.price;
        const finalPrice = item.finalPrice || item.price;
        const hasDiscount = item.hasDiscount && originalPrice > finalPrice;
        const itemTotalOriginal = originalPrice * item.quantity;
        const itemTotalFinal = finalPrice * item.quantity;
        
        const itemRow = document.createElement('div');
        itemRow.className = 'flex justify-between';
        
        if (hasDiscount) {
            itemRow.innerHTML = `
                <span class="text-gray-600">${item.name} x${item.quantity}</span>
                <div class="text-right">
                    <span class="text-xs text-gray-400 line-through">₡${formatPrice(itemTotalOriginal)}</span>
                    <span class="text-black-600 ml-2">₡${formatPrice(itemTotalFinal)}</span>
                </div>
            `;
        } else {
            itemRow.innerHTML = `
                <span class="text-gray-600">${item.name} x${item.quantity}</span>
                <span>₡${formatPrice(itemTotalFinal)}</span>
            `;
        }
        summaryContainer.appendChild(itemRow);
    });

    const separator1 = document.createElement('hr');
    separator1.className = 'my-3';
    summaryContainer.appendChild(separator1);

    // Mostrar subtotal con descuentos de productos aplicados
    const subtotalRow = document.createElement('div');
    subtotalRow.className = 'flex justify-between font-semibold text-lg';
    subtotalRow.innerHTML = `
        <span>Subtotal</span>
        <span>₡${formatPrice(subtotalConDescuentos)}</span>
    `;
    summaryContainer.appendChild(subtotalRow);

    const separatorSubtotal = document.createElement('hr');
    separatorSubtotal.className = 'my-3';
    summaryContainer.appendChild(separatorSubtotal);

    if (promotionsBreakdown.length > 0) {
        promotionsBreakdown.forEach((promo) => {
            const promoRow = document.createElement('div');
            promoRow.className = 'flex justify-between text-green-600 font-semibold';
            promoRow.innerHTML = `
                <span>${promo.label}</span>
                <span>-₡${formatPrice(promo.amount)}</span>
            `;
            summaryContainer.appendChild(promoRow);
        });
    }

    // Mostrar descuento de recompensa antes de costo de entrega e impuestos
    if (rewardDiscount > 0 && activeReward) {
        const rewardRow = document.createElement('div');
        rewardRow.className = 'flex justify-between text-green-600 font-semibold';
        rewardRow.innerHTML = `
            <span>Descuento ${activeReward.nombre || 'por puntos'}</span>
            <span>-₡${formatPrice(rewardDiscount)}</span>
        `;
        summaryContainer.appendChild(rewardRow);
    }

    // Calcular subtotal después de aplicar el descuento de recompensa
    const subtotalAfterReward = Math.max(0, subtotalAfterPromotions - rewardDiscount);

    const deliveryRow = document.createElement('div');
    deliveryRow.className = 'flex justify-between';
    deliveryRow.innerHTML = `
        <span class="text-gray-600">Costo de entrega</span>
        <span>₡${formatPrice(deliveryFee)}</span>
    `;
    summaryContainer.appendChild(deliveryRow);

    // Calcular impuestos sobre el subtotal DESPUÉS de aplicar el descuento de recompensa
    const taxes = subtotalAfterReward * taxRate;
    const taxRow = document.createElement('div');
    taxRow.className = 'flex justify-between';
    taxRow.innerHTML = `
        <span class="text-gray-600">Impuestos</span>
        <span>₡${formatPrice(taxes)}</span>
    `;
    summaryContainer.appendChild(taxRow);

    const separator3 = document.createElement('hr');
    separator3.className = 'my-3';
    summaryContainer.appendChild(separator3);

    // Calcular el total: subtotal después de recompensa + deliveryFee + taxes
    let total = Math.max(0, subtotalAfterReward + deliveryFee + taxes);

    // Calcular el total original (sin descuentos) para mostrarlo tachado si hay descuentos
    const taxesOriginal = subtotalOriginal * taxRate;
    const totalOriginal = subtotalOriginal + deliveryFee + taxesOriginal;

    // Verificar si hay algún descuento aplicado
    const hasAnyDiscount = descuentoProductos > 0 || promotionsDiscount > 0 || rewardDiscount > 0;

    // Opción de descuento por puntos de lealtad removida
    let loyaltyDiscount = 0;
    const totalBeforeLoyaltyValue = total;

    const totalRow = document.createElement('div');
    totalRow.className = 'flex justify-between font-semibold text-lg';
    
    if (hasAnyDiscount && totalOriginal > total) {
        totalRow.innerHTML = `
            <span>Total</span>
            <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 line-through">₡${formatPrice(totalOriginal)}</span>
                <span id="orderTotal" class="text-gray-900">₡${formatPrice(total)}</span>
            </div>
        `;
    } else {
        totalRow.innerHTML = `
            <span>Total</span>
            <span id="orderTotal">₡${formatPrice(total)}</span>
        `;
    }
    summaryContainer.appendChild(totalRow);

    window.currentOrderTotals = {
        subtotal: subtotalConDescuentos,
        subtotalOriginal: subtotalOriginal,
        descuentoProductos: descuentoProductos,
        subtotalAfterPromotions,
        subtotalAfterReward,
        taxes,
        deliveryFee,
        promotionDiscount: promotionsDiscount,
        promotionsApplied: promotionsBreakdown.map((promo) => ({
            label: promo.label,
            amount: promo.amount,
            alcance: promo.alcance
        })),
        rewardDiscount,
        loyaltyDiscount,
        totalBeforeLoyalty: totalBeforeLoyaltyValue,
        total
    };

    // Calcular puntos basándose en el total final (después de todos los descuentos)
    // Los puntos se calculan sobre el total pagado, no sobre el subtotal
    await updateLoyaltyInfo(total);
}

// Función reutilizable para calcular y renderizar el resumen del pedido
// Puede ser usada desde pago.html y confirmacion.html
async function renderOrderSummaryHTML(cartItems, containerId, options = {}) {
    const summaryContainer = document.getElementById(containerId);
    if (!summaryContainer) {
        console.error(`Container with id "${containerId}" not found`);
        return null;
    }

    await loadActivePromotions();

    // Calcular subtotal con precio original (sin descuentos de producto)
    const subtotalOriginal = cartItems.reduce((sum, item) => {
        const originalPrice = item.originalPrice || item.price;
        return sum + (originalPrice * item.quantity);
    }, 0);
    
    // Calcular subtotal con precio final (con descuentos de producto aplicados)
    const subtotalConDescuentos = cartItems.reduce((sum, item) => {
        const finalPrice = item.finalPrice || item.price;
        return sum + (finalPrice * item.quantity);
    }, 0);
    
    // Descuento por descuentos de productos
    const descuentoProductos = subtotalOriginal - subtotalConDescuentos;
    
    // Calcular descuentos de promociones
    const { discount: promotionsDiscountRaw, breakdown: promotionsBreakdown } = calculatePromotionsDiscount(subtotalOriginal, cartItems, activePromotions);
    
    // El descuento de promociones se aplica sobre el subtotal con descuentos de productos
    const promotionsDiscount = Math.min(subtotalConDescuentos, promotionsDiscountRaw || 0);
    const subtotalAfterPromotions = Math.max(0, subtotalConDescuentos - promotionsDiscount);

    // Usar deliveryFee del archivo o el proporcionado en options
    const deliveryFeeToUse = options.deliveryFee !== undefined ? options.deliveryFee : deliveryFee;
    
    // Manejar recompensas si están en options (ANTES de calcular impuestos)
    let rewardDiscount = 0;
    const activeReward = options.activeReward || getActiveReward();
    
    // PRIORIDAD: Si rewardDiscount ya viene calculado en options, usarlo directamente
    // Esto evita cualquier recálculo incorrecto, especialmente para recompensas en porcentaje
    if (options.rewardDiscount !== undefined && options.rewardDiscount !== null) {
        // Si ya viene calculado en options, usarlo directamente (ya está en colones)
        rewardDiscount = Number(options.rewardDiscount);
    } else if (activeReward && activeReward.valor_canje) {
        // Solo calcular si no se proporcionó rewardDiscount en options
        // Calcular descuento según el tipo de recompensa
        // Verificar tanto tipo_promocion (de localStorage) como tipo (de order.rewardCanje)
        const rewardType = activeReward.tipo_promocion || activeReward.tipo;
        if (rewardType === 'descuento_porcentaje') {
            // Para porcentajes, calcular sobre el subtotal después de promociones
            const porcentaje = Number(activeReward.valor_canje) / 100;
            rewardDiscount = subtotalAfterPromotions * porcentaje;
        } else {
            // Para descuentos fijos, usar el valor directamente pero limitado al subtotal
            rewardDiscount = Math.min(Number(activeReward.valor_canje), subtotalAfterPromotions);
        }
    }
    
    // Calcular subtotal después de aplicar el descuento de recompensa
    const subtotalAfterReward = Math.max(0, subtotalAfterPromotions - rewardDiscount);
    
    // Usar taxRate del archivo o el proporcionado en options
    const taxRateToUse = options.taxRate !== undefined ? options.taxRate : taxRate;
    // Calcular impuestos sobre el subtotal DESPUÉS de aplicar el descuento de recompensa
    const taxes = subtotalAfterReward * taxRateToUse;
    
    // Calcular el total: subtotal después de recompensa + deliveryFee + taxes
    let total = Math.max(0, subtotalAfterReward + deliveryFeeToUse + taxes);

    summaryContainer.innerHTML = '';

    // Renderizar items
    cartItems.forEach((item) => {
        const originalPrice = item.originalPrice || item.price;
        const finalPrice = item.finalPrice || item.price;
        const hasDiscount = item.hasDiscount && originalPrice > finalPrice;
        const itemTotalOriginal = originalPrice * item.quantity;
        const itemTotalFinal = finalPrice * item.quantity;
        
        const itemRow = document.createElement('div');
        itemRow.className = 'flex justify-between';
        
        if (hasDiscount) {
            itemRow.innerHTML = `
                <span class="text-gray-600">${item.name} x${item.quantity}</span>
                <div class="text-right">
                    <span class="text-xs text-gray-400 line-through">₡${formatPrice(itemTotalOriginal)}</span>
                    <span class="text-black-600 ml-2">₡${formatPrice(itemTotalFinal)}</span>
                </div>
            `;
        } else {
            itemRow.innerHTML = `
                <span class="text-gray-600">${item.name} x${item.quantity}</span>
                <span>₡${formatPrice(itemTotalFinal)}</span>
            `;
        }
        summaryContainer.appendChild(itemRow);
    });

    const separator1 = document.createElement('hr');
    separator1.className = 'my-3';
    summaryContainer.appendChild(separator1);

    // Mostrar subtotal con descuentos de productos aplicados
    const subtotalRow = document.createElement('div');
    subtotalRow.className = 'flex justify-between font-semibold text-lg';
    subtotalRow.innerHTML = `
        <span>Subtotal</span>
        <span>₡${formatPrice(subtotalConDescuentos)}</span>
    `;
    summaryContainer.appendChild(subtotalRow);

    const separatorSubtotal = document.createElement('hr');
    separatorSubtotal.className = 'my-3';
    summaryContainer.appendChild(separatorSubtotal);

    if (promotionsBreakdown.length > 0) {
        promotionsBreakdown.forEach((promo) => {
            const promoRow = document.createElement('div');
            promoRow.className = 'flex justify-between text-green-600 font-semibold';
            promoRow.innerHTML = `
                <span>${promo.label}</span>
                <span>-₡${formatPrice(promo.amount)}</span>
            `;
            summaryContainer.appendChild(promoRow);
        });
    }

    // Mostrar descuento de recompensa antes de costo de entrega e impuestos
    if (rewardDiscount > 0) {
        const rewardRow = document.createElement('div');
        rewardRow.className = 'flex justify-between text-green-600 font-semibold';
        rewardRow.innerHTML = `
            <span>Descuento ${options.rewardName || 'por puntos'}</span>
            <span>-₡${formatPrice(rewardDiscount)}</span>
        `;
        summaryContainer.appendChild(rewardRow);
    }

    const deliveryRow = document.createElement('div');
    deliveryRow.className = 'flex justify-between';
    deliveryRow.innerHTML = `
        <span class="text-gray-600">Costo de entrega</span>
        <span>₡${formatPrice(deliveryFeeToUse)}</span>
    `;
    summaryContainer.appendChild(deliveryRow);

    const taxRow = document.createElement('div');
    taxRow.className = 'flex justify-between';
    taxRow.innerHTML = `
        <span class="text-gray-600">Impuestos</span>
        <span>₡${formatPrice(taxes)}</span>
    `;
    summaryContainer.appendChild(taxRow);

    const separator3 = document.createElement('hr');
    separator3.className = 'my-3';
    summaryContainer.appendChild(separator3);

    // Calcular el total original (sin descuentos) para mostrarlo tachado si hay descuentos
    const taxesOriginal = subtotalOriginal * taxRateToUse;
    const totalOriginal = subtotalOriginal + deliveryFeeToUse + taxesOriginal;

    // Verificar si hay algún descuento aplicado
    const hasAnyDiscount = descuentoProductos > 0 || promotionsDiscount > 0 || rewardDiscount > 0;

    const totalRow = document.createElement('div');
    totalRow.className = 'flex justify-between font-semibold text-lg';
    
    if (hasAnyDiscount && totalOriginal > total) {
        totalRow.innerHTML = `
            <span>Total</span>
            <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 line-through">₡${formatPrice(totalOriginal)}</span>
                <span class="text-gray-900">₡${formatPrice(total)}</span>
            </div>
        `;
    } else {
        totalRow.innerHTML = `
            <span>Total</span>
            <span>₡${formatPrice(total)}</span>
        `;
    }
    summaryContainer.appendChild(totalRow);

    return {
        subtotal: subtotalConDescuentos,
        subtotalOriginal: subtotalOriginal,
        descuentoProductos: descuentoProductos,
        subtotalAfterPromotions,
        taxes,
        deliveryFee: deliveryFeeToUse,
        promotionDiscount: promotionsDiscount,
        promotionsApplied: promotionsBreakdown.map((promo) => ({
            label: promo.label,
            amount: promo.amount,
            alcance: promo.alcance
        })),
        rewardDiscount,
        total,
        html: summaryContainer.innerHTML
    };
}

// Función para generar HTML del resumen como string (para confirmacion.html)
async function generateOrderSummaryHTML(cartItems, options = {}) {
    // Crear un contenedor temporal
    const tempContainer = document.createElement('div');
    tempContainer.id = 'temp-summary-container';
    document.body.appendChild(tempContainer);
    
    try {
        const result = await renderOrderSummaryHTML(cartItems, 'temp-summary-container', options);
        const html = tempContainer.innerHTML;
        document.body.removeChild(tempContainer);
        return html;
    } catch (error) {
        document.body.removeChild(tempContainer);
        throw error;
    }
}

//Función para obtener puntos del usuario logueado
async function getUserLoyaltyPoints() {
    try {
        // Usar la clave estándar 'authToken' definida en auth.js
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
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
            loyaltyLabel.textContent = `Usar ${pointsNeeded} puntos de lealtad (-₡${formatPrice(discountAmount)})`;
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
async function placeOrder() {
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
    
    await updateOrderSummary();

    const fallbackTotals = (() => {
        const subtotalFallback = orderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxesFallback = subtotalFallback * taxRate;
        const totalBeforeRewardsFallback = subtotalFallback + deliveryFee + taxesFallback;
        return {
            subtotal: subtotalFallback,
            subtotalAfterPromotions: subtotalFallback,
            taxes: taxesFallback,
            deliveryFee,
            promotionDiscount: 0,
            promotionsApplied: [],
            rewardDiscount: 0,
            loyaltyDiscount: 0,
            totalBeforeRewards: totalBeforeRewardsFallback,
            totalBeforeLoyalty: totalBeforeRewardsFallback,
            total: totalBeforeRewardsFallback
        };
    })();

    const orderTotals = window.currentOrderTotals || fallbackTotals;

    const activeReward = getActiveReward();

    const order = {
        items: orderCart,
        customer: orderData.customer,
        delivery: orderData.delivery,
        subtotal: orderTotals.subtotal,
        subtotalAfterPromotions: orderTotals.subtotalAfterPromotions ?? orderTotals.subtotal,
        deliveryFee: orderTotals.deliveryFee,
        taxes: orderTotals.taxes,
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
                totalElement.textContent = `₡${formatPrice(discountedTotal)}`;
            } else {
                totalElement.textContent = `₡${formatPrice(total)}`;
            }
        });
    }
}

//Funciones globales para onclick
window.updateOrderQuantity = updateOrderQuantity;
window.removeOrderItem = removeOrderItem;
window.placeOrder = placeOrder;
window.renderOrderSummaryHTML = renderOrderSummaryHTML;
window.generateOrderSummaryHTML = generateOrderSummaryHTML;
window.formatPrice = formatPrice; // Hacer formatPrice disponible globalmente
window.loadActivePromotions = loadActivePromotions; // Hacer loadActivePromotions disponible globalmente
window.calculatePromotionsDiscount = calculatePromotionsDiscount; // Hacer calculatePromotionsDiscount disponible globalmente

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
