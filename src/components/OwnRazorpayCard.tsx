"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, ShieldAlert, ShieldCheck, Loader2, Copy } from "lucide-react";
import {
  getOwnRazorpayStatus,
  saveOwnRazorpayCredentials,
  setOwnRazorpayEnabled,
} from "@/app/actions/razorpayPartner";

type Status = Awaited<ReturnType<typeof getOwnRazorpayStatus>>;

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://menuthere.com") + "/api/fhc/razorpay/webhooks";
// Events the /api/fhc/razorpay webhook route handles.
const WEBHOOK_EVENTS = "payment.captured, payment.failed";

/**
 * Manage a Razorpay account for online payments. Usable by a superadmin (any
 * partner, from Edit Partners) or the partner themselves (own id, from Payment
 * settings) — the server actions enforce ownership. Secrets are encrypted
 * server-side and never returned to the browser (this shows masked status +
 * accepts new values). Enabling flips partners.own_razorpay_enabled, which the
 * storefront reads to route checkout through Razorpay (takes precedence over
 * Cashfree). Includes the webhook URL + events to add in the Razorpay dashboard.
 */
export default function OwnRazorpayCard({ partnerId }: { partnerId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  // When credentials already exist, the input fields stay collapsed behind an
  // "Edit credentials" button and re-collapse after a save.
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      setStatus(await getOwnRazorpayStatus(partnerId));
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    setKeyId("");
    setKeySecret("");
    setWebhookSecret("");
    setEditing(false);
    refresh();
  }, [partnerId, refresh]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const onSave = async () => {
    if (!keyId.trim()) {
      toast.error("Key ID is required");
      return;
    }
    setSaving(true);
    try {
      const r = await saveOwnRazorpayCredentials(partnerId, {
        keyId: keyId.trim(),
        keySecret: keySecret.trim() || undefined,
        webhookSecret: webhookSecret.trim() || undefined,
      });
      if (r.ok) {
        toast.success("Razorpay credentials saved");
        setKeyId("");
        setKeySecret("");
        setWebhookSecret("");
        setEditing(false);
        await refresh();
      } else {
        toast.error(r.error || "Failed to save credentials");
      }
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (next: boolean) => {
    setToggling(true);
    try {
      const r = await setOwnRazorpayEnabled(partnerId, next);
      if (r.ok) {
        toast.success(next ? "Own Razorpay enabled" : "Own Razorpay disabled");
        await refresh();
      } else {
        toast.error(r.error || "Failed to update");
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Own Razorpay (online payments)
        </CardTitle>
        <CardDescription>
          Collect online payments through your OWN Razorpay account. Secrets are encrypted and
          never shown again — the browser never receives them. When enabled, this is used at
          checkout instead of Cashfree.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {status && !status.masterKeyConfigured && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Secure credential storage isn&apos;t configured on the server yet
                  (<code>RZP_CREDS_MASTER_KEY</code>). Please contact support before adding keys.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Credentials</div>
                <div className="flex items-center gap-1.5 font-medium">
                  {status?.hasCredentials ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Key ••{status.keyIdLast4}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Webhook secret</div>
                <div className="font-medium">
                  {status?.hasWebhookSecret ? "Set" : <span className="text-muted-foreground">Not set</span>}
                </div>
              </div>
            </div>

            {!status?.hasCredentials || editing ? (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="rzp_key_id">Key ID</Label>
                  <Input
                    id="rzp_key_id"
                    autoComplete="off"
                    placeholder="rzp_live_…"
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="rzp_key_secret">Key Secret</Label>
                  <Input
                    id="rzp_key_secret"
                    type="password"
                    autoComplete="new-password"
                    placeholder={status?.hasCredentials ? "•••••• (leave blank to keep)" : "Key secret"}
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="rzp_webhook_secret">Webhook Secret</Label>
                  <Input
                    id="rzp_webhook_secret"
                    type="password"
                    autoComplete="new-password"
                    placeholder={status?.hasWebhookSecret ? "•••••• (leave blank to keep)" : "Webhook secret"}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={onSave} disabled={saving || !status?.masterKeyConfigured} size="sm">
                    {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Save credentials
                  </Button>
                  {status?.hasCredentials && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(false);
                        setKeyId("");
                        setKeySecret("");
                        setWebhookSecret("");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit credentials
              </Button>
            )}

            {/* Webhook setup helper — what to configure in the Razorpay dashboard. */}
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Webhook setup (Razorpay → Settings → Webhooks → Add)</p>
              <div>
                <div className="text-xs text-muted-foreground">Webhook URL</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{WEBHOOK_URL}</code>
                  <Button type="button" variant="outline" size="sm" onClick={() => copy(WEBHOOK_URL, "Webhook URL")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Active events</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-background px-2 py-1 text-xs">{WEBHOOK_EVENTS}</code>
                  <Button type="button" variant="outline" size="sm" onClick={() => copy(WEBHOOK_EVENTS, "Events")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set the webhook&apos;s <b>Secret</b> to the exact value you entered in
                &ldquo;Webhook Secret&rdquo; above.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Use my own Razorpay at checkout</div>
                <div className="text-xs text-muted-foreground">
                  Shows the Razorpay pay option to customers (takes precedence over Cashfree). Needs
                  saved credentials.
                </div>
              </div>
              <Switch
                checked={!!status?.enabled}
                disabled={toggling || !status?.hasCredentials}
                onCheckedChange={onToggle}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
