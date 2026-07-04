import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  requireScope,
  checkRateLimit,
  clientIp,
  logRequest,
  apiError,
} from "@/lib/publicApi/gate";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { getPartnerWabaIntegration } from "@/lib/whatsapp-meta";

export const dynamic = "force-dynamic";

const PATH = "/api/v1/whatsapp/templates";

// Count distinct {{n}} placeholders in the BODY component.
function bodyVarCount(components: any[]): number {
  const body = (components || []).find((c) => String(c?.type).toUpperCase() === "BODY");
  const text: string = body?.text || "";
  const idx = new Set<number>();
  (text.match(/\{\{(\d+)\}\}/g) || []).forEach((m) => {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!isNaN(n)) idx.add(n);
  });
  return idx.size;
}

function headerInfo(components: any[]): { has_header: boolean; header_format: string | null } {
  const h = (components || []).find((c) => String(c?.type).toUpperCase() === "HEADER");
  return { has_header: !!h, header_format: h ? String(h.format || "TEXT").toUpperCase() : null };
}

// GET /api/v1/whatsapp/templates
// Lists the calling partner's APPROVED templates on their default number's WABA,
// so the caller knows valid template_name + how many body variables to send.
export async function GET(req: NextRequest) {
  const authed = await authenticate(req);
  if ("res" in authed) return authed.res;
  const auth = authed.auth;
  const ip = clientIp(req);

  const scopeErr = requireScope(auth, "whatsapp");
  if (scopeErr) {
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "GET", path: PATH, status: 403, ip });
    return scopeErr;
  }

  const rl = await checkRateLimit(auth);
  if (rl) {
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "GET", path: PATH, status: 429, ip });
    return rl;
  }

  try {
    // Templates the default number can actually send (per-WABA at Meta).
    const integration = await getPartnerWabaIntegration(auth.partnerId);
    const primaryWaba = integration?.waba_id || null;

    const data = await fetchFromHasuraServer(
      `query ApiTemplates($p: uuid!) {
        whatsapp_message_templates(
          where: { partner_id: { _eq: $p }, status: { _eq: "APPROVED" } }
          order_by: { name: asc }
        ) { name language category status components waba_id }
      }`,
      { p: auth.partnerId },
    );
    const rows = (data?.whatsapp_message_templates || []) as Array<any>;
    // Scope to the default number's WABA (legacy null-waba rows included).
    const scoped = primaryWaba
      ? rows.filter((r) => !r.waba_id || r.waba_id === primaryWaba)
      : rows;

    const templates = scoped.map((r) => {
      const { has_header, header_format } = headerInfo(r.components);
      return {
        name: r.name,
        language: r.language,
        category: r.category,
        status: r.status,
        body_variables: bodyVarCount(r.components),
        has_header,
        header_format,
      };
    });

    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "GET", path: PATH, status: 200, ip });
    return NextResponse.json({ ok: true, templates });
  } catch (e: any) {
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "GET", path: PATH, status: 500, ip });
    return apiError(500, "list_failed", "Could not load templates.");
  }
}
