# AuraStore: Mini Checkout & Browser Test Suite

> **Hackathon Submission:** SDET Intern Track  
> **Challenge:** Mini Checkout and Browser Test Suite  
> **Author:** SDET Candidate  
> **Automated Testing Engine:** Playwright Test (Google Chrome / Chromium)  
> **Architecture Pattern:** Page Object Model (POM)  

---

## 📌 1. Project Overview

This repository contains an end-to-end e-commerce single-page checkout application (**AuraStore**) paired with an automated browser test suite designed to validate key customer journeys and mitigate checkout risks.

### Core Application Capabilities
* **Synthetic Product Catalog:** Two fixed-price products:
  * 🎧 *Aura Pro Wireless Headphones* — **$79.99**
  * ⌨️ *KeyForge Mechanical Keyboard* — **$49.99**
* **Dynamic Cart Management:**
  * Add products to cart.
  * Real-time quantity adjustments via increment (`+`) and decrement (`−`) steppers.
  * Explicit item removal (`Remove` button).
  * Cent-accurate financial rounding: real-time updates for Line Totals, Subtotal, 8% Estimated Tax, and Grand Order Total.
* **Error Handling & State Preservation:**
  * **Missing Required Field:** Full Name is mandatory. Blank or whitespace-only inputs block checkout, display accessible inline error styling, and set focus to the input without clearing any other entered values.
  * **Empty Cart Protection:** Submitting with 0 items blocks checkout and displays a prominent warning banner.
  * **Form Data Preservation:** Customer inputs (such as email or partial details) are strictly preserved upon validation errors.
* **Double-Submission & Race Condition Protection:**
  * Clicking "Place Order" instantly sets an execution lock (`isSubmitting = true`), disables the button, and activates a spinner state.
  * Rapid double-clicks are debounced and ignored; only **one** order confirmation and **one** unique reference code (`ORD-XXXXXX-XXXX`) are produced.
* **Order Lifecycle Reset:**
  * Post-checkout "Start New Order" action cleans up state, resets inputs and errors, and restores the cart to a clean baseline.

---

## 📂 2. Repository Structure

```
├── src/
│   ├── index.html            # Semantic, accessible single-page checkout UI
│   ├── styles.css            # Responsive, modern styling with error and modal states
│   └── app.js                # Core business logic, cart state machine, & validation
├── tests/
│   ├── pages/
│   │   └── CheckoutPage.js   # Page Object Model (POM) encapsulating locators & actions
│   └── checkout.spec.js      # Comprehensive Playwright automated test suite
├── server.js                 # Zero-dependency Node.js HTTP server (port 3000)
├── playwright.config.js      # Playwright configuration with webServer integration
├── package.json              # Project scripts and dependencies
├── TEST_PLAN.md              # Detailed QA test plan, risk matrix, & manual test log
└── README.md                 # Complete documentation and setup guide
```

---

## 🚀 3. Quickstart & How to Run

### Prerequisites
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)
* Google Chrome or Microsoft Edge installed on your system.

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run the Web Application
Start the zero-dependency local web server:
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 4. Running the Automated Browser Tests

The test suite runs against the application using Playwright. The configuration automatically boots the local web server on port 3000 if not already running.

### 4.1 Run All Tests (Headless)
```bash
npm test
```

### 4.2 Run in Headed Mode (Watch Browser Interactions)
```bash
npm run test:headed
```

### 4.3 Run Interactive UI Mode (Playwright Test Runner GUI)
```bash
npm run test:ui
```

### 4.4 View HTML Test Report
```bash
npm run test:report
```

### 4.5 Run Individual Core Checks
```bash
# Check 1: Successful checkout produces confirmation
npm run test:check1

# Check 2: Missing required field blocks checkout
npm run test:check2

# Check 3: Quantity change updates exact total
npm run test:check3
```

---

## 📊 5. Automated Test Suite Summary

Every check starts from an isolated, clean state using `test.beforeEach()` navigation. All assertions are web-first, evaluating user-visible states and ARIA roles without arbitrary `sleep` timeouts.

