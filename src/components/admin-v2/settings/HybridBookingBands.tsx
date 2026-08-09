"use client";

import { Fragment, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Route, Trash2 } from "lucide-react";
import type { DeliveryRules } from "@/store/orderStore";
import { hybridBands, readUpto, type HybridCarrier } from "@/lib/hybridDelivery";

/**
 * HYBRID BOOKING editor — the distance ladder a store routes its deliveries by.
 *
 * "My own rider to 1 km, a Rapido to 10 km, Shiprocket beyond that" is three
 * bands, so this is a list the partner adds rows to rather than a fixed pair of
 * pickers. What it writes is `delivery_rules.hybrid_bands`; the resolver in
 * lib/hybridDelivery normalises whatever ends up stored, and the checkout, the
 * delivery bridge and the Shiprocket dispatcher all route off that one function.
 *
 * The two rules the editor guarantees so the ladder can be read at a glance:
 * boundaries only ever go UP the list, and the last row is always the open-ended
 * one. Sorting happens on blur rather than on every keystroke — re-ordering rows
 * under a cursor mid-number is how a partner ends up editing the wrong band.
 */

type Band = { upto: number | null; carrier: HybridCarrier };

const CARRIER_META: Record<
  HybridCarrier,
  { label: string; charge: string; dot: string; chip: string; bar: string }
> = {
  own: {
    label: "You deliver it",
    charge: "your own delivery pricing below",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
  },
  bridge: {
    label: "Third-party rider",
    charge: "the live rider quote",
    dot: "bg-orange-500",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    bar: "bg-orange-500",
  },
  shiprocket: {
    label: "Shiprocket",
    charge: "the Shiprocket rate",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    bar: "bg-violet-500",
  },
};

/** More than this and the ladder stops being readable — and nobody has five
 *  different carriers to hand anyway. */
const MAX_BANDS = 5;

/** Where the first boundary lands when the partner has not set one. 10 km is
 *  about where an instant rider stops being the obvious choice. */
const DEFAULT_BOUNDARY = 10;

/** …unless the store's delivery radius is smaller than that, in which case 10 km
 *  would seed a band no order can ever reach. */
function defaultBoundary(rules: DeliveryRules): number {
  const radius = Number(rules.delivery_radius);
  if (Number.isFinite(radius) && radius > 0 && radius <= DEFAULT_BOUNDARY) {
    return Math.max(1, Math.floor(radius / 2));
  }
  return DEFAULT_BOUNDARY;
}

const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * The rows to EDIT, which is not the same list as the rows to apply.
 *
 * hybridBands() drops anything unusable so the dispatchers can trust it; this one
 * keeps a half-typed row on screen so the partner can finish typing it. It only
 * falls back to the legacy single-boundary fields when no ladder is stored, so a
 * partner who never opens this screen keeps exactly the setup they configured.
 */
function editorRows(rules: DeliveryRules): Band[] {
  const stored = rules.hybrid_bands;
  if (Array.isArray(stored) && stored.length >= 2) {
    return stored.map((b, i) => ({
      // readUpto, not Number(): `Number(null)` is 0, which would put a phantom
      // "0 km" in a row the partner left blank.
      upto: i === stored.length - 1 ? null : readUpto(b?.upto),
      carrier: (b?.carrier ?? "bridge") as HybridCarrier,
    }));
  }
  const limit = Number(rules.third_party_max_km);
  return [
    {
      upto: Number.isFinite(limit) && limit > 0 ? limit : null,
      carrier: (rules.hybrid_near_provider ?? "bridge") as HybridCarrier,
    },
    { upto: null, carrier: (rules.hybrid_far_provider ?? "own") as HybridCarrier },
  ];
}

