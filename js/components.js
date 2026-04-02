import { getConfig, getCart, addToCart, updateQuantity } from './store.js';

function formatPrice(amount) {
    const config = getConfig();
    const currency = config?.restaurant?.currency || '₹';
    return `${currency}${amount.toFixed(2)}`;
}

export function renderCategories(categories, activeCategoryId, onSelect) {
    const container = document.getElementById('category-list');
    if (!container) return;

    container.innerHTML = '';

    // "All" category
    const allItem = document.createElement('div');
    const allIsActive = activeCategoryId === 'all';
    allItem.className = `flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer category-item ${allIsActive ? 'active' : ''}`;
    allItem.innerHTML = `
        <div class="w-20 h-20 rounded-full bg-surface-container-lowest overflow-hidden shadow-sm group-hover:shadow-md transition-all p-1 category-circle flex items-center justify-center" style="${allIsActive ? 'border: 2px solid #b7112d; padding: 0;' : ''}">
            <span class="material-symbols-outlined text-primary text-3xl">restaurant</span>
        </div>
        <span class="font-label text-sm font-semibold text-on-surface-variant">All</span>
    `;
    allItem.onclick = () => onSelect('all');
    container.appendChild(allItem);

    // Dynamic categories
    categories.forEach(cat => {
        const item = document.createElement('div');
        const isActive = activeCategoryId === cat.id;
        item.className = `flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer category-item ${isActive ? 'active' : ''}`;

        // Take the first item's image as category image for simplicity
        const firstImage = cat.items[0]?.image || '';

        const catNameHtml = cat.name.length > 20
            ? `<div class="w-20 overflow-hidden text-center"><span class="font-label text-sm font-semibold text-on-surface-variant marquee-scroll">${cat.name}</span></div>`
            : `<span class="font-label text-sm font-semibold text-on-surface-variant text-center leading-tight line-clamp-2 w-20">${cat.name}</span>`;

        item.innerHTML = `
            <div class="w-20 h-20 rounded-full bg-surface-container-lowest overflow-hidden shadow-sm group-hover:shadow-md transition-all p-1 category-circle mb-1" style="${isActive ? 'border: 2px solid #b7112d; padding: 0;' : ''}">
                <img class="w-full h-full object-cover rounded-full" src="${firstImage}" alt="${cat.name}"/>
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

            el.innerHTML = `
                <div class="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-4">
                    <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${item.image}" alt="${item.name}"/>
                    <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-yellow-500 text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
                        <span class="font-bold text-xs text-on-surface">${item.rating}</span>
                    </div>
                    ${item.tags && item.tags.length > 0 ? `
                        <div class="absolute bottom-3 left-3 ${item.tags[0].toLowerCase() === 'veg' ? 'bg-green-600/90' : (item.tags[0].toLowerCase().includes('non-veg') || item.tags[0].toLowerCase().includes('non veg') ? 'bg-red-600/90' : 'bg-primary-container/90')} backdrop-blur-md px-3 py-1 rounded-full text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
                            ${item.tags[0]}
                        </div>
                    ` : ''}
                </div>
                <div class="flex justify-between items-start">
                    <div class="flex flex-col flex-1">
                        <h4 class="font-headline text-lg font-bold text-on-surface">${item.name}</h4>
                        <p class="text-on-surface-variant/70 text-sm font-medium line-clamp-1">${item.description || ''}</p>
                        <div class="flex items-center justify-between mt-1 pr-2">
                            <span class="text-primary font-bold">${formatPrice(item.price)}</span>
                            ${item.model ? `
                            <button class="ar-btn flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-[10px] font-extrabold uppercase tracking-wider shadow-sm hover:bg-primary hover:text-white hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all text-nowrap">
                                <span class="material-symbols-outlined text-[22px]">view_in_ar</span>
                                View in AR
                            </button>` : ''}
                        </div>
                    </div>
                    <button class="add-btn bg-surface-container-high hover:bg-primary hover:text-white transition-colors p-2 rounded-full ml-2 shadow flex-shrink-0 flex self-start">
                        <span class="material-symbols-outlined text-xl">add</span>
                    </button>
                </div>
            `;

            el.querySelector('.add-btn').onclick = () => {
                addToCart(item);
                showToast(`Added ${item.name} to cart`);
            };

            if (item.model) {
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
        toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 transition-opacity duration-300 opacity-0 pointer-events-none select-none';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = '1';

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
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
        el.className = 'group relative flex gap-5 p-4 bg-surface-container-lowest rounded-2xl shadow-[0px_12px_32px_rgba(28,27,27,0.04)] hover:shadow-[0px_12px_32px_rgba(28,27,27,0.08)] transition-all overflow-hidden border border-transparent hover:border-outline-variant/20';

        el.innerHTML = `
            <div class="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <img class="w-full h-full object-cover" src="${item.image}" alt="${item.name}"/>
            </div>
            <div class="flex flex-col justify-center flex-grow">
                <h3 class="font-headline text-lg font-bold leading-tight mb-1">${item.name}</h3>
                <p class="font-label text-sm text-on-surface-variant/70 mb-2">${item.quantity} qty</p>
                <div class="flex justify-between items-center">
                    <span class="font-headline font-extrabold text-primary text-lg">${formatPrice(item.price * item.quantity)}</span>
                    <div class="flex items-center gap-3 bg-surface-container-low px-3 py-1.5 rounded-full">
                        <button class="dec-btn flex items-center justify-center text-sm text-on-surface-variant cursor-pointer hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">remove</span></button>
                        <span class="font-headline font-bold text-sm px-1 w-4 text-center">${item.quantity}</span>
                        <button class="inc-btn flex items-center justify-center text-sm text-on-surface-variant cursor-pointer hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">add</span></button>
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
