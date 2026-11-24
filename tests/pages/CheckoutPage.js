// @ts-check
const { expect } = require('@playwright/test');

/**
 * Page Object Model representing the Mini Checkout Page
 */
class CheckoutPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Product Catalog
    this.headphonesCard = page.getByTestId('product-card-prod-headphones');
    this.headphonesAddBtn = page.getByTestId('add-to-cart-btn-prod-headphones');
    this.headphonesPrice = page.getByTestId('product-price-prod-headphones');

    this.keyboardCard = page.getByTestId('product-card-prod-keyboard');
    this.keyboardAddBtn = page.getByTestId('add-to-cart-btn-prod-keyboard');
    this.keyboardPrice = page.getByTestId('product-price-prod-keyboard');

    // Cart Section
    this.cartItemsList = page.getByTestId('cart-items-list');
    this.cartEmptyState = page.getByTestId('cart-empty-state');

    // Financial Breakdown
    this.subtotalAmount = page.getByTestId('subtotal-amount');
    this.taxAmount = page.getByTestId('tax-amount');
    this.shippingAmount = page.getByTestId('shipping-amount');
    this.orderTotal = page.getByTestId('order-total');

    // Customer Form
    this.customerNameInput = page.getByTestId('customer-name-input');
    this.customerEmailInput = page.getByTestId('customer-email-input');
    this.nameError = page.getByTestId('name-error');
    this.cartError = page.getByTestId('cart-error');

    // Checkout Action
    this.placeOrderBtn = page.getByTestId('place-order-btn');

    // Confirmation Modal
    this.confirmationModal = page.getByTestId('confirmation-modal');
    this.orderReference = page.getByTestId('order-reference');
    this.confirmedName = page.getByTestId('confirmed-name');
    this.confirmedTotal = page.getByTestId('confirmed-total');
    this.confirmedItemsList = page.getByTestId('confirmed-items-list');
    this.startNewOrderBtn = page.getByTestId('start-new-order-btn');
  }

  // Navigation
  async goto() {
    await this.page.goto('/');
  }

  // Cart item helpers
  getCartItem(productId) {
    return this.page.getByTestId(`cart-item-${productId}`);
  }

  getItemQty(productId) {
    return this.page.getByTestId(`item-qty-${productId}`);
  }

  getLineTotal(productId) {
    return this.page.getByTestId(`line-total-${productId}`);
  }

  getIncrementBtn(productId) {
    return this.page.getByTestId(`increment-qty-btn-${productId}`);
  }

  getDecrementBtn(productId) {
    return this.page.getByTestId(`decrement-qty-btn-${productId}`);
  }

  getRemoveBtn(productId) {
    return this.page.getByTestId(`remove-item-btn-${productId}`);
  }

  // Actions
  async addHeadphones() {
    await this.headphonesAddBtn.click();
  }

  async addKeyboard() {
    await this.keyboardAddBtn.click();
  }

  async setCustomerName(name) {
    await this.customerNameInput.fill(name);
  }

  async setCustomerEmail(email) {
    await this.customerEmailInput.fill(email);
  }

  async clickPlaceOrder() {
    await this.placeOrderBtn.click();
  }

  /**
   * Simulates a rapid double-click on Place Order button
   */
  async rapidClickPlaceOrder() {
    await this.placeOrderBtn.dblclick();
  }

  async clickStartNewOrder() {
    await this.startNewOrderBtn.click();
  }
}

module.exports = { CheckoutPage };
