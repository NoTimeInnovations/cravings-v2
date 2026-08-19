"use client";

import * as React from "react";

import {
  LOYALTY_ORDER_TYPES,
  computeEarnPoints,
  parseLoyaltySettingsV2,
  pointsToValue,
  resolveLoyaltyForType,
  serializeLoyaltySettingsV2,
  type LoyaltyOrderType,
  type LoyaltySettingsV2,
  type PerTypeLoyalty,
} from "@/lib/loyalty/config";
import { getFeatures } from "@/lib/getFeatures";

import {
  Chip,
  FieldRow,
  Note,
  NumberField,
  Segmented,
  SettingsCard,
  ToggleRow,
  currencyOf,
  useSectionDraft,
} from "./controls";

interface LoyaltyDraft {
  cfg: LoyaltySettingsV2;
}

function read(partner: any): LoyaltyDraft {
  return { cfg: parseLoyaltySettingsV2(partner?.loyalty_settings) };
}

function build(d: LoyaltyDraft): Record<string, unknown> {
  return { loyalty_settings: serializeLoyaltySettingsV2(d.cfg) };
}

const TYPE_LABEL: Record<LoyaltyOrderType, string> = {
  delivery: "Delivery",
  takeaway: "Takeaway",
  dine_in: "Dine-in",
};

export function LoyaltySection() {
  const { partner, draft, patch } = useSectionDraft(read, build, "Loyalty settings saved");
  const [active, setActive] = React.useState<LoyaltyOrderType>("delivery");

  const currency = currencyOf(partner);
  const enabled = !!getFeatures(partner?.feature_flags || null).loyalty_points?.enabled;
  const block = draft.cfg.per_type[active];

  const patchType = (p: Partial<PerTypeLoyalty>) =>
    patch({
      cfg: {
        ...draft.cfg,
        per_type: {
          ...draft.cfg.per_type,
          [active]: { ...draft.cfg.per_type[active], ...p },
        },
      },
    });

  const example = React.useMemo(() => {
    const sample = 500;
    const s = resolveLoyaltyForType(draft.cfg, active).settings;
    const pts = computeEarnPoints(sample, s);
    return { sample, pts, value: pointsToValue(pts, s) };
  }, [draft.cfg, active]);

  return (
    <SettingsCard
      title="Loyalty points"
      meta={<Chip>{`1 point = ${currency}${draft.cfg.point_value}`}</Chip>}
    >
      {!enabled ? (
        <Note>
          Loyalty is switched off for this store, so nothing is awarded yet. Turn
          it on under Features — the rules below are still saved.
        </Note>
      ) : null}

      <div>
        <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
          Rules for
        </div>
        <div className="mt-2">
          <Segmented
            value={active}
            onChange={setActive}
            options={LOYALTY_ORDER_TYPES.map((t) => ({
              value: t,
              label: draft.cfg.per_type[t].enabled ? TYPE_LABEL[t] : `${TYPE_LABEL[t]} · off`,
            }))}
          />
        </div>
      </div>

      <ToggleRow
        title={`Give points on ${TYPE_LABEL[active].toLowerCase()} orders`}
        desc="Customers earn on completed orders and redeem on future ones."
        checked={block.enabled}
        onChange={(v) => patchType({ enabled: v })}
        divider
      />

      <div className={block.enabled ? undefined : "pointer-events-none opacity-50"}>
        <FieldRow>
          <NumberField
            label="Earn rate"
            hint="% of the order"
            value={block.earn_percent}
            max={100}
            onChange={(v) => patchType({ earn_percent: v })}
          />
          <NumberField
            label="Minimum order to earn"
            hint={currency}
            value={block.min_order_amount}
            onChange={(v) => patchType({ min_order_amount: v })}
          />
        </FieldRow>
        <div className="mt-3.5">
          <FieldRow>
            <NumberField
              label="Most points can cover"
              hint="% of a bill"
              value={block.max_redeem_percent}
              max={100}
              onChange={(v) => patchType({ max_redeem_percent: v })}
            />
            <NumberField
              label="Points needed to redeem"
              value={block.min_redeem_points}
              onChange={(v) => patchType({ min_redeem_points: Math.round(v) })}
            />
          </FieldRow>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-[11px] text-[12px] leading-[1.55] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
        A {currency}
        {example.sample.toLocaleString()} {TYPE_LABEL[active].toLowerCase()} order earns{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {example.pts} points
        </span>
        {example.pts > 0 ? (
          <>
            {" "}
            — worth {currency}
            {example.value} on the next visit.
          </>
        ) : block.enabled ? (
          <> — raise the earn rate or lower the minimum order.</>
        ) : (
          <> — loyalty is off for this order type.</>
        )}
      </div>
    </SettingsCard>
  );
}
