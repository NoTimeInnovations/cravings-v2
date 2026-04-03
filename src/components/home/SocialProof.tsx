"use client";

import { useEffect, useRef, useState } from "react";

interface StatsData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

function formatRevenue(value: number): { display: number; suffix: string } {
  if (value >= 100000) return { display: Math.round(value / 100000 * 10) / 10, suffix: "L+" };
  if (value >= 1000) return { display: Math.round(value / 1000), suffix: "K+" };
  return { display: value, suffix: "+" };
}

function AnimatedNumber({
  value,
  prefix,
  suffix,
  duration = 2000,
  animate,
}: {
  value: number;
  prefix: string;
  suffix: string;
  duration?: number;
  animate: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animate || hasAnimated.current) return;
    hasAnimated.current = true;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * value);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [animate, value, duration]);

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
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats/landing")
      .then((res) => res.json())
      .then((data) => {
        if (data.totalOrders) setStats(data);
      })
      .catch(() => {});
  }, []);

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

  const shouldAnimate = inView && !!stats;

  const revenue = stats ? formatRevenue(stats.totalRevenue) : { display: 0, suffix: "+" };

  const STATS_DISPLAY = [
    { label: "Orders Received", value: stats?.totalOrders ?? 0, suffix: "+", prefix: "" },
    { label: "Revenue Generated", value: revenue.display, suffix: revenue.suffix, prefix: "₹" },
    { label: "Avg Order Value", value: stats?.avgOrderValue ?? 0, suffix: "", prefix: "₹" },
  ];

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-sm text-stone-400 uppercase tracking-widest mb-10">
          Real numbers from the last 30 days
        </p>
        <div className="grid grid-cols-3 gap-8">
          {STATS_DISPLAY.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-stone-900">
                <AnimatedNumber
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  animate={shouldAnimate}
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
