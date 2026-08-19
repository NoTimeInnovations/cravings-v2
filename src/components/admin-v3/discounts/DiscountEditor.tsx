"use client";

import * as React from "react";
import { CalendarDays, Check, Info, Loader2, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { createDiscountMutation, updateDiscountMutation } from "@/api/discounts";
import { describeBxgy, type BxgyBuyType, type BxgyRewardType } from "@/lib/bxgy";
import { cn } from "@/lib/utils";
import { AdminV3Button, V3Card } from "../ui/primitives";
import {
  CardHead,
  ChipButton,
  MenuItemPicker,
  MetaPill,
  SubViewHeader,
  ToggleRow,
  V3Field,
  V3Hint,
  V3Input,
  V3Label,
  V3Segmented,
  V3Textarea,
  type PickedItem,
} from "./kit";
import {
  ALL_DAYS,
  EMPTY_FORM,
  ORDER_TYPES,
  daysOf,
  generateCode,
  localDatetimeIn,
  toLocalDatetime,
  type Discount,
  type DiscountForm,
  type DiscountType,
  type MenuItemLite,
} from "./shared";

type RunMode = "none" | "7" | "30" | "custom";

/* ------------------------------------------------------------------ helpers */

function formFrom(disc: Discount | null): DiscountForm {
  if (!disc) return { ...EMPTY_FORM };
  const types = disc.discount_order_types
    ? disc.discount_order_types
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : ["1", "2", "3"];
  return {
    code: disc.code,
    description: disc.description ?? "",
    terms_conditions: disc.terms_conditions ?? "",
    discount_type: disc.discount_type,
    discount_value:
      disc.discount_type === "freebie" || disc.discount_type === "bxgy"
        ? ""
        : String(disc.discount_value ?? ""),
    min_order_value: disc.min_order_value != null ? String(disc.min_order_value) : "",
    max_discount_amount:
      disc.max_discount_amount != null ? String(disc.max_discount_amount) : "",
    usage_limit: disc.usage_limit != null ? String(disc.usage_limit) : "",
    per_user_usage_limit:
      disc.per_user_usage_limit != null ? String(disc.per_user_usage_limit) : "",
    starts_at: toLocalDatetime(disc.starts_at),
    expires_at: toLocalDatetime(disc.expires_at),
    discount_order_types: types,
    discount_on_total: disc.discount_on_total,
    has_coupon: disc.has_coupon,
    applicable_on: disc.applicable_on ?? "All",
    category_item_ids: disc.category_item_ids ?? "",
    rank: disc.rank != null ? String(disc.rank) : "",
    freebie_item_ids: disc.freebie_item_ids ?? "",
    freebie_item_count:
      disc.freebie_item_count != null ? String(disc.freebie_item_count) : "",
    show_on_storefront: disc.show_on_storefront ?? true,
    show_in_checkout: disc.show_in_checkout ?? true,
    banner_text: disc.banner_text ?? "",
    bxgy_buy_type: (disc.bxgy_buy_type as BxgyBuyType) ?? "items",
    bxgy_buy_item_ids: disc.bxgy_buy_item_ids ?? "",
    bxgy_buy_quantity: disc.bxgy_buy_quantity != null ? String(disc.bxgy_buy_quantity) : "2",
    bxgy_buy_value: disc.bxgy_buy_value != null ? String(disc.bxgy_buy_value) : "",
    bxgy_reward_type: (disc.bxgy_reward_type as BxgyRewardType) ?? "freebie",
    bxgy_reward_value: disc.bxgy_reward_value != null ? String(disc.bxgy_reward_value) : "",
    bxgy_max_repeat: disc.bxgy_max_repeat != null ? String(disc.bxgy_max_repeat) : "1",
  };
}

/* ------------------------------------------------------------------- screen */

export function DiscountEditor({
  partnerId,
  currency,
  menuItems,
  editing,
  onBack,
  onSaved,
}: {
  partnerId: string;
  currency: string;
  menuItems: MenuItemLite[];
  /** NULL = create a new discount. */
  editing: Discount | null;
  onBack: () => void;
  onSaved: (row: Discount, isNew: boolean) => void;
}) {
  const [form, setForm] = React.useState<DiscountForm>(() => formFrom(editing));
  const [days, setDays] = React.useState<string[]>(() => daysOf(editing?.valid_days ?? null));
  const [runMode, setRunMode] = React.useState<RunMode>(() =>
    editing?.expires_at ? "custom" : "none",
  );
  const [saving, setSaving] = React.useState(false);

  const patch = (p: Partial<DiscountForm>) => setForm((prev) => ({ ...prev, ...p }));

  // Chips are resolved from the menu cache, so they hydrate as soon as the menu
  // lands — an edit opened before the fetch settles still fills in.
  const chipsFor = React.useCallback(
    (csv: string): PickedItem[] =>
      csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((id) => menuItems.find((m) => m.id === id))
        .filter((m): m is MenuItemLite => !!m)
        .map((m) => ({ id: m.id, name: m.name })),
    [menuItems],
  );

  const menuNameOf = React.useCallback(
    (id: string) => menuItems.find((m) => m.id === id)?.name,
    [menuItems],
  );

  const isPct = form.discount_type === "percentage";
  const isFlat = form.discount_type === "flat";
  const isFreebie = form.discount_type === "freebie";
  const isBxgy = form.discount_type === "bxgy";
  const wantsFreebieItems = isFreebie || (isBxgy && form.bxgy_reward_type === "freebie");

  const freebieChips = wantsFreebieItems ? chipsFor(form.freebie_item_ids) : [];
  const bxgyBuyChips = isBxgy ? chipsFor(form.bxgy_buy_item_ids) : [];

  /* ----------------------------------------------------------- derived copy */

  const bxgyText = React.useMemo(
    () =>
      describeBxgy(
        {
          bxgy_buy_type: form.bxgy_buy_type,
          bxgy_buy_item_ids: form.bxgy_buy_item_ids,
          bxgy_buy_quantity: form.bxgy_buy_quantity,
          bxgy_buy_value: form.bxgy_buy_value,
          bxgy_reward_type: form.bxgy_reward_type,
          bxgy_reward_value: form.bxgy_reward_value,
          bxgy_max_repeat: form.bxgy_max_repeat,
          freebie_item_ids: form.freebie_item_ids,
          freebie_item_count: form.freebie_item_count,
        },
        { nameOf: menuNameOf, currency },
      ),
    [form, menuNameOf, currency],
  );

  const dealLine = isPct
    ? `${form.discount_value || "—"}% off`
    : isFlat
      ? `${currency}${form.discount_value || "—"} off`
      : isFreebie
        ? freebieChips.length
          ? `Free ${freebieChips.map((c) => c.name).join(", ")}`
          : "A free item"
        : bxgyText || "Buy X, get Y";

  const autoBanner = form.min_order_value
    ? `${dealLine} on orders above ${currency}${form.min_order_value}`
    : dealLine;

  const daysLabel =
    days.length === 0 || days.length === 7
      ? "Every day"
      : `Only ${days.join(", ")}`;

  const rangeCopy =
    runMode === "none"
      ? form.starts_at
        ? "Starts on the date you set and runs until you turn it off."
        : "Runs from now until you turn it off."
      : form.expires_at
        ? `Ends ${new Date(form.expires_at).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })}`
        : "Pick an end date.";

  const summary = React.useMemo(() => {
    const bits: string[] = [];
    bits.push(
      form.has_coupon
        ? `Customers who type ${form.code.trim().toUpperCase() || "the code"} get ${dealLine.toLowerCase()}`
        : `Every qualifying cart automatically gets ${dealLine.toLowerCase()}`,
    );
    if (form.min_order_value) bits.push(`on orders of ${currency}${form.min_order_value} or more`);
    if (isPct && form.max_discount_amount)
      bits.push(`capped at ${currency}${form.max_discount_amount}`);
    const typeNames = ORDER_TYPES.filter((t) => form.discount_order_types.includes(t.value)).map(
      (t) => t.label,
    );
    if (typeNames.length && typeNames.length < 3) bits.push(`on ${typeNames.join(" and ")} orders`);
    if (days.length && days.length < 7) bits.push(`on ${days.join(", ")}`);
    if (form.applicable_on !== "All") bits.push("on the chosen items only");
    if (form.usage_limit) bits.push(`for the first ${form.usage_limit} uses`);
    if (form.per_user_usage_limit)
      bits.push(`${form.per_user_usage_limit} time(s) per customer`);
    if (runMode !== "none" && form.expires_at)
      bits.push(
        `until ${new Date(form.expires_at).toLocaleDateString([], { dateStyle: "medium" })}`,
      );
    return `${bits.join(", ")}.`;
  }, [form, days, runMode, dealLine, currency, isPct]);

  /* --------------------------------------------------------------- actions */

  const setRun = (mode: RunMode) => {
    setRunMode(mode);
    if (mode === "none") patch({ expires_at: "" });
    else if (mode === "7") patch({ expires_at: localDatetimeIn(7) });
    else if (mode === "30") patch({ expires_at: localDatetimeIn(30) });
  };

  const toggleDay = (day: string) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const toggleOrderType = (value: string) =>
    patch({
      discount_order_types: form.discount_order_types.includes(value)
        ? form.discount_order_types.filter((v) => v !== value)
        : [...form.discount_order_types, value],
    });

  const ready =
    (isFreebie
      ? form.freebie_item_ids.trim() !== ""
      : isBxgy
        ? true
        : !!form.discount_value && Number(form.discount_value) > 0) &&
    (form.code.trim() !== "" || !form.has_coupon);

  const buildPayload = (forUpdate: boolean, code: string) => {
    // max_discount_amount caps a percentage discount, and any BXGY reward — a
    // repeating flat/freebie reward is exactly where a cap earns its keep.
    const capsApply = isPct || isBxgy;
    const payload: Record<string, any> = {
      code,
      discount_type: form.discount_type,
      // discount_value is NOT NULL; the types that carry their amount elsewhere
      // store 0 rather than leaving the column unset.
      discount_value: isFreebie || isBxgy ? 0 : Number(form.discount_value),
      discount_on_total: form.discount_on_total,
      has_coupon: form.has_coupon,
      applicable_on: form.applicable_on,
      valid_days: days.length === 0 || days.length === 7 ? "All" : days.join(","),
      discount_order_types: form.discount_order_types.join(","),
      description: form.description.trim() || null,
      terms_conditions: form.terms_conditions.trim() || null,
      // A typed "0" means "no minimum" / "no cap", which is what NULL already
      // means to every consumer — and React renders a literal 0 on the
      // storefront card, so it is stored as NULL.
      min_order_value: Number(form.min_order_value) > 0 ? Number(form.min_order_value) : null,
      max_discount_amount:
        capsApply && Number(form.max_discount_amount) > 0
          ? Number(form.max_discount_amount)
          : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_user_usage_limit: form.per_user_usage_limit
        ? Number(form.per_user_usage_limit)
        : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      rank: form.rank ? Number(form.rank) : null,
      category_item_ids:
        form.applicable_on !== "All" && form.category_item_ids.trim()
          ? form.category_item_ids.trim()
          : null,
      freebie_item_ids: wantsFreebieItems ? form.freebie_item_ids.trim() : null,
      freebie_item_count: wantsFreebieItems
        ? form.freebie_item_count
          ? Number(form.freebie_item_count)
          : 1
        : null,
      show_on_storefront: form.show_on_storefront,
      show_in_checkout: form.show_in_checkout,
      banner_text: form.banner_text.trim() || null,
      // Every bxgy_* column is cleared on the other types, so switching an
      // existing discount away from BXGY doesn't leave a stale condition behind.
      bxgy_buy_type: isBxgy ? form.bxgy_buy_type : null,
      bxgy_buy_item_ids:
        isBxgy && form.bxgy_buy_type === "items" ? form.bxgy_buy_item_ids.trim() : null,
      bxgy_buy_quantity:
        isBxgy && form.bxgy_buy_type !== "order_value"
          ? Number(form.bxgy_buy_quantity) || 1
          : null,
      bxgy_buy_value:
        isBxgy && form.bxgy_buy_type === "order_value" ? Number(form.bxgy_buy_value) || 0 : null,
      bxgy_reward_type: isBxgy ? form.bxgy_reward_type : null,
      bxgy_reward_value:
        isBxgy && form.bxgy_reward_type !== "freebie"
          ? Number(form.bxgy_reward_value) || 0
          : null,
      // A percentage reward is applied once however many times the cart
      // qualifies, so it stores no repeat at all.
      bxgy_max_repeat:
        isBxgy && form.bxgy_reward_type !== "percentage"
          ? Number(form.bxgy_max_repeat) || 1
          : null,
    };
    if (!forUpdate) {
      payload.partner_id = partnerId;
      payload.is_active = true;
      payload.used_count = 0;
    }
    return payload;
  };

  const handleSave = async () => {
    // The code is what the CUSTOMER types, so it is only required when the
    // discount actually asks for one. An auto-applying discount still needs one
    // internally (NOT NULL, half of the (partner_id, code) key, and written onto
    // every order that used it), so generate rather than demand it.
    const code = form.code.trim().toUpperCase() || (form.has_coupon ? "" : generateCode());
    if (!code) return toast.error("Code is required");

    if (!isFreebie && !isBxgy) {
      if (!form.discount_value || Number(form.discount_value) <= 0)
        return toast.error("Discount value must be greater than 0");
      if (isPct && Number(form.discount_value) > 100)
        return toast.error("Percentage cannot exceed 100");
    }
    if (isFreebie && !form.freebie_item_ids.trim())
      return toast.error("Pick the free item(s) to give");

    if (isBxgy) {
      if (form.bxgy_buy_type === "order_value") {
        if (!form.bxgy_buy_value || Number(form.bxgy_buy_value) <= 0)
          return toast.error("Set the order value that earns the reward");
      } else {
        if (!form.bxgy_buy_quantity || Number(form.bxgy_buy_quantity) <= 0)
          return toast.error("Set how many items the customer must buy");
        if (form.bxgy_buy_type === "items" && !form.bxgy_buy_item_ids.trim())
          return toast.error("Pick the items that count towards the offer");
      }
      if (form.bxgy_reward_type === "freebie") {
        if (!form.freebie_item_ids.trim()) return toast.error("Pick the free item(s) to give");
      } else {
        if (!form.bxgy_reward_value || Number(form.bxgy_reward_value) <= 0)
          return toast.error("Reward value must be greater than 0");
        if (form.bxgy_reward_type === "percentage" && Number(form.bxgy_reward_value) > 100)
          return toast.error("Percentage cannot exceed 100");
      }
    }

    setSaving(true);
    try {
      if (editing) {
        const res = await fetchFromHasura(updateDiscountMutation, {
          id: editing.id,
          updates: buildPayload(true, code),
        });
        onSaved(res.update_discounts_by_pk as Discount, false);
        toast.success("Discount updated");
      } else {
        const res = await fetchFromHasura(createDiscountMutation, {
          object: buildPayload(false, code),
        });
        onSaved(res.insert_discounts_one as Discount, true);
        toast.success("Discount created");
      }
    } catch (err: any) {
      if (err?.message?.includes("Uniqueness violation") || err?.message?.includes("unique")) {
        toast.error("A discount with this code already exists");
      } else {
        toast.error(editing ? "Failed to update discount" : "Failed to create discount");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------------- quick */

  const quickPicks = isPct ? ["10", "15", "20"] : ["50", "100", "200"];

  /* ------------------------------------------------------------------ view */

  return (
    <div className="flex flex-col">
      <SubViewHeader
        title={editing ? "Edit discount" : "New discount"}
        subtitle={ready ? dealLine : "Fill in the deal to save it"}
        onBack={onBack}
      >
        <AdminV3Button variant="secondary" className="h-[34px] px-3" onClick={onBack}>
          Cancel
        </AdminV3Button>
        <AdminV3Button
          variant="primary"
          className="h-[34px] font-medium"
          disabled={!ready || saving}
          onClick={handleSave}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {editing ? "Save changes" : "Create discount"}
        </AdminV3Button>
      </SubViewHeader>

      <div className="flex flex-wrap items-start gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* ------------------------------------------------------- left column */}
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
          <V3Card>
            <CardHead title="The deal" />
            <div className="flex flex-col gap-3.5 px-4 py-3.5">
              <div>
                <V3Label>Code</V3Label>
                <div className="mt-1.5 flex gap-2">
                  <V3Input
                    translate="no"
                    className="notranslate flex-auto font-mono font-semibold uppercase tracking-[0.02em]"
                    value={form.code}
                    onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                    placeholder={form.has_coupon ? "SAVE10" : "Leave blank to generate one"}
                  />
                  <AdminV3Button
                    variant="secondary"
                    className="h-9 shrink-0 px-3"
                    onClick={() => patch({ code: generateCode() })}
                  >
                    <Sparkles size={14} strokeWidth={1.7} className="text-zinc-500" />
                    Generate
                  </AdminV3Button>
                </div>
                <V3Hint className="mt-1.5">
                  Customers type this at checkout. Turn off &ldquo;Requires a code&rdquo; to
                  auto-apply it instead.
                </V3Hint>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <V3Label>Type</V3Label>
                <div className="mt-[7px]">
                  <V3Segmented<DiscountType>
                    value={form.discount_type}
                    onChange={(v) => patch({ discount_type: v })}
                    options={[
                      { value: "percentage", label: "% off" },
                      { value: "flat", label: `${currency} off` },
                      { value: "freebie", label: "Free item" },
                      { value: "bxgy", label: "Buy X get Y" },
                    ]}
                  />
                </div>

                {(isPct || isFlat) && (
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <div className="flex h-[38px] min-w-0 flex-[1_1_130px] items-center gap-2 rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
                      <span className="shrink-0 text-sm font-medium text-zinc-400 dark:text-zinc-500">
                        {isPct ? "" : currency}
                      </span>
                      <input
                        inputMode="decimal"
                        value={form.discount_value}
                        onChange={(e) => patch({ discount_value: e.target.value })}
                        placeholder="0"
                        className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold tabular-nums text-zinc-950 outline-none placeholder:text-zinc-300 dark:text-zinc-50 dark:placeholder:text-zinc-600"
                      />
                      <span className="shrink-0 text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
                        {isPct ? "%" : "off"}
                      </span>
                    </div>
                    {quickPicks.map((q) => (
                      <ChipButton
                        key={q}
                        onClick={() => patch({ discount_value: q })}
                        active={form.discount_value === q}
                        className="h-[38px] text-[12.5px]"
                      >
                        {isPct ? `${q}%` : `${currency}${q}`}
                      </ChipButton>
                    ))}
                  </div>
                )}

                {isFreebie && (
                  <div className="mt-3 flex flex-col gap-3">
                    <MenuItemPicker
                      label="Free item(s)"
                      hint="the customer gets all of these"
                      currency={currency}
                      menuItems={menuItems}
                      selected={freebieChips}
                      onChange={(next) =>
                        patch({
                          freebie_item_ids: next.map((i) => i.id).join(","),
                          freebie_item_count: String(form.freebie_item_count || next.length || 1),
                        })
                      }
                    />
                    <V3Field label="Free units of each item" hint="per reward" className="max-w-[180px]">
                      <V3Input
                        inputMode="numeric"
                        value={form.freebie_item_count}
                        onChange={(e) => patch({ freebie_item_count: e.target.value })}
                        placeholder="1"
                        className="tabular-nums"
                      />
                    </V3Field>
                  </div>
                )}

                {isBxgy && (
                  <div className="mt-3 flex flex-col gap-3.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                        Buy X, get Y
                      </span>
                      <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                        {bxgyText}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <V3Field label="Customer must…" className="flex-[1_1_180px]">
                        <V3Segmented<BxgyBuyType>
                          value={form.bxgy_buy_type}
                          onChange={(v) => patch({ bxgy_buy_type: v })}
                          options={[
                            { value: "items", label: "Buy items" },
                            { value: "quantity", label: "Buy any" },
                            { value: "order_value", label: "Spend" },
                          ]}
                        />
                      </V3Field>
                      {form.bxgy_buy_type === "order_value" ? (
                        <V3Field label={`Order value (${currency})`} className="flex-[1_1_150px]">
                          <V3Input
                            inputMode="decimal"
                            value={form.bxgy_buy_value}
                            onChange={(e) => patch({ bxgy_buy_value: e.target.value })}
                            placeholder="500"
                            className="tabular-nums"
                          />
                        </V3Field>
                      ) : (
                        <V3Field label="Quantity to buy" className="flex-[1_1_150px]">
                          <V3Input
                            inputMode="numeric"
                            value={form.bxgy_buy_quantity}
                            onChange={(e) => patch({ bxgy_buy_quantity: e.target.value })}
                            placeholder="2"
                            className="tabular-nums"
                          />
                        </V3Field>
                      )}
                    </div>

                    {form.bxgy_buy_type === "items" && (
                      <MenuItemPicker
                        label="Qualifying items"
                        hint="any of these count"
                        currency={currency}
                        menuItems={menuItems}
                        selected={bxgyBuyChips}
                        onChange={(next) =>
                          patch({ bxgy_buy_item_ids: next.map((i) => i.id).join(",") })
                        }
                      />
                    )}

                    <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-3.5 dark:border-zinc-700">
                      <V3Field label="…and gets" className="flex-[1_1_180px]">
                        <V3Segmented<BxgyRewardType>
                          value={form.bxgy_reward_type}
                          onChange={(v) => patch({ bxgy_reward_type: v })}
                          options={[
                            { value: "freebie", label: "Free item" },
                            { value: "flat", label: `${currency} off` },
                            { value: "percentage", label: "% off" },
                          ]}
                        />
                      </V3Field>
                      {form.bxgy_reward_type !== "freebie" && (
                        <V3Field
                          label={
                            form.bxgy_reward_type === "percentage"
                              ? "Reward (%)"
                              : `Reward (${currency})`
                          }
                          className="flex-[1_1_150px]"
                        >
                          <V3Input
                            inputMode="decimal"
                            value={form.bxgy_reward_value}
                            onChange={(e) => patch({ bxgy_reward_value: e.target.value })}
                            placeholder={form.bxgy_reward_type === "percentage" ? "50" : "100"}
                            className="tabular-nums"
                          />
                        </V3Field>
                      )}
                      {form.bxgy_reward_type !== "percentage" && (
                        <V3Field
                          label="Max times per order"
                          hint="buy 4 on a “buy 2” → 2 rewards"
                          className="flex-[1_1_150px]"
                        >
                          <V3Input
                            inputMode="numeric"
                            value={form.bxgy_max_repeat}
                            onChange={(e) => patch({ bxgy_max_repeat: e.target.value })}
                            placeholder="1"
                            className="tabular-nums"
                          />
                        </V3Field>
                      )}
                    </div>

                    {form.bxgy_reward_type === "freebie" && (
                      <div className="flex flex-col gap-3">
                        <MenuItemPicker
                          label="Free item(s)"
                          hint="the customer gets all of these"
                          currency={currency}
                          menuItems={menuItems}
                          selected={freebieChips}
                          onChange={(next) =>
                            patch({ freebie_item_ids: next.map((i) => i.id).join(",") })
                          }
                        />
                        <V3Field
                          label="Free units of each item"
                          hint="per reward"
                          className="max-w-[180px]"
                        >
                          <V3Input
                            inputMode="numeric"
                            value={form.freebie_item_count}
                            onChange={(e) => patch({ freebie_item_count: e.target.value })}
                            placeholder="1"
                            className="tabular-nums"
                          />
                        </V3Field>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </V3Card>

          <V3Card>
            <CardHead title="When it applies" right={<MetaPill>All optional</MetaPill>} />
            <div className="flex flex-col gap-3.5 px-4 py-3.5">
              <div className="flex flex-wrap gap-3">
                <V3Field label="Minimum order" className="flex-[1_1_150px]">
                  <V3Input
                    inputMode="decimal"
                    value={form.min_order_value}
                    onChange={(e) => patch({ min_order_value: e.target.value })}
                    placeholder="No minimum"
                    className="tabular-nums"
                  />
                </V3Field>
                {(isPct || isBxgy) && (
                  <V3Field label="Cap the discount at" className="flex-[1_1_150px]">
                    <V3Input
                      inputMode="decimal"
                      value={form.max_discount_amount}
                      onChange={(e) => patch({ max_discount_amount: e.target.value })}
                      placeholder="No cap"
                      className="tabular-nums"
                    />
                  </V3Field>
                )}
              </div>

              <div>
                <V3Label>Order types</V3Label>
                <div className="mt-[7px] flex flex-wrap gap-[7px]">
                  {ORDER_TYPES.map((t) => {
                    const on = form.discount_order_types.includes(t.value);
                    return (
                      <ChipButton key={t.value} active={on} onClick={() => toggleOrderType(t.value)}>
                        {on && <Check size={13} strokeWidth={2.6} />}
                        {t.label}
                      </ChipButton>
                    );
                  })}
                </div>
              </div>

              <div>
                <V3Label>Applies to</V3Label>
                <div className="mt-[7px]">
                  <V3Segmented<string>
                    value={form.applicable_on === "All" ? "All" : "Specific"}
                    onChange={(v) => patch({ applicable_on: v })}
                    options={[
                      { value: "All", label: "Whole bill" },
                      { value: "Specific", label: "Chosen items" },
                    ]}
                  />
                </div>
                {form.applicable_on !== "All" && (
                  <div className="mt-2.5">
                    <V3Input
                      value={form.category_item_ids}
                      onChange={(e) => patch({ category_item_ids: e.target.value })}
                      placeholder="Category / item IDs, comma separated"
                    />
                    <V3Hint className="mt-1.5">
                      Same field as the old dashboard: a comma-separated list of category or item
                      IDs the discount is drawn against.
                    </V3Hint>
                  </div>
                )}
              </div>

              <div>
                <V3Label>Days</V3Label>
                <div className="mt-[7px] flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((d) => {
                    const on = days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={cn(
                          "h-[34px] w-10 shrink-0 rounded-md border text-[12.5px] font-medium leading-none transition-colors",
                          on
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                        )}
                      >
                        {d.slice(0, 1)}
                      </button>
                    );
                  })}
                </div>
                <V3Hint className="mt-[7px]">{daysLabel}</V3Hint>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <V3Label>Runs</V3Label>
                <div className="mt-[7px]">
                  <V3Segmented<RunMode>
                    value={runMode}
                    onChange={setRun}
                    options={[
                      { value: "none", label: "No end date" },
                      { value: "7", label: "7 days" },
                      { value: "30", label: "30 days" },
                      { value: "custom", label: "Custom" },
                    ]}
                  />
                </div>
                {runMode === "custom" && (
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <div className="min-w-0 flex-[1_1_140px]">
                      <V3Hint className="mb-[5px]">Start</V3Hint>
                      <V3Input
                        type="datetime-local"
                        value={form.starts_at}
                        onChange={(e) => patch({ starts_at: e.target.value })}
                      />
                    </div>
                    <div className="min-w-0 flex-[1_1_140px]">
                      <V3Hint className="mb-[5px]">End</V3Hint>
                      <V3Input
                        type="datetime-local"
                        value={form.expires_at}
                        onChange={(e) => patch({ expires_at: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-2.5 flex items-center gap-[7px]">
                  <CalendarDays
                    size={14}
                    strokeWidth={1.8}
                    className="shrink-0 text-zinc-400 dark:text-zinc-500"
                  />
                  <V3Hint>{rangeCopy}</V3Hint>
                </div>
              </div>
            </div>
          </V3Card>
        </div>

        {/* ------------------------------------------------------ right column */}
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <V3Card>
            <CardHead title="Limits & visibility" />
            <div className="flex flex-col gap-3.5 px-4 pb-1 pt-3.5">
              <div className="flex flex-wrap gap-3">
                <V3Field label="Total uses" hint="blank = unlimited" className="flex-[1_1_150px]">
                  <V3Input
                    inputMode="numeric"
                    autoComplete="off"
                    name="discount-usage-limit"
                    value={form.usage_limit}
                    onChange={(e) => patch({ usage_limit: e.target.value })}
                    placeholder="Unlimited"
                    className="tabular-nums"
                  />
                </V3Field>
                <V3Field label="Per customer" hint="blank = unlimited" className="flex-[1_1_150px]">
                  <V3Input
                    inputMode="numeric"
                    autoComplete="off"
                    name="discount-per-user-usage-limit"
                    value={form.per_user_usage_limit}
                    onChange={(e) => patch({ per_user_usage_limit: e.target.value })}
                    placeholder="Unlimited"
                    className="tabular-nums"
                  />
                </V3Field>
                <V3Field label="Rank" hint="lower wins" className="flex-[1_1_150px]">
                  <V3Input
                    inputMode="numeric"
                    value={form.rank}
                    onChange={(e) => patch({ rank: e.target.value })}
                    placeholder="1"
                    className="tabular-nums"
                  />
                </V3Field>
              </div>

              <div>
                <ToggleRow
                  title="Requires a code"
                  description="Off means it applies automatically once the cart qualifies."
                  checked={form.has_coupon}
                  onChange={(v) => patch({ has_coupon: v })}
                />
                <ToggleRow
                  title="List it at checkout"
                  description="On: every customer sees it in the checkout coupon list. Off: it still works, but only for someone who already knows the code."
                  checked={form.has_coupon && form.show_in_checkout}
                  disabled={!form.has_coupon}
                  onChange={(v) => patch({ show_in_checkout: v })}
                />
                <ToggleRow
                  title="Apply to the bill total"
                  description="On: the discount comes off the whole bill. Off: it is drawn against the items only, before charges."
                  checked={form.discount_on_total}
                  onChange={(v) => patch({ discount_on_total: v })}
                />
                <ToggleRow
                  title="Show on the store page"
                  description="Adds a banner so customers can see the deal without knowing the code."
                  checked={form.show_on_storefront}
                  onChange={(v) => patch({ show_on_storefront: v })}
                  last
                />
              </div>
            </div>

            {form.show_on_storefront && (
              <div className="flex flex-col gap-3 px-4 pb-3.5">
                <V3Field
                  label="Banner text"
                  hint="optional"
                  below="Leave blank to use the line generated from the rule."
                >
                  <V3Input
                    translate="no"
                    className="notranslate"
                    maxLength={80}
                    value={form.banner_text}
                    onChange={(e) => patch({ banner_text: e.target.value })}
                    placeholder={autoBanner}
                  />
                </V3Field>
                <V3Field label="Terms" hint="optional, shown under the banner">
                  <V3Textarea
                    translate="no"
                    className="notranslate"
                    rows={2}
                    value={form.terms_conditions}
                    onChange={(e) => patch({ terms_conditions: e.target.value })}
                    placeholder={`e.g. Valid on orders above ${currency}499 · Max discount ${currency}150`}
                  />
                </V3Field>
                <V3Field label="Description" hint="optional, shown to customers">
                  <V3Textarea
                    translate="no"
                    className="notranslate"
                    rows={2}
                    value={form.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="e.g. Weekend special — 10% off orders above ₹499"
                  />
                </V3Field>
              </div>
            )}
          </V3Card>

          <V3Card>
            <CardHead title="What customers see" />
            <div className="p-4">
              <div className="rounded-[10px] border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                    <Tag size={16} strokeWidth={1.7} />
                  </span>
                  <span
                    translate="no"
                    className="notranslate min-w-0 text-sm font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                  >
                    {form.banner_text.trim() || autoBanner}
                  </span>
                </div>
                <div
                  translate="no"
                  className="notranslate mt-2.5 text-[12.5px] font-normal leading-normal text-zinc-600 dark:text-zinc-300"
                >
                  {form.description.trim() ||
                    form.terms_conditions.trim() ||
                    (form.min_order_value
                      ? `Valid on orders above ${currency}${form.min_order_value}.`
                      : "Valid on any order that qualifies.")}
                </div>
                {form.has_coupon ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed border-zinc-400 bg-white px-[11px] py-[7px] dark:border-zinc-600 dark:bg-zinc-900">
                    <span
                      translate="no"
                      className="notranslate font-mono text-[13px] font-semibold tracking-[0.06em] text-zinc-950 dark:text-zinc-50"
                    >
                      {form.code.trim().toUpperCase() || "SAVE10"}
                    </span>
                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
                      tap to copy
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <Check size={12} strokeWidth={2.4} className="text-green-600" />
                    Applied automatically
                  </div>
                )}
              </div>
              {!form.show_on_storefront && (
                <div className="mt-3 flex gap-2">
                  <Info
                    size={14}
                    strokeWidth={1.8}
                    className="mt-[1px] shrink-0 text-zinc-400 dark:text-zinc-500"
                  />
                  <V3Hint>
                    Hidden from the store page — customers only get it if you share the code.
                  </V3Hint>
                </div>
              )}
            </div>
          </V3Card>

          <V3Card className="px-4 py-3.5">
            <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
              In plain words
            </div>
            <div className="mt-2 text-[13px] font-normal leading-relaxed text-zinc-700 dark:text-zinc-300">
              {summary}
            </div>
          </V3Card>
        </div>
      </div>
    </div>
  );
}
