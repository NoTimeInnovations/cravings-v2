"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAuthStore } from "@/store/authStore";
import {
  WEEKDAY_LABELS,
  defaultStoreHours,
  describeDay,
  parseStoreHours,
  type HoursException,
  type StoreHours,
} from "@/lib/storeHours";

import { AdminV3Button } from "../ui/primitives";
import {
  Chip,
  EmptyBox,
  Note,
  SettingsCard,
  Toggle,
  ToggleRow,
  parseJson,
  useSectionDraft,
} from "./controls";

/**
 * The EDITOR's view of the schedule, which is not the resolver's: parseStoreHours
 * drops a disabled schedule (correctly — the storefront must then treat the shop
 * as always open), but settings has to keep those rows on screen so switching the
 * schedule off and on again does not wipe the week the partner typed.
 */
function readHours(sf: any): StoreHours | null {
  const raw = sf?.store_hours;
  if (!raw || typeof raw !== "object") return null;
  const parsed = parseStoreHours({ ...raw, enabled: true });
  if (!parsed) return null;
  return { ...parsed, enabled: raw.enabled !== false };
}

interface HoursDraft {
  hours: StoreHours | null;
}

function read(partner: any): HoursDraft {
  return { hours: readHours(parseJson(partner?.storefront_settings)) };
}

function build(d: HoursDraft, partner: any): Record<string, unknown> {
  const sf = parseJson(partner?.storefront_settings);
  return {
    storefront_settings: JSON.stringify({
      ...sf,
      // Written even when disabled so the week survives a partner toggling the
      // schedule off and back on.
      ...(d.hours ? { store_hours: d.hours } : {}),
    }),
  };
}

export type HoursTab = "status" | "weekly" | "special";

export const HOURS_TABS: { value: HoursTab; label: string }[] = [
  { value: "status", label: "Accepting orders" },
  { value: "weekly", label: "Weekly hours" },
  { value: "special", label: "Special dates" },
];

const TIME_INPUT =
  "h-9 w-[110px] shrink-0 rounded-md border border-zinc-200 bg-white px-[9px] text-[13px] leading-none tabular-nums text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-500";

