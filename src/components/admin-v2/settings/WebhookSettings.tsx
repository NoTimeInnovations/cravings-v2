"use client";

import { useState, useEffect, useCallback } from "react";
import { listWebhookDeliveries, type WebhookDelivery } from "@/app/actions/webhookDeliveries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, RefreshCw, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { sendTestWebhook } from "@/app/actions/sendTestWebhook";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import {
  isSafeWebhookUrl,
  parseWebhookSettings,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  EVENT_HEADER,
} from "@/lib/webhooks/orderWebhook";

/**
 * Webhooks — push each new order to the partner's own POS or back-office.
 *
 * v1 sends one event, `order.created`. The docs below are deliberately in the
 * product rather than a separate wiki: the person wiring this up is usually the
 * partner's developer, who has this screen open and nothing else.
 */

const EXAMPLE_PAYLOAD = `{
  "event": "order.created",
  "id": "order.created:3f9a1c72-...",
  "created_at": "2026-08-14T09:12:04.512Z",
  "data": {
    "order_id": "3f9a1c72-8d41-4e2a-9b77-1c0a5e6f3b21",
    "order_number": 42,
    "status": "pending",
    "type": "delivery",
    "placed_at": "2026-08-14T09:12:04.191+00:00",
    "currency": "₹",
    "totals": {
      "subtotal": 520,
      "delivery_charge": 40,
      "packing_charge": 10,
      "gst": 26,
      "discount": 50,
      "grand_total": 546
    },
    "customer": {
      "name": "Athira Pavithran",
      "phone": "9633912352",
      "address": "10A, Nethaji Nagar, Kadavanthra, Kochi 682020"
    },
    "table": null,
    "items": [
      {
        "name": "Butter Chicken",
        "quantity": 2,
        "unit_price": 200,
        "total_price": 400,
        "variant": null,
        "notes": "less spicy"
      },
      {
        "name": "Porotta",
        "quantity": 4,
        "unit_price": 30,
        "total_price": 120,
        "variant": null,
        "notes": null
      }
    ],
    "notes": "Ring the bell twice",
    "payment": { "method": "upi", "is_paid": true }
  }
}`;

const VERIFY_SNIPPET = `// Node / Express — verify BEFORE trusting the body
import crypto from "crypto";

app.post("/menuthere/webhook",
  express.raw({ type: "application/json" }),   // raw body, NOT express.json()
  (req, res) => {
    const signature = req.header("${SIGNATURE_HEADER}");
    const expected = crypto
      .createHmac("sha256", process.env.MENUTHERE_WEBHOOK_SECRET)
      .update(req.body)                        // the exact bytes we sent
      .digest("hex");

    // timingSafeEqual avoids leaking the secret through response timing
    const ok =
      signature &&
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!ok) return res.status(401).send("bad signature");

    const { event, id, data } = JSON.parse(req.body.toString());
    // \`id\` repeats on a retry — skip if you have already handled it
    handleOrder(data);
    res.sendStatus(200);   // reply 2xx quickly; do slow work after
  }
);`;

