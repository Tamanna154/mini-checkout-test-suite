# AuraStore: Mini Checkout & Browser Test Suite

> **Hackathon Submission:** Senior Full-Stack Developer & QA Automation Engineer  
> **Challenge Title:** Mini Checkout and Browser Test Suite  
> **Automated Testing Framework:** Playwright Test (Google Chrome / Chromium)  
> **Design Pattern:** Page Object Model (POM)  
> **Currency:** Indian Rupee (₹)  

---

## 📌 1. Project Overview

**AuraStore** is a robust, responsive, single-page e-commerce checkout application accompanied by an automated browser test suite and comprehensive QA documentation. It implements a clean, accessible checkout experience designed to prevent revenue loss, calculation discrepancies, validation bypasses, and duplicate orders.

### Key Capabilities

* **Synthetic Products Catalog:**
  * 🖱️ **Product 1: Wireless Mouse** – **₹799**
  * ⌨️ **Product 2: Mechanical Keyboard** – **₹1,499**
* **Accurate Financial Calculations:**
  * $\text{Line Total} = \text{Unit Price} \times \text{Quantity}$
  * $\text{Order Total} = \sum \text{Line Totals}$
  * Proper Indian Rupee formatting (e.g., `₹799`, `₹1,499`, `₹1,598`, `₹3,097`).
  * Subtotal reflects the exact sum of all line totals.
* **Dynamic Cart Management & Invalid Quantity Prevention:**
  * Add products to cart.
  * Adjust quantities with increment (`+`) and decrement (`−`) controls.
  * **Invalid Quantity Prevention:** Minimum quantity is strictly 1; the decrement button is automatically disabled when quantity is 1 to prevent invalid zero/negative quantities.
  * Item removal via dedicated **Remove** button.
* **Strict Validation & Non-Destructive Error Handling:**
  * **Required Customer Name Field:** Blank or whitespace-only inputs are rejected with clear inline errors (`"Customer Name is required to place an order."`).
  * **Empty Cart Protection:** Placing an order with 0 items displays a clear warning banner (`"Cannot place order: Your cart is empty. Please add at least one product."`).
  * **Data Preservation:** Entered customer name and cart contents are strictly preserved when validation fails.
* **Synchronous Submission Guard (Double-Click Protection):**
  * Clicking "Place Order" engages an immediate synchronous lock (`submissionGuard = true; state.isSubmitting = true;`) before any asynchronous execution.
  * Rapid double-clicks are intercepted and discarded; exactly **one** confirmation modal and **one** unique order reference (`ORD-XXXXXX-XXXX`) are produced.
  * After successful submission, the order cannot be submitted again.
* **Lifecycle State Reset:**
  * Post-checkout "Start New Order" action cleanly resets inputs, errors, cart, and unlocks the checkout for a new purchase.

---

## 📂 2. Project Structure

```
├── evidence/                       # Manual testing execution evidence & screenshots
│   ├── manual_verification_results.json
│   ├── test4_01_empty_cart_initial.png
│   ├── test4_02_empty_cart_blocked.png
│   ├── test5_01_before_double_click.png
│   └── test5_02_single_confirmation.png
├── src/
│   ├── index.html                  # Accessible, responsive single-page checkout UI
│   ├── styles.css                  # Clean CSS styling with modal & error states
│   └── app.js                      # Core state management, validation & guard logic
├── tests/
│   ├── pages/
│   │   └── CheckoutPage.js         # Page Object Model encapsulating locators & actions
│   ├── checkout.spec.js            # Playwright automated test suite (Tests 1–6)
│   └── manual-verify.js            # Automated verification runner for manual test flows
├── server.js                       # Zero-dependency Node.js HTTP server (port 3001)
├── playwright.config.js            # Playwright configuration with webServer integration
├── package.json                    # Project metadata, dependencies, and test scripts
├── TEST_PLAN.md                    # QA test plan, risk matrix & manual procedures
├── TEST_RESULTS.md                 # Test execution logs, evidence & observations
└── README.md                       # Complete project documentation
```

---

## 💻 3. Technologies Used

* **Frontend:** Semantic HTML5, CSS3 (Flexbox & Grid), Vanilla JavaScript (ES6+).
* **Backend Server:** Node.js native HTTP module (zero third-party server dependencies).
* **Testing Framework:** Playwright Test (`@playwright/test` v1.50+).
* **Browser Channels:** Google Chrome / Chromium.

---

## ⚙️ 4. Prerequisites

* **Node.js:** v18.x or higher installed.
* **npm:** v9.x or higher installed.
* **Google Chrome** installed on the host system.

---

## 🚀 5. Installation & Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Web Application
Start the local server on port 3001:
```bash
npm start
```
Access the application in your browser at: [http://127.0.0.1:3001](http://127.0.0.1:3001)

*(Note: The server defaults to port 3001 or any port specified via the `PORT` environment variable).*

---

## 🧪 6. Running Automated Browser Tests

The project utilizes Playwright. The test runner automatically boots the local web server if it is not already running.

### 6.1 Run All Tests (Headless)
```bash
npm test
```

### 6.2 Run Specific Required Checks
```bash
# TEST 1: Successful Checkout
npm run test:check1

# TEST 2: Missing Required Field
npm run test:check2

# TEST 3: Quantity and Exact Total
npm run test:check3
```

### 6.3 Run in Headed Mode
```bash
npm run test:headed
```

### 6.4 Run in Interactive UI Mode
```bash
npm run test:ui
```

### 6.5 View HTML Test Report
```bash
npm run test:report
```

### 6.6 Run Manual Verification & Evidence Capture
```bash
node tests/manual-verify.js
```

---

## 📊 7. Test Suite Summary

Every check starts from an isolated, clean state via `beforeEach` navigation. All assertions use Playwright's web-first assertions with zero arbitrary fixed waits.

| Check ID | Title | Scope & Assertions | Status |
| :---: | :--- | :--- | :---: |
| **Test 1** | **Successful Checkout** | Add product; enter customer name; click Place Order; assert modal visible; assert order reference regex (`ORD-\d{6}-\d{4}`); assert correct total (`₹799`). | **PASS** |
| **Test 2** | **Missing Required Field** | Add product; leave name blank (`'   '`); click Place Order; assert checkout blocked; assert validation message visible; assert cart preserved; recover by typing name. | **PASS** |
| **Test 3** | **Quantity and Exact Total** | Add Mouse (₹799) & Keyboard (₹1,499); increase Mouse qty to 2; assert line totals (Mouse: ₹1,598, Keyboard: ₹1,499); assert exact total (`₹3,097`). | **PASS** |
| **Test 4** | **Empty Cart Block (Edge Case)** | Submit empty cart with customer name; assert checkout blocked; assert cart error banner; assert customer name preserved. | **PASS** |
| **Test 5** | **Rapid Double-Click (Edge Case)** | Rapid double-click simulation; assert synchronous submission lock; assert exactly 1 modal and 1 reference generated; assert button disabled. | **PASS** |
| **Test 6** | **Item Removal & Reset (Edge Case)** | Remove item; verify recalculation; complete order; click "Start New Order"; assert clean reset of inputs, errors, and cart. | **PASS** |

For complete test logs and evidence screenshots, refer to [TEST_RESULTS.md](file:///d:/Fynd%20Hackathon/TEST_RESULTS.md).
