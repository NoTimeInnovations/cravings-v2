"use server";

/**
 * Data + persistence for Settings → Ordering → "3rd Party Delivery Charges".
 *
 * Gives the partner one place to see, per provider (Porter / Rapido / Uber):
 *   - how much they've recharged into the portal (manually logged — the bridge
 *     can't see recharge amounts)
 *   - how much has been spent on delivery fares (Σ delivered-order fareAmount)
 *   - the remaining balance, and every individual order's charge
 *
 * Recharges live in the partners.delivery_recharges jsonb column. Per-order
 * fares are read from orders.delivery_provider_meta.fareAmount (persisted by
 * porterBridge dispatch). Live Porter wallet balance is fetched from the bridge
 * when a Porter account is connected.
 *
 * Reads/writes use the admin-secret server client so a brand-new column doesn't
 * depend on partner-role column permissions.
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { getAuthCookie } from "@/app/auth/actions";
import type { DeliveryRecharge } from "@/store/orderStore";
import type {
  ChargeProvider,
  OrderCharge,
  ProviderSummary,
  PorterWalletLive,
  ThirdPartyChargeData,
} from "@/lib/deliveryBridgeTypes";

const PROVIDERS: readonly ChargeProvider[] = ["porter", "rapido", "uber"];

/** The caller must be the logged-in partner whose row they're reading/writing. */
async function assertPartner(
  partnerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!partnerId) return { ok: false, message: "partnerId required" };
  const auth = await getAuthCookie();
  if (!auth || auth.role !== "partner" || auth.id !== partnerId) {
    return { ok: false, message: "Not authorized" };
  }
  return { ok: true };
}

/** Validate + normalise a yyyy-mm-dd date; empty/invalid → today (UTC). */
function safeDate(raw: unknown): string {
  const s = String(raw ?? "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00Z`);
    // Reject impossible dates like 2024-13-45 (Date would roll them over).
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s) return s;
  }
  return new Date().toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────────────────────────────────
// Bridge transport (Porter live wallet only)
// ──────────────────────────────────────────────────────────────────────────

