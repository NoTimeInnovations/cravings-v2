import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { signDeliveryToken } from "@/lib/deliveryAuth";

// Rider login. Replaces the delivery app's old direct-to-Hasura login (which
// required the admin secret in the client). The app POSTs { phone, password,
// deviceToken? }; we verify against Hasura server-side and return a scoped JWT
// the app uses for all subsequent Hasura calls + its realtime subscription.
//
// NOTE: passwords are still compared in plaintext here, mirroring the existing
// `delivery_boys.password` column. Hashing (bcrypt + hash-on-next-login) is a
// follow-up — it needs a data migration and is deliberately out of scope for
// this change, which only moves the admin secret off the client.

const LOGIN_QUERY = `
  query LoginDeliveryBoy($phone: String!, $password: String!) {
    delivery_boys(
      where: {
        phone: { _eq: $phone },
        password: { _eq: $password },
        is_active: { _eq: true }
      },
      limit: 1
    ) {
      id
      name
      phone
      partner_id
      partner {
        store_name
        currency
      }
    }
  }
`;

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
  try {
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const deviceToken =
      typeof body?.deviceToken === "string" && body.deviceToken.length > 0
        ? body.deviceToken
        : null;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "phone and password are required" },
        { status: 400 },
      );
    }

    const { delivery_boys } = await fetchFromHasura(LOGIN_QUERY, {
      phone,
      password,
    });
    const deliveryBoy = delivery_boys?.[0];

    if (!deliveryBoy) {
      // Same opaque response whether phone is unknown, password is wrong, or
      // the account is inactive — don't leak which.
      return NextResponse.json(
        { error: "Invalid phone number or password" },
        { status: 401 },
      );
    }

    // Best-effort device-token registration; a failure here must never block
    // login (the app re-registers via /api/delivery/device-token anyway).
    if (deviceToken) {
      const nowIso = new Date().toISOString();
      try {
        await fetchFromHasura(UPSERT_DEVICE_TOKEN, {
          object: {
            device_token: deviceToken,
            user_id: deliveryBoy.id,
            platform: "android",
            created_at: nowIso,
            updated_at: nowIso,
          },
        });
      } catch (e) {
        console.error("[delivery/login] device token save failed:", e);
      }
    }

    const token = await signDeliveryToken(deliveryBoy.id);
    return NextResponse.json({ token, deliveryBoy });
  } catch (err: unknown) {
    console.error(
      "[delivery/login] error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
