"use client";

import React, { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Loader2, ShoppingBag, ChevronLeft, ExternalLink, MessageCircle, CreditCard } from "lucide-react";
import { useAuthStore, Partner } from "@/store/authStore";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import Link from "next/link";
import { UpiPaymentScreen } from "@/components/hotelDetail/placeOrder/UpiPaymentScreen";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { userPartnerOrdersSubscription, userPartnerOrdersPageQuery } from "@/api/orders";
import { createCashfreeOrderForPartner, markOrderAsPaid, setOrderCashfreeId } from "@/app/actions/cashfree";
import { verifyCashfreePaymentSettled } from "@/lib/cashfreeVerify";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";
import CashfreeEmbedModal from "@/components/CashfreeEmbedModal";

interface V3OrdersProps {
  hotelId: string;
  onClose: () => void;
}

// Map a Hasura order row (userPartnerOrders queries) to the shape this view renders.
const mapRowToOrder = (row: any): any => ({
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
});

export default function V3Orders({ hotelId, onClose }: V3OrdersProps) {
  const { userData } = useAuthStore();
  const [partnerOrders, setPartnerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [upiOrder, setUpiOrder] = useState<any | null>(null);
  const [partnerPaymentInfo, setPartnerPaymentInfo] = useState<any>(null);
  const [cashfreeLoadingOrderId, setCashfreeLoadingOrderId] = useState<string | null>(null);
  const [showCashfreeEmbed, setShowCashfreeEmbed] = useState(false);
  const cashfreeContainerRef = useRef<HTMLDivElement | null>(null);

  // Orders for THIS restaurant only (scoped by partner_id). Fast HTTP first
  // paint, then a live subscription. Previously this loaded ALL the user's
  // orders across every restaurant and filtered client-side — wrong data + slow.
  // The partner-scoped query has no status filter, so the customer's own
  // pending_payment (payment-processing) order shows here too.
  useEffect(() => {
    const userId = userData?.id;
    if (!userId || !hotelId) return;
    let alive = true;
    let subscriptionFired = false;

    fetchFromHasura(userPartnerOrdersPageQuery, { user_id: userId, partner_id: hotelId, limit: 20, offset: 0 })
      .then((data: any) => {
        if (!alive || subscriptionFired) return;
        setPartnerOrders((data?.orders ?? []).map(mapRowToOrder));
        setLoading(false);
      })
      .catch(() => {});

    const unsubscribe = subscribeToHasura({
      query: userPartnerOrdersSubscription,
      variables: { user_id: userId, partner_id: hotelId, limit: 20 },
      onNext: (data: any) => {
        if (!alive) return;
        subscriptionFired = true;
        setPartnerOrders((data?.data?.orders ?? []).map(mapRowToOrder));
        setLoading(false);
      },
      onError: () => { if (alive) setLoading(false); },
    });

    return () => { alive = false; unsubscribe(); };
  }, [userData?.id, hotelId]);

  useEffect(() => {
    if (!hotelId) return;
    fetchFromHasura(`query($id:uuid!){partners_by_pk(id:$id){upi_id show_payment_qr phone country_code whatsapp_numbers accept_payments_via_cashfree cashfree_merchant_id store_name store_banner theme}}`, { id: hotelId })
      .then((data) => { if (data?.partners_by_pk) setPartnerPaymentInfo(data.partners_by_pk); })
      .catch(() => {});
  }, [hotelId]);

  const getWhatsAppNumber = () => {
    const nums = partnerPaymentInfo?.whatsapp_numbers;
    let num: string | undefined;
    if (Array.isArray(nums) && nums.length > 0) num = typeof nums[0] === "string" ? nums[0] : nums[0]?.number;
    let number = num || partnerPaymentInfo?.phone;
    if (!number) return null;
    number = number.replace(/\D/g, "");
    const cc = partnerPaymentInfo?.country_code;
    if (cc && !number.startsWith(cc.replace(/\D/g, ""))) number = cc.replace(/\D/g, "") + number;
    return number.startsWith("+") ? number : `+${number}`;
  };

  const hasCashfree = partnerPaymentInfo?.accept_payments_via_cashfree === true && !!partnerPaymentInfo?.cashfree_merchant_id;

  const handleCashfreePayment = async (order: any) => {
    setCashfreeLoadingOrderId(order.id);
    try {
      const cfOrderId = `CF_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const returnUrl = `${window.location.origin}/order/${order.id}?cf_order=${cfOrderId}&back=true`;
      sessionStorage.setItem("cashfree_pending_payment", JSON.stringify({ cfOrderId, partnerId: hotelId }));
      const cfRes = await createCashfreeOrderForPartner(hotelId, cfOrderId, order.totalPrice || 0, { id: userData?.id || "guest", name: (userData as any)?.full_name || "Customer", phone: (userData as any)?.phone || "", email: (userData as any)?.email }, returnUrl);
      if (!cfRes.success) throw new Error(cfRes.error);
      setOrderCashfreeId(order.id, cfOrderId).catch(() => {});

      setShowCashfreeEmbed(true);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!cashfreeContainerRef.current) throw new Error("Checkout container not ready");

      const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox";
      const cashfree = await loadCashfree({ mode: cashfreeMode as any });
      const result: any = await cashfree.checkout({
        paymentSessionId: cfRes.paymentSessionId!,
        redirectTarget: cashfreeContainerRef.current,
        appearance: {
          width: `${window.innerWidth}px`,
          height: `${Math.max(window.innerHeight - 56, 500)}px`,
        },
      } as any);

      setShowCashfreeEmbed(false);
      sessionStorage.removeItem("cashfree_pending_payment");
      if (result?.error) {
        console.error("Cashfree error:", result.error);
        return;
      }
      const verifyRes = await verifyCashfreePaymentSettled(hotelId, cfOrderId);
      if (verifyRes.success && verifyRes.paid) {
        await markOrderAsPaid(order.id, verifyRes.cfPaymentId || undefined);
      }
    } catch (err) {
      console.error("Cashfree payment error:", err);
      setShowCashfreeEmbed(false);
    } finally {
      setCashfreeLoadingOrderId(null);
    }
  };

  const animateClose = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

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
          whatsappLink=""
          onBack={() => setUpiOrder(null)}
          onClose={() => setUpiOrder(null)}
        />
      )}

      <div
        className="fixed inset-0 z-[500] bg-white overflow-hidden"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          animation: closing ? "v3OrdersOut 250ms ease-in forwards" : "v3OrdersIn 300ms ease-out forwards",
        }}
      >
        <style>{`
          @keyframes v3OrdersIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes v3OrdersOut { from { transform: translateX(0); } to { transform: translateX(100%); } }
        `}</style>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 h-14 px-3 bg-white border-b border-gray-200/60">
          <button onClick={animateClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60">
            <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">Your Orders</h1>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100dvh-56px)] px-4 py-4">
          {loading && partnerOrders.length === 0 ? (
            <div className="flex justify-center items-center h-[50vh]">
              <Loader2 className="animate-spin h-6 w-6 text-gray-300" />
            </div>
          ) : partnerOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No orders yet</h3>
              <p className="text-xs text-gray-400">Your orders will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {partnerOrders.map((order) => {
                const grandTotal = order.totalPrice || 0;
                const discounts = order.discounts || [];
                const discountSavings = (discounts[0] as any)?.savings || 0;
                const isDraft = order.status === "pending_payment";
                const statusDisplay = isDraft
                  ? { text: "Payment processing", className: "bg-amber-100 text-amber-700" }
                  : getStatusDisplay(order);
                const isCompleted = order.status === "completed" || order.status === "cancelled";
                const isPaid = !!(order as any).is_paid;
                const hasUpiQr = partnerPaymentInfo?.show_payment_qr && !!partnerPaymentInfo?.upi_id;
                const whatsappPhone = getWhatsAppNumber();
                const currency = order.partner?.currency || "₹";
                const shortId = (order as any).display_id || order.id.slice(0, 4).toUpperCase();

                const whatsappMsg = `*Order #${shortId}*\n${(order.items || []).map((i: any) => `${i.quantity}× ${i.name}`).join("\n")}\n\n*Total: ${currency}${grandTotal.toFixed(0)}*`;
                const whatsappLink = whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMsg)}` : null;

                return (
                  <div key={order.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    {/* Order header */}
                    <Link href={`/order/${order.id}`} className="block px-4 pt-4 pb-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">#{shortId}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${statusDisplay.className}`}>
                            {statusDisplay.text}
                          </span>
                          {isPaid && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Paid</span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {format(new Date(order.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">
                              {item.quantity} × {item.name}
                            </span>
                            <span className="text-xs font-bold text-gray-900">
                              {currency}{(item.price * item.quantity).toFixed(0)}
                            </span>
                          </div>
                        ))}
                        {discountSavings > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-emerald-600">
                              Discount {(discounts[0] as any)?.code ? `(${(discounts[0] as any).code})` : ""}
                            </span>
                            <span className="text-xs font-bold text-emerald-600">-{currency}{discountSavings.toFixed(0)}</span>
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="border-t border-gray-100 mt-2.5 pt-2.5 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900">Total</span>
                        <span className="text-sm font-extrabold text-gray-900">{currency}{grandTotal.toFixed(0)}</span>
                      </div>
                    </Link>

                    {/* Actions */}
                    {!isCompleted && !isPaid && (hasCashfree || hasUpiQr) && (
                      <div className="flex gap-2 px-4 pb-3">
                        {!isPaid && (hasCashfree || hasUpiQr) && (
                          <button
                            onClick={() => { if (hasCashfree) handleCashfreePayment(order); else setUpiOrder(order); }}
                            disabled={cashfreeLoadingOrderId === order.id}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-orange-500 text-white rounded-xl text-xs font-bold transition active:scale-[0.98] disabled:opacity-50"
                          >
                            {cashfreeLoadingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                            {cashfreeLoadingOrderId === order.id ? "Processing..." : "Pay Now"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CashfreeEmbedModal
        ref={cashfreeContainerRef}
        open={showCashfreeEmbed}
        onClose={() => setShowCashfreeEmbed(false)}
        accent={partnerPaymentInfo?.theme?.colors?.accent}
        banner={partnerPaymentInfo?.store_banner}
        partnerName={partnerPaymentInfo?.store_name || "Restaurant"}
      />
    </>
  );
}
