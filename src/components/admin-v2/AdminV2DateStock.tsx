"use client";

import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, RefreshCw, Search } from "lucide-react";
import { revalidateTag } from "@/app/actions/revalidate";
import {
  getPrebookingDates,
  mergePrebookingConfig,
  parsePrebookingSettings,
  ymd,
} from "@/lib/prebooking";
import { getFeatures } from "@/lib/getFeatures";
import { toast } from "sonner";

// Per-date stock grid: menu items as rows, the next N bookable dates as columns.
// A row is "capped" when its stock has a daily_default (also marked stock_type
// 'DATE'); that default seeds every date and a cell can override a single date.
// Uncapped items are always available (they ignore per-date stock entirely).

type DateStockRow = { id: string; date: string; stock_quantity: number };
type StockRow = {
  id: string;
  daily_default: number | null;
  stock_type: string;
};
type GridItem = {
  id: string;
  name: string;
  priority?: number | null;
  stock: StockRow | null;
  // date string -> current remaining for that date (only rows that exist).
  dateQty: Record<string, number>;
};

const HORIZON_OPTIONS = [7, 14, 30];
// Default daily cap seeded when an item is first capped (partner can edit it).
const DEFAULT_DAILY_CAP = 20;
// Per-partner seed overrides. Keyed by partner id.
const PARTNER_DAILY_CAP: Record<string, number> = {
  // Flamin Hot Chicken - Edapally
  "90c8e165-6ad9-4b16-9821-c8a7620e0dcb": 60,
};

