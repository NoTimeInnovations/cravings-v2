"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Settings,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { deleteDiscountMutation, getDiscountsQuery, updateDiscountMutation } from "@/api/discounts";
import { getMenu } from "@/api/menu";
import { describeBxgy } from "@/lib/bxgy";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { safeTz } from "@/lib/partnerTime";
import { useAuthStore, type Partner } from "@/store/authStore";
import { AdminV3Button, V3Card } from "./ui/primitives";
import { DiscountEditor } from "./discounts/DiscountEditor";
import { DiscountRules } from "./discounts/DiscountRules";
import { IconBtn, MetaPill, V3Segmented, V3Toggle } from "./discounts/kit";
import {
  formatOrderTypes,
  isExpired,
  isLimitReached,
  isScheduled,
  rangeLabel,
  valueLabel,
  type Discount,
  type MenuItemLite,
} from "./discounts/shared";

/**
 * admin-v3 Discounts.
 *
 * Same data path as admin-v2's DiscountCodeSettings: `getDiscountsQuery` keyed
 * on the partner, `create/update/deleteDiscountMutation` for writes, and the two
 * partner-level rules living in the shared `delivery_rules` blob. Nothing about
 * how a discount behaves changes here — only how it is presented: a filtered
 * list with per-row Enabled / Store page switches, and full-page sub-views for
 * the editor and the settings.
 *
 * DEVIATION FROM THE DESIGN: the design's third type is "Free delivery", which
 * is not a discount type in this product — free delivery is a delivery rule
 * (`src/lib/freeDelivery.ts`, Delivery settings). The type picker therefore
 * offers the four types the `discounts` table actually stores: % off, amount
 * off, free item, and buy-X-get-Y.
 */

type Filter = "all" | "active" | "expired";
type View = { kind: "list" } | { kind: "rules" } | { kind: "editor"; editing: Discount | null };