function bridgeConfig(): { url: string; key: string } | null {
  const url = process.env.PORTER_BRIDGE_URL;
  const key = process.env.PORTER_BRIDGE_API_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

async function bridgeJson(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<any | null> {
  const cfg = bridgeConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      ...init,
      headers: {
        "X-API-Key": cfg.key,
        ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

function normaliseMobile(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = String(p).replace(/\D+/g, "");
  if (digits.length < 10) return null;
  const ten = digits.slice(-10);
  return /^[6-9][0-9]{9}$/.test(ten) ? ten : null;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// ──────────────────────────────────────────────────────────────────────────
// Read
// ──────────────────────────────────────────────────────────────────────────

export async function getThirdPartyChargeData(input: {
  partnerId: string;
}): Promise<ThirdPartyChargeData | { ok: false; message: string }> {
  const partnerId = input.partnerId;
  const auth = await assertPartner(partnerId);
  if (!auth.ok) return auth;

  // 1. Partner basics — always available (no new column referenced).
  let basics: {
    porter_mobile: string | null;
    rapido_mobile: string | null;
    uber_mobile: string | null;
    currency: string | null;
    delivery_rules: Record<string, any> | string | null;
  };
  try {
    const d = await fetchFromHasuraServer(
      `query ChargePartner($id: uuid!) {
        partners_by_pk(id: $id) { porter_mobile rapido_mobile uber_mobile currency delivery_rules }
      }`,
      { id: partnerId },
    );
    if (!d?.partners_by_pk) return { ok: false, message: "partner not found" };
    basics = d.partners_by_pk;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  const currency = basics.currency || "₹";
  // Configured per-provider payment mode — the dispatch uses exactly this, so
  // it's an accurate "was it wallet?" signal when the booking itself doesn't
  // carry a paymentMode back.
  const rules: Record<string, any> =
    basics.delivery_rules && typeof basics.delivery_rules === "object"
      ? (basics.delivery_rules as Record<string, any>)
      : typeof basics.delivery_rules === "string"
        ? (() => {
            try {
              return JSON.parse(basics.delivery_rules as string);
            } catch {
              return {};
            }
          })()
        : {};
  const configuredPay = (rules.delivery_payment_modes ?? {}) as Record<string, string>;

  // 2. Recharges — separate query so a missing column (pre-migration) degrades
  //    gracefully instead of failing the whole screen.
  let recharges: DeliveryRecharge[] = [];
  let needsMigration = false;
  try {
    const d = await fetchFromHasuraServer(
      `query ChargeRecharges($id: uuid!) {
        partners_by_pk(id: $id) { delivery_recharges }
      }`,
      { id: partnerId },
    );
    const raw = d?.partners_by_pk?.delivery_recharges;
    if (Array.isArray(raw)) recharges = raw as DeliveryRecharge[];
    else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) recharges = parsed;
      } catch {
        /* ignore */
      }
    }
  } catch {
    // Column not present yet — the UI shows a one-time-setup banner.
    needsMigration = true;
  }

  // 3. Per-order delivery charges — read straight from the Cravings order row
  //    (NOT the delivery bridge). Every order already stores:
  //      • the delivery fee in `extra_charges` (the "Delivery Charge" line), and
  //      • the third party in `delivery_provider` (once the dispatch is
  //        reconciled) or `delivery_provider_meta.priority` (the provider the
  //        dispatch ran — a single-provider dispatch's winner is certain; for a
  //        multi-provider one it's the primary / first-choice provider).
  const realProvider = (x: unknown): string | null =>
    x === "porter" || x === "rapido" || x === "uber" ? x : null;

  // Pull the delivery-fee amount out of the order's extra_charges jsonb. Only
  // the "Delivery Charge" line counts — parcel / packing charges are the
  // restaurant's, not the third party's.
  const deliveryChargeOf = (extra: unknown): number | null => {
    if (!Array.isArray(extra)) return null;
    let total = 0;
    let found = false;
    for (const e of extra as Array<Record<string, any>>) {
      if (String(e?.name ?? "").toLowerCase().includes("delivery")) {
        const amt = num(e?.amount);
        if (amt != null) {
          total += amt;
          found = true;
        }
      }
    }
    return found ? total : null;
  };

  const orders: OrderCharge[] = [];
  try {
    const d = await fetchFromHasuraServer(
      `query ChargeOrders($id: uuid!) {
        orders(
          where: {
            partner_id: { _eq: $id },
            delivery_provider: { _in: ["porter", "rapido", "uber", "dispatch"] }
          },
          order_by: { created_at: desc },
          limit: 500
        ) {
          id
          display_id
          created_at
          delivery_provider
          delivery_provider_state
          delivery_provider_meta
          extra_charges
        }
      }`,
      { id: partnerId },
    );
    for (const o of (d?.orders ?? []) as Array<Record<string, any>>) {
      const meta = (o.delivery_provider_meta ?? {}) as Record<string, any>;
      const priority = Array.isArray(meta.priority) ? meta.priority : [];
      const provider =
        realProvider(o.delivery_provider) ??
        realProvider(meta.wonProvider) ??
        realProvider(priority[0]) ??
        "dispatch";
      const paymentMode =
        (typeof meta.paymentMode === "string" && meta.paymentMode) ||
        (realProvider(provider) ? configuredPay[provider] ?? null : null);
      orders.push({
        orderId: String(o.id),
        displayId: o.display_id ?? null,
        createdAt: String(o.created_at),
        provider,
        state: o.delivery_provider_state ?? null,
        fare: deliveryChargeOf(o.extra_charges),
        paymentMode,
      });
    }
  } catch (err) {
    console.warn("[deliveryCharges] orders read failed:", err);
  }

  // 4. Per-provider summaries.
  const mobileOf: Record<ChargeProvider, string | null> = {
    porter: normaliseMobile(basics.porter_mobile),
    rapido: normaliseMobile(basics.rapido_mobile),
    uber: normaliseMobile(basics.uber_mobile),
  };
  // A third party only actually charged when it delivered — failed / cancelled /
  // self-delivered orders don't count toward spend or the balance draw-down.
  const FAILED = new Set([
    "failed",
    "cancelled",
    "canceled",
    "exhausted",
    "stopped",
    "error",
  ]);
  const summaries = {} as Record<ChargeProvider, ProviderSummary>;
  for (const provider of PROVIDERS) {
    const totalRecharged = recharges
      .filter((r) => r.provider === provider)
      .reduce((s, r) => s + (num(r.amount) ?? 0), 0);
    const delivered = orders.filter(
      (o) => o.provider === provider && !FAILED.has(String(o.state ?? "").toLowerCase()),
    );
    const totalSpent = delivered.reduce((s, o) => s + (o.fare ?? 0), 0);
    // Only wallet-paid deliveries draw down the prepaid recharge; cash is
    // collected by the rider and never touches the portal wallet.
    const walletSpent = delivered
      .filter((o) => o.paymentMode === "wallet")
      .reduce((s, o) => s + (o.fare ?? 0), 0);
    summaries[provider] = {
      provider,
      connectedMobile: mobileOf[provider],
      totalRecharged,
      totalSpent,
      walletSpent,
      balance: totalRecharged - walletSpent,
      orderCount: delivered.length,
    };
  }

  // 5. Live Porter wallet (best-effort) when a Porter account is connected.
  let porterWallet: PorterWalletLive | null = null;
  if (mobileOf.porter) {
    const list = await bridgeJson(`/api/v1/accounts`, { method: "GET" });
    const rows: Array<Record<string, any>> = Array.isArray(list)
      ? list
      : (list?.data ?? []);
    const acct = rows.find(
      (r) => (r.service ?? "porter") === "porter" && String(r.mobile) === mobileOf.porter,
    );
    if (acct?._id && acct.status === "active") {
      const w = await bridgeJson(`/api/v1/porter/wallet`, {
        method: "POST",
        json: { accountId: String(acct._id) },
      });
      const bal = num(w?.balance);
      if (bal != null) {
        porterWallet = { balance: bal, rechargeLink: w?.rechargeLink ?? null };
      }
    }
  }

  return {
    ok: true,
    currency,
    needsMigration,
    recharges,
    summaries,
    orders,
    porterWallet,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Write
// ──────────────────────────────────────────────────────────────────────────

export async function saveDeliveryRecharges(input: {
  partnerId: string;
  recharges: DeliveryRecharge[];
}): Promise<{ ok: true; recharges: DeliveryRecharge[] } | { ok: false; message: string }> {
  const auth = await assertPartner(input.partnerId);
  if (!auth.ok) return auth;
  if (!Array.isArray(input.recharges)) {
    return { ok: false, message: "recharges must be an array" };
  }
  // Sanitise: keep only well-formed rows so a bad client can't poison the column.
  // Also guarantee unique ids server-side (edit/delete match by id) — a client
  // collision or missing id gets a fresh uuid.
  const clean: DeliveryRecharge[] = [];
  const seen = new Set<string>();
  for (const r of input.recharges) {
    const amount = num(r?.amount);
    if (!r?.provider || amount == null || amount < 0) continue;
    if (!PROVIDERS.includes(r.provider as ChargeProvider)) continue;
    let id = r?.id ? String(r.id) : "";
    if (!id || seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    clean.push({
      id,
      provider: r.provider,
      amount,
      date: safeDate(r.date),
      note: r.note ? String(r.note).slice(0, 300) : undefined,
      created_at: String(r.created_at || new Date().toISOString()),
    });
  }

  try {
    await fetchFromHasuraServer(
      `mutation SaveRecharges($id: uuid!, $recharges: jsonb!, $updatedAt: timestamptz!) {
        update_partners_by_pk(
          pk_columns: { id: $id },
          _set: { delivery_recharges: $recharges, updated_at: $updatedAt }
        ) { id }
      }`,
      { id: input.partnerId, recharges: clean, updatedAt: new Date().toISOString() },
    );
  } catch (err) {
    const msg = (err as Error).message || "";
    if (/delivery_recharges/.test(msg)) {
      return {
        ok: false,
        message:
          "The delivery_recharges column doesn't exist yet — run the one-time database migration first.",
      };
    }
    return { ok: false, message: `hasura: ${msg}` };
  }
  return { ok: true, recharges: clean };
}
