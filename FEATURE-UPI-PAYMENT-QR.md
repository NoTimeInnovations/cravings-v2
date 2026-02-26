# Feature: UPI Payment QR Screen After Ordering

## Overview

After a customer places any order (delivery, takeaway, table ordering), if the partner has `show_payment_qr = true` and a UPI ID set, instead of auto-redirecting to WhatsApp, display a full-screen UPI payment screen with a QR code, 10 UPI app deep-link buttons, a custom message, and a "Send Payment Screenshot to WhatsApp" button.

---

## 1. Current State Analysis

### 1.1 Relevant Files

| File | Role |
|---|---|
| `src/components/admin-v2/settings/PaymentLegalSettings.tsx` | Admin UI for UPI ID + `show_payment_qr` toggle |
| `src/components/hotelDetail/placeOrder/PlaceOrderModal.tsx` | Order placement + WhatsApp redirect logic |
| `src/app/bill/[id]/page.tsx` | Receipt page with existing UPI QR generation |
| `src/screens/QrPayment.tsx` | Standalone QR payment screen (has 3 UPI app deep links) |
| `src/api/partners.ts` | GraphQL queries/mutations for partners |
| `src/store/authStore.ts` | `Partner` interface definition |

### 1.2 DB Columns (partners table)

Already exists:
- `upi_id` TEXT NOT NULL

**Add manually in Hasura Console:**

| Column | Type | Default |
|---|---|---|
| `show_payment_qr` | boolean | false |
| `post_payment_message` | text | null |

### 1.3 Current Order → WhatsApp Flow

**Android path** (PlaceOrderModal.tsx:2572–2602):
```tsx
<button onClick={() => handlePlaceOrder(() => {
  if (!hotelData.petpooja_restaurant_id) {
    const whatsappLink = getWhatsappLink(orderId as string);
    window.open(whatsappLink, "_blank");
  }
})}>
  Place Order
</button>
```

**iOS path** (PlaceOrderModal.tsx:2628–2666):
```tsx
<Link href={getWhatsappLink(orderId as string)} target="_blank">
  <button onClick={() => handlePlaceOrder()}>Place Order</button>
</Link>
```

**After order success:** `OrderStatusDialog` (PlaceOrderModal.tsx:1144–1245) shows a fullscreen overlay with a "Close" button. No UPI payment step exists here.

### 1.4 Existing UPI App Deep Links (QrPayment.tsx)

Only 3 apps currently: Google Pay (`gpay://`), PhonePe (`phonepe://`), Paytm (`paytmmp://`). We need 10.

---

## 2. TypeScript Type Changes

### `src/store/authStore.ts` — Partner interface

After `upi_id` (line ~73), add:

```typescript
export interface Partner extends BaseUser {
  // ...
  upi_id: string;
  show_payment_qr?: boolean;
  post_payment_message?: string | null;
  // ...
}
```

`HotelData` (in `src/app/hotels/[...id]/page.tsx`) extends `Partner`, so these fields are automatically available on `hotelData`.

---

## 3. GraphQL Changes

### `src/api/partners.ts` — `getPartnerAndOffersQuery`

Add after `hide_unavailable`:

```graphql
hide_unavailable
upi_id
show_payment_qr
post_payment_message
subscription_details
```

### `src/api/partners.ts` — `updatePartnerMutation` return fields

Add `post_payment_message` to the returned fields:

```graphql
update_partners_by_pk(...) {
  # ...
  upi_id
  show_payment_qr
  post_payment_message
}
```

---

## 4. Admin Settings Changes

### `src/components/admin-v2/settings/PaymentLegalSettings.tsx`

#### 4.1 Add State

After `const [showPaymentQr, setShowPaymentQr] = useState(false);` (line ~26):

```typescript
const [postPaymentMessage, setPostPaymentMessage] = useState("Send payment screenshot to WhatsApp after payment");
```

#### 4.2 Load from userData (useEffect, line ~34)

```typescript
setPostPaymentMessage(userData.post_payment_message || "Send payment screenshot to WhatsApp after payment");
```

#### 4.3 Include in Save Payload (handleSavePayment, line ~50)

