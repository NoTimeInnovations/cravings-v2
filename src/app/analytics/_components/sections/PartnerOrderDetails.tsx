"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, MapPin, MessageCircle, Phone, XCircle } from "lucide-react";
import { format } from "date-fns";
import { getDiscountAmount } from "@/lib/discountUtils";
import { getExtraCharge } from "@/lib/getExtraCharge";
import type { AnalyticsOrder, PartnerOrdersPartner } from "../types";

export function getOrderStatusColor(status: string | null) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "accepted":
      return "bg-blue-100 text-blue-800";
    case "food_ready":
      return "bg-orange-100 text-orange-800";
    case "dispatched":
      return "bg-purple-100 text-purple-900";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function orderTypeLabel(order: AnalyticsOrder) {
  if (order.type === "delivery" && !order.deliveryAddress) return "Takeaway";
  if (order.type === "table_order") return "Dine-in";
  return order.type ?? "—";
}

function formatScheduledTime(t: string | null) {
  if (!t) return null;
  try {
    return format(new Date(`1970-01-01T${t}`), "hh:mm a");
  } catch {
    return t;
  }
}

/**
 * Read-only replica of the admin-v2 OrderDetails view for the /analytics
 * dashboard — same layout (header, cancellation panel, customer + payment
 * cards, itemised bill with charges/discounts/GST/loyalty), minus the
 * partner-only actions (status change, print, edit, delivery panels).
 */
