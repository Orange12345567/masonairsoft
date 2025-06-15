window.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let state = JSON.parse(localStorage.getItem('masonAirsoftState_v2')) || {
        currentUser: null,
        masonPoints: 0,
        dates: {}, // Format: { 'YYYY-MM-DD': { status: 'proposed', proposedBy: 'mason' } }
        products: [], // Shop starts empty now
        cart: [],
        transactions: [],
        nextProductId: 1 // Start IDs at 1
    };

    // --- DOM ELEMENT SELECTORS ---
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const adminPasswordInput = document.getElementById('admin-password');
    const loginButton = document.getElementById('login-button');
    const masonLoginLink = document.getElementById('mason-login-link');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');

    // Views
    const adminView = document.getElementById('admin-view');
    const masonView = document.getElementById('mason-view');

    // Admin Elements
    const adminPointsDisplay = document.getElementById('admin-points-display');
    const givePointsButton = document.getElementById('give-points-button');
    const addProductForm = document.getElementById('add-product-form');
    const transactionHistoryContainer = document.getElementById('transaction-history');
    const manageShopContainer = document.getElementById('manage-shop-container');
    const adminDateInput = document.getElementById('admin-date-input');
    const adminProposeDateButton = document.getElementById('admin-propose-date-button');
    const adminDateList = document.getElementById('admin-date-list');
    
    // Mason Elements
    const masonPointsDisplay = document.getElementById('mason-points-display');
    const shopContainer = document.getElementById('shop-container');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const cartTotalSpan = document.getElementById('cart-total');
    const purchaseButton = document.getElementById('purchase-button');
    const masonDateInput = document.getElementById('mason-date-input');
    const masonProposeDateButton = document.getElementById('mason-propose-date-button');
    const masonDateList = document.getElementById('mason-date-list');

    const ADMIN_PASSWORD = "Charcoal11!";

    // --- DATA PERSISTENCE ---
    function saveData() {
        localStorage.setItem('masonAirsoftState_v2', JSON.stringify(state));
    }

    // --- RENDER FUNCTIONS ---
    function renderApp() {
        if (!state.currentUser) {
            loginScreen.style.display = 'flex';
            appContainer.style.display = 'none';
        } else {
            loginScreen.style.display = 'none';
            appContainer.style.display = 'block';
            if (state.currentUser === 'admin') {
                adminView.style.display = 'block';
                masonView.style.display = 'none';
                renderAdminView();
            } else {
                adminView.style.display = 'none';
                masonView.style.display = 'block';
                renderMasonView();
            }
        }
    }
    
    function renderAdminView() {
        adminPointsDisplay.textContent = state.masonPoints;
        renderDateList(adminDateList, 'admin');
        renderTransactionHistory();
        renderAdminShopManagement();
    }

    function renderMasonView() {
        masonPointsDisplay.textContent = state.masonPoints;
        renderDateList(masonDateList, 'mason');
        renderShop();
        renderCart();
    }

    function renderDateList(container, userType) {
        container.innerHTML = '';
        const sortedDates = Object.keys(state.dates).sort(); // Sort dates chronologically

        if (sortedDates.length === 0) {
            container.innerHTML = '<p>No dates proposed yet.</p>';
            return;
        }

        sortedDates.forEach(dateStr => {
            const dateInfo = state.dates[dateStr];
            const dateItem = document.createElement('div');
            dateItem.className = 'date-item';

            dateItem.innerHTML = `
                <div class="date-item-info">
                    <span>${dateStr}</span> (by ${dateInfo.proposedBy})
                    <span class="status ${dateInfo.status}">${dateInfo.status}</span>
                </div>
                <div class="date-item-actions"></div>
            `;
            
            // NEW LOGIC: Only show buttons if the date is 'proposed' AND was NOT proposed by the current user.
            if (dateInfo.status === 'proposed' && dateInfo.proposedBy !== userType) {
                const actionsContainer = dateItem.querySelector('.date-item-actions');
                actionsContainer.innerHTML = `
                    <button class="accept-date" data-date="${dateStr}">Accept</button>
                    <button class="deny-date" data-date="${dateStr}">Deny</button>
                `;
            }
            container.appendChild(dateItem);
        });
    }
    
    function renderAdminShopManagement() {
        manageShopContainer.innerHTML = '';
        if (state.products.length === 0) {
            manageShopContainer.innerHTML = '<p>No items in shop to manage.</p>';
            return;
        }
        state.products.forEach(product => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'manage-item';
            itemDiv.innerHTML = `
                <span class="manage-item-name">${product.name} (${product.points} pts)</span>
                <input type="number" class="discount-input" data-id="${product.id}" placeholder="%" value="${product.discount || ''}">
                <div>
                    <button class="discount-btn" data-id="${product.id}">Set</button>
                    <button class="remove-item-btn" data-id="${product.id}">X</button>
                </div>
            `;
            manageShopContainer.appendChild(itemDiv);
        });
    }

    function renderShop() {
        shopContainer.innerHTML = '';
        if (state.products.length === 0) {
            shopContainer.innerHTML = '<p>The shop is currently empty.</p>';
            return;
        }
        state.products.forEach(product => {
            const discountedPrice = Math.ceil(product.points * (1 - (product.discount || 0) / 100));
            const canAfford = state.masonPoints >= discountedPrice;

            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.img}" alt="${product.name}">
                <div class="product-name">${product.name}</div>
                <div class="product-points">
                    ${discountedPrice} Points
                    ${product.discount > 0 ? `<span class="original-price">${product.points}</span>` : ''}
                </div>
                <button class="add-to-cart-button" data-id="${product.id}" ${canAfford ? '' : 'disabled'}>Add to Cart</button>
            `;
            shopContainer.appendChild(productCard);
        });
    }

    function renderCart() {
        cartItemsContainer.innerHTML = '';
        if (state.cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            cartFooter.style.display = 'none';
            return;
        }
        let totalCost = 0;
        state.cart.forEach(item => {
            const discountedPrice = Math.ceil(item.points * (1 - (item.discount || 0) / 100));
            totalCost += discountedPrice;
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <span>${item.name} (${discountedPrice} pts)</span>
                <button class="remove-from-cart-button" data-id="${item.id}">Remove</button>
            `;
            cartItemsContainer.appendChild(cartItem);
        });
        cartFooter.style.display = 'block';
        cartTotalSpan.textContent = totalCost;
        purchaseButton.disabled = state.masonPoints < totalCost;
    }

    function renderTransactionHistory() {
        transactionHistoryContainer.innerHTML = '';
        if (state.transactions.length === 0) {
            transactionHistoryContainer.innerHTML = '<p>No purchases yet.</p>';
            return;
        }
        state.transactions.slice().reverse().forEach(tx => {
             const txDiv = document.createElement('div');
             txDiv.innerHTML = `<p><strong>${new Date(tx.date).toLocaleDateString()}</strong>: Mason bought ${tx.items.join(', ')} for ${tx.totalCost} points.</p>`;
             transactionHistoryContainer.appendChild(txDiv);
        });
    }

    // --- EVENT HANDLERS ---
    loginButton.addEventListener('click', () => {
        if (adminPasswordInput.value === ADMIN_PASSWORD) {
            state.currentUser = 'admin';
            adminPasswordInput.value = '';
            loginError.textContent = '';
            renderApp();
        } else {
            loginError.textContent = 'Incorrect password.';
        }
    });

    masonLoginLink.addEventListener('click', e => { e.preventDefault(); state.currentUser = 'mason'; renderApp(); });
    logoutButton.addEventListener('click', () => { state.currentUser = null; saveData(); renderApp(); });
    givePointsButton.addEventListener('click', () => { state.masonPoints += 10; saveData(); renderAdminView(); });

    adminProposeDateButton.addEventListener('click', () => {
        const date = adminDateInput.value;
        if(date) state.dates[date] = { status: 'proposed', proposedBy: 'admin' };
        saveData(); renderApp();
    });

    masonProposeDateButton.addEventListener('click', () => {
        const date = masonDateInput.value;
        if(date) state.dates[date] = { status: 'proposed', proposedBy: 'mason' };
        saveData(); renderApp();
    });

    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newProduct = {
            id: state.nextProductId++,
            name: document.getElementById('product-name').value,
            img: document.getElementById('product-image').value,
            points: parseInt(document.getElementById('product-points').value),
            discount: 0 // Discount is now set separately
        };
        state.products.push(newProduct);
        saveData();
        addProductForm.reset();
        renderAdminView();
    });
    
    document.body.addEventListener('click', (e) => {
        let changed = false;
        // Date Actions
        if (e.target.matches('.accept-date')) {
            state.dates[e.target.dataset.date].status = 'accepted';
            changed = true;
        }
        if (e.target.matches('.deny-date')) {
            state.dates[e.target.dataset.date].status = 'denied';
            changed = true;
        }
        
        // Admin Shop Management Actions
        if(e.target.matches('.discount-btn')) {
            const productId = parseInt(e.target.dataset.id);
            const input = document.querySelector(`.discount-input[data-id="${productId}"]`);
            const product = state.products.find(p => p.id === productId);
            if(product && input) {
                product.discount = parseInt(input.value) || 0;
                changed = true;
            }
        }
        if(e.target.matches('.remove-item-btn')) {
            const productId = parseInt(e.target.dataset.id);
            state.products = state.products.filter(p => p.id !== productId);
            changed = true;
        }

        // Mason Shop & Cart Actions
        if (e.target.matches('.add-to-cart-button')) {
            const product = state.products.find(p => p.id === parseInt(e.target.dataset.id));
            if (product) state.cart.push(product);
            changed = true;
        }
        if (e.target.matches('.remove-from-cart-button')) {
            const itemIndex = state.cart.findIndex(item => item.id === parseInt(e.target.dataset.id));
            if(itemIndex > -1) state.cart.splice(itemIndex, 1);
            changed = true;
        }
        if(e.target.matches('#purchase-button')) {
            const totalCost = state.cart.reduce((sum, item) => sum + Math.ceil(item.points * (1 - (item.discount || 0) / 100)), 0);
            if(state.masonPoints >= totalCost) {
                state.masonPoints -= totalCost;
                state.transactions.push({ date: new Date().toISOString(), items: state.cart.map(item => item.name), totalCost });
                state.cart = [];
                alert('Purchase successful!');
                changed = true;
            }
        }

        if (changed) {
            saveData();
            renderApp();
        }
    });

    // Initial load
    renderApp();
});