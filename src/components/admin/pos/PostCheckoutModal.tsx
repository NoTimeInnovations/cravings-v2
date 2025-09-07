"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePOSStore } from "@/store/posStore";
import { Printer, Edit, Loader2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { Partner, useAuthStore } from "@/store/authStore";
import KOTTemplate from "./KOTTemplate";
import BillTemplate from "./BillTemplate";
import { useRouter } from "next/navigation";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getDateOnly } from "@/lib/formatDate";
import Link from "next/link";

export const PostCheckoutModal = () => {
  const {
    order,
    clearCart,
    extraCharges,
    setPostCheckoutModalOpen,
    postCheckoutModalOpen,
    setEditOrderModalOpen,
    qrGroup,
  } = usePOSStore();
  const { userData } = useAuthStore();
  const router = useRouter();
  const billRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);

  const handleEditOrder = () => {
    setPostCheckoutModalOpen(false);
    setEditOrderModalOpen(true);
  };

  const handleClose = () => {
    setPostCheckoutModalOpen(false);
    clearCart();
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
                      ? `${order.display_id}-${getDateOnly(order.createdAt)}`
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
                  onClick={()=>router.push('/admin/orders')}
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
              {/* Order Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                  <span className="font-semibold">Status: {order.status}</span>
                </div>
              </div>

              {/* Order Details */}
              <div className="bg-white border rounded-lg divide-y">
                {/* Order Info */}
                <div className="p-4 border-b">
                  <div className="flex justify-end">
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
                      <span>{`GST (${gstPercentage}%):`}</span>
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
                  <Link
                    href={"/bill/" + order.id}
                    target="_blank"
                    className="flex-1 py-3 text-base font-semibold flex items-center gap-1 bg-gray-100 justify-center border-[1px] border-black/20 rounded-md"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Bill
                  </Link>
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
        />
      </div>
    </>
  );
};
