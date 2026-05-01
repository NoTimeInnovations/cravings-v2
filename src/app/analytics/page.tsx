import type { Metadata } from "next";
import { Suspense } from "react";
import Dashboard from "./_components/Dashboard";

export const metadata: Metadata = {
  title: "Analytics | Menuthere",
  description:
    "Live, public Menuthere network analytics — visitors, signups, orders, GMV, menu scans, top restaurants and more.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={null}>
          <Dashboard />
        </Suspense>
      </div>
    </div>
  );
}
