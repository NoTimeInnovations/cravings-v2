# Security hardening — staged migration off browser-exposed secrets

Surfaced while building loyalty points. Two app-wide weaknesses let a determined user
tamper with data or impersonate accounts. The loyalty ledger is already safe against
both (signed, server-only). These fixes harden **the rest of the app** and should each
land as their own reviewed PR — they are intentionally **not** bundled into the loyalty
change because they are cross-cutting and one of them logs every user out.

---

## Weakness 1 — Hasura admin secret is shipped to the browser

`src/lib/hasuraClient.ts` reads `NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET`, so the
god-mode secret is in the client bundle. Anyone can extract it and read/write **any**
table directly, bypassing all permissions.

**Target:** the browser talks to Hasura as a scoped role (`user` / `partner` / `anonymous`)
via a short-lived JWT; the admin secret lives only on the server.

**Staged plan**
1. **Server client (done).** `src/lib/hasuraServerClient.ts` uses the server-only
   `HASURA_SERVER_ADMIN_SECRET`. New privileged code (loyalty) already uses it.
2. **JWT mode.** Configure `HASURA_GRAPHQL_JWT_SECRET` on Hasura. On login, mint a JWT
   with `x-hasura-user-id` / `x-hasura-default-role` / `x-hasura-allowed-roles`. Hasura
   accepts admin-secret **and** JWT during the transition, so nothing breaks yet.
3. **Define permissions per table/role.** The loyalty tables already ship the reference
   pattern (`user`: select rows where `user_id = X-Hasura-User-Id`; `partner`: by
   `X-Hasura-Partner-Id`; no client writes). Work table-by-table: select first, then
   insert/update/delete, mirroring what the client actually does.
4. **Switch the client** from `x-hasura-admin-secret` to `Authorization: Bearer <jwt>`.
   Move any genuinely-privileged client calls to server actions (like loyalty).
5. **Remove `NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET`** once every query is covered and
   verified. This is the step that closes the hole; do it last, behind a full QA pass.

Rough order by surface: orders → menu/offers → partner CRUD → analytics/misc.

---

## Weakness 2 — Auth cookie is encrypted with a browser-exposed key

`src/lib/encrtption.ts` encrypts the `new_auth_token` cookie with
`NEXT_PUBLIC_ENCRYPTION_KEY`. The cookie is httpOnly (client JS can't read it), but
because the AES key is in the bundle, an attacker can **mint a valid cookie for any
user id** and impersonate them — which would let them spend that user's loyalty points
(and do anything else that trusts `getAuthCookie`).

**Fix**
1. Introduce a **server-only** `AUTH_ENCRYPTION_KEY` (no `NEXT_PUBLIC_`). Confirm
   `encryptText`/`decryptText` are only called from server code (`src/app/auth/actions.ts`)
   — they are today.
2. Switch encryption to the server-only key. **Do not** keep the public key as a decrypt
   fallback — that would leave the forgery path open.
3. Consequence: existing sessions can't be decrypted → **every user is logged out once**
   and signs back in. Schedule accordingly (off-peak, with a heads-up).
4. Optional: switch to a signed (HMAC/JWT) session token so tampering is detectable
   rather than relying on encryption secrecy.

Until this lands, loyalty redemption is exactly as forgeable as every other
cookie-trusting server action in the app (e.g. order cancellation) — no worse, but the
signed ledger means a forger could spend a victim's points yet still cannot *inflate*
or *mint* points.
