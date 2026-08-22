"use client";

import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { setProviderGroups } from "@/app/actions/deliveryConnect";

import { mergePrebookingConfig, parseOrderTypesEnabled } from "@/lib/prebooking";
import type { FeatureFlags } from "@/lib/getFeatures";
import { settingsTabVisible } from "@/lib/adminNav";

import {
  Chip,
  FieldRow,
  Note,
  NumberField,
  SegmentedField,
  SettingsCard,
  ToggleRow,
  currencyOf,
  num,
  useSectionDraft,
} from "./controls";
import { ProviderAccounts, ProviderAccountsEntry } from "./ProviderAccounts";
import { useBackOrReturn } from "../useV3Navigate";

/* ------------------------------------------------------------------ draft */

interface OrderingDraft {
  delivery: boolean;
  takeaway: boolean;
  dine_in: boolean;

  parcel_charge: number;
  parcel_charge_type: "fixed" | "variable" | "itemwise";
  /** delivery_rules.round_off — a charge-line setting, so it lives with them. */
  round_off: boolean;

  prebooking_enabled: boolean;
  slot_booking_enabled: boolean;
  min_lead_time_minutes: number;
  rolling_interval_minutes: number;
  max_advance_days: number;

  need_user_name: boolean;
  need_address_details: boolean;
  /** delivery_rules.auto_accept_orders — applied server-side on the Hasura
   *  order event, so it covers POS and API orders too. */
  auto_accept_orders: boolean;

  delivery_radius: number;
  minimum_order_amount: number;
  first_km: number;
  first_km_rate: number;
  delivery_rate: number;
  free_delivery_enabled: boolean;
  free_delivery_min_order: number;
  hide_delivery_charge: boolean;
  pool_pickup_otp: boolean;
  pool_drop_otp: boolean;

  delivery_vehicle_mode: string;
  delivery_wait_seconds: number;
  porter_auto_dispatch: boolean;
  porter_dispatch_trigger: string;
  porter_dispatch_delay_min: number;
  porter_pricing_mode: string;
  delivery_provider_priority: string[];
  /** delivery_rules.delivery_provider_groups — one group number per provider. */
  provider_groups: Record<"porter" | "rapido", string>;
}

function read(partner: any): OrderingDraft {
  const types = parseOrderTypesEnabled(partner?.order_types_enabled);
  const r = (partner?.delivery_rules || {}) as any;
  const pre = mergePrebookingConfig(partner?.prebooking_settings);
  return {
    delivery: types.delivery,
    takeaway: types.takeaway,
    dine_in: types.dine_in,

    parcel_charge: num(r.parcel_charge, 0),
    parcel_charge_type: (r.parcel_charge_type as any) || "fixed",
    round_off: !!r.round_off,

    prebooking_enabled: !!pre.prebooking_enabled,
    slot_booking_enabled: !!pre.slot_booking_enabled,
    min_lead_time_minutes: num(pre.min_lead_time_minutes, 0),
    rolling_interval_minutes: num(pre.rolling_interval_minutes, 15),
    max_advance_days: num(pre.max_advance_days, 7),

    need_user_name: !!r.need_user_name,
    need_address_details: !!r.need_address_details,
    auto_accept_orders: !!r.auto_accept_orders,

    delivery_radius: num(r.delivery_radius, 15),
    minimum_order_amount: num(r.minimum_order_amount, 0),
    first_km: num(r.first_km_range?.km, 0),
    first_km_rate: num(r.first_km_range?.rate, 0),
    delivery_rate: num(partner?.delivery_rate, 0),
    free_delivery_enabled: !!r.free_delivery_enabled,
    free_delivery_min_order: num(r.free_delivery_min_order, 0),
    hide_delivery_charge: !!r.hide_delivery_charge,
    pool_pickup_otp: !!r.pool_pickup_otp,
    pool_drop_otp: !!r.pool_drop_otp,

    delivery_vehicle_mode: r.delivery_vehicle_mode || "bike",
    delivery_wait_seconds: num(r.delivery_wait_seconds, 600),
    porter_auto_dispatch: r.porter_auto_dispatch ?? true,
    porter_dispatch_trigger: r.porter_dispatch_trigger || "accepted",
    porter_dispatch_delay_min: num(r.porter_dispatch_delay_min, 0),
    porter_pricing_mode: r.porter_pricing_mode || "custom",
    delivery_provider_priority: Array.isArray(r.delivery_provider_priority)
      ? [...r.delivery_provider_priority]
      : ["porter", "rapido"],
    // Coerce to strings: the jsonb column has no schema, and a stray number
    // would render as one but compare unequal to the bridge's string group.
    provider_groups: {
      porter: String(r.delivery_provider_groups?.porter ?? ""),
      rapido: String(r.delivery_provider_groups?.rapido ?? ""),
    },
  };
}

