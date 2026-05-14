"use client";

import { useAuthStore } from "@/store/authStore";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";

/**
 * Floats a small "Go to dashboard" pill at the very top of /<username>/home
 * but only for the logged-in partner who owns this site. Customers and
 * unauthenticated visitors see nothing.
 */
export function OwnerDashboardPill({ partnerId }: { partnerId: string }) {
  const { userData } = useAuthStore();
  if (!userData?.id || userData.id !== partnerId) return null;

  return (
    <div className="relative z-50 bg-stone-900 text-white text-sm">
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span className="truncate">
            This is your live site. Edit content and settings from the
            dashboard.
          </span>
        </div>
        <a
          href="/admin-v2"
          style={{ color: "#000", background: "#fff" }}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <span style={{ color: "#000" }}>Go to dashboard</span>
          <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "#000" }} />
        </a>
      </div>
    </div>
  );
}
