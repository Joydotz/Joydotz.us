document.addEventListener("DOMContentLoaded", () => {
    // The user suggested a PRODUCTS object, but fetching from a file is more scalable.
    // We will fetch product data and then render the cart.
    loadProductsAndRenderCart();
});

async function loadProductsAndRenderCart() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error('Failed to load products.');
        const PRODUCTS = await response.json();
        renderCart(PRODUCTS);
    } catch (error) {
        console.error("Could not load products:", error);
        const cartContainer = document.getElementById('cart-items-container');
        if (cartContainer) {
            cartContainer.innerHTML = '<p>Error loading products. Please try again later.</p>';
        }
    }
}

function renderCart(PRODUCTS) {
    const cart = JSON.parse(localStorage.getItem("shoppingCart")) || {};
    const cartContainer = document.getElementById('cart-items-container');

    if (!cartContainer) return;

    cartContainer.innerHTML = ''; // Clear previous content
    let totalCost = 0;
    let totalItems = 0;

    const cartItems = Object.keys(cart);

    if (cartItems.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart-message">Your cart is empty.</p>';
        updateSummary(0, 0);
        return;
    }

    cartItems.forEach(productId => {
        const product = PRODUCTS[productId];
        const quantity = cart[productId];

        if (product && quantity > 0) {
            const itemCost = product.price * quantity;
            totalCost += itemCost;
            totalItems += quantity;

            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            cartItemEl.innerHTML = `
                <div class="cart-item-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="cart-item-details">
                    <h3>${product.name}</h3>
                </div>
                <div class="cart-item-price">$${itemCost.toFixed(2)}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" data-product-id="${productId}" data-change="-1">-</button>
                    <span class="quantity-label">${quantity}</span>
                    <button class="quantity-btn" data-product-id="${productId}" data-change="1">+</button>
                </div>
                <div class="cart-item-delete">
                    <button class="delete-btn" data-product-id="${productId}" aria-label="Delete item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;
            cartContainer.appendChild(cartItemEl);
        }
    });

    updateSummary(totalCost, totalItems);

    // Add event listeners to new quantity buttons
    cartContainer.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.target.dataset.productId;
            const change = parseInt(event.target.dataset.change, 10);
            updateCartQuantity(productId, change, PRODUCTS);
        });
    });

    // Add event listeners to delete buttons
    cartContainer.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const btn = event.target.closest('.delete-btn');
            const productId = btn.dataset.productId;
            let cart = JSON.parse(localStorage.getItem("shoppingCart")) || {};
            delete cart[productId];
            localStorage.setItem("shoppingCart", JSON.stringify(cart));
            renderCart(PRODUCTS);
        });
    });
}

function updateCartQuantity(productId, change, PRODUCTS) {
    let cart = JSON.parse(localStorage.getItem("shoppingCart")) || {};
    
    if (cart[productId]) {
        cart[productId] += change;
        if (cart[productId] <= 0) {
            delete cart[productId]; // Remove item if quantity is 0 or less
        }
    }

    localStorage.setItem("shoppingCart", JSON.stringify(cart));
    renderCart(PRODUCTS); // Re-render the cart to reflect changes
}

function updateSummary(subtotal, totalItems) {
    const shipping = 0;
    const tax = 0;
    const total = subtotal + shipping + tax;

    const countEl = document.getElementById('cart-item-count');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');

    if (countEl) countEl.textContent = `${totalItems} items in your curated ritual`;
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = `$${shipping.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}