"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CallLoggerApi, type PartnerConfig, type PartnerRow } from "@/lib/callLogger";
import CallLogsTab from "./CallLogsTab";
import SchedulesTab from "./SchedulesTab";
import MessagesTab from "./MessagesTab";
import FlowBuilder from "./FlowBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function PartnerDetail({
  partner,
  onBack,
}: {
  partner: PartnerRow;
  onBack: () => void;
}) {
  const [cfg, setCfg] = useState<PartnerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const partnerId = partner.partnerId;

  useEffect(() => {
    if (!partnerId) return;
    CallLoggerApi.partnerConfig(partnerId).then(setCfg).catch((e) => setError(e.message));
  }, [partnerId]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> All partners
      </Button>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">{partner.accountEmail}</h1>
        {cfg?.storeName && <p className="text-sm text-muted-foreground">{cfg.storeName}</p>}
      </div>

      {!partnerId && (
        <Card>
          <CardContent className="py-4 text-sm text-amber-600">
            This account isn&apos;t linked to a Cravings partner, so flows and messaging are unavailable.
          </CardContent>
        </Card>
      )}

      {partnerId && (
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Config</TabsTrigger>
            <TabsTrigger value="calls">Call logs</TabsTrigger>
            <TabsTrigger value="flow">Flow</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <ConfigCards cfg={cfg} error={error} />
          </TabsContent>
          <TabsContent value="calls">
            <CallLogsTab partnerId={partnerId} />
          </TabsContent>
          <TabsContent value="flow">
            <FlowBuilder partnerId={partnerId} accountEmail={partner.accountEmail} />
          </TabsContent>
          <TabsContent value="scheduled">
            <SchedulesTab partnerId={partnerId} />
          </TabsContent>
          <TabsContent value="messages">
            <MessagesTab partnerId={partnerId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ConfigCards({ cfg, error }: { cfg: PartnerConfig | null; error: string | null }) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!cfg) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat label="Total calls" value={String(cfg.totalCalls)} />
      <Stat
        label="WhatsApp"
        value={
          <Badge variant={cfg.whatsappReady ? "default" : "secondary"}>
            {cfg.whatsappReady ? "Ready" : "Not set"}
          </Badge>
        }
      />
      <Stat
        label="Flow"
        value={
          <Badge variant={cfg.flow?.enabled ? "default" : "secondary"}>
            {cfg.flow?.enabled ? "Enabled" : "Disabled"}
          </Badge>
        }
      />
      <Stat label="Flow steps" value={String(cfg.flow?.graph?.nodes?.length ?? 0)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
