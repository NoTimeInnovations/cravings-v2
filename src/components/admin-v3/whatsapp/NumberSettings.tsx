"use client";

import * as React from "react";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { confirmDialog } from "@/components/ui/confirm-dialog";
import { useWhatsAppEmbeddedSignup } from "@/hooks/useWhatsAppEmbeddedSignup";
import { Partner, useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

import { AdminV3Button, StatusPill, V3Card } from "../ui/primitives";

/**
 * The partner's connected WhatsApp numbers.
 *
 * A partner can connect MANY. Exactly one is PRIMARY — the default sender for
 * everything the system initiates (order and loyalty notifications, OTP, the
 * storefront's "message us" link, and the broadcast default). Flows always
 * reply from whichever number was messaged, so the primary only decides who
 * speaks first.
 *
 * All four endpoints already existed for admin-v2 — status, set-primary,
 * set-flow, disconnect — and the connect itself is the shared Embedded Signup
 * hook. Only this screen is new.
 */

interface Integration {
  id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone: string | null;
  is_primary: boolean;
  flow_enabled: boolean;
  updated_at: string;
}

const CARD_TITLE =
  "text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50";

export function WhatsAppNumberSettings({ onBack }: { onBack: () => void }) {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;

  const [numbers, setNumbers] = React.useState<Integration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/whatsapp/meta/status?partnerId=${encodeURIComponent(partnerId)}`,
      );
      const data = await res.json();
      setNumbers(Array.isArray(data?.integrations) ? data.integrations : []);
    } catch (e) {
      console.error("[v3 wa] status failed:", e);
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const { connect, connecting } = useWhatsAppEmbeddedSignup({
    partnerId,
    onConnected: async () => {
      toast.success("WhatsApp connected");
      await load();
    },
  });

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "That did not work");
    return data;
  };

  const makePrimary = async (n: Integration) => {
    if (!partnerId || n.is_primary) return;
    setBusy(n.phone_number_id);
    try {
      await post("/api/whatsapp/meta/set-primary", {
        partnerId,
        phoneNumberId: n.phone_number_id,
      });
      toast.success(`${n.display_phone || "That number"} is now the default sender`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const setFlow = async (n: Integration, enabled: boolean) => {
    if (!partnerId) return;
    setBusy(n.phone_number_id);
    try {
      await post("/api/whatsapp/meta/set-flow", {
        partnerId,
        phoneNumberId: n.phone_number_id,
        enabled,
      });
      // Update in place rather than refetching — a full reload here makes the
      // switch visibly lag behind the tap.
      setNumbers((cur) =>
        cur.map((x) =>
          x.phone_number_id === n.phone_number_id ? { ...x, flow_enabled: enabled } : x,
        ),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (n: Integration) => {
    if (!partnerId) return;
    const label = n.display_phone || "this number";
    const last = numbers.length === 1;
    const ok = await confirmDialog({
      title: `Disconnect ${label}?`,
      description: last
        ? "This is your only connected number — order updates, OTP and automatic replies will stop going out on WhatsApp until you connect one again."
        : n.is_primary
          ? "It is your default sender, so another number takes over. Messages already sent stay in the inbox."
          : "Messages already sent stay in the inbox. Flows on your other numbers are unaffected.",
      confirmText: "Disconnect",
      destructive: true,
    });
    if (!ok) return;
    setBusy(n.phone_number_id);
    try {
      await post("/api/whatsapp/meta/disconnect", {
        partnerId,
        phoneNumberId: n.phone_number_id,
      });
      toast.success(`${label} disconnected`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to WhatsApp"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Numbers
          </div>
          <div className="mt-0.5 truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Checking…"
              : numbers.length === 0
                ? "No number connected yet"
                : `${numbers.length} connected`}
          </div>
        </div>
        <AdminV3Button
          variant="primary"
          className="ml-auto h-[34px] shrink-0 px-3.5 text-[13px] font-medium"
          disabled={connecting || !partnerId}
          onClick={() => connect((m) => toast.error(m))}
        >
          {connecting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={15} strokeWidth={2} />
          )}
          {numbers.length === 0 ? "Connect WhatsApp" : "Add a number"}
        </AdminV3Button>
      </div>

      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className={CARD_TITLE}>Connected numbers</span>
            {numbers.length > 1 ? (
              <StatusPill tone="outline" className="ml-auto font-medium">
                One is the default sender
              </StatusPill>
            ) : null}
          </div>

          {loading ? (
            <div className="px-4 py-14 text-center">
              <Loader2 className="mx-auto h-[18px] w-[18px] animate-spin text-zinc-400 dark:text-zinc-500" />
            </div>
          ) : numbers.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <MessageSquare className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" />
              <div className="mt-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                No WhatsApp number connected
              </div>
              <p className="mx-auto mt-2 max-w-[400px] text-[12.5px] leading-[1.6] text-zinc-500 dark:text-zinc-400">
                Link the number you already run on the WhatsApp Business app to
                take orders, send live updates and reply automatically.
              </p>
            </div>
          ) : (
            numbers.map((n) => {
              const working = busy === n.phone_number_id;
              return (
                <div
                  key={n.phone_number_id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-zinc-100 px-4 py-3.5 last:border-b-0 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        translate="no"
                        className="notranslate text-[13.5px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                      >
                        {n.display_phone || n.phone_number_id}
                      </span>
                      {n.is_primary ? (
                        <StatusPill tone="green">Default sender</StatusPill>
                      ) : null}
                      {!n.flow_enabled ? (
                        <StatusPill tone="amber">Replies off</StatusPill>
                      ) : null}
                    </div>
                    <div className="mt-1.5 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                      {n.is_primary
                        ? "Order updates, OTP and the storefront link send from here."
                        : "Replies to this number come from this number."}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Per-number auto-replies. Off still records to the inbox —
                        it only stops a flow running. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={n.flow_enabled}
                      aria-label={`Automatic replies for ${n.display_phone || "this number"}`}
                      disabled={working}
                      onClick={() => void setFlow(n, !n.flow_enabled)}
                      className={cn(
                        "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-50",
                        n.flow_enabled
                          ? "bg-zinc-900 dark:bg-zinc-50"
                          : "bg-zinc-200 dark:bg-zinc-700",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all dark:bg-zinc-900",
                          n.flow_enabled ? "left-[19px]" : "left-[3px]",
                        )}
                      />
                    </button>

                    {!n.is_primary ? (
                      <AdminV3Button
                        variant="secondary"
                        className="h-[30px] px-2.5 text-[12.5px]"
                        disabled={working}
                        onClick={() => void makePrimary(n)}
                      >
                        <Star className="h-3.5 w-3.5" />
                        Make default
                      </AdminV3Button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void disconnect(n)}
                      disabled={working}
                      aria-label={`Disconnect ${n.display_phone || "this number"}`}
                      title="Disconnect"
                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      {working ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </V3Card>

        <div className="px-3.5 text-[12px] leading-[1.5] text-zinc-400 lg:px-0 dark:text-zinc-500">
          The default sender is used for anything the system starts — order and
          loyalty updates, OTP, and your storefront&rsquo;s message link. Automatic
          replies can be turned off per number; inbound messages are still saved
          to the inbox either way.
        </div>
      </div>
    </div>
  );
}