export function HybridBookingBands({
  rules,
  setRules,
  shiprocketAvailable,
}: {
  rules: DeliveryRules;
  setRules: (fn: (prev: DeliveryRules) => DeliveryRules) => void;
  /** Shiprocket is only offered to a store that has it switched on — a band
   *  pointing at a carrier that books nothing would strand every order in it. */
  shiprocketAvailable: boolean;
}) {
  const rows = useMemo(() => editorRows(rules), [rules]);
  // What is being TYPED in each distance field, by row index. Cleared on blur, so
  // the saved rules are the source of truth the moment the field is left.
  const [draft, setDraft] = useState<Record<number, string>>({});
  const radius = Number(rules.delivery_radius ?? 0);
  const carriers: HybridCarrier[] = shiprocketAvailable
    ? ["own", "bridge", "shiprocket"]
    : ["own", "bridge"];

  /** Write the ladder, keeping the legacy pair in step so anything still reading
   *  the old fields (an older client, a log line) sees the same intent. */
  const commit = (next: Band[]) => {
    const bands = next.map((b, i) => ({
      upto: i === next.length - 1 ? null : b.upto,
      carrier: b.carrier,
    }));
    const firstBoundary = bands.find((b) => typeof b.upto === "number" && b.upto > 0)?.upto;
    setRules((prev) => ({
      ...prev,
      hybrid_bands: bands,
      third_party_max_km:
        typeof firstBoundary === "number" ? firstBoundary : prev.third_party_max_km,
      hybrid_near_provider: bands[0].carrier,
      hybrid_far_provider: bands[bands.length - 1].carrier,
    }));
  };

  const setBand = (index: number, patch: Partial<Band>) =>
    commit(rows.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  /** Sort on blur, never on keystroke: typing "1" on the way to "12" would
   *  otherwise yank the row out from under the cursor. */
  const sortBands = () => {
    const tail = rows[rows.length - 1];
    const bounded = rows.slice(0, -1);
    const valid = bounded
      .filter((b) => typeof b.upto === "number" && Number.isFinite(b.upto) && b.upto > 0)
      .sort((a, b) => (a.upto as number) - (b.upto as number));
    const pending = bounded.filter(
      (b) => !(typeof b.upto === "number" && Number.isFinite(b.upto) && b.upto > 0),
    );
    commit([...valid, ...pending, tail]);
  };

  const addBand = () => {
    if (rows.length >= MAX_BANDS) return;
    const bounded = rows.slice(0, -1);
    const last = bounded.length ? Number(bounded[bounded.length - 1].upto) || 0 : 0;
    const tail = rows[rows.length - 1];
    const step = defaultBoundary(rules);
    // A new row that repeats the carrier above it looks like a bug, so offer one
    // the partner has not used at this end of the ladder yet.
    const suggested = carriers.find((c) => c !== tail.carrier && c !== bounded[bounded.length - 1]?.carrier);
    commit([...bounded, { upto: last + step, carrier: suggested ?? tail.carrier }, tail]);
  };

  const removeBand = (index: number) => {
    if (rows.length <= 2) return;
    commit(rows.filter((_, i) => i !== index));
  };

  // Row geometry: each band starts where the one above ends.
  const spans = rows.map((b, i) => {
    const from = i === 0 ? 0 : Number(rows[i - 1].upto) || 0;
    const to = b.upto == null ? null : Number(b.upto);
    return { from, to };
  });

  // The ruler is drawn from the RESOLVED ladder, not the rows on screen: a
  // half-typed boundary is ignored when an order is routed, so drawing it here
  // would promise a band that does not exist. The open-ended band has no width of
  // its own, so it gets a share big enough to read rather than a pretend length.
  const applied = hybridBands(rules) ?? [];
  const rulerSegments = applied.map((b, i) => {
    const from = i === 0 ? 0 : Number(applied[i - 1].upto) || 0;
    return {
      carrier: b.carrier,
      from,
      to: b.upto,
      span: b.upto == null ? null : Math.max(0.5, b.upto - from),
    };
  });
  const boundedTotal = rulerSegments.reduce((s, x) => s + (x.span ?? 0), 0) || 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5 pr-3">
          <Label className="text-base flex items-center gap-1.5">
            <Route className="h-4 w-4 text-orange-600" />
            Route by distance
          </Label>
          <p className="text-xs text-muted-foreground">
            Send each order to a different carrier depending on how far it is going —
            your own rider, an instant third-party rider
            {shiprocketAvailable ? ", or Shiprocket" : ""}.
          </p>
        </div>
        <Switch
          checked={!!rules.hybrid_booking}
          onCheckedChange={(val) =>
            setRules((prev) => {
              if (!val) return { ...prev, hybrid_booking: false };
              // Seed a usable ladder so switching this on is never a silent no-op:
              // with no boundary at all there is nothing to route by. A flat
              // DEFAULT_BOUNDARY rather than a fraction of the delivery radius —
              // radius is often left at some enormous placeholder, and half of
              // 10000 km is not a first suggestion anyone wants to see.
              const seeded =
                Array.isArray(prev.hybrid_bands) && prev.hybrid_bands.length >= 2
                  ? prev.hybrid_bands
                  : editorRows({ ...prev, hybrid_booking: true }).map((b, i, arr) => ({
                        upto: i === arr.length - 1 ? null : b.upto ?? defaultBoundary(prev),
                        carrier: b.carrier,
                    }));
              return {
                ...prev,
                hybrid_booking: true,
                hybrid_bands: seeded,
                third_party_max_km:
                  prev.third_party_max_km ??
                  (typeof seeded[0]?.upto === "number" ? seeded[0].upto : undefined),
              };
            })
          }
        />
      </div>

      {rules.hybrid_booking && (
        <div className="mt-4 space-y-4">
          {/* The ladder at a glance. Reading three rows of numbers to answer "who
              takes a 4 km order" is the question this bar answers instantly. */}
          <div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {rulerSegments.map((seg, i) => (
                <div
                  key={i}
                  className={`${CARRIER_META[seg.carrier].bar} ${i > 0 ? "border-l-2 border-white" : ""}`}
                  style={{
                    flexGrow: seg.span ?? boundedTotal * 0.45,
                    flexBasis: 0,
                    minWidth: 18,
                  }}
                  title={`${seg.to == null ? `beyond ${num(seg.from)} km` : `${num(seg.from)}–${num(seg.to)} km`} · ${CARRIER_META[seg.carrier].label}`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {carriers
                .filter((c) => rulerSegments.some((seg) => seg.carrier === c))
                .map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${CARRIER_META[c].dot}`} />
                    {CARRIER_META[c].label} · charged at {CARRIER_META[c].charge}
                  </span>
                ))}
            </div>
          </div>

          {/* The ladder itself. */}
          <div className="overflow-hidden rounded-lg border bg-white">
            {rows.map((band, i) => {
              const isTail = i === rows.length - 1;
              const from = spans[i].from;
              const value = band.upto;
              const invalid =
                !isTail && !(typeof value === "number" && Number.isFinite(value) && value > 0);
              const notAscending =
                !isTail && !invalid && i > 0 && (value as number) <= from;
              const sameAsAbove = i > 0 && rows[i - 1].carrier === band.carrier;
              // Past the store's delivery radius checkout turns the order away —
              // unless Shiprocket quotes it, which is not bound by that radius.
              const unreachable =
                radius > 0 && from >= radius && band.carrier !== "shiprocket";

              return (
                <Fragment key={i}>
                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 ${
                      i > 0 ? "border-t" : ""
                    } ${invalid || notAscending ? "bg-red-50/40" : ""}`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CARRIER_META[band.carrier].dot}`} />

                    {/* Fixed width so every row's carrier picker lines up, however
                        long the numbers get. */}
                    <div className="flex w-[168px] shrink-0 items-center gap-1.5 text-sm">
                      <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                        {num(from)}
                      </span>
                      {isTail ? (
                        <span className="font-medium">km and beyond</span>
                      ) : (
                        <>
                          <span className="text-muted-foreground">–</span>
                          {/* A typed field, not a number spinner: nudging a
                              boundary one step at a time is useless here, and the
                              arrows sit exactly where the cursor wants to be.
                              inputMode keeps the numeric keypad on a phone. */}
                          <Input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Band ${i + 1} upper distance in km`}
                            className={`h-8 w-[76px] ${invalid || notAscending ? "border-red-400" : ""}`}
                            // The draft is what makes "1." typeable: committing
                            // through Number() would render it straight back as
                            // "1" and eat the decimal point mid-keystroke.
                            value={draft[i] ?? (value ?? "")}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              setDraft((d) => ({ ...d, [i]: raw }));
                              setBand(i, { upto: readUpto(raw) });
                            }}
                            onBlur={() => {
                              setDraft({});
                              sortBands();
                            }}
                          />
                          <span className="text-muted-foreground">km</span>
                        </>
                      )}
                    </div>

                    <span className="hidden text-muted-foreground sm:inline">→</span>

                    <Select
                      value={band.carrier}
                      onValueChange={(v) => setBand(i, { carrier: v as HybridCarrier })}
                    >
                      <SelectTrigger className="h-8 w-[190px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {carriers.map((c) => (
                          <SelectItem key={c} value={c}>
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${CARRIER_META[c].dot}`} />
                              {CARRIER_META[c].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* The tail has to exist and two rows are the minimum split, so
                        those deletes are disabled rather than hidden — a vanishing
                        button reads as a bug. */}
                    <button
                      type="button"
                      onClick={() => removeBand(i)}
                      disabled={isTail || rows.length <= 2}
                      title={
                        isTail
                          ? "The last band covers everything beyond and cannot be removed"
                          : rows.length <= 2
                            ? "Turn routing off instead of removing the last split"
                            : "Remove this band"
                      }
                      aria-label="Remove this band"
                      className="ml-auto rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-red-600 disabled:pointer-events-none disabled:opacity-25"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {(invalid || notAscending || sameAsAbove || unreachable) && (
                    <div
                      className={`px-3 pb-2.5 -mt-1 text-xs ${
                        invalid || notAscending ? "text-red-600" : "text-amber-700"
                      }`}
                    >
                      {invalid
                        ? "Enter the distance this band reaches, or this row is ignored."
                        : notAscending
                          ? `Must be more than ${num(from)} km — each band starts where the one above ends.`
                          : sameAsAbove
                            ? "Same carrier as the band above, so this boundary changes nothing."
                            : `Your delivery radius is ${num(radius)} km, so checkout refuses orders this far out. Raise the radius to use this band.`}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={addBand}
              disabled={rows.length >= MAX_BANDS}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground transition hover:border-orange-300 hover:text-orange-700 disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add band
            </button>
            {rows.length >= MAX_BANDS && (
              <span className="text-xs text-muted-foreground">
                {MAX_BANDS} bands is the maximum.
              </span>
            )}
          </div>

          {/* What the partner still has to do elsewhere for this to actually move
              orders. Each line is the difference between "it works" and a partner
              watching orders sit with nobody assigned. */}
          {(rows.some((b) => b.carrier === "shiprocket") ||
            rows.some((b) => b.carrier === "own")) && (
            <div className="rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground space-y-1.5">
              {rows.some((b) => b.carrier === "shiprocket") && (
                <p>
                  <span className="font-medium text-foreground">Shiprocket bands</span> go
                  out on your Shiprocket trigger when auto-dispatch is on (Settings →
                  Shiprocket); otherwise send them with the Ship button on the order.
                  Orders in the other bands are never sent to Shiprocket.
                </p>
              )}
              {rows.some((b) => b.carrier === "own") && (
                <p>
                  <span className="font-medium text-foreground">Bands you deliver</span> are
                  charged with your own delivery pricing below — keep that rate card set, or
                  those orders are charged nothing for delivery.
                </p>
              )}
            </div>
          )}
          {!hybridBands(rules) && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This ladder is not usable yet, so every order still goes to a third-party
              rider. Give at least one band a distance.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