export function HoursSection({ tab }: { tab: HoursTab }) {
  const { partner, draft, patch } = useSectionDraft(read, build, "Store hours saved");
  const setPartnerState = useAuthStore((s) => s.setState);
  const [savingOpen, setSavingOpen] = React.useState(false);

  const timezone = partner?.timezone || "Asia/Kolkata";
  const hours = draft.hours;

  /** The master switch writes immediately — it is the same control as the one in
   *  the header, and an operational open/close must never wait for a Save. */
  const toggleShopOpen = async (next: boolean) => {
    if (!partner || savingOpen) return;
    setSavingOpen(true);
    setPartnerState({ is_shop_open: next } as any);
    try {
      await updatePartner(partner.id, { is_shop_open: next });
      await revalidateTag(partner.id);
      toast.success(next ? "Store is now Open" : "Store is now Closed");
    } catch (e) {
      console.error("[admin-v3 settings] shop toggle failed:", e);
      setPartnerState({ is_shop_open: !next } as any);
      toast.error("Couldn't update store status");
    } finally {
      setSavingOpen(false);
    }
  };

  const setDay = (index: number, next: Partial<{ closed: boolean; from: string; to: string }>) => {
    const base = hours ?? defaultStoreHours();
    const days = base.days.map((d, i) => {
      if (i !== index) return d;
      const ranges = d.ranges.length ? [...d.ranges] : [{ from: "09:00", to: "22:00" }];
      if (next.from != null) ranges[0] = { ...ranges[0], from: next.from };
      if (next.to != null) ranges[0] = { ...ranges[0], to: next.to };
      return {
        ...d,
        closed: next.closed != null ? next.closed : d.closed,
        ranges,
      };
    });
    patch({ hours: { ...base, days } });
  };

  /* ------------------------------------------------------------- master switch */

  if (tab === "status") {
    const isOpen = partner?.is_shop_open ?? true;
    return (
      <SettingsCard>
        <div className="flex items-center gap-3 py-[11px]">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Accepting orders
            </div>
            <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              The master switch. Off shows the closed sign whatever your hours say.
            </div>
          </div>
          <Chip>{isOpen ? "Open" : "Closed"}</Chip>
          <Toggle
            checked={isOpen}
            disabled={savingOpen}
            onChange={toggleShopOpen}
            label="Accepting orders"
          />
        </div>
        <Note>This switch saves the moment you flip it — there is nothing to press.</Note>
      </SettingsCard>
    );
  }

  /* ---------------------------------------------------------------- weekly */

  if (tab === "weekly") {
    return (
      <SettingsCard>
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          Times are <span translate="no" className="notranslate">{timezone}</span>.
        </div>

        <ToggleRow
          title="Follow this schedule"
          desc="Your store opens and closes on its own. Off keeps it on the switch above."
          checked={!!hours?.enabled}
          onChange={(v) =>
            patch({
              hours: hours
                ? { ...hours, enabled: v }
                : v
                  ? defaultStoreHours()
                  : null,
            })
          }
          divider
        />

        {hours ? (
          <>
            <div>
              {hours.days.map((day, i) => {
                const open = !day.closed;
                const range = day.ranges[0] ?? { from: "09:00", to: "22:00" };
                const extra = Math.max(0, day.ranges.length - 1);
                return (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-x-2.5 gap-y-2.5 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800"
                  >
                    <Toggle
                      size="sm"
                      checked={open}
                      onChange={(v) => setDay(i, { closed: !v })}
                      label={`${WEEKDAY_LABELS[i]} open`}
                    />
                    <span className="w-[84px] shrink-0 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                      {WEEKDAY_LABELS[i]}
                    </span>
                    <input
                      type="time"
                      value={range.from}
                      disabled={!open}
                      onChange={(e) => setDay(i, { from: e.target.value })}
                      className={TIME_INPUT}
                      aria-label={`${WEEKDAY_LABELS[i]} opens at`}
                    />
                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500">to</span>
                    <input
                      type="time"
                      value={range.to}
                      disabled={!open}
                      onChange={(e) => setDay(i, { to: e.target.value })}
                      className={TIME_INPUT}
                      aria-label={`${WEEKDAY_LABELS[i]} closes at`}
                    />
                    <span className="ml-auto shrink-0 text-[12px] text-zinc-400 dark:text-zinc-500">
                      {extra > 0 ? `+${extra} more · ` : ""}
                      {describeDay(day)}
                    </span>
                  </div>
                );
              })}
            </div>
            <Note>
              A closing time earlier than the opening time runs past midnight —
              6:00 PM to 2:00 AM keeps you open into the next morning.
            </Note>
          </>
        ) : (
          <EmptyBox
            title="No schedule yet"
            hint="Switch “Follow this schedule” on to start from 9:00 AM – 10:00 PM every day."
          />
        )}
      </SettingsCard>
    );
  }

  /* -------------------------------------------------------------- exceptions */

  const exceptions: HoursException[] = hours?.exceptions ?? [];

  const setException = (index: number, next: Partial<HoursException>) => {
    if (!hours) return;
    patch({
      hours: {
        ...hours,
        exceptions: hours.exceptions.map((e, i) =>
          i === index ? { ...e, ...next } : e,
        ),
      },
    });
  };

  const addException = () => {
    const base = hours ?? defaultStoreHours();
    const today = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    patch({
      hours: {
        ...base,
        exceptions: [
          ...base.exceptions,
          {
            date: `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
            closed: true,
            ranges: [],
          },
        ],
      },
    });
  };

  return (
    <SettingsCard>
      {exceptions.length === 0 ? (
        <EmptyBox title="No special dates" hint="The weekly schedule applies every day." />
      ) : (
        <div>
          {exceptions.map((ex, i) => {
            const closed = !!ex.closed;
            const range = ex.ranges?.[0] ?? { from: "09:00", to: "22:00" };
            return (
              <div
                key={i}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-2.5 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800"
              >
                <input
                  type="date"
                  value={ex.date}
                  onChange={(e) => setException(i, { date: e.target.value })}
                  className={`${TIME_INPUT} w-[150px]`}
                  aria-label="Date"
                />
                <Toggle
                  size="sm"
                  checked={!closed}
                  onChange={(v) =>
                    setException(i, {
                      closed: !v,
                      ranges: v ? [range] : [],
                    })
                  }
                  label="Open on this date"
                />
                <span className="w-[52px] shrink-0 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                  {closed ? "Closed" : "Open"}
                </span>
                {!closed ? (
                  <>
                    <input
                      type="time"
                      value={range.from}
                      onChange={(e) =>
                        setException(i, { ranges: [{ ...range, from: e.target.value }] })
                      }
                      className={TIME_INPUT}
                      aria-label="Opens at"
                    />
                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500">to</span>
                    <input
                      type="time"
                      value={range.to}
                      onChange={(e) =>
                        setException(i, { ranges: [{ ...range, to: e.target.value }] })
                      }
                      className={TIME_INPUT}
                      aria-label="Closes at"
                    />
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    hours &&
                    patch({
                      hours: {
                        ...hours,
                        exceptions: hours.exceptions.filter((_, j) => j !== i),
                      },
                    })
                  }
                  aria-label="Remove this date"
                  className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-zinc-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <AdminV3Button
          variant="secondary"
          className="h-[34px] px-3 text-[13px]"
          onClick={addException}
        >
          <Plus className="h-3.5 w-3.5" />
          Add a date
        </AdminV3Button>
      </div>
      <Note>
        A dated exception overrides the weekly schedule for that day only — a
        holiday closure, or one-off hours.
      </Note>
    </SettingsCard>
  );
}
