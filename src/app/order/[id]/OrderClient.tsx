"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatDate, getDateOnly } from "@/lib/formatDate";
import { ExtraCharge } from "@/store/posStore";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Order, OrderItem } from "@/store/orderStore";
import OfferLoadinPage from "@/components/OfferLoadinPage";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { ArrowLeft, MessageCircle, CreditCard, Phone, Truck, Loader2, Star } from "lucide-react";
import { OrderReviewModal } from "@/components/OrderReviewModal";
import { UpiPaymentScreen } from "@/components/hotelDetail/placeOrder/UpiPaymentScreen";
import { createCashfreeOrderForPartner, verifyCashfreePayment, markOrderAsPaid } from "@/app/actions/cashfree";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";
import dynamic from "next/dynamic";

const DeliveryMap = dynamic(() => import("./DeliveryMap"), { ssr: false });

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
      is_paid
      display_id
      partner_id
      delivery_boy_id
      assigned_at
      delivery_boy {
        id
        name
        phone
        current_lat
        current_lng
        location_updated_at
      }
      partner {
        gst_percentage
        currency
        store_name
        country
        name
        username
      }
      gst_included
      extra_charges
      discounts
      phone
      user_id
      user {
        full_name
        phone
        email
      }
      order_items {
        id
        quantity
        item
      }
      reviews(limit: 1) {
        id
        rating
        comment
        created_at
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
        whatsapp_numbers?: string[] | any;
        country_code?: string;
        accept_payments_via_cashfree?: boolean;
        cashfree_merchant_id?: string;
    } | null>(null);
    const [locationAgo, setLocationAgo] = useState<number | null>(null);
    const [cashfreeLoading, setCashfreeLoading] = useState(false);
    const [cashfreeVerifying, setCashfreeVerifying] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [justReviewed, setJustReviewed] = useState(false);

    // Ticking timer for "Location updated Xs ago"
    useEffect(() => {
        const updatedAt = order?.delivery_boy?.location_updated_at;
        if (!updatedAt) {
            setLocationAgo(null);
            return;
        }
        const update = () => {
            setLocationAgo(Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [order?.delivery_boy?.location_updated_at]);

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
                        discounts: order?.discounts || [],
                        user: order?.user,
                        delivery_boy_id: order?.delivery_boy_id,
                        assigned_at: order?.assigned_at,
                        delivery_boy: order?.delivery_boy,
                        is_paid: order?.is_paid || false,
                        items: order?.order_items.map((i: any) => ({
                            id: i.item.id,
                            quantity: i.quantity,
                            name: i.item?.name || "Unknown",
                            price: i.item?.offers?.[0]?.offer_price || i.item?.price || 0,
                            category: i.menu?.category,
                        })),
                        review: order?.reviews?.[0]
                            ? {
                                  id: order.reviews[0].id,
                                  rating: order.reviews[0].rating,
                                  comment: order.reviews[0].comment,
                                  created_at: order.reviews[0].created_at,
                              }
                            : null,
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
                    country_code
                    whatsapp_numbers
                    accept_payments_via_cashfree
                    cashfree_merchant_id
                }
            }
        `, { id: order.partnerId }).then((data) => {
            if (data?.partners_by_pk) {
                setPartnerPaymentInfo(data.partners_by_pk);
            }
        }).catch(() => {});
    }, [order?.partnerId]);

    // Verify Cashfree payment on return from checkout
    useEffect(() => {
        const pendingStr = sessionStorage.getItem("cashfree_pending_payment");
        if (!pendingStr) return;

        const pending = JSON.parse(pendingStr);
        sessionStorage.removeItem("cashfree_pending_payment");

        // Clean cf_order from URL
        const url = new URL(window.location.href);
        if (url.searchParams.has("cf_order")) {
            url.searchParams.delete("cf_order");
            window.history.replaceState({}, "", url.pathname);
        }

        setCashfreeVerifying(true);
        verifyCashfreePayment(pending.partnerId, pending.cfOrderId)
            .then(async (result) => {
                if (result.success && result.paid) {
                    await markOrderAsPaid(orderId, result.cfPaymentId || undefined);
                }
                setCashfreeVerifying(false);
            })
            .catch(() => setCashfreeVerifying(false));
    }, [orderId]);

    // Use total_price directly from DB
    const grandTotal = order?.totalPrice || 0;
    const foodTotal = order?.items?.reduce(
        (sum, orderItem) => sum + orderItem.price * orderItem.quantity,
        0
    ) ?? 0;
    const gstPercentage = order?.partner?.gst_percentage || 0;
    const gstAmount = order?.gstIncluded ?? (foodTotal * gstPercentage) / 100;
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
    const discountInfo = (order as any)?.discounts?.[0];
    const discountSavings = discountInfo?.savings || 0;

    const statusDisplay = getStatusDisplay(order as Order);
    const isCompleted = order?.status === "completed" || order?.status === "cancelled";
    const isPaid = !!(order as any)?.is_paid;

    const buildWhatsappLink = () => {
        // Prefer whatsapp_number from whatsapp_numbers array
        const whatsappNumbers = partnerPaymentInfo?.whatsapp_numbers;
        let whatsappNum: string | undefined;

        // Handle different possible structures of whatsapp_numbers
        if (Array.isArray(whatsappNumbers) && whatsappNumbers.length > 0) {
            // Could be array of strings or array of objects with 'number' field
            whatsappNum = typeof whatsappNumbers[0] === 'string'
                ? whatsappNumbers[0]
                : whatsappNumbers[0]?.number;
        }

        const phoneNum = partnerPaymentInfo?.phone;
        const countryCode = partnerPaymentInfo?.country_code;

        let phone = whatsappNum || phoneNum;
        if (!phone) return null;

        // Clean the number (remove non-digits)
        phone = phone.replace(/\D/g, "");

        // If country code exists and number doesn't start with it, prepend it
        if (countryCode && !phone.startsWith(countryCode.replace(/\D/g, ""))) {
            const cleanCountryCode = countryCode.replace(/\D/g, "");
            phone = cleanCountryCode + phone;
        }

        // Add + prefix for international format
        phone = phone.startsWith('+') ? phone : `+${phone}`;

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

*Subtotal:* ${currency}${subtotal.toFixed(2)}${gstLine}${discountSavings > 0 ? `\n*Discount${discountInfo?.code ? ` (${discountInfo.code})` : ""}:* -${currency}${discountSavings.toFixed(2)}` : ""}

*Total Price:* ${currency}${grandTotal.toFixed(2)}`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    const whatsappLink = buildWhatsappLink();
    const hasUpiQr = partnerPaymentInfo?.show_payment_qr && !!partnerPaymentInfo?.upi_id;
    const hasCashfree = partnerPaymentInfo?.accept_payments_via_cashfree === true && !!partnerPaymentInfo?.cashfree_merchant_id;

    const handleCashfreePayment = async () => {
        if (!order) return;
        setCashfreeLoading(true);
        try {
            const cfOrderId = `CF_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const returnUrl = `${window.location.origin}/order/${orderId}?cf_order=${cfOrderId}`;

            sessionStorage.setItem("cashfree_pending_payment", JSON.stringify({
                cfOrderId,
                partnerId: order.partnerId,
            }));

            const cfRes = await createCashfreeOrderForPartner(
                order.partnerId,
                cfOrderId,
                grandTotal,
                {
                    id: order.userId || "guest",
                    name: order.user?.full_name || "Customer",
                    phone: order.user?.phone || order.phone || "",
                    email: order.user?.email,
                },
                returnUrl,
            );

            if (!cfRes.success) throw new Error(cfRes.error);

            const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox";
            const cashfree = await loadCashfree({ mode: cashfreeMode as "sandbox" | "production" });
            cashfree.checkout({
                paymentSessionId: cfRes.paymentSessionId!,
                redirectTarget: "_self",
            });
        } catch (error) {
            console.error("Cashfree payment error:", error);
            setCashfreeLoading(false);
        }
    };

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
                    onClick={() => {
                        const username = (order?.partner as any)?.username;
                        if (username) {
                            router.push(`/${username}?back=true`);
                        } else {
                            router.back();
                        }
                    }}
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
                                    {isPaid && (
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            Payment Complete
                                        </span>
                                    )}
                                </div>
                            </div>
                            {order?.status === "completed" && !order.review && !justReviewed && (
                                <button
                                    type="button"
                                    onClick={() => setReviewOpen(true)}
                                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                                >
                                    <Star className="h-4 w-4" />
                                    Add Review
                                </button>
                            )}
                            {order?.review && (
                                <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600">
                                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                                    You rated this order {order.review.rating}/5
                                </div>
                            )}
                        </div>

                        {/* Live Delivery Tracking */}
                        {order?.status === "dispatched" && order?.delivery_boy_id && order?.delivery_boy && (
                            <div className="p-6 border-b bg-purple-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Truck className="h-5 w-5 text-purple-600" />
                                    <h2 className="text-lg font-semibold text-purple-900">Your order is on the way!</h2>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm text-purple-800">
                                        Delivery by <span className="font-medium">{order.delivery_boy.name}</span>
                                    </p>
                                    <a
                                        href={`tel:${order.delivery_boy.phone}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                                    >
                                        <Phone className="h-4 w-4" />
                                        Call
                                    </a>
                                </div>

                                {order.delivery_boy.current_lat != null && order.delivery_boy.current_lng != null && order.delivery_location?.coordinates ? (
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-purple-600 mb-1">
                                            {locationAgo != null && (
                                                <span>
                                                    Location updated {locationAgo < 60
                                                        ? `${locationAgo}s`
                                                        : `${Math.floor(locationAgo / 60)}m ${locationAgo % 60}s`} ago
                                                </span>
                                            )}
                                            {(() => {
                                                const lat1 = order.delivery_boy.current_lat! * Math.PI / 180;
                                                const lat2 = order.delivery_location!.coordinates[1] * Math.PI / 180;
                                                const dLat = lat2 - lat1;
                                                const dLng = (order.delivery_location!.coordinates[0] - order.delivery_boy.current_lng!) * Math.PI / 180;
                                                const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) * Math.sin(dLng/2);
                                                const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                const etaMinutes = Math.max(1, Math.round((dist / 25) * 60));
                                                return (
                                                    <span className="font-medium text-purple-900">
                                                        ETA: ~{etaMinutes} min{etaMinutes > 1 ? "s" : ""}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-purple-100 rounded-md border border-purple-200">
                                        <div className="flex items-center gap-3">
                                            <div className="animate-pulse">
                                                <Truck className="h-6 w-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-purple-800">
                                                    Waiting for delivery boy&apos;s location...
                                                </p>
                                                <p className="text-xs text-purple-600 mt-0.5">
                                                    Live tracking will appear once the delivery boy shares their location
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                                            <DeliveryMap
                                                                deliveryLng={order.delivery_location.coordinates[0]}
                                                                deliveryLat={order.delivery_location.coordinates[1]}
                                                                driverLng={order.delivery_boy?.current_lng}
                                                                driverLat={order.delivery_boy?.current_lat}
                                                                onMapClick={() => {
                                                                    const url = order.delivery_boy?.current_lat != null && order.delivery_boy?.current_lng != null
                                                                        ? `https://www.google.com/maps/dir/${order.delivery_boy.current_lat},${order.delivery_boy.current_lng}/${order.delivery_location!.coordinates[1]},${order.delivery_location!.coordinates[0]}`
                                                                        : `https://www.google.com/maps?q=${order.delivery_location!.coordinates[1]},${order.delivery_location!.coordinates[0]}`;
                                                                    window.open(url, "_blank");
                                                                }}
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Tap map to open in Google Maps
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

                                        {discountSavings > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <p className="text-sm">
                                                    Discount {discountInfo?.code ? `(${discountInfo.code})` : ""}
                                                </p>
                                                <p className="text-sm">
                                                    -{order?.partner?.currency || "₹"}
                                                    {discountSavings.toFixed(2)}
                                                </p>
                                            </div>
                                        )}

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

                    {/* Cashfree verification banner */}
                    {cashfreeVerifying && (
                        <div className="flex items-center justify-center gap-2 mt-6 p-4 bg-blue-50 rounded-xl text-blue-700 font-medium text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying payment...
                        </div>
                    )}

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
                            {!isPaid && (hasCashfree || hasUpiQr) && (
                                <button
                                    onClick={hasCashfree ? handleCashfreePayment : () => setShowUpiScreen(true)}
                                    disabled={cashfreeLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
                                >
                                    {cashfreeLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CreditCard className="w-4 h-4" />
                                    )}
                                    {cashfreeLoading ? "Processing..." : "Pay Now"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            {reviewOpen && order && (
                <OrderReviewModal
                    order={order}
                    onSubmitted={() => {
                        setJustReviewed(true);
                        setReviewOpen(false);
                    }}
                    onClose={() => setReviewOpen(false)}
                />
            )}
        </div>
        </>
    );
};

export default OrderClient;
