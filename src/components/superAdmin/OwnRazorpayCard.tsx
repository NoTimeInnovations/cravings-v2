"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import {
  getOwnRazorpayStatus,
  saveOwnRazorpayCredentials,
  setOwnRazorpayEnabled,
} from "@/app/actions/razorpayPartner";

type Status = Awaited<ReturnType<typeof getOwnRazorpayStatus>>;

/**
 * Superadmin control for a partner's OWN Razorpay account. The secrets are
 * encrypted server-side (never returned to the browser) — this only shows masked
 * status + accepts new values. Enabling flips partners.own_razorpay_enabled, which
 * the storefront reads to render the Razorpay checkout path. No per-partner env/code.
 */
export default function OwnRazorpayCard({ partnerId }: { partnerId: string }) {
  // Note: the acting superadmin is derived server-side from the auth cookie (for
  // the audit trail) — never passed from the client, which would be spoofable.
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

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
    // Reset the (never-prefilled) secret inputs whenever the partner changes.
    setKeyId("");
    setKeySecret("");
    setWebhookSecret("");
    refresh();
  }, [partnerId, refresh]);

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
        setKeySecret("");
        setWebhookSecret("");
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
          Collect payments through this partner&apos;s OWN Razorpay account. Secrets are
          encrypted at rest and never shown again — the browser never receives them.
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
                  Server master key <code>RZP_CREDS_MASTER_KEY</code> isn&apos;t set — credentials
                  can&apos;t be encrypted. Add it in Vercel env + redeploy first (one-time).
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
              <Button onClick={onSave} disabled={saving || !status?.masterKeyConfigured} size="sm">
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Save credentials
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Enable own Razorpay checkout</div>
                <div className="text-xs text-muted-foreground">
                  Shows the Razorpay pay option to this partner&apos;s customers. Needs saved credentials.
                </div>
              </div>
              <Switch
                checked={!!status?.enabled}
                disabled={toggling || !status?.hasCredentials}
                onCheckedChange={onToggle}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Razorpay webhook URL for the partner&apos;s dashboard: <code>/api/fhc/razorpay/webhooks</code>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
