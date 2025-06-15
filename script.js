// STEP 1: Paste your Firebase configuration object here
// (The code you copied from the Firebase console in Part 1, Step 3)
const firebaseConfig = {
  apiKey: "AIzaSyA32ntCLYYW6gHv7KWX4hjRCIds0EM-hTc",
  authDomain: "mason-airsoft.firebaseapp.com",
  projectId: "mason-airsoft",
  storageBucket: "mason-airsoft.firebasestorage.app",
  messagingSenderId: "356786687249",
  appId: "1:356786687249:web:dc30999cd6bbe08c6710b0",
  measurementId: "G-QXB9T0C243"
};

// --- APP INITIALIZATION ---
// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- LOCAL STATE (a temporary copy of the online data) ---
let localState = {
    currentUser: null,
    masonPoints: 0,
    dates: {},
    products: [],
    transactions: [],
    cart: [] // Cart is the only thing that stays local and doesn't sync
};

// --- DOM ELEMENT SELECTORS ---
const loadingIndicator = document.getElementById('loading-indicator');
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const dynamicContent = document.getElementById('dynamic-content');
const ADMIN_PASSWORD = "Charcoal11!";

// --- FIREBASE REAL-TIME LISTENERS ---
// This is the magic. These functions listen for changes in the database
// and automatically update the local state and re-render the app.

// Listener for points
db.collection("appData").doc("masonState").onSnapshot(doc => {
    if (doc.exists) {
        localState.masonPoints = doc.data().points || 0;
    } else {
        // If the document doesn't exist, create it.
        db.collection("appData").doc("masonState").set({ points: 0 });
    }
    render(); // Re-render when points change
});

// Listener for products
db.collection("products").onSnapshot(snapshot => {
    localState.products = [];
    snapshot.forEach(doc => {
        localState.products.push({ id: doc.id, ...doc.data() });
    });
    render();
});

// Listener for dates
db.collection("dates").onSnapshot(snapshot => {
    localState.dates = {};
    snapshot.forEach(doc => {
        localState.dates[doc.id] = doc.data();
    });
    render();
});

// Listener for transactions
db.collection("transactions").orderBy("date", "desc").onSnapshot(snapshot => {
    localState.transactions = [];
    snapshot.forEach(doc => {
        localState.transactions.push({ id: doc.id, ...doc.data() });
    });
    render();
});


// --- RENDER FUNCTIONS ---
// These functions build the HTML based on the `localState` object.
function render() {
    // Hide loading indicator once the first render happens
    loadingIndicator.style.display = 'none';

    if (!localState.currentUser) {
        loginScreen.style.display = 'block';
        appContainer.style.display = 'none';
        dynamicContent.innerHTML = '';
        const loginError = document.getElementById('login-error');
        if(loginError) loginError.textContent = '';
    } else {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'block';
        if (localState.currentUser === 'admin') {
            renderAdminView();
        } else {
            renderMasonView();
        }
    }
}

function renderAdminView() {
    dynamicContent.innerHTML = `
        <h2>Admin Panel</h2>
        <div class="main-grid-col-2">
            <div class="grid-section">
                <h3>Date Management</h3>
                <div class="date-proposal-section">
                    <input type="date" id="admin-date-input">
                    <button id="admin-propose-date-button">Propose Date</button>
                </div>
                <div id="admin-date-list" class="date-list">${renderDateListHTML('admin')}</div>
                
                <h3 class="top-margin">Points & Transactions</h3>
                <p>Mason's Points: <span id="admin-points-display">${localState.masonPoints}</span></p>
                <button id="give-points-button">Give 10 Points</button>
                <h4 class="top-margin">Transaction History</h4>
                <div id="transaction-history" class="transaction-log">${renderTransactionHistoryHTML()}</div>
            </div>
            <div class="grid-section">
                <h3>Shop Management</h3>
                <form id="add-product-form">
                    <h4>Add New Item</h4>
                    <input type="text" id="product-name" placeholder="Product Name" required>
                    <input type="url" id="product-image" placeholder="Image URL" required>
                    <input type="number" id="product-points" placeholder="Points Cost" required min="1">
                    <button type="submit">Add Product</button>
                </form>
                <h4 class="top-margin">Manage Existing Items</h4>
                <div id="manage-shop-container">${renderAdminShopManagementHTML()}</div>
            </div>
        </div>
    `;
}

