/**
 * Script for Dynamic Dashboard fetching from Express backend
 */

const API_BASE_URL = 'http://localhost:3000'; // Make sure this port handles analytics API

const router = {
    currentRoute: 'dashboard-view',

    navigate(viewId) {
        // Hide all views
        document.querySelectorAll('.spa-view').forEach(v => {
            v.classList.remove('active');
            setTimeout(() => v.classList.add('hidden'), 300); // fade out
        });

        // Show target view
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.remove('hidden');
            // Allow display flow before pushing opacity transition
            requestAnimationFrame(() => target.classList.add('active'));
            this.currentRoute = viewId;
            updateNavStyles(viewId);
        }
    }
};

window.router = router;

// Manage navigation active states
function updateNavStyles(viewId) {
    // Desktop Nav
    document.querySelectorAll('#desktop-nav .nav-link').forEach(el => {
        const target = el.getAttribute('data-target');
        if (target === viewId) {
            el.classList.add('text-[#006565]', 'dark:text-[#008080]');
            el.classList.remove('text-[#436464]', 'dark:text-[#bdc9c8]');
        } else {
            el.classList.add('text-[#436464]', 'dark:text-[#bdc9c8]');
            el.classList.remove('text-[#006565]', 'dark:text-[#008080]');
        }
    });

    // Mobile Nav
    if (viewId === 'dashboard-view' || viewId === 'analytics-view') {
        document.querySelectorAll('#mobile-nav .nav-link').forEach(el => {
            const target = el.getAttribute('data-target');
            if (target === viewId) {
                el.classList.add('text-[#006565]', 'scale-110', 'opacity-100');
                el.classList.remove('text-[#436464]', 'opacity-70');
                el.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
            } else {
                el.classList.add('text-[#436464]', 'opacity-70');
                el.classList.remove('text-[#006565]', 'scale-110', 'opacity-100');
                el.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0";
            }
        });
    }
}

// Bind Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        if (target) {
            router.navigate(target);
        }
    });
});

/**
 * Fetch and Render Summary
 */
async function loadSummary() {
    try {
        const res = await fetch(`${API_BASE_URL}/analytics/summary`);
        if (!res.ok) throw new Error('Bad response');
        
        const data = await res.json();
        const summary = data.summary || { totalSiteVisits: 0, totalModelViews: 0, restaurantCount: 0 };
        
        // Update DOM elements for summary
        document.getElementById('db-active-count').innerText = summary.restaurantCount;
        document.getElementById('db-total-ar-views').innerText = summary.totalModelViews.toLocaleString();
        document.getElementById('db-total-site-visits').innerText = summary.totalSiteVisits.toLocaleString();
        document.getElementById('analytics-total-views').innerText = (summary.totalModelViews + summary.totalSiteVisits).toLocaleString();

        renderRestaurants(data.restaurants || []);
        
    } catch (error) {
        console.error("Failed to fetch analytics summary:", error);
        document.getElementById('error-state').classList.remove('hidden');
    }
}

/**
 * Render dynamic restaurant cards
 */
