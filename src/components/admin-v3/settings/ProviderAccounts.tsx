"use client";

import * as React from "react";
import { ChevronRight, Link2, Loader2, LogOut, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  getDeliveryConnections,
  logoutDeliveryProvider,
  sendDeliveryOtp,
  verifyDeliveryOtp,
} from "@/app/actions/deliveryConnect";
import type {
  ConnectProvider,
  ConnectedAccount,
  ProviderConnection,
} from "@/lib/deliveryBridgeTypes";
import { cn } from "@/lib/utils";

import { AdminV3Button, StatusPill, V3Card } from "../ui/primitives";
import { Note, SettingsCard, TextField, useDeclareSubPage } from "./controls";

/**
 * Connecting the Porter / Rapido logins dispatch books riders through.
 *
 * A partner can connect MANY accounts per provider — the point of the group
 * number. Accounts sharing a group form a pool, so several Rapido logins (one
 * live order each) can run together; dispatch books whichever is free. That is
 * why this is a list, not a single "connected number".
 *
 * The whole backend already existed for admin-v2 (send OTP → verify → the
 * bridge tags the account into the group); v3 simply had no screen for it. Only
 * the UI is new here — the four server actions are untouched.
 *
 * The OTP flow is INLINE rather than a dialog: it is two fields, and expanding
 * the card in place keeps the account list it belongs to on screen.
 */

/**
 * The row on the Delivery bridge tab that opens the accounts page.
 *
 * Deliberately carries no live status: rendering a count here would mean a
 * second call to the bridge on every visit to the tab, for a number the page
 * behind it already shows.
 */
export function ProviderAccountsEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <V3Card className="p-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col items-start gap-2.5 p-4 text-left"
      >
        <div className="flex w-full items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <Link2 className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Accounts
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
        </div>
        <span className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          The Porter and Rapido logins dispatch books riders through, and the
          groups that pool them.
        </span>
      </button>
    </V3Card>
  );
}

const PROVIDERS: { key: ConnectProvider; label: string }[] = [
  { key: "porter", label: "Porter" },
  { key: "rapido", label: "Rapido" },
];

/** Never show a partner's full login number back to them. */
const mask = (mobile: string) => `•• ${mobile.slice(-4)}`;

/** Bridge status → the design's pill tones. */
function statusTone(status: string): "green" | "amber" | "neutral" {
  if (status === "active") return "green";
  if (status === "unknown" || status === "none") return "neutral";
  return "amber";
}

function statusLabel(status: string) {
  if (status === "none") return "not on bridge";
  if (status === "token_expired") return "session expired";
  return status.replace(/_/g, " ");
}

export function ProviderAccounts({
  partnerId,
  storeName,
  city,
  coords,
  groups,
  onGroupChange,
  /** Bumped by the parent after a save, so applied groups re-read from the bridge. */
  reloadToken,
  onBack,
}: {
  partnerId?: string;
  storeName?: string;
  city?: string;
  coords?: { lat: number; lng: number };
  groups: Record<ConnectProvider, string>;
  onGroupChange: (provider: ConnectProvider, value: string) => void;
  reloadToken?: number;
  onBack: () => void;
}) {
  // This screen takes the whole Settings page over: the shell renders the
  // breadcrumb (Settings / Ordering / Accounts), hides the tab bar and
  // points its back arrow here. See useDeclareSubPage in ./controls.
  useDeclareSubPage({
    title: "Accounts",
    hint: "The Porter and Rapido logins dispatch books riders through, and the groups that pool them.",
    onBack,
  });

  const [conns, setConns] = React.useState<Record<
    ConnectProvider,
    ProviderConnection
  > | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await getDeliveryConnections({ partnerId });
      if (res.ok) setConns({ porter: res.porter, rapido: res.rapido });
      else console.warn("[v3 bridge] connections:", res.message);
    } catch (e) {
      console.warn("[v3 bridge] connections failed:", e);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  React.useEffect(() => {
    void load();
  }, [load, reloadToken]);

  const handleLogout = async (provider: ConnectProvider, mobile: string) => {
    if (!partnerId) return;
    const key = `${provider}:${mobile}`;
    setBusy(key);
    try {
      const res = await logoutDeliveryProvider({ partnerId, provider, mobile });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Logged out ${mask(mobile)}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsCard
      title="Connected logins"
      meta={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !partnerId}
          title="Re-check with the bridge"
          aria-label="Refresh account status"
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      }
    >
      <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
        Log in each account with a one-time OTP. Accounts sharing a group number
        form a pool — dispatch books whichever rider is free, so several logins
        can run at once.
      </div>

      {PROVIDERS.map(({ key, label }) => (
        <ProviderRow
          key={key}
          provider={key}
          label={label}
          conn={conns?.[key] ?? null}
          checking={loading && !conns}
          partnerId={partnerId}
          storeName={storeName}
          city={city}
          coords={coords}
          group={groups[key] || ""}
          onGroupChange={(v) => onGroupChange(key, v)}
          busyKey={busy}
          onLogout={(mobile) => handleLogout(key, mobile)}
          onConnected={load}
        />
      ))}

      <Note>
        A new account joins the group above the moment it is verified. Changing
        the group number afterwards re-tags every account for that provider when
        you press Save.
      </Note>
    </SettingsCard>
  );
}

