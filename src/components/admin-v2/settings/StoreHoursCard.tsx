"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Copy, Plus, Trash2, X } from "lucide-react";
import {
  WEEKDAY_LABELS,
  defaultStoreHours,
  describeDay,
  describeNextOpen,
  formatTime12h,
  isStoreOpen,
  localNow,
  parseStoreHours,
  type HoursException,
  type StoreHours,
} from "@/lib/storeHours";

/**
 * WORKING HOURS editor — the weekly schedule plus dated exceptions that decide
 * whether the shop shows as open.
 *
 * Two things it deliberately does:
 *  - shows the LIVE verdict at the top, computed by the same resolver the
 *    storefront uses. A schedule editor that cannot tell you whether you are open
 *    right now is a schedule editor people misconfigure.
 *  - keeps the store's own timezone in the frame. The partner may well be editing
 *    this from a different one, and "9 PM" has to mean 9 PM at the shop.
 */

/** A blank day the switch can turn on without the partner typing times first. */
const NEW_RANGE = { from: "09:00", to: "22:00" };

export function StoreHoursCard({
  value,
  onChange,
  timezone,
}: {
  /** The raw stored shape (may be null/undefined/legacy garbage). */
  value: StoreHours | null;
  onChange: (next: StoreHours | null) => void;
  timezone: string;
}) {
  // The editor always has a full 7-day shape to bind to, even before the partner
  // enables anything — otherwise every row needs a null check.
  const hours: StoreHours = value ?? { ...defaultStoreHours(), enabled: false };
  const enabled = !!value?.enabled;

  // The live verdict comes from the RESOLVED schedule (what would actually be
  // applied), not the rows on screen, so a half-typed range never claims the shop
  // is open when the storefront would say otherwise.
  const status = useMemo(() => {
    const applied = enabled ? parseStoreHours(hours) : null;
    const state = isStoreOpen(applied, timezone);
    const today = localNow(timezone).date;
    return { state, next: describeNextOpen(state, today), configured: !!applied };
  }, [hours, enabled, timezone]);

  const patch = (mut: (draft: StoreHours) => void) => {
    const draft: StoreHours = {
      enabled: true,
      days: hours.days.map((d) => ({ closed: d.closed, ranges: d.ranges.map((r) => ({ ...r })) })),
      exceptions: hours.exceptions.map((e) => ({ ...e, ranges: e.ranges?.map((r) => ({ ...r })) })),
    };
    mut(draft);
    onChange(draft);
  };

  const setDayOpen = (i: number, open: boolean) =>
    patch((d) => {
      d.days[i].closed = !open;
      if (open && d.days[i].ranges.length === 0) d.days[i].ranges = [{ ...NEW_RANGE }];
    });

  const setRange = (i: number, ri: number, key: "from" | "to", v: string) =>
    patch((d) => {
      d.days[i].ranges[ri][key] = v;
    });

  const addRange = (i: number) =>
    patch((d) => {
      const last = d.days[i].ranges[d.days[i].ranges.length - 1];
      d.days[i].ranges.push(last ? { from: last.to, to: "23:00" } : { ...NEW_RANGE });
    });

  const removeRange = (i: number, ri: number) =>
    patch((d) => {
      d.days[i].ranges.splice(ri, 1);
      // A day with no ranges left is shut — say so on the row rather than leaving
      // a switch that reads "open" over nothing.
      if (d.days[i].ranges.length === 0) d.days[i].closed = true;
    });

  /** Copy one day's hours across the whole week — the common case is identical
   *  hours every day, and typing them seven times invites a typo on day five. */
  const copyToAll = (i: number) =>
    patch((d) => {
      const src = d.days[i];
      d.days = d.days.map(() => ({ closed: src.closed, ranges: src.ranges.map((r) => ({ ...r })) }));
    });

  const addException = () =>
    patch((d) => {
      const today = localNow(timezone).date;
      d.exceptions.push({ date: today, closed: true });
    });

  const setException = (i: number, next: Partial<HoursException>) =>
    patch((d) => {
      d.exceptions[i] = { ...d.exceptions[i], ...next };
    });

  const removeException = (i: number) =>
    patch((d) => {
      d.exceptions.splice(i, 1);
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Working hours
            </CardTitle>
            <CardDescription>
              Your store opens and closes on this schedule automatically. Outside it,
              customers see the closed sign and cannot order.
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(on) =>
              // Switching off keeps the rows so they are still there when it goes
              // back on — the storefront reads `enabled` and ignores the rest.
              onChange(on ? { ...hours, enabled: true } : value ? { ...value, enabled: false } : null)
            }
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-5">
          {/* The live verdict, from the same resolver the storefront uses. */}
          <div
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm ${
              status.state.open
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status.state.open ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="font-medium">
              {status.state.open ? "Open right now" : "Closed right now"}
            </span>
            <span className="text-xs opacity-80">
              {status.state.open
                ? status.state.closesAt
                  ? `· closes at ${formatTime12h(status.state.closesAt)}`
                  : ""
                : status.next
                  ? // Lower-case the leading word only — toLowerCase() on the whole
                    // sentence turns "9:00 AM" into "9:00 am".
                    `· ${status.next.charAt(0).toLowerCase()}${status.next.slice(1)}`
                  : "· nothing scheduled in the next two weeks"}
            </span>
            <span className="ml-auto text-xs opacity-70">Times are {timezone}</span>
          </div>

          {/* ── Weekly schedule ── */}
          <div className="overflow-hidden rounded-lg border">
            {hours.days.map((day, i) => {
              const open = !day.closed && day.ranges.length > 0;
              return (
                <div
                  key={i}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 ${i > 0 ? "border-t" : ""}`}
                >
                  <div className="flex w-[132px] shrink-0 items-center gap-2">
                    <Switch checked={open} onCheckedChange={(v) => setDayOpen(i, v)} />
                    <span className="text-sm font-medium">{WEEKDAY_LABELS[i]}</span>
                  </div>

                  {!open ? (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  ) : (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {day.ranges.map((r, ri) => (
                        <div key={ri} className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            aria-label={`${WEEKDAY_LABELS[i]} opening time`}
                            className="h-8 w-[112px]"
                            value={r.from}
                            onChange={(e) => setRange(i, ri, "from", e.target.value)}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            aria-label={`${WEEKDAY_LABELS[i]} closing time`}
                            className="h-8 w-[112px]"
                            value={r.to}
                            onChange={(e) => setRange(i, ri, "to", e.target.value)}
                          />
                          {day.ranges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRange(i, ri)}
                              aria-label="Remove this time range"
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addRange(i)}
                        title="Add a second stretch, e.g. lunch and dinner"
                        className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:border-orange-300 hover:text-orange-700"
                      >
                        <Plus className="h-3 w-3" />
                        Split
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => copyToAll(i)}
                    title={`Apply ${WEEKDAY_LABELS[i]}'s hours to every day`}
                    className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                    Apply to all
                  </button>
                </div>
              );
            })}
          </div>
          {/* Closing at or before opening is how you say "through midnight" here,
              so it needs to be stated — otherwise it reads as an input error. */}
          <p className="text-xs text-muted-foreground">
            A closing time earlier than the opening time runs past midnight — 6:00 PM
            – 2:00 AM keeps you open into the next morning.
          </p>

          {/* ── Dated exceptions ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm">
                <CalendarDays className="h-3.5 w-3.5 text-orange-600" />
                Holidays &amp; special dates
              </Label>
              <button
                type="button"
                onClick={addException}
                className="inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-orange-300 hover:text-orange-700"
              >
                <Plus className="h-3 w-3" />
                Add date
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              A date here overrides the week above — shut for a holiday, or open on
              different hours just for that day.
            </p>

            {hours.exceptions.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                No special dates. The weekly schedule applies every day.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                {hours.exceptions.map((ex, i) => {
                  const closedAllDay = !!ex.closed;
                  const ranges = ex.ranges ?? [];
                  return (
                    <div key={i} className={`space-y-2 px-3 py-2.5 ${i > 0 ? "border-t" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="date"
                          aria-label="Date"
                          className="h-8 w-[150px]"
                          value={ex.date}
                          onChange={(e) => setException(i, { date: e.target.value })}
                        />
                        <Select
                          value={closedAllDay ? "closed" : "custom"}
                          onValueChange={(v) =>
                            setException(
                              i,
                              v === "closed"
                                ? { closed: true }
                                : { closed: false, ranges: ranges.length ? ranges : [{ ...NEW_RANGE }] },
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[170px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closed">Closed all day</SelectItem>
                            <SelectItem value="custom">Special hours</SelectItem>
                          </SelectContent>
                        </Select>

                        {!closedAllDay && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="time"
                              aria-label="Opening time on this date"
                              className="h-8 w-[112px]"
                              value={ranges[0]?.from ?? NEW_RANGE.from}
                              onChange={(e) =>
                                setException(i, {
                                  ranges: [{ from: e.target.value, to: ranges[0]?.to ?? NEW_RANGE.to }],
                                })
                              }
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                              type="time"
                              aria-label="Closing time on this date"
                              className="h-8 w-[112px]"
                              value={ranges[0]?.to ?? NEW_RANGE.to}
                              onChange={(e) =>
                                setException(i, {
                                  ranges: [{ from: ranges[0]?.from ?? NEW_RANGE.from, to: e.target.value }],
                                })
                              }
                            />
                          </div>
                        )}

                        <Input
                          aria-label="Note"
                          placeholder="Note (only you see this)"
                          className="h-8 max-w-[220px] flex-1"
                          value={ex.note ?? ""}
                          onChange={(e) => setException(i, { note: e.target.value })}
                        />

                        <button
                          type="button"
                          onClick={() => removeException(i)}
                          aria-label="Remove this date"
                          className="ml-auto rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {/* A date already in the past can never fire again; say so
                          rather than leaving a row that looks active. */}
                      {ex.date < localNow(timezone).date && (
                        <p className="text-xs text-muted-foreground">
                          This date has passed — it no longer affects anything.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* A plain-text read-back of the week. The rows above are controls; this
              is the sentence a partner checks before walking away. */}
          <div className="rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
            {hours.days.map((d, i) => (
              <div key={i} className="flex justify-between gap-4 py-0.5">
                <span>{WEEKDAY_LABELS[i]}</span>
                <span className={d.closed || d.ranges.length === 0 ? "" : "text-foreground"}>
                  {describeDay(d)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