function renderRestaurants(restaurants) {
    const grid = document.getElementById('db-restaurant-grid');
    grid.innerHTML = '';

    if (restaurants.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-20 text-center text-outline">No restaurants found in analytics database.</div>';
        return;
    }

    restaurants.forEach(res => {
        // Mocking a placeholder image based on name characters
        const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(res.name)}&background=random&size=400&bold=true`;
        
        const card = document.createElement('div');
        card.className = "group cursor-pointer bg-surface-container-lowest rounded-xl border border-transparent hover:border-primary/20 overflow-hidden transition-all duration-300 hover:shadow-lg";
        card.onclick = () => loadRestaurantDetails(res.restaurantId, res.name);
        
        card.innerHTML = `
            <div class="h-40 relative overflow-hidden bg-surface-variant">
                <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src="${res.image || fallbackImg}" onerror="this.src='${fallbackImg}'" alt="${res.name}">
                <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span class="material-symbols-outlined text-tertiary text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
                    <span class="text-xs font-bold text-on-surface">${res.ratings || "N/A"}</span>
                </div>
            </div>
            <div class="p-6">
                <h3 class="font-headline font-bold text-xl mb-1 text-on-surface truncate">${res.name}</h3>
                <div class="flex items-center gap-1 text-outline mb-6">
                    <span class="material-symbols-outlined text-sm">location_on</span>
                    <span class="text-xs font-medium">${res.location}</span>
                </div>
                <div class="space-y-3 pt-4 border-t border-surface-container">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] uppercase font-bold tracking-widest text-outline">Total Visits</span>
                        <span class="text-sm font-bold text-secondary">${res.totalSiteVisits.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] uppercase font-bold tracking-widest text-primary/70">AR Models Viewed</span>
                        <span class="text-sm font-bold text-primary">${res.totalModelViews.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}


/**
 * Fetch and Render Specific Restaurant Detail
 */
async function loadRestaurantDetails(restaurantId, restaurantName) {
    // Navigate strictly to details view
    router.navigate('restaurant-view');
    
    // reset visual
    document.getElementById('res-overview-name').innerText = restaurantName;
    document.getElementById('res-overview-visits').innerText = '...';
    document.getElementById('res-overview-ar').innerText = '...';
    document.getElementById('res-overview-last-update').innerText = 'Loading...';
    
    try {
        const res = await fetch(`${API_BASE_URL}/analytics/${restaurantId}`);
        if (!res.ok) throw new Error('Data not found');
        const data = await res.json();
        
        document.getElementById('res-overview-visits').innerText = data.totalSiteVisits || 0;
        document.getElementById('res-overview-ar').innerText = data.totalModelViews || 0;
        
        const lastUpdated = new Date(data.lastUpdated);
        document.getElementById('res-overview-last-update').innerText = lastUpdated.toLocaleString();
        
        // Render top items
        const itemsContainer = document.getElementById('res-overview-items');
        itemsContainer.innerHTML = '';
        if (data.items && Object.keys(data.items).length > 0) {
            const sortedItems = Object.entries(data.items).sort((a,b) => b[1].views - a[1].views);
            sortedItems.slice(0, 5).forEach(([itemId, itemData]) => {
                const percent = Math.min((itemData.views / Math.max(data.totalModelViews, 1)) * 100, 100);
                itemsContainer.innerHTML += `
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-semibold text-sm">${itemData.name}</span>
                            <span class="text-primary font-bold text-xs">${itemData.views} views</span>
                        </div>
                        <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
            });
        } else {
             itemsContainer.innerHTML = '<p class="text-on-surface-variant italic text-sm">No items tracked yet.</p>';
        }
        
        // Render Events
        const eventsContainer = document.getElementById('res-overview-events');
        eventsContainer.innerHTML = '';
        if (data.events && data.events.length > 0) {
            // Newest first
            const sortedEvents = [...data.events].reverse().slice(0, 50);
            sortedEvents.forEach(evt => {
                const dateStr = new Date(evt.timestamp).toLocaleTimeString();
                const icon = evt.type === 'SITE_VISIT' ? 'person' : 'view_in_ar';
                const label = evt.type === 'SITE_VISIT' ? 'Visited menu' : `Viewed model: ${evt.itemId || 'Unknown'}`;
                const color = evt.type === 'SITE_VISIT' ? 'text-secondary bg-secondary-container/20' : 'text-primary bg-primary/10';
                
                eventsContainer.innerHTML += `
                    <div class="flex items-center gap-4 py-2 border-b border-surface-container-high last:border-0">
                        <div class="w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-[16px]">${icon}</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-on-surface">${label}</p>
                            <span class="text-[10px] text-outline">${dateStr}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            eventsContainer.innerHTML = '<p class="text-on-surface-variant text-sm">No recent activity.</p>';
        }
        
    } catch (e) {
        console.error("Failed to load generic res", e);
        document.getElementById('res-overview-items').innerHTML = '<p class="text-error text-sm">Failed to load item specifics.</p>';
    }
}

// Search functionality
document.getElementById('db-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('#db-restaurant-grid > div');
    cards.forEach(c => {
        const title = c.querySelector('h3');
        if (!title) return; // skip loading text
        if (title.innerText.toLowerCase().includes(q)) {
            c.style.display = 'block';
        } else {
            c.style.display = 'none';
        }
    });
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    loadSummary();
    
    // Initialize nav matching
    updateNavStyles('dashboard-view');
});
