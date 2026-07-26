import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Partner low-balance alert (#8 + #10). Vercel cron.
 *
 * For each partner that dispatches Porter through a pool group, sum their pool's
 * live wallet balance (bridge accounts whose `groupNumber` == their Porter group)
 * and WhatsApp them when it drops below their threshold — the partner's own
 * `delivery_rules.low_balance_threshold`, or the ₹100 DEFAULT when Porter is
 * connected and they haven't set one (an explicit 0 turns alerts off).
 * Transition-gated via
 * `delivery_rules.low_balance_alerted` so a still-low partner isn't re-alerted
 * every tick; recovering back above the threshold re-arms it.
 *
 * A group can map to MULTIPLE partners (shared pool) — each is evaluated against
 * its OWN threshold + alerted flag independently.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (allowed when CRON_SECRET unset,
 * mirroring the other crons). The actual WhatsApp send is gated on
 * `WA_LOWBAL_TEMPLATE` (an approved template on Menuthere's WABA); until that's
 * set the cron computes but skips the send WITHOUT arming, so it fires once the
 * template exists.
 */

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

async function bridgePorterAccounts(): Promise<Array<Record<string, any>>> {
  const url = process.env.PORTER_BRIDGE_URL;
  const key = process.env.PORTER_BRIDGE_API_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/api/v1/accounts`, {
      headers: { "X-API-Key": key },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const j = await res.json().catch(() => null);
    const rows: Array<Record<string, any>> = Array.isArray(j) ? j : (j?.data ?? []);
    return rows.filter((a) => (a.service ?? "porter") === "porter" && a.status === "active");
  } catch {
    return [];
  }
}

async function patchRules(id: string, rules: Record<string, any>): Promise<void> {
  await fetchFromHasuraServer(
    `mutation PatchRules($id: uuid!, $rules: jsonb!, $updatedAt: timestamptz!) {
      update_partners_by_pk(pk_columns: { id: $id }, _set: { delivery_rules: $rules, updated_at: $updatedAt }) { id }
    }`,
    { id, rules, updatedAt: new Date().toISOString() },
  ).catch(() => {});
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // All Porter-bridge-connected partners (they carry a delivery_provider_groups
  // key). Each is evaluated against its own threshold, or the ₹100 default when
  // Porter is connected and they haven't set one.
  let partners: Array<Record<string, any>> = [];
  try {
    const d = await fetchFromHasuraServer(
      `query LowBalPartners {
        partners(where: { delivery_rules: { _has_key: "delivery_provider_groups" } }, limit: 2000) {
          id store_name phone delivery_rules
        }
      }`,
      {},
    );
    partners = (d?.partners ?? []) as Array<Record<string, any>>;
  } catch (err) {
    return NextResponse.json({ error: `hasura: ${(err as Error).message}` }, { status: 500 });
  }

  const porterAccounts = await bridgePorterAccounts();
  // The low-balance template lives on oreodemo's WABA, so the send must go FROM
  // that WABA (partnerId). Both are env-overridable but default so it works
  // out-of-box once Meta approves the template.
  const template = process.env.WA_LOWBAL_TEMPLATE || "porter_wallet_low_balance";
  const alertFromPartnerId =
    process.env.WA_LOWBAL_PARTNER_ID || "cc101d1f-eb37-42e1-9c6a-5384a3def37f"; // oreodemo
  const language = process.env.WA_LOWBAL_TEMPLATE_LANG || "en";
  const origin = new URL(req.url).origin;
  const CUR = "₹";

  let checked = 0;
  let alerted = 0;
  let cleared = 0;
  let skippedNoSend = 0;

  for (const p of partners) {
    const rules =
      p.delivery_rules && typeof p.delivery_rules === "object"
        ? { ...(p.delivery_rules as Record<string, any>) }
        : {};
    const group = String((rules.delivery_provider_groups ?? {}).porter ?? "").trim();
    if (!group) continue;

    const pool = porterAccounts.filter((a) => String(a.groupNumber ?? "") === group);
    // Porter is "connected" only if the pool has ≥1 active account. No pool → no
    // default, no alert (avoids a false "₹0 below ₹100" for unconnected partners).
    if (!pool.length) continue;

    // Effective threshold: the partner's own value if set, else the ₹100 default
    // (Porter IS connected). An explicit 0 = the partner turned alerts off.
    const hasThreshold = Object.prototype.hasOwnProperty.call(
      rules,
      "low_balance_threshold",
    );
    const threshold = hasThreshold ? (num(rules.low_balance_threshold) ?? 0) : 100;
    if (threshold <= 0) continue;

    const balance = pool.reduce((s, a) => s + (num(a.walletBalance) ?? 0), 0);
    checked++;

    const wasAlerted = rules.low_balance_alerted === true;
    const low = balance < threshold;

    if (low && !wasAlerted) {
      const phone = String(p.phone || "").replace(/\D/g, "");
      // Can't actually send yet (no template / no phone) → leave UN-armed so it
      // fires once the template is configured. Don't spam-arm silently.
      if (!template || phone.length < 10) {
        skippedNoSend++;
        continue;
      }
      try {
        const res = await fetch(`${origin}/api/whatsapp/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phone,
            partnerId: alertFromPartnerId,
            template: {
              name: template,
              language,
              parameters: [`${CUR}${balance} (below your ${CUR}${threshold} alert)`],
            },
          }),
        });
        if (!res.ok) {
          console.warn(`[porter-low-balance] send ${res.status} for ${p.id}`);
          continue; // don't arm on a failed send — retry next tick
        }
      } catch (err) {
        console.warn(`[porter-low-balance] send error for ${p.id}:`, (err as Error).message);
        continue;
      }
      rules.low_balance_alerted = true;
      rules.low_balance_alerted_at = new Date().toISOString();
      await patchRules(p.id, rules);
      alerted++;
    } else if (!low && wasAlerted) {
      delete rules.low_balance_alerted;
      delete rules.low_balance_alerted_at;
      await patchRules(p.id, rules);
      cleared++;
    }
  }

  return NextResponse.json({
    ok: true,
    templateConfigured: Boolean(template),
    partners: partners.length,
    checked,
    alerted,
    cleared,
    skippedNoSend,
  });
}
