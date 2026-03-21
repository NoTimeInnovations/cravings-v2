import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

export async function POST(request: NextRequest) {
  try {
    const { phone, text, partnerId, template } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    if (!text && !template) {
      return NextResponse.json(
        { error: "text or template is required" },
        { status: 400 }
      );
    }

    // Determine which credentials to use — default to Menuthere's
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    let accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

    // If partnerId provided, check if they have their own WABA connected
    if (partnerId) {
      try {
        const query = `
          query GetPartnerWhatsApp($partner_id: uuid!) {
            whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
              phone_number_id
              access_token
            }
          }
        `;
        const data = await fetchFromHasura(query, { partner_id: partnerId });
        const integration = data?.whatsapp_business_integrations?.[0];

        if (integration?.phone_number_id && integration?.access_token) {
          phoneNumberId = integration.phone_number_id;
          accessToken = integration.access_token;
        }
      } catch {
        // Table may not exist yet or query failed — use Menuthere's credentials
      }
    }

    // Format phone number — remove everything except digits
    let formattedPhone = phone.replace(/[\s\-\+\(\)]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "91" + formattedPhone.slice(1);
    }
    if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    // Build message payload
    let messagePayload: any = {
      messaging_product: "whatsapp",
      to: formattedPhone,
    };

    if (template) {
      // Template message (for business-initiated conversations)
      messagePayload.type = "template";
      messagePayload.template = {
        name: template.name,
        language: { code: template.language || "en" },
        components: [
          {
            type: "body",
            parameters: (template.parameters || []).map((p: string) => ({
              type: "text",
              text: p,
            })),
          },
        ],
      };
    } else {
      // Free-form text (only works within 24hr customer-initiated window)
      messagePayload.type = "text";
      messagePayload.text = { body: text };
    }

    // Send via WhatsApp Cloud API
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("WhatsApp Cloud API error:", res.status, errBody);
      return NextResponse.json(
        { error: "Failed to send WhatsApp message", details: errBody },
        { status: 500 }
      );
    }

    const result = await res.json();
    return NextResponse.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (error) {
    console.error("WhatsApp API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
