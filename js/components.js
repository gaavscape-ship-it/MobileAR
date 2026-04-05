import { getConfig, getCart, addToCart, updateQuantity } from './store.js';

function formatPrice(amount) {
    const config = getConfig();
    const currency = config?.restaurant?.currency || '₹';
    return `${currency}${amount.toFixed(2)}`;
}

/**
 * Checks whether a menu item has a valid 3D model file.
 * @param {*} model - The model field from a menu item.
 * @returns {boolean} True if model is a non-empty string ending with ".glb".
 */
export function hasValidModel(model) {
    return model && typeof model === 'string' && model.trim() !== '' && model.endsWith('.glb');
}

export function renderCategories(categories, activeCategoryId, onSelect) {
    const container = document.getElementById('category-list');
    if (!container) return;

    container.innerHTML = '';

    // "All" category
    const allItem = document.createElement('div');
    const allIsActive = activeCategoryId === 'all';
    allItem.className = `flex items-center gap-2 px-4 py-2.5 rounded-full shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex-shrink-0 group cursor-pointer category-item transition-all duration-300 ease-in-out ${allIsActive ? 'active bg-slate-800 text-white border border-slate-800' : 'bg-white text-slate-600 border border-transparent hover:bg-slate-50 hover:shadow-md'}`;
    allItem.innerHTML = `
        <span class="material-symbols-outlined text-[18px]">restaurant</span>
        <span class="font-label text-[14px] font-semibold whitespace-nowrap">All</span>
    `;
    allItem.onclick = () => onSelect('all');
    container.appendChild(allItem);

    // Dynamic categories
    categories.forEach(cat => {
        const item = document.createElement('div');
        const isActive = activeCategoryId === cat.id;
        item.className = `flex items-center gap-2 px-4 py-2.5 rounded-full shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex-shrink-0 group cursor-pointer category-item transition-all duration-300 ease-in-out ${isActive ? 'active bg-slate-800 text-white border border-slate-800' : 'bg-white text-slate-600 border border-transparent hover:bg-slate-50 hover:shadow-md'}`;

        // Take the first item's image as category image for simplicity
        const firstImage = cat.items[0]?.image || '';

        const catNameHtml = `<span class="font-label text-[14px] font-semibold whitespace-nowrap">${cat.name}</span>`;

        item.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-slate-100 overflow-hidden group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <img class="w-full h-full object-cover" src="${firstImage}" alt="${cat.name}"/>
            </div>
            ${catNameHtml}
        `;
        item.onclick = () => onSelect(cat.id);
        container.appendChild(item);
    });
}

export function renderMenuItems(categories, activeCategoryId, searchQuery = '', vegOnly = false) {
    const container = document.getElementById('menu-items');
    if (!container) return;

    container.innerHTML = '';
    const query = searchQuery.toLowerCase().trim();
    let hasItems = false;

    categories.forEach(cat => {
        // If there is an active search query, search the whole list (ignore activeCategory filter)
        if (activeCategoryId !== 'all' && cat.id !== activeCategoryId && query === '') return;

        cat.items.forEach(item => {
            if (!item.isAvailable) return;

            if (query) {
                const nameMatch = item.name.toLowerCase().includes(query);
                const descMatch = item.description ? item.description.toLowerCase().includes(query) : false;
                if (!nameMatch && !descMatch) return;
            }

            // Veg filter
            if (vegOnly) {
                const tags = (item.tags || []).map(t => t.toLowerCase());
                const isVeg = tags.some(t => t === 'veg') && !tags.some(t => t.includes('non-veg') || t.includes('non veg'));
                if (!isVeg) return;
            }

            hasItems = true;

            const el = document.createElement('div');
            el.className = 'flex flex-col group food-item';

            function hasValidRating(rating) { return rating !== null && rating !== "" && !isNaN(rating); }

            const itemHasAR = hasValidModel(item.model);

            // Check if there is a specific dietary tag
            const dietaryTag = (item.tags || []).find(tag => {
                const lower = tag.toLowerCase();
                return lower === 'veg' || lower === 'non-veg' || lower === 'non veg';
            });

            // Filter tags: exclude "Veg" and "Non-Veg" — those are shown in the bottom-left badge
            const displayTags = (item.tags || []).filter(tag => {
                const lower = tag.toLowerCase();
                return lower !== 'veg' && lower !== 'non-veg' && lower !== 'non veg';
            });

            const tagBadgesHtml = displayTags.length > 0
                ? `<div class="absolute top-2 right-2 flex flex-row gap-1 z-[5]">
                       ${displayTags.map(tag => `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 text-white shadow-sm">${tag}</span>`).join('')}
                   </div>`
                : '';

            el.innerHTML = `
    <div class="dish-image-wrapper relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-3 cursor-pointer active:scale-95 transition-transform duration-200">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${item.image}" alt="${item.name}"/>
        ${tagBadgesHtml}
        ${dietaryTag ? `<div class="absolute bottom-3 left-3 ${dietaryTag.toLowerCase() === 'veg' ? 'bg-green-600/90' : 'bg-red-600/90'} backdrop-blur-md px-3 py-1 rounded-full text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">${dietaryTag}</div>` : ''}
    </div>

    <div class="flex flex-row justify-between items-start w-full">
        
        <div class="flex-1 min-w-0 pr-4">
            <h4 class="font-headline text-lg font-bold text-on-surface leading-tight">${item.name}</h4>
            
            <p class="text-on-surface-variant/70 text-sm font-medium mt-1 mb-2">
                ${item.description || ''}
            </p>

            
        </div>

        <div class="flex-shrink-0">
            <button class="add-btn bg-primary hover:bg-red-600 active:scale-95 text-white transition-all duration-300 w-12 h-12 rounded-full shadow-lg flex items-center justify-center group-hover:rotate-90">
                <span class="material-symbols-outlined text-[24px]">add</span>
            </button>
        </div>
    </div>
    <div class="flex flex-row items-center justify-between w-full">
                <span class="text-primary font-bold text-lg whitespace-nowrap">
                    ${formatPrice(item.price)}
                </span>
                
                ${itemHasAR ? `
                    <button class="ar-btn flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-md whitespace-nowrap active:scale-95">
                        <span class="material-symbols-outlined text-[18px]">view_in_ar</span>
                        View in AR
                    </button>
                ` : ''}
            </div>
`;

            el.querySelector('.add-btn').onclick = () => {
                addToCart(item);
                showToast(`Added ${item.name} to cart`);
            };

            // Image click: open AR modal if valid model, else open 2D image lightbox
            el.querySelector('.dish-image-wrapper').onclick = () => {
                if (itemHasAR) {
                    window.openArModal(item.model, item.name);
                } else {
                    window.openImageModal(item.image, item.name);
                }
            };

            if (itemHasAR) {
                el.querySelector('.ar-btn').onclick = () => {
                    window.openArModal(item.model, item.name);
                };
            }

            container.appendChild(el);
        });
    });

    if (!hasItems) {
        container.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-on-surface-variant py-8"><span class="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span><p>No dishes found matching your search.</p></div>';
    }
}

function showToast(message) {
    let toast = document.getElementById('toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';

        toast.className = `
            fixed bottom-24 left-1/2 -translate-x-1/2 
            flex items-center gap-2
            px-5 py-3 rounded-full
            bg-white/80 backdrop-blur-xl
            text-gray-800 text-sm font-semibold
            shadow-[0_8px_30px_rgba(0,0,0,0.15)]
            border border-white/40
            z-50 opacity-0 scale-90
            transition-all duration-300 ease-out
            pointer-events-none select-none
        `;

        document.body.appendChild(toast);
    }

    // 🔥 Add icon + message
    toast.innerHTML = `
        <span class="material-symbols-outlined text-green-600 text-[18px]">
            check_circle
        </span>
        <span>${message}</span>
    `;

    // 🔥 Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    });

    // Clear previous timeout
    if (window.toastTimeout) clearTimeout(window.toastTimeout);

    // 🔥 Animate out
    window.toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px) scale(0.95)';
    }, 2000);
}

export function renderCartPreview() {
    const nav = document.getElementById('bottom-nav');
    const badge = document.getElementById('cart-count');
    if (!nav || !badge) return;

    const cart = getCart();
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    badge.innerText = count;

    if (count > 0) {
        nav.classList.remove('hidden');
        nav.classList.add('flex');
    } else {
        nav.classList.add('hidden');
        nav.classList.remove('flex');
    }
}

export function renderCheckoutItems() {
    const container = document.getElementById('checkout-items');
    if (!container) return;

    container.innerHTML = '';
    const cart = getCart();

    if (cart.items.length === 0) {
        container.innerHTML = '<div class="text-center text-on-surface-variant py-12 flex flex-col items-center"><span class="material-symbols-outlined text-6xl mb-4 opacity-50">remove_shopping_cart</span><p>Your cart is empty.</p></div>';
        return;
    }

    cart.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'group relative flex gap-5 p-4 bg-slate-50 rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_-3px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out overflow-hidden border border-transparent';

        el.innerHTML = `
            <div class="relative w-24 h-24 rounded-[16px] overflow-hidden flex-shrink-0">
                <img class="w-full h-full object-cover" src="${item.image}" alt="${item.name}"/>
            </div>
            <div class="flex flex-col justify-center flex-grow">
                <h3 class="font-headline text-[15px] font-bold leading-tight mb-1 text-slate-800">${item.name}</h3>
                <p class="font-label text-xs text-slate-500 mb-2">${item.quantity} qty</p>
                <div class="flex justify-between items-center">
                    <span class="font-headline font-bold text-slate-800 text-[15px]">${formatPrice(item.price * item.quantity)}</span>
                    <div class="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100">
                        <button class="dec-btn flex items-center justify-center text-sm text-slate-400 cursor-pointer hover:text-slate-800 transition-colors duration-300"><span class="material-symbols-outlined text-[18px]">remove</span></button>
                        <span class="font-headline font-bold text-[13px] px-1 w-4 text-center text-slate-800">${item.quantity}</span>
                        <button class="inc-btn flex items-center justify-center text-sm text-slate-400 cursor-pointer hover:text-slate-800 transition-colors duration-300"><span class="material-symbols-outlined text-[18px]">add</span></button>
                    </div>
                </div>
            </div>
        `;

        el.querySelector('.dec-btn').onclick = () => updateQuantity(item.id, -1);
        el.querySelector('.inc-btn').onclick = () => updateQuantity(item.id, 1);

        container.appendChild(el);
    });
}

export function renderBillDetails() {
    const totalEl = document.getElementById('bill-total');
    const grandTotalEl = document.getElementById('bill-grand-total');
    const footerTotalEl = document.getElementById('footer-total');
    const checkoutCountEl = document.getElementById('checkout-count');
    const placeOrderBtn = document.getElementById('place-order-btn');

    const cart = getCart();
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalEl) totalEl.innerText = formatPrice(cart.subtotal);
    if (grandTotalEl) grandTotalEl.innerText = formatPrice(cart.total);
    if (footerTotalEl) footerTotalEl.innerText = formatPrice(cart.total);

    if (checkoutCountEl) checkoutCountEl.innerText = `${count} Item${count !== 1 ? 's' : ''}`;

    if (placeOrderBtn) {
        if (count === 0) {
            placeOrderBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        } else {
            placeOrderBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    }
}
