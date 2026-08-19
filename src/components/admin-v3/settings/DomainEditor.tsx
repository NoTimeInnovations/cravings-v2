"use client";

import * as React from "react";
import { Check, Copy, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { confirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

import { AdminV3Button, StatusPill } from "../ui/primitives";
import { Note } from "./controls";

/**
 * Add, verify and remove the partner's custom domain.
 *
 * The three routes already existed for the classic dashboard
 * (/api/domains/add | verify | remove) — v3 only showed the domain in use and
 * sent partners elsewhere to change it. Nothing about the flow is new here.
 *
 * These write immediately rather than through the section's Save button: adding
 * a domain provisions it with the host and hands back DNS records to copy, so
 * there is nothing sensible to "save later".
 */

interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

function DnsRow({ record }: { record: DnsRecord }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800">
      <span className="w-10 shrink-0 font-mono text-[11.5px] font-semibold text-zinc-700 dark:text-zinc-300">
        {record.type}
      </span>
      <span
        translate="no"
        className="notranslate min-w-0 flex-1 truncate font-mono text-[11.5px] text-zinc-500 dark:text-zinc-400"
      >
        {record.name}
      </span>
      <span
        translate="no"
        className="notranslate min-w-0 flex-[2_1_160px] truncate font-mono text-[11.5px] text-zinc-950 dark:text-zinc-50"
      >
        {record.value}
      </span>
      <button
        type="button"
        aria-label={`Copy ${record.type} value`}
        onClick={() => {
          navigator.clipboard.writeText(record.value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

export function DomainEditor({
  partnerId,
  currentDomain,
  onChanged,
}: {
  partnerId?: string;
  currentDomain: string;
  /** Lets the surrounding screen refresh the partner row after a write. */
  onChanged: (domain: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [records, setRecords] = React.useState<DnsRecord[]>([]);
  const [verified, setVerified] = React.useState<boolean | null>(null);

  // A saved domain may still be waiting on DNS, so its records and status are
  // pulled on mount — otherwise a half-finished setup looks finished.
  React.useEffect(() => {
    if (!currentDomain) {
      setRecords([]);
      setVerified(null);
      return;
    }
    let alive = true;
    fetch(`/api/domains/verify?domain=${encodeURIComponent(currentDomain)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (Array.isArray(d?.dnsRecords)) setRecords(d.dnsRecords);
        if (d?.verified === true) setVerified(true);
        else if (d?.verified === false) setVerified(false);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentDomain]);

  const save = async () => {
    const domain = value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!domain || !partnerId) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      toast.error("That does not look like a domain — e.g. menu.mystore.com");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/domains/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save the domain");
      setRecords(Array.isArray(data?.dnsRecords) ? data.dnsRecords : []);
      setVerified(null);
      setEditing(false);
      setValue("");
      onChanged(data?.domain || domain);
      toast.success("Domain saved — add the DNS records below");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const verify = async () => {
    if (!currentDomain) return;
    setVerifying(true);
    try {
      const res = await fetch(
        `/api/domains/verify?domain=${encodeURIComponent(currentDomain)}`,
      );
      const data = await res.json();
      const ok = data?.verified === true;
      setVerified(ok);
      if (Array.isArray(data?.dnsRecords)) setRecords(data.dnsRecords);
      toast[ok ? "success" : "error"](
        ok ? "Domain verified" : "Not verified yet — DNS can take a while",
      );
    } catch {
      setVerified(false);
      toast.error("Could not check the domain");
    } finally {
      setVerifying(false);
    }
  };

  const remove = async () => {
    if (!partnerId || !currentDomain) return;
    const ok = await confirmDialog({
      title: "Remove this domain?",
      description: `${currentDomain} will stop serving your storefront. Customers with the link will need the default address instead.`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/domains/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      if (!res.ok) throw new Error("Could not remove the domain");
      setRecords([]);
      setVerified(null);
      onChanged("");
      toast.success("Domain removed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!editing ? (
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3 text-[13px]"
            disabled={!partnerId}
            onClick={() => {
              setValue(currentDomain);
              setEditing(true);
            }}
          >
            {currentDomain ? "Change domain" : "Add a domain"}
          </AdminV3Button>
        ) : null}
        {currentDomain && !editing ? (
          <>
            <AdminV3Button
              variant="secondary"
              className="h-[34px] px-3 text-[13px]"
              disabled={verifying}
              onClick={verify}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", verifying && "animate-spin")}
              />
              {verifying ? "Checking…" : "Check DNS"}
            </AdminV3Button>
            <AdminV3Button
              variant="secondary"
              className="h-[34px] px-3 text-[13px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              disabled={removing}
              onClick={remove}
            >
              {removing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remove
            </AdminV3Button>
          </>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-[1_1_240px]">
            <span className="block text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Your domain
            </span>
            <input
              autoFocus
              type="text"
              translate="no"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="menu.mystore.com"
              className="notranslate mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            />
          </label>
          <div className="flex gap-2">
            <AdminV3Button
              variant="secondary"
              className="h-9 px-3 text-[13px]"
              onClick={() => setEditing(false)}
            >
              Cancel
            </AdminV3Button>
            <AdminV3Button
              variant="primary"
              className="h-9 px-3.5 text-[13px] font-medium"
              disabled={saving || !value.trim()}
              onClick={save}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save domain
            </AdminV3Button>
          </div>
        </div>
      ) : null}

      {currentDomain && records.length > 0 && verified !== true ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              DNS records
            </span>
            <StatusPill tone={verified === false ? "amber" : "neutral"}>
              {verified === false ? "Not verified yet" : "Waiting on DNS"}
            </StatusPill>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            {records.map((r, i) => (
              <DnsRow key={`${r.type}-${r.name}-${i}`} record={r} />
            ))}
          </div>
          <Note>
            Add these at your domain registrar, then press Check DNS. Changes can
            take up to a few hours to travel the internet.
          </Note>
        </div>
      ) : null}

      {currentDomain && verified === true ? (
        <Note>This domain is verified and serving your storefront.</Note>
      ) : null}
    </>
  );
}
