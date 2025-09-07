import { QrGroup } from "@/app/admin/qr-management/page";
import {
  getGstAmount,
} from "@/components/hotelDetail/OrderDrawer";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { Partner } from "@/store/authStore";
import { Order } from "@/store/orderStore";
import React from "react";

interface BillTemplateProps {
  ref: React.RefObject<HTMLDivElement | null>;
  userData: Partner;
  order: Order;
  extraCharges?: Array<{
    name: string;
    amount: number;
    charge_type?: string;
    id?: string;
  }>;
}

const BillTemplate = React.forwardRef<HTMLDivElement, BillTemplateProps>(
  ({ userData, order, extraCharges = [] }, ref) => {
    if (!order) return null;

    const currency = userData?.currency || "$";
    const gstPercentage = userData?.gst_percentage || 0;

    // Calculate amounts
    const foodSubtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const chargesSubtotal = extraCharges.reduce(
      (sum, charge) =>
        sum +
        getExtraCharge(
          order?.items || [],
          charge.amount || 0,
          charge.charge_type as QrGroup["charge_type"]
        ),
      0
    );

    const subtotal = foodSubtotal + chargesSubtotal;
    const gstAmount = getGstAmount(foodSubtotal, gstPercentage);
    const grandTotal = subtotal + gstAmount;

    // Determine order type and display text
    const getOrderTypeText = () => {
      if (
        order.tableNumber === 0 ||
        order.type === "delivery"
      )
        return "Delivery";
      if (!order.tableNumber) return "Takeaway";
      return `Table ${order.tableNumber}`;
    };

    return (
      <div
        ref={ref}
        className="p-4 bill-template"
        style={{ fontFamily: "monospace", maxWidth: "300px" }}
      >
        {/* Header */}
        <h2 className="text-xl font-bold text-center uppercase">
          {userData?.store_name || "Restaurant"}
        </h2>
        <p className="text-center text-xs mb-2">
          {[userData?.district].filter(Boolean).join(", ") ||
            "Address not specified"}
        </p>
        <p className="text-center text-xs mb-2">
          {userData?.phone ? `Tel: ${userData.phone}` : ""}
        </p>
        <div className="border-b border-black my-2"></div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Order #:</span>
            <span> {order.id.slice(0, 8)}</span>
          </div>
          <div className="text-right">
            <span className="font-medium">Date:</span>
            <span> {new Date(order.createdAt).toLocaleDateString("en-GB")}</span>
          </div>
          <div>
            <span className="font-medium">Type:</span>
            <span> {getOrderTypeText()}</span>
          </div>
          <div className="text-right">
            <span className="font-medium">Time:</span>
            <span>
              {" "}
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Delivery Information */}
        {(order.tableNumber === 0 ||
          order.deliveryAddress !== "" ||
          order.type == "delivery") && (
          <>
            <div className="border-t border-black my-2"></div>
            <div className="text-sm">
              <div className="font-bold text-sm uppercase mb-1">
                Order Details:
              </div>
              {/* Takeaway Phone */}
              {(order.user?.phone || order.phone) && (
                <>
                  <div className="text-sm flex gap-2 mb-1">
                    <div className="font-medium">Customer Phone:</div>
                    <div className="text-xs">{order.user?.phone || order.phone}</div>
                  </div>
                </>
              )}
              {order.deliveryAddress !== "" && (
                <div className="mb-1 flex gap-2">
                  <div className="font-medium">Address:</div>
                  <div className="text-xs">{order.deliveryAddress}</div>
                </div>
              )}
              {!order.tableNumber && order.delivery_location && (
                <>
                  <div className="text-sm flex gap-2">
                    <div className="font-medium">Delivery Location:</div>
                    <br />
                    <div className="text-xs">
                      <img
                        alt="QR Code for Delivery Location"
                        className="w-16 h-16"
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                          `https://www.google.com/maps/place/${order.delivery_location?.coordinates[1]},${order.delivery_location?.coordinates[0]}`
                        )}`}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="border-b border-black my-2"></div>

        {/* Order Items */}
        <h3 className="font-bold text-sm uppercase mb-1">Items Ordered</h3>
        <ul className="space-y-1 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity}x {item.name}
              </span>
              <span>
                {currency}
                {(item.price * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        {/* Extra Charges */}
        {extraCharges.length > 0 && (
          <>
            <div className="border-t border-dashed border-gray-400 my-2"></div>
            <h3 className="font-bold text-sm uppercase mb-1">Extra Charges</h3>
            <ul className="space-y-1 text-sm">
              {extraCharges.map((charge) => (
                <li key={charge.id} className="flex justify-between">
                  <span>{charge.name}</span>
                  <span>
                    {currency}
                    {getExtraCharge(
                      order?.items || [],
                      charge.amount || 0,
                      charge.charge_type as QrGroup["charge_type"]
                    ).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Totals */}
        <div className="border-t border-black my-2"></div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>
              {currency}
              {subtotal.toFixed(2)}
            </span>
          </div>
          {gstPercentage > 0 && (
            <div className="flex justify-between">
              <span>GST ({gstPercentage}%):</span>
              <span>
                {currency}
                {gstAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base mt-2 border-t border-black pt-1">
            <span>TOTAL:</span>
            <span>
              {currency}
              {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs mt-4 pt-2 border-t border-dashed border-gray-400">
          <p>Thank you for your visit!</p>
          <p className="mt-1">
            {userData?.gst_no ? `GSTIN: ${userData.gst_no}` : ""}
          </p>
        </div>
      </div>
    );
  }
);

BillTemplate.displayName = "BillTemplate";

export default BillTemplate;
