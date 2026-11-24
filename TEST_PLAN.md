# Quality Assurance & Test Plan: Mini Checkout Application

**Project:** AuraStore Mini Checkout Single-Page Application  
**Author:** Senior Full-Stack Developer & QA Automation Engineer  
**Automation Engine:** Playwright Test (Google Chrome / Chromium)  
**Date:** November 2026  
**Status:** Approved & Verified  

---

## 1. Testing Objectives & Quality Goals

The primary objective of this quality assurance test plan is to validate that the AuraStore single-page checkout delivers a reliable, accurate, accessible, and resilient customer journey.

Key quality goals:
1. **Financial Precision:** Ensure 100% mathematical accuracy across all line items and order totals with proper Indian Rupee (`₹`) currency formatting.
2. **Idempotent Submission:** Guarantee that rapid multiple clicks on "Place Order" cannot generate multiple charges or multiple order confirmations.
3. **Robust Input Validation:** Ensure required fields (Customer Full Name) and non-empty cart constraints are strictly enforced without erasing user data.
4. **Clean State Isolation:** Ensure every test runs from a pristine initial state without cross-contamination.

---

## 2. Testing Scope

### 2.1 In Scope
* Product catalog rendering:
  * Product 1: Wireless Mouse – ₹799
  * Product 2: Mechanical Keyboard – ₹1,499
* Cart operations:
  * Adding products to cart.
  * Incrementing and decrementing quantities.
  * Prevention of invalid quantities (minimum quantity 1, decrement disabled at 1).
  * Removing items from cart.
* Mathematical calculations:
  * $\text{Line Total} = \text{Unit Price} \times \text{Quantity}$
  * $\text{Order Total} = \sum \text{Line Totals}$
  * Subtotal calculation ($=\text{Order Total}$).
* Customer information & validation:
  * Mandatory Customer Full Name validation (non-empty, non-whitespace).
  * Non-empty cart validation.
  * State preservation: Form inputs and cart items are preserved when validation fails.
* Order processing & submission guard:
  * Synchronous lock preventing race conditions on rapid double-clicking.
  * Generating unique reference code (`ORD-XXXXXX-XXXX`).
  * Displaying single confirmation modal with order details and final amount.
  * Post-checkout guarding: Order cannot be submitted again.
  * Lifecycle reset: "Start New Order" action.

### 2.2 Out of Scope
* Integration with real banking payment gateways (synthetic checkout as required by challenge brief).
* Multi-currency exchange rate conversions.

---

## 3. Test Environment & Prerequisites

* **Operating System:** Windows 10/11
* **Node.js Runtime:** v18.x+ / v24.x
* **Application Server:** Native HTTP server running on `http://127.0.0.1:3001`
* **Test Runner:** Playwright Test (`@playwright/test`)
* **Browser Channel:** Google Chrome (v157+)
* **Locator Strategy:** User-visible ARIA roles, semantic elements, and `data-testid` attributes.

---

## 4. Prioritised Risk Assessment Matrix

| Priority | Risk Description | Failure Impact | Mitigation Strategy & Test Coverage |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | **Double Submission / Race Condition**<br>Rapid clicking on "Place Order" creates multiple order confirmations. | Double billing, duplicate order fulfillment, customer confusion. | Synchronous submission guard (`submissionGuard` ref) evaluated before any state change or async tick. Covered by **Test 5**. |
| **P0 (Critical)** | **Financial / Calculation Inaccuracy**<br>Incorrect line total multiplication or incorrect order total addition. | Overcharging/undercharging customers, auditing failures. | Deterministic integer arithmetic. Covered by **Test 1**, **Test 3**, and **Test 6**. |
| **P1 (High)** | **Order Placed with Missing Required Fields**<br>Customer submits order without providing mandatory name. | Incomplete delivery records, unfulfillable orders. | Non-destructive validation gate with accessible inline error alerts. Covered by **Test 2**. |
| **P1 (High)** | **Customer Form Wiped on Validation Failure**<br>Entering invalid data clears existing valid inputs or cart items. | High checkout abandonment, poor user experience. | Non-destructive DOM state preservation. Covered by **Test 2** and **Test 4**. |
| **P1 (High)** | **Empty Cart Order Submission**<br>Placing an order with 0 items. | Zero-amount phantom orders in system. | Cart item count validation gate. Covered by **Test 4**. |
| **P2 (Medium)** | **Invalid / Negative Quantity Input**<br>Customer decrements quantity below 1 or enters invalid numbers. | Negative financial totals, system malfunction. | Stepper minimum bound (1) and disabling decrement at quantity 1. Covered by application logic and **Test 3**. |

