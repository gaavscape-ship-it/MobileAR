const API_BASE = 'http://localhost:3000/track';

export async function trackSiteVisit(restaurantId) {
    try {
        await fetch(`${API_BASE}/site-visit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId })
        });
        console.log('Site visit tracked:', restaurantId);
    } catch (e) {
        console.error('Failed to track site visit', e);
    }
}

export async function trackModelView(restaurantId, itemId, itemName = '') {
    try {
        await fetch(`${API_BASE}/model-view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId, itemId, itemName })
        });
        console.log('Model view tracked:', itemId);
    } catch (e) {
        console.error('Failed to track model view', e);
    }
}
