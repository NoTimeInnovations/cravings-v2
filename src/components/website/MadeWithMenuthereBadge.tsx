// Paid plan IDs — any other plan (trial, free, missing) shows the watermark.
const PAID_PLAN_IDS = new Set([
  "in_bundle_monthly",
  "in_bundle_yearly",
  "int_digital_monthly",
  "int_digital_yearly",
  "in_enterprise",
  "int_enterprise",
]);

function parseSubscription(raw: any): { planId: string | null } {
  if (!raw) return { planId: null };
  let s: any = raw;
  if (typeof raw === "string") {
    try {
      s = JSON.parse(raw);
    } catch {
      return { planId: null };
    }
  }
  return { planId: s?.plan?.id ?? null };
}

export function MadeWithMenuthereBadge({
  subscriptionDetails,
}: {
  subscriptionDetails?: any;
}) {
  const { planId } = parseSubscription(subscriptionDetails);
  if (planId && PAID_PLAN_IDS.has(planId)) return null;

  return (
    <a
      href="https://menuthere.com"
      target="_blank"
      rel="noopener noreferrer"
      className="wb4-watermark"
      style={{ color: "#0c0a09" }}
    >
      <span style={{ color: "#9A9A9A" }}>Made with</span>
      <img
        src="/menuthere-logo-new.svg"
        alt="Menuthere"
        width={16}
        height={16}
        style={{ display: "block", height: 16, width: "auto" }}
      />
      <span style={{ color: "#0c0a09", fontWeight: 600 }}>Menuthere</span>
    </a>
  );
}
