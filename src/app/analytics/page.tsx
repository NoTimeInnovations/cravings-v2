import type { Metadata } from "next";
import { Suspense } from "react";
import Dashboard from "./_components/Dashboard";
import PasswordGate from "./_components/PasswordGate";
import { isAnalyticsAuthed } from "./actions";

export const metadata: Metadata = {
  title: "Analytics | Menuthere",
  description:
    "Live, public Menuthere network analytics — visitors, signups, orders, GMV, menu scans, top restaurants and more.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const authed = await isAnalyticsAuthed();
  if (!authed) {
    const { error } = await searchParams;
    return <PasswordGate error={error === "1"} />;
  }

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
