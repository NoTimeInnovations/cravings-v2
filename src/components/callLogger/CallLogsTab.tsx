'use client';

import { useEffect, useMemo, useState } from 'react';
import { CallLoggerApi, type CallRow } from '@/lib/callLogger';

type Range = 'today' | 'yesterday' | 'custom';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export default function CallLogsTab({ partnerId }: { partnerId: string }) {
  const [range, setRange] = useState<Range>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (range === 'today') return { from: startOfDay(now).toISOString(), to: now.toISOString() };
    if (range === 'yesterday') {
      const startToday = startOfDay(now);
      const startYest = new Date(startToday); startYest.setDate(startYest.getDate() - 1);
      return { from: startYest.toISOString(), to: startToday.toISOString() };
    }
    const f = customFrom ? startOfDay(new Date(customFrom)) : new Date(0);
    const t = customTo ? new Date(startOfDay(new Date(customTo)).getTime() + 86_400_000) : now;
    return { from: f.toISOString(), to: t.toISOString() };
  }, [range, customFrom, customTo]);

  useEffect(() => {
    if (range === 'custom' && (!customFrom || !customTo)) return;
    setLoading(true);
    CallLoggerApi.calls(partnerId, from, to)
      .then((r) => setRows(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [partnerId, from, to, range, customFrom, customTo]);

  return (
    <div>
      <div className="flex gap-2 items-center mb-3">
        {(['today', 'yesterday', 'custom'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded text-sm border ${range === r ? 'bg-blue-600 text-white' : ''}`}
          >
            {r[0].toUpperCase() + r.slice(1)}
          </button>
        ))}
        {range === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <span>→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </>
        )}
        <span className="text-sm text-gray-500 ml-auto">{rows.length} calls</span>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <table className="w-full text-sm">
        <thead className="text-left text-gray-500 border-b">
          <tr><th className="py-2">Number</th><th>Name</th><th>Type</th><th>Duration</th><th>When</th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2">{c.number_e164 || c.number_raw}</td>
              <td>{c.cached_name || '—'}</td>
              <td>
                <span className={c.direction === 'inbound' ? 'text-green-700' : 'text-gray-600'}>{c.call_type}</span>
              </td>
              <td>{c.duration_seconds}s</td>
              <td>{new Date(c.started_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && <p className="text-gray-500 py-4">No calls in this range.</p>}
    </div>
  );
}