function renderMasonView() {
     dynamicContent.innerHTML = `
        <div class="user-header">
            <h2>Welcome Mason!</h2>
            <h3>Your Points: <span id="mason-points-display">${localState.masonPoints}</span></h3>
        </div>
        <div class="main-grid-col-3">
            <div class="grid-section">
                <h3>Battle Dates</h3>
                <div class="date-proposal-section">
                    <input type="date" id="mason-date-input">
                    <button id="mason-propose-date-button">Propose Date</button>
                </div>
                <div id="mason-date-list" class="date-list">${renderDateListHTML('mason')}</div>
            </div>
            <div class="grid-section">
                <h3>Point Shop</h3>
                <div id="shop-container" class="shop">${renderShopHTML()}</div>
            </div>
            <div class="grid-section">
                <h3>Your Cart</h3>
                <div id="cart-container">${renderCartHTML()}</div>
            </div>
        </div>
    `;
}


// --- HTML GENERATING FUNCTIONS ---
// These functions return strings of HTML to be injected into the page.

function renderDateListHTML(userType) {
    const sortedDates = Object.keys(localState.dates).sort((a,b) => new Date(a) - new Date(b));
    if (sortedDates.length === 0) return '<p>No dates proposed yet.</p>';
    
    return sortedDates.map(dateStr => {
        const dateInfo = localState.dates[dateStr];
        let actionsHTML = '';
        if (dateInfo.status === 'proposed' && dateInfo.proposedBy !== userType) {
            actionsHTML = `
                <button class="accept-date" data-date="${dateStr}">Accept</button>
                <button class="deny-date" data-date="${dateStr}">Deny</button>
            `;
        }
        return `
            <div class="date-item">
                <div class="date-item-info">
                    <span>${dateStr}</span> (by ${dateInfo.proposedBy})
                    <span class="status ${dateInfo.status}">${dateInfo.status}</span>
                </div>
                <div class="date-item-actions">${actionsHTML}</div>
            </div>
        `;
    }).join('');
}

function renderAdminShopManagementHTML() {
    if (localState.products.length === 0) return '<p>No items in shop to manage.</p>';
    return localState.products.map(product => `
        <div class="manage-item">
            <span class="manage-item-name">${product.name} (${product.points} pts)</span>
            <input type="number" class="discount-input" data-id="${product.id}" placeholder="%" value="${product.discount || ''}">
            <div>
                <button class="discount-btn" data-id="${product.id}">Set</button>
                <button class="remove-item-btn" data-id="${product.id}">X</button>
            </div>
        </div>
    `).join('');
}

function renderTransactionHistoryHTML() {
    if (localState.transactions.length === 0) return '<p>No purchases yet.</p>';
    return localState.transactions.map(tx => `
        <p><strong>${new Date(tx.date.seconds * 1000).toLocaleDateString()}</strong>: Mason bought ${tx.items.join(', ')} for ${tx.totalCost} points.</p>
    `).join('');
}

function renderShopHTML() {
    if (localState.products.length === 0) return '<p>The shop is currently empty.</p>';
    return localState.products.map(product => {
        const discountedPrice = Math.ceil(product.points * (1 - (product.discount || 0) / 100));
        const canAfford = localState.masonPoints >= discountedPrice;
        return `
            <div class="product-card">
                <img src="${product.img}" alt="${product.name}">
                <div class="product-name">${product.name}</div>
                <div class="product-points">
                    ${discountedPrice} Points
                    ${product.discount > 0 ? `<span class="original-price">${product.points}</span>` : ''}
                </div>
                <button class="add-to-cart-button" data-id="${product.id}" ${canAfford ? '' : 'disabled'}>Add to Cart</button>
            </div>
        `;
    }).join('');
}

