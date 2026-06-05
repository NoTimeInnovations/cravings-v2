# Loyalty Points

Partner-scoped customer loyalty. A customer earns a configurable % of every
**completed** order's total as points, and can redeem those points against future
orders **at the same partner only**. Points are non-transferable and tamper-evident.

> Money model (locked): **1 point = ₹1** (`point_value`, configurable internally).
> Default earn rate **2%**. A ₹500 completed order → 10 points → ₹10 off next time.

---

## Feature flag

`loyalty_points` in `src/lib/getFeatures.ts` (stored in `partners.feature_flags` as
`loyalty_points-true|false`, same comma-separated convention as every other flag).

- **access** — superadmin grants it (add `loyalty_points-false` to the partner's
  `feature_flags`). Once present, the partner sees the toggle + settings.
- **enabled** — the partner turns it on under **Settings → Features**. Gates earning,
  the checkout redeem UI, and the admin Loyalty surfaces.

## Settings (`partners.loyalty_settings`, JSON string)

Configured under **Settings → Loyalty** (`LoyaltyPointsSettings.tsx`). Shape +
defaults live in `src/lib/loyalty/config.ts`:

| field | default | meaning |
|---|---|---|
| `earn_percent` | 2 | % of order total earned on completion |
| `min_order_amount` | 0 | minimum order total (₹) to earn |
| `max_redeem_percent` | 100 | max % of a bill payable with points |
| `min_redeem_points` | 1 | minimum points to redeem on an order |
| `point_value` | 1 | ₹ per point (kept at 1) |

---

## Data model (`neon db` source)

- **`loyalty_accounts`** — one row per `(user_id, partner_id)`. Holds the cached
  `balance`, `lifetime_earned`, `lifetime_redeemed`, and the chain head
  (`last_seq`, `last_hash`, `last_txn_id`). `UNIQUE(user_id, partner_id)`.
- **`loyalty_transactions`** — append-only, **HMAC-signed, hash-chained** ledger.
  Types: `earn`, `redeem`, `refund`, `adjust_credit`, `adjust_debit`. Each row stores
  a signed `delta`, the running `balance_after`, a per-account `seq`, `prev_hash`, and
  `hash`. `UNIQUE(account_id, seq)` serializes writes; a partial
  `UNIQUE(order_id, type)` makes earn/redeem/refund idempotent per order.
- **`orders`** gains `loyalty_points_redeemed`, `loyalty_redeem_value`,
  `loyalty_points_earned` (display + idempotency snapshots).

Migration: `hasura/migrations/neon db/1780200000000_create_loyalty_points/`. Table
metadata + role permissions: `public_loyalty_accounts.yaml`,
`public_loyalty_transactions.yaml`. **Already applied to the live `neon db`.**

---

## Security model — why points can't be tampered or transferred

The Hasura admin secret is currently shipped to the browser
(`NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET`), and there are no row-level Hasura
permissions, so *anyone who extracts that secret can write any table directly*. The
loyalty ledger is therefore designed to be safe **even against an attacker who holds
the admin secret**:

1. **Signed, chained ledger.** Every row is `HMAC-SHA256`-signed with
   `LOYALTY_LEDGER_SECRET` — a **server-only** key (no `NEXT_PUBLIC_` prefix, never in
   the browser bundle) — over `(id, account, user, partner, order, type, delta,
   balance_after, seq, prev_hash)`, and chained to the previous row via `prev_hash`.
   - Forging or editing a row requires the secret → **balances can't be inflated**.
   - There is no "transfer" operation, and a valid earn for user A can't be minted for
     user B → **points are non-transferable**.
   - Deleting/reordering rows breaks the chain and is detected; at worst it *reduces* a
     balance (a denial), never increases one.
2. **Server-only writes.** All mutations go through `src/app/actions/loyalty.ts`
   ("use server") using `src/lib/hasuraServerClient.ts` (the server-only secret). The
   client never writes loyalty tables.
3. **Verify-before-spend.** Before any redeem/adjust, the cached balance is checked
   against the signed head (`verifyHead`); a mismatch **flags the account**
   (`flagged_at`) and blocks further writes. `verifyChain` is the full audit.
4. **Identity** comes from the encrypted httpOnly auth cookie (`getAuthCookie`), the
   same trust basis as every other server action in this app.

