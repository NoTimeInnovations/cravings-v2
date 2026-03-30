"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { label: "Orders Received", value: 492, suffix: "+", prefix: "" },
  { label: "Revenue Generated", value: 98, suffix: "K+", prefix: "₹" },
  { label: "Avg Order Value", value: 201, suffix: "", prefix: "₹" },
];

function AnimatedNumber({
  value,
  prefix,
  suffix,
  duration = 2000,
  inView,
}: {
  value: number;
  prefix: string;
  suffix: string;
  duration?: number;
  inView: boolean;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * value);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value, duration]);

  const display = value % 1 !== 0 ? current.toFixed(1) : Math.floor(current).toString();

  return (
    <span className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-sm text-stone-400 uppercase tracking-widest mb-10">
          Real numbers from the last 30 days
        </p>
        <div className="grid grid-cols-3 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-stone-900">
                <AnimatedNumber
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  inView={inView}
                />
              </div>
              <p className="text-sm text-stone-500 mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
