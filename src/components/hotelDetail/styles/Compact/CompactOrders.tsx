import React, { useEffect, useState } from "react";
import useOrderStore from "@/store/orderStore";
import { format } from "date-fns";
import { Loader2, ShoppingBag, ExternalLink, MessageCircle, CreditCard } from "lucide-react";
import { useAuthStore, Partner } from "@/store/authStore";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import { getExtraCharge } from "@/lib/getExtraCharge";
import Link from "next/link";
import { UpiPaymentScreen } from "@/components/hotelDetail/placeOrder/UpiPaymentScreen";
import { fetchFromHasura } from "@/lib/hasuraClient";

interface CompactOrdersProps {
    hotelId: string;
    styles: any;
}

const CompactOrders = ({ hotelId, styles }: CompactOrdersProps) => {
    const { userOrders, subscribeUserOrders } = useOrderStore();
    const { userData } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [upiOrder, setUpiOrder] = useState<(typeof userOrders)[0] | null>(null);
    const [partnerPaymentInfo, setPartnerPaymentInfo] = useState<{
        upi_id?: string;
        show_payment_qr?: boolean;
        phone?: string;
    } | null>(null);

    useEffect(() => {
        if (userData?.id) {
            const unsubscribe = subscribeUserOrders(() => {
                setLoading(false);
            });
            return () => {
                unsubscribe();
            };
        }
    }, [userData, subscribeUserOrders]);

    useEffect(() => {
        if (!hotelId) return;
        fetchFromHasura(`
            query GetPartnerPaymentInfo($id: uuid!) {
                partners_by_pk(id: $id) {
                    upi_id
                    show_payment_qr
                    phone
                }
            }
        `, { id: hotelId }).then((data) => {
            if (data?.partners_by_pk) {
                setPartnerPaymentInfo(data.partners_by_pk);
            }
        }).catch(() => {});
    }, [hotelId]);

    const partnerOrders = userOrders
        .filter((order) => order.partnerId === hotelId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (loading && partnerOrders.length === 0) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
            </div>
        );
    }

    if (partnerOrders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center p-4">
                <div className="p-4 rounded-full bg-gray-100">
                    <ShoppingBag size={40} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No orders yet</h3>
                <p className="text-sm text-gray-500">
                    You haven't placed any orders with this partner yet.
                </p>
            </div>
        );
    }

    return (
        <>
        {upiOrder && partnerPaymentInfo?.upi_id && (
            <UpiPaymentScreen
                upiId={partnerPaymentInfo.upi_id}
                storeName={upiOrder.partner?.store_name || ""}
                amount={(() => {
                    const gstPercentage = (upiOrder.partner as Partner)?.gst_percentage || 0;
                    const foodTotal = (upiOrder.items || []).reduce((s: number, i: any) => s + i.price * i.quantity, 0);
                    const extraChargesTotal = (upiOrder.extraCharges || []).reduce((s: number, c: any) => s + getExtraCharge(upiOrder.items || [], c.amount, c.charge_type) || 0, 0) || 0;
                    const subtotal = foodTotal + extraChargesTotal;
                    const discounts = (upiOrder as any).discounts || [];
                    const discountAmount = discounts.reduce((t: number, d: any) => d.type === "flat" ? t + d.value : t + (subtotal * d.value) / 100, 0);
                    const discountedFoodTotal = Math.max(0, foodTotal - discountAmount);
                    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
                    return discountedSubtotal + getGstAmount(discountedFoodTotal, gstPercentage);
                })()}
                currency={upiOrder.partner?.currency || "₹"}
                orderId={upiOrder.id}
                postPaymentMessage={null}
                whatsappLink={(() => {
                    const rawPhone = partnerPaymentInfo?.phone;
                    const phone = rawPhone?.replace(/\D/g, "");
                    if (!phone) return "";
                    const cur = upiOrder.partner?.currency || "₹";
                    const gstPct = (upiOrder.partner as Partner)?.gst_percentage || 0;
                    const fTotal = (upiOrder.items || []).reduce((s: number, i: any) => s + i.price * i.quantity, 0);
                    const extTotal = (upiOrder.extraCharges || []).reduce((s: number, c: any) => s + getExtraCharge(upiOrder.items || [], c.amount, c.charge_type) || 0, 0) || 0;
                    const sub = fTotal + extTotal;
                    const disc = ((upiOrder as any).discounts || []).reduce((t: number, d: any) => d.type === "flat" ? t + d.value : t + (sub * d.value) / 100, 0);
                    const discFoodTotal = Math.max(0, fTotal - disc);
                    const discSub = Math.max(0, sub - disc);
                    const gst = getGstAmount(discFoodTotal, gstPct);
                    const total = discSub + gst;
                    const nowTime = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: true }).format(new Date(upiOrder.createdAt || Date.now()));
                    const dp = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).formatToParts(new Date(upiOrder.createdAt || Date.now()));
                    const d = dp.find(p => p.type === "day")?.value;
                    const m = dp.find(p => p.type === "month")?.value;
                    const sid = ((upiOrder as any).display_id || upiOrder.id.slice(0, 4).toUpperCase());
                    const itemsText = (upiOrder.items || []).map((item: any, idx: number) => `${idx + 1}. ${item.name}\n   ➤ Qty: ${item.quantity} × ${cur}${item.price.toFixed(2)} = ${cur}${(item.price * item.quantity).toFixed(2)}`).join("\n\n");
                    const gstLine = gstPct > 0 ? `\n*GST (${gstPct}%):* ${cur}${gst.toFixed(2)}` : "";
                    const msg = `*🍽️ Order Details 🍽️*\n\n*Order ID:* ${sid}-${m} ${d}\n*Time:* ${nowTime}\n\n*📋 Order Items:*\n${itemsText}\n\n*Subtotal:* ${cur}${discSub.toFixed(2)}${gstLine}\n\n*Total Price:* ${cur}${total.toFixed(2)}`;
                    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                })()}
                onBack={() => setUpiOrder(null)}
                onClose={() => setUpiOrder(null)}
            />
        )}
        <div className="flex flex-col gap-4 pt-10 p-4 pb-24 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900">Your Orders</h2>
                <a href="/my-orders" className="text-sm font-medium underline text-orange-600">
                    All Orders
                </a>
            </div>

            {partnerOrders.map((order) => {
                const gstPercentage =
                    (order.partner as Partner)?.gst_percentage || 0;
                const foodTotal = (order.items || []).reduce(
                    (sum: number, item: any) => sum + item.price * item.quantity,
                    0
                );

                const extraChargesTotal =
                    (order.extraCharges || []).reduce(
                        (sum: number, charge: any) =>
                            sum +
                            getExtraCharge(
                                order?.items || [],
                                charge.amount,
                                charge.charge_type
                            ) || 0,
                        0
                    ) || 0;

                const subtotal = foodTotal + extraChargesTotal;

                const discounts = order.discounts || [];
                const discountAmount = discounts.reduce((total: number, discount: any) => {
                    if (discount.type === "flat") {
                        return total + discount.value;
                    } else {
                        return total + (subtotal * discount.value) / 100;
                    }
                }, 0);

                const discountedSubtotal = Math.max(0, subtotal - discountAmount);
                const discountedFoodTotal = Math.max(0, foodTotal - discountAmount);
                const gstAmount = getGstAmount(discountedFoodTotal, gstPercentage);
                const grandTotal = discountedSubtotal + gstAmount;
                const statusDisplay = getStatusDisplay(order);
                const isCompleted = order.status === "completed" || order.status === "cancelled";
                const hasUpiQr = partnerPaymentInfo?.show_payment_qr && !!partnerPaymentInfo?.upi_id;
                const rawPhone = partnerPaymentInfo?.phone;
                const whatsappPhone = rawPhone?.replace(/\D/g, "");
                const currency = (order.partner as Partner)?.currency || "₹";
                const nowTime = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: true }).format(new Date(order.createdAt || Date.now()));
                const dateParts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).formatToParts(new Date(order.createdAt || Date.now()));
                const day = dateParts.find(p => p.type === "day")?.value;
                const month = dateParts.find(p => p.type === "month")?.value;
                const shortId = ((order as any).display_id || order.id.slice(0, 4).toUpperCase());
                const formattedOrderId = `${shortId}-${month} ${day}`;
                const orderTypeStr = order.type === "table_order" && order.tableNumber
                    ? `*Table:* ${order.tableNumber}`
                    : `*Order Type:* ${order.type?.replace("_", " ") || "Delivery"}`;
                const deliveryLine = order.type === "delivery" && order.deliveryAddress
                    ? `\n*Delivery Address:* ${order.deliveryAddress}`
                    : "";
                const customerPhone = (order as any).user?.phone || (order as any).phone;
                const phoneLine = customerPhone ? `\n*Customer Phone:* ${customerPhone}\n` : "";
                const itemsText = (order.items || [])
                    .map((item: any, index: number) => `${index + 1}. ${item.name}\n   ➤ Qty: ${item.quantity} × ${currency}${item.price.toFixed(2)} = ${currency}${(item.price * item.quantity).toFixed(2)}`)
                    .join("\n\n");
                const gstLine = gstPercentage > 0
                    ? `\n*${(order.partner as Partner)?.country === "United Arab Emirates" ? "VAT" : "GST"} (${gstPercentage}%):* ${currency}${gstAmount.toFixed(2)}`
                    : "";
                const whatsappMsg = `*🍽️ Order Details 🍽️*\n\n*Order ID:* ${formattedOrderId}\n${orderTypeStr}${deliveryLine}${phoneLine}\n*Time:* ${nowTime}\n\n*📋 Order Items:*\n${itemsText}\n\n*Subtotal:* ${currency}${(foodTotal + extraChargesTotal).toFixed(2)}${gstLine}\n\n*Total Price:* ${currency}${grandTotal.toFixed(2)}`;
                const whatsappLink = whatsappPhone
                    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMsg)}`
                    : null;

                return (
                    <div
                        key={order.id}
                        className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white hover:shadow-md transition-shadow relative"
                    >
                        <Link href={`/order/${order.id}`} className="block">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-lg text-gray-900">
                                            {order.partner?.store_name}
                                        </h3>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusDisplay.className}`}
                                        >
                                            {statusDisplay.text}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        #{order.id.slice(0, 8)} • {format(new Date(order.createdAt), "MMM d, h:mm a")}
                                    </p>
                                </div>
                                <div className="text-orange-600 bg-orange-50 p-2 rounded-full transition-colors">
                                    <ExternalLink className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span className="text-gray-700">
                                            {item.quantity} × {item.name}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {order.partner?.currency || "₹"}
                                            {(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount</span>
                                        <span className="font-medium">
                                            - {(order.partner as Partner)?.currency || "₹"}
                                            {discountAmount.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="border-t pt-3 flex justify-between items-center font-bold text-gray-900">
                                <span>Total</span>
                                <span>
                                    {order.partner?.currency || "₹"}
                                    {grandTotal.toFixed(2)}
                                </span>
                            </div>
                        </Link>

                        {!isCompleted && (whatsappLink || hasUpiQr) && (
                            <div className="flex gap-2 mt-3">
                                {whatsappLink && (
                                    <a
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg font-medium text-xs hover:bg-green-600 transition-colors"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        Send to WhatsApp
                                    </a>
                                )}
                                {hasUpiQr && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setUpiOrder(order); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg font-medium text-xs hover:bg-orange-600 transition-colors"
                                    >
                                        <CreditCard className="w-3.5 h-3.5" />
                                        Pay Now
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        </>
    );
};

export default CompactOrders;
