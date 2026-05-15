"use server";

import { getAuthCookie } from "@/app/auth/actions";

type CancelResult =
  | { success: true }
  | { success: false; message: string };

export async function cancelOrderAction(
  orderId: string,
  cancelReason: string,
): Promise<CancelResult> {
  if (!orderId) return { success: false, message: "Missing order id" };
  const reason = (cancelReason ?? "").trim();
  if (!reason) return { success: false, message: "Cancellation reason is required" };

  const auth = await getAuthCookie();
  if (!auth) return { success: false, message: "Not authenticated" };

  if (auth.role !== "user" && auth.role !== "partner") {
    return { success: false, message: "Only users or partners can cancel orders" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_PETPOOJA_BACKEND_URL;
  const secret = process.env.CANCEL_AUTH_SECRET;
  if (!baseUrl) return { success: false, message: "Petpooja backend URL not configured" };
  if (!secret) return { success: false, message: "Cancel auth secret not configured" };

  try {
    const res = await fetch(`${baseUrl}/api/webhook/cancel-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cancel-auth": secret,
      },
      body: JSON.stringify({
        order_id: orderId,
        cancel_reason: reason,
        actor: { role: auth.role, id: auth.id },
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || body?.success === false) {
      return { success: false, message: body?.message || `Cancel failed (${res.status})` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error" };
  }
}