Verified live: `append → chain-verify → balance fold → idempotency → tamper detection
→ concurrency` all pass (see the integrity test referenced in the PR).

### ⚠️ Root-cause follow-up (begin the migration)

`loyalty_points` is safe today, but two app-wide weaknesses remain and should be fixed
in their own staged passes (see `feature_readme/SECURITY-admin-secret-migration.md`):

1. The browser-exposed admin secret (forward-looking `user`/`partner` SELECT
   permissions are already defined on the loyalty tables as the reference pattern).
2. The auth cookie is AES-encrypted with a **browser-exposed** key
   (`NEXT_PUBLIC_ENCRYPTION_KEY`), so the identity cookie is theoretically forgeable.
   This was **not** silently changed here because re-keying logs every user out.

---

## Flows

### Earn (on completion)
`updateOrderStatus(...,'completed')` in `orderStore.ts` and `posStore.ts` fire
`awardLoyaltyForOrder(orderId)` (fire-and-forget). It re-reads the real order
server-side, self-gates on the partner's flag, computes points from `total_price`, and
writes one signed `earn` (idempotent on `order_id`). Optional bulletproof backstop:
a Hasura event trigger → `POST /api/loyalty/award` (see below).

### Redeem (at checkout)
`PlaceOrderModal` shows `LoyaltyRedeemCard` (balance + slider, capped by
`max_redeem_percent`). The order is created at its pre-redeem total, then
`redeemLoyaltyPoints({orderId, points})`:
- reads the order as the authoritative base total (never trusts a client amount),
- re-validates the balance + caps, writes the signed `redeem`,
- **corrects** `orders.total_price` and returns the amount to charge.

COD applies the correction directly. Online (Cashfree) redeems **before** locking the
charge, so the customer is charged the post-redemption total.

### Refund (compensating credit)
If a redeemed order fails, a signed `refund` is appended (idempotent):
- online payment fail → in `PlaceOrderModal`; abandoned/expired → `expireCfOrder`;
- cancellation → `cancelOrderAction`.

---

## Surfaces

- **Admin → Loyalty** (`AdminV2Loyalty.tsx`, sidebar, feature-gated): summary
  (members, outstanding liability, lifetime issued/redeemed), searchable member list,
  per-customer history + **manual grant/deduct** (`adminAdjustLoyalty`, signed).
- **Admin → order detail** (`OrderDetails.tsx`): "Loyalty Points Redeemed (N pts) −₹X",
  "Balance Payable", and points earned.
- **Customer → checkout**: redeem card + "View history".
- **Customer → order page** (`OrderClient.tsx`): redeemed line, "You earned N points",
  and a tappable points badge → bottom-sheet history (`LoyaltyPointsBadge` /
  `LoyaltyHistorySheet`).

---

## Deployment — REQUIRED env vars

Add to every server environment (e.g. Vercel). The loyalty server actions throw
without them:

```
HASURA_SERVER_ADMIN_SECRET=<prod Hasura admin secret>   # server-only (NO NEXT_PUBLIC_)
LOYALTY_LEDGER_SECRET=<random 32-byte hex>              # server-only; permanent (rotating
                                                        # invalidates existing signatures)
```

(`HASURA_SERVER_GRAPHQL_ENDPOINT` is optional; it falls back to the public endpoint URL,
which isn't a secret.) `.env` already has both locally.

> **Use the SAME `LOYALTY_LEDGER_SECRET` in every environment that touches the shared
> production ledger** (Vercel prod, local dev, previews). The secret is the HMAC key for
> the ledger signatures, so a different value in another environment would make rows
> signed elsewhere fail verification. Copy the exact value from `.env` — do NOT generate
> a new one per environment. (Only a genuinely separate database, e.g. an isolated
> staging DB, would get its own key.) `HASURA_SERVER_ADMIN_SECRET` is simply your
> existing Hasura admin secret under a non-public name.

### Optional: Hasura event trigger (most robust earn)
The in-app hooks cover every UI completion path. For a DB-level backstop, add a Hasura
event trigger on `orders` UPDATE → `POST https://<app>/api/loyalty/award` with header
`Authorization: Bearer <CRON_SECRET>`. The route is idempotent and self-gating.
