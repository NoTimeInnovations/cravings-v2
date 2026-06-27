import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { requireDeliveryBoy } from "@/lib/deliveryAuth";

// Register / refresh a rider's push (OneSignal) device token. Used on
// auto-login and whenever the OneSignal subscription id changes — i.e. the
// cases where the app has a session but no password to re-login with. The
// rider is identified from the bearer token, never from the body, so a rider
// can only ever write their own token.

const UPSERT_DEVICE_TOKEN = `
  mutation InsertOrUpdateDeviceToken($object: device_tokens_insert_input!) {
    insert_device_tokens_one(
      object: $object,
      on_conflict: {
        constraint: device_tokens_user_id_device_token_key,
        update_columns: [platform, updated_at]
      }
    ) { id }
  }
`;

export async function POST(req: NextRequest) {
  const deliveryBoyId = await requireDeliveryBoy(req);
  if (!deliveryBoyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const deviceToken =
    typeof body?.deviceToken === "string" ? body.deviceToken.trim() : "";
  if (!deviceToken) {
    return NextResponse.json(
      { error: "deviceToken is required" },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  try {
    await fetchFromHasura(UPSERT_DEVICE_TOKEN, {
      object: {
        device_token: deviceToken,
        user_id: deliveryBoyId,
        platform: "android",
        created_at: nowIso,
        updated_at: nowIso,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error(
      "[delivery/device-token] save failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: "Failed to save device token" },
      { status: 500 },
    );
  }
}
