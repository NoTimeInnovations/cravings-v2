"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Loader2,
  Pause,
  Play,
  Repeat,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  listScheduledNotificationsAction,
  setScheduleStatusAction,
  deleteScheduledNotificationAction,
  type ScheduleRow,
} from "@/app/actions/scheduledNotifications";

function fmt(iso: string | null, tz?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone: tz || undefined,
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

const STATUS_STYLES: Record<ScheduleRow["status"], string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-neutral-100 text-neutral-600",
  cancelled: "bg-red-100 text-red-600",
};

const RUN_ICON: Record<string, ReactNode> = {
  sent: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-600" />,
  skipped: <AlertCircle className="h-3.5 w-3.5 text-amber-600" />,
};

export function AdminV2NotifyScheduled({
  refreshSignal,
}: {
  refreshSignal?: number;
}) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listScheduledNotificationsAction();
      setSchedules(rows);
    } catch (err) {
      console.error("Failed to load schedules:", err);
      toast.error("Couldn't load your scheduled notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const runAction = async (
    id: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string
  ) => {
    setBusyId(id);
    try {
      const res = await fn();
      if (res.ok) {
        toast.success(okMsg);
        await load();
      } else {
        toast.error(res.error || "Action failed.");
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading schedules…
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p>No scheduled notifications yet.</p>
        <p className="text-sm">Use the Compose tab to schedule one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((s) => {
        const isRecurring = s.schedule_type === "recurring";
        const canPause = s.status === "active";
        const canResume = s.status === "paused";
        const isClosed = s.status === "completed" || s.status === "cancelled";
        const busy = busyId === s.id;

        return (
          <Card key={s.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isRecurring ? (
                      <Repeat className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold truncate">{s.title}</h3>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {s.body}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {canPause && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          s.id,
                          () => setScheduleStatusAction(s.id, "pause"),
                          "Paused."
                        )
                      }
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pause className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1 hidden sm:inline">Pause</span>
                    </Button>
                  )}
                  {canResume && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          s.id,
                          () => setScheduleStatusAction(s.id, "resume"),
                          "Resumed."
                        )
                      }
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1 hidden sm:inline">Resume</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !confirm(
                          "Delete this scheduled notification? This can't be undone."
                        )
                      )
                        return;
                      runAction(
                        s.id,
                        () => deleteScheduledNotificationAction(s.id),
                        "Deleted."
                      );
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Schedule</div>
                  <div className="font-medium">
                    {isRecurring
                      ? s.description
                      : `Once · ${fmt(s.scheduled_at, s.timezone)}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Next run</div>
                  <div className="font-medium">
                    {isClosed ? "—" : fmt(s.next_run_at, s.timezone)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Audience</div>
                  <div className="font-medium capitalize flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {s.audience === "app" ? "All app users" : "Followers"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Sent so far</div>
                  <div className="font-medium">{s.run_count}×</div>
                </div>
              </div>

              {s.runs.length > 0 && (
                <div className="border-t pt-2.5 space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Recent runs
                  </div>
                  {s.runs.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      {RUN_ICON[r.status]}
                      <span className="capitalize">{r.status}</span>
                      <span>·</span>
                      <span>{fmt(r.created_at, s.timezone)}</span>
                      {r.status === "sent" && (
                        <>
                          <span>·</span>
                          <span>{r.recipients_count} devices</span>
                        </>
                      )}
                      {r.error && (
                        <span className="text-red-500 truncate">— {r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
