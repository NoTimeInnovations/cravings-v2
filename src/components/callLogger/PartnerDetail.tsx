'use client';

import { useEffect, useState } from 'react';
import { CallLoggerApi, type PartnerConfig, type PartnerRow } from '@/lib/callLogger';
import CallLogsTab from './CallLogsTab';
import SchedulesTab from './SchedulesTab';
import FlowBuilder from './FlowBuilder';

type Tab = 'config' | 'calls' | 'flow' | 'scheduled';

export default function PartnerDetail({ partner, onBack }: { partner: PartnerRow; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('config');
  const [cfg, setCfg] = useState<PartnerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const partnerId = partner.partnerId;

  useEffect(() => {
    if (!partnerId) return;
    CallLoggerApi.partnerConfig(partnerId).then(setCfg).catch((e) => setError(e.message));
  }, [partnerId]);

  const tabs: [Tab, string][] = [
    ['config', 'Config'],
    ['calls', 'Call logs'],
    ['flow', 'Flow'],
    ['scheduled', 'Scheduled'],
  ];

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-sm text-blue-600 mb-3">← All partners</button>
      <h1 className="text-xl font-semibold">{partner.accountEmail}</h1>
      {cfg?.storeName && <p className="text-sm text-gray-500">{cfg.storeName}</p>}

      {!partnerId && (
        <p className="text-amber-600 mt-4">
          This account isn't linked to a cravings-v2 partner, so flows and messaging are unavailable.
        </p>
      )}

      {partnerId && (
        <>
          <div className="flex gap-2 mt-4 border-b">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-3 py-2 text-sm -mb-px border-b-2 ${
                  tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === 'config' && <ConfigTab cfg={cfg} error={error} />}
            {tab === 'calls' && <CallLogsTab partnerId={partnerId} />}
            {tab === 'flow' && <FlowBuilder partnerId={partnerId} accountEmail={partner.accountEmail} />}
            {tab === 'scheduled' && <SchedulesTab partnerId={partnerId} />}
          </div>
        </>
      )}
    </div>
  );
}

function ConfigTab({ cfg, error }: { cfg: PartnerConfig | null; error: string | null }) {
  if (error) return <p className="text-red-600">{error}</p>;
  if (!cfg) return <p>Loading…</p>;
  return (
    <div className="grid grid-cols-2 gap-4 max-w-lg">
      <Stat label="Total calls" value={String(cfg.totalCalls)} />
      <Stat label="WhatsApp ready" value={cfg.whatsappReady ? 'Yes' : 'No'} />
      <Stat label="Flow" value={cfg.flow?.enabled ? 'Enabled' : 'Disabled'} />
      <Stat label="Flow steps" value={String(cfg.flow?.graph?.nodes?.length ?? 0)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  );
}