```typescript
const updates = {
  upi_id: upiId,
  show_payment_qr: showPaymentQr,
  post_payment_message: postPaymentMessage || null,  // save null if empty
  fssai_licence_no: fssaiLicenceNo,
  gst_no: gstNo,
  gst_percentage: gstEnabled ? gstPercentage : 0
};
```

#### 4.4 Change Detection (useEffect, line ~90)

```typescript
const initialPostPaymentMessage = data.post_payment_message || "";

const hasChanges =
  upiId !== initialUpi ||
  showPaymentQr !== initialQr ||
  postPaymentMessage !== initialPostPaymentMessage ||
  fssaiLicenceNo !== initialFssai ||
  // ...
```

Add `postPaymentMessage` to the dependency arrays of the relevant `useEffect` and `useCallback`.

#### 4.5 Add UI Text Input (after the "Show Payment QR" toggle, ~line 147)

```tsx
{showPaymentQr && (
  <div className="space-y-2 border rounded-lg p-4">
    <Label className="text-base">Message Under QR Code</Label>
    <p className="text-sm text-muted-foreground">
      Message shown to the customer below the QR code.
    </p>
    <Input
      value={postPaymentMessage}
      onChange={(e) => setPostPaymentMessage(e.target.value)}
      placeholder="e.g. Pay and show screenshot to staff"
      maxLength={120}
    />
  </div>
)}
```

Visible only when `showPaymentQr` is true. Saving an empty string stores `null` in the DB.

---

## 5. New Component: UpiPaymentScreen

**Path:** `src/components/hotelDetail/placeOrder/UpiPaymentScreen.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, MessageCircle } from "lucide-react";

interface UPIApp {
  name: string;
  icon: string;
  getUrl: (params: { upiId: string; storeName: string; amount: number; txnId: string }) => string;
}

const UPI_APPS: UPIApp[] = [
  {
    name: "Google Pay",
    icon: "/google-pay.png",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `gpay://upi/pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "PhonePe",
    icon: "/phonepay-icon.jpg",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "Paytm",
    icon: "/paytm-icon.jpg",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "BHIM",
    icon: "/bhim-icon.png",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "Amazon Pay",
    icon: "/amazon-pay-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `amzn://apps/android?asin=com.amazon.mShop.android.shopping&pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "CRED",
    icon: "/cred-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `cred://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "WhatsApp Pay",
    icon: "/whatsapp-pay-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `whatsapp://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "PayZapp",
    icon: "/payzapp-icon.png",
    getUrl: ({ upiId, amount, txnId }) =>
      `payzapp://pay?pa=${upiId}&am=${amount.toFixed(2)}&cu=INR&tr=${txnId}`,
  },
  {
    name: "Freecharge",
    icon: "/freecharge-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `freecharge://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "MobiKwik",
    icon: "/mobikwik-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `mobikwik://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
];

interface UpiPaymentScreenProps {
  upiId: string;
  storeName: string;
  amount: number;
  currency: string;
  orderId: string;
  postPaymentMessage: string | null;  // shown below UPI app buttons; null = hidden
  whatsappLink: string;
  onClose: () => void;
}

