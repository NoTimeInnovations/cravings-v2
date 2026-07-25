"use server";

import { randomUUID } from "crypto";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { getAuthCookie } from "@/app/auth/actions";
import { getFeatures } from "@/lib/getFeatures";
import {
  DELTA_SIGN,
  parseLoyaltySettingsV2,
  resolveLoyaltyForType,
  anyLoyaltyTypeEnabled,
  deriveLoyaltyOrderType,
  computeEarnPoints,
  computeMaxRedeemable,
  pointsToValue,
  type LoyaltySettings,
  type LoyaltyOrderType,
  type LoyaltySettingsV2,
  type LoyaltyTxnType,
  type LoyaltyBalanceView,
  type LoyaltyTxnView,
  type LoyaltyMemberView,
  type LoyaltyPartnerSummary,
  type RedeemResult,
} from "@/lib/loyalty/config";
import {
  signTxn,
  verifyHead,
  GENESIS_HASH,
  type LedgerRow,
} from "@/lib/loyalty/ledger";

/*
 * Loyalty server actions.
 *
 * Trust model:
 *  - Identity comes from the encrypted httpOnly auth cookie (getAuthCookie). Loyalty
 *    is no more forgeable than any other server action in this app; the shared
 *    cookie-key weakness is documented in the staged migration plan.
 *  - All DB access uses the SERVER-ONLY Hasura client; the ledger secret never leaves
 *    the server. Every ledger row is HMAC-signed + hash-chained (see lib/loyalty/ledger).
 *  - Balances are never trusted blindly: before any spend the cached balance is
 *    verified against a signed head transaction; a mismatch flags the account and
 *    blocks further writes.
 */

const SEQ_CONFLICT = "loyalty_txn_account_seq_key";
const ORDER_TXN_CONFLICT = "loyalty_txn_order_type_key";

class OrderTxnExistsError extends Error {}
class LoyaltyIntegrityError extends Error {}

function errIncludes(e: unknown, needle: string): boolean {
  try {
    const s = typeof e === "string" ? e : JSON.stringify((e as any)?.response ?? (e as any)?.message ?? e);
    return (s || "").includes(needle) || String((e as any)?.message || "").includes(needle);
  } catch {
    return String((e as any)?.message || "").includes(needle);
  }
}

// --------------------------------------------------------------------------
// Auth helpers
// --------------------------------------------------------------------------

async function requireUser(): Promise<{ userId: string }> {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== "user" || !auth.id) {
    throw new Error("Not authenticated as a customer.");
  }
  return { userId: auth.id };
}

/**
 * Resolves the partner the caller is allowed to act on. Partner accounts are
 * locked to their own id; superadmins may target any partner via `wantPartnerId`.
 */
async function requirePartnerScope(wantPartnerId?: string): Promise<{ partnerId: string }> {
  const auth = await getAuthCookie();
  if (!auth) throw new Error("Not authenticated.");
  if (auth.role === "partner") return { partnerId: auth.id };
  if (auth.role === "superadmin") {
    if (!wantPartnerId) throw new Error("partnerId required for superadmin.");
    return { partnerId: wantPartnerId };
  }
  throw new Error("Not authorized to manage loyalty.");
}

// --------------------------------------------------------------------------
// Partner config
// --------------------------------------------------------------------------

async function loadPartnerLoyalty(
  partnerId: string,
  orderType?: LoyaltyOrderType,
): Promise<{
  enabled: boolean;
  settings: LoyaltySettings;
  v2: LoyaltySettingsV2;
  globalEnabled: boolean;
}> {
  const res = await fetchFromHasuraServer(
    `query PartnerLoyalty($id: uuid!) {
      partners_by_pk(id: $id) { id feature_flags loyalty_settings }
    }`,
    { id: partnerId }
  );
  const p = res?.partners_by_pk;
  const v2 = parseLoyaltySettingsV2(p?.loyalty_settings);
  const resolved = resolveLoyaltyForType(v2, orderType ?? "delivery");
  if (!p) return { enabled: false, settings: resolved.settings, v2, globalEnabled: false };
  const features = getFeatures(p.feature_flags || null);
  const globalEnabled = !!(features.loyalty_points?.access && features.loyalty_points?.enabled);
  // With an order type known, gate on THAT type's toggle. Without one (balance
  // badge / admin views), keep loyalty "on" whenever the global flag is on so a
  // customer's accrued balance stays visible even if every type is toggled off.
  const typeEnabled = orderType ? resolved.enabled : true;
  return { enabled: globalEnabled && typeEnabled, settings: resolved.settings, v2, globalEnabled };
}

