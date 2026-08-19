"use client";

/**
 * admin-v3 — Notify.
 *
 * Same data layer as admin-v2's AdminV2Notify + AdminV2NotifyScheduled: every
 * read and write goes through the server actions in
 * `src/app/actions/scheduledNotifications.ts` (recipient count, immediate
 * broadcast, schedule CRUD). Nothing new was invented here.
 *
 * One structural difference from v2: the schedule list is loaded by THIS
 * component rather than by the child panel, because the design puts a live count
 * on the "Scheduled" tab and a count the child owns cannot be shown by the
 * parent. Everything else — validation, payload shape, toasts — matches v2.
 */

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ImagePlus,
  Info,
  Loader2,
  Pause,
  Pencil,
  Play,
  Repeat,
  Send,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Partner, useAuthStore } from "@/store/authStore";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { EditScheduleDialog } from "@/components/admin-v2/EditScheduleDialog";
import {
  countBroadcastRecipientsAction,
  createScheduledNotificationAction,
  deleteScheduledNotificationAction,
  listScheduledNotificationsAction,
  sendBroadcastNowAction,
  setScheduleStatusAction,
  type CreateScheduleInput,
  type ScheduleRow,
} from "@/app/actions/scheduledNotifications";
import { V3Card } from "./ui/primitives";

/* --------------------------------------------------------------- constants */

type Audience = "app" | "followers";
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

const AUDIENCE_HINT: Record<Audience, string> = {
  app: "Everyone who installed your app — including users who never logged in or followed.",
  followers:
    "Only people who tapped Follow on your storefront and have notifications on.",
};

/* ----------------------------------------------------------------- helpers */

