"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { Section } from "./section";

interface StatsData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

/** Module scope, so it returns the dictionary KEY for the unit and lets the
 *  component resolve it — a hook cannot be called out here. */
function formatRevenue(value: number): {
  display: number;
  suffixKey: "statSuffixLakh" | "statSuffixThousand" | null;
} {
  if (value >= 100000) return { display: Math.round(value / 100000 * 10) / 10, suffixKey: "statSuffixLakh" };
  if (value >= 1000) return { display: Math.round(value / 1000), suffixKey: "statSuffixThousand" };
  return { display: value, suffixKey: null };
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
  const { t } = useT();
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

  const revenue = stats ? formatRevenue(stats.totalRevenue) : { display: 0, suffixKey: null };
  const revenueSuffix = revenue.suffixKey ? t.landing[revenue.suffixKey] : "+";

  const STATS_DISPLAY = [
    { label: t.landing.statOrdersLabel, value: stats?.totalOrders ?? 0, suffix: "+", prefix: "" },
    { label: t.landing.statRevenueLabel, value: revenue.display, suffix: revenueSuffix, prefix: "₹" },
    { label: t.landing.statAvgOrderValueLabel, value: stats?.avgOrderValue ?? 0, suffix: "", prefix: "₹" },
  ];

  return (
    <Section className="bg-white">
      <div ref={ref}>
        <p className="text-center text-sm text-stone-400 uppercase tracking-widest mb-10">
          {t.landing.socialProofEyebrow}
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
    </Section>
  );
}
