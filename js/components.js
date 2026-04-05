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

            el.innerHTML = `
                <div class="relative w-full aspect-[4/3] rounded-[24px] overflow-hidden mb-5 shadow-soft transition-all duration-500 ease-in-out group-hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] group-hover:-translate-y-1">
                    <img class="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out" src="${item.image}" alt="${item.name}"/>
                    
                    <!-- Top floating elements -->
                    <div class="absolute top-3 left-0 w-full px-3 flex justify-between items-start pointer-events-none">
                        ${item.tags && item.tags.length > 0 ? `
                            <div class="${item.tags[0].toLowerCase() === 'veg' ? 'bg-emerald-500' : (item.tags[0].toLowerCase().includes('non-veg') || item.tags[0].toLowerCase().includes('non veg') ? 'bg-rose-500' : 'bg-slate-700')} px-3 py-1 rounded-full text-white font-bold text-[10px] uppercase tracking-widest shadow-md">
                                ${item.tags[0]}
                            </div>
                        ` : '<div></div>'}
                        
                       <!-- <div class="glass-panel px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <span class="material-symbols-outlined text-amber-500 text-[14px]" style="font-variation-settings: 'FILL' 1;">star</span>
                            <span class="font-bold text-[12px] text-slate-800">${item.rating}</span>
                        </div>-->
                    </div>

                    <!-- AR CTA Overlaid on Image Bottom -->
                    ${item.model ? `
                    <div class="absolute bottom-4 left-0 w-full flex justify-center z-10 pointer-events-auto">
                        <button class="ar-btn ar-pulse-btn flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-ar-gradient-start to-ar-gradient-end text-white border-none text-[12px] font-bold uppercase tracking-widest shadow-[0_8px_20px_-5px_rgba(255,65,108,0.5)] hover:shadow-[0_12px_25px_-5px_rgba(255,65,108,0.6)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 ease-in-out">
                            <span class="material-symbols-outlined text-[20px]">view_in_ar</span>
                            View in AR
                        </button>
                    </div>` : ''}
                </div>
                
                <div class="flex justify-between items-start px-2">
                    <div class="flex flex-col flex-1 pr-4 gap-1">
                        <h4 class="font-headline text-xl font-bold text-slate-900 leading-tight">${item.name}</h4>
                        <p class="font-body text-slate-500 text-[13px] leading-relaxed line-clamp-2">${item.description || ''}</p>
                        <div class="mt-2 font-body text-slate-900 font-bold text-[18px]">${formatPrice(item.price)}</div>
                    </div>
                    <button class="add-btn bg-primary hover:bg-red-600 active:scale-95 text-white transition-all duration-300 ease-in-out w-12 h-12 rounded-full shadow-[0_4px_15px_-3px_rgba(255,77,77,0.3)] flex-shrink-0 flex items-center justify-center -mt-1 group-hover:rotate-90 origin-center">
                        <span class="material-symbols-outlined text-[24px]">add</span>
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