/** "YYYY-MM-DDTHH:MM" in browser-local time, for <input type="datetime-local" min>. */
function localNowString(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fmt(iso: string | null | undefined, tz?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone: tz || undefined,
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

const INPUT_CLASS =
  "w-full h-9 px-[11px] rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 " +
  "text-[13px] font-normal leading-none text-zinc-950 dark:text-zinc-50 outline-none " +
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
  "focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-50 focus-visible:ring-offset-1 dark:ring-offset-zinc-900";

/* -------------------------------------------------------------- Segmented */

function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ v: T; label: React.ReactNode; icon?: React.ElementType }>;
  className?: string;
}) {
  return (
    <div
      className={[
        "inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-[3px]",
        className || "",
      ].join(" ")}
    >
      {options.map((o) => {
        const active = o.v === value;
        const Icon = o.icon;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={[
              "inline-flex h-[30px] items-center gap-1.5 rounded-md px-3 text-[12.5px] leading-none transition-colors",
              active
                ? "border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 font-semibold text-zinc-950 dark:text-zinc-50 shadow-[0_1px_2px_rgba(9,9,11,.06)]"
                : "border border-transparent font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50",
            ].join(" ")}
          >
            {Icon ? <Icon size={13} strokeWidth={1.9} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Card parts */

function CardHead({
  title,
  badge,
}: {
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 gap-y-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-[13px]">
      <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </span>
      {badge ? (
        <span className="whitespace-nowrap rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function FieldLabel({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="flex-1 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
        {children}
      </span>
      {right ? (
        <span className="text-xs font-normal leading-none tabular-nums text-zinc-400 dark:text-zinc-500">
          {right}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3Notify() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const storeName = partner?.store_name || "";

  const [tab, setTab] = React.useState<"compose" | "scheduled">("compose");

  // Compose
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [imageMode, setImageMode] = React.useState<"upload" | "url">("upload");
  const [imageUrlDraft, setImageUrlDraft] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [audience, setAudience] = React.useState<Audience>("app");

  // Delivery
  const [when, setWhen] = React.useState<WhenMode>("now");
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [frequency, setFrequency] = React.useState<Frequency>("daily");
  const [time, setTime] = React.useState("10:00");
  const [days, setDays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [endDate, setEndDate] = React.useState("");

  const [recipientCount, setRecipientCount] = React.useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Schedules — owned here so the tab can carry a real count.
  const [schedules, setSchedules] = React.useState<ScheduleRow[]>([]);
  const [loadingSchedules, setLoadingSchedules] = React.useState(true);

  // Same as v2: the device timezone. The partner row does carry an IANA
  // `timezone` column, but it is not selected by either auth query and so is
  // absent from the `Partner` type — reading it here would need a change to the
  // shared auth layer, which this screen does not own.
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  const refreshRecipients = React.useCallback(async () => {
    setLoadingRecipients(true);
    try {
      setRecipientCount(await countBroadcastRecipientsAction(audience));
    } catch {
      setRecipientCount(null);
    } finally {
      setLoadingRecipients(false);
    }
  }, [audience]);

  const loadSchedules = React.useCallback(async () => {
    setLoadingSchedules(true);
    try {
      setSchedules(await listScheduledNotificationsAction());
    } catch (err) {
      console.error("Failed to load schedules:", err);
      toast.error("Couldn't load your scheduled notifications.");
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  React.useEffect(() => {
    refreshRecipients();
  }, [refreshRecipients]);

  React.useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const titleTrimmed = title.trim();
  const bodyTrimmed = body.trim();

  const whenValid =
    when === "now"
      ? true
      : when === "schedule"
        ? !!scheduleAt
        : !!time && (frequency === "daily" || days.length > 0);

  const canSubmit =
    titleTrimmed.length > 0 && bodyTrimmed.length > 0 && whenValid && !submitting;

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const clearForm = () => {
    setTitle("");
    setBody("");
    setImageUrl("");
    setImageUrlDraft("");
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const filename = `notify-broadcasts/${Date.now()}-${file.name}`;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setImageUrl(await uploadFileToS3(dataUrl, filename));
      toast.success("Image uploaded.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
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
              : "None of your followers have notifications enabled yet.",
          );
        } else {
          toast.success(
            `Sent to ${res.recipients} device${res.recipients === 1 ? "" : "s"}.`,
          );
          clearForm();
          refreshRecipients();
        }
        return;
      }

      const payload: CreateScheduleInput = {
        title: titleTrimmed,
        body: bodyTrimmed,
        imageUrl,
        audience,
        timezone,
        scheduleType: when === "schedule" ? "once" : "recurring",
      };

      if (when === "schedule") {
        const d = new Date(scheduleAt);
        if (isNaN(d.getTime())) {
          toast.error("Pick a valid date and time.");
          return;
        }
        payload.scheduledAt = d.toISOString();
      } else {
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
        when === "schedule" ? "Scheduled." : "Recurring notification created.",
      );
      clearForm();
      await loadSchedules();
      setTab("scheduled");
    } catch (e: any) {
      console.error("Notify submit error:", e);
      toast.error(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendLabel =
    when === "now"
      ? "Send notification"
      : when === "schedule"
        ? "Schedule"
        : "Create recurring";

  const whenBadge =
    when === "now"
      ? "now"
      : when === "schedule"
        ? scheduleAt
          ? fmt(new Date(scheduleAt).toISOString())
          : "scheduled"
        : frequency === "daily"
          ? `daily · ${time}`
          : `weekly · ${time}`;

  const whenHint =
    when === "now"
      ? "Goes out to every reachable device the moment you send."
      : when === "schedule"
        ? "Queued — sends once at the time you pick (±1 min)."
        : `Runs ${frequency === "daily" ? "every day" : "on the selected days"} at ${time} (${timezone})${
            endDate ? ` until ${endDate}` : ", until you pause it"
          }.`;

  const sendHint =
    when === "now"
      ? "Sends immediately when you hit send."
      : when === "schedule"
        ? "Queued — sends once at the time you pick (±1 min)."
        : "Repeats on your chosen schedule until you pause it or it hits the end date.";

  const activeCount = schedules.filter((s) => s.status === "active").length;
  const completedCount = schedules.filter(
    (s) => s.status === "completed" || s.status === "cancelled",
  ).length;

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* -------------------------------------------------- tabs + reach */}
      <div className="flex flex-wrap items-center gap-2.5 px-3.5 lg:px-0">
        <Segmented<"compose" | "scheduled">
          value={tab}
          onChange={setTab}
          options={[
            { v: "compose", label: "Compose" },
            {
              v: "scheduled",
              label: (
                <>
                  Scheduled
                  {schedules.length > 0 ? (
                    <span className="ml-1.5 tabular-nums text-zinc-400 dark:text-zinc-500">
                      {schedules.length}
                    </span>
                  ) : null}
                </>
              ),
            },
          ]}
        />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-normal leading-none text-zinc-500 dark:text-zinc-400">
          <Users size={14} strokeWidth={1.8} />
          {loadingRecipients ? (
            <>
              <Loader2 size={12} className="animate-spin" /> counting…
            </>
          ) : recipientCount === null ? (
            <>reach unavailable</>
          ) : (
            <>
              {recipientCount} device{recipientCount === 1 ? "" : "s"} reachable
            </>
          )}
        </span>
      </div>

      {tab === "compose" ? (
        <div className="flex flex-wrap items-start gap-3.5">
          {/* ------------------------------------------------ Message card */}
          <V3Card className="min-w-0 flex-[1_1_400px]">
            <CardHead title="Message" badge="Title and message required" />
            <div className="flex flex-col gap-3.5 px-4 py-3.5">
              {/* Send to */}
              <div>
                <FieldLabel>Send to</FieldLabel>
                <div className="mt-[7px]">
                  <Segmented<Audience>
                    value={audience}
                    onChange={setAudience}
                    options={[
                      { v: "app", label: "All app users" },
                      { v: "followers", label: "Followers only" },
                    ]}
                  />
                </div>
                <div className="mt-[7px] text-xs font-normal leading-normal text-zinc-400 dark:text-zinc-500">
                  {AUDIENCE_HINT[audience]}
                </div>
              </div>

              {/* Title */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <FieldLabel right={`${title.length}/${TITLE_MAX}`}>Title</FieldLabel>
                <input
                  type="text"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Fresh batch of biryani at 1 PM"
                  className={`${INPUT_CLASS} mt-1.5`}
                />
              </div>

              {/* Message */}
              <div>
                <FieldLabel right={`${body.length}/${BODY_MAX}`}>Message</FieldLabel>
                <textarea
                  rows={3}
                  value={body}
                  maxLength={BODY_MAX}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Drop in this afternoon — limited plates."
                  className={`${INPUT_CLASS} mt-1.5 h-auto min-h-[76px] resize-y py-[9px] leading-[1.55]`}
                />
              </div>

              {/* Image */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                      Image
                    </div>
                    <div className="mt-0.5 text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                      Optional — Android and iOS show it inline.
                    </div>
                  </div>
                  <Segmented<"upload" | "url">
                    value={imageMode}
                    onChange={setImageMode}
                    options={[
                      { v: "upload", label: "Upload" },
                      { v: "url", label: "URL" },
                    ]}
                  />
                </div>

                {imageUrl ? (
                  <div className="relative mt-2.5 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Notification image"
                      className="h-32 w-auto max-w-full rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl("");
                        setImageUrlDraft("");
                      }}
                      aria-label="Remove image"
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ) : imageMode === "upload" ? (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="mt-2.5 flex w-full items-center gap-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-[18px] text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500">
                        {uploading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ImagePlus size={16} strokeWidth={1.8} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                          {uploading ? "Uploading…" : "Drop an image or browse"}
                        </span>
                        <span className="mt-[3px] block text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                          JPG or PNG · 2:1 crops best
                        </span>
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={imageUrlDraft}
                      onChange={(e) => setImageUrlDraft(e.target.value)}
                      placeholder="https://…"
                      className={`${INPUT_CLASS} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      disabled={!imageUrlDraft.trim()}
                      onClick={() => setImageUrl(imageUrlDraft.trim())}
                      className="h-9 flex-none rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Use
                    </button>
                  </div>
                )}
              </div>
            </div>
          </V3Card>

          {/* ------------------------------------- Delivery + Preview column */}
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
            <V3Card>
              <CardHead title="Delivery" />
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <Segmented<WhenMode>
                  value={when}
                  onChange={setWhen}
                  options={[
                    { v: "now", label: "Send now", icon: Send },
                    { v: "schedule", label: "Schedule", icon: Clock },
                    { v: "recurring", label: "Repeat", icon: Repeat },
                  ]}
                />

                {when === "schedule" && (
                  <div>
                    <div className="mb-[5px] text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                      Send at
                    </div>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      min={localNowString()}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                )}

                {when === "recurring" && (
                  <div className="flex flex-col gap-2.5">
                    <Segmented<Frequency>
                      value={frequency}
                      onChange={setFrequency}
                      options={[
                        { v: "daily", label: "Daily" },
                        { v: "weekly", label: "Weekly" },
                      ]}
                    />

                    {frequency === "weekly" && (
                      <div>
                        <div className="mb-[5px] text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                          On days
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {DOW.map((day) => {
                            const on = days.includes(day.d);
                            return (
                              <button
                                key={day.d}
                                type="button"
                                onClick={() => toggleDay(day.d)}
                                className={[
                                  "h-8 w-8 rounded-full border text-[12.5px] font-semibold leading-none transition-colors",
                                  on
                                    ? "border-zinc-900 dark:border-zinc-50 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700",
                                ].join(" ")}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-[9px]">
                      <div className="min-w-0 flex-[1_1_110px]">
                        <div className="mb-[5px] text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                          At
                        </div>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div className="min-w-0 flex-[1_1_110px]">
                        <div className="mb-[5px] text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                          Ends
                        </div>
                        <input
                          type="date"
                          value={endDate}
                          min={localNowString().slice(0, 10)}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-[7px]">
                  <Info
                    size={13}
                    strokeWidth={1.9}
                    className="mt-[1px] flex-none text-zinc-400 dark:text-zinc-500"
                  />
                  <span className="text-xs font-normal leading-normal text-zinc-400 dark:text-zinc-500">
                    {whenHint}
                  </span>
                </div>
              </div>
            </V3Card>

            {/* Preview */}
            <V3Card>
              <CardHead title="Preview" badge="Lock screen" />
              <div className="p-4">
                <div className="flex gap-[11px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3">
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50 text-[13px] font-semibold leading-none text-zinc-50 dark:text-zinc-900">
                    {(storeName || "M").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        translate="no"
                        className="notranslate min-w-0 flex-1 truncate text-[11.5px] font-semibold uppercase leading-none tracking-[0.02em] text-zinc-600 dark:text-zinc-300"
                      >
                        {storeName || "Menuthere"}
                      </span>
                      <span className="flex-none text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        {whenBadge}
                      </span>
                    </div>
                    <div className="mt-[3px] break-words text-[13.5px] font-semibold leading-snug text-zinc-950 dark:text-zinc-50">
                      {titleTrimmed || "Notification title"}
                    </div>
                    <div className="mt-0.5 whitespace-pre-line break-words text-[12.5px] font-normal leading-[1.5] text-zinc-600 dark:text-zinc-300">
                      {bodyTrimmed || "Your message text shows here."}
                    </div>
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt=""
                        className="mt-2 max-h-32 w-full rounded-md object-cover"
                      />
                    ) : null}
                  </div>
                </div>
                <div className="mt-2.5 text-xs font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
                  {sendHint}
                </div>
              </div>
              <div className="flex flex-wrap gap-[9px] px-4 pb-4">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className={[
                    "inline-flex h-10 flex-[1_1_160px] items-center justify-center gap-[7px] rounded-md border text-[13.5px] font-medium leading-none transition-colors",
                    canSubmit
                      ? "border-zinc-900 dark:border-zinc-50 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      : "cursor-not-allowed border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500",
                  ].join(" ")}
                >
                  {submitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : when === "now" ? (
                    <Send size={15} strokeWidth={1.9} />
                  ) : (
                    <Clock size={15} strokeWidth={1.9} />
                  )}
                  {submitting ? "Working…" : sendLabel}
                </button>
                <button
                  type="button"
                  onClick={clearForm}
                  className="inline-flex h-10 flex-none items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Clear
                </button>
              </div>
            </V3Card>
          </div>
        </div>
      ) : (
        <ScheduledPanel
          schedules={schedules}
          loading={loadingSchedules}
          activeCount={activeCount}
          completedCount={completedCount}
          onReload={loadSchedules}
          onCompose={() => setTab("compose")}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------- Scheduled panel */

const STATUS_STYLE: Record<
  ScheduleRow["status"],
  { pill: string; dot: string; label: string }
> = {
  active: {
    pill:
      "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400",
    dot: "bg-green-600",
    label: "Active",
  },
  paused: {
    pill:
      "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "Paused",
  },
  completed: {
    pill:
      "border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
    dot: "bg-zinc-400 dark:bg-zinc-500",
    label: "Completed",
  },
  cancelled: {
    pill:
      "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    label: "Cancelled",
  },
};

/**
 * The design's "Last 5 runs sent · 9 devices each" line. It is only written that
 * way when the recent runs really do agree; otherwise the real mix is spelled
 * out, and a schedule that has never fired says so rather than borrowing a
 * plausible-looking number.
 */
function runSummary(s: ScheduleRow): { tone: "ok" | "warn" | "bad"; text: string } {
  if (!s.runs.length) {
    return {
      tone: "warn",
      text: s.status === "active" ? "No runs yet." : "Never sent.",
    };
  }
  if (s.schedule_type === "once") {
    const r = s.runs[0];
    if (r.status === "sent")
      return {
        tone: "ok",
        text: `Sent ${fmt(r.created_at, s.timezone)} · ${r.recipients_count} device${
          r.recipients_count === 1 ? "" : "s"
        }`,
      };
    return {
      tone: r.status === "failed" ? "bad" : "warn",
      text: `${r.status === "failed" ? "Failed" : "Skipped"} ${fmt(
        r.created_at,
        s.timezone,
      )}${r.error ? ` — ${r.error}` : ""}`,
    };
  }

  const recent = s.runs.slice(0, 5);
  const sent = recent.filter((r) => r.status === "sent");
  const failed = recent.filter((r) => r.status === "failed").length;

  if (sent.length === recent.length) {
    const counts = new Set(sent.map((r) => r.recipients_count));
    const each =
      counts.size === 1
        ? ` · ${[...counts][0]} device${[...counts][0] === 1 ? "" : "s"} each`
        : "";
    return {
      tone: "ok",
      text: `Last ${recent.length} run${recent.length === 1 ? "" : "s"} sent${each}`,
    };
  }
  return {
    tone: failed > 0 ? "bad" : "warn",
    text: `${sent.length} of last ${recent.length} runs sent${
      failed > 0 ? ` · ${failed} failed` : ""
    }`,
  };
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-[5px]">
      <span className="text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <span className="text-[12.5px] font-medium leading-none tabular-nums text-zinc-700 dark:text-zinc-300">
        {value}
      </span>
    </span>
  );
}

function ScheduledPanel({
  schedules,
  loading,
  activeCount,
  completedCount,
  onReload,
  onCompose,
}: {
  schedules: ScheduleRow[];
  loading: boolean;
  activeCount: number;
  completedCount: number;
  onReload: () => Promise<void> | void;
  onCompose: () => void;
}) {
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<ScheduleRow | null>(null);

  const runAction = async (
    id: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    setBusyId(id);
    try {
      const res = await fn();
      if (res.ok) {
        toast.success(okMsg);
        await onReload();
      } else {
        toast.error(res.error || "Action failed.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <V3Card>
        <CardHead
          title="Scheduled & repeating"
          badge={
            loading
              ? "loading…"
              : schedules.length === 0
                ? "none yet"
                : `${activeCount} active · ${completedCount} completed`
          }
        />

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-zinc-500 dark:text-zinc-400">
            <Loader2 size={16} className="animate-spin" /> Loading schedules…
          </div>
        ) : schedules.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Clock
              size={26}
              strokeWidth={1.5}
              className="mx-auto text-zinc-300 dark:text-zinc-600"
            />
            <div className="mt-3 text-[13.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
              No scheduled notifications yet
            </div>
            <div className="mt-1.5 text-[12.5px] leading-normal text-zinc-500 dark:text-zinc-400">
              Compose a message and pick Schedule or Repeat to queue one.
            </div>
          </div>
        ) : (
          schedules.map((s) => {
            const isRecurring = s.schedule_type === "recurring";
            const isClosed =
              s.status === "completed" || s.status === "cancelled";
            const busy = busyId === s.id;
            const st = STATUS_STYLE[s.status];
            const summary = runSummary(s);
            const Icon = isRecurring ? Repeat : Clock;

            return (
              <div
                key={s.id}
                className="border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5 last:border-b-0"
              >
                <div className="flex flex-wrap items-start gap-3 gap-y-2.5">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    <Icon size={15} strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="flex flex-wrap items-center gap-2 gap-y-[5px]">
                      <span
                        translate="no"
                        className="notranslate text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                      >
                        {s.title}
                      </span>
                      <span
                        className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none ${st.pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>

                    <div
                      translate="no"
                      className="notranslate mt-1 line-clamp-2 text-[12.5px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400"
                    >
                      {s.body}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-[14px] gap-y-1">
                      <Meta
                        label="Schedule"
                        value={
                          isRecurring
                            ? s.description
                            : `Once · ${fmt(s.scheduled_at, s.timezone)}`
                        }
                      />
                      <Meta
                        label="Next"
                        value={isClosed ? "—" : fmt(s.next_run_at, s.timezone)}
                      />
                      <Meta label="Sent" value={`${s.run_count}×`} />
                      <span className="inline-flex items-center gap-[5px] text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        <Users size={12} strokeWidth={1.9} />
                        {s.audience === "app" ? "All app users" : "Followers"}
                      </span>
                    </div>

                    <div className="mt-[9px] flex items-center gap-[7px]">
                      <span
                        className={[
                          "flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full text-white",
                          summary.tone === "ok"
                            ? "bg-green-600"
                            : summary.tone === "bad"
                              ? "bg-red-500"
                              : "bg-amber-500",
                        ].join(" ")}
                      >
                        {summary.tone === "ok" ? (
                          <CheckCircle2 size={10} strokeWidth={2.6} />
                        ) : summary.tone === "bad" ? (
                          <XCircle size={10} strokeWidth={2.6} />
                        ) : (
                          <AlertCircle size={10} strokeWidth={2.6} />
                        )}
                      </span>
                      <span className="min-w-0 truncate text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        {summary.text}
                      </span>
                    </div>
                  </div>

                  <div className="ml-auto flex flex-none items-center gap-[7px]">
                    {s.status === "active" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            s.id,
                            () => setScheduleStatusAction(s.id, "pause"),
                            "Paused.",
                          )
                        }
                        className="inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Pause size={13} strokeWidth={1.9} />
                        )}
                        Pause
                      </button>
                    )}
                    {s.status === "paused" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            s.id,
                            () => setScheduleStatusAction(s.id, "resume"),
                            "Resumed.",
                          )
                        }
                        className="inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Play size={13} strokeWidth={1.9} />
                        )}
                        Resume
                      </button>
                    )}
                    {!isClosed && (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Edit schedule"
                        onClick={() => setEditing(s)}
                        className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                      >
                        <Pencil size={13} strokeWidth={1.9} />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="Delete schedule"
                      onClick={async () => {
                        if (
                          !(await confirmDialog({
                            title: "Delete this scheduled notification?",
                            description: "This can't be undone.",
                            confirmText: "Delete",
                            destructive: true,
                          }))
                        )
                          return;
                        runAction(
                          s.id,
                          () => deleteScheduledNotificationAction(s.id),
                          "Deleted.",
                        );
                      }}
                      className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 transition-colors hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={13} strokeWidth={1.9} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="flex flex-wrap items-center gap-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3 lg:rounded-b-xl">
          <span className="text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
            Repeating pushes keep running until you pause them.
          </span>
          <button
            type="button"
            onClick={onCompose}
            className="ml-auto text-[12.5px] font-medium leading-none text-zinc-600 dark:text-zinc-300 underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            Compose a new one
          </button>
        </div>
      </V3Card>

      <EditScheduleDialog
        schedule={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          onReload();
        }}
      />
    </>
  );
}
