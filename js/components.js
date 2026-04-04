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
        <div class="w-16 h-16 rounded-full bg-slate-50 overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] group-hover:shadow-[0_4px_20px_-3px_rgba(0,0,0,0.08)] group-hover:-translate-y-0.5 transition-all duration-300 ease-in-out p-1 category-circle flex items-center justify-center" style="${allIsActive ? 'border: 2px solid #334155; padding: 0;' : ''}">
            <span class="material-symbols-outlined text-slate-800 text-2xl">restaurant</span>
        </div>
        <span class="font-label text-xs font-medium text-slate-500">All</span>
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
            ? `<div class="w-16 overflow-hidden text-center"><span class="font-label text-xs font-medium text-slate-500 marquee-scroll">${cat.name}</span></div>`
            : `<span class="font-label text-xs font-medium text-slate-500 text-center leading-tight line-clamp-2 w-16">${cat.name}</span>`;

        item.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-slate-50 overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] group-hover:shadow-[0_4px_20px_-3px_rgba(0,0,0,0.08)] group-hover:-translate-y-0.5 transition-all duration-300 ease-in-out p-1 category-circle mb-1" style="${isActive ? 'border: 2px solid #334155; padding: 0;' : ''}">
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
                <div class="relative w-full aspect-[16/9] rounded-[20px] overflow-hidden mb-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1)]">
                    <img class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-in-out" src="${item.image}" alt="${item.name}"/>
                    <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-amber-400 text-[14px]" style="font-variation-settings: 'FILL' 1;">star</span>
                        <span class="font-semibold text-xs text-slate-800">${item.rating}</span>
                    </div>
                    ${item.tags && item.tags.length > 0 ? `
                        <div class="absolute bottom-3 left-3 ${item.tags[0].toLowerCase() === 'veg' ? 'bg-emerald-500/90' : (item.tags[0].toLowerCase().includes('non-veg') || item.tags[0].toLowerCase().includes('non veg') ? 'bg-rose-500/90' : 'bg-slate-700/90')} backdrop-blur-md px-3 py-1 rounded-full text-white font-semibold text-[10px] uppercase tracking-wider shadow-sm">
                            ${item.tags[0]}
                        </div>
                    ` : ''}
                </div>
                <div class="flex justify-between items-start">
                    <div class="flex flex-col flex-1 pl-1">
                        <h4 class="font-headline text-base font-bold text-slate-800 leading-snug tracking-tight">${item.name}</h4>
                        <p class="text-slate-500 text-[13px] leading-relaxed line-clamp-1 mt-0.5">${item.description || ''}</p>
                        <div class="flex items-center justify-between mt-2.5 pr-2">
                            <span class="text-slate-800 font-bold text-[15px]">${formatPrice(item.price)}</span>
                            ${item.model ? `
                            <button class="ar-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 border-none text-[10px] font-bold uppercase tracking-wider shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:bg-slate-100 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-300 ease-in-out text-nowrap">
                                <span class="material-symbols-outlined text-[18px]">view_in_ar</span>
                                View in AR
                            </button>` : ''}
                        </div>
                    </div>
                    <button class="add-btn bg-slate-800 hover:bg-slate-700 hover:-translate-y-0.5 text-white transition-all duration-300 ease-in-out p-2.5 rounded-full ml-3 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.15)] flex-shrink-0 flex self-start active:scale-95">
                        <span class="material-symbols-outlined text-[18px]">add</span>
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
