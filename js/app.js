import { getConfig, setConfig, subscribe, clearCart } from './store.js';
import { renderCategories, renderMenuItems, renderCartPreview, renderCheckoutItems, renderBillDetails } from './components.js';
import { trackSiteVisit, trackModelView } from './tracker.js';

let activeCategory = 'all';
let fullMenu = [];
let searchQuery = '';
let restaurantId = 'restaurant1';
let vegOnly = false;

// Determine base URL since we are running in /mobileAR/ folder instead of root
const baseTag = document.querySelector('base');
const basePath = baseTag ? baseTag.getAttribute('href') : '/mobileAR/';

async function init() {
    // --- Query-parameter routing (GitHub Pages compatible) ---
    // Instead of path-based routing (/MobileAR/restaurant2), we use
    // query params: /MobileAR/?resId=restaurant2
    // This avoids 404s on GitHub Pages which has no server-side routing.
    const params = new URLSearchParams(window.location.search);
    restaurantId = params.get('resId') || 'restaurant1';

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

        // Track site visit for analytics natively once app stabilizes
        trackSiteVisit(restaurantId);

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
    // Use query param ?view=checkout instead of path-based /checkout
    const params = new URLSearchParams(window.location.search);
    const currentView = params.get('view');

    const viewMenu = document.getElementById('view-menu');
    const viewCheckout = document.getElementById('view-checkout');

    if (currentView === 'checkout') {
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

/**
 * Builds a query-string URL preserving the resId param.
 * @param {Object} [extraParams] - Additional query params, e.g. { view: 'checkout' }
 * @returns {string} Full URL path with query string
 */
function buildUrl(extraParams = {}) {
    const qp = new URLSearchParams();
    qp.set('resId', restaurantId);
    for (const [k, v] of Object.entries(extraParams)) {
        qp.set(k, v);
    }
    return `${basePath}?${qp.toString()}`;
}

function setupRouter() {
    document.addEventListener('click', e => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            const href = link.getAttribute('href');

            // Route via query params instead of path segments
            let finalHref;
            if (href === 'checkout') {
                finalHref = buildUrl({ view: 'checkout' });
            } else {
                // Navigate back to the menu (home)
                finalHref = buildUrl();
            }

            history.pushState(null, null, finalHref);
            handleRoute();
            window.scrollTo(0, 0);
        }
    });

    window.addEventListener('popstate', handleRoute);

    // Place order: clear cart and return to menu
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', () => {
            alert('Order Placed Successfully!');
            clearCart();
            history.pushState(null, null, buildUrl());
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
window.openArModal = function (modelUrl, itemName, itemId) {
    const modal = document.getElementById('ar-modal');
    const viewer = document.getElementById('ar-viewer');
    const title = document.getElementById('ar-title');
    const content = document.getElementById('ar-modal-content');

    title.innerText = itemName;
    const finalModelUrl = modelUrl.startsWith('/') ? `${basePath.replace(/\/$/, '')}${modelUrl}` : modelUrl;

    // Reset camera orientation and zoom
    viewer.cameraOrbit = 'auto auto auto';
    viewer.cameraTarget = 'auto auto auto';
    viewer.fieldOfView = 'auto';

    viewer.src = finalModelUrl;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Track analytics event asynchronously
    if (itemId) trackModelView(restaurantId, itemId, itemName);

    // Trigger smooth entry animation
    requestAnimationFrame(() => {
        modal.classList.remove('modal-hidden');
    });
    if (content) {
        content.classList.add('modal-content-enter');
    }

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
    const content = document.getElementById('ar-modal-content');

    modal.classList.add('modal-hidden');

    // Wait for transition to finish before hiding
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (content) content.classList.remove('modal-content-enter');
    }, 300);

    // Removed viewer.src = '' because forcefully clearing the source caused memory/WebGL crashes and freezing when re-opening the same model.

    // Restore background scrolling
    document.body.style.overflow = '';
}

// Global 2D Image Modal handling (fallback for items without AR models)
window.openImageModal = function (imageUrl, itemName) {
    const modal = document.getElementById('image-modal');
    const viewer = document.getElementById('image-viewer');
    const title = document.getElementById('image-title');
    const content = document.getElementById('image-modal-content');

    title.innerText = itemName;
    viewer.src = imageUrl;
    viewer.alt = itemName;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Trigger smooth entry animation
    requestAnimationFrame(() => {
        modal.classList.remove('modal-hidden');
    });
    if (content) {
        content.classList.add('modal-content-enter');
    }

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
}

window.closeImageModal = function () {
    const modal = document.getElementById('image-modal');
    const content = document.getElementById('image-modal-content');

    modal.classList.add('modal-hidden');

    // Wait for transition to finish before hiding
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (content) content.classList.remove('modal-content-enter');
    }, 300);

    // Restore background scrolling
    document.body.style.overflow = '';
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
