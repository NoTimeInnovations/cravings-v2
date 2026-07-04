import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  requireScope,
  checkRateLimit,
  clientIp,
  logRequest,
  apiError,
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
} from "@/lib/publicApi/gate";
import { sendTemplateForPartner, type MediaType } from "@/lib/publicApi/whatsappSend";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PATH = "/api/v1/whatsapp/send-template";
// A reserved-but-unfinished idempotency key older than this is considered
// abandoned (e.g. the process crashed mid-send) and can be taken over.
const STALE_IDEM_MS = 120_000;

// POST /api/v1/whatsapp/send-template
// Auth: Authorization: Bearer <api_key>
// Body: { to, template_name, language, body_params?, header_params?,
//         header_media_url?, header_media_type?, button_params?, idempotency_key? }
// Sends from the partner's DEFAULT (primary) connected WhatsApp number.
export async function POST(req: NextRequest) {
  const authed = await authenticate(req);
  if ("res" in authed) return authed.res;
  const auth = authed.auth;
  const ip = clientIp(req);

  const scopeErr = requireScope(auth, "whatsapp");
  if (scopeErr) {
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status: 403, ip });
    return scopeErr;
  }

  const rl = await checkRateLimit(auth);
  if (rl) {
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status: 429, ip });
    return rl;
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status: 400, ip });
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const to = String(body?.to ?? "").trim();
  const templateName = String(body?.template_name ?? "").trim();
  const language = String(body?.language ?? "").trim();
  const idemKey = String(
    body?.idempotency_key ?? req.headers.get("idempotency-key") ?? "",
  ).trim();

  if (!to || !templateName || !language) {
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status: 400, ip, ref: idemKey });
    return apiError(400, "missing_fields", "'to', 'template_name', and 'language' are required.");
  }

  // Idempotency: atomically RESERVE the key before sending. Winner proceeds;
  // a concurrent/repeat caller gets the stored result (if done) or 409 in-progress.
  if (idemKey) {
    let claim = await claimIdempotency(auth.keyId, idemKey);
    if (!claim.won) {
      if (claim.response != null) {
        const s = claim.status ?? 200;
        logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status: s, ip, ref: idemKey });
        return NextResponse.json({ ...claim.response, duplicate: true }, { status: s });
      }
      // Reserved but not yet finished. Take it over only if the prior reservation
      // is stale (crashed mid-flight); otherwise it's a live concurrent duplicate.
      if (claim.ageMs < STALE_IDEM_MS) {
        logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status: 409, ip, ref: idemKey });
        return apiError(409, "in_progress", "A request with this idempotency_key is still processing. Retry shortly.");
      }
      await releaseIdempotency(auth.keyId, idemKey);
      claim = await claimIdempotency(auth.keyId, idemKey);
      if (!claim.won) {
        logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status: 409, ip, ref: idemKey });
        return apiError(409, "in_progress", "A request with this idempotency_key is still processing. Retry shortly.");
      }
    }
  }

  const headerMediaType = body?.header_media_type;
  const outcome = await sendTemplateForPartner({
    partnerId: auth.partnerId,
    to,
    templateName,
    language,
    bodyParams: Array.isArray(body?.body_params) ? body.body_params.map(String) : [],
    headerParams: Array.isArray(body?.header_params) ? body.header_params.map(String) : [],
    headerMediaUrl: typeof body?.header_media_url === "string" ? body.header_media_url : null,
    headerMediaType: ["image", "video", "document"].includes(headerMediaType)
      ? (headerMediaType as MediaType)
      : null,
    buttonParams: Array.isArray(body?.button_params) ? body.button_params.map(String) : [],
  });

  const status = outcome.ok ? 200 : outcome.status;
  const responseBody = outcome.ok
    ? { ok: true, message_id: outcome.messageId, to: outcome.to, status: "sent" }
    : { ok: false, error: outcome.error, ...(outcome.detail ? { detail: outcome.detail } : {}) };

  // Finalize the reservation: store the success for replay, or release it so a
  // failed send can be retried with the same key.
  if (idemKey) {
    if (outcome.ok) await completeIdempotency(auth.keyId, idemKey, status, responseBody);
    else await releaseIdempotency(auth.keyId, idemKey);
  }
  logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status, ip, ref: idemKey });
  return NextResponse.json(responseBody, { status });
}
