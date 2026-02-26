"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, MessageCircle } from "lucide-react";

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
  {
    name: "BHIM",
    icon: "/bhim-icon.png",
    getUrl: ({ upiId, storeName, amount, txnId }) =>
      `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&tr=${txnId}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "Amazon Pay",
    icon: "/amazon-pay-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `amzn://apps/android?asin=com.amazon.mShop.android.shopping&pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "CRED",
    icon: "/cred-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `cred://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "WhatsApp Pay",
    icon: "/whatsapp-pay-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `whatsapp://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "PayZapp",
    icon: "/payzapp-icon.png",
    getUrl: ({ upiId, amount, txnId }) =>
      `payzapp://pay?pa=${upiId}&am=${amount.toFixed(2)}&cu=INR&tr=${txnId}`,
  },
  {
    name: "Freecharge",
    icon: "/freecharge-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `freecharge://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
  },
  {
    name: "MobiKwik",
    icon: "/mobikwik-icon.png",
    getUrl: ({ upiId, storeName, amount }) =>
      `mobikwik://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR`,
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
  onClose: () => void;
}

export const UpiPaymentScreen = ({
  upiId,
  storeName,
  amount,
  currency,
  orderId,
  postPaymentMessage,
  whatsappLink,
  onClose,
}: UpiPaymentScreenProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const txnId = `order-${orderId}-${Date.now()}`;

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
    <div className="fixed inset-0 z-[8000] bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-stone-200 shadow-sm z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-gray-900">Complete Payment</h1>
            <p className="text-sm text-gray-500">{storeName}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 py-6 gap-6">
        {/* Amount */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Total Amount</p>
          <p className="text-4xl font-bold text-gray-900">
            {currency}{amount.toFixed(2)}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Scan to Pay</p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="UPI Payment QR Code"
              className="w-52 h-52 rounded-xl border-2 border-stone-200 p-2"
            />
          ) : (
            <div className="w-52 h-52 rounded-xl border-2 border-stone-200 bg-stone-50 animate-pulse" />
          )}
          <p className="text-xs text-gray-500">Pay to: {upiId}</p>
        </div>

        {/* UPI App Buttons */}
        <div className="w-full">
          <p className="text-sm font-semibold text-gray-700 mb-3">Or pay with UPI app</p>
          <div className="grid grid-cols-5 gap-3">
            {UPI_APPS.map((app) => (
              <button
                key={app.name}
                onClick={() => handleUpiApp(app)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-stone-100 active:bg-stone-200 transition-colors"
              >
                <img
                  src={app.icon}
                  alt={app.name}
                  className="w-10 h-10 rounded-xl object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-[10px] text-gray-600 text-center leading-tight">
                  {app.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Post-payment message */}
        {postPaymentMessage && (
          <p className="text-sm text-gray-600 text-center font-medium px-2">
            {postPaymentMessage}
          </p>
        )}

        {/* WhatsApp Screenshot Button */}
        <div className="w-full">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors">
              <MessageCircle className="w-5 h-5" />
              Send Payment Screenshot to WhatsApp
            </button>
          </a>
        </div>

        {/* Back to menu */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 border border-stone-300 text-gray-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
        >
          Back to Menu
        </button>

        <p className="text-xs text-gray-400 text-center pb-4">
          Order #{orderId.slice(0, 8).toUpperCase()} placed successfully
        </p>
      </div>
    </div>
  );
};
