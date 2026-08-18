"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2, Plus, KeyRound, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKeyRow,
} from "@/app/actions/partnerApiKeys";

/**
 * API — issue a key and drive order status from the partner's own POS.
 *
 * The docs live in the product rather than a wiki for the same reason the
 * webhook docs do: the person wiring this up is the partner's developer, who
 * already has this screen open. Every example is copy-pasteable and uses the
 * partner's real key prefix once they have one, so there is nothing to
 * substitute by hand except the order id.
 */

const SCOPES: { id: string; label: string; hint: string }[] = [
  { id: "orders", label: "Orders", hint: "Update the status of your own orders" },
  { id: "whatsapp", label: "WhatsApp", hint: "Send WhatsApp templates from your number" },
];

const STATUSES = ["accepted", "food_ready", "dispatched", "in_transit", "completed"];

function CodeBlock({ children, onCopy }: { children: string; onCopy?: () => void }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 pr-11 text-[11.5px] leading-relaxed">
        <code className="whitespace-pre">{children}</code>
      </pre>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-1 top-1 h-7 w-7"
        aria-label="Copy"
        onClick={() => {
          navigator.clipboard.writeText(children).then(
            () => {
              toast.success("Copied");
              onCopy?.();
            },
            () => toast.error("Couldn't copy"),
          );
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ApiSettings() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["orders"]);
  const [creating, setCreating] = useState(false);
  /** Plaintext of a key just minted. Held in memory only — never re-fetchable. */
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://menuthere.com");

  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listApiKeys();
    if (res.ok) setKeys(res.keys);
    else toast.error(res.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      toast.error("Give the key a name");
      return;
    }
    setCreating(true);
    const res = await createApiKey({ name: name.trim(), scopes });
    setCreating(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setFreshKey(res.key);
    setName("");
    await load();
  };

  const revoke = async (row: ApiKeyRow) => {
    const yes = await confirmDialog({
      title: `Revoke "${row.name}"?`,
      description:
        "Anything using this key stops working immediately. This cannot be undone — you would need to issue a new key and update your integration.",
      confirmText: "Revoke",
      destructive: true,
    });
    if (!yes) return;
    const res = await revokeApiKey(row.id);
    if (res.ok) {
      toast.success("Key revoked");
      await load();
    } else toast.error(res.message);
  };

  const active = keys.filter((k) => !k.revoked_at);
  const sampleKey = freshKey || (active[0] ? `${active[0].key_prefix}…` : "ck_live_YOUR_KEY");

  const curlExample = `curl -X POST '${baseUrl}/api/v1/orders/ORDER_ID/status' \\
  -H 'Authorization: Bearer ${sampleKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{"status":"accepted"}'`;

  return (
    <div className="space-y-4">
      {/* ── Keys ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> API keys
          </CardTitle>
          <CardDescription>
            Keys are tied to this restaurant. Anything you call with one can only
            ever see and change your own data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {freshKey && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                Copy this now — it is shown once
              </div>
              <p className="mb-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                We store only a fingerprint of the key, so we cannot show it again.
                If you lose it, revoke it and issue another.
              </p>
              <CodeBlock>{freshKey}</CodeBlock>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={() => setFreshKey(null)}
              >
                I&rsquo;ve saved it
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="api-key-name" className="text-xs">
                Name
              </Label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void create();
                }}
                placeholder="e.g. Billing POS"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Access</Label>
              <div className="flex gap-3">
                {SCOPES.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-xs" title={s.hint}>
                    <input
                      type="checkbox"
                      checked={scopes.includes(s.id)}
                      onChange={(e) =>
                        setScopes((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id),
                        )
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={create} disabled={creating || !name.trim()} className="h-9">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1">Generate key</span>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading keys…
            </div>
          ) : !keys.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No keys yet. Generate one above to start using the API.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{k.name}</span>
                      {k.revoked_at ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          Revoked
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700 dark:bg-green-950 dark:text-green-400">
                          Active
                        </span>
                      )}
                      {(k.scopes || []).map((s) => (
                        <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {k.key_prefix}…{" · "}
                      {k.last_used_at
                        ? `last used ${new Date(k.last_used_at).toLocaleString()}`
                        : "never used"}
                      {" · "}
                      {k.rate_per_min}/min
                    </p>
                  </div>
                  {!k.revoked_at && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Revoke ${k.name}`}
                      onClick={() => revoke(k)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Order status API ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update an order&rsquo;s status</CardTitle>
          <CardDescription>
            Drive an order from your own POS — tell us when the kitchen accepted
            it and when it went out. Needs a key with <strong>Orders</strong> access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-1.5 font-medium">Endpoint</p>
            <CodeBlock>{`POST ${baseUrl}/api/v1/orders/{order_id}/status`}</CodeBlock>
          </div>

          <div>
            <p className="mb-1.5 font-medium">Example</p>
            <CodeBlock>{curlExample}</CodeBlock>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Replace <code className="font-mono">ORDER_ID</code> with the order&rsquo;s id — it
              arrives as <code className="font-mono">data.order_id</code> in the order webhook.
            </p>
          </div>

          <div>
            <p className="mb-1.5 font-medium">Allowed statuses</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <code key={s} className="rounded bg-muted px-2 py-1 font-mono text-[11px]">
                  {s}
                </code>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Cancelling is not available here — it has to refund loyalty points,
              restock items and call off any delivery partner, so it stays in the
              dashboard.
            </p>
          </div>

          <div>
            <p className="mb-1.5 font-medium">Success</p>
            <CodeBlock>{`{
  "ok": true,
  "order_id": "3f9a1c72-8d41-4e2a-9b77-1c0a5e6f3b21",
  "previous_status": "pending",
  "status": "accepted",
  "changed": true
}`}</CodeBlock>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Sending a status the order already has returns{" "}
              <code className="font-mono">changed: false</code> and changes nothing, so a
              POS that retries after a timeout is safe.
            </p>
          </div>

          <div>
            <p className="mb-1.5 font-medium">Errors</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Code</th>
                    <th className="py-1 pr-3 font-medium">error</th>
                    <th className="py-1 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr><td className="py-1 pr-3">401</td><td className="pr-3">invalid_api_key</td><td className="font-sans">Missing, wrong or revoked key</td></tr>
                  <tr><td className="py-1 pr-3">403</td><td className="pr-3">scope_denied</td><td className="font-sans">Key lacks Orders access</td></tr>
                  <tr><td className="py-1 pr-3">404</td><td className="pr-3">order_not_found</td><td className="font-sans">No such order on this account</td></tr>
                  <tr><td className="py-1 pr-3">400</td><td className="pr-3">unsupported_status</td><td className="font-sans">Status not in the list above</td></tr>
                  <tr><td className="py-1 pr-3">429</td><td className="pr-3">rate_limited</td><td className="font-sans">Too many requests this minute</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Send the key as <code className="font-mono">Authorization: Bearer …</code> from your
              server, never from a browser or mobile app — anyone who reads it can change
              your orders. Revoke a key the moment you suspect it has leaked.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiSettings;