function renderCartHTML() {
    if (localState.cart.length === 0) return '<p>Your cart is empty.</p>';
    const totalCost = localState.cart.reduce((sum, item) => sum + Math.ceil(item.points * (1 - (item.discount || 0) / 100)), 0);
    const cartItemsHTML = localState.cart.map(item => `
        <div class="cart-item">
            <span>${item.name} (${Math.ceil(item.points * (1 - (item.discount || 0) / 100))} pts)</span>
            <button class="remove-from-cart-button" data-id="${item.id}">Remove</button>
        </div>
    `).join('');

    return `
        <div id="cart-items">${cartItemsHTML}</div>
        <div id="cart-footer">
            <p>Total Cost: <span id="cart-total">${totalCost}</span> Points</p>
            <p class="cart-notice">All products given at next match.</p>
            <button id="purchase-button" ${localState.masonPoints < totalCost ? 'disabled' : ''}>Purchase Cart?</button>
        </div>
    `;
}

// --- EVENT HANDLERS ---
document.body.addEventListener('click', e => {
    // --- Login/Logout ---
    if (e.target.matches('#login-button')) {
        const password = document.getElementById('admin-password').value;
        if (password === ADMIN_PASSWORD) {
            localState.currentUser = 'admin';
            render();
        } else {
            document.getElementById('login-error').textContent = 'Incorrect password.';
        }
    }
    if (e.target.matches('#mason-login-link')) {
        e.preventDefault();
        localState.currentUser = 'mason';
        render();
    }
    if (e.target.matches('#logout-button')) {
        localState.currentUser = null;
        render();
    }

    // --- Admin Actions ---
    if (e.target.matches('#give-points-button')) {
        db.collection("appData").doc("masonState").update({
            points: firebase.firestore.FieldValue.increment(10)
        });
    }
    if (e.target.matches('#admin-propose-date-button')) {
        const date = document.getElementById('admin-date-input').value;
        if(date) db.collection("dates").doc(date).set({ status: 'proposed', proposedBy: 'admin' });
    }
    if (e.target.matches('.discount-btn')) {
        const id = e.target.dataset.id;
        const discountValue = document.querySelector(`.discount-input[data-id="${id}"]`).value;
        db.collection("products").doc(id).update({ discount: parseInt(discountValue) || 0 });
    }
     if(e.target.matches('.remove-item-btn')) {
        if(confirm('Are you sure you want to delete this item?')) {
            db.collection("products").doc(e.target.dataset.id).delete();
        }
    }
    
    // --- Mason Actions ---
    if (e.target.matches('#mason-propose-date-button')) {
        const date = document.getElementById('mason-date-input').value;
        if(date) db.collection("dates").doc(date).set({ status: 'proposed', proposedBy: 'mason' });
    }
     if (e.target.matches('.add-to-cart-button')) {
        const product = localState.products.find(p => p.id === e.target.dataset.id);
        if (product) localState.cart.push(product);
        render(); // Just re-render the local cart, no sync needed
    }
    if (e.target.matches('.remove-from-cart-button')) {
        const itemIndex = localState.cart.findIndex(item => item.id === e.target.dataset.id);
        if (itemIndex > -1) localState.cart.splice(itemIndex, 1);
        render(); // Just re-render the local cart
    }
    if(e.target.matches('#purchase-button')) {
        const totalCost = localState.cart.reduce((sum, item) => sum + Math.ceil(item.points * (1 - (item.discount || 0) / 100)), 0);
        
        // Add transaction record
        db.collection("transactions").add({
            date: new Date(),
            items: localState.cart.map(item => item.name),
            totalCost: totalCost
        });
        
        // Decrement points
        db.collection("appData").doc("masonState").update({
            points: firebase.firestore.FieldValue.increment(-totalCost)
        });

        localState.cart = []; // Clear local cart
        alert('Purchase successful!');
        render();
    }

    // --- Shared Actions ---
    if (e.target.matches('.accept-date')) {
        db.collection("dates").doc(e.target.dataset.date).update({ status: 'accepted' });
    }
    if (e.target.matches('.deny-date')) {
        db.collection("dates").doc(e.target.dataset.date).update({ status: 'denied' });
    }
});

// Event listener for admin form submission
document.body.addEventListener('submit', e => {
    if(e.target.matches('#add-product-form')) {
        e.preventDefault();
        db.collection("products").add({
            name: document.getElementById('product-name').value,
            img: document.getElementById('product-image').value,
            points: parseInt(document.getElementById('product-points').value),
            discount: 0
        });
        e.target.reset();
    }
});