// --------------------------------------------------------------------------
// Ledger append (the only writer)
// --------------------------------------------------------------------------

interface AccountRow {
  id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  last_seq: number;
  last_hash: string;
  last_txn_id: string | null;
  flagged_at: string | null;
}

const ACCOUNT_FIELDS = `id balance lifetime_earned lifetime_redeemed last_seq last_hash last_txn_id flagged_at`;

async function getOrCreateAccount(userId: string, partnerId: string): Promise<AccountRow> {
  // NOTE: on_conflict must update at least one column, otherwise Hasura runs
  // ON CONFLICT DO NOTHING and returns null for an already-existing row. Touching
  // updated_at is harmless and guarantees the row is returned in both cases.
  const res = await fetchFromHasuraServer(
    `mutation EnsureAccount($userId: uuid!, $partnerId: uuid!, $now: timestamptz!) {
      insert_loyalty_accounts_one(
        object: { user_id: $userId, partner_id: $partnerId, updated_at: $now },
        on_conflict: { constraint: loyalty_accounts_user_partner_key, update_columns: [updated_at] }
      ) { ${ACCOUNT_FIELDS} }
    }`,
    { userId, partnerId, now: new Date().toISOString() }
  );
  return res.insert_loyalty_accounts_one as AccountRow;
}

async function fetchHead(accountId: string, seq: number): Promise<LedgerRow | null> {
  if (seq <= 0) return null;
  const res = await fetchFromHasuraServer(
    `query Head($acct: uuid!, $seq: bigint!) {
      loyalty_transactions(where: { account_id: { _eq: $acct }, seq: { _eq: $seq } }, limit: 1) {
        id account_id user_id partner_id order_id type delta balance_after seq prev_hash hash created_at
      }
    }`,
    { acct: accountId, seq }
  );
  const r = res?.loyalty_transactions?.[0];
  return r ? (r as LedgerRow) : null;
}

async function flagAccount(accountId: string, reason: string): Promise<void> {
  try {
    await fetchFromHasuraServer(
      `mutation FlagAccount($id: uuid!, $reason: String!, $at: timestamptz!) {
        update_loyalty_accounts_by_pk(pk_columns: { id: $id }, _set: { flagged_at: $at, flag_reason: $reason }) { id }
      }`,
      { id: accountId, reason: reason.slice(0, 280), at: new Date().toISOString() }
    );
    console.error(`[loyalty] SECURITY: account ${accountId} flagged — ${reason}`);
  } catch (e) {
    console.error("[loyalty] failed to flag account", accountId, e);
  }
}

interface AppendParams {
  userId: string;
  partnerId: string;
  type: LoyaltyTxnType;
  points: number; // positive magnitude
  orderId?: string | null;
  note?: string | null;
  meta?: Record<string, any> | null;
  createdBy: string;
}

interface AppendResult {
  txnId: string;
  delta: number;
  balanceAfter: number;
  seq: number;
}

/**
 * Append one signed transaction. Reads (or creates) the account, verifies the
 * signed head, computes the next chained, signed row, then commits the row +
 * account update in a single Hasura transaction. Concurrency is serialized by the
 * UNIQUE(account_id, seq) constraint: a losing racer's insert violates it, the whole
 * transaction rolls back, and we retry. Idempotency per order is enforced by
 * UNIQUE(order_id, type) → surfaced as OrderTxnExistsError.
 */
