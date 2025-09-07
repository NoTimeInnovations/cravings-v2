# Minimum Delivery Order Amount Feature

## Overview

This feature allows partner to set a **minimum order amount** for delivery orders. Customers must meet or exceed this amount to place a delivery order.

---

## Partner Profile Page: Setting the Minimum Order Amount

- In the **Delivery Settings** (see `DeliveryAndGeoLocationSettings.tsx`), partner can set the minimum order amount for deliveries.
- The field is labeled **"Minimum Order Amount"** and is editable when the delivery settings are in edit mode.
- The value is stored as part of the `DeliveryRules` object, which also includes delivery radius, rate type, and first km range.

---

## How It Works for Customers

- When a customer tries to place a delivery order (see `PlaceOrderModal.tsx`):
  - The minimum order amount is fetched from the backend and included in the `deliveryInfo` object.
  - If the cart total is **below** the minimum order amount, the following happens:
    - The **"Place Order"** button is disabled.
    - A message is shown:  
      `Minimum order amount for delivery is ₹<amount>`
  - The order **cannot be placed** until the cart total meets or exceeds the minimum.

---

## Technical Details

- The minimum order amount is part of the `DeliveryRules` interface in the store (`orderStore.ts`).
- It is passed to the frontend as part of the delivery rules and included in the `deliveryInfo` object for each order attempt.
- The check and enforcement are handled in the `PlaceOrderModal`:
  - The button is disabled if `totalPrice < minimumOrderAmount`.
  - The error message is shown in the modal UI.

---

## Example

If the admin sets the minimum order amount to ₹200:
- Any delivery order below ₹200 will show a warning and the user cannot proceed.
- Once the cart total is ₹200 or more, the user can place the order as usual.

---

## Code References

- **Partner Setting:**  
  `src/components/admin/profile/DeliveryAndGeoLocationSettings.tsx`
- **Order Store:**  
  `src/store/orderStore.ts` (`DeliveryRules`, `DeliveryInfo`)
- **Enforcement in UI:**  
  `src/components/hotelDetail/placeOrder/PlaceOrderModal.tsx`

