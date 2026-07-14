"use client";

import { useEffect, useState } from "react";
import { CallLoggerApi, type ScheduleRow, type TargetRow } from "@/lib/callLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, Plus } from "lucide-react";

export default function SchedulesTab({ partnerId }: { partnerId: string }) {
  const [items, setItems] = useState<ScheduleRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () =>
    CallLoggerApi.schedules(partnerId).then((r) => setItems(r.items)).catch(() => {});
  useEffect(() => {
    refresh();
  }, [partnerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Scheduled messages</h3>
        <Button size="sm" variant={creating ? "secondary" : "default"} onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : (<><Plus className="mr-1 h-4 w-4" /> New</>)}
        </Button>
      </div>

      {creating && (
        <NewSchedule
          partnerId={partnerId}
          onCreated={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}

      <Card className="divide-y overflow-hidden p-0 gap-0">
        {items.map((s) => (
          <div key={s.id}>
            <button
              onClick={() => setOpenId(openId === s.id ? null : s.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <span className="font-medium">{s.name || s.template_name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(s.scheduled_at).toLocaleString()}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={s.status === "done" ? "default" : "secondary"}>{s.status}</Badge>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${openId === s.id ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {openId === s.id && <Targets id={s.id} />}
          </div>
        ))}
        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No scheduled messages.</p>
        )}
      </Card>
    </div>
  );
}

function Targets({ id }: { id: string }) {
  const [rows, setRows] = useState<TargetRow[] | null>(null);
  const [onlyNotSent, setOnlyNotSent] = useState(false);

  useEffect(() => {
    CallLoggerApi.targets(id).then((r) => setRows(r.items)).catch(() => setRows([]));
  }, [id]);

  if (!rows) {
    return (
      <div className="space-y-2 bg-muted/40 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const sent = rows.filter((r) => r.status === "sent").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const shown = onlyNotSent ? rows.filter((r) => r.status !== "sent") : rows;

  return (
    <div className="space-y-3 bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="default">Sent {sent}</Badge>
        <Badge variant="destructive">Failed {failed}</Badge>
        <Badge variant="secondary">Pending {pending}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor={`nd-${id}`} className="text-xs text-muted-foreground">
            Only not delivered
          </Label>
          <Switch id={`nd-${id}`} checked={onlyNotSent} onCheckedChange={setOnlyNotSent} />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((t) => (
              <TableRow key={t.to_e164}>
                <TableCell className="font-medium">{t.to_e164}</TableCell>
                <TableCell className="text-muted-foreground">{t.contact_name || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      t.status === "sent" ? "default" : t.status === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.error || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewSchedule({ partnerId, onCreated }: { partnerId: string; onCreated: () => void }) {
  const [template, setTemplate] = useState("");
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState<"all_called" | "selected">("all_called");
  const [numbers, setNumbers] = useState("");
  const [when, setWhen] = useState("");
  const [params, setParams] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await CallLoggerApi.createSchedule(partnerId, {
        template,
        language,
        params: params.split("\n").map((p) => p.trim()).filter(Boolean),
        audience:
          mode === "selected"
            ? { mode, numbers: numbers.split(/[\n,]/).map((n) => n.trim()).filter(Boolean) }
            : { mode },
        scheduledAt: new Date(when).toISOString(),
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="grid max-w-lg gap-4 py-5">
        <div className="grid gap-1.5">
          <Label>Approved template name</Label>
          <Input value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="e.g. reengage_offer" />
        </div>
        <div className="grid gap-1.5">
          <Label>Language</Label>
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
        </div>
        <div className="grid gap-1.5">
          <Label>Audience</Label>
          <div className="flex gap-2">
            {(["all_called", "selected"] as const).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? "default" : "outline"}
                onClick={() => setMode(m)}
              >
                {m === "all_called" ? "Everyone who called" : "Selected numbers"}
              </Button>
            ))}
          </div>
        </div>
        {mode === "selected" && (
          <div className="grid gap-1.5">
            <Label>Numbers</Label>
            <Textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              placeholder="+91… (one per line or comma-separated)"
              className="h-24"
            />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label>Body params (one per line)</Label>
          <Textarea
            value={params}
            onChange={(e) => setParams(e.target.value)}
            placeholder="{{contact_name}}, {{business_name}}"
            className="h-20"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Send at</Label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button onClick={submit} disabled={busy || !template || !when}>
          {busy ? "Scheduling…" : "Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}
