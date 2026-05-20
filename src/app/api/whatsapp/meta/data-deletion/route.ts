import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Meta's Data Deletion Callback. When a user removes our app from their
// Facebook account, Meta POSTs here with a signed_request containing the
// Meta `user_id`. We must:
//   1. Verify the HMAC-SHA256 signature with our app secret.
//   2. Tear down everything we hold for that user/partner.
//   3. Respond with a public URL + confirmation_code Meta can show the user.
//
// Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback

function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): { user_id?: string } | null {
  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload) return null;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest();
  const provided = base64urlDecode(encodedSig);
  if (expected.length !== provided.length) return null;
  if (!crypto.timingSafeEqual(expected, provided)) return null;

  try {
    return JSON.parse(base64urlDecode(payload).toString("utf8"));
  } catch {
    return null;
  }
}

const FIND_PARTNER_BY_META_USER = `
  query FindPartnerByMetaUser($user_id: String!) {
    whatsapp_business_integrations(where: {meta_user_id: {_eq: $user_id}}, limit: 1) {
      partner_id
    }
  }
`;

const DELETE_INTEGRATION = `
  mutation DeleteIntegration($partner_id: uuid!) {
    delete_whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_TEMPLATES = `
  mutation DeleteTemplates($partner_id: uuid!) {
    delete_whatsapp_message_templates(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_LOGS = `
  mutation DeleteLogs($partner_id: uuid!) {
    delete_whatsapp_message_logs(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("META_APP_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Meta posts application/x-www-form-urlencoded with a single field.
  let signedRequest: string | null = null;
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    signedRequest = (form.get("signed_request") as string) || null;
  } else if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    signedRequest = body?.signed_request || null;
  }

  if (!signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const decoded = parseSignedRequest(signedRequest, appSecret);
  if (!decoded?.user_id) {
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 401 });
  }

  const metaUserId = decoded.user_id;
  const confirmationCode = `wad-${crypto.randomBytes(8).toString("hex")}`;

  // Resolve our partner from the Meta user id we stored at connect time, then
  // tear down everything. Errors here are logged but we still return a
  // confirmation to Meta — the partner can request audit info via support.
  try {
    const res = await fetchFromHasura(FIND_PARTNER_BY_META_USER, {
      user_id: metaUserId,
    });
    const partnerId =
      res?.whatsapp_business_integrations?.[0]?.partner_id ?? null;

    if (partnerId) {
      await Promise.all([
        fetchFromHasura(DELETE_TEMPLATES, { partner_id: partnerId }).catch((e) =>
          console.warn("delete templates failed", e?.message),
        ),
        fetchFromHasura(DELETE_LOGS, { partner_id: partnerId }).catch((e) =>
          console.warn("delete logs failed", e?.message),
        ),
      ]);
      // Delete integration last so the lookup above can succeed if Meta
      // re-sends the callback.
      await fetchFromHasura(DELETE_INTEGRATION, {
        partner_id: partnerId,
      }).catch((e) => console.warn("delete integration failed", e?.message));
    }
  } catch (e: any) {
    console.error("data-deletion teardown failed:", e?.message || e);
  }

  const host = req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const url = `${proto}://${host}/data-deletion-status?code=${confirmationCode}`;

  return NextResponse.json({ url, confirmation_code: confirmationCode });
}

// GET is exposed so an admin can sanity-check the route is alive.
export async function GET() {
  return NextResponse.json({
    ok: true,
    docs: "POST signed_request from Meta's Data Deletion Callback",
  });
}
