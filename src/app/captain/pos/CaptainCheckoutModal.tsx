"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePOSStore, ExtraCharge } from "@/store/posStore";
import { Printer, Edit, Loader2, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useAuthStore, Captain, Partner } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import KOTTemplate from "@/components/admin/pos/KOTTemplate";
import BillTemplate from "@/components/admin/pos/BillTemplate";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { toast } from "sonner";
import { getDateOnly } from "@/lib/formatDate";

export const CaptainCheckoutModal = () => {
  const {
    order,
    postCheckoutModalOpen: isOpen,
    setPostCheckoutModalOpen,
    setEditOrderModalOpen,
    clearCart,
    extraCharges,
    qrGroup,
    closeAllModalsAndPOS,
  } = usePOSStore();

  const { userData } = useAuthStore();
  const captainData = userData as Captain;
  const partnerData = userData as Partner;

  // Refs for printing
  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const handleEditOrder = () => {
    setPostCheckoutModalOpen(false);
    setEditOrderModalOpen(true);
  };

  const handleClose = () => {
    setPostCheckoutModalOpen(false);
    clearCart();
  };

  if (!order) return null;

  const currency = partnerData?.currency || "$";
  const gstPercentage = partnerData?.gst_percentage || 0;

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

  // Format order time
  const orderTime = (() => {
    try {
      const date = new Date(order.createdAt);
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", order.createdAt);
        return "Invalid date";
      }
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  })();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setPostCheckoutModalOpen}>
        <DialogContent className="max-w-lg w-[90vw] h-[75vh] sm:max-h-[85vh] p-0 flex flex-col">
          <DialogHeader className="p-3 border-b bg-white z-10 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  <div className="text-xl sm:text-2xl">
                    Order{" "}
                    {(Number(order.display_id) ?? 0) > 0
                      ? `${order.display_id}-${getDateOnly(order.createdAt)}`
                      : order.id.slice(0, 8)}
                  </div>
                  {(Number(order.display_id) ?? 0) > 0 && (
                    <h2 className="text-sm text-gray-800 ">
                      ID: {order.id.slice(0, 8)}
                    </h2>
                  )}
                </DialogTitle>
                {order.tableNumber && (
                  <DialogDescription className="text-sm text-green-600 font-medium mt-1">
                    Table {order.tableNumber}
                  </DialogDescription>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeAllModalsAndPOS}
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
              {/* Order Status */}
              <div className="bg-green-50 border border-green-200 rounded-md p-2">
                <div className="flex items-center gap-2 text-green-700">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                  <span className="font-medium text-sm">Status: Complete</span>
                </div>
              </div>

              {/* Order Time */}
              <div className="text-right">
                <div className="text-xs text-gray-500">Order Time</div>
                <div className="text-sm font-medium">{orderTime}</div>
              </div>

              {/* Items List */}
              <div className="bg-white border rounded-md p-3">
                <h3 className="font-semibold text-base mb-2">Order Items</h3>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-600">
                          {item.quantity}x
                        </span>
                        <span className="flex-1">{item.name}</span>
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
                <div className="bg-white border rounded-md p-3">
                  <h3 className="font-semibold text-base mb-2">
                    Extra Charges
                  </h3>
                  <div className="space-y-2">
                    {extraCharges.map((charge, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-sm"
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
              <div className="bg-gray-50 border rounded-md p-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span>Subtotal:</span>
                    <span>
                      {currency}
                      {foodSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {gstPercentage > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span>GST ({gstPercentage}%):</span>
                      <span>
                        {currency}
                        {gstAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-gray-300 font-semibold">
                    <span>Grand Total:</span>
                    <span>
                      {currency}
                      {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t bg-white shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleEditOrder}
                className="flex-1 py-2 text-sm font-medium"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Order
              </Button>
              <Button
                variant="default"
                onClick={closeAllModalsAndPOS}
                className="flex-1 py-2 text-sm font-medium"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden elements for printing */}
      <div className="hidden">
        {/* KOT Template */}
        <KOTTemplate ref={kotRef} order={order} key={`kot-${order.id}`} />

        {/* Bill Template */}
        <BillTemplate
          ref={billRef}
          order={order}
          userData={partnerData || (captainData as any)}
          extraCharges={extraCharges}
        />
      </div>
    </>
  );
};
