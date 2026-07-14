'use client';

import { useEffect, useState } from 'react';
import { CallLoggerApi, type PartnerRow } from '@/lib/callLogger';
import PartnerDetail from './PartnerDetail';

export default function AndroidCallLoggerSection() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [selected, setSelected] = useState<PartnerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    CallLoggerApi.listPartners()
      .then((r) => setPartners(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <PartnerDetail partner={selected} onBack={() => setSelected(null)} />;
  }

  const filtered = partners.filter((p) => p.accountEmail.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Android Call Logger</h1>
      <p className="text-sm text-gray-500 mb-4">Partners using the call logger app.</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by email…"
        className="border rounded px-3 py-2 mb-4 w-full max-w-sm"
      />

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="divide-y border rounded">
        {filtered.map((p) => (
          <button
            key={p.accountEmail}
            onClick={() => setSelected(p)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{p.accountEmail}</div>
              <div className="text-xs text-gray-500">
                {p.partnerId ? `partner ${p.partnerId.slice(0, 8)}…` : 'not linked to a partner'}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              last call {new Date(p.lastCallAt).toLocaleString()}
            </div>
          </button>
        ))}
        {!loading && filtered.length === 0 && <div className="px-4 py-6 text-gray-500">No partners yet.</div>}
      </div>
    </div>
  );
}
