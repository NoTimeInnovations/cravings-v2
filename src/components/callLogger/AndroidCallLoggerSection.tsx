"use client";

import { useEffect, useState } from "react";
import { CallLoggerApi, type PartnerRow } from "@/lib/callLogger";
import PartnerDetail from "./PartnerDetail";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Search, Smartphone } from "lucide-react";

export default function AndroidCallLoggerSection() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [selected, setSelected] = useState<PartnerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    CallLoggerApi.listPartners()
      .then((r) => setPartners(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <PartnerDetail partner={selected} onBack={() => setSelected(null)} />;
  }

  const filtered = partners.filter((p) =>
    p.accountEmail.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Smartphone className="h-6 w-6 text-primary" />
          Android Call Logger
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Partners using the call-logger app. Select one to manage their flow, calls and messages.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email…"
          className="pl-9"
        />
      </div>

      <Card className="divide-y overflow-hidden p-0 gap-0">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}

        {error && <p className="p-4 text-sm text-destructive">{error}</p>}

        {!loading &&
          filtered.map((p) => (
            <button
              key={p.accountEmail}
              onClick={() => setSelected(p)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{p.accountEmail}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {p.partnerId ? `partner ${p.partnerId.slice(0, 8)}…` : "not linked to a partner"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(p.lastCallAt).toLocaleDateString()}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}

        {!loading && !error && filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No partners yet.</p>
        )}
      </Card>
    </div>
  );
}
