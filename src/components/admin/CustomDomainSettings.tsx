"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Globe, Trash2, RefreshCw, Copy } from "lucide-react";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

interface Props {
  partnerId: string;
  currentDomain?: string | null;
}

function DnsRecordRow({ record }: { record: DnsRecord }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(record.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
      <div className="bg-background border border-border rounded p-2">
        <p className="text-muted-foreground mb-1">Type</p>
        <p className="font-semibold text-foreground">{record.type}</p>
      </div>
      <div className="bg-background border border-border rounded p-2">
        <p className="text-muted-foreground mb-1">Name</p>
        <p className="font-semibold text-foreground truncate">{record.name}</p>
      </div>
      <div className="bg-background border border-border rounded p-2 relative">
        <p className="text-muted-foreground mb-1">Value</p>
        <div className="flex items-center justify-between gap-1">
          <p className="font-semibold text-foreground text-xs truncate">{record.value}</p>
          <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground">
            <Copy size={12} />
          </button>
        </div>
        {copied && (
          <span className="absolute -top-6 right-0 text-xs bg-foreground text-background rounded px-1 py-0.5">
            Copied!
          </span>
        )}
      </div>
    </div>
  );
}

export default function CustomDomainSettings({ partnerId, currentDomain }: Props) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [savedDomain, setSavedDomain] = useState(currentDomain || "");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On load, if a domain is already saved fetch its status + DNS records from Vercel
  useEffect(() => {
    if (!currentDomain) return;
    fetch(`/api/domains/verify?domain=${encodeURIComponent(currentDomain)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dnsRecords?.length) setDnsRecords(data.dnsRecords);
        if (data.verified === true) setVerified(true);
      })
      .catch(() => {});
  }, [currentDomain]);

  const handleSave = async () => {
    if (!domain.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/domains/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save domain");
      setSavedDomain(data.domain);
      if (data.dnsRecords?.length) setDnsRecords(data.dnsRecords);
      setVerified(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove this custom domain?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/domains/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      if (!res.ok) throw new Error("Failed to remove domain");
      setSavedDomain("");
      setDomain("");
      setDnsRecords([]);
      setVerified(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!savedDomain) return;
    setVerifying(true);
    setVerified(null);
    try {
      const res = await fetch(`/api/domains/verify?domain=${encodeURIComponent(savedDomain)}`);
      const data = await res.json();
      setVerified(data.verified === true);
      if (data.dnsRecords?.length) setDnsRecords(data.dnsRecords);
    } catch {
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const showDnsInstructions = savedDomain && verified !== true;
  const hasARecord = dnsRecords.some((r) => r.type === "A");

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Globe size={18} className="text-gray-900 dark:text-white" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Custom Domain</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Connect your own domain to your Menuthere menu page.
      </p>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="menu.yourrestaurant.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={handleSave}
          disabled={loading || !domain.trim() || domain.trim() === savedDomain}
          className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-orange-600 transition-colors"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        {savedDomain && (
          <button
            onClick={handleRemove}
            disabled={loading}
            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Verified badge */}
      {verified === true && (
        <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
          <CheckCircle size={15} />
          Domain verified and active
        </div>
      )}

      {/* DNS instructions — hidden once verified */}
      {showDnsInstructions && (
        <div className="border border-border rounded-lg p-4 bg-muted/40 space-y-3">
          <p className="text-sm font-medium text-foreground">
            Add these DNS records with your DNS provider:
          </p>

          <div className="space-y-2">
            {dnsRecords.map((record, i) => (
              <DnsRecordRow key={i} record={record} />
            ))}
          </div>

          {hasARecord && (
            <p className="text-xs text-muted-foreground">
              Apex domains (e.g. example.com) require an A record instead of CNAME.
            </p>
          )}

          {/* Verify row */}
          <div className="flex items-center justify-between pt-1">
            {verified === false && (
              <div className="flex items-center gap-1.5 text-amber-500 text-sm">
                <AlertCircle size={15} />
                DNS not propagated yet — can take up to 48h
              </div>
            )}
            {verified === null && <span />}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <RefreshCw size={14} className={verifying ? "animate-spin" : ""} />
              {verifying ? "Checking..." : "Verify DNS"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
