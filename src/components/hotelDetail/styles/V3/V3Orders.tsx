"use client";

import React, { useEffect, useState } from "react";
import useOrderStore from "@/store/orderStore";
import { format } from "date-fns";
import { Loader2, ShoppingBag, ChevronLeft, ExternalLink, MessageCircle, CreditCard } from "lucide-react";
import { useAuthStore, Partner } from "@/store/authStore";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import Link from "next/link";
import { UpiPaymentScreen } from "@/components/hotelDetail/placeOrder/UpiPaymentScreen";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { createCashfreeOrderForPartner } from "@/app/actions/cashfree";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";

interface V3OrdersProps {
  hotelId: string;
  onClose: () => void;
}

export default function V3Orders({ hotelId, onClose }: V3OrdersProps) {
  const { userOrders, subscribeUserOrders } = useOrderStore();
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [upiOrder, setUpiOrder] = useState<(typeof userOrders)[0] | null>(null);
  const [partnerPaymentInfo, setPartnerPaymentInfo] = useState<any>(null);
  const [cashfreeLoadingOrderId, setCashfreeLoadingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (userData?.id) {
      const unsubscribe = subscribeUserOrders(() => setLoading(false));
      return () => { unsubscribe(); };
    }
  }, [userData, subscribeUserOrders]);

  useEffect(() => {
    if (!hotelId) return;
    fetchFromHasura(`query($id:uuid!){partners_by_pk(id:$id){upi_id show_payment_qr phone country_code whatsapp_numbers accept_payments_via_cashfree cashfree_merchant_id}}`, { id: hotelId })
      .then((data) => { if (data?.partners_by_pk) setPartnerPaymentInfo(data.partners_by_pk); })
      .catch(() => {});
  }, [hotelId]);

  const partnerOrders = userOrders
    .filter((order) => order.partnerId === hotelId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
      const returnUrl = `${window.location.origin}/order/${order.id}?cf_order=${cfOrderId}`;
      sessionStorage.setItem("cashfree_pending_payment", JSON.stringify({ cfOrderId, partnerId: hotelId }));
      const cfRes = await createCashfreeOrderForPartner(hotelId, cfOrderId, order.totalPrice || 0, { id: userData?.id || "guest", name: (userData as any)?.full_name || "Customer", phone: (userData as any)?.phone || "", email: (userData as any)?.email }, returnUrl);
      if (!cfRes.success) throw new Error(cfRes.error);
      const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox";
      const cashfree = await loadCashfree({ mode: cashfreeMode as any });
      cashfree.checkout({ paymentSessionId: cfRes.paymentSessionId!, redirectTarget: "_self" });
    } catch { setCashfreeLoadingOrderId(null); }
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
          <div className="ml-auto">
            <Link href="/my-orders" className="text-xs font-semibold text-orange-500">
              All Orders
            </Link>
          </div>
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
                const statusDisplay = getStatusDisplay(order);
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
                        {order.items.map((item) => (
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
                    {!isCompleted && (whatsappLink || (!isPaid && (hasCashfree || hasUpiQr))) && (
                      <div className="flex gap-2 px-4 pb-3">
                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-emerald-600 text-white rounded-xl text-xs font-bold transition active:scale-[0.98]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                        )}
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
    </>
  );
}