export function AdminV2DateStock({ partnerId }: { partnerId: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<GridItem[]>([]);
  const [dates, setDates] = useState<{ value: string; label: string }[]>([]);
  const [horizon, setHorizon] = useState<number>(7);
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Compute the column dates from the partner's prebooking config (so they match
  // what customers can actually book); fall back to the next N calendar days.
  const computeDates = useCallback(
    (prebookingSettings: unknown, featureFlags: string | null) => {
      const prebookOn = !!getFeatures(featureFlags || "")?.prebooking?.enabled;
      const parsed = parsePrebookingSettings(prebookingSettings);
      if (prebookOn && parsed) {
        const cols = getPrebookingDates(
          mergePrebookingConfig(prebookingSettings),
          new Date(),
          { throughDay: horizon },
        );
        if (cols.length) return cols;
      }
      // Fallback: plain next-N calendar days from today.
      const out: { value: string; label: string }[] = [];
      const now = new Date();
      for (let i = 0; i <= horizon; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        out.push({
          value: ymd(d),
          label:
            i === 0
              ? "Today"
              : i === 1
                ? "Tomorrow"
                : d.toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }),
        });
      }
      return out;
    },
    [horizon],
  );

  const fetchData = useCallback(async () => {
    const initial = !hasLoadedRef.current;
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);

      // 1. Partner config -> column dates.
      const cfg = await fetchFromHasura(
        `query DateStockConfig($id: uuid!) {
          partners_by_pk(id: $id) { prebooking_settings feature_flags }
        }`,
        { id: partnerId },
      );
      const p = cfg?.partners_by_pk;
      const cols = computeDates(p?.prebooking_settings, p?.feature_flags ?? null);
      const colValues = cols.map((c) => c.value);

      // 2. Menu items + their stock + the existing per-date rows for these dates.
      const res = await fetchFromHasura(
        `query DateStockGrid($partner_id: uuid!, $dates: [date!]!) {
          menu(
            where: { partner_id: { _eq: $partner_id }, deletion_status: { _eq: 0 } }
            order_by: { priority: asc }
          ) {
            id
            name
            priority
            stocks { id daily_default stock_type }
            date_stocks(where: { date: { _in: $dates } }) { id date stock_quantity }
          }
        }`,
        { partner_id: partnerId, dates: colValues },
      );

      const grid: GridItem[] = (res?.menu || []).map((m: any) => {
        const dateQty: Record<string, number> = {};
        (m.date_stocks || []).forEach((r: DateStockRow) => {
          dateQty[r.date] = r.stock_quantity;
        });
        const s = m.stocks?.[0];
        return {
          id: m.id,
          name: m.name,
          priority: m.priority,
          stock: s
            ? { id: s.id, daily_default: s.daily_default ?? null, stock_type: s.stock_type }
            : null,
          dateQty,
        };
      });

      setDates(cols);
      setItems(grid);
      hasLoadedRef.current = true;
    } catch (e) {
      console.error("[DateStock] fetch failed:", e);
      toast.error("Failed to load date stock");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partnerId, computeDates]);

  useEffect(() => {
    if (partnerId) fetchData();
  }, [partnerId, horizon, fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  // Ensure a stocks row exists for an item (create one if missing) and return
  // its id. New rows are date-capped from the start.
  const ensureStockRow = async (item: GridItem, dailyDefault: number): Promise<string | null> => {
    if (item.stock?.id) return item.stock.id;
    const res = await fetchFromHasura(
      `mutation CreateDateStock($menu_id: uuid!, $qty: numeric!) {
        insert_stocks_one(object: {
          menu_id: $menu_id, stock_quantity: 9999, show_stock: false,
          stock_type: "DATE", daily_default: $qty
        }) { id daily_default stock_type }
      }`,
      { menu_id: item.id, qty: dailyDefault },
    );
    return res?.insert_stocks_one?.id ?? null;
  };

  // Toggle whether an item is date-capped. Capping seeds the default daily cap.
  const toggleCap = async (item: GridItem, capped: boolean) => {
    setSavingKey(`cap:${item.id}`);
    try {
      if (capped) {
        const seed = PARTNER_DAILY_CAP[partnerId] ?? DEFAULT_DAILY_CAP;
        const def = item.stock?.daily_default ?? seed;
        if (!item.stock?.id) {
          await ensureStockRow(item, def);
        } else {
          await fetchFromHasura(
            `mutation SetCap($id: uuid!, $def: numeric!) {
              update_stocks_by_pk(pk_columns: { id: $id }, _set: { daily_default: $def, stock_type: "DATE" }) { id }
            }`,
            { id: item.stock.id, def },
          );
        }
      } else if (item.stock?.id) {
        // Un-cap: item goes back to always-available. Existing date rows are
        // left in place (dormant) — never deleted.
        await fetchFromHasura(
          `mutation ClearCap($id: uuid!) {
            update_stocks_by_pk(pk_columns: { id: $id }, _set: { daily_default: null, stock_type: "STATIC" }) { id }
          }`,
          { id: item.stock.id },
        );
      }
      revalidateTag(partnerId);
      await fetchData();
    } catch (e) {
      console.error("[DateStock] toggle cap failed:", e);
      toast.error("Could not update");
    } finally {
      setSavingKey(null);
    }
  };

  // Set the per-item default daily cap.
  const setDefault = async (item: GridItem, value: number) => {
    const v = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    setSavingKey(`def:${item.id}`);
    try {
      const id = await ensureStockRow(item, v);
      if (id && item.stock?.id) {
        await fetchFromHasura(
          `mutation SetDefault($id: uuid!, $v: numeric!) {
            update_stocks_by_pk(pk_columns: { id: $id }, _set: { daily_default: $v, stock_type: "DATE" }) { id }
          }`,
          { id, v },
        );
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id && it.stock
            ? { ...it, stock: { ...it.stock, daily_default: v, stock_type: "DATE" } }
            : it,
        ),
      );
      revalidateTag(partnerId);
    } catch (e) {
      console.error("[DateStock] set default failed:", e);
      toast.error("Could not save default");
      await fetchData();
    } finally {
      setSavingKey(null);
    }
  };

  // Upsert a single (item, date) cell.
  const setCell = async (item: GridItem, date: string, value: number) => {
    const v = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    setSavingKey(`cell:${item.id}:${date}`);
    try {
      await fetchFromHasura(
        `mutation UpsertCell($menu_id: uuid!, $date: date!, $q: numeric!) {
          insert_menu_date_stocks_one(
            object: { menu_id: $menu_id, date: $date, stock_quantity: $q }
            on_conflict: { constraint: menu_date_stocks_menu_date_key, update_columns: [stock_quantity] }
          ) { id date stock_quantity }
        }`,
        { menu_id: item.id, date, q: v },
      );
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, dateQty: { ...it.dateQty, [date]: v } } : it,
        ),
      );
      revalidateTag(partnerId);
    } catch (e) {
      console.error("[DateStock] set cell failed:", e);
      toast.error("Could not save");
      await fetchData();
    } finally {
      setSavingKey(null);
    }
  };

  // Apply the item's default to every visible date (bulk seed/override).
  const applyDefaultToAll = async (item: GridItem) => {
    const def = item.stock?.daily_default;
    if (def == null) return;
    setSavingKey(`all:${item.id}`);
    try {
      await fetchFromHasura(
        `mutation SeedAll($objects: [menu_date_stocks_insert_input!]!) {
          insert_menu_date_stocks(
            objects: $objects
            on_conflict: { constraint: menu_date_stocks_menu_date_key, update_columns: [stock_quantity] }
          ) { affected_rows }
        }`,
        {
          objects: dates.map((d) => ({
            menu_id: item.id,
            date: d.value,
            stock_quantity: def,
          })),
        },
      );
      const dq: Record<string, number> = { ...item.dateQty };
      dates.forEach((d) => (dq[d.value] = def));
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, dateQty: dq } : it)));
      revalidateTag(partnerId);
      toast.success("Applied to all dates");
    } catch (e) {
      console.error("[DateStock] apply-all failed:", e);
      toast.error("Could not apply");
      await fetchData();
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="bg-white pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
          <SelectTrigger className="w-full bg-white sm:w-[150px]">
            <CalendarDays className="mr-1 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HORIZON_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                Next {n} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="bg-white"
          onClick={() => fetchData()}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Cap an item to track its stock per date. Each date sells out independently;
        empty cells use the item&apos;s daily default. Uncapped items stay always available.
      </p>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2.5 text-left font-medium">
                Item
              </th>
              <th className="px-3 py-2.5 text-center font-medium">Cap</th>
              <th className="px-3 py-2.5 text-center font-medium">Default/day</th>
              {dates.map((d) => (
                <th key={d.value} className="whitespace-nowrap px-3 py-2.5 text-center font-medium">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const capped = item.stock?.daily_default != null;
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 max-w-[180px] truncate bg-white px-3 py-2 font-medium">
                    {item.name}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Checkbox
                      checked={capped}
                      disabled={savingKey === `cap:${item.id}`}
                      onCheckedChange={(c) => toggleCap(item, !!c)}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {capped ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          defaultValue={item.stock?.daily_default ?? 0}
                          key={`def-${item.id}-${item.stock?.daily_default}`}
                          className="h-8 w-16 text-center"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== (item.stock?.daily_default ?? 0)) setDefault(item, v);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                        />
                        <button
                          type="button"
                          title="Apply default to all shown dates"
                          className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
                          disabled={savingKey === `all:${item.id}`}
                          onClick={() => applyDefaultToAll(item)}
                        >
                          fill
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {dates.map((d) => {
                    const has = d.value in item.dateQty;
                    const effective = has ? item.dateQty[d.value] : item.stock?.daily_default ?? null;
                    const isOut = capped && effective != null && effective <= 0;
                    return (
                      <td key={d.value} className="px-2 py-2 text-center">
                        {capped ? (
                          <Input
                            type="number"
                            min={0}
                            defaultValue={has ? item.dateQty[d.value] : ""}
                            placeholder={String(item.stock?.daily_default ?? 0)}
                            key={`cell-${item.id}-${d.value}-${has ? item.dateQty[d.value] : "def"}`}
                            className={`h-8 w-16 text-center ${isOut ? "border-red-300 text-red-600" : ""} ${!has ? "text-muted-foreground" : ""}`}
                            onBlur={(e) => {
                              if (e.target.value === "") return;
                              const v = Number(e.target.value);
                              if (!has || v !== item.dateQty[d.value]) setCell(item, d.value, v);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                          />
                        ) : (
                          <span className="text-muted-foreground">∞</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3 + dates.length} className="px-3 py-8 text-center text-muted-foreground">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
