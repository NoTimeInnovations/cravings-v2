"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePOSStore } from "@/store/posStore";
import { Printer, Edit, Loader2, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { Partner, useAuthStore } from "@/store/authStore";
import KOTTemplate from "./KOTTemplate";
import BillTemplate from "./BillTemplate";
import { useRouter } from "next/navigation";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { formatDate, getDateOnly } from "@/lib/formatDate";
import Link from "next/link";
import { fetchFromHasura } from "@/lib/hasuraClient";

export const PostCheckoutModal = () => {
  const {
    order,
    clearCart,
    extraCharges,
    setPostCheckoutModalOpen,
    postCheckoutModalOpen,
    setEditOrderModalOpen,
    qrGroup,
    paymentMethod,
    setPaymentMethod,
    setOrder,
  } = usePOSStore();
  const { userData } = useAuthStore();
  const router = useRouter();
  const billRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const handleEditOrder = () => {
    setPostCheckoutModalOpen(false);
    setEditOrderModalOpen(true);
  };

  const handleClose = () => {
    setPostCheckoutModalOpen(false);
    clearCart();
  };

  const handlePrintBill = () => {
    // Check if payment method is null
    if (!order?.payment_method) {
      // Close the order modal first
      setPostCheckoutModalOpen(false);
      // Show payment modal
      setPaymentMethod("cash");
      setShowPaymentModal(true);
    
    } else {
      // Directly navigate to print bill
      window.open("/bill/" + order.id, "_blank");
    }
  };

  const handlePaymentConfirm = async () => {
    if (!order || !paymentMethod) return;
    
    try {
      setIsUpdatingPayment(true);
      
      // Update payment method in database
      await fetchFromHasura(
        `mutation UpdateOrderPaymentMethod($id: uuid!, $payment_method: String!) {
          update_orders_by_pk(
            pk_columns: { id: $id }
            _set: { payment_method: $payment_method }
          ) {
            id
            payment_method
          }
        }`,
        {
          id: order.id,
          payment_method: paymentMethod,
        }
      );

      // Update local order state
      setOrder({
        ...order,
        payment_method: paymentMethod,
      });

      setShowPaymentModal(false);
      
      // Now open the print bill page
      window.open("/bill/" + order.id, "_blank");
    } catch (error) {
      console.error("Error updating payment method:", error);
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  if (!order) return null;

  const currency = (userData as Partner)?.currency || "$";
  const gstPercentage = (userData as Partner)?.gst_percentage || 0;

  const calculateGst = (amount: number) => {
    return (amount * gstPercentage) / 100;
  };

  // Calculate totals
  const foodSubtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const extraChargesTotal = extraCharges.reduce(
    (sum, charge) => sum + charge.amount,
    0
  );

  const subtotal = foodSubtotal + extraChargesTotal;
  const gstAmount = calculateGst(foodSubtotal);
  const grandTotal = subtotal + gstAmount;

  // Determine timezone from userData (partner) or browser
  const tz = (userData as any)?.timezone || (typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");

  // Format order time using client timezone
  const orderTime = (() => {
    try {
      return formatDate(order.createdAt, tz);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  })();

  return (
    <>
      <Dialog
        open={postCheckoutModalOpen}
        onOpenChange={setPostCheckoutModalOpen}
      >
        <DialogContent className="max-w-none w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] h-[95vh] sm:h-[90vh] p-0 sm:p-0 flex flex-col">
          <DialogHeader className="p-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b sticky top-0 bg-white z-10">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pt-1">
                <DialogTitle>
                  <div className="text-xl sm:text-2xl">
                    Order{" "}
                    {(Number(order.display_id) ?? 0) > 0
                      ? `${order.display_id}-${getDateOnly(order.createdAt, tz)}`
                      : order.id.slice(0, 8)}
                  </div>
                  {(Number(order.display_id) ?? 0) > 0 && (
                    <h2 className="text-sm text-gray-800 ">
                      ID: {order.id.slice(0, 8)}
                    </h2>
                  )}
                </DialogTitle>
                <div className="flex gap-2 justify-end items-center">
                  <Button
                    onClick={() => router.push("/admin/orders")}
                    className="px-4 py-2.5 text-base font-semibold border-2 hover:bg-gray-900"
                  >
                    Back to Orders
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="px-4 py-2.5 text-base font-semibold border-2 hover:bg-gray-100"
                  >
                    Close
                  </Button>
                </div>
              </div>
              <DialogDescription className="text-base pb-1">
                {order.tableNumber && (
                  <span className="text-green-600 font-medium">
                    Table {order.tableNumber}
                  </span>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Order Details */}
              <div className="bg-white border rounded-lg divide-y">
                {/* Order Info */}
                <div className="p-4 border-b">
                  <div className="flex justify-between items-start">
                    {/* Order Status */}
                    <div className="flex gap-2 items-center">
                      <div className="bg-green-50 border border-green-200 rounded-full p-2">
                        <div className="flex items-center gap-2 text-green-700">
                          <span className="font-semibold text-xs">
                            Status: {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-blue-50 border mt-2 border-blue-200 rounded-full p-2">
                        <div className="flex items-center gap-2 text-blue-700">
                          <span className="font-medium text-xs">
                            Paid via: {order.payment_method}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <div className="text-sm text-gray-500">Order Time</div>
                      <div className="font-medium">{orderTime}</div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{item.quantity}x</span>
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">
                          {currency}
                          {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extra Charges */}
                {extraCharges.length > 0 && (
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-3">
                      Extra Charges
                    </h3>
                    <div className="space-y-2">
                      {extraCharges.map((charge, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <span>{charge.name}</span>
                          <span className="font-medium">
                            {currency}
                            {charge.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Subtotal:</span>
                    <span>
                      {currency}
                      {foodSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {gstPercentage > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span>{`${
                        (userData as Partner)?.country ===
                        "United Arab Emirates"
                          ? "VAT"
                          : "GST"
                      } (${gstPercentage}%):`}</span>
                      <span>
                        {currency}
                        {gstAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t font-semibold text-lg">
                    <span>Grand Total:</span>
                    <span>
                      {currency}
                      {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pb-4">
                <div className="flex gap-3">
                  <Link
                    href={"/kot/" + order.id}
                    target="_blank"
                    className="flex-1 py-3 text-base font-semibold flex items-center gap-1 bg-gray-100 justify-center border-[1px] border-black/20 rounded-md"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print KOT
                  </Link>
                  <button
                    onClick={handlePrintBill}
                    className="flex-1 py-3 text-base font-semibold flex items-center gap-1 bg-gray-100 justify-center border-[1px] border-black/20 rounded-md"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Bill
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleEditOrder}
                  className="w-full py-3 text-base font-semibold border-2 hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-full max-w-md mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Choose Payment Method</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPaymentModal(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <label className="block cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                  className="sr-only"
                />
                <div
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === "cash"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cash</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "cash"
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {paymentMethod === "cash" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Default payment method
                  </p>
                </div>
              </label>

              <label className="block cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "upi"}
                  onChange={() => setPaymentMethod("upi")}
                  className="sr-only"
                />
                <div
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === "upi"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">UPI</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "upi"
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {paymentMethod === "upi" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Pay via UPI apps</p>
                </div>
              </label>

              <label className="block cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                  className="sr-only"
                />
                <div
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Card</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "card"
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {paymentMethod === "card" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Credit or Debit card
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handlePaymentConfirm}
                className="flex-1"
                disabled={isUpdatingPayment}
              >
                {isUpdatingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Confirm & Print"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden elements for printing */}
      <div className="hidden">
        {/* KOT Template */}
        <KOTTemplate ref={kotRef} order={order} key={`kot-${order.id}`} />

        {/* Bill Template */}
        <BillTemplate
          ref={billRef}
          order={order}
          userData={userData as Partner}
          extraCharges={extraCharges}
          tz={tz}
        />
      </div>
    </>
  );
};
