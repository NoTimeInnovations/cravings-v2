"use client";

import { useEffect, useState } from "react";

export type RiderDoc = {
  doc_type?: string;
  download_url?: string | null;
  status?: string;
  created_at?: string;
};

export type RiderDocsResult = { docs: RiderDoc[]; fullName?: string; kyc?: string };

const LABELS: Record<string, string> = {
  driving_licence: "Driving licence",
  id_proof: "ID proof",
  vehicle_rc: "Vehicle RC",
  profile_photo: "Profile photo",
};

function KycBadge({ kyc }: { kyc?: string }) {
  const k = (kyc || "").toLowerCase();
  const cls =
    k === "verified"
      ? "bg-green-50 text-green-700"
      : k === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      KYC: {kyc || "submitted"}
    </span>
  );
}

function DocView({ label, doc }: { label: string; doc?: RiderDoc }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</div>
      {doc?.download_url ? (
        <a href={doc.download_url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doc.download_url}
            alt={label}
            className="w-full rounded-lg border max-h-80 object-contain bg-gray-50"
          />
        </a>
      ) : (
        <div className="text-sm text-gray-400 border rounded-lg p-4 bg-gray-50">Not uploaded</div>
      )}
    </div>
  );
}

/**
 * Rider documents viewer. Read-only for restaurants; the Super Admin gets the
 * Verify / Reject KYC controls (gated by `canVerify`).
 */
export default function RiderDocsModal({
  open,
  onClose,
  riderId,
  riderName,
  fetchDocs,
  canVerify = false,
  onVerify,
}: {
  open: boolean;
  onClose: () => void;
  riderId: string | null;
  riderName?: string;
  fetchDocs: (riderId: string) => Promise<RiderDocsResult>;
  canVerify?: boolean;
  onVerify?: (status: "verified" | "rejected", reason?: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<RiderDoc[]>([]);
  const [kyc, setKyc] = useState<string | undefined>();
  const [name, setName] = useState<string | undefined>(riderName);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open || !riderId) return;
    setLoading(true);
    setDocs([]);
    setReason("");
    setName(riderName);
    fetchDocs(riderId)
      .then((r) => {
        setDocs(r.docs || []);
        setKyc(r.kyc);
        setName(r.fullName || riderName);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, riderId]);

  if (!open) return null;

  const licence = docs.find((d) => d.doc_type === "driving_licence");
  const others = docs.filter((d) => d.doc_type !== "driving_licence");

  const verify = async (status: "verified" | "rejected") => {
    if (!onVerify) return;
    setBusy(true);
    const res = await onVerify(status, reason.trim() || undefined);
    setBusy(false);
    if (res.ok) setKyc(status);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-5 py-4 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg leading-tight">{name || "Rider"}</h3>
            <div className="mt-1.5">
              <KycBadge kyc={kyc} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500">Loading documents…</p>
          ) : (
            <>
              <DocView label="Driving licence" doc={licence} />
              {others.map((d, i) => (
                <DocView key={i} label={LABELS[d.doc_type || ""] || d.doc_type || "Document"} doc={d} />
              ))}
              {!docs.length && <p className="text-sm text-gray-400">No documents uploaded.</p>}
            </>
          )}
        </div>

        {canVerify && (
          <div className="border-t px-5 py-4 space-y-3">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (required to reject)"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => verify("verified")}
                className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
              >
                Verify KYC
              </button>
              <button
                disabled={busy || !reason.trim()}
                onClick={() => verify("rejected")}
                className="flex-1 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 font-medium disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
