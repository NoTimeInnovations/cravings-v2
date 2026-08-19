"use client";

import * as React from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Info,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import Img from "@/components/Img";
import { formatDate } from "@/lib/formatDate";
import { safeTz, todayRange } from "@/lib/partnerTime";
import { cn } from "@/lib/utils";
import { useAuthStore, type Partner } from "@/store/authStore";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import { useMenuStore, type MenuItem } from "@/store/menuStore_hasura";
import { useOfferStore, type Offer } from "@/store/offerStore_hasura";
import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";

/**
 * admin-v3 Offers.
 *
 * Same data path as admin-v2: `useOfferStore` (fetchPartnerOffers / addOffer /
 * deleteOffer / setOfferMaxPerOrder) over `useMenuStore` items. Nothing new is
 * queried and admin-v2's create semantics are reproduced exactly — percentage
 * offers fan out one row per variant, a flat price writes the price straight in,
 * and `offer_type` is still derived from the channel choice ("all" | "delivery"
 * | "dine_in").
 *
 * Two things the design asks for that the schema does not have:
 *  - a Takeaway channel. `offers.offer_type` only distinguishes storefront
 *    (delivery) from QR/dine-in; takeaway rides along with the storefront. The
 *    row is rendered, but read-only, saying so.
 *  - editing a published offer. There is no update mutation beyond
 *    `max_per_order`, so the pencil opens the per-order limit only.
 */

/* ---------------------------------------------------------------- helpers */

type Mode = "pct" | "flat";
type RunPreset = "today" | "7" | "30" | "custom";
type LimitMode = "none" | "one" | "custom";

const MIN_MS = 15 * 60 * 1000;

/** The real base price of a menu item — some items keep it in delivery_price. */
function basePriceOf(item: MenuItem): number {
  return Number(item.price) || Number(item.delivery_price) || 0;
}

/** The real base price of one variant, falling back to the live menu row. */
function variantBasePrice(
  item: MenuItem,
  variant: { name: string; price?: number; delivery_price?: number },
): number {
  const full = item.variants?.find((v) => v.name === variant.name);
  return (
    Number(variant.price) ||
    Number(full?.price) ||
    Number(full?.delivery_price) ||
    0
  );
}

/** Lowest price a customer can pay for this item today (variant-aware). */
function lowestBase(item: MenuItem): number {
  if (item.variants && item.variants.length > 0) {
    const prices = item.variants
      .map((v) => variantBasePrice(item, v))
      .filter((n) => n > 0);
    if (prices.length > 0) return Math.min(...prices);
  }
  return basePriceOf(item);
}

function money(currency: string, n: number): string {
  return `${currency}${Math.round(n).toLocaleString("en-IN")}`;
}

function channelLabel(offerType: string | undefined): string {
  switch (offerType || "all") {
    case "delivery":
      return "Delivery";
    case "dine_in":
      return "Dine-in";
    default:
      return "Delivery, Dine-in";
  }
}

/* ------------------------------------------------------- small UI pieces */

function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800">
      {children}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-[30px] rounded-md px-3 text-[12.5px] leading-none transition-colors",
        active
          ? "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
          : "border border-transparent font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  on,
  onClick,
  disabled,
  label,
}: {
  on: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[2px] transition-colors",
        on
          ? "justify-end bg-zinc-900 dark:bg-zinc-50"
          : "justify-start bg-zinc-200 dark:bg-zinc-700",
        disabled && "opacity-50",
      )}
    >
      <span className="h-[18px] w-[18px] rounded-full bg-white dark:bg-zinc-900" />
    </button>
  );
}

