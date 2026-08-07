"use server";

// What Shiprocket will charge to deliver this cart, for the checkout screen.
//
// DELIBERATELY UNAUTHENTICATED, like porterBridge.quoteDeliveryFare. It is called
// by a customer choosing an address, before any order exists, so there is no
// session to check. That is safe here because it takes a partner id, returns a
// single number, writes nothing a customer can read back, touches no credential,
// and refuses any store that has not switched shipping on. What it does spend is
// one Shiprocket call and sometimes one geocode, so the caller debounces it.
//
// It never blocks an order. Every failure path returns ok:false and the checkout
// falls back to the partner's own delivery_rules pricing — a store whose courier
// cannot be quoted still takes the order.
//
// A QUOTE IS NOT THE BILL. Shiprocket's rate endpoint and the courier list on a
// created order disagree — 135.70 vs 174.64 on the first route we tested. This is
// the number the customer sees; the merchant's wallet pays whatever the AWB costs.

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { shiprocketCredsForPartner } from "@/lib/shiprocket/creds";
import {
  checkHyperlocalServiceability,
  checkParcelServiceability,
  listPickupLocations,
} from "@/lib/shiprocket/client";
import { resolveDestination } from "@/lib/shiprocket/address";
import { parseShiprocketConfig, type ShiprocketMode } from "@/lib/shiprocket/types";

/**
 * Short-lived quote cache, keyed by what actually changes the price.
 *
 * This action is unauthenticated by necessity (a customer picking an address has
 * no session), which means anyone can call it in a loop with a partner id scraped
 * from a storefront — and every call otherwise spends a billable Google geocode
 * plus a Shiprocket request on THAT MERCHANT's account. Rates do not move minute
 * to minute, so a short cache turns a flood into one real lookup per route, and
 * incidentally makes the common case (a customer nudging the map pin inside one
 * PIN code) free.
 *
 * Per-instance and unbounded in lifetime but not in size — serverless instances
 * are recycled often, and the entry is small.
 */
const QUOTE_TTL_MS = 3 * 60 * 1000;
const quoteCache = new Map<string, { at: number; value: ShiprocketQuote }>();

function cacheGet(key: string): ShiprocketQuote | null {
  const hit = quoteCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > QUOTE_TTL_MS) {
    quoteCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: ShiprocketQuote): void {
  // Cheap bound so a hostile caller cannot grow this without limit.
  if (quoteCache.size > 500) quoteCache.clear();
  quoteCache.set(key, { at: Date.now(), value });
}

export type ShiprocketQuote =
  | { ok: true; rate: number; courier: string | null; mode: ShiprocketMode }
  | { ok: false; message: string };

const PARTNER_FOR_QUOTE = `
  query PartnerForShiprocketQuote($id: uuid!) {
    partners_by_pk(id: $id) { id district state }
  }
`;

type PickupPoint = { pincode: string; lat: number | null; lng: number | null };

/**
 * Where this store ships FROM, cached onto the config the first time we need it.
 *
 * Shiprocket holds this; we store only the nickname. Reading it live on every
 * quote would put a second network call in front of a customer waiting for a
 * price, for an address that changes about once a year.
 *
 * It must come from SHIPROCKET and not the partners row. Those two disagree in
 * practice — the store this was built against sits in Bangalore on its partner
 * record and ships out of a Kerala pickup address — and a same-city quote priced
 * from the wrong city is wrong by hundreds of kilometres without looking wrong.
 */
async function pickupPoint(
  partnerId: string,
  config: ReturnType<typeof parseShiprocketConfig>,
): Promise<PickupPoint | null> {
  if (config.pickup_pincode) {
    return { pincode: config.pickup_pincode, lat: config.pickup_lat, lng: config.pickup_lng };
  }
  if (!config.pickup_location) return null;

  const list = await listPickupLocations(partnerId, { gated: false });
  if (!list.ok) return null;
  const match = list.data.find((l) => l.nickname === config.pickup_location);
  const pin = match?.pinCode && /^[1-9]\d{5}$/.test(match.pinCode) ? match.pinCode : null;
  if (!pin) return null;
  const point: PickupPoint = { pincode: pin, lat: match?.lat ?? null, lng: match?.lng ?? null };

  try {
    // _append is a server-side jsonb merge (`config || $patch`), touching only the
    // three keys this function owns. Writing the whole object from the snapshot we
    // read seconds ago would revert anything saved in between — including a webhook
    // token the merchant had just rotated and pasted into Shiprocket, silently
    // breaking their status updates from an unauthenticated code path.
    await fetchFromHasuraServer(
      `mutation CachePickupPoint($id: uuid!, $patch: jsonb!) {
        update_partner_shiprocket_credentials_by_pk(
          pk_columns: { partner_id: $id }, _append: { config: $patch }
        ) { partner_id }
      }`,
      {
        id: partnerId,
        patch: { pickup_pincode: point.pincode, pickup_lat: point.lat, pickup_lng: point.lng },
      },
    );
  } catch {
    /* caching is an optimisation; a failed write just means we look it up again */
  }
  return point;
}