function build(d: OrderingDraft, partner: any): Record<string, unknown> {
  // delivery_rules is the shared billing/ops blob — read-modify-write, never
  // replace, or Payment's round_off and Bill Printing's layout go with it.
  const existing = (partner?.delivery_rules || {}) as any;
  const pre = mergePrebookingConfig(partner?.prebooking_settings);

  return {
    order_types_enabled: JSON.stringify({
      delivery: d.delivery,
      takeaway: d.takeaway,
      dine_in: d.dine_in,
    }),
    delivery_rate: d.delivery_rate,
    delivery_rules: {
      ...existing,
      parcel_charge: d.parcel_charge,
      parcel_charge_type: d.parcel_charge_type,
      round_off: d.round_off,
      need_user_name: d.need_user_name,
      need_address_details: d.need_address_details,
      auto_accept_orders: d.auto_accept_orders,
      delivery_radius: d.delivery_radius,
      minimum_order_amount: d.minimum_order_amount,
      first_km_range: { km: d.first_km, rate: d.first_km_rate },
      free_delivery_enabled: d.free_delivery_enabled,
      free_delivery_min_order: d.free_delivery_min_order,
      hide_delivery_charge: d.hide_delivery_charge,
      pool_pickup_otp: d.pool_pickup_otp,
      pool_drop_otp: d.pool_drop_otp,
      delivery_vehicle_mode: d.delivery_vehicle_mode,
      delivery_wait_seconds: d.delivery_wait_seconds,
      porter_auto_dispatch: d.porter_auto_dispatch,
      porter_dispatch_trigger: d.porter_dispatch_trigger,
      porter_dispatch_delay_min: d.porter_dispatch_delay_min,
      porter_pricing_mode: d.porter_pricing_mode,
      delivery_provider_priority: d.delivery_provider_priority,
      delivery_provider_groups: {
        ...(existing.delivery_provider_groups || {}),
        porter: d.provider_groups.porter,
        rapido: d.provider_groups.rapido,
      },
    },
    prebooking_settings: JSON.stringify({
      ...pre,
      prebooking_enabled: d.prebooking_enabled,
      slot_booking_enabled: d.slot_booking_enabled,
      min_lead_time_minutes: d.min_lead_time_minutes,
      rolling_interval_minutes: d.rolling_interval_minutes,
      max_advance_days: d.max_advance_days,
    }),
  };
}

/* ------------------------------------------------------------------- tabs */

export type OrderingTab =
  | "types"
  | "takeaway"
  | "scheduled"
  | "checkout"
  | "delivery"
  | "bridge";

export function orderingTabs(
  features: FeatureFlags | null,
): { value: OrderingTab; label: string }[] {
  return [
    { value: "types" as const, label: "Order types" },
    { value: "takeaway" as const, label: "Charges" },
    ...(settingsTabVisible("ordering", "scheduled", features)
      ? [{ value: "scheduled" as const, label: "Prebooking" }]
      : []),
    { value: "checkout" as const, label: "Checkout" },
    ...(settingsTabVisible("ordering", "delivery", features)
      ? [{ value: "delivery" as const, label: "Delivery" }]
      : []),
    ...(settingsTabVisible("ordering", "bridge", features)
      ? [{ value: "bridge" as const, label: "Porter & Rapido" }]
      : []),
  ];
}

/* ----------------------------------------------------------------- screen */

const PROVIDER_LABEL: Record<string, string> = {
  porter: "Porter",
  rapido: "Rapido",
  uber: "Uber",
};

