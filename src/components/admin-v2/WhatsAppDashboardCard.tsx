"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, ExternalLink } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

type WaState = "loading" | "disconnected" | "unverified" | "verified";

/**
 * Dashboard WhatsApp surface:
 * - Not connected  → prominent "Connect your WhatsApp Business" card.
 * - Connected but Meta business verification incomplete → amber "verify now" banner.
 * - Connected + verified → renders nothing (don't clutter the dashboard).
 *
 * `onOpen` deep-links to Settings → Integrations.
 */
export default function WhatsAppDashboardCard({
  partnerId,
  onOpen,
}: {
  partnerId?: string;
  onOpen: () => void;
}) {
  const [state, setState] = useState<WaState>("loading");

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    (async () => {
      try {
        const sRes = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
        const s = await sRes.json();
        if (!s?.connected) {
          if (!cancelled) setState("disconnected");
          return;
        }
        const hRes = await fetch(`/api/whatsapp/meta/health?partnerId=${partnerId}`);
        const h = await hRes.json();
        if (cancelled) return;
        setState(h?.businessVerified && !h?.verificationIssue ? "verified" : "unverified");
      } catch {
        if (!cancelled) setState("disconnected");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  if (state === "loading" || state === "verified") return null;

  if (state === "unverified") {
    return (
      <button
        onClick={onOpen}
        className="flex w-full items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left transition hover:shadow-md dark:border-amber-900/40 dark:bg-amber-950/40"
      >
        <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-amber-900 dark:text-amber-100">
            <FaWhatsapp className="h-4 w-4 text-emerald-600" />
            WhatsApp business verification not completed
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            Your WhatsApp is connected, but Meta business verification is still
            pending — complete it now to send messages without limits.
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline underline-offset-2 dark:text-amber-100">
            Complete verification <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </button>
    );
  }

  // disconnected — prominent connect CTA
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 p-4 text-left shadow-sm transition hover:shadow-md dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-green-950/40"
    >
      <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow">
        <FaWhatsapp className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
          Connect your WhatsApp Business
        </div>
        <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-emerald-200/80">
          Take orders and send order updates on WhatsApp — set it up in a minute.
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white">
        Connect <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
