// Shown on the storefront when a customer opens an order link that can no longer
// be used: either it passed its expiry, or it was already opened by someone else
// (single-use / session-locked links — a forwarded link is dead for everyone but
// the first opener). Prompts them to message "Hi" on WhatsApp for a fresh link
// (which the welcome flow generates).
export function ExpiredOrderLinkCard({
  storeName,
  waNumber,
  reason = "expired",
}: {
  storeName?: string | null;
  waNumber?: string | null;
  reason?: "expired" | "used";
}) {
  const digits = (waNumber || "").replace(/[^0-9]/g, "");
  const waLink = digits ? `https://wa.me/${digits}?text=Hi` : null;

  const used = reason === "used";
  const title = used ? "Link already used" : "Order link expired";
  const body = used
    ? `This ordering link${storeName ? ` for ${storeName}` : ""} has already been opened. For your security each link works only once.`
    : `Your ordering link${storeName ? ` for ${storeName}` : ""} has expired.`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="text-6xl">{used ? "🔒" : "⏱️"}</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {body} Send <span className="font-semibold">“Hi”</span> on WhatsApp to
        get a fresh link and place your order.
      </p>
      {waLink && (
        <a
          href={waLink}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-green-700"
        >
          Send “Hi”
        </a>
      )}
    </div>
  );
}
