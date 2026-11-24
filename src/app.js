/**
 * AuraStore - Mini Checkout Application
 * Features:
 * - 2 Synthetic Products with fixed prices:
 *   Product 1: Wireless Mouse – ₹799
 *   Product 2: Mechanical Keyboard – ₹1,499
 * - Dynamic Cart (Add, Remove, Quantity adjustments)
 * - Accurate calculations: Line Total = Unit Price × Quantity, Order Total = Sum of All Line Totals
 * - Prevention of invalid quantities (minimum 1, disabled decrement at 1)
 * - Currency formatting in INR (₹)
 * - Strict Validation (Empty cart block, blank name validation)
 * - Full data preservation on validation failures
 * - Synchronous Submission Guard against rapid double-clicks (Idempotency)
 */

(function () {
  'use strict';

  // 1. Synthetic Products Catalog
  const PRODUCTS = [
    {
      id: 'prod-mouse',
      name: 'Wireless Mouse',
      description: 'Ergonomic 2.4GHz wireless optical mouse with silent clicks.',
      price: 799,
      icon: '🖱️'
    },
    {
      id: 'prod-keyboard',
      name: 'Mechanical Keyboard',
      description: 'Ergonomic hot-swappable switches with RGB backlight.',
      price: 1499,
      icon: '⌨️'
    }
  ];

  // 2. Application State
  const state = {
    cart: {}, // productId -> quantity
    isSubmitting: false,
    orderPlaced: false,
    orderReference: null
  };

  // Synchronous submission lock (guard against rapid double-clicks)
  let submissionGuard = false;

  // 3. DOM Elements Cache
  const elements = {
    productsContainer: document.getElementById('productsContainer'),
    cartItemsList: document.getElementById('cartItemsList'),
    subtotalAmount: document.getElementById('subtotalAmount'),
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
  function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '₹0';
    }
    return '₹' + amount.toLocaleString('en-IN');
  }

  function getCartItemCount() {
    return Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
  }

  function calculateTotals() {
    let orderTotal = 0;
    for (const [productId, qty] of Object.entries(state.cart)) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product && qty > 0) {
        orderTotal += product.price * qty;
      }
    }

    return {
      subtotal: orderTotal,
      orderTotal: orderTotal
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
          <span class="product-price" data-testid="product-price-${prod.id}">${formatCurrency(prod.price)}</span>
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
        const lineTotal = product.price * qty;

        return `
          <div class="cart-item-row" data-testid="cart-item-${product.id}">
            <div class="cart-item-info">
              <span class="cart-item-title" data-testid="cart-item-title-${product.id}">${product.name}</span>
              <span class="cart-item-unit-price" data-testid="cart-item-unit-price-${product.id}">${formatCurrency(product.price)} each</span>
            </div>
            <div class="cart-item-controls">
              <button
                type="button"
                class="btn-qty btn-decrement"
                data-testid="decrement-qty-btn-${product.id}"
                data-product-id="${product.id}"
                aria-label="Decrease quantity of ${product.name}"
                ${qty <= 1 ? 'disabled aria-disabled="true"' : ''}
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
              <div class="cart-line-total" data-testid="line-total-${product.id}">${formatCurrency(lineTotal)}</div>
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

    // Update totals accurately
    const totals = calculateTotals();
    if (elements.subtotalAmount) {
      elements.subtotalAmount.textContent = formatCurrency(totals.subtotal);
    }
    if (elements.orderTotal) {
      elements.orderTotal.textContent = formatCurrency(totals.orderTotal);
    }
  }

  // 6. Cart Actions
  function addToCart(productId) {
    if (state.orderPlaced || state.isSubmitting) return; // Disallow edits during or after order
    state.cart[productId] = (state.cart[productId] || 0) + 1;
    clearCartError();
    renderCart();
  }

  function updateQuantity(productId, delta) {
    if (state.orderPlaced || state.isSubmitting) return;
    const currentQty = state.cart[productId] || 0;
    const newQty = currentQty + delta;

    // Prevent invalid quantities: minimum is 1; cannot drop below 1 with decrement
    if (newQty < 1) {
      return;
    }
    // Prevent unrealistic or invalid high quantities
    if (newQty > 99) {
      return;
    }

    state.cart[productId] = newQty;
    clearCartError();
    renderCart();
  }

  function removeFromCart(productId) {
    if (state.orderPlaced || state.isSubmitting) return;
    delete state.cart[productId];
    clearCartError();
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

  // 8. Place Order & Synchronous Idempotent Guard
  function handlePlaceOrder() {
    // SYNCHRONOUS SUBMISSION GUARD:
    // If order is already submitted, or in-flight, immediately exit synchronously!
    if (submissionGuard || state.orderPlaced) {
      return;
    }

    // 1. Validate Cart Non-Empty
    const itemCount = getCartItemCount();
    if (itemCount === 0) {
      showCartError('Cannot place order: Your cart is empty. Please add at least one product.');
      return; // Cart and customer name input are preserved
    } else {
      clearCartError();
    }

    // 2. Validate Required Customer Name (Preserves value if invalid)
    const nameValue = (elements.customerName.value || '').trim();
    if (!nameValue) {
      showNameError('Customer Name is required to place an order.');
      elements.customerName.focus();
      return; // Cart and customer name input are preserved
    } else {
      clearNameError();
    }

    // 3. Immediately engage synchronous lock
    // Prevents any rapid double-click events from creating two confirmations
    submissionGuard = true;
    state.isSubmitting = true;
    elements.placeOrderBtn.disabled = true;
    elements.placeOrderBtn.classList.add('loading');
    elements.placeOrderBtn.querySelector('.btn-text').textContent = 'Processing...';

    // 4. Complete order
    completeOrder(nameValue);
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
    elements.confirmTotal.textContent = formatCurrency(totals.orderTotal);

    // List confirmed items
    const itemsHtml = Object.entries(state.cart)
      .map(([productId, qty]) => {
        const prod = PRODUCTS.find(p => p.id === productId);
        return prod ? `
          <div class="confirm-item-row">
            <span>${prod.name} × ${qty}</span>
            <span>${formatCurrency(prod.price * qty)}</span>
          </div>
        ` : '';
      })
      .join('');
    elements.confirmItemsList.innerHTML = itemsHtml;

    // Show modal
    elements.confirmationModal.hidden = false;
    elements.confirmationModal.removeAttribute('hidden');

    // Permanently disable place order button for this completed order
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
    submissionGuard = false;

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
