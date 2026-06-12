"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateScheduledNotificationAction,
  type ScheduleRow,
} from "@/app/actions/scheduledNotifications";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseCron(cron: string | null): {
  frequency: "daily" | "weekly";
  time: string;
  days: number[];
} {
  const parts = (cron || "").trim().split(/\s+/);
  if (parts.length !== 5) return { frequency: "daily", time: "10:00", days: [1, 2, 3, 4, 5] };
  const [mm, hh, , , dow] = parts;
  const time = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  if (dow === "*") return { frequency: "daily", time, days: [1, 2, 3, 4, 5] };
  return {
    frequency: "weekly",
    time,
    days: dow.split(",").map(Number).filter((n) => !isNaN(n)),
  };
}

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EditScheduleDialog({
  schedule,
  open,
  onOpenChange,
  onSaved,
}: {
  schedule: ScheduleRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"app" | "followers">("app");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [time, setTime] = useState("10:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!schedule) return;
    setTitle(schedule.title);
    setBody(schedule.body);
    setAudience((schedule.audience as "app" | "followers") || "app");
    if (schedule.schedule_type === "recurring") {
      const p = parseCron(schedule.cron_expr);
      setFrequency(p.frequency);
      setTime(p.time);
      setDays(p.days);
    } else {
      setScheduledAt(isoToLocal(schedule.scheduled_at));
    }
  }, [schedule]);

  if (!schedule) return null;
  const isRecurring = schedule.schedule_type === "recurring";
  const toggleDay = (d: number) =>
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    if (isRecurring && frequency === "weekly" && days.length === 0) {
      toast.error("Pick at least one day.");
      return;
    }
    if (!isRecurring && !scheduledAt) {
      toast.error("Pick a date and time.");
      return;
    }
    setSaving(true);
    try {
      const tz =
        schedule.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "Asia/Kolkata";
      const res = await updateScheduledNotificationAction({
        id: schedule.id,
        title: title.trim(),
        body: body.trim(),
        audience,
        scheduleType: schedule.schedule_type,
        timezone: tz,
        ...(isRecurring
          ? {
              frequency,
              time,
              daysOfWeek: frequency === "weekly" ? days : undefined,
            }
          : { scheduledAt: new Date(scheduledAt).toISOString() }),
      });
      if (!res.ok) {
        toast.error(res.error || "Couldn't save changes.");
        return;
      }
      toast.success("Notification updated.");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {isRecurring ? "recurring" : "scheduled"} notification
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as "app" | "followers")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="app">All app users</SelectItem>
                <SelectItem value="followers">Followers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isRecurring ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as "daily" | "weekly")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              {frequency === "weekly" && (
                <div className="space-y-1.5">
                  <Label>Days</Label>
                  <div className="flex flex-wrap gap-1">
                    {DOW.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`rounded border px-2.5 py-1 text-xs ${
                          days.includes(i)
                            ? "border-orange-600 bg-orange-600 text-white"
                            : "bg-background"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>Date &amp; time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
