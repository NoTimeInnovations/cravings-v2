"use client";

import { useEffect, useState } from "react";
import { CallLoggerApi, type SendRow } from "@/lib/callLogger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Status = "all" | "sent" | "failed" | "pending";

export default function MessagesTab({ partnerId }: { partnerId: string }) {
  const [status, setStatus] = useState<Status>("all");
  const [rows, setRows] = useState<SendRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    CallLoggerApi.messages(partnerId, status === "all" ? undefined : { status })
      .then((r) => setRows(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [partnerId, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "sent", "failed", "pending"] as Status[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{rows.length} messages</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>To</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              rows.map((m, i) => (
                <TableRow key={m.wa_message_id ?? `${m.to_e164}-${i}`}>
                  <TableCell className="font-medium">{m.to_e164}</TableCell>
                  <TableCell className="text-muted-foreground">{m.template_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        m.status === "sent" ? "default" : m.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {m.status}
                    </Badge>
                    {m.error && <span className="ml-2 text-xs text-muted-foreground">{m.error}</span>}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No messages sent yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