/* --------------------------------------------------------------- one provider */

function ProviderRow({
  provider,
  label,
  conn,
  checking,
  partnerId,
  storeName,
  city,
  coords,
  group,
  onGroupChange,
  busyKey,
  onLogout,
  onConnected,
}: {
  provider: ConnectProvider;
  label: string;
  conn: ProviderConnection | null;
  checking: boolean;
  partnerId?: string;
  storeName?: string;
  city?: string;
  coords?: { lat: number; lng: number };
  group: string;
  onGroupChange: (v: string) => void;
  busyKey: string | null;
  onLogout: (mobile: string) => void;
  onConnected: () => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const accounts = conn?.accounts ?? [];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2.5">
        <span className="text-[13px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          {label}
        </span>
        {conn?.connected ? (
          <StatusPill tone="green">
            {accounts.length} connected
          </StatusPill>
        ) : conn?.status === "token_expired" ? (
          <StatusPill tone="amber">Session expired</StatusPill>
        ) : (
          <span className="text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
            {checking ? "Checking…" : "Not connected"}
          </span>
        )}
        <AdminV3Button
          variant="secondary"
          className="ml-auto h-[30px] px-2.5 text-[12.5px]"
          disabled={!partnerId}
          onClick={() => setOpen((o) => !o)}
        >
          <Plus className="h-3.5 w-3.5" />
          {accounts.length > 0 ? "Add account" : "Connect"}
        </AdminV3Button>
      </div>

      {accounts.length > 0 ? (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {accounts.map((acct) => (
            <AccountRow
              key={acct.mobile}
              account={acct}
              configuredGroup={group}
              busy={busyKey === `${provider}:${acct.mobile}`}
              onLogout={() => onLogout(acct.mobile)}
            />
          ))}
        </div>
      ) : null}

      {open ? (
        <ConnectForm
          provider={provider}
          label={label}
          partnerId={partnerId}
          storeName={storeName}
          city={city}
          coords={coords}
          group={group}
          onCancel={() => setOpen(false)}
          onDone={async () => {
            setOpen(false);
            await onConnected();
          }}
        />
      ) : null}

      <div className="border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
        <TextField
          label="Group number"
          hint="accounts sharing it pool together"
          value={group}
          onChange={(v) => onGroupChange(v.replace(/\D/g, "").slice(0, 20))}
          placeholder="e.g. 98765"
          inputMode="numeric"
          basis="100%"
        />
        {(conn?.groupAccounts ?? 0) > 0 ? (
          <div className="mt-1.5 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
            {conn!.groupAccounts} account
            {conn!.groupAccounts === 1 ? "" : "s"} live in group {conn!.group} —
            dispatch books whichever is free.
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- one account */

function AccountRow({
  account,
  configuredGroup,
  busy,
  onLogout,
}: {
  account: ConnectedAccount;
  configuredGroup: string;
  busy: boolean;
  onLogout: () => void;
}) {
  // Tagged into a different group on the bridge than the one configured here
  // means this account is NOT in the pool dispatch books from — the silent way
  // a pool ends up split in half, so it is called out rather than hidden.
  const drifted =
    !!configuredGroup &&
    account.groupNumber !== null &&
    account.groupNumber !== configuredGroup;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800">
      <span className="text-[12.5px] font-medium leading-none tabular-nums text-zinc-700 dark:text-zinc-300">
        {mask(account.mobile)}
      </span>
      <StatusPill tone={statusTone(account.status)} className="text-[11px]">
        {statusLabel(account.status)}
      </StatusPill>
      {drifted ? (
        <StatusPill tone="amber" className="text-[11px]">
          in group {account.groupNumber} — Save to move
        </StatusPill>
      ) : null}
      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        title={`Log out ${mask(account.mobile)}`}
        aria-label={`Log out ${mask(account.mobile)}`}
        className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-zinc-500 dark:hover:bg-red-950 dark:hover:text-red-400"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- the OTP form */

function ConnectForm({
  provider,
  label,
  partnerId,
  storeName,
  city,
  coords,
  group,
  onCancel,
  onDone,
}: {
  provider: ConnectProvider;
  label: string;
  partnerId?: string;
  storeName?: string;
  city?: string;
  coords?: { lat: number; lng: number };
  group: string;
  onCancel: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [step, setStep] = React.useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  const send = async () => {
    if (!partnerId) return;
    const m = mobile.replace(/\D/g, "");
    // Same guard admin-v2 uses — Indian mobiles only, which is what the bridge
    // accepts. Catching it here saves a round trip.
    if (m.length !== 10 || !/^[6-9]/.test(m)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setSending(true);
    try {
      const res = await sendDeliveryOtp({
        partnerId,
        provider,
        mobile: m,
        storeName,
        city,
        coords,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`OTP sent to ${m}`);
      setStep("otp");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!partnerId) return;
    const code = otp.replace(/\D/g, "");
    if (code.length < 4) {
      toast.error("Enter the OTP you received");
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyDeliveryOtp({
        partnerId,
        provider,
        mobile: mobile.replace(/\D/g, ""),
        otp: code,
        storeName,
        group,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        res.group ? `${label} connected · group ${res.group}` : `${label} connected`,
      );
      await onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
      {step === "mobile" ? (
        <>
          <div className="text-[12px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            The {label} account this store dispatches from. We&apos;ll send it an
            OTP.
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-[1_1_200px]">
              <TextField
                label="Mobile"
                hint="+91"
                value={mobile}
                onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number"
                inputMode="numeric"
                basis="100%"
              />
            </div>
            <div className="flex gap-2">
              <AdminV3Button
                variant="secondary"
                className="h-9 px-3 text-[13px]"
                onClick={onCancel}
              >
                Cancel
              </AdminV3Button>
              <AdminV3Button
                variant="primary"
                className="h-9 px-3.5 text-[13px] font-medium"
                disabled={sending}
                onClick={send}
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Send OTP
              </AdminV3Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-[12px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            Enter the OTP {label} sent to {mobile}.
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-[1_1_200px]">
              <TextField
                label="OTP"
                value={otp}
                onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 8))}
                placeholder="######"
                inputMode="numeric"
                basis="100%"
              />
            </div>
            <div className="flex gap-2">
              <AdminV3Button
                variant="secondary"
                className="h-9 px-3 text-[13px]"
                disabled={sending}
                onClick={() => setStep("mobile")}
              >
                Change number
              </AdminV3Button>
              <AdminV3Button
                variant="primary"
                className="h-9 px-3.5 text-[13px] font-medium"
                disabled={verifying}
                onClick={verify}
              >
                {verifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Verify
              </AdminV3Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
