// @ts-check
const { test, expect } = require('@playwright/test');
const { CheckoutPage } = require('./pages/CheckoutPage');

test.describe('Mini Checkout Customer Journey & Browser Test Suite', () => {
  /** @type {CheckoutPage} */
  let checkoutPage;

  test.beforeEach(async ({ page }) => {
    // Each check starts from an isolated, clean application state
    checkoutPage = new CheckoutPage(page);
    await checkoutPage.goto();
  });

  // =========================================================================
  // TEST 1: Successful Checkout
  // Requirements:
  // - Start from a clean application state.
  // - Add a product.
  // - Enter a valid customer name.
  // - Place the order.
  // - Assert that the success confirmation is visible.
  // - Assert that an order reference is displayed.
  // - Assert that the correct total is displayed.
  // =========================================================================
  test('Test 1: Successful Checkout', async ({ page }) => {
    // 1. Customer adds a product to cart (Wireless Mouse – ₹799)
    await checkoutPage.addMouse();
    await expect(checkoutPage.getCartItem('prod-mouse')).toBeVisible();

    // Verify initial line total and order total
    await expect(checkoutPage.getLineTotal('prod-mouse')).toHaveText('₹799');
    await expect(checkoutPage.orderTotal).toHaveText('₹799');

    // 2. Customer enters a valid customer name
    const validCustomerName = 'Alex Rivera';
    await checkoutPage.setCustomerName(validCustomerName);
    await expect(checkoutPage.customerNameInput).toHaveValue(validCustomerName);

    // 3. Customer places the order
    await checkoutPage.clickPlaceOrder();

    // 4. Assert that the success confirmation is visible
    await expect(checkoutPage.confirmationModal).toBeVisible();

    // 5. Assert that an order reference is displayed
    await expect(checkoutPage.orderReference).toBeVisible();
    const orderRefText = await checkoutPage.orderReference.textContent();
    expect(orderRefText).toMatch(/^ORD-\d{6}-\d{4}$/);

    // 6. Assert that the correct total is displayed
    await expect(checkoutPage.confirmedTotal).toHaveText('₹799');

    // Assert confirmed customer name matches input and place order button is guarded
    await expect(checkoutPage.confirmedName).toHaveText(validCustomerName);
    await expect(checkoutPage.placeOrderBtn).toBeDisabled();
  });

  // =========================================================================
  // TEST 2: Missing Required Field
  // Requirements:
  // - Start from a clean application state.
  // - Add a product.
  // - Leave the customer name blank.
  // - Click Place Order.
  // - Assert that checkout is blocked.
  // - Assert that the validation message is visible.
  // - Assert that no success confirmation appears.
  // - Verify that the cart is preserved.
  // =========================================================================
  test('Test 2: Missing Required Field', async ({ page }) => {
    // 1. Customer adds a product to cart (Wireless Mouse – ₹799)
    await checkoutPage.addMouse();
    await expect(checkoutPage.getCartItem('prod-mouse')).toBeVisible();

    // 2. Customer leaves customer name blank (whitespace only)
    await checkoutPage.setCustomerName('   ');

    // 3. Customer clicks Place Order
    await checkoutPage.clickPlaceOrder();

    // 4. Assert that checkout is blocked: confirmation modal MUST NOT be visible
    await expect(checkoutPage.confirmationModal).toBeHidden();

    // 5. Assert that the validation message is visible
    await expect(checkoutPage.nameError).toBeVisible();
    await expect(checkoutPage.nameError).toHaveText('Customer Name is required to place an order.');

    // 6. Assert that no success confirmation appears
    await expect(checkoutPage.confirmationModal).toBeHidden();

    // 7. Verify that the cart is preserved
    await expect(checkoutPage.getCartItem('prod-mouse')).toBeVisible();
    await expect(checkoutPage.getItemQty('prod-mouse')).toHaveText('1');
    await expect(checkoutPage.getLineTotal('prod-mouse')).toHaveText('₹799');
    await expect(checkoutPage.orderTotal).toHaveText('₹799');

    // Recovery check: enter name, error clears and checkout succeeds
    await checkoutPage.setCustomerName('Taylor Smith');
    await expect(checkoutPage.nameError).toBeHidden();
    await checkoutPage.clickPlaceOrder();
    await expect(checkoutPage.confirmationModal).toBeVisible();
    await expect(checkoutPage.confirmedName).toHaveText('Taylor Smith');
  });

  // =========================================================================
  // TEST 3: Quantity and Exact Total
  // Requirements:
  // - Start from a clean application state.
  // - Add both products.
  // - Increase the quantity of one product.
  // - Assert the correct line total.
  // - Assert the exact order total.
  // - Verify the displayed total from the customer's perspective.
  // Example:
  // Mouse: ₹799 × 2 = ₹1,598
  // Keyboard: ₹1,499 × 1 = ₹1,499
  // Expected Order Total: ₹3,097
  // =========================================================================
  test('Test 3: Quantity and Exact Total', async ({ page }) => {
    // 1. Add both products (Mouse ₹799, Keyboard ₹1,499)
    await checkoutPage.addMouse();
    await checkoutPage.addKeyboard();

    await expect(checkoutPage.getCartItem('prod-mouse')).toBeVisible();
    await expect(checkoutPage.getCartItem('prod-keyboard')).toBeVisible();

    // Initial totals: Mouse 1x ₹799, Keyboard 1x ₹1,499 => ₹2,298
    await expect(checkoutPage.getItemQty('prod-mouse')).toHaveText('1');
    await expect(checkoutPage.getLineTotal('prod-mouse')).toHaveText('₹799');
    await expect(checkoutPage.getItemQty('prod-keyboard')).toHaveText('1');
    await expect(checkoutPage.getLineTotal('prod-keyboard')).toHaveText('₹1,499');
    await expect(checkoutPage.orderTotal).toHaveText('₹2,298');

    // 2. Increase the quantity of one product (Mouse to 2)
    await checkoutPage.getIncrementBtn('prod-mouse').click();

    // 3. Assert the correct line total
    // Mouse: ₹799 × 2 = ₹1,598
    await expect(checkoutPage.getItemQty('prod-mouse')).toHaveText('2');
    await expect(checkoutPage.getLineTotal('prod-mouse')).toHaveText('₹1,598');

    // Keyboard: ₹1,499 × 1 = ₹1,499
    await expect(checkoutPage.getItemQty('prod-keyboard')).toHaveText('1');
    await expect(checkoutPage.getLineTotal('prod-keyboard')).toHaveText('₹1,499');

    // 4. Assert the exact order total and subtotal
    // Expected Order Total: ₹1,598 + ₹1,499 = ₹3,097
    await expect(checkoutPage.subtotalAmount).toHaveText('₹3,097');
    await expect(checkoutPage.orderTotal).toHaveText('₹3,097');

    // 5. Verify the displayed total from the customer's perspective in modal upon completion
    await checkoutPage.setCustomerName('Jordan Lee');
    await checkoutPage.clickPlaceOrder();
    await expect(checkoutPage.confirmationModal).toBeVisible();
    await expect(checkoutPage.confirmedTotal).toHaveText('₹3,097');
  });

  // =========================================================================
  // ADDITIONAL TEST 4: Empty Cart Blocks Checkout (Edge Case Verification)
  // =========================================================================
  test('Test 4 (Edge Case): Empty cart blocks checkout and displays clear warning', async ({ page }) => {
    // Open application with empty cart
    await expect(checkoutPage.cartEmptyState).toBeVisible();

    // Customer enters name
    await checkoutPage.setCustomerName('Morgan Riley');

    // Attempt to place order with 0 items
    await checkoutPage.clickPlaceOrder();

    // Confirmation must NOT open
    await expect(checkoutPage.confirmationModal).toBeHidden();

    // Cart error banner must show
    await expect(checkoutPage.cartError).toBeVisible();
    await expect(checkoutPage.cartError).toContainText('Cannot place order: Your cart is empty.');

    // Name input must be preserved
    await expect(checkoutPage.customerNameInput).toHaveValue('Morgan Riley');
  });

  // =========================================================================
  // ADDITIONAL TEST 5: Rapid Double-Click Concurrency / Idempotency
  // =========================================================================
  test('Test 5 (Edge Case): Rapid double-click on Place Order produces exactly one confirmation', async ({ page }) => {
    // Add product and fill name
    await checkoutPage.addMouse();
    await checkoutPage.setCustomerName('Sam Jordan');

    // Rapid double-click simulation
    await checkoutPage.rapidClickPlaceOrder();

    // Wait for confirmation modal
    await expect(checkoutPage.confirmationModal).toBeVisible();

    // Assert only one confirmation modal exists in DOM
    const confirmationModals = page.locator('[data-testid="confirmation-modal"]');
    await expect(confirmationModals).toHaveCount(1);

    // Verify order reference is singular and matches pattern
    const orderRefs = page.locator('[data-testid="order-reference"]');
    await expect(orderRefs).toHaveCount(1);
    const orderRef = await orderRefs.textContent();
    expect(orderRef).toMatch(/^ORD-\d{6}-\d{4}$/);

    // Verify Place Order button is disabled to prevent further triggers
    await expect(checkoutPage.placeOrderBtn).toBeDisabled();
  });

  // =========================================================================
  // ADDITIONAL TEST 6: Item Removal & Clean Reset
  // =========================================================================
  test('Test 6 (Edge Case): Item removal updates order total and Start New Order resets state cleanly', async ({ page }) => {
    await checkoutPage.addMouse();
    await checkoutPage.addKeyboard();

    // Remove keyboard
    await checkoutPage.getRemoveBtn('prod-keyboard').click();
    await expect(checkoutPage.getCartItem('prod-keyboard')).toBeHidden();
    await expect(checkoutPage.orderTotal).toHaveText('₹799');

    // Complete order
    await checkoutPage.setCustomerName('Casey Diaz');
    await checkoutPage.clickPlaceOrder();
    await expect(checkoutPage.confirmationModal).toBeVisible();

    // Click "Start New Order" to verify clean reset
    await checkoutPage.clickStartNewOrder();
    await expect(checkoutPage.confirmationModal).toBeHidden();
    await expect(checkoutPage.cartEmptyState).toBeVisible();
    await expect(checkoutPage.customerNameInput).toHaveValue('');
    await expect(checkoutPage.orderTotal).toHaveText('₹0');
    await expect(checkoutPage.placeOrderBtn).toBeEnabled();
  });
});
