import { getConfig, setConfig, subscribe, clearCart } from './store.js';
import { renderCategories, renderMenuItems, renderCartPreview, renderCheckoutItems, renderBillDetails } from './components.js';

let activeCategory = 'all';
let fullMenu = [];
let searchQuery = '';
let restaurantId = 'restaurant1';
let vegOnly = false;

// Determine base URL since we are running in /mobileAR/ folder instead of root
const baseTag = document.querySelector('base');
const basePath = baseTag ? baseTag.getAttribute('href') : '/mobileAR/';

async function init() {
    // Determine restaurantId from path
    let currentPath = window.location.pathname;
    if (currentPath.startsWith(basePath)) {
        currentPath = currentPath.substring(basePath.length);
    } else if (currentPath.startsWith('/')) {
        currentPath = currentPath.substring(1);
    }
    
    const pathSegments = currentPath.split('/').filter(Boolean);
    if (pathSegments.length > 0 && pathSegments[0] !== 'checkout') {
        restaurantId = pathSegments[0];
    }

    try {
        const response = await fetch(`${basePath}restaurants/${restaurantId}/config.json`);
        if (!response.ok) throw new Error('Config not found for ' + restaurantId);
        const config = await response.json();
        setConfig(config);
        fullMenu = config.categories || [];

        if (config.restaurant && config.restaurant.name) {
            const headerEl = document.getElementById('restaurant-name-header');
            if (headerEl) {
                headerEl.textContent = config.restaurant.name;
            }
        }

        setupRouter();
        handleRoute();

        // Subscribe to store changes to update UI automatically
        subscribe(() => {
            renderCartPreview();
            renderCheckoutItems();
            renderBillDetails();
        });

        // Initial renders
        renderCartPreview();

        // AR Fallback listener for the built-in view_in_AR_icon
        const viewer = document.getElementById('ar-viewer');
        if (viewer) {
            viewer.addEventListener('click', (e) => {
                const path = e.composedPath();
                const isArIconClicked = path.some(el => el.id === 'view_x5F_in_x5F_AR_x5F_icon' || el.id === 'default-ar-button');
                if (isArIconClicked) {
                    if (viewer.canActivateAR === false) {
                        const fallbackMessage = document.getElementById('ar-fallback');
                        if (fallbackMessage) fallbackMessage.classList.remove('hidden');
                    }
                }
            });

            viewer.addEventListener('ar-status', (event) => {
                if (event.detail === 'failed') {
                    const fallbackMessage = document.getElementById('ar-fallback');
                    if (fallbackMessage) fallbackMessage.classList.remove('hidden');
                }
            });
        }

    } catch (err) {
        console.error('Failed to initialize app', err);
        document.body.innerHTML = `
            <div class="p-8 max-w-md mx-auto mt-20 text-center bg-surface-container-low rounded-2xl shadow-sm">
                <span class="material-symbols-outlined text-6xl text-error mb-4">error</span>
                <h1 class="font-headline text-2xl text-on-surface font-bold mb-2">Failed to load restaurant</h1>
                <p class="font-body text-on-surface-variant">Please ensure you are accessing a valid restaurant URL.</p>
            </div>
        `;
    }
}

function handleRoute() {
    const path = window.location.pathname;

    const viewMenu = document.getElementById('view-menu');
    const viewCheckout = document.getElementById('view-checkout');

    if (path.includes('checkout')) {
        viewMenu.classList.add('hidden');
        viewCheckout.classList.remove('hidden');
        renderCheckoutItems();
        renderBillDetails();
    } else {
        // default to menu
        viewMenu.classList.remove('hidden');
        viewCheckout.classList.add('hidden');
        renderCategories(fullMenu, activeCategory, handleCategorySelect);
        renderMenuItems(fullMenu, activeCategory, searchQuery, vegOnly);
    }
}

function setupRouter() {
    document.addEventListener('click', e => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            const href = link.getAttribute('href');
            
            const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
            let finalHref = href;
            if (href === 'checkout') {
                finalHref = `${cleanBasePath}/${restaurantId}/checkout`;
            } else if (href === basePath || href === '/mobileAR/' || href === '/') {
                finalHref = `${cleanBasePath}/${restaurantId}`;
            }

            history.pushState(null, null, finalHref);
            handleRoute();
            window.scrollTo(0, 0);
        }
    });

    window.addEventListener('popstate', handleRoute);

    // Expose close/clear functionality globally or via events
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', () => {
            alert('Order Placed Successfully!');
            clearCart();
            const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
            history.pushState(null, null, `${cleanBasePath}/${restaurantId}`);
            handleRoute();
            window.scrollTo(0, 0);
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderMenuItems(fullMenu, activeCategory, searchQuery, vegOnly);
        });
    }

    // Veg toggle
    const vegToggle = document.getElementById('veg-toggle');
    if (vegToggle) {
        vegToggle.addEventListener('click', () => {
            vegOnly = !vegOnly;
            vegToggle.classList.toggle('active', vegOnly);
            vegToggle.setAttribute('aria-pressed', String(vegOnly));
            renderMenuItems(fullMenu, activeCategory, searchQuery, vegOnly);
        });
    }
}

function handleCategorySelect(categoryId) {
    activeCategory = categoryId;
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    searchQuery = '';
    renderCategories(fullMenu, activeCategory, handleCategorySelect);
    renderMenuItems(fullMenu, activeCategory, searchQuery, vegOnly);
}

// Global AR Modal handling
window.openArModal = function (modelUrl, itemName) {
    const modal = document.getElementById('ar-modal');
    const viewer = document.getElementById('ar-viewer');
    const title = document.getElementById('ar-title');

    title.innerText = itemName;
    const finalModelUrl = modelUrl.startsWith('/') ? `${basePath.replace(/\/$/, '')}${modelUrl}` : modelUrl;

    // Reset camera orientation and zoom
    viewer.cameraOrbit = 'auto auto auto';
    viewer.cameraTarget = 'auto auto auto';
    viewer.fieldOfView = 'auto';

    viewer.src = finalModelUrl;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const fallbackMessage = document.getElementById('ar-fallback');
    // Always start with fallback hidden
    if (fallbackMessage) {
        fallbackMessage.classList.add('hidden');
    }

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
}

window.closeArModal = function () {
    const modal = document.getElementById('ar-modal');
    const viewer = document.getElementById('ar-viewer');

    modal.classList.add('hidden');
    modal.classList.remove('flex');

    // Removed viewer.src = '' because forcefully clearing the source caused memory/WebGL crashes and freezing when re-opening the same model.

    // Restore background scrolling
    document.body.style.overflow = '';
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