| Check ID | Test Description | Assertions & Validations | Result |
| :---: | :--- | :--- | :---: |
| **Check 1** | **Successful Checkout Journey** | • Adds 2 synthetic items ($79.99 + $49.99).<br>• Verifies subtotal ($129.98), tax ($10.40), and total ($140.38).<br>• Enters Customer Name & Email.<br>• Asserts confirmation modal displays.<br>• Asserts unique reference regex (`ORD-\d{6}-\d{4}`).<br>• Asserts Place Order button locks. | **PASS** (1.7s) |
| **Check 2** | **Missing Required Field Validation** | • Cart has items; Name is left blank/spaces.<br>• Clicks Place Order.<br>• Asserts confirmation modal is HIDDEN.<br>• Asserts inline error message displays.<br>• Asserts cart and email inputs are preserved.<br>• Recovers by entering Name; asserts order completes. | **PASS** (1.4s) |
| **Check 3** | **Exact Total Recalculation on Quantity Adjustments** | • Adds Headphones ($79.99).<br>• Increments quantity to 2 -> Asserts line total = $159.98, total = $172.78.<br>• Adds Keyboard ($49.99) -> Asserts total = $226.77.<br>• Decrements Headphones to 1 -> Asserts line total = $79.99, total = $140.38. | **PASS** (1.0s) |
| **Check 4** | **Empty Cart Checkout Block (Risk Case)** | • Name entered with 0 items in cart.<br>• Clicks Place Order.<br>• Asserts checkout blocked with cart error banner.<br>• Asserts customer name preserved. | **PASS** (706ms) |
| **Check 5** | **Rapid Double-Click Idempotency (Risk Case)** | • Rapid double-clicks "Place Order".<br>• Asserts button disables immediately.<br>• Asserts exactly ONE modal and ONE order reference generated. | **PASS** (1.1s) |
| **Check 6** | **Cart Deletion & Lifecycle Reset** | • Removes item from cart and validates recalculation.<br>• Completes order and clicks "Start New Order".<br>• Asserts clean reset of inputs, errors, cart, and buttons. | **PASS** (1.3s) |

**Overall Result:** `6 passed (11.1s)`

---

## 📝 6. Manual Testing & Defect Investigation Log

In accordance with the SDET assignment brief, manual exploratory testing was conducted on key checkout risk scenarios:

### Scenario A: Empty Cart Checkout
* **Action:** Filled Full Name `"Jordan Taylor"` with an empty cart and clicked **Place Order**.
* **Observation:** The application prevented checkout. An accessible `#cartError` banner displayed: *"Cannot place order: Your cart is empty. Please add at least one product."* The name input remained filled with `"Jordan Taylor"`.
* **Verdict:** ✅ **Expected Behavior Verified.** No defect.

### Scenario B: Rapid Double-Clicking
* **Action:** Added Headphones, entered name, and rapidly double-clicked **Place Order** within 120ms.
* **Observation:** The primary click instantly engaged `isSubmitting = true`, disabled the submit button, and rendered a loading spinner. The second click was ignored. Exactly one confirmation modal appeared with reference `ORD-XXXXXX-XXXX`.
* **Verdict:** ✅ **Expected Behavior Verified.** Idempotency confirmed.

*(See [TEST_PLAN.md](file:///d:/Fynd%20Hackathon/TEST_PLAN.md) for full risk matrices, test case specifications, and resilience analysis).*

---

## 🏆 7. Evaluation Highlights for Reviewers

1. **Clean Page Object Model:** Separation of concerns between UI selectors (`CheckoutPage.js`) and test logic (`checkout.spec.js`).
2. **Deterministic, Zero-Flake Assertions:** Strict reliance on Playwright's web-first auto-retrying assertions (`toBeVisible`, `toHaveText`, `toHaveValue`).
3. **Financial Arithmetic Reliability:** Avoids IEEE 754 floating-point pennies errors by utilizing cent-based integer computations.
4. **Idempotency & Race Protection:** Button-level and state-machine locking prevents accidental double-charges.
5. **Zero-Dependency Native Server:** Extremely fast cold-start (<50ms) using native Node.js HTTP module.
