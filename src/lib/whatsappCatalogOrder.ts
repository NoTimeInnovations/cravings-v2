/**
 * Inbound WhatsApp catalogue carts (`type: "order"`).
 *
 * When a customer browses a connected catalogue and taps "Send cart", Meta
 * delivers an `order` message listing `product_retailer_id`s. Ours ARE menu
 * uuids (whatsappCatalog.ts sets retailer_id = menu.id), so the cart maps back
 * with a plain `where id in (...)`.
 *
 * ── Why unmatched ids are a normal case, not an error ─────────────────────────
 *
 * 89 of 95 connected numbers are coexistence (`is_on_biz_app: true`) and carry
 * the WhatsApp Business app's OWN on-device catalogue alongside ours. A cart
 * built from THAT catalogue arrives here with the phone app's retailer ids,
 * which are not menu uuids and never will be. The customer did nothing wrong
 * and must not be met with silence or an error — so a cart is answered on a
 * best-effort basis: send what we recognised, say plainly what we could not.
 *
 * Nothing here prices anything. The `ro` payload carries ids and quantities
 * only; checkout re-prices every line against the live menu, so a stale
 * catalogue can produce a stale LISTING but never a wrong bill.
 */

export interface CatalogOrderLine {
  retailerId: string;
  quantity: number;
}

export interface ParsedCatalogOrder {
  catalogId: string | null;
  /** Free-text the customer typed with the cart, if any. */
  note: string | null;
  lines: CatalogOrderLine[];
}

/**
 * Pull the cart out of an inbound `order` message.
 *
 * Deliberately tolerant: Meta sends `quantity` and `item_price` as strings in
 * some versions and numbers in others, and a malformed row must drop itself
 * rather than sink the whole cart.
 */
export function parseCatalogOrder(msg: unknown): ParsedCatalogOrder | null {
  const m = msg as {
    type?: string;
    order?: {
      catalog_id?: string;
      text?: string;
      product_items?: Array<{ product_retailer_id?: string; quantity?: unknown }>;
    };
  } | null;
  if (!m || m.type !== "order" || !m.order) return null;

  const lines: CatalogOrderLine[] = [];
  for (const p of m.order.product_items ?? []) {
    const retailerId = typeof p?.product_retailer_id === "string" ? p.product_retailer_id.trim() : "";
    if (!retailerId) continue;
    const qty = Math.trunc(Number(p?.quantity));
    lines.push({ retailerId, quantity: Number.isFinite(qty) && qty > 0 ? qty : 1 });
  }

  // Same product twice in one cart is legal; collapse to one line so the
  // storefront does not get two rows for the same dish.
  const byId = new Map<string, CatalogOrderLine>();
  for (const l of lines) {
    const seen = byId.get(l.retailerId);
    if (seen) seen.quantity += l.quantity;
    else byId.set(l.retailerId, { ...l });
  }

  const note = typeof m.order.text === "string" && m.order.text.trim() ? m.order.text.trim() : null;
  return {
    catalogId: typeof m.order.catalog_id === "string" ? m.order.catalog_id : null,
    note,
    lines: [...byId.values()],
  };
}

/** A uuid — the only thing that can possibly be one of our menu ids. Filtering
 *  on shape first means a phone-app cart never becomes a 60-id Hasura `_in`. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeMenuId(retailerId: string): boolean {
  return UUID_RE.test(retailerId);
}

/**
 * The `ro=` reorder payload ReorderHandler decodes.
 *
 * Shape is fixed by src/components/hotelDetail/ReorderHandler.tsx:
 *   { i: [[menuId, qty, variantName|null], ...], t, a, c }
 *
 * Catalogue products are one-per-menu-row with no variants by design, so the
 * third slot is always null.
 */
export function buildCatalogReorderPayload(
  lines: Array<{ menuId: string; quantity: number }>,
): string | null {
  const items = lines
    .filter((l) => l.menuId)
    .map((l) => [l.menuId, l.quantity > 0 ? l.quantity : 1, null]);
  if (!items.length) return null;
  return Buffer.from(JSON.stringify({ i: items })).toString("base64url");
}

/**
 * What to say back. Kept pure so the wording is testable and the webhook stays
 * a thin caller.
 *
 * `matched` are dishes we resolved; `unmatchedCount` are ids we could not, which
 * on a coexistence number usually means the customer used the phone app's own
 * catalogue.
 */
export function composeCatalogOrderReply(opts: {
  storeName: string;
  matched: Array<{ name: string; quantity: number }>;
  unmatchedCount: number;
}): string {
  const { storeName, matched, unmatchedCount } = opts;

  if (!matched.length) {
    return (
      `Thanks for your cart! 🛒\n\n` +
      `We couldn't match those items to our current menu, so please pick them again on our ordering page — ` +
      `everything there is live and in stock.`
    );
  }

  const list = matched
    .map((m, i) => `${i + 1}. ${m.name}${m.quantity > 1 ? ` × ${m.quantity}` : ""}`)
    .join("\n");

  // Never claim a total. Checkout prices the order; anything quoted here could
  // disagree with the bill.
  const missing =
    unmatchedCount > 0
      ? `\n\n${unmatchedCount} item${unmatchedCount === 1 ? "" : "s"} from your cart ${
          unmatchedCount === 1 ? "isn't" : "aren't"
        } on our current menu — please add ${unmatchedCount === 1 ? "it" : "them"} again if you still want ${
          unmatchedCount === 1 ? "it" : "them"
        }.`
      : "";

  return `Thanks for your cart at ${storeName}! 🛒\n\n${list}${missing}\n\nTap below to confirm and check out 👇`;
}
