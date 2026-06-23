"use server";

// Super-admin only: permanently delete a customer AND everything linked to them,
// in one atomic transaction. The order below is leaf-first, derived from the live
// foreign-key graph (introspected from information_schema):
//
//   users
//   ├─ loyalty_accounts / loyalty_transactions   CASCADE  (auto on user delete)
//   ├─ offers_claimed, payments, reviews, table_orders   RESTRICT (deleted here)
//   └─ orders                                     RESTRICT (deleted here)
//      ├─ delivery_events, order-linked reviews   CASCADE  (auto on order delete)
//      └─ order_items → pos → pos_items           RESTRICT (deleted leaf-first)
//
// Runs as a single SQL batch via Hasura's /v2/query run_sql, which wraps the
// whole thing in one transaction — so it's all-or-nothing.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasuraBase(): string {
  const explicit = process.env.HASURA_GRAPHQL_ENDPOINT_HASURA;
  if (explicit) return explicit.replace(/\/$/, "");
  const gql =
    process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT ||
    process.env.HASURA_GRAPHQL_ENDPOINT ||
    "";
  return gql.replace(/\/v1\/graphql\/?$/, "").replace(/\/$/, "");
}

export async function deleteCustomerFully(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test((userId || "").trim())) {
    return { ok: false, error: "Invalid customer id" };
  }
  const id = userId.trim();

  const base = hasuraBase();
  const secret =
    process.env.HASURA_GRAPHQL_ADMIN_SECRET ||
    process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET;
  if (!base || !secret) {
    return { ok: false, error: "Hasura is not configured on the server" };
  }

  // id is a validated UUID, so direct interpolation is injection-safe.
  const sql = `
    DELETE FROM pos_items WHERE pos_id IN (
      SELECT p.id FROM pos p
      JOIN order_items oi ON p.order_id = oi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = '${id}'
    );
    DELETE FROM pos WHERE order_id IN (
      SELECT oi.id FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = '${id}'
    );
    DELETE FROM order_items WHERE order_id IN (
      SELECT id FROM orders WHERE user_id = '${id}'
    );
    DELETE FROM orders WHERE user_id = '${id}';
    DELETE FROM offers_claimed WHERE user_id = '${id}';
    DELETE FROM payments WHERE user_id = '${id}';
    DELETE FROM reviews WHERE user_id = '${id}';
    DELETE FROM table_orders WHERE user_id = '${id}';
    DELETE FROM users WHERE id = '${id}';
  `;

  try {
    const res = await fetch(`${base}/v2/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": secret,
      },
      body: JSON.stringify({
        type: "run_sql",
        args: { source: "default", sql, cascade: false },
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error || json?.code) {
      const msg =
        json?.error ||
        json?.internal?.error?.message ||
        `Hasura error (${res.status})`;
      console.error("deleteCustomerFully failed:", json || res.status);
      return { ok: false, error: String(msg) };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("deleteCustomerFully threw:", e);
    return { ok: false, error: e?.message || "Network error" };
  }
}
