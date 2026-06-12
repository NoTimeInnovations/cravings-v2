// Shown on the storefront when a customer opens an order link that has passed
// its 30-minute expiry. Prompts them to message "hi" on WhatsApp for a fresh
// link (which the welcome flow generates).
export function ExpiredOrderLinkCard({
  storeName,
  waNumber,
}: {
  storeName?: string | null;
  waNumber?: string | null;
}) {
  const digits = (waNumber || "").replace(/[^0-9]/g, "");
  const waLink = digits ? `https://wa.me/${digits}?text=hi` : null;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="text-6xl">⏱️</div>
      <h1 className="text-2xl font-bold">Order link expired</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your ordering link{storeName ? ` for ${storeName}` : ""} has expired.
        Send <span className="font-semibold">“hi”</span> on WhatsApp to get a
        fresh link and place your order.
      </p>
      {waLink && (
        <a
          href={waLink}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-green-700"
        >
          Send “hi” on WhatsApp
        </a>
      )}
    </div>
  );
}