export function AdminV3Discounts() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id as string | undefined;
  const currency = partner?.currency || "₹";
  const tz = safeTz((partner as any)?.timezone);

  const [discounts, setDiscounts] = React.useState<Discount[]>([]);
  const [menuItems, setMenuItems] = React.useState<MenuItemLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [view, setView] = React.useState<View>({ kind: "list" });
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  /* ------------------------------------------------------------------ data */

  React.useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchFromHasura(getDiscountsQuery, { partner_id: partnerId });
        if (!cancelled) setDiscounts((res.discounts ?? []) as Discount[]);
      } catch {
        if (!cancelled) toast.error("Failed to load discounts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // The menu is only needed to name freebie / BXGY items, so a failure here
    // degrades the labels rather than the screen.
    (async () => {
      try {
        const res = await fetchFromHasura(getMenu, { partner_id: partnerId });
        if (!cancelled) setMenuItems((res.menu ?? []) as MenuItemLite[]);
      } catch {
        /* silent — item names simply fall back to ids */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const menuNameOf = React.useCallback(
    (id: string) => menuItems.find((m) => m.id === id)?.name,
    [menuItems],
  );

  /* --------------------------------------------------------------- writes */

  const patchRow = (id: string, patch: Partial<Discount>) =>
    setDiscounts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const toggleField = async (
    disc: Discount,
    field: "is_active" | "show_on_storefront",
    value: boolean,
  ) => {
    const previous = disc[field];
    const next: Partial<Discount> =
      field === "is_active" ? { is_active: value } : { show_on_storefront: value };
    const undo: Partial<Discount> =
      field === "is_active" ? { is_active: previous } : { show_on_storefront: previous };
    setBusyId(disc.id);
    patchRow(disc.id, next);
    try {
      await fetchFromHasura(updateDiscountMutation, { id: disc.id, updates: next });
      if (field === "show_on_storefront") {
        toast.success(
          value ? "Discount will show on your store page." : "Discount hidden from your store page.",
        );
      }
    } catch {
      patchRow(disc.id, undo);
      toast.error("Failed to update discount");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (disc: Discount) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete ${disc.code}? Customers can no longer use this code.`)
    ) {
      return;
    }
    setBusyId(disc.id);
    try {
      await fetchFromHasura(deleteDiscountMutation, { id: disc.id });
      setDiscounts((prev) => prev.filter((d) => d.id !== disc.id));
      toast.success("Discount deleted");
    } catch {
      toast.error("Failed to delete discount");
    } finally {
      setBusyId(null);
    }
  };

  const copyCode = (disc: Discount) => {
    navigator.clipboard?.writeText(disc.code);
    setCopiedId(disc.id);
    setTimeout(() => setCopiedId((c) => (c === disc.id ? null : c)), 2000);
  };

  /* -------------------------------------------------------------- derived */

  const now = Date.now();
  const expiredCount = discounts.filter((d) => isExpired(d, now)).length;
  const activeCount = discounts.filter(
    (d) => d.is_active && !isExpired(d, now) && !isScheduled(d, now) && !isLimitReached(d),
  ).length;

  const shown = discounts.filter((d) => {
    if (filter === "expired") return isExpired(d, now);
    if (filter === "active")
      return d.is_active && !isExpired(d, now) && !isScheduled(d, now) && !isLimitReached(d);
    return true;
  });

  const heading =
    filter === "active"
      ? "Active discounts"
      : filter === "expired"
        ? "Expired discounts"
        : "All discounts";

  const allPetpooja = shown.length > 0 && shown.every((d) => !!d.pp_discount_id);

  /* ----------------------------------------------------------- sub-views */

  if (view.kind === "rules") {
    return <DiscountRules onBack={() => setView({ kind: "list" })} />;
  }

  if (view.kind === "editor" && partnerId) {
    return (
      <DiscountEditor
        partnerId={partnerId}
        currency={currency}
        menuItems={menuItems}
        editing={view.editing}
        onBack={() => setView({ kind: "list" })}
        onSaved={(row, isNew) => {
          setDiscounts((prev) =>
            isNew ? [row, ...prev] : prev.map((d) => (d.id === row.id ? { ...d, ...row } : d)),
          );
          setView({ kind: "list" });
        }}
      />
    );
  }

  /* ------------------------------------------------------------------ list */

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      <div className="flex flex-wrap items-center gap-2 gap-y-2.5 px-3.5 lg:px-0">
        <V3Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${discounts.length}` },
            { value: "active", label: `Active ${activeCount}` },
            { value: "expired", label: `Expired ${expiredCount}` },
          ]}
        />
        <AdminV3Button
          variant="secondary"
          className="ml-auto px-3"
          onClick={() => setView({ kind: "rules" })}
        >
          <Settings size={15} strokeWidth={1.7} className="text-zinc-500" />
          Settings
        </AdminV3Button>
        <AdminV3Button
          variant="primary"
          className="font-medium"
          onClick={() => setView({ kind: "editor", editing: null })}
        >
          <Plus size={15} strokeWidth={2} />
          New discount
        </AdminV3Button>
      </div>

      <V3Card>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="flex-auto text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {heading}
          </span>
          <MetaPill>Lower rank wins</MetaPill>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 size={20} className="animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
            <Tag size={26} strokeWidth={1.6} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-[13.5px] font-medium leading-tight text-zinc-700 dark:text-zinc-300">
              {discounts.length === 0
                ? "No discounts yet"
                : `No ${filter === "active" ? "active" : "expired"} discounts`}
            </p>
            <p className="text-[12.5px] leading-normal text-zinc-500 dark:text-zinc-400">
              {discounts.length === 0
                ? "Create a code your customers can use at checkout."
                : "Change the filter to see the rest."}
            </p>
          </div>
        ) : (
          shown.map((d) => {
            const expired = isExpired(d, now);
            const scheduled = isScheduled(d, now);
            const limitHit = isLimitReached(d);
            const range = rangeLabel(d.starts_at, d.expires_at, tz);
            const bxgyText =
              d.discount_type === "bxgy"
                ? describeBxgy(d, { nameOf: menuNameOf, currency })
                : undefined;
            const facts: { label: string; value: string }[] = [];
            if (Number(d.min_order_value) > 0)
              facts.push({ label: "Min order", value: `${currency}${d.min_order_value}` });
            if (Number(d.max_discount_amount) > 0)
              facts.push({ label: "Cap", value: `${currency}${d.max_discount_amount}` });
            facts.push({
              label: "Used",
              value: `${d.used_count}${d.usage_limit ? ` / ${d.usage_limit}` : ""}`,
            });
            if (Number(d.per_user_usage_limit) > 0)
              facts.push({ label: "Per customer", value: String(d.per_user_usage_limit) });
            if (d.discount_order_types)
              facts.push({ label: "Order types", value: formatOrderTypes(d.discount_order_types) });
            if (d.valid_days && d.valid_days !== "All")
              facts.push({ label: "Days", value: d.valid_days });
            if (range) facts.push({ label: expired ? "Ran" : "Runs", value: range });
            if (facts.length === 1)
              facts.unshift({ label: "No minimum", value: "—" });

            return (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-zinc-100 px-4 py-3.5 last:border-b-0 dark:border-zinc-800"
              >
                <div className="min-w-0 flex-[1_1_240px]">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span
                      translate="no"
                      className="notranslate font-mono text-[13.5px] font-semibold leading-none tracking-[0.01em] text-zinc-950 dark:text-zinc-50"
                    >
                      {d.code}
                    </span>
                    <span className="whitespace-nowrap rounded-md border border-zinc-200 bg-zinc-100 px-2 py-[2px] text-[12.5px] font-semibold leading-tight text-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
                      {valueLabel(d, currency, bxgyText)}
                    </span>
                    {expired ? (
                      <StatusDot tone="red">Expired</StatusDot>
                    ) : limitHit ? (
                      <StatusDot tone="red">Limit reached</StatusDot>
                    ) : scheduled ? (
                      <StatusDot tone="amber">Scheduled</StatusDot>
                    ) : d.is_active ? (
                      <StatusDot tone="green">Active</StatusDot>
                    ) : (
                      <StatusDot tone="zinc">Off</StatusDot>
                    )}
                    {d.rank != null && (
                      <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        rank #{d.rank}
                      </span>
                    )}
                    {!d.has_coupon && (
                      <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        auto-applies, no code needed
                      </span>
                    )}
                  </div>

                  {(d.description || d.banner_text) && (
                    <div
                      translate="no"
                      className="notranslate mt-[5px] truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400"
                    >
                      {d.description || d.banner_text}
                    </div>
                  )}

                  <div className="mt-[7px] flex flex-wrap items-center gap-x-3.5 gap-y-1">
                    {facts.map((f) => (
                      <span key={f.label} className="inline-flex items-baseline gap-1.5">
                        <span className="text-[12px] font-normal leading-tight text-zinc-400 dark:text-zinc-500">
                          {f.label}
                        </span>
                        <span className="text-[12.5px] font-medium leading-tight tabular-nums text-zinc-700 dark:text-zinc-300">
                          {f.value}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2.5">
                  <SwitchCell
                    label="Enabled"
                    checked={d.is_active}
                    disabled={busyId === d.id || expired || limitHit}
                    onChange={(v) => toggleField(d, "is_active", v)}
                  />
                  <SwitchCell
                    label="Store page"
                    checked={d.show_on_storefront ?? true}
                    disabled={busyId === d.id}
                    onChange={(v) => toggleField(d, "show_on_storefront", v)}
                  />
                  {d.pp_discount_id && (
                    <MetaPill
                      title={
                        d.pp_overwrite_enabled
                          ? "Managed in Petpooja — the next menu sync overwrites it."
                          : "From Petpooja, protected from the next menu sync."
                      }
                    >
                      <Lock size={12} strokeWidth={1.8} className="text-zinc-400" />
                      Petpooja
                    </MetaPill>
                  )}
                  <div className="flex items-center gap-1.5">
                    <IconBtn label="Copy code" onClick={() => copyCode(d)}>
                      {copiedId === d.id ? (
                        <Check size={15} strokeWidth={2} className="text-green-600" />
                      ) : (
                        <Copy size={15} strokeWidth={1.7} />
                      )}
                    </IconBtn>
                    <IconBtn
                      label="Edit discount"
                      onClick={() => setView({ kind: "editor", editing: d })}
                    >
                      <Pencil size={15} strokeWidth={1.7} />
                    </IconBtn>
                    <IconBtn
                      label="Delete discount"
                      danger
                      disabled={busyId === d.id}
                      onClick={() => handleDelete(d)}
                    >
                      <Trash2 size={15} strokeWidth={1.7} />
                    </IconBtn>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {allPetpooja && (
          <div className="flex gap-2 rounded-b-none bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50 lg:rounded-b-xl">
            <Lock
              size={14}
              strokeWidth={1.8}
              className="mt-[1px] shrink-0 text-zinc-400 dark:text-zinc-500"
            />
            <span className="text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500">
              {shown.length === 1 ? "This code is" : `All ${shown.length} codes are`} managed in
              Petpooja — edit the rules there, or use the switches here to control where they
              appear.
            </span>
          </div>
        )}
      </V3Card>
    </div>
  );
}

/* ---------------------------------------------------------------- atoms */

function StatusDot({
  tone,
  children,
}: {
  tone: "green" | "red" | "amber" | "zinc";
  children: React.ReactNode;
}) {
  const skin =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
          : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
  const dot =
    tone === "green"
      ? "bg-green-600"
      : tone === "red"
        ? "bg-red-600"
        : tone === "amber"
          ? "bg-amber-500"
          : "bg-zinc-400 dark:bg-zinc-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none ${skin}`}
    >
      <span className={`h-[6px] w-[6px] rounded-full ${dot}`} />
      {children}
    </span>
  );
}

function SwitchCell({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-[5px]">
      <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <V3Toggle checked={checked} disabled={disabled} onChange={onChange} label={label} />
    </div>
  );
}
