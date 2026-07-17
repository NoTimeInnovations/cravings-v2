"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";

/**
 * Countdown to a scheduled (delayed) porter auto-book. Shown in OrderDetails
 * when an order has been stamped with orders.porter_dispatch_due_at (partner
 * set a booking delay, and the order reached the auto-book trigger status).
 * The dispatch-due-porter cron books the rider at `dueAt`; this just visualises
 * the wait. Once the cron books it, due_at clears and this unmounts.
 */
export default function PorterDispatchCountdown({ dueAt }: { dueAt: string }) {
  const target = new Date(dueAt).getTime();
  // Recompute every second. Seed with a first value so SSR/first paint isn't 0.
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Number.isFinite(target) ? target - Date.now() : 0,
  );

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const tick = () => setRemainingMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target)) return null;

  const due = remainingMs <= 0;
  const totalSec = Math.max(0, Math.round(remainingMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatted = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        {due ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <Clock className="h-4 w-4 shrink-0" />
        )}
        <div>
          <p className="font-medium">
            {due ? "Booking rider now…" : "Rider auto-books in"}
          </p>
          {!due && (
            <p className="text-lg font-semibold tabular-nums leading-tight text-amber-900">
              {formatted}
            </p>
          )}
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-wide text-amber-600 shrink-0">
        Scheduled
      </span>
    </div>
  );
}
