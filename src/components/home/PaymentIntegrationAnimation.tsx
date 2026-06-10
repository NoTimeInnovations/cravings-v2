"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  CreditCard,
  Landmark,
  Wallet,
  Check,
  ShieldCheck,
} from "lucide-react";

const METHODS = [
  {
    label: "UPI",
    sub: "GPay · PhonePe · Paytm",
    Icon: Smartphone,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    label: "Cards",
    sub: "Visa · Mastercard · RuPay",
    Icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    label: "Net Banking",
    sub: "All major banks",
    Icon: Landmark,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    label: "Wallets & COD",
    sub: "Pay later or on delivery",
    Icon: Wallet,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
];

function PaymentAnimationInner({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(0);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    METHODS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), 500 + i * 350));
    });

    timers.push(
      setTimeout(() => setPaid(true), 500 + METHODS.length * 350 + 400),
    );
    timers.push(setTimeout(onComplete, 6000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center w-full max-w-[230px] md:max-w-[360px] px-2 md:px-4">
      {/* Checkout card */}
      <div className="w-full bg-white rounded-xl md:rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        {/* Header: secure + amount */}
        <div className="flex items-center justify-between bg-stone-900 text-white px-3 md:px-4 py-2 md:py-3">
          <span className="flex items-center gap-1 md:gap-1.5 text-[8px] md:text-xs font-medium text-stone-300">
            <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Secure checkout
          </span>
          <span className="text-xs md:text-base font-semibold tabular-nums">
            ₹540
          </span>
        </div>

        {/* Payment methods */}
        <div className="p-2 md:p-3 space-y-1.5 md:space-y-2">
          {METHODS.map((m, i) => (
            <div
              key={m.label}
              className={`flex items-center gap-2 md:gap-3 rounded-lg border px-2 md:px-3 py-1.5 md:py-2 transition-all duration-300 ${m.bg} ${m.border} ${
                i < visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              <span
                className={`grid place-items-center w-6 h-6 md:w-8 md:h-8 rounded-md bg-white border ${m.border} ${m.color} shrink-0`}
              >
                <m.Icon className="w-3 h-3 md:w-4 md:h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] md:text-sm font-semibold text-stone-800 leading-tight">
                  {m.label}
                </span>
                <span className="block text-[7px] md:text-[10px] text-stone-400 leading-tight truncate">
                  {m.sub}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Pay button → success */}
        <div className="px-2 md:px-3 pb-2 md:pb-3">
          <div
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 md:py-2.5 text-[9px] md:text-sm font-semibold text-white transition-all duration-500 ${
              paid ? "bg-green-600" : "bg-orange-600"
            }`}
          >
            {paid ? (
              <>
                <Check className="w-3 h-3 md:w-4 md:h-4" />
                Paid — settled to your account
              </>
            ) : (
              "Pay ₹540"
            )}
          </div>
        </div>
      </div>

      {/* Settlement note */}
      <div
        className={`mt-2 md:mt-3 px-3 md:px-4 py-1 md:py-1.5 bg-green-50 border border-green-200 rounded-lg transition-all duration-500 ${
          paid ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
        }`}
      >
        <p className="text-[8px] md:text-xs font-semibold text-green-700 text-center">
          0% held · money straight to your bank
        </p>
      </div>
    </div>
  );
}

export default function PaymentIntegrationAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <PaymentAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}
