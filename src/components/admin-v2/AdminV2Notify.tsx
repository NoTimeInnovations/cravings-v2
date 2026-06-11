"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CalendarClock,
  Clock,
  Loader2,
  Megaphone,
  Repeat,
  Send,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import { toast } from "sonner";
import {
  countBroadcastRecipientsAction,
  sendBroadcastNowAction,
  createScheduledNotificationAction,
} from "@/app/actions/scheduledNotifications";
import { AdminV2NotifyScheduled } from "@/components/admin-v2/AdminV2NotifyScheduled";

type NotifyAudience = "app" | "followers";
type WhenMode = "now" | "schedule" | "recurring";
type Frequency = "daily" | "weekly";

const TITLE_MAX = 65;
const BODY_MAX = 240;

const DOW = [
  { d: 0, label: "S" },
  { d: 1, label: "M" },
  { d: 2, label: "T" },
  { d: 3, label: "W" },
  { d: 4, label: "T" },
  { d: 5, label: "F" },
  { d: 6, label: "S" },
];

// "YYYY-MM-DDTHH:MM" in local time, for <input type="datetime-local" min>.
function localNowString(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function AdminV2Notify() {
  const { userData } = useAuthStore();
  const storeName = (userData as any)?.store_name;

  const [tab, setTab] = useState<"compose" | "scheduled">("compose");
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Compose
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState<NotifyAudience>("app");

  // When
  const [when, setWhen] = useState<WhenMode>("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [time, setTime] = useState("10:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [endDate, setEndDate] = useState("");

  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refreshRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      setRecipientCount(await countBroadcastRecipientsAction(audience));
    } catch {
      setRecipientCount(null);
    } finally {
      setLoadingRecipients(false);
    }
  }, [audience]);

  useEffect(() => {
    refreshRecipients();
  }, [refreshRecipients]);

  const titleTrimmed = title.trim();
  const bodyTrimmed = body.trim();

  const whenValid = useMemo(() => {
    if (when === "now") return true;
    if (when === "schedule") return !!scheduleAt;
    return !!time && (frequency === "daily" || days.length > 0);
  }, [when, scheduleAt, time, frequency, days]);

  const canSubmit =
    titleTrimmed.length > 0 && bodyTrimmed.length > 0 && whenValid && !submitting;

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );

  const clearForm = () => {
    setTitle("");
    setBody("");
    setImageUrl("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

    setSubmitting(true);
    try {
      if (when === "now") {
        const res = await sendBroadcastNowAction({
          title: titleTrimmed,
          body: bodyTrimmed,
          imageUrl,
          audience,
        });
        if (res.skipped) {
          toast.message("Skipped — this is a test partner account.");
        } else if (!res.ok) {
          toast.error(res.error || "Failed to send notification.");
        } else if (res.recipients === 0) {
          toast.error(
            audience === "app"
              ? "No app installs yet. Notifications reach people who installed your app."
              : "None of your followers have notifications enabled yet."
          );
        } else {
          toast.success(
            `Sent to ${res.recipients} device${res.recipients === 1 ? "" : "s"}.`
          );
          clearForm();
          refreshRecipients();
        }
        return;
      }

      const payload: any = {
        title: titleTrimmed,
        body: bodyTrimmed,
        imageUrl,
        audience,
        timezone: tz,
      };

      if (when === "schedule") {
        const d = new Date(scheduleAt);
        if (isNaN(d.getTime())) {
          toast.error("Pick a valid date and time.");
          return;
        }
        payload.scheduleType = "once";
        payload.scheduledAt = d.toISOString();
      } else {
        payload.scheduleType = "recurring";
        payload.frequency = frequency;
        payload.time = time;
        if (frequency === "weekly") payload.daysOfWeek = days;
        if (endDate) payload.endAt = new Date(`${endDate}T23:59:59`).toISOString();
      }

      const res = await createScheduledNotificationAction(payload);
      if (!res.ok) {
        toast.error(res.error || "Couldn't schedule the notification.");
        return;
      }
      toast.success(
        when === "schedule"
          ? "Scheduled."
          : "Recurring notification created."
      );
      clearForm();
      setRefreshSignal((x) => x + 1);
      setTab("scheduled");
    } catch (e: any) {
      console.error("Notify submit error:", e);
      toast.error(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel =
    when === "now" ? "Send notification" : when === "schedule" ? "Schedule" : "Create recurring";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full lg:max-w-[80%] mx-auto px-2 sm:px-4 lg:px-0">
      <div className="flex items-center justify-between gap-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-orange-600" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notify</h1>
            <p className="text-muted-foreground">
              Push a message to {storeName || "your store"}&apos;s app users — now,
              later, or on a repeat.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {loadingRecipients ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> counting…
            </span>
          ) : recipientCount === null ? (
            <span>—</span>
          ) : (
            <span>
              {recipientCount} device{recipientCount === 1 ? "" : "s"} reachable
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
        <button
          type="button"
          onClick={() => setTab("compose")}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            tab === "compose" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"
          }`}
        >
          Compose
        </button>
        <button
          type="button"
          onClick={() => setTab("scheduled")}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            tab === "scheduled" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"
          }`}
        >
          Scheduled
        </button>
      </div>

      {tab === "scheduled" ? (
        <AdminV2NotifyScheduled refreshSignal={refreshSignal} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Compose notification</CardTitle>
              <CardDescription>
                Title and body are required. Add an image to make it stand out — Android
                and iOS render it inline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="mb-1.5 block">Send to</Label>
                <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setAudience("app")}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      audience === "app"
                        ? "bg-white shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    All app users
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience("followers")}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      audience === "followers"
                        ? "bg-white shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    Followers only
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {audience === "app"
                    ? "Everyone who installed your app — including users who never logged in or followed."
                    : "Only people who tapped Follow on your storefront and have notifications on."}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="notify-title">Title</Label>
                  <span className="text-xs text-muted-foreground">
                    {title.length}/{TITLE_MAX}
                  </span>
                </div>
                <Input
                  id="notify-title"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Fresh batch of biryani at 1 PM"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="notify-body">Message</Label>
                  <span className="text-xs text-muted-foreground">
                    {body.length}/{BODY_MAX}
                  </span>
                </div>
                <Textarea
                  id="notify-body"
                  value={body}
                  maxLength={BODY_MAX}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Drop in this afternoon — limited plates."
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Image (optional)</Label>
                {imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={imageUrl}
                      alt="notification preview"
                      className="h-40 w-auto rounded-md border object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7"
                      onClick={() => setImageUrl("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <ImageUpload
                    value={imageUrl}
                    onChange={setImageUrl}
                    folder="notify-broadcasts"
                  />
                )}
              </div>

              {/* When */}
              <div>
                <Label className="mb-1.5 block">When</Label>
                <div className="inline-flex rounded-lg border p-0.5 bg-muted/40 flex-wrap">
                  {([
                    { v: "now", label: "Send now", icon: Send },
                    { v: "schedule", label: "Schedule", icon: Clock },
                    { v: "recurring", label: "Recurring", icon: Repeat },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setWhen(opt.v)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors inline-flex items-center gap-1.5 ${
                        when === opt.v
                          ? "bg-white shadow-sm font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      <opt.icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {when === "schedule" && (
                  <div className="mt-3">
                    <Label htmlFor="notify-when" className="mb-1.5 block text-sm">
                      Date &amp; time
                    </Label>
                    <Input
                      id="notify-when"
                      type="datetime-local"
                      value={scheduleAt}
                      min={localNowString()}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="w-auto"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uses your device timezone.
                    </p>
                  </div>
                )}

                {when === "recurring" && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
                        <button
                          type="button"
                          onClick={() => setFrequency("daily")}
                          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                            frequency === "daily"
                              ? "bg-white shadow-sm font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => setFrequency("weekly")}
                          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                            frequency === "weekly"
                              ? "bg-white shadow-sm font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          Weekly
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="notify-time" className="text-sm">
                          at
                        </Label>
                        <Input
                          id="notify-time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-auto"
                        />
                      </div>
                    </div>

                    {frequency === "weekly" && (
                      <div>
                        <Label className="mb-1.5 block text-sm">On days</Label>
                        <div className="flex gap-1.5">
                          {DOW.map((day) => (
                            <button
                              key={day.d}
                              type="button"
                              onClick={() => toggleDay(day.d)}
                              className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                                days.includes(day.d)
                                  ? "bg-orange-600 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="notify-end" className="mb-1.5 block text-sm">
                        End date (optional)
                      </Label>
                      <Input
                        id="notify-end"
                        type="date"
                        value={endDate}
                        min={localNowString().slice(0, 10)}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-auto"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : when === "now" ? (
                    <Send className="mr-2 h-4 w-4" />
                  ) : (
                    <CalendarClock className="mr-2 h-4 w-4" />
                  )}
                  {submitting ? "Working…" : submitLabel}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Roughly how it appears on a device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-neutral-50 dark:bg-neutral-900 p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-orange-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(storeName || "M").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {storeName || "Menuthere"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">now</span>
                    </div>
                    <p className="font-semibold text-sm mt-0.5 break-words">
                      {titleTrimmed || "Notification title"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line break-words">
                      {bodyTrimmed || "Your message text shows here."}
                    </p>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt=""
                        className="mt-2 rounded-md max-h-40 w-full object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                {when === "now"
                  ? "Sends immediately when you hit send."
                  : when === "schedule"
                    ? "Queued — sends once at the time you pick (±1 min)."
                    : "Repeats on your chosen schedule until you pause it or it hits the end date."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