function StepHeader({
  n,
  title,
  right,
}: {
  n: number;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold leading-none text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
        {n}
      </span>
      <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </span>
      {right}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- the list */

function OfferRow({
  offer,
  currency,
  tz,
  deleting,
  onDelete,
  onSaveLimit,
}: {
  offer: Offer;
  currency: string;
  tz: string;
  deleting: boolean;
  onDelete: () => void;
  onSaveLimit: (next: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const isGroup = !!offer.offer_group;
  const name = isGroup ? offer.offer_group?.name : offer.menu?.name;
  const variantName = !isGroup && offer.variant ? ` (${offer.variant.name})` : "";
  const imageUrl = !isGroup ? offer.menu?.image_url : null;
  const original = isGroup
    ? 0
    : Number(offer.variant?.price || offer.menu?.price || 0);
  const now = Number(offer.offer_price || 0);
  const pct =
    original > 0 && now > 0 && now < original
      ? Math.round(((original - now) / original) * 100)
      : isGroup
        ? Number(offer.offer_group?.percentage || 0)
        : 0;

  const scheduled = new Date(offer.start_time).getTime() > Date.now();

  const openEditor = () => {
    setDraft(offer.max_per_order == null ? "" : String(offer.max_per_order));
    setEditing((v) => !v);
  };

  const commit = async () => {
    const parsed = draft.trim() ? parseInt(draft, 10) : NaN;
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    setSaving(true);
    await onSaveLimit(next);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
          {imageUrl ? (
            <Img
              src={imageUrl}
              alt={name || "Offer"}
              className="h-full w-full object-cover"
            />
          ) : (
            <Percent
              size={20}
              strokeWidth={1.7}
              className="text-zinc-400 dark:text-zinc-500"
            />
          )}
        </div>

        <div className="min-w-0 flex-[1_1_180px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              translate="no"
              className="notranslate text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
            >
              {name}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                {variantName}
              </span>
            </span>
            {scheduled ? (
              <StatusPill tone="amber">Scheduled</StatusPill>
            ) : (
              <StatusPill tone="green">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-600" />
                Running
              </StatusPill>
            )}
          </div>
          <div className="mt-1 text-[12.5px] leading-[1.4] text-zinc-500 dark:text-zinc-400">
            {formatDate(offer.start_time, tz)} → {formatDate(offer.end_time, tz)}
            {" · "}
            {channelLabel(offer.offer_type)}
            {offer.max_per_order ? ` · max ${offer.max_per_order}/order` : ""}
          </div>
        </div>

        <div className="flex shrink-0 items-baseline gap-2">
          {isGroup ? (
            <span className="text-[16px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
              {offer.offer_group?.percentage}% off
            </span>
          ) : (
            <>
              {original > now && (
                <span className="text-[13px] tabular-nums text-zinc-400 line-through dark:text-zinc-500">
                  {money(currency, original)}
                </span>
              )}
              <span className="text-[16px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                {money(currency, now)}
              </span>
              {pct > 0 && (
                <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {pct}% off
                </span>
              )}
            </>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-[7px]">
          <button
            type="button"
            onClick={openEditor}
            title="Change how many of this one order may contain"
            aria-label="Edit per-order limit"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Pencil size={15} strokeWidth={1.7} />
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            aria-label="Delete offer"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            {deleting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} strokeWidth={1.7} />
            )}
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-[12.5px] text-zinc-600 dark:text-zinc-300">
            Limit per order
          </span>
          <input
            type="number"
            min={1}
            placeholder="No limit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commit();
            }}
            className="h-8 w-24 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] text-zinc-950 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <AdminV3Button variant="small" disabled={saving} onClick={commit}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
          </AdminV3Button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-[12.5px] font-medium text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
          >
            Cancel
          </button>
          <span className="basis-full text-[12px] text-zinc-500 dark:text-zinc-400">
            Blank means a customer can add as many as they like. Price, dates and
            channels can&apos;t be edited after publishing — delete and recreate
            the offer instead.
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- screen */

export function AdminV3Offers() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | null;
  const currency = partner?.currency || "₹";
  const tz = safeTz(
    (partner as unknown as { timezone?: string | null })?.timezone,
  );
  const isPetpooja = !!partner?.petpooja_restaurant_id;

  const { items, fetchMenu } = useMenuStore();
  const {
    offers,
    fetchPartnerOffers,
    addOffer,
    deleteOffer,
    setOfferMaxPerOrder,
  } = useOfferStore();

  const [view, setView] = React.useState<"list" | "new">("list");
  const [loaded, setLoaded] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!userData) return;
    let cancelled = false;
    (async () => {
      await Promise.all([
        fetchPartnerOffers(),
        items.length === 0 ? fetchMenu() : Promise.resolve([]),
      ]);
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  /* ------------------------------------------------------- create state */

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [mode, setMode] = React.useState<Mode>("pct");
  const [amount, setAmount] = React.useState("");
  const [run, setRun] = React.useState<RunPreset>("7");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const [onDelivery, setOnDelivery] = React.useState(true);
  const [onDineIn, setOnDineIn] = React.useState(true);
  const [limitMode, setLimitMode] = React.useState<LimitMode>("none");
  const [limitValue, setLimitValue] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);

  const resetCreate = () => {
    setSelected(new Set());
    setQuery("");
    setCategory("all");
    setMode("pct");
    setAmount("");
    setRun("7");
    setCustomStart("");
    setCustomEnd("");
    setOnDelivery(true);
    setOnDineIn(true);
    setLimitMode("none");
    setLimitValue("");
  };

  const sellable = React.useMemo(
    () => items.filter((it) => it.id && lowestBase(it) > 0),
    [items],
  );

  const categories = React.useMemo(() => {
    const seen = new Map<string, string>();
    sellable.forEach((it) => {
      const n = it.category?.name;
      if (n && !seen.has(n)) seen.set(n, formatDisplayName(n));
    });
    return Array.from(seen.entries());
  }, [sellable]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return sellable.filter((it) => {
      if (category !== "all" && it.category?.name !== category) return false;
      if (!q) return true;
      return it.name.toLowerCase().includes(q);
    });
  }, [sellable, query, category]);

  const selectedItems = React.useMemo(
    () => sellable.filter((it) => selected.has(it.id as string)),
    [sellable, selected],
  );

  const numericAmount = Number(amount);
  const amountValid =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    (mode === "pct" ? numericAmount <= 100 : true);

  /** New price for one base price under the current deal. 0 = invalid. */
  const priceFor = React.useCallback(
    (base: number) => {
      if (!amountValid || base <= 0) return 0;
      const next =
        mode === "pct"
          ? Math.round(base * (1 - numericAmount / 100))
          : Math.round(numericAmount);
      return next > 0 && next < base ? next : 0;
    },
    [amountValid, mode, numericAmount],
  );

  const range = React.useMemo((): { start: string; end: string } | null => {
    const nowISO = new Date().toISOString();
    if (run === "today") {
      return { start: nowISO, end: todayRange(tz).endISO };
    }
    if (run === "7" || run === "30") {
      const days = run === "7" ? 7 : 30;
      return {
        start: nowISO,
        end: new Date(Date.now() + days * 86400000).toISOString(),
      };
    }
    if (!customStart || !customEnd) return null;
    const s = new Date(customStart).getTime();
    const e = new Date(customEnd).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
    if (e - s < MIN_MS) return null;
    return { start: new Date(s).toISOString(), end: new Date(e).toISOString() };
  }, [run, customStart, customEnd, tz]);

  const channelsOk = onDelivery || onDineIn;
  const previewRows = selectedItems
    .map((it) => {
      const base = lowestBase(it);
      return { item: it, was: base, now: priceFor(base) };
    })
    .filter((r) => r.now > 0);
  const allPriced =
    selectedItems.length > 0 && previewRows.length === selectedItems.length;
  const saves = previewRows.reduce((sum, r) => sum + (r.was - r.now), 0);

  const ready =
    selectedItems.length > 0 &&
    amountValid &&
    allPriced &&
    !!range &&
    channelsOk &&
    !publishing;

  const statusLine = (() => {
    if (selectedItems.length === 0) return "Pick the items you want to discount";
    if (!amountValid) return "Set the discount";
    if (!allPriced)
      return "One of the selected items ends up at or above its normal price";
    if (!range) return "Pick a start and an end time";
    if (!channelsOk) return "Choose at least one channel";
    return `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} · ${
      mode === "pct"
        ? `${numericAmount}% off`
        : `flat ${money(currency, numericAmount)}`
    }`;
  })();

  const maxPerOrder =
    limitMode === "one"
      ? 1
      : limitMode === "custom" && limitValue.trim()
        ? Math.max(1, parseInt(limitValue, 10) || 1)
        : null;

  const offerType = onDelivery && onDineIn ? "all" : onDelivery ? "delivery" : "dine_in";

  const publish = async () => {
    if (!ready || !range) return;
    setPublishing(true);
    try {
      const notification = {
        title: "New Offer",
        body: "A new offer has been added",
      };

      // `max_per_order` is handled by the store but missing from its declared
      // param type (admin-v2 sidesteps this the same way), so the payload is
      // assembled loosely and handed over as-is.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const push = (payload: any) => addOffer(payload, notification);

      for (const item of selectedItems) {
        const stock = item.stocks?.[0];
        const items_available =
          typeof stock?.stock_quantity === "number" ? stock.stock_quantity : 1;

        const common = {
          menu_id: item.id as string,
          items_available,
          max_per_order: maxPerOrder,
          start_time: range.start,
          end_time: range.end,
          offer_type: offerType,
        };

        if (item.variants && item.variants.length > 0) {
          for (const variant of item.variants) {
            const base = variantBasePrice(item, variant);
            const next = priceFor(base);
            if (next <= 0) continue;
            await push({
              ...common,
              offer_price: next,
              variant: { name: variant.name, price: base },
            });
          }
        } else {
          const base = basePriceOf(item);
          const next = priceFor(base);
          if (next <= 0) continue;
          await push({ ...common, offer_price: next });
        }
      }

      resetCreate();
      setView("list");
    } catch (e) {
      console.error("[AdminV3Offers] publish failed", e);
      toast.error("Couldn't create the offer");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = (id: string) => async () => {
    setDeleting((d) => ({ ...d, [id]: true }));
    await deleteOffer(id);
    setDeleting((d) => ({ ...d, [id]: false }));
  };

  /* ------------------------------------------------------------ new view */

  if (view === "new") {
    const unitLeft = mode === "flat" ? currency : "";
    const unitRight = mode === "pct" ? "%" : "";
    const quickBase = selectedItems.length > 0 ? lowestBase(selectedItems[0]) : 0;
    const quick =
      mode === "pct"
        ? [10, 20, 50].map((n) => ({ label: `${n}%`, value: String(n) }))
        : quickBase > 0
          ? [0.9, 0.8, 0.5].map((f) => ({
              label: money(currency, quickBase * f),
              value: String(Math.round(quickBase * f)),
            }))
          : [];

    const allVisibleSelected =
      visible.length > 0 && visible.every((it) => selected.has(it.id as string));

    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/90 px-[14px] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 lg:px-[clamp(14px,3vw,28px)]">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="Back to offers"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </button>
          <div className="min-w-0 flex-[1_1_200px]">
            <h1 className="m-0 text-[16px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
              Create offer
            </h1>
            <p className="mt-1 text-[12.5px] leading-[1.35] text-zinc-500 dark:text-zinc-400">
              {statusLine}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <AdminV3Button
              variant="secondary"
              className="h-[34px] px-3"
              onClick={() => {
                resetCreate();
                setView("list");
              }}
            >
              Cancel
            </AdminV3Button>
            <AdminV3Button
              variant="primary"
              className="h-[34px] px-3.5"
              disabled={!ready}
              onClick={publish}
            >
              {publishing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Publishing…
                </>
              ) : (
                "Publish offer"
              )}
            </AdminV3Button>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
          {/* ---------------------------------------------- 1. pick items */}
          <V3Card className="flex min-w-0 flex-[1_1_420px] flex-col overflow-hidden">
            <StepHeader
              n={1}
              title="Pick the items"
              right={
                selected.size > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="text-[12.5px] font-medium text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                  >
                    Clear {selected.size}
                  </button>
                ) : undefined
              }
            />

            <div className="flex flex-col gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
              <div className="flex h-9 items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
                <Search
                  size={15}
                  strokeWidth={1.8}
                  className="shrink-0 text-zinc-400 dark:text-zinc-500"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items…"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[["all", "All items"] as const, ...categories].map(
                  ([value, label]) => {
                    const active = category === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategory(value)}
                        translate="no"
                        className={cn(
                          "notranslate h-[30px] shrink-0 rounded-full px-[11px] text-[12.5px] font-medium leading-none transition-colors",
                          active
                            ? "border border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                            : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                        )}
                      >
                        {label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                    {loaded ? "No items match" : "Loading your menu…"}
                  </p>
                  <p className="mt-1 text-[12px] text-zinc-400 dark:text-zinc-500">
                    {loaded
                      ? "Try a different search or category."
                      : "One moment."}
                  </p>
                </div>
              ) : (
                visible.map((it) => {
                  const id = it.id as string;
                  const isOn = selected.has(id);
                  const base = lowestBase(it);
                  const next = isOn ? priceFor(base) : 0;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => {
                          const nextSet = new Set(prev);
                          if (nextSet.has(id)) nextSet.delete(id);
                          else nextSet.add(id);
                          return nextSet;
                        })
                      }
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-[11px] text-left transition-colors dark:border-zinc-800",
                        isOn
                          ? "bg-zinc-50 dark:bg-zinc-800/50"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-[1.5px]",
                          isOn
                            ? "border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50"
                            : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800",
                        )}
                      >
                        {isOn && (
                          <Check
                            size={12}
                            strokeWidth={3}
                            className="text-white dark:text-zinc-900"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          translate="no"
                          className="notranslate block truncate text-[13px] font-medium leading-[1.3] text-zinc-950 dark:text-zinc-50"
                        >
                          {it.name}
                        </span>
                        <span
                          translate="no"
                          className="notranslate mt-px block truncate text-[11.5px] leading-[1.3] text-zinc-400 dark:text-zinc-500"
                        >
                          {formatDisplayName(it.category?.name || "")}
                          {it.variants && it.variants.length > 0
                            ? ` · ${it.variants.length} variants`
                            : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                        {money(currency, base)}
                      </span>
                      <span className="min-w-[58px] shrink-0 text-right text-[13px] font-semibold tabular-nums text-green-700 dark:text-green-400">
                        {next > 0 ? money(currency, next) : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50 px-4 py-3 dark:bg-zinc-800/40 lg:rounded-b-xl">
              <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                {visible.length} item{visible.length === 1 ? "" : "s"} shown ·{" "}
                {selected.size} selected
              </span>
              {visible.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelected((prev) => {
                      const nextSet = new Set(prev);
                      if (allVisibleSelected)
                        visible.forEach((it) => nextSet.delete(it.id as string));
                      else visible.forEach((it) => nextSet.add(it.id as string));
                      return nextSet;
                    })
                  }
                  className="ml-auto text-[12.5px] font-medium text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                >
                  {allVisibleSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
          </V3Card>

          {/* --------------------------------------- 2. deal + 3. preview */}
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
            <V3Card className="overflow-hidden">
              <StepHeader n={2} title="Set the deal" />

              <div className="flex flex-col gap-3.5 px-4 py-3.5">
                {/* discount */}
                <div>
                  <FieldLabel>Discount</FieldLabel>
                  <div className="mt-[7px]">
                    <Segmented>
                      <SegButton
                        active={mode === "pct"}
                        onClick={() => {
                          setMode("pct");
                          setAmount("");
                        }}
                      >
                        % off
                      </SegButton>
                      <SegButton
                        active={mode === "flat"}
                        onClick={() => {
                          setMode("flat");
                          setAmount("");
                        }}
                      >
                        Flat price
                      </SegButton>
                    </Segmented>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                    <div className="flex h-[38px] min-w-0 flex-[1_1_140px] items-center gap-2 rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
                      {unitLeft && (
                        <span className="shrink-0 text-[14px] font-medium text-zinc-400 dark:text-zinc-500">
                          {unitLeft}
                        </span>
                      )}
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        aria-label={mode === "pct" ? "Percent off" : "Flat price"}
                        className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold tabular-nums text-zinc-950 outline-none dark:text-zinc-50"
                      />
                      {unitRight && (
                        <span className="shrink-0 text-[14px] font-medium text-zinc-400 dark:text-zinc-500">
                          {unitRight}
                        </span>
                      )}
                    </div>
                    {quick.map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => setAmount(q.value)}
                        className="h-[34px] shrink-0 rounded-md border border-zinc-200 bg-white px-2.5 text-[12.5px] font-medium leading-none text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                  {selectedItems.length > 0 && amountValid && !allPriced && (
                    <p className="mt-2 text-[12px] leading-[1.5] text-red-600 dark:text-red-400">
                      This price is not below the normal price for every selected
                      item. Lower it, or drop those items.
                    </p>
                  )}
                </div>

                {/* runs */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <FieldLabel>Runs</FieldLabel>
                  <div className="mt-[7px]">
                    <Segmented>
                      <SegButton active={run === "today"} onClick={() => setRun("today")}>
                        Today
                      </SegButton>
                      <SegButton active={run === "7"} onClick={() => setRun("7")}>
                        7 days
                      </SegButton>
                      <SegButton active={run === "30"} onClick={() => setRun("30")}>
                        30 days
                      </SegButton>
                      <SegButton active={run === "custom"} onClick={() => setRun("custom")}>
                        Custom
                      </SegButton>
                    </Segmented>
                  </div>

                  {run === "custom" && (
                    <div className="mt-2.5 flex flex-wrap gap-2.5">
                      <label className="min-w-0 flex-[1_1_130px]">
                        <span className="mb-[5px] block text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">
                          Start
                        </span>
                        <input
                          type="datetime-local"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] text-zinc-950 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        />
                      </label>
                      <label className="min-w-0 flex-[1_1_130px]">
                        <span className="mb-[5px] block text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">
                          End
                        </span>
                        <input
                          type="datetime-local"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] text-zinc-950 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        />
                      </label>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-[7px]">
                    <Calendar
                      size={14}
                      strokeWidth={1.8}
                      className="shrink-0 text-zinc-400 dark:text-zinc-500"
                    />
                    <span className="text-[12px] leading-[1.4] text-zinc-500 dark:text-zinc-400">
                      {range
                        ? `${formatDate(range.start, tz)} → ${formatDate(range.end, tz)}`
                        : "Pick a start and end at least 15 minutes apart"}
                    </span>
                  </div>
                </div>

                {/* channels */}
                <div className="border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
                  <div className="pt-1.5">
                    <FieldLabel>Show on</FieldLabel>
                  </div>

                  <div className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-[1.3] text-zinc-950 dark:text-zinc-50">
                        Delivery
                      </div>
                      <div className="mt-px text-[12px] leading-[1.3] text-zinc-400 dark:text-zinc-500">
                        Storefront delivery orders
                      </div>
                    </div>
                    <Toggle
                      label="Show on delivery"
                      on={onDelivery}
                      onClick={() => setOnDelivery((v) => !v)}
                    />
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                  <div className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-[1.3] text-zinc-950 dark:text-zinc-50">
                        Dine-in
                      </div>
                      <div className="mt-px text-[12px] leading-[1.3] text-zinc-400 dark:text-zinc-500">
                        QR menu at the table
                      </div>
                    </div>
                    <Toggle
                      label="Show on dine-in"
                      on={onDineIn}
                      onClick={() => setOnDineIn((v) => !v)}
                    />
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                  <div className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-[1.3] text-zinc-500 dark:text-zinc-400">
                        Takeaway
                      </div>
                      <div className="mt-px text-[12px] leading-[1.4] text-zinc-400 dark:text-zinc-500">
                        Not a separate offer channel — takeaway follows the
                        storefront setting above.
                      </div>
                    </div>
                    <Toggle label="Takeaway follows delivery" on={onDelivery} disabled />
                  </div>

                  {!channelsOk && (
                    <p className="pb-1 text-[12px] text-red-600 dark:text-red-400">
                      Pick at least one place to show the offer.
                    </p>
                  )}
                </div>

                {/* limit */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <FieldLabel>Limit per order</FieldLabel>
                  <div className="mt-[7px]">
                    <Segmented>
                      <SegButton
                        active={limitMode === "none"}
                        onClick={() => setLimitMode("none")}
                      >
                        No limit
                      </SegButton>
                      <SegButton
                        active={limitMode === "one"}
                        onClick={() => setLimitMode("one")}
                      >
                        Only 1
                      </SegButton>
                      <SegButton
                        active={limitMode === "custom"}
                        onClick={() => setLimitMode("custom")}
                      >
                        Custom
                      </SegButton>
                    </Segmented>
                  </div>
                  {limitMode === "custom" && (
                    <input
                      type="number"
                      min={1}
                      value={limitValue}
                      onChange={(e) => setLimitValue(e.target.value)}
                      placeholder="e.g. 2"
                      aria-label="Maximum per order"
                      className="mt-2.5 h-9 w-28 rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] tabular-nums text-zinc-950 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  )}
                  <p className="mt-2 text-[12px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                    {limitMode === "none"
                      ? "Customers can add as many discounted units as they like."
                      : limitMode === "one"
                        ? "One discounted unit per order."
                        : maxPerOrder
                          ? `Up to ${maxPerOrder} discounted units per order.`
                          : "Enter how many discounted units one order may contain."}
                  </p>
                </div>
              </div>
            </V3Card>

            {/* preview */}
            <V3Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  Preview
                </span>
                <StatusPill tone="outline">
                  {selectedItems.length} selected
                </StatusPill>
              </div>

              {previewRows.length === 0 ? (
                <div className="px-4 py-[30px] text-center">
                  <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                    Pick an item to see the new price
                  </p>
                  <p className="mt-[3px] text-[12px] text-zinc-400 dark:text-zinc-500">
                    Selected items appear here with the discount applied.
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-h-[280px] overflow-y-auto">
                    {previewRows.map((r) => (
                      <div
                        key={r.item.id}
                        className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-[11px] dark:border-zinc-800"
                      >
                        <span
                          translate="no"
                          className="notranslate min-w-0 flex-1 truncate text-[13px] font-medium leading-[1.3] text-zinc-950 dark:text-zinc-50"
                        >
                          {r.item.name}
                        </span>
                        <span className="shrink-0 text-[12.5px] tabular-nums text-zinc-400 line-through dark:text-zinc-500">
                          {money(currency, r.was)}
                        </span>
                        <span className="min-w-[58px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                          {money(currency, r.now)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2 bg-zinc-50 px-4 py-3 dark:bg-zinc-800/40 lg:rounded-b-xl">
                    <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                      Customer saves
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums text-green-700 dark:text-green-400">
                      {money(currency, saves)}
                    </span>
                    <span className="ml-auto text-[12px] text-zinc-400 dark:text-zinc-500">
                      {channelLabel(offerType)}
                    </span>
                  </div>
                </>
              )}
            </V3Card>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------- list view */

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      <div className="flex flex-wrap items-center gap-3 px-[14px] lg:px-0">
        <h1 className="m-0 text-[15px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50 lg:text-[clamp(17px,4.2vw,19px)]">
          Offers
        </h1>
        <AdminV3Button
          variant="primary"
          className="ml-auto"
          onClick={() => setView("new")}
        >
          <Plus size={15} strokeWidth={2} />
          Create offer
        </AdminV3Button>
      </div>

      <V3Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Active offers
          </span>
          <StatusPill tone="outline">Menuthere storefront &amp; QR menu</StatusPill>
        </div>

        {!loaded ? (
          <div className="flex items-center justify-center gap-2 px-4 py-14 text-[13px] text-zinc-500 dark:text-zinc-400">
            <Loader2 size={15} className="animate-spin" />
            Loading offers…
          </div>
        ) : offers.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
              No offers running right now.
            </p>
            <p className="mx-auto mt-1 max-w-[380px] text-[12.5px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              An offer drops the price of chosen items for a set window and shows
              the old price crossed out on your menu.
            </p>
            <AdminV3Button
              variant="secondary"
              className="mt-4"
              onClick={() => setView("new")}
            >
              Create your first offer
            </AdminV3Button>
          </div>
        ) : (
          offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              currency={currency}
              tz={tz}
              deleting={!!deleting[offer.id]}
              onDelete={handleDelete(offer.id)}
              onSaveLimit={(next) => setOfferMaxPerOrder(offer.id, next)}
            />
          ))
        )}

        <div className="flex gap-2 bg-zinc-50 px-4 py-3 dark:bg-zinc-800/40 lg:rounded-b-xl">
          <Info
            size={15}
            strokeWidth={1.8}
            className="mt-px shrink-0 text-zinc-400 dark:text-zinc-500"
          />
          <span className="text-[12px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            {isPetpooja ? (
              <>
                These offers apply to your Menuthere storefront and QR menu. They
                are separate from the discounts you set up in Petpooja, which
                keep working as they do today.
              </>
            ) : (
              <>
                These offers apply to your Menuthere storefront and QR menu.
                Offers that have already ended drop off this list automatically.
              </>
            )}
          </span>
        </div>
      </V3Card>
    </div>
  );
}