export const UpiPaymentScreen = ({
  upiId,
  storeName,
  amount,
  currency,
  orderId,
  postPaymentMessage,
  whatsappLink,
  onClose,
}: UpiPaymentScreenProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const txnId = `order-${orderId}-${Date.now()}`;

  useEffect(() => {
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR&tr=${txnId}&tn=${encodeURIComponent("Order Payment")}`;
    QRCode.toDataURL(upiString, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [upiId, storeName, amount, txnId]);

  const handleUpiApp = (app: UPIApp) => {
    window.location.href = app.getUrl({ upiId, storeName, amount, txnId });
  };

  return (
    <div className="fixed inset-0 z-[8000] bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-stone-200 shadow-sm z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-gray-900">Complete Payment</h1>
            <p className="text-sm text-gray-500">{storeName}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 py-6 gap-6">
        {/* Amount */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Total Amount</p>
          <p className="text-4xl font-bold text-gray-900">
            {currency}{amount.toFixed(2)}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Scan to Pay</p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="UPI Payment QR Code"
              className="w-52 h-52 rounded-xl border-2 border-stone-200 p-2"
            />
          ) : (
            <div className="w-52 h-52 rounded-xl border-2 border-stone-200 bg-stone-50 animate-pulse" />
          )}
          <p className="text-xs text-gray-500">Pay to: {upiId}</p>
        </div>

        {/* UPI App Buttons */}
        <div className="w-full">
          <p className="text-sm font-semibold text-gray-700 mb-3">Or pay with UPI app</p>
          <div className="grid grid-cols-5 gap-3">
            {UPI_APPS.map((app) => (
              <button
                key={app.name}
                onClick={() => handleUpiApp(app)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-stone-100 active:bg-stone-200 transition-colors"
              >
                <img
                  src={app.icon}
                  alt={app.name}
                  className="w-10 h-10 rounded-xl object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-[10px] text-gray-600 text-center leading-tight">
                  {app.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Post-payment message */}
        {postPaymentMessage && (
          <p className="text-sm text-gray-600 text-center font-medium px-2">
            {postPaymentMessage}
          </p>
        )}

        {/* WhatsApp Screenshot Button */}
        <div className="w-full">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors">
              <MessageCircle className="w-5 h-5" />
              Send Payment Screenshot to WhatsApp
            </button>
          </a>
        </div>

        {/* Back to menu */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 border border-stone-300 text-gray-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
        >
          Back to Menu
        </button>

        <p className="text-xs text-gray-400 text-center pb-4">
          Order #{orderId.slice(0, 8).toUpperCase()} placed successfully
        </p>
      </div>
    </div>
  );
};
```

### Required Icons in `/public`

| File | Status |
|---|---|
| `/public/google-pay.png` | Already exists |
| `/public/phonepay-icon.jpg` | Already exists |
| `/public/paytm-icon.jpg` | Already exists |
| `/public/bhim-icon.png` | Add |
| `/public/amazon-pay-icon.png` | Add |
| `/public/cred-icon.png` | Add |
| `/public/whatsapp-pay-icon.png` | Add |
| `/public/payzapp-icon.png` | Add |
| `/public/freecharge-icon.png` | Add |
| `/public/mobikwik-icon.png` | Add |

---

## 6. PlaceOrderModal Changes

### 6.1 Import

```typescript
import { UpiPaymentScreen } from "./UpiPaymentScreen";
```

### 6.2 Add State

```typescript
const [showUpiScreen, setShowUpiScreen] = useState(false);
const [finalOrderAmount, setFinalOrderAmount] = useState(0);
```

### 6.3 Feature Flags

After existing feature flag checks (~line 2055):

```typescript
const hasUpiQr =
  hotelData?.show_payment_qr === true &&
  !!hotelData?.upi_id;

const postPaymentMessage = hotelData?.post_payment_message ?? null;
```

### 6.4 Capture Final Amount

Inside `handlePlaceOrder`, before calling `placeOrder()`:

```typescript
const computedGst = getGstAmount(subtotal, hotelData?.gst_percentage as number);
const totalPayable = subtotal + computedGst + extraChargesTotal - discountSavings;
setFinalOrderAmount(totalPayable);
```

### 6.5 Android Button — replace `onClick`

```tsx
<button
  onClick={() =>
    handlePlaceOrder(() => {
      if (hasUpiQr) {
        setShowUpiScreen(true);
      } else if (!hotelData.petpooja_restaurant_id) {
        const whatsappLink = getWhatsappLink(orderId as string);
        window.open(whatsappLink, "_blank");
      }
    })
  }
  disabled={...}
  className="..."
>
  Place Order
</button>
```

### 6.6 iOS Non-Petpooja Path — replace `Link`+`button`

```tsx
{hasUpiQr ? (
  <button
    onClick={() => handlePlaceOrder(() => setShowUpiScreen(true))}
    disabled={...}
    className="w-full px-6 py-4 bg-orange-600 text-white rounded-xl ..."
  >
    {orderStatus === "loading" ? (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Placing Order...
      </span>
    ) : (
      "Place Order"
    )}
  </button>
) : (
  <Link href={getWhatsappLink(orderId as string)} target="_blank">
    <button
      onClick={() => handlePlaceOrder()}
      disabled={...}
      className="w-full px-6 py-4 bg-orange-600 text-white rounded-xl ..."
    >
      {orderStatus === "loading" ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Placing Order...
        </span>
      ) : (
        "Place Order"
      )}
    </button>
  </Link>
)}
```

The petpooja path is unaffected.

### 6.7 Close Handler

```typescript
const handleCloseUpiScreen = () => {
  setShowUpiScreen(false);
  setAddress("");
  setOrderNote("");
  clearOrder();
  setOpenPlaceOrderModal(false);
  setOrderStatus("idle");
};
```

### 6.8 Suppress `OrderStatusDialog` When UPI Screen Is Active

```tsx
<OrderStatusDialog
  status={showUpiScreen ? "idle" : orderStatus}
  onClose={handleCloseSuccessDialog}
  partnerId={hotelData?.id}
/>
```

### 6.9 Render `UpiPaymentScreen`

Just before the closing `</>` of the return statement:

```tsx
{showUpiScreen && (
  <UpiPaymentScreen
    upiId={hotelData.upi_id}
    storeName={hotelData.store_name}
    amount={finalOrderAmount}
    currency={hotelData.currency || "₹"}
    orderId={orderId as string}
    postPaymentMessage={postPaymentMessage}
    whatsappLink={getWhatsappLink(orderId as string)}
    onClose={handleCloseUpiScreen}
  />
)}
```

---

## 7. Complete Flow

```
Customer taps "Place Order"
  ↓
handlePlaceOrder() runs
  → captures finalOrderAmount
  → API call to insert order
  → setOrderStatus("success")
  → onSuccessCallback() fires

  IF show_payment_qr=true AND upi_id set:
    → setShowUpiScreen(true)
    → UpiPaymentScreen renders (z-index 8000, above everything)
    → OrderStatusDialog is suppressed (forced to "idle")

    Customer sees:
      ✓ Total amount
      ✓ UPI QR code (scannable with camera)
      ✓ 10 UPI app buttons (deep links)
      ✓ Custom message below buttons (if post_payment_message is set)
      ✓ "Send Payment Screenshot to WhatsApp" button (always shown)
      ✓ "Back to Menu" button

    Customer clicks UPI app → deep link opens app with amount pre-filled
    Customer clicks WhatsApp → opens WhatsApp chat (manual action)
    Customer clicks "Back to Menu" → order cleared, modal closed

  ELSE:
    → Original flow: WhatsApp auto-redirect (Android) or Link (iOS)
    → OrderStatusDialog shows success overlay
```

---

## 8. Summary of File Changes

| File | Change | Description |
|---|---|---|
| `src/store/authStore.ts` | EDIT | Add `show_payment_qr?: boolean` and `post_payment_message?: string \| null` to Partner interface |
| `src/api/partners.ts` | EDIT | Add `upi_id`, `show_payment_qr`, `post_payment_message` to `getPartnerAndOffersQuery`; add `post_payment_message` to `updatePartnerMutation` return |
| `src/components/admin-v2/settings/PaymentLegalSettings.tsx` | EDIT | Add state, save logic, change detection, and text input UI |
| `src/components/hotelDetail/placeOrder/UpiPaymentScreen.tsx` | CREATE | New full-screen UPI payment component |
| `src/components/hotelDetail/placeOrder/PlaceOrderModal.tsx` | EDIT | Import + state + feature flags + order button logic + UpiPaymentScreen render |
| `/public/*.png` | ADD | 7 new UPI app icons |

---

## 9. Edge Cases

1. **QR generation failure:** Skeleton shown while generating. UPI app buttons still work even if QR fails.
2. **Amount = 0:** If `amount <= 0`, omit the `am=` param — apps will show manual amount entry.
3. **All order types:** Feature applies to delivery, takeaway, and table orders equally — condition is purely `show_payment_qr && upi_id`.
4. **Petpooja partners:** If they set `show_payment_qr`, they get the UPI screen. If not, `OrderStatusDialog` shows as before.
5. **Deep links on iOS:** Apps not installed will show a browser "can't open" error — same behaviour as existing `QrPayment.tsx`.
6. **`orderId` availability:** Set after `placeOrder()` resolves, so it is available in `onSuccessCallback`.
7. **Discount edge case:** `discountSavings` should be subtracted when computing `finalOrderAmount`. Reference `computeDiscountSavings(appliedDiscount)` (line ~2333).
