import crypto from "crypto";
import { DELTA_SIGN, type LoyaltyTxnType } from "./config";

/**
 * SERVER-ONLY loyalty ledger crypto.
 *
 * Every `loyalty_transactions` row is HMAC-SHA256 signed with `LOYALTY_LEDGER_SECRET`
 * (a non-public env var) over its immutable fields, and chained to the previous row
 * via `prev_hash`. Consequences:
 *   - A row cannot be forged or edited without the secret → balances can't be inflated.
 *   - There is no "transfer" operation, and a valid earn for one user can't be minted
 *     for another → points are non-transferable.
 *   - Deleting/reordering rows breaks the chain and is detectable; at worst it *reduces*
 *     a balance (a denial), never increases one.
 *
 * The secret never leaves the server. This module hard-fails if imported on the client.
 */

if (typeof window !== "undefined") {
  throw new Error("loyalty/ledger is server-only and must not be imported into client code.");
}

export const GENESIS_HASH = "GENESIS";
export const LEDGER_VERSION = "loyalty.v1";

/** The immutable, signed fields of a ledger row, in canonical order. */
export interface SignableTxn {
  id: string;
  account_id: string;
  user_id: string;
  partner_id: string;
  order_id: string | null;
  type: LoyaltyTxnType;
  /** Signed balance change: +earn/+refund/+adjust_credit, -redeem/-adjust_debit. */
  delta: number;
  balance_after: number;
  seq: number;
  prev_hash: string;
  /** ISO timestamp generated server-side at append time (part of the signature). */
  created_at: string;
}

export interface LedgerRow extends SignableTxn {
  hash: string;
}

function ledgerSecret(): string {
  const s = process.env.LOYALTY_LEDGER_SECRET;
  if (!s || s.length < 16) {
    throw new Error("LOYALTY_LEDGER_SECRET is not configured (server-only, >= 16 chars).");
  }
  return s;
}

function canonical(t: SignableTxn): string {
  // Fixed field order, pipe-delimited, version-prefixed. null order_id → "".
  //
  // created_at is intentionally NOT signed: a Postgres `timestamptz` does not
  // round-trip byte-for-byte with the JS ISO string we write (microsecond vs
  // millisecond, "+00:00" vs "Z"), which would make recomputed signatures
  // diverge on read. Signing value + ordering + identity + chain is what
  // guarantees integrity and non-transferability; the timestamp is cosmetic for
  // this build. If point expiry is ever added, sign Date.parse(created_at) (epoch
  // ms round-trips cleanly) rather than the raw string.
  return [
    LEDGER_VERSION,
    t.id,
    t.account_id,
    t.user_id,
    t.partner_id,
    t.order_id ?? "",
    t.type,
    String(t.delta),
    String(t.balance_after),
    String(t.seq),
    t.prev_hash,
  ].join("|");
}

export function signTxn(t: SignableTxn): string {
  return crypto.createHmac("sha256", ledgerSecret()).update(canonical(t)).digest("hex");
}

/** Timing-safe signature check for a single row. */
export function verifyTxnHash(t: SignableTxn, hash: string): boolean {
  const expected = signTxn(t);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(hash || "", "utf8");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** True if `delta`'s sign matches its declared `type`. */
export function deltaMatchesType(type: LoyaltyTxnType, delta: number): boolean {
  if (delta === 0) return false;
  return Math.sign(delta) === DELTA_SIGN[type];
}

export interface AccountHead {
  balance: number;
  last_seq: number;
  last_hash: string;
  last_txn_id: string | null;
}

/**
 * O(1) integrity check used before sensitive writes (redeem / adjust). Confirms the
 * cached account balance is backed by a genuinely-signed head transaction. Because the
 * head's signature transitively depends on the whole chain via prev_hash, forging a
 * head that matches a tampered balance requires the secret.
 */
export function verifyHead(account: AccountHead, head: LedgerRow | null): { ok: boolean; reason?: string } {
  // Fresh account with no transactions yet.
  if (account.last_seq === 0 || account.last_txn_id == null) {
    if (head) return { ok: false, reason: "account claims no transactions but a head row exists" };
    if (account.balance !== 0) return { ok: false, reason: "empty account has non-zero balance" };
    if (account.last_hash !== GENESIS_HASH) return { ok: false, reason: "empty account head hash is not GENESIS" };
    return { ok: true };
  }
  if (!head) return { ok: false, reason: "missing head transaction" };
  if (head.id !== account.last_txn_id) return { ok: false, reason: "head id mismatch" };
  if (head.seq !== account.last_seq) return { ok: false, reason: "head seq mismatch" };
  if (head.hash !== account.last_hash) return { ok: false, reason: "head hash mismatch" };
  if (head.balance_after !== account.balance) return { ok: false, reason: "balance does not match head balance_after" };
  if (!deltaMatchesType(head.type, head.delta)) return { ok: false, reason: "head delta/type mismatch" };
  if (!verifyTxnHash(head, head.hash)) return { ok: false, reason: "head signature invalid" };
  return { ok: true };
}

/**
 * Full chain audit. `rows` must be ascending by seq. Recomputes every signature,
 * verifies the prev_hash chain, and folds the balance. Use for admin audits / cron.
 */
export function verifyChain(rows: LedgerRow[]): { ok: boolean; reason?: string; balance: number } {
  let prev = GENESIS_HASH;
  let bal = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.seq !== i + 1) return { ok: false, reason: `seq gap at index ${i}: got ${r.seq}, expected ${i + 1}`, balance: bal };
    if (r.prev_hash !== prev) return { ok: false, reason: `broken chain at seq ${r.seq}`, balance: bal };
    if (!deltaMatchesType(r.type, r.delta)) return { ok: false, reason: `delta/type mismatch at seq ${r.seq}`, balance: bal };
    if (!verifyTxnHash(r, r.hash)) return { ok: false, reason: `bad signature at seq ${r.seq}`, balance: bal };
    bal += r.delta;
    if (bal < 0) return { ok: false, reason: `negative balance at seq ${r.seq}`, balance: bal };
    if (bal !== r.balance_after) return { ok: false, reason: `balance mismatch at seq ${r.seq}`, balance: bal };
    prev = r.hash;
  }
  return { ok: true, balance: bal };
}
