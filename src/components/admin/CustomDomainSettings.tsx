"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Globe, Trash2, RefreshCw, Copy } from "lucide-react";

const CNAME_TARGET = "cname.vercel-dns.com";

interface Props {
  partnerId: string;
  currentDomain?: string | null;
}

export default function CustomDomainSettings({ partnerId, currentDomain }: Props) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [savedDomain, setSavedDomain] = useState(currentDomain || "");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    } catch {
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(CNAME_TARGET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Globe size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-800">Custom Domain</h3>
      </div>
      <p className="text-sm text-gray-500">
        Connect your own domain to your Menuthere menu page.
      </p>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="menu.yourrestaurant.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* DNS instructions — shown once a domain is saved */}
      {savedDomain && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Add this CNAME record with your DNS provider:
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="bg-white border rounded p-2">
              <p className="text-gray-400 mb-1">Type</p>
              <p className="font-semibold">CNAME</p>
            </div>
            <div className="bg-white border rounded p-2">
              <p className="text-gray-400 mb-1">Name</p>
              <p className="font-semibold truncate">{savedDomain.split(".")[0]}</p>
            </div>
            <div className="bg-white border rounded p-2 relative">
              <p className="text-gray-400 mb-1">Value</p>
              <div className="flex items-center justify-between gap-1">
                <p className="font-semibold text-xs truncate">{CNAME_TARGET}</p>
                <button onClick={handleCopy} className="shrink-0 text-gray-400 hover:text-gray-600">
                  <Copy size={12} />
                </button>
              </div>
              {copied && (
                <span className="absolute -top-6 right-0 text-xs bg-black text-white rounded px-1 py-0.5">
                  Copied!
                </span>
              )}
            </div>
          </div>

          {/* Verification status */}
          <div className="flex items-center justify-between pt-1">
            {verified === true && (
              <div className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle size={15} />
                Domain verified and active
              </div>
            )}
            {verified === false && (
              <div className="flex items-center gap-1.5 text-amber-600 text-sm">
                <AlertCircle size={15} />
                DNS not propagated yet — can take up to 48h
              </div>
            )}
            {verified === null && <span />}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