export function OrderingSection({ tab }: { tab: OrderingTab }) {
  // Saving the partner row stores the group NUMBER; the bridge still has to be
  // told to re-tag the accounts into it. Bumping the token afterwards re-reads
  // the connections so "N accounts live in group X" reflects the new tag.
  const [bridgeToken, setBridgeToken] = React.useState(0);
  const [accountsOpen, setAccountsOpen] = React.useState(false);
  // ?bridge=accounts opens this page directly — Porter & Rapido's Connect
  // buttons link straight here rather than dropping the partner on the tab and
  // making them find the row. Read at MOUNT from window.location, the same way
  // Settings reads sg/ss and Menu reads menuPanel.
  const [enteredAtAccounts, setEnteredAtAccounts] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("bridge") === "accounts") {
      setAccountsOpen(true);
      setEnteredAtAccounts(true);
    }
  }, []);

  // Declared up here with the other hooks, NOT down beside the bridge tab it
  // serves. Every tab below returns its own JSX, so a hook placed after those
  // guards only runs on the bridge tab — the hook count then changes the moment
  // you switch to it and React throws #310 ("rendered more hooks than during
  // the previous render"). Reloading hid it, because mounting straight onto
  // bridge makes the count consistent from the first render.
  //
  // Arriving straight on Accounts means the bridge tab was never on screen, so
  // Back belongs to whoever sent us. Opening it from the tab's own row leaves
  // enteredAtAccounts false and Back walks up to the tab as before.
  const accountsBack = useBackOrReturn(
    () => setAccountsOpen(false),
    "Back to Porter & Rapido",
    enteredAtAccounts,
  );
  const applyGroups = React.useCallback(async (partnerId: string) => {
    const res = await setProviderGroups({ partnerId });
    if (!res.ok) console.warn("[v3 bridge] setProviderGroups:", res.message);
    setBridgeToken((n) => n + 1);
  }, []);

  const { partner, draft, patch } = useSectionDraft(
    read,
    build,
    "Ordering settings saved",
    applyGroups,
  );
  const currency = currencyOf(partner);

  // Leaving the bridge tab has to drop the accounts page, or coming back later
  // reopens it instead of the settings the partner expected.
  React.useEffect(() => {
    if (tab !== "bridge" && accountsOpen) setAccountsOpen(false);
  }, [tab, accountsOpen]);

  // Porter resolves which region to send the login OTP from these coords, so a
  // half-formed pair is worse than none: it silently sends the OTP to the wrong
  // region. Same guard admin-v2 applies — both members present and numeric.
  const pickupCoords = React.useMemo(() => {
    const c = (partner?.geo_location as { coordinates?: unknown })?.coordinates;
    if (!Array.isArray(c) || c.length !== 2) return undefined;
    const [lng, lat] = c;
    if (typeof lat !== "number" || typeof lng !== "number") return undefined;
    return { lat, lng };
  }, [partner?.geo_location]);

  if (tab === "types") {
    const on = [draft.delivery, draft.takeaway, draft.dine_in].filter(Boolean).length;
    return (
      <SettingsCard>
        <ToggleRow
          title="Delivery"
          desc="Customers order to their address."
          checked={draft.delivery}
          onChange={(v) => patch({ delivery: v })}
          divider
        />
        <ToggleRow
          title="Takeaway"
          desc="Customers collect from the counter."
          checked={draft.takeaway}
          onChange={(v) => patch({ takeaway: v })}
          divider
        />
        <ToggleRow
          title="Dine-in"
          desc="Customers order at a table from the QR menu."
          checked={draft.dine_in}
          onChange={(v) => patch({ dine_in: v })}
        />
        <Note>
          Turning a type off hides it at onboarding and checkout.{" "}
          {on === 0
            ? "With every type off, customers cannot place an order at all."
            : null}
        </Note>
      </SettingsCard>
    );
  }

  if (tab === "takeaway") {
    return (
      <SettingsCard>
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          Packing charges apply to takeaway and delivery orders.
        </div>
        <FieldRow>
          <NumberField
            label="Packaging charge"
            hint={currency}
            value={draft.parcel_charge}
            onChange={(v) => patch({ parcel_charge: v })}
          />
        </FieldRow>
        <SegmentedField
          label="Charged"
          hint="Per-item override amounts set in the classic dashboard are kept."
          value={draft.parcel_charge_type}
          onChange={(v) => patch({ parcel_charge_type: v })}
          options={[
            { value: "fixed", label: "Once per order" },
            { value: "variable", label: "Per item" },
            { value: "itemwise", label: "Per item, with overrides" },
          ]}
        />
        {/* Moved off Payments → Tax: it is a charge line on the bill, so it
            belongs with the other charges rather than with the tax rate. */}
        <ToggleRow
          title={`Round the total to the nearest ${currency === "₹" ? "rupee" : "unit"}`}
          desc={'Adds a "Round off" line at checkout.'}
          checked={draft.round_off}
          onChange={(v) => patch({ round_off: v })}
        />
        <Note>Packing charges apply in both online ordering and the POS.</Note>
      </SettingsCard>
    );
  }

  if (tab === "scheduled") {
    return (
      <SettingsCard>
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          Covers prebooked orders and table slot booking.
        </div>
        <ToggleRow
          title="Let customers order for later"
          desc="Delivery and takeaway orders can be scheduled for a future time."
          checked={draft.prebooking_enabled}
          onChange={(v) => patch({ prebooking_enabled: v })}
          divider
        />
        <ToggleRow
          title="Let customers book a table"
          desc="Dine-in guests reserve a time slot from the QR menu."
          checked={draft.slot_booking_enabled}
          onChange={(v) => patch({ slot_booking_enabled: v })}
        />
        <FieldRow>
          <NumberField
            label="Notice needed"
            hint="minutes"
            value={draft.min_lead_time_minutes}
            onChange={(v) => patch({ min_lead_time_minutes: v })}
            basis="150px"
          />
          <NumberField
            label="Slot length"
            hint="minutes"
            value={draft.rolling_interval_minutes}
            onChange={(v) => patch({ rolling_interval_minutes: v })}
            basis="150px"
          />
          <NumberField
            label="How far ahead"
            hint="days"
            value={draft.max_advance_days}
            onChange={(v) => patch({ max_advance_days: v })}
            basis="150px"
          />
        </FieldRow>
        <Note>
          Which weekdays and time windows customers can pick, and which items force
          a prebooking, are still set in the classic dashboard.
        </Note>
      </SettingsCard>
    );
  }

  if (tab === "checkout") {
    return (
      <SettingsCard>
        <ToggleRow
          title="Ask for the customer’s name"
          desc="Required at login and when placing an order."
          checked={draft.need_user_name}
          onChange={(v) => patch({ need_user_name: v })}
          divider
        />
        <ToggleRow
          title="Require full address details"
          desc="Flat, floor and landmark must be filled before a delivery order can be placed."
          checked={draft.need_address_details}
          onChange={(v) => patch({ need_address_details: v })}
        />
        <ToggleRow
          title="Auto-accept orders"
          desc="New orders go straight to Accepted instead of waiting to be accepted, and the bill prints on this dashboard as each one arrives. Online payments are still only accepted once payment confirms."
          checked={draft.auto_accept_orders}
          onChange={(v) => patch({ auto_accept_orders: v })}
        />
      </SettingsCard>
    );
  }

  if (tab === "delivery") {
    return (
      <SettingsCard>
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          Applies to delivery orders only.
        </div>
        <FieldRow>
          <NumberField
            label="Radius"
            hint="km from your address"
            value={draft.delivery_radius}
            onChange={(v) => patch({ delivery_radius: v })}
          />
          <NumberField
            label="Minimum order"
            hint={currency}
            value={draft.minimum_order_amount}
            onChange={(v) => patch({ minimum_order_amount: v })}
          />
        </FieldRow>
        <FieldRow>
          <NumberField
            label="Base charge"
            hint={currency}
            value={draft.first_km_rate}
            onChange={(v) => patch({ first_km_rate: v })}
            basis="150px"
          />
          <NumberField
            label="Covers the first"
            hint="km"
            value={draft.first_km}
            onChange={(v) => patch({ first_km: v })}
            basis="150px"
          />
          <NumberField
            label="Per km after that"
            hint={currency}
            value={draft.delivery_rate}
            onChange={(v) => patch({ delivery_rate: v })}
            basis="150px"
          />
        </FieldRow>
        <ToggleRow
          title="Free delivery over a value"
          desc={
            draft.free_delivery_enabled
              ? `Orders of ${currency}${draft.free_delivery_min_order} or more are delivered free.`
              : "Deliver free once the basket passes an amount you set."
          }
          checked={draft.free_delivery_enabled}
          onChange={(v) => patch({ free_delivery_enabled: v })}
          divider
        />
        {draft.free_delivery_enabled ? (
          <FieldRow>
            <NumberField
              label="Free above"
              hint={currency}
              value={draft.free_delivery_min_order}
              onChange={(v) => patch({ free_delivery_min_order: v })}
            />
          </FieldRow>
        ) : null}
        <ToggleRow
          title="Hide the delivery charge"
          desc={'Shows an "extra delivery charges apply" note instead of a line on the bill.'}
          checked={draft.hide_delivery_charge}
          onChange={(v) => patch({ hide_delivery_charge: v })}
          divider
        />
        <ToggleRow
          title="Ask the rider for a pickup code"
          desc="The rider enters a code from your order screen to confirm pickup."
          checked={draft.pool_pickup_otp}
          onChange={(v) => patch({ pool_pickup_otp: v })}
          divider
        />
        <ToggleRow
          title="Ask the customer for a delivery code"
          desc="The customer gets a code on WhatsApp; the rider enters it on delivery."
          checked={draft.pool_drop_otp}
          onChange={(v) => patch({ pool_drop_otp: v })}
        />
        <Note>
          Distance bands, per-area pricing and rider contact numbers are still set
          in the classic dashboard.
        </Note>
      </SettingsCard>
    );
  }


  /* ------------------------------------------------------------- the bridge */

  if (tab === "bridge" && accountsOpen) {
    return (
      <ProviderAccounts
        partnerId={partner?.id}
        storeName={partner?.store_name}
        city={partner?.district}
        coords={pickupCoords}
        groups={draft.provider_groups}
        onGroupChange={(p, v) =>
          patch({ provider_groups: { ...draft.provider_groups, [p]: v } })
        }
        reloadToken={bridgeToken}
        onBack={accountsBack.goBack}
      />
    );
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...draft.delivery_provider_priority];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    patch({ delivery_provider_priority: next });
  };

  return (
    <>
      <ProviderAccountsEntry
        onOpen={() => {
          setEnteredAtAccounts(false);
          setAccountsOpen(true);
        }}
      />

      <SettingsCard title="Porter & Rapido" meta={<Chip>Porter · Rapido</Chip>}>
        <SegmentedField
          label="Vehicle"
          hint="A bike is usually cheapest for food. Parcel books a courier class; Rapido has no scooty and falls back to a bike."
          value={draft.delivery_vehicle_mode}
          onChange={(v) => patch({ delivery_vehicle_mode: v })}
          options={[
            { value: "bike", label: "Bike" },
            { value: "parcel", label: "Parcel" },
            { value: "scooty", label: "Scooty" },
          ]}
        />
        <FieldRow>
          <NumberField
            label="Search each provider for"
            hint="seconds before escalating"
            value={draft.delivery_wait_seconds}
            onChange={(v) => patch({ delivery_wait_seconds: v })}
          />
        </FieldRow>
        <ToggleRow
          title="Book a rider automatically"
          desc={'Off means you press "Book rider" on each order.'}
          checked={draft.porter_auto_dispatch}
          onChange={(v) => patch({ porter_auto_dispatch: v })}
        />
        {draft.porter_auto_dispatch ? (
          <>
            <SegmentedField
              label="Book when the order is"
              value={draft.porter_dispatch_trigger}
              onChange={(v) => patch({ porter_dispatch_trigger: v })}
              options={[
                { value: "accepted", label: "Accepted" },
                { value: "food_ready", label: "Food ready" },
              ]}
            />
            <FieldRow>
              <NumberField
                label="After"
                hint="minutes"
                value={draft.porter_dispatch_delay_min}
                onChange={(v) => patch({ porter_dispatch_delay_min: v })}
              />
            </FieldRow>
          </>
        ) : null}
        <SegmentedField
          label="What the customer pays for delivery"
          hint={
            draft.porter_pricing_mode === "porter"
              ? "The customer is charged whatever the provider quotes for that trip."
              : "The customer is charged by your own radius pricing above."
          }
          value={draft.porter_pricing_mode}
          onChange={(v) => patch({ porter_pricing_mode: v })}
          options={[
            { value: "custom", label: "My pricing" },
            { value: "porter", label: "The live rider quote" },
          ]}
        />
      </SettingsCard>

      <SettingsCard title="Provider order" meta={<Chip>Escalates in order</Chip>}>
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          Tried one at a time, escalating if no rider is found in time.
        </div>
        <div>
          {draft.delivery_provider_priority.map((p, i) => (
            <div
              key={p}
              className="flex items-center gap-2.5 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {i + 1}
              </span>
              <span className="flex-1 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                {PROVIDER_LABEL[p] || p}
              </span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                aria-label="Move up"
                disabled={i === 0}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                aria-label="Move down"
                disabled={i === draft.delivery_provider_priority.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Note>Distance-band routing still lives in the classic dashboard.</Note>
      </SettingsCard>

    </>
  );
}
