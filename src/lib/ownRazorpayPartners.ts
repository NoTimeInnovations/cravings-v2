// Client-safe: which partners collect order payments through their OWN Razorpay
// account instead of the platform Cashfree. Uses NEXT_PUBLIC_* env (inlined at
// build). Keep the slugs in sync with the server registry in
// src/app/actions/razorpayPartner.ts (FLAMIN, REGU, HIGHJOINT, FOODOUT, ...).
export function usesOwnRazorpay(partnerId?: string | null): boolean {
  if (!partnerId) return false;
  const ids = [
    process.env.NEXT_PUBLIC_FLAMIN_PARTNER_ID,
    process.env.NEXT_PUBLIC_REGU_PARTNER_ID,
    process.env.NEXT_PUBLIC_HIGHJOINT_PARTNER_ID,
    process.env.NEXT_PUBLIC_FOODOUT_PARTNER_ID,
  ].filter(Boolean) as string[];
  return ids.includes(partnerId);
}
