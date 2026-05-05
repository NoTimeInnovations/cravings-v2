import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { formatOrderShortId } from "@/lib/formatDate";
import {
  Loader2,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  CreditCard,
  Star,
} from "lucide-react";
import { OrderReviewModal } from "@/components/OrderReviewModal";
import type { Order as UserOrder } from "@/store/orderStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import Link from "next/link";
import { UpiPaymentScreen } from "@/components/hotelDetail/placeOrder/UpiPaymentScreen";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { userPartnerOrdersSubscription, userPartnerOrdersPageQuery } from "@/api/orders";
import { createCashfreeOrderForPartner } from "@/app/actions/cashfree";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";

interface CompactOrdersProps {
  hotelId: string;
  styles: any;
}

const PAGE_SIZE = 10;

// Maps the GraphQL row shape into the existing UserOrder shape the rest of
// the file already renders against. Trimmed: no delivery_boy, no
// delivery_location, no status_history (none of those are read here).
const mapRowToOrder = (row: any): UserOrder => ({
  id: row.id,
  totalPrice: row.total_price,
  createdAt: row.created_at,
  status: row.status,
  display_id: row.display_id,
  partnerId: row.partner_id,
  partner: row.partner,
  gstIncluded: row.gst_included,
  extraCharges: row.extra_charges || [],
  discounts: row.discounts || [],
  is_paid: row.is_paid || false,
  items: (row.order_items || []).map((i: any) => ({
    id: i.item?.id,
    quantity: i.quantity,
    name: i.item?.name || "Unknown",
    price: i.item?.offers?.[0]?.offer_price || i.item?.price || 0,
    category: i.item?.category,
    is_freebie: i.item?.is_freebie || false,
  })),
  review: row.reviews?.[0]
    ? {
        id: row.reviews[0].id,
        rating: row.reviews[0].rating,
        comment: row.reviews[0].comment,
        created_at: row.reviews[0].created_at,
      }
    : null,
} as UserOrder);

