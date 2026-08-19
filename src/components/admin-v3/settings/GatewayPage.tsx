"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getOwnRazorpayStatus,
  saveOwnRazorpayCredentials,
  setOwnRazorpayEnabled,
} from "@/app/actions/razorpayPartner";

import { AdminV3Button } from "../ui/primitives";
import {
  FieldRow,
  Note,
  SegmentedField,
  SettingsCard,
  StateChip,
  TextField,
  useDeclareSubPage,
} from "./controls";

/**
 * Choosing and setting up the gateway that takes online payments.
 *
 * Replaces the old Gateways tab. Reached by turning "Online payment" on, or by
 * its Configure button — so the partner is never asked to configure a gateway
 * they have not asked for, and never turns online payments on with nothing
 * behind them.
 *
 * ONE provider is live at a time, and the choice IS the enable: picking Razorpay
 * and saving turns own-Razorpay on, picking Cashfree turns it off. There is no
 * separate "use my own Razorpay" switch to leave inconsistent with the choice.
 *
 * Turning online payments ON is part of this page's save rather than the
 * toggle's own click, because a partner who abandons this page halfway would
 * otherwise be left advertising a gateway with no credentials.
 *
 * Credentials are the exception to the section's single Save button: they go
 * through server actions that encrypt the secret, so they never enter the draft.
 */
export function GatewayPage({
  partnerId,
  cashfreeMerchantId,
  onCashfreeMerchantIdChange,
  onBack,
  /** Persists the section draft with `accept_payments_via_cashfree` flipped on. */
  onEnable,
}: {
  partnerId?: string;
  cashfreeMerchantId: string;
  onCashfreeMerchantIdChange: (v: string) => void;
  onBack: () => void;
  onEnable: (merchantId: string) => Promise<void>;
}) {
  useDeclareSubPage({
    title: "Online payment",
    hint: "Pick the gateway that takes card and UPI payments at checkout.",
    onBack,
  });

  const [provider, setProvider] = React.useState<"cashfree" | "razorpay">(
    "cashfree",
  );
  const [status, setStatus] = React.useState<Awaited<
    ReturnType<typeof getOwnRazorpayStatus>
  > | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [keyId, setKeyId] = React.useState("");
  const [keySecret, setKeySecret] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // The saved Razorpay flag IS the current choice — there is no separate column
  // recording "which gateway", and inventing one would let the two disagree.
  React.useEffect(() => {
    let alive = true;
    if (!partnerId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const s = await getOwnRazorpayStatus(partnerId);
        if (!alive) return;
        setStatus(s);
        if (s?.enabled) setProvider("razorpay");
      } catch {
        if (alive) setStatus(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const rzpConnected = !!status?.hasCredentials;
  // Existing credentials can be kept as-is; only a first-time setup must type them.
  const rzpReady = rzpConnected || !!keyId.trim();
  const canSave =
    provider === "cashfree" ? !!cashfreeMerchantId.trim() : rzpReady;

  const handleSave = async () => {
    if (!partnerId || saving) return;
    setSaving(true);
    try {
      if (provider === "razorpay") {
        if (keyId.trim()) {
          const r = await saveOwnRazorpayCredentials(partnerId, {
            keyId: keyId.trim(),
            keySecret: keySecret.trim() || undefined,
          });
          if (!r.ok) {
            toast.error(r.error || "Could not save the Razorpay credentials");
            return;
          }
          setKeyId("");
          setKeySecret("");
        }
        const e = await setOwnRazorpayEnabled(partnerId, true);
        if (!e.ok) {
          toast.error(e.error || "Could not enable Razorpay");
          return;
        }
      } else {
        // Only one gateway runs at checkout, and own-Razorpay wins on its own
        // flag — so choosing Cashfree has to actively stand the other one down.
        const e = await setOwnRazorpayEnabled(partnerId, false);
        if (!e.ok) {
          toast.error(e.error || "Could not switch the gateway");
          return;
        }
      }

      await onEnable(cashfreeMerchantId.trim());
      onBack();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard>
      <SegmentedField
        label="Gateway"
        hint="one is used at checkout"
        value={provider}
        onChange={setProvider}
        options={[
          { value: "cashfree", label: "Cashfree" },
          { value: "razorpay", label: "My own Razorpay" },
        ]}
      />

      {provider === "cashfree" ? (
        <>
          <FieldRow>
            <TextField
              label="Merchant ID"
              hint="from your Cashfree dashboard"
              value={cashfreeMerchantId}
              onChange={onCashfreeMerchantIdChange}
              placeholder="CF_…"
              translateNo
              basis="100%"
            />
          </FieldRow>
          <Note>
            Payouts are settled by Cashfree to the bank account on that merchant
            ID.
          </Note>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex-1 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Credentials
            </span>
            {loading ? (
              <StateChip tone="neutral">Checking…</StateChip>
            ) : rzpConnected ? (
              <StateChip tone="green">
                Saved{status?.keyIdLast4 ? ` · …${status.keyIdLast4}` : ""}
              </StateChip>
            ) : (
              <StateChip tone="neutral">Not set</StateChip>
            )}
          </div>

          {status && !status.masterKeyConfigured ? (
            <Note>
              Credentials cannot be stored on this deployment — the payment
              encryption key is not configured.
            </Note>
          ) : null}

          <FieldRow>
            <TextField
              label="Key ID"
              value={keyId}
              onChange={setKeyId}
              placeholder={rzpConnected ? "Replace the saved key" : "rzp_live_…"}
            />
            <TextField
              label="Key secret"
              hint="stored encrypted"
              value={keySecret}
              onChange={setKeySecret}
              placeholder={
                rzpConnected ? "Leave blank to keep the saved one" : "Key secret"
              }
            />
          </FieldRow>
          <Note>
            Money is collected straight into your own Razorpay account — the
            platform never holds it.
          </Note>
        </>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
        <AdminV3Button
          variant="secondary"
          className="h-[34px] px-3.5 text-[13px]"
          onClick={onBack}
        >
          Cancel
        </AdminV3Button>
        <AdminV3Button
          variant="primary"
          className="h-[34px] px-3.5 text-[13px] font-medium"
          disabled={!canSave || saving || !partnerId}
          onClick={handleSave}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save and turn on
        </AdminV3Button>
      </div>
      {!canSave ? (
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          {provider === "cashfree"
            ? "Add your Cashfree merchant ID to turn online payment on."
            : "Add your Razorpay key to turn online payment on."}
        </div>
      ) : null}
    </SettingsCard>
  );
}
