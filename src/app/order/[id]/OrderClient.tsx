"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatDate, getDateOnly, formatOrderShortId } from "@/lib/formatDate";
import { ExtraCharge } from "@/store/posStore";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Order, OrderItem } from "@/store/orderStore";
import OfferLoadinPage from "@/components/OfferLoadinPage";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getFeatures } from "@/lib/getFeatures";
import { ArrowLeft, MessageCircle, CreditCard, Phone, Truck, Loader2, Star, Bike, Store, MapPin, Receipt, Package, User, StickyNote, ShoppingBag } from "lucide-react";
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
      delivery_agent
      partner {
        gst_percentage
        currency
        store_name
        country
        name
        username
        feature_flags
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
    const [agentLocationAgo, setAgentLocationAgo] = useState<number | null>(null);
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

    // Same ticker for the third-party delivery agent (e.g. Growjet)
    useEffect(() => {
        const updatedAt = order?.delivery_agent?.location?.lastUpdated;
        if (!updatedAt) {
            setAgentLocationAgo(null);
            return;
        }
        const update = () => {
            setAgentLocationAgo(Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [order?.delivery_agent?.location?.lastUpdated]);

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
                        delivery_agent: order?.delivery_agent ?? null,
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

    const formattedOrderId = order
        ? formatOrderShortId(order.display_id, order.id, order.createdAt)
        : "";
    const idTail = order?.id ? order.id.slice(0, 8) : "";

    const statusDisplay = getStatusDisplay(order as Order);
    const isCompleted = order?.status === "completed" || order?.status === "cancelled";
    const isPaid = !!(order as any)?.is_paid;

    // Third-party delivery agent (Growjet etc.) — show only when partner has
    // the integration enabled, the poller has populated the agent record,
    // and the order isn't already in a terminal state.
    const partnerFlags = getFeatures(order?.partner?.feature_flags ?? null);
    const agent = order?.delivery_agent ?? null;
    const agentProvider = agent?.provider;
    const showGrowjetAgent =
        !!agent &&
        agentProvider === "growjet" &&
        partnerFlags.growjet_delivery.access &&
        partnerFlags.growjet_delivery.enabled &&
        !isCompleted;
    const agentLat = agent?.location?.latitude;
    const agentLng = agent?.location?.longitude;
    const agentProviderLabel =
        agentProvider === "growjet" ? "Growjet" : (agentProvider ?? "Partner");
    const formatAgo = (sec: number): string =>
        sec < 60
            ? `${sec}s`
            : sec < 3600
                ? `${Math.floor(sec / 60)}m ${sec % 60}s`
                : `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
    const computeEtaMinutes = (
        fromLat: number,
        fromLng: number,
        toLat: number,
        toLng: number,
    ): number => {
        const lat1 = (fromLat * Math.PI) / 180;
        const lat2 = (toLat * Math.PI) / 180;
        const dLat = lat2 - lat1;
        const dLng = ((toLng - fromLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(1, Math.round((distKm / 25) * 60));
    };
    const agentEta =
        agentLat != null && agentLng != null && order?.delivery_location?.coordinates
            ? computeEtaMinutes(
                  agentLat,
                  agentLng,
                  order.delivery_location.coordinates[1],
                  order.delivery_location.coordinates[0],
              )
            : null;
    const agentInitial = (agent?.name ?? "?").trim().charAt(0).toUpperCase() || "?";

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
        <div className="bg-gray-50 min-h-screen pb-40 sm:pb-28">
            {/* Top Navbar */}
            <div className="bg-white border-b sticky top-0 z-50 px-3 sm:px-4 py-3 flex items-center gap-3 shadow-sm">
                <button
                    onClick={() => {
                        const username = (order?.partner as any)?.username;
                        if (username) {
                            router.push(`/${username}?back=true`);
                        } else {
                            router.back();
                        }
                    }}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="min-w-0">
                    <h1 className="font-semibold text-base leading-tight truncate">
                        {order ? `#${formattedOrderId}` : "Order details"}
                    </h1>
                    {idTail && (
                        <p className="text-[11px] text-gray-500 leading-tight">{idTail}</p>
                    )}
                </div>
            </div>

            {loading ? (
                <>
                    <OfferLoadinPage message="Loading Order.." />
                </>
            ) : (
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 max-w-3xl">
                    <div className="space-y-3">

                        {/* Card: Order header */}
                        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl sm:text-2xl font-bold truncate">
                                        Order #{formattedOrderId}
                                    </h1>
                                    {idTail && (
                                        <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
                                            {idTail}
                                        </p>
                                    )}
                                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                        {order?.createdAt && formatDate(order?.createdAt)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${statusDisplay.className}`}
                                    >
                                        {statusDisplay.text}
                                    </span>
                                    {isPaid && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 whitespace-nowrap">
                                            Paid
                                        </span>
                                    )}
                                </div>
                            </div>
                            {order?.status === "completed" && !order.review && !justReviewed && (
                                <button
                                    type="button"
                                    onClick={() => setReviewOpen(true)}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
                                >
                                    <Star className="h-4 w-4" />
                                    Rate your order
                                </button>
                            )}
                            {order?.review && (
                                <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-600">
                                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                                    You rated this order {order.review.rating}/5
                                </div>
                            )}
                        </div>

                        {/* Card: Restaurant */}
                        {order?.partner?.store_name && (
                            <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Store className="h-5 w-5 text-orange-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                                        Ordered from
                                    </p>
                                    <p className="font-semibold text-gray-900 truncate">
                                        {order.partner.store_name}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Live Delivery Tracking — partner's own rider */}
                        {order?.status === "dispatched" && order?.delivery_boy_id && order?.delivery_boy && (() => {
                            const boyLat = order.delivery_boy.current_lat;
                            const boyLng = order.delivery_boy.current_lng;
                            const dropCoords = order.delivery_location?.coordinates;
                            const hasLocation = boyLat != null && boyLng != null && dropCoords != null;
                            const boyEta = hasLocation
                                ? computeEtaMinutes(boyLat!, boyLng!, dropCoords![1], dropCoords![0])
                                : null;
                            const boyInitial = (order.delivery_boy.name ?? "?").trim().charAt(0).toUpperCase() || "?";
                            return (
                                <div className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 p-4 sm:p-5">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm">
                                            <Truck className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className="text-base font-bold text-gray-900">On the way</h2>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-purple-700 ring-1 ring-purple-200 whitespace-nowrap">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    Partner rider
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-0.5">
                                                {boyEta != null ? (
                                                    <>
                                                        Arriving in{" "}
                                                        <span className="font-semibold text-gray-900">
                                                            ~{boyEta} min{boyEta > 1 ? "s" : ""}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>Rider on the way…</>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {!hasLocation && (
                                        <div className="rounded-2xl bg-white p-5 shadow-sm flex items-center gap-3 mb-3">
                                            <Truck className="h-6 w-6 text-purple-400 animate-pulse flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Waiting for rider&apos;s location
                                                </p>
                                                <p className="text-xs text-gray-600 mt-0.5">
                                                    Live tracking starts once the rider shares their location.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {hasLocation && locationAgo != null && (
                                        <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm text-[11px] mb-3">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            <span className="font-medium text-gray-800">
                                                Live · {locationAgo < 60 ? `${locationAgo}s` : `${Math.floor(locationAgo / 60)}m ${locationAgo % 60}s`} ago
                                            </span>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
                                        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                                            {boyInitial}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">
                                                {order.delivery_boy.name}
                                            </p>
                                            <p className="text-xs text-gray-500">Delivery Partner</p>
                                        </div>
                                        {order.delivery_boy.phone && (
                                            <a
                                                href={`tel:${order.delivery_boy.phone}`}
                                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-full text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
                                            >
                                                <Phone className="h-4 w-4" />
                                                Call
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Third-party delivery agent (Growjet) live tracking */}
                        {showGrowjetAgent && (
                            <div className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 p-4 sm:p-5">
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                                        <Bike className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base font-bold text-gray-900">
                                                On the way
                                            </h2>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-orange-700 ring-1 ring-orange-200 whitespace-nowrap">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                via {agentProviderLabel}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-0.5">
                                            {agentEta != null ? (
                                                <>
                                                    Arriving in{" "}
                                                    <span className="font-semibold text-gray-900">
                                                        ~{agentEta} min{agentEta > 1 ? "s" : ""}
                                                    </span>
                                                </>
                                            ) : (
                                                <>Rider being assigned…</>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Map (or waiting state) */}
                                {agentLat != null && agentLng != null && order?.delivery_location?.coordinates ? (
                                    <div className="relative rounded-2xl overflow-hidden shadow-sm bg-white">
                                        <DeliveryMap
                                            deliveryLng={order.delivery_location.coordinates[0]}
                                            deliveryLat={order.delivery_location.coordinates[1]}
                                            driverLng={agentLng}
                                            driverLat={agentLat}
                                            onMapClick={() => {
                                                const url = `https://www.google.com/maps/dir/${agentLat},${agentLng}/${order.delivery_location!.coordinates[1]},${order.delivery_location!.coordinates[0]}`;
                                                window.open(url, "_blank");
                                            }}
                                        />
                                        {agentLocationAgo != null && (
                                            <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow-sm text-[11px] whitespace-nowrap">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                                <span className="font-medium text-gray-800">
                                                    Live · {formatAgo(agentLocationAgo)} ago
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl bg-white p-5 shadow-sm flex items-center gap-3">
                                        <Bike className="h-6 w-6 text-orange-400 animate-pulse flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">
                                                Waiting for rider&apos;s location
                                            </p>
                                            <p className="text-xs text-gray-600 mt-0.5">
                                                Live tracking starts when {agentProviderLabel} begins sharing the rider&apos;s position.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Rider card */}
                                <div className="mt-3 bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
                                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-base">
                                        {agentInitial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">
                                            {agent?.name || "Rider being assigned"}
                                        </p>
                                        <p className="text-xs text-gray-500">Delivery Partner</p>
                                    </div>
                                    {agent?.phone && (
                                        <a
                                            href={`tel:${agent.phone}`}
                                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-full text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
                                        >
                                            <Phone className="h-4 w-4" />
                                            Call
                                        </a>
                                    )}
                                </div>

                                {agentLat != null && agentLng != null && (
                                    <p className="text-[11px] text-gray-500 mt-2 text-center">
                                        Tap the map to open directions in Google Maps
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Card: Order Items */}
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-4 sm:p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShoppingBag className="h-4 w-4 text-gray-700" />
                                    <h2 className="text-base font-bold text-gray-900">
                                        Order summary
                                    </h2>
                                    <span className="ml-auto text-xs text-gray-500">
                                        {order?.items?.length ?? 0} item{(order?.items?.length ?? 0) === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {order?.items.map((orderItem: OrderItem) => (
                                        <div
                                            key={orderItem.id}
                                            className="py-3 flex items-start justify-between gap-3"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 leading-snug">{orderItem.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {orderItem.category?.name && (
                                                        <span className="capitalize">{orderItem.category.name} · </span>
                                                    )}
                                                    Qty {orderItem.quantity}
                                                </p>
                                            </div>
                                            <p className="font-semibold text-gray-900 whitespace-nowrap">
                                                {order?.partner?.currency || "₹"}
                                                {(orderItem.price * orderItem.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Card: Bill details */}
                        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Receipt className="h-4 w-4 text-gray-700" />
                                <h2 className="text-base font-bold text-gray-900">Bill details</h2>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-700">
                                    <span>Item total</span>
                                    <span>{order?.partner?.currency || "₹"}{foodTotal.toFixed(2)}</span>
                                </div>

                                {order?.extraCharges?.map((charge, index) => (
                                    <div key={index} className="flex justify-between text-gray-700">
                                        <span>{charge.name}</span>
                                        <span>{order?.partner?.currency || "₹"}{getExtraCharge(order?.items, charge.amount, charge.charge_type as "FLAT_FEE" | "PER_ITEM").toFixed(2)}</span>
                                    </div>
                                ))}

                                {gstPercentage > 0 && (
                                    <div className="flex justify-between text-gray-700">
                                        <span>
                                            {order?.partner?.country === "United Arab Emirates" ? "VAT" : "GST"} ({gstPercentage}%)
                                        </span>
                                        <span>{order?.partner?.currency || "₹"}{gstAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {discountSavings > 0 && (
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>
                                            Discount{discountInfo?.code ? ` (${discountInfo.code})` : ""}
                                        </span>
                                        <span>
                                            −{order?.partner?.currency || "₹"}{discountSavings.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                <div className="border-t border-dashed mt-2 pt-2 flex justify-between text-base font-bold text-gray-900">
                                    <span>To pay</span>
                                    <span>{order?.partner?.currency || "₹"}{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Card: Delivery details (delivery only) */}
                        {order?.type === "delivery" && (
                            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <MapPin className="h-4 w-4 text-gray-700" />
                                    <h2 className="text-base font-bold text-gray-900">Delivery details</h2>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                                            Delivery to
                                        </p>
                                        <p className="text-sm text-gray-900 mt-0.5">{order?.deliveryAddress || "Not provided"}</p>
                                    </div>
                                    {order.delivery_location && (order.delivery_location?.coordinates?.length ?? 0) > 0 && !showGrowjetAgent && (!((order?.status === "dispatched" || order?.status === "in_transit") && order?.delivery_boy_id && order?.delivery_boy)) && (
                                        <div className="rounded-xl overflow-hidden">
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
                                            <p className="text-[11px] text-gray-500 mt-1.5 text-center">
                                                Tap map to open in Google Maps
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Card: Customer / Order info */}
                        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <User className="h-4 w-4 text-gray-700" />
                                <h2 className="text-base font-bold text-gray-900">Order info</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                                        Order type
                                    </p>
                                    <p className="capitalize text-gray-900 mt-0.5">
                                        {order?.type === "delivery"
                                            ? (order?.deliveryAddress != null || order?.delivery_location != null ? "Delivery" : "Take away")
                                            : order?.type?.replace("_", " ")}
                                    </p>
                                </div>
                                {order?.type === "table_order" && order?.tableNumber && (
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                                            Table
                                        </p>
                                        <p className="text-gray-900 mt-0.5">{order.tableNumber}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                                        Phone
                                    </p>
                                    <p className="text-gray-900 mt-0.5">
                                        {order?.user?.phone || order?.phone || "—"}
                                    </p>
                                </div>
                            </div>
                            {order?.notes && (
                                <div className="mt-3 rounded-xl bg-orange-50 p-3 flex items-start gap-2">
                                    <StickyNote className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] uppercase tracking-wide text-orange-700 font-semibold">
                                            Notes
                                        </p>
                                        <p className="text-sm text-orange-900 mt-0.5 break-words">{order.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cashfree verification banner */}
                        {cashfreeVerifying && (
                            <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-2xl text-blue-700 font-medium text-sm shadow-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifying payment…
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* Sticky bottom action bar */}
            {!loading && !isCompleted && (whatsappLink || (!isPaid && (hasCashfree || hasUpiQr))) && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 px-3 sm:px-4 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                    <div className="container mx-auto max-w-3xl flex gap-2">
                        {whatsappLink && (
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors"
                            >
                                <MessageCircle className="w-4 h-4" />
                                WhatsApp
                            </a>
                        )}
                        {!isPaid && (hasCashfree || hasUpiQr) && (
                            <button
                                onClick={hasCashfree ? handleCashfreePayment : () => setShowUpiScreen(true)}
                                disabled={cashfreeLoading}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors disabled:opacity-60"
                            >
                                {cashfreeLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CreditCard className="w-4 h-4" />
                                )}
                                {cashfreeLoading ? "Processing…" : `Pay ${order?.partner?.currency || "₹"}${grandTotal.toFixed(2)}`}
                            </button>
                        )}
                    </div>
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
