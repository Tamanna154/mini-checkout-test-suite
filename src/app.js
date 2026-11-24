/**
 * AuraStore - Mini Checkout Application
 * Features:
 * - 2 Synthetic Products with fixed prices
 * - Dynamic Cart (Add, Remove, Quantity adjustments)
 * - Accurate financial rounding (cents-based)
 * - Strict Validation (Empty cart block, required name validation)
 * - Input value preservation on validation errors
 * - Rapid double-click protection (Idempotency)
 */

(function () {
  'use strict';

  // 1. Synthetic Products Catalog
  const PRODUCTS = [
    {
      id: 'prod-headphones',
      name: 'Aura Pro Wireless Headphones',
      description: 'Active noise cancellation with 40-hour battery life.',
      priceCents: 7999, // $79.99
      icon: '🎧'
    },
    {
      id: 'prod-keyboard',
      name: 'KeyForge Mechanical Keyboard',
      description: 'Ergonomic hot-swappable switches with RGB backlight.',
      priceCents: 4999, // $49.99
      icon: '⌨️'
    }
  ];

  const TAX_RATE = 0.08; // 8%

  // 2. Application State
  const state = {
    cart: {}, // productId -> quantity
    isSubmitting: false,
    orderPlaced: false,
    orderReference: null
  };

  // 3. DOM Elements Cache
  const elements = {
    productsContainer: document.getElementById('productsContainer'),
    cartItemsList: document.getElementById('cartItemsList'),
    subtotalAmount: document.getElementById('subtotalAmount'),
    taxAmount: document.getElementById('taxAmount'),
    shippingAmount: document.getElementById('shippingAmount'),
    orderTotal: document.getElementById('orderTotal'),
    customerName: document.getElementById('customerName'),
    customerEmail: document.getElementById('customerEmail'),
    nameError: document.getElementById('nameError'),
    cartError: document.getElementById('cartError'),
    placeOrderBtn: document.getElementById('placeOrderBtn'),
    confirmationModal: document.getElementById('confirmationModal'),
    confirmReference: document.getElementById('confirmReference'),
    confirmCustomerName: document.getElementById('confirmCustomerName'),
    confirmTotal: document.getElementById('confirmTotal'),
    confirmItemsList: document.getElementById('confirmItemsList'),
    startNewOrderBtn: document.getElementById('startNewOrderBtn')
  };

  // 4. Utility Functions
  function formatCurrency(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function getCartItemCount() {
    return Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
  }

  function calculateTotals() {
    let subtotalCents = 0;
    for (const [productId, qty] of Object.entries(state.cart)) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product && qty > 0) {
        subtotalCents += product.priceCents * qty;
      }
    }

    const taxCents = Math.round(subtotalCents * TAX_RATE);
    const shippingCents = 0; // Free shipping
    const totalCents = subtotalCents + taxCents + shippingCents;

    return {
      subtotalCents,
      taxCents,
      shippingCents,
      totalCents
    };
  }

  // 5. Render Functions
  function renderProducts() {
    if (!elements.productsContainer) return;

    elements.productsContainer.innerHTML = PRODUCTS.map(prod => `
      <article class="product-card" data-testid="product-card-${prod.id}">
        <div>
          <div class="product-icon" aria-hidden="true">${prod.icon}</div>
          <h3 class="product-name" data-testid="product-title-${prod.id}">${prod.name}</h3>
          <p class="product-description">${prod.description}</p>
        </div>
        <div class="product-footer">
          <span class="product-price" data-testid="product-price-${prod.id}">${formatCurrency(prod.priceCents)}</span>
          <button
            type="button"
            class="btn-add-product"
            data-testid="add-to-cart-btn-${prod.id}"
            data-product-id="${prod.id}"
            aria-label="Add ${prod.name} to cart"
          >
            Add to Cart
          </button>
        </div>
      </article>
    `).join('');

    // Attach event listeners to Add buttons
    elements.productsContainer.querySelectorAll('.btn-add-product').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-product-id');
        addToCart(id);
      });
    });
  }

  function renderCart() {
    const itemEntries = Object.entries(state.cart).filter(([, qty]) => qty > 0);

    if (itemEntries.length === 0) {
      elements.cartItemsList.innerHTML = `
        <div class="cart-empty-state" data-testid="cart-empty-state">
          <span class="empty-icon" aria-hidden="true">🛒</span>
          <p>Your cart is empty.</p>
          <p class="tagline">Add products from the left to start checkout.</p>
        </div>
      `;
    } else {
      elements.cartItemsList.innerHTML = itemEntries.map(([productId, qty]) => {
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) return '';
        const lineTotalCents = product.priceCents * qty;

        return `
          <div class="cart-item-row" data-testid="cart-item-${product.id}">
            <div class="cart-item-info">
              <span class="cart-item-title" data-testid="cart-item-title-${product.id}">${product.name}</span>
              <span class="cart-item-unit-price" data-testid="cart-item-unit-price-${product.id}">${formatCurrency(product.priceCents)} each</span>
            </div>
            <div class="cart-item-controls">
              <button
                type="button"
                class="btn-qty btn-decrement"
                data-testid="decrement-qty-btn-${product.id}"
                data-product-id="${product.id}"
                aria-label="Decrease quantity of ${product.name}"
              >−</button>
              <span class="qty-display" data-testid="item-qty-${product.id}">${qty}</span>
              <button
                type="button"
                class="btn-qty btn-increment"
                data-testid="increment-qty-btn-${product.id}"
                data-product-id="${product.id}"
                aria-label="Increase quantity of ${product.name}"
              >+</button>
            </div>
            <div class="cart-item-price-col">
              <div class="cart-line-total" data-testid="line-total-${product.id}">${formatCurrency(lineTotalCents)}</div>
              <button
                type="button"
                class="btn-remove-item"
                data-testid="remove-item-btn-${product.id}"
                data-product-id="${product.id}"
                aria-label="Remove ${product.name} from cart"
              >Remove</button>
            </div>
          </div>
        `;
      }).join('');

      // Wire up cart item buttons
      elements.cartItemsList.querySelectorAll('.btn-increment').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-product-id');
          updateQuantity(id, 1);
        });
      });

      elements.cartItemsList.querySelectorAll('.btn-decrement').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-product-id');
          updateQuantity(id, -1);
        });
      });

      elements.cartItemsList.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-product-id');
          removeFromCart(id);
        });
      });
    }

    // Update totals
    const totals = calculateTotals();
    elements.subtotalAmount.textContent = formatCurrency(totals.subtotalCents);
    elements.taxAmount.textContent = formatCurrency(totals.taxCents);
    elements.shippingAmount.textContent = totals.subtotalCents > 0 ? 'FREE' : '$0.00';
    elements.orderTotal.textContent = formatCurrency(totals.totalCents);
  }

  // 6. Cart Actions
  function addToCart(productId) {
    if (state.orderPlaced) return; // Disallow edits after order
    state.cart[productId] = (state.cart[productId] || 0) + 1;
    clearCartError();
    renderCart();
  }

  function updateQuantity(productId, delta) {
    if (state.orderPlaced) return;
    const currentQty = state.cart[productId] || 0;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      delete state.cart[productId];
    } else {
      state.cart[productId] = newQty;
    }
    clearCartError();
    renderCart();
  }

  function removeFromCart(productId) {
    if (state.orderPlaced) return;
    delete state.cart[productId];
    renderCart();
  }

  // 7. Validation Logic
  function showNameError(message) {
    elements.nameError.textContent = message;
    elements.nameError.classList.add('visible');
    elements.customerName.classList.add('has-error');
    elements.customerName.setAttribute('aria-invalid', 'true');
  }

  function clearNameError() {
    elements.nameError.textContent = '';
    elements.nameError.classList.remove('visible');
    elements.customerName.classList.remove('has-error');
    elements.customerName.removeAttribute('aria-invalid');
  }

  function showCartError(message) {
    elements.cartError.textContent = message;
    elements.cartError.classList.add('visible');
  }

  function clearCartError() {
    elements.cartError.textContent = '';
    elements.cartError.classList.remove('visible');
  }

  // 8. Place Order & Idempotent Submission Protection
  function handlePlaceOrder() {
    // Race-condition guard: If already submitting or already placed, ignore click!
    if (state.isSubmitting || state.orderPlaced) {
      return;
    }

    let isValid = true;

    // Validate Required Customer Name (Preserves value if invalid)
    const nameValue = (elements.customerName.value || '').trim();
    if (!nameValue) {
      showNameError('Customer Name is required to place an order.');
      elements.customerName.focus();
      isValid = false;
    } else {
      clearNameError();
    }

    // Validate Cart Non-Empty
    const itemCount = getCartItemCount();
    if (itemCount === 0) {
      showCartError('Cannot place order: Your cart is empty. Please add at least one product.');
      isValid = false;
    } else {
      clearCartError();
    }

    if (!isValid) {
      // NOTE: User's entered form values are deliberately preserved!
      return;
    }

    // Set lock immediately to block any subsequent rapid double-clicks
    state.isSubmitting = true;
    elements.placeOrderBtn.disabled = true;
    elements.placeOrderBtn.classList.add('loading');
    elements.placeOrderBtn.querySelector('.btn-text').textContent = 'Processing...';

    // Simulate realistic async transaction completion (or instant dispatch)
    setTimeout(() => {
      completeOrder(nameValue);
    }, 200);
  }

  function completeOrder(customerName) {
    // Generate unique order reference (e.g. ORD-839201-4921)
    const uniqueRef = 'ORD-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000);
    const totals = calculateTotals();

    state.orderPlaced = true;
    state.orderReference = uniqueRef;
    state.isSubmitting = false;

    // Populate confirmation modal
    elements.confirmReference.textContent = uniqueRef;
    elements.confirmCustomerName.textContent = customerName;
    elements.confirmTotal.textContent = formatCurrency(totals.totalCents);

    // List confirmed items
    const itemsHtml = Object.entries(state.cart)
      .map(([productId, qty]) => {
        const prod = PRODUCTS.find(p => p.id === productId);
        return prod ? `
          <div class="confirm-item-row">
            <span>${prod.name} × ${qty}</span>
            <span>${formatCurrency(prod.priceCents * qty)}</span>
          </div>
        ` : '';
      })
      .join('');
    elements.confirmItemsList.innerHTML = itemsHtml;

    // Show modal
    elements.confirmationModal.hidden = false;
    elements.confirmationModal.removeAttribute('hidden');

    // Keep place order button permanently disabled for this completed order
    elements.placeOrderBtn.classList.remove('loading');
    elements.placeOrderBtn.querySelector('.btn-text').textContent = 'Order Placed';
    elements.placeOrderBtn.disabled = true;
  }

  // 9. Reset Flow (Start Clean State)
  function resetOrder() {
    state.cart = {};
    state.isSubmitting = false;
    state.orderPlaced = false;
    state.orderReference = null;

    // Reset inputs
    elements.customerName.value = '';
    elements.customerEmail.value = '';
    clearNameError();
    clearCartError();

    // Reset buttons
    elements.placeOrderBtn.disabled = false;
    elements.placeOrderBtn.classList.remove('loading');
    elements.placeOrderBtn.querySelector('.btn-text').textContent = 'Place Order';

    // Hide confirmation modal
    elements.confirmationModal.hidden = true;
    elements.confirmationModal.setAttribute('hidden', '');

    // Re-render
    renderCart();
  }

  // 10. Initialization
  function init() {
    renderProducts();
    renderCart();

    // Clear validation error dynamically on user typing
    elements.customerName.addEventListener('input', () => {
      if (elements.customerName.value.trim().length > 0) {
        clearNameError();
      }
    });

    // Place Order button click
    elements.placeOrderBtn.addEventListener('click', handlePlaceOrder);

    // Start New Order button click
    elements.startNewOrderBtn.addEventListener('click', resetOrder);

    // Expose state helper for testing assertions/debugging if needed
    window.__AURA_CHECKOUT_STATE__ = {
      getState: () => ({ ...state }),
      resetOrder: resetOrder
    };
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
