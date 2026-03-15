import Link from "next/link";
import {
  ArrowRight,
  IndianRupee,
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const COMPARISON = [
  {
    label: "Commission per order",
    aggregator: "20-33%",
    direct: "1%",
  },
  {
    label: "Customer data",
    aggregator: "Platform owns it",
    direct: "100% yours",
  },
  {
    label: "Pricing freedom",
    aggregator: "Restricted",
    direct: "Full control",
  },
  {
    label: "Brand loyalty",
    aggregator: "Goes to aggregator",
    direct: "Goes to YOU",
  },
];

export default function AggregatorAlternativeSection() {
  return (
    <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
      <div className="max-w-5xl mx-auto px-6 md:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium mb-6 border border-red-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              Stop Losing 30% to Aggregators
            </span>
            <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 leading-tight mb-4">
              Why pay other delivery platforms{" "}
              <span className="text-red-600">30% commission</span> on every
              order?
            </h2>
            <p className="text-base text-stone-500 mb-6 leading-relaxed">
              Aggregators charge 20-33% commission + hidden fees, totaling up to
              45% of every order. With Menuthere, get your own ordering website
              with just 1% commission and PetPooja POS integration.
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
                <IndianRupee className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-stone-900">
                  1% Commission
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
                <Users className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-stone-900">
                  Own Customer Data
                </span>
              </div>
            </div>

            <Link
              href="/solutions/petpooja"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors group"
            >
              See how restaurants are saving lakhs monthly
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right - Comparison Card */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-stone-900 text-white text-sm">
              <div className="p-4 font-medium"></div>
              <div className="p-4 font-medium text-center border-l border-stone-700">
                Aggregators
              </div>
              <div className="p-4 font-medium text-center border-l border-stone-700">
                Menuthere
              </div>
            </div>

            {COMPARISON.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-3 text-sm ${idx < COMPARISON.length - 1 ? "border-b border-stone-100" : ""}`}
              >
                <div className="p-4 text-stone-700 font-medium">
                  {row.label}
                </div>
                <div className="p-4 text-center border-l border-stone-100 flex items-center justify-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-red-600 font-medium">
                    {row.aggregator}
                  </span>
                </div>
                <div className="p-4 text-center border-l border-stone-100 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 font-medium">
                    {row.direct}
                  </span>
                </div>
              </div>
            ))}

            <div className="p-4 bg-stone-50 text-center">
              <Link
                href="/solutions/petpooja"
                className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
              >
                See full comparison & savings calculator
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
