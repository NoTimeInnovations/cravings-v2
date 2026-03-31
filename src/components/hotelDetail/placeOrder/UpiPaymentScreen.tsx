"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, MessageCircle, Copy, Check } from "lucide-react";

interface UPIApp {
  name: string;
  icon: string;
  getUrl: (params: { upiId: string; storeName: string; amount: number; txnId: string }) => string;
}

const UPI_APPS: UPIApp[] = [
  {
    name: "Google Pay",
    icon: "/google-pay.png",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `gpay://upi/pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "PhonePe",
    icon: "/phonepay-icon.jpg",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "Paytm",
    icon: "/paytm-icon.jpg",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
];

interface UpiPaymentScreenProps {
  upiId: string;
  storeName: string;
  amount: number;
  currency: string;
  orderId: string;
  postPaymentMessage: string | null;
  whatsappLink: string;
  onBack: () => void;   // header arrow — returns to order modal
  onClose: () => void;  // "Back to Menu" — clears order and closes modal
}

export const UpiPaymentScreen = ({
  upiId,
  storeName,
  amount,
  currency,
  orderId,
  postPaymentMessage,
  whatsappLink,
  onBack,
  onClose,
}: UpiPaymentScreenProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const txnId = useRef(`order-${orderId ?? "unknown"}-${Date.now()}`).current;

  useEffect(() => {
    const upiParams = amount > 0
      ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR&tr=${txnId}&tn=${encodeURIComponent("Order Payment")}`
      : `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&cu=INR&tr=${txnId}&tn=${encodeURIComponent("Order Payment")}`;
    QRCode.toDataURL(upiParams, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [upiId, storeName, amount, txnId]);

  const handleUpiApp = (app: UPIApp) => {
    window.location.href = app.getUrl({ upiId, storeName, amount, txnId });
  };

  return (
    <div className="fixed inset-0 z-[8000] bg-black/40 flex items-center justify-center overflow-hidden">
      <div className="relative bg-white w-full h-full md:max-w-md md:h-auto md:max-h-[95vh] md:rounded-2xl flex flex-col md:shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 shadow-sm z-10 md:rounded-t-2xl shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base text-gray-900">Complete Payment</h1>
            <p className="text-xs text-gray-500">{storeName}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 py-3 gap-3 overflow-hidden">
        {/* Amount */}
        <div className="text-center">
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-3xl font-bold text-gray-900">
            {currency}{" "}{amount.toFixed(2)}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium text-gray-700">Scan to Pay</p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="UPI Payment QR Code"
              className="w-36 h-36 md:w-44 md:h-44 rounded-xl border-2 border-stone-200 p-1"
            />
          ) : (
            <div className="w-36 h-36 md:w-44 md:h-44 rounded-xl border-2 border-stone-200 bg-stone-50 animate-pulse" />
          )}
          <p className="text-xs text-gray-500">Pay to: {upiId}</p>
        </div>

        {/* UPI App Buttons */}
        <div className="w-full">
          <p className="text-xs font-semibold text-gray-700 mb-2">Or pay with UPI app</p>
          <div className="grid grid-cols-4 gap-2">
            {UPI_APPS.map((app) => (
              <button
                key={app.name}
                onClick={() => handleUpiApp(app)}
                className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-stone-100 active:bg-stone-200 transition-colors"
              >
                <img
                  src={app.icon}
                  alt={app.name}
                  className="w-9 h-9 rounded-xl object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-[10px] text-gray-600 text-center leading-tight">
                  {app.name}
                </span>
              </button>
            ))}
            {/* Copy UPI ID button */}
            <button
              onClick={handleCopyUpiId}
              className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-stone-100 active:bg-stone-200 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <span className="text-[10px] text-gray-600 text-center leading-tight">
                {copied ? "Copied!" : "Copy UPI"}
              </span>
            </button>
          </div>
        </div>

        {/* Post-payment message */}
        {postPaymentMessage && (
          <p className="text-sm text-gray-700 text-center font-semibold px-2 text-balance">
            {postPaymentMessage}
          </p>
        )}

        {/* WhatsApp Screenshot Button */}
        <div className="w-full">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <button className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors">
              <MessageCircle className="w-4 h-4 shrink-0" />
              Send Order to WhatsApp
            </button>
          </a>
        </div>

        {/* Back to menu */}
        <button
          onClick={onClose}
          className="w-full px-6 py-2.5 border border-stone-300 text-gray-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
        >
          Back to Menu
        </button>

        <p className="text-xs text-gray-400 text-center">
          Order #{orderId?.slice(0, 8).toUpperCase() ?? ""} placed successfully
        </p>
      </div>
      </div>
    </div>
  );
};
