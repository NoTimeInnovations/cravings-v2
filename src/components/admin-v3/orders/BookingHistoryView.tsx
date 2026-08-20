"use client";

import * as React from "react";
import { ArrowLeft, Bike, Copy, Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { StatusPill, V3Card } from "../ui/primitives";
import type { DispatchBooking } from "./OrderDetailView";
import { fmtTz, useCopyFlag } from "./shared";

/**
 * Every Porter / Rapido booking made for one order.
 *
 * An order rarely has just one. The dispatch sequence escalates when a provider
 * times out, a rider can cancel, and the partner can cancel and book again —
 * each of those is a separate booking with its own reference, and the order row
 * only ever remembers the latest. When a partner asks "who did you send, and
 * what happened", this is the answer; the Delivery card above can only show the
 * one that is live right now.
 */

const CARD_TITLE =
  "text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50";
const LABEL =
  "text-[10.5px] font-bold uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500";
const MUTED = "text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400";

const PROVIDER_LABEL: Record<string, string> = {
  porter: "Porter",
  rapido: "Rapido",
  uber: "Uber",
};

/**
 * The bridge's booking statuses, in partner language.
 *
 * `cancelled` is deliberately neutral rather than red: for a booking it most
 * often means the sequence moved on to the next provider, which is the system
 * working, not a failure.
 */
const STATUS_UI: Record<
  string,
  { label: string; tone: "green" | "amber" | "blue" | "outline" }
> = {
  not_started: { label: "Rider assigned", tone: "blue" },
  started: { label: "On the way", tone: "green" },
  ended: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "outline" },
  failed: { label: "Failed", tone: "amber" },
  searching: { label: "Searching", tone: "amber" },
};

const statusOf = (s: string) =>
  STATUS_UI[s] ?? { label: s.replace(/_/g, " "), tone: "outline" as const };

const byWhom: Record<string, string> = {
  partner: "by the restaurant",
  customer: "by the customer",
  operator: "by support",
};

export function BookingHistoryView({
  bookings,
  orderLabel,
  currency,
  tz,
  onBack,
}: {
  bookings: DispatchBooking[];
  /** "#12" — so the page says which order these belong to. */
  orderLabel: string;
  currency: string;
  tz?: string;
  onBack: () => void;
}) {
  const [copied, copy] = useCopyFlag();

  // Newest first. getDispatchProgress already merges and sorts across dispatches,
  // but this page must not depend on that ordering holding.
  const rows = React.useMemo(
    () => [...bookings].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [bookings],
  );

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the order"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Booking history
          </div>
          <div className={cn(MUTED, "mt-0.5 truncate")}>
            Order {orderLabel} ·{" "}
            {rows.length === 0
              ? "no bookings"
              : `${rows.length} booking${rows.length === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {rows.length === 0 ? (
          <V3Card className="px-4 py-16 text-center">
            <Bike className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" />
            <div className="mt-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              No bookings yet
            </div>
            <p className={cn(MUTED, "mx-auto mt-2 max-w-[380px]")}>
              Nothing has been booked through Porter or Rapido for this order.
            </p>
          </V3Card>
        ) : (
          rows.map((b, i) => {
            const st = statusOf(b.status);
            // Newest first, so the highest attempt number is at the top.
            const attempt = rows.length - i;
            return (
              <V3Card key={b.bookingId || `${b.crn}-${i}`} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <Bike size={15} strokeWidth={1.8} />
                  </span>
                  <span className={CARD_TITLE}>
                    {PROVIDER_LABEL[b.provider] ?? b.provider}
                  </span>
                  <StatusPill tone="neutral">Attempt {attempt}</StatusPill>
                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    {b.cancelSuspect && (
                      <StatusPill tone="amber">May still be en route</StatusPill>
                    )}
                    <StatusPill tone={st.tone}>{st.label}</StatusPill>
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-4 px-4 py-3.5">
                  <Field
                    label="Rider"
                    // assignedAt without a name is a real state: the provider
                    // accepted before it told us who. Saying "Never assigned"
                    // there would contradict the time shown beside it.
                    value={
                      b.driver?.name ||
                      (b.assignedAt ? "Name not reported" : "Never assigned")
                    }
                  />
                  {b.driver?.phone && (
                    <div className="min-w-0">
                      <div className={LABEL}>Phone</div>
                      <a
                        href={`tel:${b.driver.phone}`}
                        className="mt-1.5 block truncate text-[13px] font-medium leading-none text-zinc-950 underline-offset-2 hover:underline dark:text-zinc-50"
                      >
                        {b.driver.phone}
                      </a>
                    </div>
                  )}
                  {(b.driver?.vehicleNumber || b.driver?.vehicleModel) && (
                    <Field
                      label="Vehicle"
                      value={[b.driver.vehicleNumber, b.driver.vehicleModel]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  )}
                  {b.fareAmount != null && (
                    <Field label="Fare" value={`${currency}${b.fareAmount}`} />
                  )}
                  <Field
                    label="Booked"
                    value={b.createdAt ? fmtTz(new Date(b.createdAt).toISOString(), tz, "DD MMM, hh:mm A") : "—"}
                  />
                  <Field
                    label="Rider assigned"
                    value={
                      b.assignedAt
                        ? fmtTz(new Date(b.assignedAt).toISOString(), tz, "DD MMM, hh:mm A")
                        : "—"
                    }
                  />
                </div>

                {(b.crn || b.reallocatedFrom || b.cancelledBy || b.cancelReason) && (
                  <div className="flex flex-col gap-2.5 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    {b.crn && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={LABEL}>Reference</span>
                        <span className="min-w-0 break-all font-mono text-[12px] text-zinc-600 dark:text-zinc-300">
                          {b.crn}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(b.crn as string)}
                          title="Copy reference"
                          aria-label="Copy reference"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                          {copied ? (
                            <Check size={12} strokeWidth={2.2} />
                          ) : (
                            <Copy size={12} strokeWidth={1.9} />
                          )}
                        </button>
                      </div>
                    )}
                    {b.reallocatedFrom && (
                      <p className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                        Reallocated from{" "}
                        <span className="font-mono">{b.reallocatedFrom}</span> —
                        the provider moved this booking to a different rider.
                      </p>
                    )}
                    {(b.cancelledBy || b.cancelReason) && (
                      <p className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                        Cancelled
                        {b.cancelledBy ? ` ${byWhom[b.cancelledBy] ?? `by ${b.cancelledBy}`}` : ""}
                        {b.cancelReason ? ` — ${b.cancelReason}` : ""}
                      </p>
                    )}
                  </div>
                )}
              </V3Card>
            );
          })
        )}

        {rows.length > 0 && (
          <p className={cn(MUTED, "px-3.5 lg:px-0")}>
            Several bookings is normal: the dispatch escalates to the next
            provider when one does not answer in time, and a cancelled rider is
            rebooked automatically.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className={LABEL}>{label}</div>
      <div className="mt-1.5 truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}
