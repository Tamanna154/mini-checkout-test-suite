// @ts-check
const { test, expect } = require('@playwright/test');
const { CheckoutPage } = require('./pages/CheckoutPage');

test.describe('Mini Checkout Customer Journey & Browser Test Suite', () => {
  /** @type {CheckoutPage} */
  let checkoutPage;

  test.beforeEach(async ({ page }) => {
    // Each check starts from an isolated, clean state
    checkoutPage = new CheckoutPage(page);
    await checkoutPage.goto();
  });

  // =========================================================================
  // CHECK 1: Successful Checkout Produces a Confirmation with Reference
  // =========================================================================
  test('Check 1: Successful checkout produces a clear order confirmation with unique reference', async ({ page }) => {
    // 1. Customer adds products to cart
    await checkoutPage.addHeadphones();
    await checkoutPage.addKeyboard();

    // Verify items are displayed in cart
    await expect(checkoutPage.getCartItem('prod-headphones')).toBeVisible();
    await expect(checkoutPage.getCartItem('prod-keyboard')).toBeVisible();

    // Verify totals before order ($79.99 + $49.99 = $129.98 subtotal; 8% tax = $10.40; total = $140.38)
    await expect(checkoutPage.subtotalAmount).toHaveText('$129.98');
    await expect(checkoutPage.taxAmount).toHaveText('$10.40');
    await expect(checkoutPage.orderTotal).toHaveText('$140.38');

    // 2. Customer fills required field (Customer Name) and optional Email
    const testCustomerName = 'Alex Rivera';
    await checkoutPage.setCustomerName(testCustomerName);
    await checkoutPage.setCustomerEmail('alex.rivera@example.com');

    // 3. Customer places order
    await checkoutPage.clickPlaceOrder();

    // 4. Assert confirmation modal appears
    await expect(checkoutPage.confirmationModal).toBeVisible();

    // 5. Assert confirmed customer name matches input
    await expect(checkoutPage.confirmedName).toHaveText(testCustomerName);

    // 6. Assert confirmed total matches expected total
    await expect(checkoutPage.confirmedTotal).toHaveText('$140.38');

    // 7. Assert a valid unique order reference is displayed (Format: ORD-XXXXXX-XXXX)
    await expect(checkoutPage.orderReference).toBeVisible();
    const orderRefText = await checkoutPage.orderReference.textContent();
    expect(orderRefText).toMatch(/^ORD-\d{6}-\d{4}$/);

    // 8. Assert Place Order button is disabled and prevents duplicate submission
    await expect(checkoutPage.placeOrderBtn).toBeDisabled();
  });

  // =========================================================================
  // CHECK 2: Missing Required Field Blocks Checkout & Preserves Input
  // =========================================================================
  test('Check 2: Missing required field blocks checkout, shows validation message, and preserves state', async ({ page }) => {
    // 1. Customer adds a product to cart
    await checkoutPage.addHeadphones();
    await expect(checkoutPage.getCartItem('prod-headphones')).toBeVisible();

    // 2. Customer fills optional email but leaves the REQUIRED Full Name blank
    await checkoutPage.setCustomerEmail('test.user@example.com');
    await checkoutPage.setCustomerName('   '); // whitespace only

    // 3. Customer attempts to place order
    await checkoutPage.clickPlaceOrder();

    // 4. Assert checkout is blocked: Confirmation modal MUST NOT be visible
    await expect(checkoutPage.confirmationModal).toBeHidden();

    // 5. Assert clear validation error message is displayed to customer
    await expect(checkoutPage.nameError).toBeVisible();
    await expect(checkoutPage.nameError).toHaveText('Customer Name is required to place an order.');

    // 6. Assert customer's input and cart are preserved (not wiped out)
    await expect(checkoutPage.customerEmailInput).toHaveValue('test.user@example.com');
    await expect(checkoutPage.getCartItem('prod-headphones')).toBeVisible();
    await expect(checkoutPage.orderTotal).toHaveText('$86.39'); // $79.99 + $6.40 tax

    // 7. Recovery check: Customer now types their name; error clears and order succeeds
    await checkoutPage.setCustomerName('Taylor Smith');
    await expect(checkoutPage.nameError).toBeHidden();

    await checkoutPage.clickPlaceOrder();
    await expect(checkoutPage.confirmationModal).toBeVisible();
    await expect(checkoutPage.confirmedName).toHaveText('Taylor Smith');
  });

  // =========================================================================
  // CHECK 3: Quantity Change Updates Exact Line Totals and Order Total
  // =========================================================================
  test('Check 3: Quantity change updates exact line totals and order total', async ({ page }) => {
    // 1. Add Headphones ($79.99 each)
    await checkoutPage.addHeadphones();

    // Initial state: 1 headphone
    // Subtotal: $79.99, Tax: $6.40, Total: $86.39
    await expect(checkoutPage.getItemQty('prod-headphones')).toHaveText('1');
    await expect(checkoutPage.getLineTotal('prod-headphones')).toHaveText('$79.99');
    await expect(checkoutPage.subtotalAmount).toHaveText('$79.99');
    await expect(checkoutPage.taxAmount).toHaveText('$6.40');
    await expect(checkoutPage.orderTotal).toHaveText('$86.39');

    // 2. Increase quantity to 2 (+1)
    await checkoutPage.getIncrementBtn('prod-headphones').click();

    // Line total: 2 * $79.99 = $159.98
    // Tax: 8% of $159.98 = $12.80
    // Total: $159.98 + $12.80 = $172.78
    await expect(checkoutPage.getItemQty('prod-headphones')).toHaveText('2');
    await expect(checkoutPage.getLineTotal('prod-headphones')).toHaveText('$159.98');
    await expect(checkoutPage.subtotalAmount).toHaveText('$159.98');
    await expect(checkoutPage.taxAmount).toHaveText('$12.80');
    await expect(checkoutPage.orderTotal).toHaveText('$172.78');

    // 3. Add Keyboard ($49.99 each) to verify multi-product calculation
    await checkoutPage.addKeyboard();

    // Subtotal: $159.98 + $49.99 = $209.97
    // Tax: 8% of $209.97 = $16.80
    // Total: $209.97 + $16.80 = $226.77
    await expect(checkoutPage.getItemQty('prod-keyboard')).toHaveText('1');
    await expect(checkoutPage.getLineTotal('prod-keyboard')).toHaveText('$49.99');
    await expect(checkoutPage.subtotalAmount).toHaveText('$209.97');
    await expect(checkoutPage.taxAmount).toHaveText('$16.80');
    await expect(checkoutPage.orderTotal).toHaveText('$226.77');

    // 4. Decrease headphones quantity back to 1 (-1)
    await checkoutPage.getDecrementBtn('prod-headphones').click();

    // Headphones line total: $79.99; Keyboard: $49.99
    // Subtotal: $129.98
    // Tax: 8% of $129.98 = $10.40
    // Total: $140.38
    await expect(checkoutPage.getItemQty('prod-headphones')).toHaveText('1');
    await expect(checkoutPage.getLineTotal('prod-headphones')).toHaveText('$79.99');
    await expect(checkoutPage.subtotalAmount).toHaveText('$129.98');
    await expect(checkoutPage.taxAmount).toHaveText('$10.40');
    await expect(checkoutPage.orderTotal).toHaveText('$140.38');
  });

  // =========================================================================
  // ADDITIONAL CHECK 4: Empty Cart Blocks Checkout
  // =========================================================================
  test('Check 4 (Risk Edge Case): Empty cart blocks checkout and displays clear warning', async ({ page }) => {
    // Cart is empty initially
    await expect(checkoutPage.cartEmptyState).toBeVisible();

    // Customer enters name
    await checkoutPage.setCustomerName('Morgan Riley');

    // Attempt to place order with 0 items
    await checkoutPage.clickPlaceOrder();

    // Confirmation must not open
    await expect(checkoutPage.confirmationModal).toBeHidden();

    // Cart error banner must show
    await expect(checkoutPage.cartError).toBeVisible();
    await expect(checkoutPage.cartError).toContainText('Cannot place order: Your cart is empty.');

    // Name input must be preserved
    await expect(checkoutPage.customerNameInput).toHaveValue('Morgan Riley');
  });

  // =========================================================================
  // ADDITIONAL CHECK 5: Rapid Double-Click Does Not Produce Multiple Confirmations
  // =========================================================================
  test('Check 5 (Risk Edge Case): Rapid double-click on Place Order produces exactly one confirmation', async ({ page }) => {
    // Add product and fill name
    await checkoutPage.addHeadphones();
    await checkoutPage.setCustomerName('Sam Jordan');

    // Rapid double-click simulation
    await checkoutPage.rapidClickPlaceOrder();

    // Wait for confirmation modal
    await expect(checkoutPage.confirmationModal).toBeVisible();

    // Assert only one confirmation modal exists in DOM
    const confirmationModals = page.locator('[data-testid="confirmation-modal"]');
    await expect(confirmationModals).toHaveCount(1);

    // Verify order reference is stable and singular
    const orderRefs = page.locator('[data-testid="order-reference"]');
    await expect(orderRefs).toHaveCount(1);
    const orderRef = await orderRefs.textContent();
    expect(orderRef).toMatch(/^ORD-\d{6}-\d{4}$/);

    // Verify Place Order button is disabled to prevent further triggers
    await expect(checkoutPage.placeOrderBtn).toBeDisabled();
  });

  // =========================================================================
  // ADDITIONAL CHECK 6: Item Removal Updates Order Summary & Clean Reset
  // =========================================================================
  test('Check 6: Remove item cleans cart and Start New Order resets state cleanly', async ({ page }) => {
    await checkoutPage.addHeadphones();
    await checkoutPage.addKeyboard();

    // Remove keyboard
    await checkoutPage.getRemoveBtn('prod-keyboard').click();
    await expect(checkoutPage.getCartItem('prod-keyboard')).toBeHidden();
    await expect(checkoutPage.subtotalAmount).toHaveText('$79.99');

    // Complete order
    await checkoutPage.setCustomerName('Casey Diaz');
    await checkoutPage.clickPlaceOrder();
    await expect(checkoutPage.confirmationModal).toBeVisible();

    // Click "Start New Order" to verify clean reset
    await checkoutPage.clickStartNewOrder();
    await expect(checkoutPage.confirmationModal).toBeHidden();
    await expect(checkoutPage.cartEmptyState).toBeVisible();
    await expect(checkoutPage.customerNameInput).toHaveValue('');
    await expect(checkoutPage.orderTotal).toHaveText('$0.00');
    await expect(checkoutPage.placeOrderBtn).toBeEnabled();
  });
});
