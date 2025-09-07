"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExtraCharge, usePOSStore } from "@/store/posStore";
import { Plus, Minus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, Partner } from "@/store/authStore";
import { Input } from "@/components/ui/input";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { GET_QR_CODES_BY_PARTNER } from "@/api/qrcodes";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCode } from "@/store/qrDataStore";

interface POSConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

interface QRCode {
  id: string;
  qr_number: number;
  table_number: number | null;
  no_of_scans: number;
}

export const POSConfirmModal = ({
  onClose,
  onConfirm,
}: POSConfirmModalProps) => {
  const {
    cartItems,
    totalAmount,
    increaseQuantity,
    decreaseQuantity,
    checkout,
    setUserPhone,
    addExtraCharge,
    setTableNumber,
    tableNumber,
    setTableName,
    loading,
    addToCart,
    qrGroup,
    setDeliveryMode,
    setIsCaptainOrder,
    getPartnerTables,
    removeExtraCharge,
    removedQrGroupCharges,
    addQrGroupCharge,
    extraCharges: storeExtraCharges,
    removeQrGroupCharge,
  } = usePOSStore();

  const { userData } = useAuthStore();
  const partnerData = userData as Partner;
  const [phoneInput, setPhoneInput] = useState("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [newExtraCharge, setNewExtraCharge] = useState<ExtraCharge>({
    name: "",
    amount: 0,
    id: "",
  });
  const [tableNumbers, setTableNumbers] = useState<number[]>([]);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isDelivery, setIsDelivery] = useState(false);

  // Sync store extra charges with local state
  useEffect(() => {
    setExtraCharges(storeExtraCharges);
  }, [storeExtraCharges]);

  useEffect(() => {
    const fetchTableNumbers = async () => {
      if (!partnerData?.id) return;

      try {
        setIsLoadingTables(true);
        const response = await fetchFromHasura(GET_QR_CODES_BY_PARTNER, {
          partner_id: partnerData.id,
        });

        setQrCodes(response.qr_codes || []);

        if (response?.qr_codes) {
          // Filter out null table numbers and sort them
          const tables = response.qr_codes
            .map((qr: QRCode) => qr.table_number)
            .filter((num: number | null): num is number => num !== null)
            .sort((a: number, b: number) => a - b);

          setTableNumbers(tables);
        }
      } catch (error) {
        console.error("Error fetching table numbers:", error);
        toast.error("Failed to load table numbers");
      } finally {
        setIsLoadingTables(false);
      }
    };

    fetchTableNumbers();
  }, [partnerData?.id]);

  const getGstAmount = (price: number, gstPercentage: number) => {
    return (price * gstPercentage) / 100;
  };

  // Calculate totals
  const foodSubtotal = totalAmount;
  const extraChargesTotal = extraCharges.reduce(
    (sum, charge) => sum + charge.amount,
    0
  );

  const gstAmount = getGstAmount(
    foodSubtotal,
    partnerData?.gst_percentage || 0
  );
  const grandTotal = foodSubtotal + gstAmount + extraChargesTotal;

  // Check if table selection is made (only required for dine-in)
  const isTableSelected = isDelivery || tableNumber !== null;

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

  const handleConfirmOrder = async () => {
    try {
      if (cartItems.length === 0) {
        toast.error(
          "Cart is empty. Please add items before confirming the order."
        );
        return;
      }

      setUserPhone(phoneInput || null);

      // Extra charges are already in the store, no need to add them again

      await checkout();
      onConfirm();
      setPhoneInput("");
      setExtraCharges([]);
      setNewExtraCharge({ name: "", amount: 0, id: "" });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout failed");
    }
  };

  return (
    <div className="bg-white rounded-lg w-full max-w-3xl mx-auto">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Confirm Order</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Delivery Toggle */}
        <div>
          <label className="block text-sm font-medium mb-2">Order Type</label>
          <div className="flex items-center space-x-4">
            <Button
              variant={!isDelivery ? "default" : "outline"}
              onClick={() => {
                setIsDelivery(false);
                setTableNumber(null);
              }}
              className="flex-1"
            >
              Dine-in
            </Button>
            <Button
              variant={isDelivery ? "default" : "outline"}
              onClick={() => {
                setIsDelivery(true);
                setDeliveryMode(true);
              }}
              className="flex-1"
            >
              Delivery
            </Button>
          </div>
        </div>

        {/* Table Selection - Only show for dine-in */}
        {!isDelivery && (
          <div>
            <label className="block text-sm font-medium mb-2">Table's</label>
            {isLoadingTables ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {qrCodes.map((qr) => (
                  <Button
                    key={qr.id}
                    variant={
                      tableNumber === qr.table_number ? "default" : "outline"
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
                <Button
                  variant={tableNumber === 0 ? "default" : "outline"}
                  onClick={() => setTableNumber(0)}
                  className="h-10"
                >
                  No Table
                </Button>
              </div>
            )}
            {!isDelivery && !isTableSelected && (
              <p className="text-sm text-red-500 mt-1">
                Please select a table or choose "No Table"
              </p>
            )}
          </div>
        )}

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
        <div>
          <label className="block text-sm font-medium mb-2">
            Extra Charges (Optional)
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Charge name"
                value={newExtraCharge.name}
                onChange={(e) =>
                  setNewExtraCharge({ ...newExtraCharge, name: e.target.value })
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
                          {partnerData?.currency || "$"}
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

        {/* Order Summary */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          <div className="space-y-2">
            {/* Food Items */}
            {cartItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {partnerData?.currency || "$"}
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
                {partnerData?.currency || "$"}
                {foodSubtotal.toFixed(2)}
              </span>
            </div>

            {/* GST (on food only) */}
            {(partnerData?.gst_percentage || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span>{`GST (${partnerData?.gst_percentage || 0}%)`}</span>
                <span>
                  {partnerData?.currency || "$"}
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
                  <div key={index} className="flex justify-between text-sm">
                    <span className="ml-4">{charge.name}</span>
                    <span>
                      {partnerData?.currency || "$"}
                      {charge.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span>Extra Charges Total:</span>
                  <span>
                    {partnerData?.currency || "$"}
                    {extraChargesTotal.toFixed(2)}
                  </span>
                </div>
              </>
            )}

            {/* Grand Total */}
            <div className="flex justify-between font-semibold mt-2 border-t pt-2">
              <span>Total</span>
              <span>
                {partnerData?.currency || "$"}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmOrder}
            disabled={loading || !isTableSelected || cartItems.length === 0}
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
  );
};
