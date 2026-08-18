import { NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Drop webhook delivery rows older than 24 hours.
 *
 * The log exists to answer "did my last order reach my POS, and what did it say"
 * — a question that is only ever about the recent past. Keeping it to a day
 * covers a full service either side of any complaint while stopping a table that
 * grows with every order on every partner forever: one row per ATTEMPT, and a
 * failing endpoint writes three.
 *
 * It is diagnostics, not an audit trail. Nothing reads it to make a decision —
 * the trigger handler dedupes on `ok` rows within the same event, which resolve
 * in seconds — so ageing it out cannot change behaviour.
 */
const PURGE = `
  mutation PurgeWebhookDeliveries($before: timestamptz!) {
    delete_webhook_deliveries(where: { created_at: { _lt: $before } }) {
      affected_rows
    }
  }
`;

export async function GET() {
  const before = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const res: any = await fetchFromHasuraServer(PURGE, { before });
    const deleted = res?.delete_webhook_deliveries?.affected_rows ?? 0;
    return NextResponse.json({ ok: true, deleted, before });
  } catch (e) {
    console.error("[purge-webhook-logs] failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "purge failed" },
      { status: 500 },
    );
  }
}
