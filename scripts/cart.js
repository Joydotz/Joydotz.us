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
    const cartTotalEl = document.getElementById('cart-total');

    if (!cartContainer || !cartTotalEl) return;

    cartContainer.innerHTML = ''; // Clear previous content
    let totalCost = 0;

    const cartItems = Object.keys(cart);

    if (cartItems.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart-message">Your cart is empty.</p>';
        cartTotalEl.textContent = '$0.00';
        return;
    }

    cartItems.forEach(productId => {
        const product = PRODUCTS[productId];
        const quantity = cart[productId];

        if (product && quantity > 0) {
            const itemCost = product.price * quantity;
            totalCost += itemCost;

            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            cartItemEl.innerHTML = `
                <div class="cart-item-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="cart-item-details">
                    <h3>${product.name}</h3>
                    <span class="price">$${product.price.toFixed(2)}</span>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" data-product-id="${productId}" data-change="-1">-</button>
                    <span class="quantity-label">${quantity}</span>
                    <button class="quantity-btn" data-product-id="${productId}" data-change="1">+</button>
                </div>
                <div class="cart-item-total">$${itemCost.toFixed(2)}</div>
            `;
            cartContainer.appendChild(cartItemEl);
        }
    });

    cartTotalEl.textContent = `$${totalCost.toFixed(2)}`;

    // Add event listeners to new quantity buttons
    cartContainer.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.target.dataset.productId;
            const change = parseInt(event.target.dataset.change, 10);
            updateCartQuantity(productId, change, PRODUCTS);
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