# Quality Assurance & Test Plan: Mini Checkout Application

**Project:** AuraStore Mini Checkout Single-Page Application  
**Role:** SDET Intern  
**Test Automation Framework:** Playwright (Chromium / Google Chrome)  
**Date:** November 2026  
**Status:** Approved & Executed  

---

## 1. Executive Summary & Quality Objective

The AuraStore Mini Checkout is a mission-critical single-page web checkout experience. The primary objective is to guarantee seamless checkout journeys for customers while strictly preventing revenue leakage, calculation errors, accidental duplicate orders, and loss of customer input.

This test plan defines the testing scope, risk analysis, test architecture (Page Object Model), manual testing results for edge scenarios, and automated verification suites.

---

## 2. Risk Assessment & Prioritization Matrix

In e-commerce checkout flows, risks vary from critical financial discrepancies to minor visual misalignments. We prioritize checkout risks using an Impact vs. Likelihood matrix:

| Priority | Risk Description | Failure Impact | Mitigation / Test Coverage |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | **Duplicate Order / Double Submission**<br>Rapid clicking on "Place Order" creates multiple charges or multiple order confirmation references. | Customer charged twice; duplicate inventory allocation; customer support overhead. | Debounce + instant button lock (`disabled`) + single execution guard. Automated test: `Check 5`. |
| **P0 (Critical)** | **Calculation & Financial Inaccuracies**<br>Rounding errors in line totals, tax rate (8%), or grand order total. | Legal non-compliance, overcharging/undercharging customers, financial audit failure. | Cents-based arithmetic; automated precision testing on quantity changes. Automated test: `Check 3`. |
| **P1 (High)** | **Order Placed with Missing Required Fields**<br>Customer places order without providing mandatory name/identity. | Unfulfillable orders, missing delivery information. | Form validation gate; visual inline error; focus management. Automated test: `Check 2`. |
| **P1 (High)** | **Customer Input Wiped on Validation Error**<br>Customer makes an error, and the checkout resets other entered fields. | High cart abandonment rate, customer frustration. | State preservation in DOM; non-destructive validation. Automated test: `Check 2`. |
| **P1 (High)** | **Empty Cart Order Submission**<br>Customer clicks "Place Order" with $0.00 / 0 items in cart. | Ghost orders with $0 totals generated in system. | Cart boundary validation; clear alert banner; blocked checkout. Automated test: `Check 4`. |
| **P2 (Medium)** | **Cart Modification After Order Placement**<br>Customer modifies items or clicks buttons after order is completed. | State desynchronization between confirmation and cart. | Button disabling, modal overlay lock, explicit "Start New Order" lifecycle reset. Automated test: `Check 6`. |

---

## 3. Scope of Testing

### 3.1 In Scope
- Product catalog interaction (two fixed-price synthetic items: Headphones @ $79.99, Keyboard @ $49.99).
- Cart state transitions: Add, Remove, Increment quantity, Decrement quantity.
- Mathematical accuracy of line totals (`unit price * quantity`), subtotal, 8% tax calculation, and grand total.
- Form validation:
  - Required field: Customer Full Name (blocked if blank or whitespace-only).
  - Optional field: Customer Email.
  - Data preservation: Input fields must not be wiped out when validation fails.
- Order submission flow:
  - Loading state indication.
  - Idempotency guard against rapid multiple clicks.
  - Generation of unique order reference (`ORD-XXXXXX-XXXX`).
  - Confirmation display showing exact items, customer name, and total amount.
  - Order lifecycle reset ("Start New Order").

### 3.2 Out of Scope
- Backend database integration, payment gateway card tokenization (synthetic checkout per challenge brief).
- Multi-currency conversions (USD fixed).

---

## 4. Test Strategy & Architecture

We adopted an end-to-end automation strategy utilizing **Playwright** with the **Page Object Model (POM)** pattern.

### Why Playwright & Page Object Model?
1. **Flakiness Elimination:** Web-first assertions (`expect(locator).toBeVisible()`) auto-wait for DOM readiness without relying on arbitrary `sleep` or hard-coded delays.
2. **Accessibility & User-Centric Locators:** Locators rely on user-visible roles and test IDs (`getByTestId`, `getByRole`) rather than fragile CSS hierarchies.
3. **Clean State Isolation:** Every test executes against a newly launched page context (`beforeEach`), preventing cross-test data leakage.
4. **Maintenance Efficiency:** Selectors and page interactions are isolated inside `tests/pages/CheckoutPage.js`, allowing UI redesigns without breaking test scripts.

---

## 5. Test Case Specifications (Traceability Matrix)

