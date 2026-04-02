let state = {
    cart: {
        items: [],
        subtotal: 0,
        total: 0
    },
    config: null
};

let listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
    // return unsubscribe function
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

function notify() {
    listeners.forEach(l => l(state));
}

// Load cart from localStorage
try {
    const savedCart = localStorage.getItem('arfood_cart');
    if (savedCart) {
        state.cart = JSON.parse(savedCart);
    }
} catch (e) {
    console.warn("Failed to load cart from localStorage", e);
}

export function setConfig(config) {
    state.config = config;
    notify();
}

export function getConfig() {
    return state.config;
}

export function getCart() {
    return state.cart;
}

function calculateTotals() {
    let subtotal = 0;
    for (const item of state.cart.items) {
        subtotal += item.price * item.quantity;
    }
    
    state.cart.subtotal = subtotal;
    state.cart.total = subtotal;
    
    try {
        localStorage.setItem('arfood_cart', JSON.stringify(state.cart));
    } catch (e) {
        console.warn("Failed to save cart", e);
    }
    
    notify();
}

export function addToCart(item) {
    const existing = state.cart.items.find(i => i.id === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.items.push({
            id: item.id,
            name: item.name,
            price: item.price, // ensure Number
            image: item.image,
            description: item.description,
            quantity: 1
        });
    }
    calculateTotals();
}

export function updateQuantity(itemId, change) {
    const existingIndex = state.cart.items.findIndex(i => i.id === itemId);
    if (existingIndex !== -1) {
        const item = state.cart.items[existingIndex];
        item.quantity += change;
        if (item.quantity <= 0) {
            state.cart.items.splice(existingIndex, 1);
        }
        calculateTotals();
    }
}

export function clearCart() {
    state.cart = { items: [], subtotal: 0, total: 0 };
    calculateTotals();
}
