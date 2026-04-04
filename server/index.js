const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Paths
const RESTAURANTS_DIR = path.join(__dirname, '..', 'restaurants');

/**
 * Ensures the analytics directory and analytics.json exist for a restaurant.
 * If not, creates them with default structure.
 */
async function getAnalyticsPath(restaurantId) {
    const analyticsDir = path.join(RESTAURANTS_DIR, restaurantId, 'analytics');
    const analyticsFile = path.join(analyticsDir, 'analytics.json');

    try {
        await fs.access(analyticsDir);
    } catch {
        await fs.mkdir(analyticsDir, { recursive: true });
    }

    try {
        await fs.access(analyticsFile);
    } catch {
        const defaultData = {
            restaurantId,
            totalSiteVisits: 0,
            totalModelViews: 0,
            lastUpdated: new Date().toISOString(),
            dailyStats: {},
            hourlyStats: {},
            items: {},
            events: []
        };
        await fs.writeFile(analyticsFile, JSON.stringify(defaultData, null, 2), 'utf-8');
    }

    return analyticsFile;
}

/**
 * Load analytics file contents
 */
async function loadAnalytics(restaurantId) {
    const filePath = await getAnalyticsPath(restaurantId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Save analytics file contents safely (basic approach)
 */
async function saveAnalytics(restaurantId, data) {
    const filePath = await getAnalyticsPath(restaurantId);
    data.lastUpdated = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Helper to get date string 'YYYY-MM-DD' and hour constraint '0'-'23'
 */
function getDateParams(dateObj) {
    const dateStr = dateObj.toISOString().split('T')[0];
    const hourStr = dateObj.getUTCHours().toString();
    return { dateStr, hourStr };
}

// =======================
// ENDPOINTS
// =======================

app.post('/track/site-visit', async (req, res) => {
    try {
        const { restaurantId } = req.body;
        if (!restaurantId) return res.status(400).json({ error: 'restaurantId is required' });

        const data = await loadAnalytics(restaurantId);
        const now = new Date();
        const { dateStr, hourStr } = getDateParams(now);

        // Update overall
        data.totalSiteVisits++;

        // Update dailyStats
        if (!data.dailyStats[dateStr]) data.dailyStats[dateStr] = { siteVisits: 0, modelViews: 0 };
        data.dailyStats[dateStr].siteVisits++;

        // Update hourlyStats
        if (!data.hourlyStats[dateStr]) data.hourlyStats[dateStr] = {};
        if (!data.hourlyStats[dateStr][hourStr]) data.hourlyStats[dateStr][hourStr] = 0;
        data.hourlyStats[dateStr][hourStr]++; // This measures general activity by hour

        // Push event
        data.events.push({
            type: "SITE_VISIT",
            timestamp: now.toISOString()
        });

        await saveAnalytics(restaurantId, data);
        res.json({ success: true });
    } catch (err) {
        console.error("Error tracking site visit:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/track/model-view', async (req, res) => {
    try {
        const { restaurantId, itemId, itemName } = req.body;
        if (!restaurantId || !itemId) return res.status(400).json({ error: 'restaurantId and itemId are required' });

        const data = await loadAnalytics(restaurantId);
        const now = new Date();
        const { dateStr, hourStr } = getDateParams(now);

        // Update overall
        data.totalModelViews++;

        // Update dailyStats
        if (!data.dailyStats[dateStr]) data.dailyStats[dateStr] = { siteVisits: 0, modelViews: 0 };
        data.dailyStats[dateStr].modelViews++;

        // Update hourlyStats
        if (!data.hourlyStats[dateStr]) data.hourlyStats[dateStr] = {};
        if (!data.hourlyStats[dateStr][hourStr]) data.hourlyStats[dateStr][hourStr] = 0;
        data.hourlyStats[dateStr][hourStr]++;

        // Update items
        if (!data.items[itemId]) data.items[itemId] = { name: itemName || itemId, views: 0 };
        data.items[itemId].views++;

        // Push event
        data.events.push({
            type: "MODEL_VIEW",
            itemId,
            timestamp: now.toISOString()
        });

        await saveAnalytics(restaurantId, data);
        res.json({ success: true });
    } catch (err) {
        console.error("Error tracking model view:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/analytics/summary', async (req, res) => {
    try {
        // Find all restaurant id's by parsing the restaurants dir
        const restaurantDirs = await fs.readdir(RESTAURANTS_DIR, { withFileTypes: true });
        
        let allAnalytics = [];
        let globalSummary = {
            totalSiteVisits: 0,
            totalModelViews: 0,
            restaurantCount: 0
        };

        for (const dirent of restaurantDirs) {
            if (dirent.isDirectory()) {
                const resId = dirent.name;
                globalSummary.restaurantCount++;
                try {
                    const data = await loadAnalytics(resId);
                    
                    // We need basic config data for dashboard card (like name, location)
                    let configName = resId;
                    let configLocation = "Unknown Location";
                    let configImage = "";
                    let configRating = "5.0";

                    try {
                        const configPath = path.join(RESTAURANTS_DIR, resId, 'config.json');
                        const configData = JSON.parse(await fs.readFile(configPath, 'utf-8'));
                        if (configData.restaurant) {
                            if (configData.restaurant.name) configName = configData.restaurant.name;
                            if (configData.restaurant.location) configLocation = configData.restaurant.location;
                        }
                    } catch(e) {}

                    allAnalytics.push({
                        restaurantId: resId,
                        name: configName,
                        location: configLocation,
                        image: configImage, // If needed from another logic
                        ratings: configRating,
                        totalSiteVisits: data.totalSiteVisits || 0,
                        totalModelViews: data.totalModelViews || 0
                    });

                    globalSummary.totalSiteVisits += (data.totalSiteVisits || 0);
                    globalSummary.totalModelViews += (data.totalModelViews || 0);
                } catch(e) {
                    // Safe skip if analytics JSON doesn't exist
                }
            }
        }

        res.json({
            summary: globalSummary,
            restaurants: allAnalytics
        });
    } catch (err) {
        console.error("Error fetching analytics summary", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/analytics/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const data = await loadAnalytics(restaurantId);
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: "Analytics data not found." });
    }
});

app.listen(PORT, () => {
    console.log(`Ethereal AR Analytics tracking engine running on http://localhost:${PORT}`);
});