const CompactOrders = ({ hotelId }: CompactOrdersProps) => {
  const { userData } = useAuthStore();
  const userId = userData?.id;

  // Subscription holds the most recent PAGE_SIZE orders, live. Older pages
  // are fetched one-shot below and don't churn on rider GPS updates.
  const [recent, setRecent] = useState<UserOrder[]>([]);
  const [older, setOlder] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [upiOrder, setUpiOrder] = useState<UserOrder | null>(null);
  const [partnerPaymentInfo, setPartnerPaymentInfo] = useState<{
    upi_id?: string;
    show_payment_qr?: boolean;
    phone?: string;
    whatsapp_numbers?: string[] | any;
    country_code?: string;
    accept_payments_via_cashfree?: boolean;
    cashfree_merchant_id?: string;
  } | null>(null);
  const [cashfreeLoadingOrderId, setCashfreeLoadingOrderId] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<UserOrder | null>(null);
  const [justReviewedIds, setJustReviewedIds] = useState<Set<string>>(new Set());

  // First page: race HTTP fetch + WS subscription. HTTP wins on cold start
  // (no WS handshake needed) so the user sees their orders fast; subscription
  // catches up and takes over for live updates.
  useEffect(() => {
    if (!userId || !hotelId) return;
    let alive = true;
    let subscriptionFired = false;

    // (1) Fast HTTP first paint — typically 200-500ms vs ~1-2s for WS cold start
    fetchFromHasura(userPartnerOrdersPageQuery, {
      user_id: userId,
      partner_id: hotelId,
      limit: PAGE_SIZE,
      offset: 0,
    })
      .then((data: any) => {
        if (!alive || subscriptionFired) return;
        const rows = data?.orders ?? [];
        setRecent(rows.map(mapRowToOrder));
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("CompactOrders initial fetch error:", err);
      });

    // (2) Real-time subscription — overrides HTTP results once WS connects
    const unsubscribe = subscribeToHasura({
      query: userPartnerOrdersSubscription,
      variables: { user_id: userId, partner_id: hotelId, limit: PAGE_SIZE },
      onNext: (data: any) => {
        if (!alive) return;
        const rows = data?.data?.orders ?? [];
        subscriptionFired = true;
        setRecent(rows.map(mapRowToOrder));
        setLoading(false);
      },
      onError: (err: any) => {
        console.error("CompactOrders subscription error:", err);
        if (alive) setLoading(false);
      },
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [userId, hotelId]);

  // Reset older pages when user/hotel changes
  useEffect(() => {
    setOlder([]);
    setHasMore(true);
  }, [userId, hotelId]);

  const loadMore = useCallback(async () => {
    if (!userId || !hotelId || loadingMore || !hasMore) return;
    // Only start paginating once the first page is in
    if (recent.length === 0) return;
    setLoadingMore(true);
    try {
      const offset = recent.length + older.length;
      const data = await fetchFromHasura(userPartnerOrdersPageQuery, {
        user_id: userId,
        partner_id: hotelId,
        limit: PAGE_SIZE,
        offset,
      });
      const rows = data?.orders ?? [];
      const newOrders = rows.map(mapRowToOrder);
      if (newOrders.length < PAGE_SIZE) setHasMore(false);
      setOlder((prev) => [...prev, ...newOrders]);
    } catch (err) {
      console.error("CompactOrders loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, hotelId, loadingMore, hasMore, recent.length, older.length]);

  // Combined list, recent always wins on dedupe so live updates trump cached pages
  const partnerOrders = useMemo(() => {
    const recentIds = new Set(recent.map((o) => o.id));
    const olderFiltered = older.filter((o) => !recentIds.has(o.id));
    return [...recent, ...olderFiltered];
  }, [recent, older]);

  // IntersectionObserver-based infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (!hotelId) return;
    fetchFromHasura(
      `
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
        `,
      { id: hotelId },
    )
      .then((data) => {
        if (data?.partners_by_pk) {
          setPartnerPaymentInfo(data.partners_by_pk);
        }
      })
      .catch(() => {});
  }, [hotelId]);

  const getWhatsAppNumber = () => {
    const whatsappNumbers = partnerPaymentInfo?.whatsapp_numbers;
    let whatsappNum: string | undefined;

    if (Array.isArray(whatsappNumbers) && whatsappNumbers.length > 0) {
      whatsappNum =
        typeof whatsappNumbers[0] === "string"
          ? whatsappNumbers[0]
          : whatsappNumbers[0]?.number;
    }

    const phoneNum = partnerPaymentInfo?.phone;
    const countryCode = partnerPaymentInfo?.country_code;

    let number = whatsappNum || phoneNum;
    if (!number) return null;

    number = number.replace(/\D/g, "");

    if (countryCode && !number.startsWith(countryCode.replace(/\D/g, ""))) {
      const cleanCountryCode = countryCode.replace(/\D/g, "");
      number = cleanCountryCode + number;
    }

    return number.startsWith("+") ? number : `+${number}`;
  };

  const hasCashfree = partnerPaymentInfo?.accept_payments_via_cashfree === true && !!partnerPaymentInfo?.cashfree_merchant_id;

  const handleCashfreePayment = async (order: UserOrder) => {
    setCashfreeLoadingOrderId(order.id);
    try {
      const cfOrderId = `CF_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const returnUrl = `${window.location.origin}/order/${order.id}?cf_order=${cfOrderId}`;

      sessionStorage.setItem("cashfree_pending_payment", JSON.stringify({
        cfOrderId,
        partnerId: hotelId,
      }));

      const cfRes = await createCashfreeOrderForPartner(
        hotelId,
        cfOrderId,
        order.totalPrice || 0,
        {
          id: userData?.id || "guest",
          name: (userData as any)?.full_name || "Customer",
          phone: (userData as any)?.phone || "",
          email: (userData as any)?.email,
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
      setCashfreeLoadingOrderId(null);
    }
  };

  if (loading && partnerOrders.length === 0) {
    return (
      <div className="flex flex-col gap-3 pt-10 p-4 pb-24 min-h-screen bg-white">
        <div className="flex justify-between items-center mb-2">
          <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl p-5 shadow-sm bg-white border border-gray-200 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="h-5 w-3/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-2/5 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && partnerOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center p-4">
        <div className="p-4 rounded-full bg-gray-100">
          <ShoppingBag size={40} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No orders yet</h3>
        <p className="text-sm text-gray-500">
          You haven&apos;t placed any orders with this partner yet.
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
          amount={upiOrder.totalPrice || 0}
          currency={upiOrder.partner?.currency || "₹"}
          orderId={upiOrder.id}
          postPaymentMessage={null}
          whatsappLink={(() => {
            const phone = getWhatsAppNumber();
            if (!phone) return "";
            const cur = upiOrder.partner?.currency || "₹";
            const total = upiOrder.totalPrice || 0;
            const sid =
              (upiOrder as any).display_id ||
              upiOrder.id.slice(0, 4).toUpperCase();
            const itemsText = (upiOrder.items || [])
              .map(
                (item: any, idx: number) =>
                  `${idx + 1}. ${item.name}\n   ➤ Qty: ${item.quantity} × ${cur}${item.price.toFixed(2)} = ${cur}${(item.price * item.quantity).toFixed(2)}`,
              )
              .join("\n\n");
            const msg = `*🍽️ Order Details 🍽️*\n\n*Order ID:* ${sid}\n\n*📋 Order Items:*\n${itemsText}\n\n*Total Price:* ${cur}${total.toFixed(2)}`;
            return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
          })()}
          onBack={() => setUpiOrder(null)}
          onClose={() => setUpiOrder(null)}
        />
      )}
      <div className="flex flex-col gap-4 pt-10 p-4 pb-24 min-h-screen bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Your Orders</h2>
          <a
            href="/my-orders"
            className="text-sm font-medium underline text-orange-500"
          >
            All Orders
          </a>
        </div>

        {partnerOrders.map((order) => {
          const grandTotal = order.totalPrice || 0;
          const discounts = order.discounts || [];
          const discountSavings = (discounts[0] as any)?.savings || 0;
          const gstPercentage = (order.partner as Partner)?.gst_percentage || 0;
          const foodTotal = (order.items || []).reduce(
            (s: number, i: any) => s + i.price * i.quantity,
            0,
          );
          const gstAmount = (order as any).gstIncluded ?? (foodTotal * gstPercentage) / 100;
          const extraCharges = order.extraCharges || [];
          const isUAE =
            (order.partner as Partner)?.country === "United Arab Emirates";
          const statusDisplay = getStatusDisplay(order);
          const isCompleted =
            order.status === "completed" || order.status === "cancelled";
          const isPaid = !!(order as any).is_paid;
          const hasUpiQr =
            partnerPaymentInfo?.show_payment_qr && !!partnerPaymentInfo?.upi_id;
          const whatsappPhone = getWhatsAppNumber();
          const currency = order.partner?.currency || "₹";
          const shortId =
            (order as any).display_id || order.id.slice(0, 4).toUpperCase();
          const itemsText = (order.items || [])
            .map(
              (item: any, index: number) =>
                `${index + 1}. ${item.name}\n   ➤ Qty: ${item.quantity} × ${currency}${item.price.toFixed(2)} = ${currency}${(item.price * item.quantity).toFixed(2)}`,
            )
            .join("\n\n");
          const whatsappMsg = `*🍽️ Order Details 🍽️*\n\n*Order ID:* ${shortId}\n\n*📋 Order Items:*\n${itemsText}\n\n*Total Price:* ${currency}${grandTotal.toFixed(2)}`;
          const whatsappLink = whatsappPhone
            ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMsg)}`
            : null;

          return (
            <div
              key={order.id}
              className="rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative bg-white border border-gray-200"
            >
              <Link href={`/order/${order.id}`} className="block">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-lg text-gray-900">
                        #{formatOrderShortId((order as any).display_id, order.id, order.createdAt)}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusDisplay.className}`}
                      >
                        {statusDisplay.text}
                      </span>
                      {isPaid && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono leading-tight">
                      {order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {order.partner?.store_name} •{" "}
                      {format(new Date(order.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="p-2 rounded-full transition-colors bg-orange-50 text-orange-500">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity} × {item.name}
                      </span>
                      <span className="font-medium text-gray-900">
                        {order.partner?.currency || "₹"}
                        {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {extraCharges.map((charge: any, idx: number) => {
                    const chargeAmount = getExtraCharge(
                      order.items || [],
                      charge.amount,
                      charge.charge_type,
                    );
                    return chargeAmount > 0 ? (
                      <div
                        key={idx}
                        className="flex justify-between text-sm text-gray-500"
                      >
                        <span>{charge.name}</span>
                        <span>
                          {currency}
                          {chargeAmount.toFixed(2)}
                        </span>
                      </div>
                    ) : null;
                  })}
                  {gstAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>
                        {isUAE ? "VAT" : "GST"} ({gstPercentage}%)
                      </span>
                      <span>
                        {currency}
                        {gstAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {discountSavings > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        Discount{" "}
                        {(discounts[0] as any)?.code
                          ? `(${(discounts[0] as any).code})`
                          : ""}
                      </span>
                      <span className="font-medium">
                        -{currency}
                        {discountSavings.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3 flex justify-between items-center font-bold text-gray-900">
                  <span>Total</span>
                  <span>
                    {order.partner?.currency || "₹"}
                    {grandTotal.toFixed(2)}
                  </span>
                </div>
              </Link>

              {!isCompleted && (whatsappLink || (!isPaid && (hasCashfree || hasUpiQr))) && (
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
                  {!isPaid && (hasCashfree || hasUpiQr) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasCashfree) {
                          handleCashfreePayment(order);
                        } else {
                          setUpiOrder(order);
                        }
                      }}
                      disabled={cashfreeLoadingOrderId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg font-medium text-xs transition-colors disabled:opacity-50"
                    >
                      {cashfreeLoadingOrderId === order.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5" />
                      )}
                      {cashfreeLoadingOrderId === order.id ? "Processing..." : "Pay Now"}
                    </button>
                  )}
                </div>
              )}
              {order.status === "completed" && !order.review && !justReviewedIds.has(order.id) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReviewOrder(order);
                  }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg font-medium text-xs hover:bg-orange-600 transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                  Add Review
                </button>
              )}
            </div>
          );
        })}

        {/* Infinite-scroll sentinel + status */}
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {loadingMore ? (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading more orders…
            </span>
          ) : !hasMore && partnerOrders.length > 0 ? (
            <span className="text-xs text-gray-400">You&apos;re all caught up</span>
          ) : null}
        </div>
      </div>
      {reviewOrder && (
        <OrderReviewModal
          key={reviewOrder.id}
          order={reviewOrder}
          onSubmitted={() => {
            setJustReviewedIds((prev) => new Set(prev).add(reviewOrder.id));
            setReviewOrder(null);
          }}
          onClose={() => setReviewOrder(null)}
        />
      )}
    </>
  );
};

export default CompactOrders;
