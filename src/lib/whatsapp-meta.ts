import { fetchFromHasura } from "@/lib/hasuraClient";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Token Exchange ───────────────────────────────────────────────
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
}> {
  const res = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        code,
      }),
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Meta token exchange failed:", err);
    throw new Error("Failed to exchange code for token");
  }

  return res.json();
}

// ─── Debug Token → extract WABA ID & Phone Number ID ─────────────
export async function getConnectedWabaInfo(accessToken: string): Promise<{
  wabaId: string;
  phoneNumberId: string;
}> {
  const res = await fetch(
    `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new Error("Failed to debug token");
  }

  const data = await res.json();
  const scopes = data.data?.granular_scopes || [];

  const wabaId = scopes.find(
    (s: any) => s.scope === "whatsapp_business_management",
  )?.target_ids?.[0];

  const phoneNumberId = scopes.find(
    (s: any) => s.scope === "whatsapp_business_messaging",
  )?.target_ids?.[0];

  if (!wabaId || !phoneNumberId) {
    throw new Error("Could not extract WABA ID or Phone Number ID from token");
  }

  return { wabaId, phoneNumberId };
}

// ─── Subscribe to webhooks for a WABA ────────────────────────────
export async function subscribeWabaWebhooks(
  wabaId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${GRAPH_API_BASE}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to subscribe WABA webhooks:", err);
    throw new Error("Failed to subscribe to WABA webhooks");
  }
}

// ─── Fetch display phone number from Meta ────────────────────────
export async function getPhoneNumberDetails(
  phoneNumberId: string,
  accessToken: string,
): Promise<{ displayPhone: string; verifiedName: string | null }> {
  const res = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    console.error("Failed to fetch phone number details:", await res.text());
    return { displayPhone: "", verifiedName: null };
  }

  const data = await res.json();
  return {
    displayPhone: data.display_phone_number || "",
    verifiedName: data.verified_name || null,
  };
}

// ─── Save/Update integration in Hasura ───────────────────────────
export async function saveWhatsAppIntegration(data: {
  partner_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  display_phone?: string;
}) {
  // Check if integration already exists for this partner
  const checkQuery = `
    query CheckWhatsAppIntegration($partner_id: uuid!) {
      whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
        id
      }
    }
  `;

  const checkRes = await fetchFromHasura(checkQuery, {
    partner_id: data.partner_id,
  });

  const existingId =
    checkRes?.whatsapp_business_integrations?.[0]?.id;

  if (existingId) {
    // Update existing
    const mutation = `
      mutation UpdateWhatsAppIntegration($id: uuid!, $changes: whatsapp_business_integrations_set_input!) {
        update_whatsapp_business_integrations_by_pk(pk_columns: {id: $id}, _set: $changes) {
          id
        }
      }
    `;
    await fetchFromHasura(mutation, {
      id: existingId,
      changes: {
        waba_id: data.waba_id,
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
        display_phone: data.display_phone || null,
        updated_at: new Date().toISOString(),
      },
    });
  } else {
    // Insert new
    const mutation = `
      mutation InsertWhatsAppIntegration($object: whatsapp_business_integrations_insert_input!) {
        insert_whatsapp_business_integrations_one(object: $object) {
          id
        }
      }
    `;
    await fetchFromHasura(mutation, {
      object: {
        partner_id: data.partner_id,
        waba_id: data.waba_id,
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
        display_phone: data.display_phone || null,
        updated_at: new Date().toISOString(),
      },
    });
  }
}

// ─── Lookup partner by WABA ID ───────────────────────────────────
export async function getPartnerByWabaId(wabaId: string) {
  const query = `
    query GetPartnerByWaba($waba_id: String!) {
      whatsapp_business_integrations(where: {waba_id: {_eq: $waba_id}}) {
        id
        partner_id
        phone_number_id
        access_token
      }
    }
  `;

  const res = await fetchFromHasura(query, { waba_id: wabaId });
  return res?.whatsapp_business_integrations?.[0] || null;
}

// ─── Lookup partner by Phone Number ID ───────────────────────────
export async function getPartnerByPhoneNumberId(phoneNumberId: string) {
  const query = `
    query GetPartnerByPhoneNumber($phone_number_id: String!) {
      whatsapp_business_integrations(where: {phone_number_id: {_eq: $phone_number_id}}) {
        id
        partner_id
        phone_number_id
        access_token
      }
    }
  `;

  const res = await fetchFromHasura(query, {
    phone_number_id: phoneNumberId,
  });
  return res?.whatsapp_business_integrations?.[0] || null;
}

// ─── Send a WhatsApp message via Cloud API ───────────────────────
export async function sendWhatsAppCloudMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
) {
  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp Cloud API send failed:", err);
    return false;
  }

  return true;
}