function CopyBox({ title, code }: { title: string; code: string }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{title}</Label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={() => {
                        navigator.clipboard.writeText(code).then(
                            () => toast.success("Copied"),
                            () => toast.error("Couldn't copy"),
                        );
                    }}
                >
                    <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
            </div>
            {/* overflow-x-auto so a long line scrolls inside the box instead of
                widening the whole settings page */}
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

export function WebhookSettings() {
    // Delivery history — the answer to "did it fire?", which nothing recorded before.
    const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
    const [deliveriesLoading, setDeliveriesLoading] = useState(false);
    const loadDeliveries = useCallback(async () => {
        setDeliveriesLoading(true);
        const res = await listWebhookDeliveries(20);
        if (res.ok) setDeliveries(res.deliveries);
        setDeliveriesLoading(false);
    }, []);
    useEffect(() => {
        void loadDeliveries();
    }, [loadDeliveries]);

    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges, setIsSaving } = useAdminSettingsStore();

    const [enabled, setEnabled] = useState(false);
    const [url, setUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [showSecret, setShowSecret] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; status?: number; error?: string } | null>(null);

    useEffect(() => {
        const s = parseWebhookSettings((userData as any)?.webhook_settings);
        setEnabled(!!s.enabled);
        setUrl(s.url || "");
        setSecret(s.secret || "");
    }, [userData]);

    const urlCheck = isSafeWebhookUrl(url);
    // An empty URL is "not configured yet", not an error to shout about — only
    // complain once they have typed something that cannot work.
    const urlError = url.trim() && !urlCheck.ok ? urlCheck.reason : null;

    const handleSave = useCallback(async () => {
        if (!userData?.id) return;
        if (enabled) {
            if (!isSafeWebhookUrl(url).ok) {
                toast.error(isSafeWebhookUrl(url).reason || "Enter a valid https:// URL");
                return;
            }
            if (!secret.trim()) {
                toast.error("Add a signing secret so your endpoint can verify the request");
                return;
            }
        }
        setSaving(true);
        setIsSaving(true);
        try {
            const webhook_settings = { enabled, url: url.trim(), secret: secret.trim() };
            await updatePartner(userData.id, { webhook_settings } as any);
            revalidateTag(userData.id);
            setState({ webhook_settings } as any);
            setHasChanges(false);
            toast.success("Webhook saved");
        } catch (e) {
            console.error("Failed to save webhook settings:", e);
            toast.error("Could not save the webhook");
        } finally {
            setSaving(false);
            setIsSaving(false);
        }
    }, [userData, enabled, url, secret, setState, setHasChanges, setIsSaving]);

    useEffect(() => {
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSave, setSaveAction, setHasChanges]);

    // Track edits so the floating Save button lights up, same as every other
    // settings section.
    useEffect(() => {
        const s = parseWebhookSettings((userData as any)?.webhook_settings);
        setHasChanges(
            !!s.enabled !== enabled || (s.url || "") !== url || (s.secret || "") !== secret,
        );
    }, [userData, enabled, url, secret, setHasChanges]);

    // Tests what is TYPED, not what is saved — the point of a test button is a
    // short loop, and requiring a save first would mean persisting a config you
    // already suspect is wrong.
    const runTest = async () => {
        const guard = isSafeWebhookUrl(url);
        if (!guard.ok) {
            toast.error(guard.reason || "Enter a valid https:// URL");
            return;
        }
        if (!secret.trim()) {
            toast.error("Add a signing secret first — the test is signed with it");
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await sendTestWebhook(url.trim(), secret.trim());
            setTestResult(res);
            if (res.ok) toast.success(`Endpoint replied ${res.status}`);
            else toast.error(res.error ? `Failed: ${res.error}` : `Endpoint replied ${res.status}`);
        } catch (e) {
            const error = e instanceof Error ? e.message : "request failed";
            setTestResult({ ok: false, error });
            toast.error(`Failed: ${error}`);
        } finally {
            setTesting(false);
        }
    };

    const generateSecret = () => {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        setSecret(
            "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
        );
        setShowSecret(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Webhooks</CardTitle>
                    <CardDescription>
                        Send each new order straight to your own POS or back-office. We POST a signed
                        JSON payload the moment an order is placed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5 pr-3">
                            <Label className="text-sm">Send order webhooks</Label>
                            <p className="text-xs text-muted-foreground">
                                Off by default. Nothing is sent until this is on and both fields below are set.
                            </p>
                        </div>
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                    </div>

                    <div className="space-y-2">
                        <Label>Endpoint URL</Label>
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://pos.yourrestaurant.com/menuthere/webhook"
                        />
                        {urlError ? (
                            <p className="text-xs text-red-600">{urlError}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Must be <span className="font-medium">https://</span> and reachable from the
                                internet — a local address on your own network can&apos;t be called.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Signing secret</Label>
                        <div className="flex gap-2">
                            <Input
                                type={showSecret ? "text" : "password"}
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                placeholder="whsec_…"
                                className="font-mono text-xs"
                            />
                            <Button type="button" variant="outline" size="icon" onClick={() => setShowSecret((v) => !v)}>
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={generateSecret}>
                                <RefreshCw className="h-3.5 w-3.5" /> Generate
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Keep this on your server only. Use it to check the{" "}
                            <code className="rounded bg-muted px-1">{SIGNATURE_HEADER}</code> header so you
                            can be sure a request really came from us.
                        </p>
                    </div>

                    <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-0.5 pr-3">
                                <Label className="text-sm">Send a test event</Label>
                                <p className="text-xs text-muted-foreground">
                                    Posts a sample <code className="rounded bg-muted px-1">order.created</code>{" "}
                                    to the URL above using the values on this screen — no need to save first.
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={runTest} disabled={testing}>
                                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                {testing ? "Sending…" : "Send test event"}
                            </Button>
                        </div>

                        {testResult && (
                            <div
                                className={`flex items-start gap-2 rounded-md p-2 text-xs ${
                                    testResult.ok
                                        ? "bg-green-50 text-green-800"
                                        : "bg-red-50 text-red-800"
                                }`}
                            >
                                {testResult.ok ? (
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                ) : (
                                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                )}
                                <span>
                                    {testResult.ok
                                        ? `Delivered — your endpoint replied ${testResult.status}.`
                                        : testResult.error
                                          ? `Not delivered: ${testResult.error}`
                                          : `Your endpoint replied ${testResult.status}. Reply with a 2xx status to accept the event.`}
                                </span>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            The test carries{" "}
                            <code className="rounded bg-muted px-1">&quot;test&quot;: true</code> on the
                            envelope and obviously fake values — check for it and skip, so a test never
                            reaches your kitchen.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>What we send</CardTitle>
                    <CardDescription>
                        One event today: <code className="rounded bg-muted px-1">order.created</code>, fired
                        as soon as an order is placed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Headers</Label>
                        <pre className="overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed">
                            <code>{`POST  your endpoint
content-type: application/json
${EVENT_HEADER}: order.created
${TIMESTAMP_HEADER}: 1786000324          ← unix seconds
${SIGNATURE_HEADER}: 9f2c…    ← HMAC-SHA256 of the raw body, hex`}</code>
                        </pre>
                    </div>

                    <CopyBox title="Example payload" code={EXAMPLE_PAYLOAD} />
                    <CopyBox title="Verifying the signature" code={VERIFY_SNIPPET} />

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
                        <p className="font-semibold">Three things that catch people out</p>
                        <p>
                            <span className="font-medium">Sign the raw bytes.</span> Verify against the request
                            body exactly as received — parsing and re-serialising the JSON changes key order and
                            spacing, and the signature will never match.
                        </p>
                        <p>
                            <span className="font-medium">Be idempotent.</span> The same{" "}
                            <code className="rounded bg-amber-100 px-1">id</code> can arrive twice. Key on it so
                            a duplicate doesn&apos;t become a second ticket in your kitchen.
                        </p>
                        <p>
                            <span className="font-medium">Reply 2xx fast.</span> We wait 8 seconds per try and
                            retry twice on a timeout or a 5xx — a 4xx we take as a deliberate no and stop.
                            Acknowledge first, then do the slow work.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ── Recent deliveries ──────────────────────────────────────────
                Added because "did my webhook actually fire?" was previously
                unanswerable: the delivery result was discarded and nothing was
                recorded, so a failed send left no trace for the partner OR for
                us. Every attempt now lands here. */}
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                        <CardTitle className="text-base">Recent deliveries</CardTitle>
                        <CardDescription>
                            The last 20 attempts, newest first. A failure is retried twice
                            automatically — each try is its own row.
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={loadDeliveries}
                        disabled={deliveriesLoading}
                    >
                        {deliveriesLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5">Refresh</span>
                    </Button>
                </CardHeader>
                <CardContent>
                    {deliveriesLoading && deliveries.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
                    ) : deliveries.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Nothing sent yet. Place an order, or use &ldquo;Send test event&rdquo; above.
                        </p>
                    ) : (
                        <div className="divide-y rounded-lg border">
                            {deliveries.map((d) => (
                                <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                                    {d.ok ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                                    ) : (
                                        <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <code className="text-xs font-medium">{d.event}</code>
                                            {d.is_test && (
                                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                                                    test
                                                </span>
                                            )}
                                            {d.attempt > 1 && (
                                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                    retry {d.attempt}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                            {new Date(d.created_at).toLocaleString()}
                                            {d.duration_ms != null && ` · ${d.duration_ms}ms`}
                                            {d.error && ` · ${d.error}`}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] ${
                                            d.ok
                                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                                        }`}
                                    >
                                        {d.status_code ?? "—"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
