'use client';

import { useEffect, useState } from 'react';
import { CallLoggerApi, type ScheduleRow, type TargetRow } from '@/lib/callLogger';

export default function SchedulesTab({ partnerId }: { partnerId: string }) {
  const [items, setItems] = useState<ScheduleRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => CallLoggerApi.schedules(partnerId).then((r) => setItems(r.items)).catch(() => {});
  useEffect(() => { refresh(); }, [partnerId]);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Scheduled messages</h3>
        <button onClick={() => setCreating((v) => !v)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">
          {creating ? 'Close' : 'New'}
        </button>
      </div>

      {creating && <NewSchedule partnerId={partnerId} onCreated={() => { setCreating(false); refresh(); }} />}

      <div className="divide-y border rounded mt-3">
        {items.map((s) => (
          <div key={s.id}>
            <button onClick={() => setOpenId(openId === s.id ? null : s.id)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between">
              <span>
                <span className="font-medium">{s.name || s.template_name}</span>
                <span className="text-xs text-gray-500 ml-2">{new Date(s.scheduled_at).toLocaleString()}</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{s.status}</span>
            </button>
            {openId === s.id && <Targets id={s.id} />}
          </div>
        ))}
        {items.length === 0 && <div className="px-4 py-6 text-gray-500">No scheduled messages.</div>}
      </div>
    </div>
  );
}

function Targets({ id }: { id: string }) {
  const [rows, setRows] = useState<TargetRow[] | null>(null);
  const [onlyNotSent, setOnlyNotSent] = useState(false);

  useEffect(() => { CallLoggerApi.targets(id).then((r) => setRows(r.items)).catch(() => setRows([])); }, [id]);
  if (!rows) return <div className="px-4 py-3 text-sm text-gray-500">Loading recipients…</div>;

  const sent = rows.filter((r) => r.status === 'sent').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const shown = onlyNotSent ? rows.filter((r) => r.status !== 'sent') : rows;

  return (
    <div className="px-4 py-3 bg-gray-50">
      <div className="flex gap-3 text-sm mb-2">
        <span className="text-green-700">Sent {sent}</span>
        <span className="text-red-600">Failed {failed}</span>
        <span className="text-amber-600">Pending {pending}</span>
        <label className="ml-auto flex items-center gap-1">
          <input type="checkbox" checked={onlyNotSent} onChange={(e) => setOnlyNotSent(e.target.checked)} />
          Only not delivered
        </label>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500 border-b"><tr><th className="py-1">Number</th><th>Name</th><th>Status</th><th>Error</th></tr></thead>
        <tbody>
          {shown.map((t) => (
            <tr key={t.to_e164} className="border-b">
              <td className="py-1">{t.to_e164}</td>
              <td>{t.contact_name || '—'}</td>
              <td className={t.status === 'sent' ? 'text-green-700' : t.status === 'failed' ? 'text-red-600' : 'text-amber-600'}>{t.status}</td>
              <td className="text-xs text-gray-500">{t.error || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewSchedule({ partnerId, onCreated }: { partnerId: string; onCreated: () => void }) {
  const [template, setTemplate] = useState('');
  const [language, setLanguage] = useState('en');
  const [mode, setMode] = useState<'all_called' | 'selected'>('all_called');
  const [numbers, setNumbers] = useState('');
  const [when, setWhen] = useState('');
  const [params, setParams] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await CallLoggerApi.createSchedule(partnerId, {
        template,
        language,
        params: params.split('\n').map((p) => p.trim()).filter(Boolean),
        audience: mode === 'selected'
          ? { mode, numbers: numbers.split(/[\n,]/).map((n) => n.trim()).filter(Boolean) }
          : { mode },
        scheduledAt: new Date(when).toISOString(),
      });
      onCreated();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="border rounded p-4 grid gap-3 max-w-lg">
      <input value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="Approved template name" className="border rounded px-3 py-2" />
      <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Language (en)" className="border rounded px-3 py-2" />
      <div className="flex gap-2">
        {(['all_called', 'selected'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded text-sm border ${mode === m ? 'bg-blue-600 text-white' : ''}`}>
            {m === 'all_called' ? 'All who called' : 'Selected numbers'}
          </button>
        ))}
      </div>
      {mode === 'selected' && (
        <textarea value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="+91… (one per line or comma-separated)" className="border rounded px-3 py-2 h-24" />
      )}
      <textarea value={params} onChange={(e) => setParams(e.target.value)} placeholder="Body params, one per line — {{contact_name}}, {{business_name}}" className="border rounded px-3 py-2 h-20" />
      <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="border rounded px-3 py-2" />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button onClick={submit} disabled={busy || !template || !when} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
        {busy ? 'Scheduling…' : 'Schedule'}
      </button>
    </div>
  );
}