async function appendTxn(params: AppendParams): Promise<AppendResult> {
  const points = Math.floor(params.points);
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error("Points must be a positive whole number.");
  }
  const sign = DELTA_SIGN[params.type];
  const delta = sign * points;

  for (let attempt = 0; attempt < 6; attempt++) {
    const account = await getOrCreateAccount(params.userId, params.partnerId);
    if (account.flagged_at) {
      throw new LoyaltyIntegrityError("This loyalty account is locked pending review.");
    }

    // Verify the signed head backs the cached balance before we chain onto it.
    const head = await fetchHead(account.id, account.last_seq);
    const headCheck = verifyHead(
      {
        balance: account.balance,
        last_seq: account.last_seq,
        last_hash: account.last_hash,
        last_txn_id: account.last_txn_id,
      },
      head
    );
    if (!headCheck.ok) {
      await flagAccount(account.id, `head verify failed: ${headCheck.reason}`);
      throw new LoyaltyIntegrityError("Loyalty balance failed integrity check.");
    }

    const newBalance = account.balance + delta;
    if (newBalance < 0) {
      throw new Error("Insufficient loyalty points.");
    }

    const txnId = randomUUID();
    const createdAt = new Date().toISOString();
    const newSeq = account.last_seq + 1;
    const prevHash = account.last_hash || GENESIS_HASH;
    const hash = signTxn({
      id: txnId,
      account_id: account.id,
      user_id: params.userId,
      partner_id: params.partnerId,
      order_id: params.orderId ?? null,
      type: params.type,
      delta,
      balance_after: newBalance,
      seq: newSeq,
      prev_hash: prevHash,
      created_at: createdAt,
    });

    const lifeEarnedInc = params.type === "earn" ? points : 0;
    const lifeRedeemedInc = params.type === "redeem" ? points : 0;

    try {
      await fetchFromHasuraServer(
        `mutation AppendTxn(
          $acctId: uuid!, $txnId: uuid!, $userId: uuid!, $partnerId: uuid!, $orderId: uuid,
          $type: String!, $delta: Int!, $newBalance: Int!, $newSeq: bigint!,
          $prevHash: String!, $hash: String!, $note: String, $meta: jsonb, $createdBy: String,
          $createdAt: timestamptz!, $lifeEarnedInc: Int!, $lifeRedeemedInc: Int!
        ) {
          insert_loyalty_transactions_one(object: {
            id: $txnId, account_id: $acctId, user_id: $userId, partner_id: $partnerId, order_id: $orderId,
            type: $type, delta: $delta, balance_after: $newBalance, seq: $newSeq,
            prev_hash: $prevHash, hash: $hash, note: $note, meta: $meta, created_by: $createdBy,
            created_at: $createdAt
          }) { id }
          update_loyalty_accounts_by_pk(
            pk_columns: { id: $acctId },
            _set: { balance: $newBalance, last_seq: $newSeq, last_hash: $hash, last_txn_id: $txnId, updated_at: $createdAt },
            _inc: { lifetime_earned: $lifeEarnedInc, lifetime_redeemed: $lifeRedeemedInc }
          ) { id }
        }`,
        {
          acctId: account.id,
          txnId,
          userId: params.userId,
          partnerId: params.partnerId,
          orderId: params.orderId ?? null,
          type: params.type,
          delta,
          newBalance,
          newSeq,
          prevHash,
          hash,
          note: params.note ?? null,
          meta: params.meta ?? null,
          createdBy: params.createdBy,
          createdAt,
          lifeEarnedInc,
          lifeRedeemedInc,
        }
      );
      return { txnId, delta, balanceAfter: newBalance, seq: newSeq };
    } catch (e) {
      if (errIncludes(e, ORDER_TXN_CONFLICT)) {
        throw new OrderTxnExistsError("A loyalty transaction of this type already exists for the order.");
      }
      if (errIncludes(e, SEQ_CONFLICT)) {
        // Lost the optimistic race — another writer advanced the sequence. Retry.
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not record loyalty transaction (too much contention). Please retry.");
}

// --------------------------------------------------------------------------
// Customer reads
// --------------------------------------------------------------------------

export async function getLoyaltyBalance(partnerId: string): Promise<LoyaltyBalanceView | null> {
  if (!partnerId) return null;
  const auth = await getAuthCookie();
  if (!auth || auth.role !== "user") return null;

  const { enabled, settings } = await loadPartnerLoyalty(partnerId);
  if (!enabled) return { enabled: false, balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, pointValue: settings.point_value };

  const res = await fetchFromHasuraServer(
    `query Bal($userId: uuid!, $partnerId: uuid!) {
      loyalty_accounts(where: { user_id: { _eq: $userId }, partner_id: { _eq: $partnerId } }, limit: 1) {
        balance lifetime_earned lifetime_redeemed
      }
    }`,
    { userId: auth.id, partnerId }
  );
  const a = res?.loyalty_accounts?.[0];
  return {
    enabled: true,
    balance: a?.balance ?? 0,
    lifetimeEarned: a?.lifetime_earned ?? 0,
    lifetimeRedeemed: a?.lifetime_redeemed ?? 0,
    pointValue: settings.point_value,
  };
}

export async function getLoyaltyHistory(
  partnerId: string,
  limit = 30,
  offset = 0
): Promise<LoyaltyTxnView[]> {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== "user" || !partnerId) return [];
  const res = await fetchFromHasuraServer(
    `query Hist($userId: uuid!, $partnerId: uuid!, $limit: Int!, $offset: Int!) {
      loyalty_transactions(
        where: { user_id: { _eq: $userId }, partner_id: { _eq: $partnerId } },
        order_by: { seq: desc }, limit: $limit, offset: $offset
      ) {
        id type delta balance_after created_at note order_id
        order { display_id }
      }
    }`,
    { userId: auth.id, partnerId, limit: Math.min(100, Math.max(1, limit)), offset: Math.max(0, offset) }
  );
  return (res?.loyalty_transactions || []).map((t: any): LoyaltyTxnView => ({
    id: t.id,
    type: t.type,
    delta: t.delta,
    balanceAfter: t.balance_after,
    createdAt: t.created_at,
    note: t.note ?? null,
    orderId: t.order_id ?? null,
    orderDisplayId: t.order?.display_id ?? null,
  }));
}

// --------------------------------------------------------------------------
// Earn (system, on order completion)
// --------------------------------------------------------------------------

/**
 * Idempotently award points for a completed order. Re-reads the order server-side
 * (never trusts the caller's claims) and only earns if the order is completed, has a
 * customer, and the partner has loyalty enabled. Safe to call from any completion path.
 */
export async function awardLoyaltyForOrder(
  orderId: string
): Promise<{ ok: boolean; points: number; reason?: string }> {
  if (!orderId) return { ok: false, points: 0, reason: "no order id" };
  try {
    const res = await fetchFromHasuraServer(
      `query OrderForAward($id: uuid!) {
        orders_by_pk(id: $id) { id user_id partner_id total_price status loyalty_points_earned type delivery_address delivery_location }
      }`,
      { id: orderId }
    );
    const o = res?.orders_by_pk;
    if (!o) return { ok: false, points: 0, reason: "order not found" };
    if (o.status !== "completed") return { ok: false, points: 0, reason: "order not completed" };
    if (!o.user_id) return { ok: false, points: 0, reason: "guest order" };
    if (o.loyalty_points_earned !== null && o.loyalty_points_earned !== undefined) {
      return { ok: true, points: o.loyalty_points_earned, reason: "already awarded" };
    }

    // Loyalty rules are per order type; the stored `type` conflates delivery and
    // takeaway (both "delivery"), so derive the logical type from type + address.
    const orderType = deriveLoyaltyOrderType(o.type, o.delivery_address, o.delivery_location);
    const { enabled, settings } = await loadPartnerLoyalty(o.partner_id, orderType);
    if (!enabled) return { ok: false, points: 0, reason: `loyalty disabled for ${orderType}` };

    const points = computeEarnPoints(Number(o.total_price) || 0, settings);

    if (points > 0) {
      try {
        await appendTxn({
          userId: o.user_id,
          partnerId: o.partner_id,
          type: "earn",
          points,
          orderId: o.id,
          note: `Earned on order`,
          meta: { order_total: o.total_price, earn_percent: settings.earn_percent, point_value: settings.point_value },
          createdBy: "system:order-complete",
        });
      } catch (e) {
        if (e instanceof OrderTxnExistsError) {
          // Earn already recorded by a concurrent completion trigger — fine.
        } else {
          throw e;
        }
      }
    }

    // Snapshot on the order (display + fast idempotency on future triggers).
    await fetchFromHasuraServer(
      `mutation MarkEarned($id: uuid!, $pts: Int!) {
        update_orders_by_pk(pk_columns: { id: $id }, _set: { loyalty_points_earned: $pts }) { id }
      }`,
      { id: orderId, pts: points }
    );

    return { ok: true, points };
  } catch (e) {
    console.error("[loyalty] awardLoyaltyForOrder failed", orderId, e);
    return { ok: false, points: 0, reason: (e as Error)?.message };
  }
}

// --------------------------------------------------------------------------
// Redeem (customer, at checkout)
// --------------------------------------------------------------------------

async function accountBalance(userId: string, partnerId: string): Promise<number> {
  const res = await fetchFromHasuraServer(
    `query Bal($u: uuid!, $p: uuid!) {
      loyalty_accounts(where: { user_id: { _eq: $u }, partner_id: { _eq: $p } }, limit: 1) { balance }
    }`,
    { u: userId, p: partnerId }
  );
  return res?.loyalty_accounts?.[0]?.balance ?? 0;
}

/**
 * Everything the checkout UI needs to render the "use points" control, without
 * leaking anything sensitive. Returns enabled=false (and zeroed values) for guests
 * or partners without loyalty.
 */
export async function getLoyaltyRedeemContext(partnerId: string): Promise<{
  enabled: boolean;
  balance: number;
  pointValue: number;
  byType: Record<
    LoyaltyOrderType,
    { enabled: boolean; minRedeemPoints: number; maxRedeemPercent: number }
  >;
}> {
  const auth = await getAuthCookie();
  const { v2, globalEnabled } = await loadPartnerLoyalty(partnerId);
  // Per-type redemption rules so the checkout can pick the block for whichever
  // order type the customer selects — no refetch when they switch tabs.
  const perType = (t: LoyaltyOrderType) => ({
    enabled: globalEnabled && v2.per_type[t].enabled,
    minRedeemPoints: v2.per_type[t].min_redeem_points,
    maxRedeemPercent: v2.per_type[t].max_redeem_percent,
  });
  const base = {
    pointValue: v2.point_value,
    byType: {
      delivery: perType("delivery"),
      takeaway: perType("takeaway"),
      dine_in: perType("dine_in"),
    },
  };
  const anyEnabled = globalEnabled && anyLoyaltyTypeEnabled(v2);
  if (!auth || auth.role !== "user" || !anyEnabled || !partnerId) {
    return { enabled: false, balance: 0, ...base };
  }
  return { enabled: true, balance: await accountBalance(auth.id, partnerId), ...base };
}

/**
 * Apply points to an ALREADY-CREATED order (FK requires the order row to exist).
 * The order is the source of truth: we read its current `total_price` as the
 * pre-redemption base (never trusting a client-supplied amount), verify the order
 * belongs to the caller, clamp the request to the live balance + bill cap, write the
 * signed redeem row, and CORRECT the order's stored total + loyalty fields. Returns
 * the authoritative figures — the online-payment path MUST charge `orderTotal`.
 * Idempotent per order (re-entry returns the existing redemption, never double-spends).
 */
export async function redeemLoyaltyPoints(args: {
  orderId: string;
  points: number;
}): Promise<RedeemResult> {
  const { orderId } = args;
  try {
    const { userId } = await requireUser();

    const ores = await fetchFromHasuraServer(
      `query OrderForRedeem($id: uuid!) {
        orders_by_pk(id: $id) { id user_id partner_id total_price status loyalty_points_redeemed loyalty_redeem_value type delivery_address delivery_location }
      }`,
      { id: orderId }
    );
    const o = ores?.orders_by_pk;
    if (!o) return { ok: false, points: 0, value: 0, orderTotal: 0, newBalance: 0, message: "Order not found." };
    if (o.user_id !== userId) {
      return { ok: false, points: 0, value: 0, orderTotal: o.total_price, newBalance: 0, message: "This order isn't yours." };
    }

    const base = Math.max(0, Number(o.total_price) || 0);

    // Idempotent fast-path: already redeemed → total is already corrected.
    if (o.loyalty_points_redeemed && o.loyalty_points_redeemed > 0) {
      return {
        ok: true,
        points: o.loyalty_points_redeemed,
        value: Number(o.loyalty_redeem_value) || 0,
        orderTotal: base,
        newBalance: await accountBalance(userId, o.partner_id),
        message: "Already redeemed for this order.",
      };
    }

    const orderType = deriveLoyaltyOrderType(o.type, o.delivery_address, o.delivery_location);
    const { enabled, settings } = await loadPartnerLoyalty(o.partner_id, orderType);
    if (!enabled) return { ok: false, points: 0, value: 0, orderTotal: base, newBalance: 0, message: `Loyalty isn't available for ${orderType} orders.` };

    const want = Math.floor(args.points);
    if (!Number.isFinite(want) || want <= 0) {
      return { ok: false, points: 0, value: 0, orderTotal: base, newBalance: 0, message: "No points to redeem." };
    }

    const balance = await accountBalance(userId, o.partner_id);
    const maxPoints = computeMaxRedeemable(base, balance, settings);
    const points = Math.min(want, maxPoints);
    if (points < settings.min_redeem_points || points <= 0) {
      return { ok: false, points: 0, value: 0, orderTotal: base, newBalance: balance, message: "Not enough points to redeem." };
    }

    const value = pointsToValue(points, settings);
    const orderTotal = Math.max(0, Math.round((base - value) * 100) / 100);

    let newBalance = balance - points;
    try {
      const r = await appendTxn({
        userId,
        partnerId: o.partner_id,
        type: "redeem",
        points,
        orderId,
        note: "Redeemed on order",
        meta: { value, order_total_before: base, point_value: settings.point_value },
        createdBy: `user:${userId}`,
      });
      newBalance = r.balanceAfter;
    } catch (e) {
      if (e instanceof OrderTxnExistsError) {
        // Ledger redeem exists but order fields weren't set (rare crash window) — reconcile.
        const existing = await getOrderRedeemTxn(orderId);
        if (existing) {
          const v = pointsToValue(existing.points, settings);
          const t = Math.max(0, Math.round((base - v) * 100) / 100);
          await setOrderRedemption(orderId, existing.points, v, t);
          return { ok: true, points: existing.points, value: v, orderTotal: t, newBalance: existing.balance_after };
        }
      }
      throw e;
    }

    await setOrderRedemption(orderId, points, value, orderTotal);
    return { ok: true, points, value, orderTotal, newBalance };
  } catch (e) {
    console.error("[loyalty] redeemLoyaltyPoints failed", orderId, e);
    return { ok: false, points: 0, value: 0, orderTotal: 0, newBalance: 0, message: (e as Error)?.message || "Could not redeem points." };
  }
}

async function setOrderRedemption(
  orderId: string,
  points: number,
  value: number,
  newTotal: number
): Promise<void> {
  await fetchFromHasuraServer(
    `mutation SetOrderRedemption($id: uuid!, $pts: Int!, $val: float8!, $total: float8!) {
      update_orders_by_pk(pk_columns: { id: $id }, _set: {
        loyalty_points_redeemed: $pts, loyalty_redeem_value: $val, total_price: $total
      }) { id }
    }`,
    { id: orderId, pts: points, val: value, total: newTotal }
  );
}

async function getOrderRedeemTxn(
  orderId: string
): Promise<{ points: number; balance_after: number } | null> {
  const res = await fetchFromHasuraServer(
    `query OrderRedeem($id: uuid!) {
      loyalty_transactions(where: { order_id: { _eq: $id }, type: { _eq: "redeem" } }, limit: 1) {
        delta balance_after
      }
    }`,
    { id: orderId }
  );
  const t = res?.loyalty_transactions?.[0];
  if (!t) return null;
  return { points: Math.abs(t.delta), balance_after: t.balance_after };
}

/**
 * Return points that were redeemed on an order that ultimately failed (payment
 * failed / expired / cancelled). Idempotent: at most one refund per order, and only
 * if a redeem exists.
 */
export async function refundLoyaltyForOrder(
  orderId: string,
  reason = "Order cancelled"
): Promise<{ ok: boolean; points: number; reason?: string }> {
  if (!orderId) return { ok: false, points: 0, reason: "no order id" };
  try {
    const res = await fetchFromHasuraServer(
      `query RefundLookup($id: uuid!) {
        redeem: loyalty_transactions(where: { order_id: { _eq: $id }, type: { _eq: "redeem" } }, limit: 1) {
          user_id partner_id delta
        }
        refund: loyalty_transactions(where: { order_id: { _eq: $id }, type: { _eq: "refund" } }, limit: 1) { id }
      }`,
      { id: orderId }
    );
    const redeem = res?.redeem?.[0];
    if (!redeem) return { ok: true, points: 0, reason: "nothing redeemed" };
    if (res?.refund?.[0]) return { ok: true, points: Math.abs(redeem.delta), reason: "already refunded" };

    const points = Math.abs(redeem.delta);
    try {
      await appendTxn({
        userId: redeem.user_id,
        partnerId: redeem.partner_id,
        type: "refund",
        points,
        orderId,
        note: reason,
        meta: { reason },
        createdBy: "system:refund",
      });
    } catch (e) {
      if (e instanceof OrderTxnExistsError) return { ok: true, points, reason: "already refunded" };
      throw e;
    }
    return { ok: true, points };
  } catch (e) {
    console.error("[loyalty] refundLoyaltyForOrder failed", orderId, e);
    return { ok: false, points: 0, reason: (e as Error)?.message };
  }
}

/**
 * Loyalty redemption/earn snapshot for one order, for the admin order detail and
 * the customer's order view. Access is limited to the order's partner, the order's
 * customer, or a superadmin.
 */
export async function getOrderLoyaltyInfo(
  orderId: string
): Promise<{ pointsRedeemed: number; redeemValue: number; pointsEarned: number | null }> {
  const empty = { pointsRedeemed: 0, redeemValue: 0, pointsEarned: null as number | null };
  if (!orderId) return empty;
  const auth = await getAuthCookie();
  if (!auth) return empty;
  try {
    const res = await fetchFromHasuraServer(
      `query OrderLoyalty($id: uuid!) {
        orders_by_pk(id: $id) { user_id partner_id loyalty_points_redeemed loyalty_redeem_value loyalty_points_earned }
      }`,
      { id: orderId }
    );
    const o = res?.orders_by_pk;
    if (!o) return empty;
    const allowed =
      auth.role === "superadmin" ||
      (auth.role === "partner" && o.partner_id === auth.id) ||
      (auth.role === "user" && o.user_id === auth.id);
    if (!allowed) return empty;
    return {
      pointsRedeemed: o.loyalty_points_redeemed ?? 0,
      redeemValue: Number(o.loyalty_redeem_value) || 0,
      pointsEarned: o.loyalty_points_earned ?? null,
    };
  } catch (e) {
    console.error("[loyalty] getOrderLoyaltyInfo failed", orderId, e);
    return empty;
  }
}

// --------------------------------------------------------------------------
// Partner admin
// --------------------------------------------------------------------------

export async function getPartnerLoyaltySummary(
  wantPartnerId?: string
): Promise<LoyaltyPartnerSummary> {
  const { partnerId } = await requirePartnerScope(wantPartnerId);
  const { settings } = await loadPartnerLoyalty(partnerId);
  const res = await fetchFromHasuraServer(
    `query Summary($pid: uuid!) {
      members: loyalty_accounts_aggregate(where: { partner_id: { _eq: $pid } }) {
        aggregate { count sum { balance lifetime_earned lifetime_redeemed } }
      }
    }`,
    { pid: partnerId }
  );
  const agg = res?.members?.aggregate;
  const outstanding = agg?.sum?.balance ?? 0;
  return {
    members: agg?.count ?? 0,
    outstandingPoints: outstanding,
    outstandingValue: pointsToValue(outstanding, settings),
    lifetimeIssued: agg?.sum?.lifetime_earned ?? 0,
    lifetimeRedeemed: agg?.sum?.lifetime_redeemed ?? 0,
  };
}

export async function getPartnerLoyaltyMembers(
  args: { search?: string; limit?: number; offset?: number; partnerId?: string } = {}
): Promise<LoyaltyMemberView[]> {
  const { partnerId } = await requirePartnerScope(args.partnerId);
  const limit = Math.min(100, Math.max(1, args.limit ?? 30));
  const offset = Math.max(0, args.offset ?? 0);
  const search = (args.search || "").trim();
  const where: any = { partner_id: { _eq: partnerId } };
  if (search) {
    where.user = { _or: [{ full_name: { _ilike: `%${search}%` } }, { phone: { _ilike: `%${search}%` } }] };
  }
  const res = await fetchFromHasuraServer(
    `query Members($where: loyalty_accounts_bool_exp!, $limit: Int!, $offset: Int!) {
      loyalty_accounts(where: $where, order_by: { balance: desc }, limit: $limit, offset: $offset) {
        user_id balance lifetime_earned lifetime_redeemed updated_at flagged_at
        user { full_name phone }
      }
    }`,
    { where, limit, offset }
  );
  return (res?.loyalty_accounts || []).map((a: any): LoyaltyMemberView => ({
    userId: a.user_id,
    name: a.user?.full_name || "Customer",
    phone: a.user?.phone || "",
    balance: a.balance,
    lifetimeEarned: a.lifetime_earned,
    lifetimeRedeemed: a.lifetime_redeemed,
    updatedAt: a.updated_at,
    flagged: !!a.flagged_at,
  }));
}

export async function getCustomerLoyaltyForPartner(
  userId: string,
  wantPartnerId?: string
): Promise<{ member: LoyaltyMemberView | null; history: LoyaltyTxnView[] }> {
  const { partnerId } = await requirePartnerScope(wantPartnerId);
  const res = await fetchFromHasuraServer(
    `query CustDetail($uid: uuid!, $pid: uuid!) {
      loyalty_accounts(where: { user_id: { _eq: $uid }, partner_id: { _eq: $pid } }, limit: 1) {
        user_id balance lifetime_earned lifetime_redeemed updated_at flagged_at
        user { full_name phone }
      }
      loyalty_transactions(
        where: { user_id: { _eq: $uid }, partner_id: { _eq: $pid } },
        order_by: { seq: desc }, limit: 100
      ) { id type delta balance_after created_at note order_id order { display_id } }
    }`,
    { uid: userId, pid: partnerId }
  );
  const a = res?.loyalty_accounts?.[0];
  const member: LoyaltyMemberView | null = a
    ? {
        userId: a.user_id,
        name: a.user?.full_name || "Customer",
        phone: a.user?.phone || "",
        balance: a.balance,
        lifetimeEarned: a.lifetime_earned,
        lifetimeRedeemed: a.lifetime_redeemed,
        updatedAt: a.updated_at,
        flagged: !!a.flagged_at,
      }
    : null;
  const history: LoyaltyTxnView[] = (res?.loyalty_transactions || []).map((t: any) => ({
    id: t.id,
    type: t.type,
    delta: t.delta,
    balanceAfter: t.balance_after,
    createdAt: t.created_at,
    note: t.note ?? null,
    orderId: t.order_id ?? null,
    orderDisplayId: t.order?.display_id ?? null,
  }));
  return { member, history };
}

/** Manual partner grant/deduct. Caller must own the partner (or be superadmin). */
export async function adminAdjustLoyalty(args: {
  userId: string;
  points: number;
  direction: "credit" | "debit";
  note?: string;
  partnerId?: string;
}): Promise<{ ok: boolean; newBalance?: number; message?: string }> {
  try {
    const { partnerId } = await requirePartnerScope(args.partnerId);
    const points = Math.floor(args.points);
    if (!Number.isFinite(points) || points <= 0) {
      return { ok: false, message: "Enter a positive whole number of points." };
    }
    if (!args.userId) return { ok: false, message: "No customer selected." };

    const type: LoyaltyTxnType = args.direction === "debit" ? "adjust_debit" : "adjust_credit";
    const actor = await getAuthCookie();
    try {
      const r = await appendTxn({
        userId: args.userId,
        partnerId,
        type,
        points,
        orderId: null,
        note: (args.note || "").slice(0, 280) || (args.direction === "debit" ? "Adjustment (debit)" : "Adjustment (credit)"),
        meta: { manual: true },
        createdBy: `partner:${actor?.id || partnerId}`,
      });
      return { ok: true, newBalance: r.balanceAfter };
    } catch (e) {
      if ((e as Error)?.message?.includes("Insufficient")) {
        return { ok: false, message: "Customer doesn't have enough points to deduct." };
      }
      throw e;
    }
  } catch (e) {
    console.error("[loyalty] adminAdjustLoyalty failed", e);
    return { ok: false, message: (e as Error)?.message || "Could not adjust points." };
  }
}