| Test ID | Scenario / Feature | Test Type | Pre-conditions | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-001** | Happy Path Checkout with Confirmation | Automated (Check 1) | Clean state, store loaded | 1. Add Headphones & Keyboard.<br>2. Fill Name ("Alex Rivera") & Email.<br>3. Click "Place Order". | Confirmation modal appears; Name matches; Order reference matches pattern `ORD-XXXXXX-XXXX`; Total matches $140.38; Place Order button is disabled. | **PASS** |
| **TC-002** | Missing Required Name Validation | Automated (Check 2) | Clean state, store loaded | 1. Add Headphones.<br>2. Fill Email but leave Name blank.<br>3. Click "Place Order". | Checkout blocked; Confirmation hidden; Error "Customer Name is required..." visible; Email and Cart preserved; entering Name recovers and places order. | **PASS** |
| **TC-003** | Dynamic Line Totals & Order Recalculation | Automated (Check 3) | Clean state, store loaded | 1. Add Headphones ($79.99).<br>2. Increment qty to 2.<br>3. Add Keyboard ($49.99).<br>4. Decrement Headphones to 1. | Line totals update accurately ($159.98 for 2x); Subtotal, 8% Tax, and Grand Total update to the exact penny ($140.38). | **PASS** |
| **TC-004** | Empty Cart Checkout Attempt | Automated (Check 4) & Manual | Clean state, cart empty | 1. Enter Name ("Morgan Riley").<br>2. Do not add any product.<br>3. Click "Place Order". | Checkout blocked; Cart error banner appears: "Cannot place order: Your cart is empty"; Name input preserved. | **PASS** |
| **TC-005** | Rapid Double-Click Concurrency / Idempotency | Automated (Check 5) & Manual | Clean state, item in cart | 1. Add product.<br>2. Enter Name.<br>3. Rapidly double-click "Place Order". | Button immediately disables; exactly 1 confirmation modal shown; exactly 1 order reference generated; no duplicate confirmation cards. | **PASS** |
| **TC-006** | Item Removal & State Reset | Automated (Check 6) | Clean state, 2 items added | 1. Add 2 items.<br>2. Click "Remove" on item.<br>3. Complete order.<br>4. Click "Start New Order". | Item removed and total recalculated; "Start New Order" resets cart, inputs, errors, and modal back to clean state. | **PASS** |

---

## 6. Manual Testing Execution & Edge Scenario Log

Per the assignment brief, dedicated manual exploratory testing was conducted on key checkout risk scenarios: **Empty Cart Submission** and **Rapid Double-Clicking**.

### Manual Test Scenario 1: Empty Cart Checkout Attempt
* **Objective:** Verify how the application behaves when a customer attempts to bypass shopping and directly place an order.
* **Test Steps:**
  1. Open browser to `http://localhost:3000/`.
  2. Observe empty cart indicator: `Your cart is empty. Add products from the left to start checkout.`
  3. Enter `"Jordan Taylor"` into the **Full Name** field.
  4. Leave the cart completely empty (0 items added).
  5. Click the **Place Order** button.
* **Observed Result:**
  - The checkout process was immediately halted.
  - An alert banner with high contrast (`#fef2f2` background with `#dc2626` text) was rendered at the top of the order summary reading:  
    *`"Cannot place order: Your cart is empty. Please add at least one product."`*
  - The confirmation modal did not open.
  - The text `"Jordan Taylor"` remained intact inside the Full Name input field (zero data loss).
* **Defect / Behavior Assessment:**
  - **No Defect Found.** Behavior strictly adheres to expected specification and e-commerce best practices.

---

### Manual Test Scenario 2: Rapid Double-Click on Place Order
* **Objective:** Verify system resilience against accidental double-clicks or browser jitter that might trigger race conditions and dual order confirmations.
* **Test Steps:**
  1. Open browser to `http://localhost:3000/`.
  2. Click **Add to Cart** on "Aura Pro Wireless Headphones".
  3. Enter `"Alex Chen"` into **Full Name**.
  4. Perform a rapid double-click on the **Place Order** button (<150ms between clicks).
* **Observed Result:**
  - On the first mouse down / click event, the button instantly changed state to `disabled`, added the `loading` CSS class, displayed a spinning loader, and updated label to `"Processing..."`.
  - The second click was ignored by the event listener because `isSubmitting` flag had already locked the state machine.
  - Exactly **one** confirmation modal appeared after 200ms.
  - Exactly **one** order reference was created (`ORD-XXXXXX-XXXX`).
  - No duplicate confirmation modals or duplicate records were rendered.
* **Defect / Behavior Assessment:**
  - **No Defect Found.** The client-side lock and disabled attribute prevented duplicate submission.

---

## 7. Defect & Resilience Analysis

During SDET architecture review, the following defensive engineering measures were validated:

1. **Floating-Point Arithmetic Precision:**
   - *Risk:* In JavaScript, `79.99 * 2 = 159.98000000000002` and `159.98 * 0.08 = 12.7984`. Careless float arithmetic causes 1-cent discrepancy bugs.
   - *Implementation Fix:* All prices are stored as integer cents (`priceCents: 7999`). Totals and taxes are rounded using `Math.round(subtotalCents * TAX_RATE)`, guaranteeing mathematical precision to the cent.
2. **Whitespace-Only Name Bypass:**
   - *Risk:* A customer typing spaces (`"   "`) could bypass simplistic `if (!name)` checks.
   - *Implementation Fix:* Used `.trim()` validation: `const nameValue = (elements.customerName.value || '').trim(); if (!nameValue) { ... }`.
3. **Form State Preservation:**
   - *Risk:* Many poorly designed checkouts call `form.reset()` on validation failures, losing user data.
   - *Implementation Fix:* AuraStore never clears inputs on validation failure; errors are surfaced non-destructively.

---

## 8. Conclusion

All 6 test cases (including the 3 required automated checks and 3 risk-based edge checks) passed with 100% reliability. The implementation satisfies all functional, validation, calculation, and idempotency criteria.
