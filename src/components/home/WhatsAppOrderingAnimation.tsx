"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck } from "lucide-react";

/**
 * Landing-page panel for the "Order on WhatsApp" feature in MonitorSection.
 * A compact, looping WhatsApp chat: customer sends "Hi", the restaurant
 * replies with an Order Now link, then an order-received receipt lands.
 * Self-contained (HTML/CSS), remounts each cycle via the `key` trick.
 */

function ChatInner({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    [700, 1500, 2700, 4200].forEach((at, i) =>
      timers.push(setTimeout(() => setStep(i + 1), at)),
    );
    timers.push(setTimeout(onComplete, 6500));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="w-full max-w-[230px] md:max-w-[300px] overflow-hidden rounded-2xl border border-stone-200 bg-[#EAE1D9] shadow-lg">
      {/* header */}
      <div className="flex items-center gap-2 bg-[#008069] px-3 py-2 text-white">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 text-[9px] font-bold md:h-7 md:w-7 md:text-[11px]">
          SG
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-[10px] font-semibold md:text-[12px]">
            Spice Garden
          </span>
          <span className="block text-[8px] text-white/70 md:text-[10px]">
            {step === 1 ? "typing…" : "online"}
          </span>
        </span>
      </div>

      {/* messages */}
      <div
        className="space-y-1.5 px-2.5 py-3 md:py-4"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          minHeight: 168,
        }}
      >
        {/* Hi */}
        {step >= 1 && (
          <Row out>
            <span>Hi</span>
            <Tick out />
          </Row>
        )}

        {/* typing */}
        {step === 1 && (
          <Row>
            <span className="flex gap-1 px-0.5 py-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[#9aa6ac]"
                  style={{ animation: `watyping 1s ${i * 0.15}s infinite` }}
                />
              ))}
            </span>
          </Row>
        )}

        {/* welcome + Order Now */}
        {step >= 2 && (
          <Row wide>
            <span className="block leading-snug text-[#111]">
              Welcome to <b>Spice Garden</b>! 🛒 Tap below to order.
            </span>
            <Tick in />
            <span className="mt-1.5 block rounded-md border-t border-black/5 pt-1.5 text-center text-[10px] font-semibold text-[#0a7cff] md:text-[12px]">
              🔗 Order Now
            </span>
          </Row>
        )}

        {/* receipt */}
        {step >= 4 && (
          <Row wide>
            <span className="block text-[10px] font-semibold text-[#111] md:text-[12px]">
              ✅ Order #2471 received
            </span>
            <span className="mt-0.5 flex justify-between text-[9px] text-[#3b4a54] md:text-[11px]">
              <span>Butter Chicken ×1</span>
              <span className="font-semibold">₹320</span>
            </span>
            <Tick in />
          </Row>
        )}
      </div>
    </div>
  );
}

function Row({
  children,
  out,
  wide,
}: {
  children: React.ReactNode;
  out?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative ${wide ? "max-w-[86%]" : "max-w-[70%]"} rounded-lg px-2 py-1 text-[10px] shadow-sm md:text-[12px] ${
          out ? "bg-[#D9FDD3]" : "bg-white"
        } animate-[wapop_0.25s_ease-out]`}
      >
        {children}
      </div>
    </div>
  );
}

function Tick({ in: isIn, out }: { in?: boolean; out?: boolean }) {
  return (
    <span className="float-right ml-1.5 mt-0.5 inline-flex items-center gap-0.5 text-[7px] text-[#667781] md:text-[9px]">
      7:41
      {out && <CheckCheck className="h-2.5 w-2.5 text-[#34b7f1]" />}
      {isIn && <Check className="h-2.5 w-2.5 text-[#667781]" />}
    </span>
  );
}

export default function WhatsAppOrderingAnimation() {
  const [cycle, setCycle] = useState(0);
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <ChatInner key={cycle} onComplete={() => setCycle((c) => c + 1)} />
    </div>
  );
}