---

## 5. Traceability Matrix & Test Case Specifications

| Test Case ID | Test Name | Execution Mode | Pre-conditions | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-001** | **TEST 1: Successful Checkout** | Automated (`check1`) | Clean state, store loaded | 1. Add Wireless Mouse (₹799).<br>2. Enter customer name ("Alex Rivera").<br>3. Click Place Order. | • Confirmation modal is visible.<br>• Order reference is visible and matches pattern `ORD-\d{6}-\d{4}`.<br>• Correct total `₹799` is displayed.<br>• Place Order button is disabled. |
| **TC-002** | **TEST 2: Missing Required Field** | Automated (`check2`) | Clean state, store loaded | 1. Add Wireless Mouse.<br>2. Leave customer name blank (`'   '`).<br>3. Click Place Order. | • Checkout is blocked.<br>• Confirmation modal is hidden.<br>• Validation message `"Customer Name is required to place an order."` is visible.<br>• Cart and items are preserved. |
| **TC-003** | **TEST 3: Quantity and Exact Total** | Automated (`check3`) | Clean state, store loaded | 1. Add Wireless Mouse & Mechanical Keyboard.<br>2. Increase Mouse quantity to 2.<br>3. Verify line totals and order total. | • Mouse line total: $799 \times 2 = \text{₹1,598}$.<br>• Keyboard line total: $1499 \times 1 = \text{₹1,499}$.<br>• Exact Order Total: $\text{₹3,097}$.<br>• Confirmed total matches ₹3,097. |
| **TC-004** | **TEST 4: Empty Cart Block** | Automated & Manual | Clean state, 0 items | 1. Enter customer name ("Jane Doe").<br>2. Leave cart empty.<br>3. Click Place Order. | • Checkout is blocked.<br>• Confirmation modal is hidden.<br>• Error banner `"Cannot place order: Your cart is empty..."` is visible.<br>• Customer name input preserved. |
| **TC-005** | **TEST 5: Rapid Double-Click** | Automated & Manual | Clean state, item in cart | 1. Add Wireless Mouse.<br>2. Enter customer name ("Alex Rivera").<br>3. Rapidly double-click Place Order (<100ms). | • Synchronous lock immediately blocks second click.<br>• Exactly 1 confirmation modal created.<br>• Exactly 1 unique order reference generated.<br>• Place Order button remains disabled. |
| **TC-006** | **TEST 6: Item Removal & State Reset** | Automated | Clean state, 2 items added | 1. Add both items.<br>2. Click Remove on Keyboard.<br>3. Complete order.<br>4. Click Start New Order. | • Keyboard removed from cart; total updates to ₹799.<br>• "Start New Order" cleanly resets inputs, errors, cart, and unlocks submit button. |

---

## 6. Manual Testing Procedures

In addition to automated tests, explicit manual exploratory verification was performed for the two critical risk scenarios:

### Procedure for TEST 4: Empty Cart
1. Open the browser to `http://127.0.0.1:3001/`.
2. Verify initial empty cart display: `"Your cart is empty. Add products from the left to start checkout."`.
3. Type `"Jane Doe"` into the **Full Name** field.
4. Do not add any product to the cart (item count remains 0).
5. Click **Place Order**.
6. Observe and document actual behavior:
   - Does a confirmation modal appear?
   - Is a warning banner rendered?
   - Is the entered name preserved?
7. Expected Result: Checkout is blocked, cart error banner displays, modal is hidden, name is preserved.

### Procedure for TEST 5: Rapid Double-Click
1. Open the browser to `http://127.0.0.1:3001/`.
2. Click **Add to Cart** on **Wireless Mouse**.
3. Type `"Alex Rivera"` into the **Full Name** field.
4. Rapidly double-click **Place Order** (two click events fired in rapid succession, <100ms interval).
5. Observe and document actual behavior:
   - How many confirmation modals appear in the DOM?
   - How many order references are generated?
   - What happens on further clicks to the button?
6. Expected Result: The synchronous submission guard intercepts the second click; exactly one modal and one stable order reference are produced.

*(All test results, observations, and evidence are documented in [TEST_RESULTS.md](file:///d:/Fynd%20Hackathon/TEST_RESULTS.md)).*
