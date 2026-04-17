import React, { useEffect, useState } from "react";
import useOrderStore from "@/store/orderStore";
import { format } from "date-fns";
import {
  Loader2,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  CreditCard,
} from "lucide-react";
import { useAuthStore, Partner } from "@/store/authStore";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import Link from "next/link";
import { UpiPaymentScreen } from "@/components/hotelDetail/placeOrder/UpiPaymentScreen";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { createCashfreeOrderForPartner } from "@/app/actions/cashfree";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";

interface CompactOrdersProps {
  hotelId: string;
  styles: any;
}

const CompactOrders = ({ hotelId }: CompactOrdersProps) => {
  const { userOrders, subscribeUserOrders } = useOrderStore();
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [upiOrder, setUpiOrder] = useState<(typeof userOrders)[0] | null>(null);
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

  const partnerOrders = userOrders
    .filter((order) => order.partnerId === hotelId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

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

  const handleCashfreePayment = async (order: (typeof userOrders)[0]) => {
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
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    );
  }

  if (partnerOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center p-4">
        <div className="p-4 rounded-full bg-gray-100">
          <ShoppingBag size={40} className="text-gray-400" />
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
          const gstAmount = getGstAmount(foodTotal, gstPercentage);
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
                      {isPaid && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      #{order.id.slice(0, 8)} •{" "}
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
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CompactOrders;