export default function PartnerOrderDetails({
  order,
  partner,
  onBack,
}: {
  order: AnalyticsOrder;
  partner: PartnerOrdersPartner;
  onBack: () => void;
}) {
  const currency = partner.currency || "₹";
  const gstPercentage = partner.gstPercentage || 0;

  const foodSubtotal = order.items.reduce(
    (sum, item) => sum + (item.isFreebie ? 0 : item.price * item.quantity),
    0
  );

  const chargesSubtotal = (order.extraCharges || []).reduce(
    (sum, charge) =>
      sum +
      getExtraCharge(order.items as any, charge.amount, charge.charge_type as any),
    0
  );

  const subtotal = foodSubtotal + chargesSubtotal;
  const gstAmount = order.gstIncluded ?? (foodSubtotal * gstPercentage) / 100;
  const discounts = order.discounts || [];
  const grandTotal = order.totalPrice;

  const phone = order.phone || order.userPhone;
  const whatsappNumber = (() => {
    const p = (phone || "").replace(/\s+/g, "");
    return /^\+/.test(p) ? p : /^\d{10}$/.test(p) ? `+91${p}` : p;
  })();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                Order #{order.displayId || order.id.slice(0, 8)}
              </h2>
              <Badge className={getOrderStatusColor(order.status)}>
                {(order.status ?? "—").toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {format(new Date(order.createdAt), "PPP p")}
            </p>
            <p className="text-sm text-muted-foreground font-mono">
              ID: #{order.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{partner.name}</div>
          {partner.district && (
            <div className="text-xs text-muted-foreground">{partner.district}</div>
          )}
        </div>
      </div>

      {order.status === "cancelled" && order.cancelReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Cancellation reason
              {order.cancelledBy ? ` · by ${order.cancelledBy}` : ""}
            </p>
            <p className="mt-1 text-sm sm:text-base text-red-900 break-words">
              {order.cancelReason}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-3">Customer Details</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Order Info:</span>
              <div className="flex flex-wrap gap-2 justify-end">
                {(order.tableName ||
                  (order.tableNumber != null && order.tableNumber !== 0)) && (
                  <Badge variant="outline" className="font-medium">
                    Table: {order.tableName || order.tableNumber}
                  </Badge>
                )}
                <Badge variant="secondary" className="font-medium capitalize">
                  {orderTypeLabel(order)}
                </Badge>
                {order.orderChannel && (
                  <Badge
                    className={
                      order.orderChannel === "app"
                        ? "bg-green-100 text-green-800 hover:bg-green-100 font-medium"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-100 font-medium"
                    }
                  >
                    {order.orderChannel === "app" ? "App" : "Web"}
                  </Badge>
                )}
              </div>
            </div>
            {order.scheduledDate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {order.bookingPersons ? "Table booking:" : "Prebooked for:"}
                </span>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-medium">
                  {format(new Date(order.scheduledDate), "PP")}
                  {order.scheduledTime
                    ? ` · ${formatScheduledTime(order.scheduledTime)}`
                    : ""}
                </Badge>
              </div>
            )}
            {(order.userName || order.orderedby) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">
                  {order.userName || order.orderedby}
                </span>
              </div>
            )}
            {phone && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Phone:</span>
                <div className="flex items-center gap-3">
                  <a
                    href={`tel:${phone}`}
                    className="font-medium flex items-center gap-1.5 text-blue-600 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {phone}
                  </a>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium flex items-center gap-1 text-green-600 hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium text-right">
                  {order.deliveryAddress}
                </span>
              </div>
            )}
            {order.deliveryLocation?.coordinates && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Location:</span>
                <a
                  href={`https://www.google.com/maps?q=${order.deliveryLocation.coordinates[1]},${order.deliveryLocation.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium flex items-center gap-1.5 text-blue-600 hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  View on Google Maps
                </a>
              </div>
            )}
            {order.notes && (
              <div className="pt-2 border-t mt-2">
                <span className="text-muted-foreground block mb-1">
                  Order Note:
                </span>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {(order.paymentMethod || order.isPaid) && (
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold mb-3">Payment Details</h3>
            <div className="text-sm space-y-2">
              {order.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium capitalize">
                    {order.paymentMethod}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                {order.isPaid ? (
                  <span className="font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                    Payment Complete
                  </span>
                ) : (
                  <span className="font-medium text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-xs">
                    Pending
                  </span>
                )}
              </div>
              {order.cashfreePaymentId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cashfree ID:</span>
                  <span className="font-medium font-mono text-xs">
                    {order.cashfreePaymentId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h3 className="font-semibold">Order Items</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {item.name}
                  {item.isFreebie && (
                    <span className="text-xs font-bold ml-1 opacity-60">
                      (FREE)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {currency}
                  {item.isFreebie ? 0 : item.price}
                </TableCell>
                <TableCell className="text-right">
                  {currency}
                  {item.isFreebie ? 0 : item.price * item.quantity}
                </TableCell>
              </TableRow>
            ))}

            {(order.extraCharges || []).map((charge, index) => (
              <TableRow
                key={`charge-${index}`}
                className="bg-muted/50 font-medium text-muted-foreground"
              >
                <TableCell colSpan={3} className="text-right text-sm">
                  {charge.name}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {currency}
                  {getExtraCharge(
                    order.items as any,
                    charge.amount,
                    charge.charge_type as any
                  ).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="bg-muted/50 font-medium border-t-2">
              <TableCell colSpan={3} className="text-right">
                Subtotal
              </TableCell>
              <TableCell className="text-right">
                {currency}
                {subtotal.toFixed(2)}
              </TableCell>
            </TableRow>

            {discounts.map((discount, index) => {
              const disc = discount as any;
              const discountValue = getDiscountAmount(disc, subtotal);
              const discountLabel =
                disc.type === "freebie"
                  ? `Freebie Discount${disc.freebie_item_names ? ` (${disc.freebie_item_names})` : ""}`
                  : disc.type === "percentage"
                    ? `${disc.value}% Off`
                    : "Flat Discount";
              return (
                <TableRow
                  key={`discount-${index}`}
                  className="bg-muted/50 font-medium text-green-600"
                >
                  <TableCell colSpan={3} className="text-right text-sm">
                    {discountLabel}
                    {disc.reason && ` (${disc.reason})`}
                  </TableCell>
                  <TableCell className="text-right text-sm text-green-600">
                    - {currency}
                    {(discountValue || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}

            {gstAmount > 0 && (
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={3} className="text-right">
                  {partner.country === "United Arab Emirates" ? "VAT" : "GST"} (
                  {gstPercentage}%)
                </TableCell>
                <TableCell className="text-right">
                  {currency}
                  {gstAmount.toFixed(2)}
                </TableCell>
              </TableRow>
            )}

            {order.loyaltyPointsRedeemed > 0 && (
              <TableRow className="bg-orange-50 font-medium text-orange-700">
                <TableCell colSpan={3} className="text-right text-sm">
                  Loyalty Points Redeemed ({order.loyaltyPointsRedeemed} pts)
                </TableCell>
                <TableCell className="text-right text-sm text-orange-700">
                  - {currency}
                  {order.loyaltyRedeemValue.toFixed(2)}
                </TableCell>
              </TableRow>
            )}

            <TableRow className="bg-muted/50 font-bold text-lg border-t-2">
              <TableCell colSpan={3} className="text-right">
                {order.loyaltyPointsRedeemed > 0
                  ? "Balance Payable"
                  : "Total Amount"}
              </TableCell>
              <TableCell className="text-right">
                {currency}
                {grandTotal.toFixed(2)}
              </TableCell>
            </TableRow>

            {order.loyaltyPointsEarned != null && order.loyaltyPointsEarned > 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-right text-xs text-emerald-600 pt-2"
                >
                  Customer earned {order.loyaltyPointsEarned} loyalty points on
                  this order
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
