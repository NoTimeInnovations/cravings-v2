"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExtraCharge, usePOSStore } from "@/store/posStore";
import { Plus, Minus, ShoppingCart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Captain, useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/input";
import { table } from "console";

export const Captaincart = () => {
  const {
    cartItems,
    totalAmount,
    decreaseQuantity,
    checkout,
    setUserPhone,
    addExtraCharge,
    setTableNumber,
    tableNumbers,
    tableNumber,
    setTableName,
    loading,
    setLoading,
    setPostCheckoutModalOpen,
    addToCart,
    tableName,
    qrGroup,
    qrCodeData,
    getPartnerTables,
    removeExtraCharge,
    removedQrGroupCharges,
    addQrGroupCharge,
    removeQrGroupCharge,
    extraCharges: storeExtraCharges,
    orderNote,
    setOrderNote,
    cartModalOpen,
    setCartModalOpen,
  } = usePOSStore();

  const { userData } = useAuthStore();
  const captainData = userData as Captain;
  const [phoneInput, setPhoneInput] = useState("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [newExtraCharge, setNewExtraCharge] = useState<ExtraCharge>({
    name: "",
    amount: 0,
    id: "",
  });

  // Sync store extra charges with local state
  useEffect(() => {
    setExtraCharges(storeExtraCharges);
  }, [storeExtraCharges]);

  useEffect(() => {
    const fetchTableNumbers = async () => {
      if (!captainData?.partner_id) return;
      try {
        await getPartnerTables();
      } catch (error) {
        console.error("Error fetching table numbers:", error);
      }
    };
    fetchTableNumbers();
  }, [captainData?.partner_id, getPartnerTables]);

  const getGstAmount = (price: number, gstPercentage: number) => {
    return (price * gstPercentage) / 100;
  };

  // Calculate totals
  const foodSubtotal = totalAmount; // This is the subtotal of food items only
  const extraChargesTotal = extraCharges.reduce(
    (sum, charge) => sum + charge.amount,
    0
  );
  const gstAmount = getGstAmount(
    foodSubtotal,
    captainData?.gst_percentage || 0
  ); // GST only on food items
  const grandTotal = foodSubtotal + gstAmount + extraChargesTotal;

  const handleAddExtraCharge = () => {
    if (!newExtraCharge.name || newExtraCharge.amount <= 0) {
      toast.error("Please enter a valid charge name and amount");
      return;
    }
    const charge: ExtraCharge = {
      id: Date.now().toString(),
      name: newExtraCharge.name,
      amount: newExtraCharge.amount,
    };
    // Add to store instead of local state
    addExtraCharge(charge);
    setNewExtraCharge({ name: "", amount: 0, id: "" });
  };

  const handleRemoveExtraCharge = (index: number) => {
    const chargeToRemove = extraCharges[index];
    // If this was a QR group charge, use the store function
    if (chargeToRemove.id.startsWith("qr-group-")) {
      const qrGroupId = chargeToRemove.id.replace("qr-group-", "");
      removeQrGroupCharge(qrGroupId);
    } else {
      // Remove from store
      removeExtraCharge(chargeToRemove.id);
    }
  };

  const handleAddQrGroupCharge = () => {
    if (qrGroup && removedQrGroupCharges.includes(qrGroup.id)) {
      // Use the store function to add back the QR group charge
      addQrGroupCharge(qrGroup.id);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!tableNumber) {
      toast.error("Please select a table number");
      return;
    }
    try {
      setLoading(true);
      setUserPhone(phoneInput);
      await checkout();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Cart Summary Bar - Only show when there are items */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg transition-transform duration-300 ${
          cartItems.length > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              {/* price */}
              <div className="flex gap-2 text-nowrap font-extrabold text-lg sm:text-xl lg:text-2xl">
                <div>PRICE :</div>
                <div>
                  {captainData?.currency || "$"}
                  {grandTotal.toFixed(2)}
                </div>
              </div>
              {/* total Items */}
              <div className="inline-flex flex-nowrap text-nowrap gap-2 font-medium text-black/50 text-sm">
                <div>Total Items :</div>
                <div>
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                if (cartItems.length === 0) {
                  toast.error(
                    "Cart is empty. Please add items before viewing the order."
                  );
                  return;
                }
                setCartModalOpen(true);
              }}
              className="bg-black hover:bg-black/90 text-white font-semibold text-sm sm:text-base flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg min-w-[140px] justify-center"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>View Order</span>
            </Button>
          </div>
        </div>
      </div>
      {/* Custom Modal */}
      {cartModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[95vw] sm:w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Confirm Order</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCartModalOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* Table Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Table Number
                </label>
                {tableNumber !== null && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    Selected: Table {tableName || tableNumber}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {(qrCodeData || [])
                    .filter(
                      (qr) => qr.table_number !== 0 && qr.table_number !== null
                    )
                    .map((qr) => (
                      <Button
                        key={qr.id}
                        variant={
                          tableNumber === qr.table_number
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          setTableNumber(qr.table_number);
                          setTableName(qr.table_name || null);
                        }}
                        className="h-10"
                      >
                        Table {qr.table_name || qr.table_number}
                      </Button>
                    ))}
                </div>
                {tableNumber !== null && (
                  <Button
                    variant="outline"
                    onClick={() => setTableNumber(null)}
                    className="mt-2 h-8 text-sm"
                  >
                    Clear Table Selection
                  </Button>
                )}
                {tableNumbers.filter((table) => table !== 0).length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    No tables available
                  </p>
                )}
              </div>
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Customer Phone (Optional)
                </label>
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
              </div>
              {/* Extra Charges */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Extra Charges</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Charge name"
                      value={newExtraCharge.name}
                      onChange={(e) =>
                        setNewExtraCharge({
                          ...newExtraCharge,
                          name: e.target.value,
                        })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newExtraCharge.amount || ""}
                      onChange={(e) =>
                        setNewExtraCharge({
                          ...newExtraCharge,
                          amount: Number(e.target.value),
                        })
                      }
                    />
                    <Button
                      onClick={handleAddExtraCharge}
                      className="whitespace-nowrap"
                    >
                      Add Charge
                    </Button>
                  </div>
                  {extraCharges.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="divide-y">
                        {extraCharges.map((charge, index) => (
                          <div
                            key={charge.id || index}
                            className="p-3 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{charge.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {captainData?.currency || "$"}
                                {charge.amount.toFixed(2)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveExtraCharge(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Show "Add back" message for removed QR group charges */}
                  {qrGroup && removedQrGroupCharges.includes(qrGroup.id) && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border">
                      <span>Add extra {qrGroup.name} charge? </span>
                      <button
                        onClick={handleAddQrGroupCharge}
                        className="text-blue-700 underline hover:text-blue-800"
                      >
                        Click here to add back
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Order Note */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Order Note</h3>
                <textarea
                  placeholder="Add any special instructions or notes for this order..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full p-3 border rounded-md resize-none bg-white text-black dark:bg-zinc-900 dark:text-white"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-black mt-1">
                  {orderNote.length}/500 characters
                </div>
              </div>
              {/* Order Summary */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Order Summary </h3>
                <div className="space-y-2">
                  {/* Food Items */}
                  {cartItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {captainData?.currency || "$"}
                          {item.price.toFixed(2)} each
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => decreaseQuantity(item.id!)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => addToCart(item)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {/* Subtotal (Food only) */}
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span>Subtotal</span>
                    <span>
                      {captainData?.currency || "$"}
                      {foodSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {/* GST (on food only) */}
                  {(captainData?.gst_percentage || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{`GST (${
                        captainData?.gst_percentage || 0
                      }%)`}</span>
                      <span>
                        {captainData?.currency || "$"}
                        {gstAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {/* Extra Charges */}
                  {extraCharges.length > 0 && (
                    <>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="font-medium">Extra Charges</span>
                      </div>
                      {extraCharges.map((charge, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm"
                        >
                          <span className="ml-4">{charge.name}</span>
                          <span>
                            {captainData?.currency || "$"}
                            {charge.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm">
                        <span>Extra Charges Total:</span>
                        <span>
                          {captainData?.currency || "$"}
                          {extraChargesTotal.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  {/* Grand Total */}
                  <div className="flex justify-between font-semibold mt-2 border-t pt-2">
                    <span>Total</span>
                    <span>
                      {captainData?.currency || "$"}
                      {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Modal Footer */}
              <div className="p-4 border-t flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCartModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={loading || cartItems.length === 0}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Order"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