export async function quoteShiprocketCharge(input: {
  partnerId: string;
  drop: { lat: number; lng: number } | null;
  address?: string | null;
  /**
   * Whether this order will be collected on delivery. Priced differently, and on
   * some PINs the COD and prepaid courier sets differ entirely — quoting COD for
   * an order about to be paid online can report "no courier" for a route a prepaid
   * courier serves perfectly well. Defaults to COD, which is the common case here.
   */
  cod?: boolean;
}): Promise<ShiprocketQuote> {
  const { partnerId, drop } = input;
  if (!partnerId) return { ok: false, message: "partnerId required" };

  try {
    // Returns null unless the store has shipping ENABLED and credentials that
    // decrypt, so an un-onboarded store costs one cheap DB read and nothing more.
    const creds = await shiprocketCredsForPartner(partnerId);
    if (!creds) return { ok: false, message: "Shiprocket is not enabled for this store" };
    const cfg = creds.config;
    // The store bills its own way. Checked BEFORE any network call so a store
    // that opted out never spends a Shiprocket request on a price nobody shows.
    // The checkout treats ok:false as "no quote" and falls back to delivery_rules,
    // so nothing client-side needs to know this setting exists.
    if (!cfg.use_shiprocket_charge) {
      return { ok: false, message: "this store prices delivery itself" };
    }

    const partnerData = await fetchFromHasuraServer(PARTNER_FOR_QUOTE, { id: partnerId });
    const partner = (partnerData as any)?.partners_by_pk;
    if (!partner) return { ok: false, message: "store not found" };

    const pickup = await pickupPoint(partnerId, cfg);
    if (!pickup) {
      return { ok: false, message: "no pickup PIN code for this store" };
    }

    const dest = await resolveDestination({
      address: input.address ?? null,
      coords: drop,
      partnerId,
      fallback: { city: partner.district, state: partner.state, country: "India" },
    });
    if (!dest.ok) return { ok: false, message: dest.message };

    const cod: 0 | 1 = input.cod === false ? 0 : 1;

    // Keyed on everything that moves the price. Hyperlocal is distance-priced, so
    // its key keeps ~100m of the drop coordinates; parcel is priced per PIN.
    const cacheKey =
      cfg.mode === "hyperlocal"
        ? `hl:${partnerId}:${pickup.pincode}:${dest.data.pincode}:${cod}:${drop ? `${drop.lat.toFixed(3)},${drop.lng.toFixed(3)}` : "-"}`
        : `p:${partnerId}:${pickup.pincode}:${dest.data.pincode}:${cod}:${cfg.package.weight}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    if (cfg.mode === "hyperlocal") {
      // Quick is priced on the actual ride, so both ends are required, and the
      // pickup end comes from Shiprocket's record of it — never the partners row.
      // 0/0 is a real coordinate in the Atlantic, and it is what a missing value
      // coerces to. Quoting from it returns "no rider serves this route" for a
      // route that is perfectly serviceable, so treat it as absent.
      const from =
        pickup.lat != null && pickup.lng != null && (pickup.lat !== 0 || pickup.lng !== 0)
          ? { lat: pickup.lat, lng: pickup.lng }
          : null;
      if (!from || !drop) {
        return { ok: false, message: "Shiprocket Quick needs both map locations" };
      }
      const res = await checkHyperlocalServiceability(partnerId, {
        pickupPostcode: pickup.pincode,
        deliveryPostcode: dest.data.pincode,
        cod,
        pickup: from,
        drop,
      });
      if (!res.ok) return { ok: false, message: res.message };
      const priced = res.data.couriers.filter((c) => typeof c.rate === "number");
      if (!priced.length) {
        const miss: ShiprocketQuote = { ok: false, message: "no Shiprocket Quick rider serves this route" };
        cacheSet(cacheKey, miss);
        return miss;
      }
      const best = priced.reduce((a, b) => ((a.rate ?? Infinity) <= (b.rate ?? Infinity) ? a : b));
      const quote: ShiprocketQuote = {
        ok: true,
        rate: Math.ceil(best.rate as number),
        courier: best.name,
        mode: "hyperlocal",
      };
      cacheSet(cacheKey, quote);
      return quote;
    }

    const res = await checkParcelServiceability(partnerId, {
      pickupPostcode: pickup.pincode,
      deliveryPostcode: dest.data.pincode,
      cod,
      weight: cfg.package.weight,
      length: cfg.package.length,
      breadth: cfg.package.breadth,
      height: cfg.package.height,
    });
    if (!res.ok) return { ok: false, message: res.message };
    // Cheapest wins, and a courier that quoted nothing sorts last rather than
    // being read as free — the same rule dispatch uses when picking a rider.
    const priced = res.data.couriers
      .map((c: any) => ({
        name: String(c?.courier_name ?? "Courier"),
        rate: Number(c?.freight_charge ?? c?.rate),
      }))
      .filter((c) => Number.isFinite(c.rate));
    if (!priced.length) {
      const miss: ShiprocketQuote = { ok: false, message: "no courier serves this PIN code" };
      cacheSet(cacheKey, miss);
      return miss;
    }
    const best = priced.reduce((a, b) => (a.rate <= b.rate ? a : b));
    const quote: ShiprocketQuote = {
      ok: true,
      rate: Math.ceil(best.rate),
      courier: best.name,
      mode: "parcel",
    };
    cacheSet(cacheKey, quote);
    return quote;
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || "could not price this delivery" };
  }
}
