"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatDate, getDateOnly } from "@/lib/formatDate";
import { ExtraCharge } from "@/store/posStore";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Order, OrderItem } from "@/store/orderStore";
import OfferLoadinPage from "@/components/OfferLoadinPage";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { ArrowLeft, MessageCircle, CreditCard } from "lucide-react";
import { UpiPaymentScreen } from "@/components/hotelDetail/placeOrder/UpiPaymentScreen";

const GET_ORDER_QUERY = `
  subscription GetOrder($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      total_price
      created_at
      notes
      table_number
      qr_id
      type
      delivery_address
      delivery_location
      status
      status_history
      display_id
      partner_id
      partner {
        gst_percentage
        currency
        store_name
        country
      }
      gst_included
      extra_charges
      phone
      user_id
        user {
        full_name
        phone
        email
      }
      partner {
        name
        currency
        
      }
      order_items {
        id
        quantity
        item
      }
    }
  }
`;

const OrderClient = () => {
    const params = useParams();
    const orderId = params.id as string;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showUpiScreen, setShowUpiScreen] = useState(false);
    const [partnerPaymentInfo, setPartnerPaymentInfo] = useState<{
        upi_id?: string;
        show_payment_qr?: boolean;
        phone?: string;
    } | null>(null);

    useEffect(() => {
        if (!orderId) return;

        const unsubscribe = subscribeToHasura({
            query: GET_ORDER_QUERY,
            variables: { id: orderId },
            onNext: (data) => {
                if (data?.data.orders_by_pk) {
                    const order = data.data.orders_by_pk;
                    setOrder({
                        id: order?.id,
                        totalPrice: order?.total_price,
                        createdAt: order?.created_at,
                        tableNumber: order?.table_number,
                        qrId: order?.qr_id,
                        status: order?.status,
                        status_history: order?.status_history,
                        display_id: order?.display_id,
                        type: order?.type,
                        phone: order?.phone,
                        notes: order?.notes,
                        deliveryAddress: order?.delivery_address,
                        delivery_location: order?.delivery_location,
                        partnerId: order?.partner_id,
                        partner: order?.partner,
                        userId: order?.user_id,
                        gstIncluded: order?.gst_included,
                        extraCharges: order?.extra_charges || [],
                        delivery_charge: order?.delivery_charge,
                        user: order?.user,
                        items: order?.order_items.map((i: any) => ({
                            id: i.item.id,
                            quantity: i.quantity,
                            name: i.item?.name || "Unknown",
                            price: i.item?.offers?.[0]?.offer_price || i.item?.price || 0,
                            category: i.menu?.category,
                        })),
                    });
                } else {
                    setError("Order not found");
                }
                setLoading(false);
            },
            onError: (error) => {
                console.error("Error fetching order data:", error);
                setError("Failed to load order data");
                setLoading(false);
            },
        });

        return () => {
            unsubscribe();
        };
    }, [orderId]);

    useEffect(() => {
        if (!order?.partnerId) return;
        fetchFromHasura(`
            query GetPartnerPaymentInfo($id: uuid!) {
                partners_by_pk(id: $id) {
                    upi_id
                    show_payment_qr
                    phone
                }
            }
        `, { id: order.partnerId }).then((data) => {
            if (data?.partners_by_pk) {
                setPartnerPaymentInfo(data.partners_by_pk);
            }
        }).catch(() => {});
    }, [order?.partnerId]);

    // Calculate order totals
    const foodTotal = order?.items?.reduce(
        (sum, orderItem) => sum + orderItem.price * orderItem.quantity,
        0
    ) ?? 0;

    const extraChargesTotal =
        order?.extraCharges?.reduce(
            (sum, charge) =>
                sum +
                getExtraCharge(
                    order?.items,
                    charge.amount,
                    charge.charge_type as "FLAT_FEE" | "PER_ITEM"
                ),
            0
        ) || 0;

    const subtotal = foodTotal + extraChargesTotal;
    const gstPercentage = order?.partner?.gst_percentage || 0;
    const gstAmount = (foodTotal * gstPercentage) / 100;
    const grandTotal = subtotal + gstAmount;

    const statusDisplay = getStatusDisplay(order as Order);
    const isCompleted = order?.status === "completed" || order?.status === "cancelled";

    const buildWhatsappLink = () => {
        const rawPhone = partnerPaymentInfo?.phone;
        const phone = rawPhone?.replace(/\D/g, "");
        if (!phone) return null;
        const currency = order?.partner?.currency || "₹";
        const nowTime = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: true }).format(new Date(order?.createdAt || Date.now()));
        const dateParts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).formatToParts(new Date(order?.createdAt || Date.now()));
        const day = dateParts.find(p => p.type === "day")?.value;
        const month = dateParts.find(p => p.type === "month")?.value;
        const shortId = (order?.display_id || order?.id?.slice(0, 4).toUpperCase() || "N/A");
        const formattedOrderId = `${shortId}-${month} ${day}`;
        const orderTypeStr = order?.type === "table_order" && order?.tableNumber
            ? `*Table:* ${order.tableNumber}`
            : `*Order Type:* ${order?.type?.replace("_", " ") || "Delivery"}`;
        const deliveryLine = order?.type === "delivery" && order?.deliveryAddress
            ? `\n*Delivery Address:* ${order.deliveryAddress}`
            : "";
        const customerPhone = order?.user?.phone || order?.phone;
        const phoneLine = customerPhone ? `\n*Customer Phone:* ${customerPhone}\n` : "";
        const itemsText = (order?.items || [])
            .map((item, index) => `${index + 1}. ${item.name}\n   ➤ Qty: ${item.quantity} × ${currency}${item.price.toFixed(2)} = ${currency}${(item.price * item.quantity).toFixed(2)}`)
            .join("\n\n");
        const gstLine = gstPercentage > 0
            ? `\n*${order?.partner?.country === "United Arab Emirates" ? "VAT" : "GST"} (${gstPercentage}%):* ${currency}${gstAmount.toFixed(2)}`
            : "";
        const msg = `*🍽️ Order Details 🍽️*

*Order ID:* ${formattedOrderId}
${orderTypeStr}${deliveryLine}${phoneLine}
*Time:* ${nowTime}

*📋 Order Items:*
${itemsText}

*Subtotal:* ${currency}${subtotal.toFixed(2)}${gstLine}

*Total Price:* ${currency}${grandTotal.toFixed(2)}`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    const whatsappLink = buildWhatsappLink();
    const hasUpiQr = partnerPaymentInfo?.show_payment_qr && !!partnerPaymentInfo?.upi_id;

    const router = useRouter();

    return (
        <>
        {showUpiScreen && order && hasUpiQr && (
            <UpiPaymentScreen
                upiId={partnerPaymentInfo!.upi_id!}
                storeName={order.partner?.store_name || ""}
                amount={grandTotal}
                currency={order.partner?.currency || "₹"}
                orderId={order.id}
                postPaymentMessage={null}
                whatsappLink={whatsappLink || ""}
                onBack={() => setShowUpiScreen(false)}
                onClose={() => setShowUpiScreen(false)}
            />
        )}
        <div className="bg-gray-50 min-h-screen pb-16">
            {/* Top Navbar */}
            <div className="bg-white border-b sticky top-0 z-50 px-4 py-3 flex items-center gap-3 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-semibold text-lg">Order Status</h1>
            </div>

            {loading ? (
                <>
                    <OfferLoadinPage message="Loading Order.." />
                </>
            ) : (
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto bg-white rounded-lg overflow-hidden">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-bold">
                                        Order #{order?.id.slice(0, 8)}
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        {order?.createdAt && formatDate(order?.createdAt)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.className}`}
                                    >
                                        {statusDisplay.text}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h2 className="text-lg font-semibold mb-4">
                                        Order Information
                                    </h2>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-sm text-gray-500">Order Type</p>
                                            <p className="capitalize">
                                                {order?.type === "delivery" ? (order?.deliveryAddress != null || order?.delivery_location != null ? "Delivery" : "Take Away") : order?.type?.replace("_", " ")}
                                            </p>
                                        </div>
                                        {order?.type === "table_order" && order?.tableNumber && (
                                            <div>
                                                <p className="text-sm text-gray-500">Table Number</p>
                                                <p>{order?.tableNumber}</p>
                                            </div>
                                        )}
                                        {order?.type === "delivery" && (
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Delivery Address
                                                </p>
                                                <p>{order?.deliveryAddress || "N/A"}</p>
                                                {order.delivery_location &&
                                                    (order.delivery_location?.coordinates?.length ?? 0) >
                                                    0 && (
                                                        <div className="mt-2">
                                                            <a
                                                                href={`https://www.google.com/maps?q=${order.delivery_location.coordinates[1]},${order.delivery_location.coordinates[0]}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block"
                                                            >
                                                                <img
                                                                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${order.delivery_location.coordinates[0]},${order.delivery_location.coordinates[1]})/${order.delivery_location.coordinates[0]},${order.delivery_location.coordinates[1]},16/600x300?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                                                                    alt="Delivery location"
                                                                    className="w-full h-auto rounded-md border border-gray-200"
                                                                />
                                                            </a>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Click on map to view in Google Maps
                                                            </p>
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-500">Customer Phone</p>
                                            <p>{order?.user?.phone || order?.phone || "Unknown"}</p>
                                        </div>

                                        {order?.notes && (
                                            <div className="text-orange-500">
                                                <p className="text-sm opacity-70">Notes</p>
                                                <p>{order?.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold mb-4">Order Items</h2>
                                    <div className="border rounded-lg divide-y">
                                        {order?.items.map((orderItem: OrderItem) => (
                                            <div
                                                key={orderItem.id}
                                                className="p-3 flex justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium">{orderItem.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {orderItem.category?.name && (
                                                            <>{orderItem.category.name} × </>
                                                        )}
                                                        {orderItem.quantity}
                                                    </p>
                                                </div>
                                                <p className="font-medium">
                                                    {order?.partner?.currency || "₹"}
                                                    {(orderItem.price * orderItem.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        {order?.extraCharges?.map((charge, index) => (
                                            <div key={index} className="flex justify-between">
                                                <p className="text-sm text-gray-500">{charge.name}</p>
                                                <p className="text-sm">
                                                    {order?.partner?.currency || "₹"}
                                                    {charge.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        ))}

                                        <div className="flex justify-between border-t pt-2">
                                            <p className="text-sm text-gray-500">Subtotal</p>
                                            <p className="text-sm">
                                                {order?.partner?.currency || "₹"}
                                                {subtotal.toFixed(2)}
                                            </p>
                                        </div>

                                        <div className="flex justify-between">
                                            <p className="text-sm text-gray-500">
                                                {order?.partner?.country === "United Arab Emirates" ? "VAT" : "GST"} ({gstPercentage}%)
                                            </p>
                                            <p className="text-sm">
                                                {order?.partner?.currency || "₹"}
                                                {gstAmount.toFixed(2)}
                                            </p>
                                        </div>

                                        <div className="flex justify-between font-bold border-t pt-2">
                                            <p>Grand Total</p>
                                            <p>
                                                {order?.partner?.currency || "₹"}
                                                {grandTotal.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Action Buttons */}
                    {!isCompleted && (
                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                            {whatsappLink && (
                                <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Send Order to WhatsApp
                                </a>
                            )}
                            {hasUpiQr && (
                                <button
                                    onClick={() => setShowUpiScreen(true)}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Pay Now
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    );
};

export default OrderClient;
