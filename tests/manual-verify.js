// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EVIDENCE_DIR = path.join(__dirname, '..', 'evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Ensure server is running
function checkServer() {
  return new Promise((resolve) => {
    http.get(BASE_URL, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function runManualChecks() {
  const serverRunning = await checkServer();
  let serverProcess = null;

  if (!serverRunning) {
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..') });
    await new Promise(r => setTimeout(r, 1500));
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {
    test4: {},
    test5: {}
  };

  try {
    console.log('--- EXECUTING TEST 4: Empty Cart Manual Verification ---');
    // Step 1: Open with empty cart
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'test4_01_empty_cart_initial.png') });

    // Step 2: Fill customer name
    const customerNameInput = page.getByTestId('customer-name-input');
    await customerNameInput.fill('Jane Doe');

    // Step 3: Verify cart is empty
    const cartEmptyState = page.getByTestId('cart-empty-state');
    const isCartEmptyVisible = await cartEmptyState.isVisible();

    // Step 4: Click Place Order
    const placeOrderBtn = page.getByTestId('place-order-btn');
    await placeOrderBtn.click();

    // Step 5: Verify outcomes
    const modal = page.getByTestId('confirmation-modal');
    const isModalVisible = await modal.isVisible();

    const cartError = page.getByTestId('cart-error');
    const isCartErrorVisible = await cartError.isVisible();
    const cartErrorText = await cartError.textContent();

    const preservedName = await customerNameInput.inputValue();

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'test4_02_empty_cart_blocked.png') });

    results.test4 = {
      isCartEmptyInitially: isCartEmptyVisible,
      isModalVisibleAfterSubmit: isModalVisible,
      isCartErrorVisible: isCartErrorVisible,
      cartErrorText: cartErrorText ? cartErrorText.trim() : '',
      preservedName: preservedName,
      orderCreated: isModalVisible,
      verdict: !isModalVisible && isCartErrorVisible && preservedName === 'Jane Doe' ? 'PASSED (No defect)' : 'FAILED'
    };
    console.log('Test 4 Result:', results.test4);

    console.log('\n--- EXECUTING TEST 5: Rapid Double-Click Manual Verification ---');
    // Clean state
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Step 1: Add product
    const addMouseBtn = page.getByTestId('add-to-cart-btn-prod-mouse');
    await addMouseBtn.click();

    // Step 2: Enter customer name
    await customerNameInput.fill('Alex Rivera');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'test5_01_before_double_click.png') });

    // Step 3: Rapid Double Click simulation (<100ms)
    await placeOrderBtn.dblclick();

    // Step 4: Wait for modal
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'test5_02_single_confirmation.png') });

    // Step 5: Check modal counts and reference
    const modalCount = await page.locator('[data-testid="confirmation-modal"]').count();
    const orderRefCount = await page.locator('[data-testid="order-reference"]').count();
    const orderRefText = await page.getByTestId('order-reference').textContent();
    const confirmedName = await page.getByTestId('confirmed-name').textContent();
    const confirmedTotal = await page.getByTestId('confirmed-total').textContent();
    const isBtnDisabled = await placeOrderBtn.isDisabled();

    // Step 6: Attempt extra clicks to ensure no duplicate submission is possible
    await placeOrderBtn.click({ force: true }).catch(() => {});
    const orderRefAfterExtraClick = await page.getByTestId('order-reference').textContent();

    results.test5 = {
      modalCount: modalCount,
      orderRefCount: orderRefCount,
      orderReference: orderRefText ? orderRefText.trim() : '',
      orderReferenceStable: orderRefText === orderRefAfterExtraClick,
      confirmedName: confirmedName ? confirmedName.trim() : '',
      confirmedTotal: confirmedTotal ? confirmedTotal.trim() : '',
      isButtonDisabled: isBtnDisabled,
      verdict: (modalCount === 1 && orderRefCount === 1 && isBtnDisabled && orderRefText === orderRefAfterExtraClick) ? 'PASSED (No defect)' : 'FAILED'
    };
    console.log('Test 5 Result:', results.test5);

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'manual_verification_results.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );
    console.log('\nResults written to evidence/manual_verification_results.json');
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runManualChecks().catch(err => {
  console.error('Error running manual checks:', err);
  process.exit(1);
});
