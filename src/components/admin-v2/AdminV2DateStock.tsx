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
import { CalendarDays, Loader2, RefreshCw, Save, Search } from "lucide-react";
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
//
// Numeric edits (per-item default + per-date cells) are held as PENDING local
// state and persisted only when the partner clicks Save — auto-save-on-blur was
// invisible, so an explicit Save with clear feedback replaces it. The Cap
// checkbox stays immediate (it's a structural toggle, not an easy-to-miss edit).

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

// Parse a raw input string to a non-negative integer quantity.
const toQty = (raw: string): number => {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

export function AdminV2DateStock({ partnerId }: { partnerId: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<GridItem[]>([]);
  const [dates, setDates] = useState<{ value: string; label: string }[]>([]);
  const [horizon, setHorizon] = useState<number>(7);
  const [search, setSearch] = useState("");
  const [busyCap, setBusyCap] = useState<string | null>(null);
  // Unsaved edits. Cells keyed `${menuId}|${date}`, defaults keyed menuId.
  const [pendingCells, setPendingCells] = useState<Record<string, string>>({});
  const [pendingDefaults, setPendingDefaults] = useState<Record<string, string>>({});
  const hasLoadedRef = useRef(false);

  const dirtyCount =
    Object.keys(pendingCells).length + Object.keys(pendingDefaults).length;
  const isDirty = dirtyCount > 0;

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
      // A fresh load is the source of truth — clear any staged edits.
      setPendingCells({});
      setPendingDefaults({});
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

  // Discard-guard for actions that reload/replace the grid.
  const confirmDiscard = () =>
    !isDirty ||
    window.confirm("You have unsaved changes. Discard them?");

  // ---- pending edit setters (record locally; nothing hits the DB until Save) ----
  const editCell = (item: GridItem, date: string, raw: string) => {
    const key = `${item.id}|${date}`;
    const persisted = date in item.dateQty ? String(item.dateQty[date]) : "";
    setPendingCells((prev) => {
      const next = { ...prev };
      // Empty = "no change" (we don't delete rows); revert to persisted removes dirt.
      if (raw.trim() === "" || raw === persisted) delete next[key];
      else next[key] = raw;
      return next;
    });
  };

  const editDefault = (item: GridItem, raw: string) => {
    const persisted = String(item.stock?.daily_default ?? 0);
    setPendingDefaults((prev) => {
      const next = { ...prev };
      if (raw.trim() === "" || raw === persisted) delete next[item.id];
      else next[item.id] = raw;
      return next;
    });
  };

  // Stage the item's default into every visible date's cell (persisted on Save).
  const fillFromDefault = (item: GridItem) => {
    const def = item.stock?.daily_default;
    if (def == null) return;
    setPendingCells((prev) => {
      const next = { ...prev };
      dates.forEach((d) => {
        const key = `${item.id}|${d.value}`;
        const persisted = d.value in item.dateQty ? String(item.dateQty[d.value]) : "";
        if (String(def) === persisted) delete next[key];
        else next[key] = String(def);
      });
      return next;
    });
    toast.message("Filled all dates — click Save to apply");
  };

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

  // Toggle whether an item is date-capped. Immediate (structural), and it updates
  // local state in place so pending edits on OTHER rows aren't lost.
  const toggleCap = async (item: GridItem, capped: boolean) => {
    setBusyCap(item.id);
    try {
      if (capped) {
        const seed = PARTNER_DAILY_CAP[partnerId] ?? DEFAULT_DAILY_CAP;
        const def = item.stock?.daily_default ?? seed;
        let stockId = item.stock?.id ?? null;
        if (!stockId) {
          stockId = await ensureStockRow(item, def);
        } else {
          await fetchFromHasura(
            `mutation SetCap($id: uuid!, $def: numeric!) {
              update_stocks_by_pk(pk_columns: { id: $id }, _set: { daily_default: $def, stock_type: "DATE" }) { id }
            }`,
            { id: stockId, def },
          );
        }
        if (!stockId) throw new Error("no stock row");
        const sid = stockId;
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, stock: { id: sid, daily_default: def, stock_type: "DATE" } }
              : it,
          ),
        );
      } else if (item.stock?.id) {
        // Un-cap: item goes back to always-available. Existing date rows are
        // left in place (dormant) — never deleted.
        await fetchFromHasura(
          `mutation ClearCap($id: uuid!) {
            update_stocks_by_pk(pk_columns: { id: $id }, _set: { daily_default: null, stock_type: "STATIC" }) { id }
          }`,
          { id: item.stock.id },
        );
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id && it.stock
              ? { ...it, stock: { ...it.stock, daily_default: null, stock_type: "STATIC" } }
              : it,
          ),
        );
        // Drop any staged edits for the now-uncapped item.
        setPendingDefaults((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        setPendingCells((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (k.startsWith(`${item.id}|`)) delete next[k];
          });
          return next;
        });
      }
      revalidateTag(partnerId);
    } catch (e) {
      console.error("[DateStock] toggle cap failed:", e);
      toast.error("Could not update");
    } finally {
      setBusyCap(null);
    }
  };

  // Persist all staged edits in one go.
  const saveChanges = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      // 1. Per-item default caps (few — run sequentially, each on its stock row).
      for (const [menuId, raw] of Object.entries(pendingDefaults)) {
        const item = items.find((i) => i.id === menuId);
        if (!item) continue;
        const v = toQty(raw);
        const stockId = await ensureStockRow(item, v);
        if (stockId) {
          await fetchFromHasura(
            `mutation SetDefault($id: uuid!, $v: numeric!) {
              update_stocks_by_pk(pk_columns: { id: $id }, _set: { daily_default: $v, stock_type: "DATE" }) { id }
            }`,
            { id: stockId, v },
          );
        }
      }

      // 2. Per-date cells — one batched upsert.
      const cellObjects = Object.entries(pendingCells).map(([key, raw]) => {
        const sep = key.indexOf("|");
        return {
          menu_id: key.slice(0, sep),
          date: key.slice(sep + 1),
          stock_quantity: toQty(raw),
        };
      });
      if (cellObjects.length) {
        await fetchFromHasura(
          `mutation SaveCells($objects: [menu_date_stocks_insert_input!]!) {
            insert_menu_date_stocks(
              objects: $objects
              on_conflict: { constraint: menu_date_stocks_menu_date_key, update_columns: [stock_quantity] }
            ) { affected_rows }
          }`,
          { objects: cellObjects },
        );
      }

      // 3. Fold the saved values into local state, then clear pending.
      setItems((prev) =>
        prev.map((it) => {
          let stock = it.stock;
          if (it.id in pendingDefaults && stock) {
            stock = { ...stock, daily_default: toQty(pendingDefaults[it.id]), stock_type: "DATE" };
          }
          let dateQty = it.dateQty;
          const cells = Object.entries(pendingCells).filter(([k]) =>
            k.startsWith(`${it.id}|`),
          );
          if (cells.length) {
            dateQty = { ...dateQty };
            cells.forEach(([k, raw]) => {
              dateQty[k.slice(k.indexOf("|") + 1)] = toQty(raw);
            });
          }
          return { ...it, stock, dateQty };
        }),
      );
      setPendingCells({});
      setPendingDefaults({});
      revalidateTag(partnerId);
      toast.success("Stock saved");
    } catch (e) {
      console.error("[DateStock] save failed:", e);
      toast.error("Couldn't save — please try again");
    } finally {
      setSaving(false);
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
        <Select
          value={String(horizon)}
          onValueChange={(v) => {
            if (!confirmDiscard()) return;
            setHorizon(Number(v));
          }}
        >
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
          onClick={() => {
            if (confirmDiscard()) fetchData();
          }}
          disabled={refreshing || saving}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <Button onClick={saveChanges} disabled={!isDirty || saving} className="min-w-[110px]">
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          {saving ? "Saving..." : isDirty ? `Save (${dirtyCount})` : "Saved"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Cap an item to track its stock per date. Each date sells out independently;
          empty cells use the item&apos;s daily default. Uncapped items stay always available.
        </p>
        {isDirty && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {dirtyCount} unsaved
          </span>
        )}
      </div>

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
              const defDirty = item.id in pendingDefaults;
              const defValue = defDirty
                ? pendingDefaults[item.id]
                : String(item.stock?.daily_default ?? 0);
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 max-w-[180px] truncate bg-white px-3 py-2 font-medium">
                    {item.name}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Checkbox
                      checked={capped}
                      disabled={busyCap === item.id}
                      onCheckedChange={(c) => toggleCap(item, !!c)}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {capped ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          value={defValue}
                          className={`h-8 w-16 text-center ${defDirty ? "border-amber-400 bg-amber-50" : ""}`}
                          onChange={(e) => editDefault(item, e.target.value)}
                        />
                        <button
                          type="button"
                          title="Fill every shown date with this default"
                          className="text-xs text-primary underline-offset-2 hover:underline"
                          onClick={() => fillFromDefault(item)}
                        >
                          fill
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {dates.map((d) => {
                    const key = `${item.id}|${d.value}`;
                    const cellDirty = key in pendingCells;
                    const has = d.value in item.dateQty;
                    const value = cellDirty
                      ? pendingCells[key]
                      : has
                        ? String(item.dateQty[d.value])
                        : "";
                    const shown = cellDirty ? toQty(pendingCells[key]) : has ? item.dateQty[d.value] : null;
                    const isOut = capped && shown != null && shown <= 0;
                    return (
                      <td key={d.value} className="px-2 py-2 text-center">
                        {capped ? (
                          <Input
                            type="number"
                            min={0}
                            value={value}
                            placeholder={String(item.stock?.daily_default ?? 0)}
                            className={`h-8 w-16 text-center ${
                              cellDirty ? "border-amber-400 bg-amber-50" : ""
                            } ${isOut ? "border-red-300 text-red-600" : ""} ${
                              !cellDirty && !has ? "text-muted-foreground" : ""
                            }`}
                            onChange={(e) => editCell(item, d.value, e.target.value)}
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
