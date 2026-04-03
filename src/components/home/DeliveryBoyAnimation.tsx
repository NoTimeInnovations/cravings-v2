"use client";

import { useEffect, useState } from "react";

const ORDERS = [
  { id: "#1042", item: "Butter Chicken", address: "MG Road, Blk 4" },
  { id: "#1043", item: "Biryani Combo", address: "JP Nagar, 2nd Phase" },
  { id: "#1044", item: "Paneer Wrap", address: "HSR Layout, Sec 3" },
];

const STATUSES = ["Assigned", "Picked up", "On the way", "Delivered"];

function DeliveryBoyAnimationInner({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [visibleOrders, setVisibleOrders] = useState(0);
  const [activeStatus, setActiveStatus] = useState(-1);
  const [showDelivered, setShowDelivered] = useState(false);
  const [pulsePin, setPulsePin] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Show orders arriving
    ORDERS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleOrders(i + 1), 400 + i * 350));
    });

    // Start pulsing location pin
    const statusStart = 400 + ORDERS.length * 350 + 300;
    timers.push(setTimeout(() => setPulsePin(true), statusStart));

    // Animate delivery status
    STATUSES.forEach((_, i) => {
      timers.push(
        setTimeout(() => setActiveStatus(i), statusStart + 200 + i * 500)
      );
    });

    // Show delivered badge
    timers.push(
      setTimeout(
        () => setShowDelivered(true),
        statusStart + 200 + STATUSES.length * 500 + 200
      )
    );

    timers.push(setTimeout(onComplete, 6500));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center w-full max-w-[220px] md:max-w-[380px] px-2 md:px-4 gap-2 md:gap-4">
      {/* Phone frame with subtle orange glow */}
      <div
        className={`w-full bg-[#fcfbf7] rounded-xl md:rounded-2xl shadow-lg border border-stone-100 overflow-hidden transition-shadow duration-700 ${
          activeStatus >= 0
            ? "shadow-[0_0_20px_rgba(234,88,12,0.12)]"
            : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 md:gap-2.5 px-2.5 md:px-4 py-1.5 md:py-3 bg-stone-900">
          <div className="w-4 h-4 md:w-6 md:h-6 rounded-md bg-orange-600 flex items-center justify-center animate-[subtlePulse_3s_ease-in-out_infinite]">
            <svg
              className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l4-2 4 2zm6-6v8a1 1 0 01-1 1h-4"
              />
            </svg>
          </div>
          <span className="text-[9px] md:text-xs font-semibold text-white flex-1">
            Delivery App
          </span>
          {/* Live location indicator with ring pulse */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <div
                className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 ${pulsePin ? "animate-pulse" : ""}`}
              />
              {pulsePin && (
                <div className="absolute inset-0 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 animate-ping opacity-75" />
              )}
            </div>
            <span className="text-[7px] md:text-[10px] text-green-400 font-medium">
              Live
            </span>
          </div>
        </div>

        {/* Orders list */}
        <div className="p-2 md:p-4 flex flex-col gap-1 md:gap-2">
          {ORDERS.map((order, i) => (
            <div
              key={order.id}
              className={`flex items-center gap-1.5 md:gap-3 p-1.5 md:p-2.5 rounded-lg border transition-all duration-500 ${
                i < visibleOrders
                  ? "opacity-100 translate-x-0 scale-100"
                  : "opacity-0 -translate-x-4 scale-95"
              } ${
                i === 0 && activeStatus >= 0
                  ? "bg-orange-50 border-orange-200 shadow-[0_0_8px_rgba(234,88,12,0.08)]"
                  : "bg-stone-50 border-stone-100"
              }`}
            >
              <div
                className={`w-6 h-6 md:w-9 md:h-9 rounded-md flex items-center justify-center text-[8px] md:text-[11px] font-bold flex-shrink-0 transition-all duration-500 ${
                  i === 0 && activeStatus >= 0
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-stone-200 text-stone-600"
                }`}
              >
                {order.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] md:text-[11px] font-medium text-stone-900 truncate">
                  {order.item}
                </p>
                <p className="text-[7px] md:text-[10px] text-stone-400 truncate">
                  {order.address}
                </p>
              </div>
              {i === 0 && activeStatus === STATUSES.length - 1 && (
                <svg
                  className="w-2.5 h-2.5 md:w-4 md:h-4 text-green-500 flex-shrink-0 animate-[bounceIn_0.4s_ease-out]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status tracker */}
      <div className="w-full flex items-center justify-between px-1 md:px-2">
        {STATUSES.map((status, i) => (
          <div key={status} className="flex items-center gap-0.5 md:gap-1">
            <div className="relative">
              <div
                className={`w-3.5 h-3.5 md:w-5 md:h-5 rounded-full flex items-center justify-center transition-all duration-400 ${
                  i <= activeStatus
                    ? i === STATUSES.length - 1 && i <= activeStatus
                      ? "bg-green-500 scale-100"
                      : "bg-orange-500 scale-100"
                    : "bg-stone-200 scale-90"
                }`}
              >
                {i <= activeStatus ? (
                  <svg
                    className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-stone-400" />
                )}
              </div>
              {/* Subtle ring animation on active step */}
              {i === activeStatus && i < STATUSES.length - 1 && (
                <div className="absolute inset-0 w-3.5 h-3.5 md:w-5 md:h-5 rounded-full border-2 border-orange-400 animate-ping opacity-30" />
              )}
            </div>
            <span
              className={`text-[6px] md:text-[9px] font-medium transition-colors duration-300 ${
                i <= activeStatus
                  ? i === STATUSES.length - 1
                    ? "text-green-700"
                    : "text-orange-700"
                  : "text-stone-400"
              }`}
            >
              {status}
            </span>
            {i < STATUSES.length - 1 && (
              <div
                className={`w-2 md:w-4 h-px mx-0.5 transition-all duration-500 ${
                  i < activeStatus ? "bg-orange-400" : "bg-stone-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Delivered badge */}
      <div
        className={`px-3 md:px-5 py-1.5 md:py-2.5 bg-green-50 border border-green-200 rounded-lg md:rounded-xl transition-all duration-500 ${
          showDelivered
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-95"
        }`}
      >
        <p className="text-[9px] md:text-sm font-semibold text-green-700 text-center">
          Live tracking & auto-assignment
        </p>
      </div>
    </div>
  );
}

export default function DeliveryBoyAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <style jsx>{`
        @keyframes subtlePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
          50% { box-shadow: 0 0 6px 2px rgba(234, 88, 12, 0.15); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <DeliveryBoyAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}
