"use client";

import * as React from "react";
import { ChevronRight, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import VideoEditor from "@/components/VideoEditor";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { cn } from "@/lib/utils";

import { AdminV3Button, StatusPill } from "../ui/primitives";
import {
  BROADCAST_CUSTOMERS_QUERY,
  DAILY_LIMIT,
  FORM_LABEL,
  INPUT,
  bodyText,
  bodyVarIndices,
  correctRecipientPhone,
  headerHasVar,
  headerMediaType,
  toLocalInput,
  type ParsedRecipient,
  type PhoneCorrection,
  type TemplateRow,
  type VarMapItem,
  type VarSource,
  type WaNumber,
} from "./shared";

type RecipientTab = "manual" | "customers" | "excel";

const TABS: { key: RecipientTab; label: string }[] = [
  { key: "manual", label: "Enter manually" },
  { key: "customers", label: "My customers" },
  { key: "excel", label: "Upload Excel" },
];

/**
 * "New broadcast" — template, variables, recipients, schedule.
 *
 * A faithful port of admin-v2's creator: identical validation, identical daily
 * cap arithmetic (Meta tier minus what has already gone out today) and the same
 * POST body to `/api/whatsapp/broadcasts`.
 */
export function BroadcastCreatorDialog({
  open,
  onOpenChange,
  partnerId,
  templates,
  numbers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partnerId: string | undefined;
  templates: TemplateRow[];
  numbers: WaNumber[];
  onCreated: () => void;
}) {
  const [templateId, setTemplateId] = React.useState("");
  const [sendFromPhoneNumberId, setSendFromPhoneNumberId] = React.useState("");
  const [varMap, setVarMap] = React.useState<VarMapItem[]>([]);
  const [headerValue, setHeaderValue] = React.useState("");
  const [manualText, setManualText] = React.useState("");
  const [excelRecipients, setExcelRecipients] = React.useState<
    ParsedRecipient[] | null
  >(null);
  const [excelFileName, setExcelFileName] = React.useState("");
  const [tab, setTab] = React.useState<RecipientTab>("manual");
  const [scheduleMode, setScheduleMode] = React.useState<"now" | "later">("now");
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [headerMediaUrl, setHeaderMediaUrl] = React.useState("");
  const [uploadingMedia, setUploadingMedia] = React.useState(false);
  const [videoFileForEditor, setVideoFileForEditor] = React.useState<File | null>(
    null,
  );
  const [showVideoEditor, setShowVideoEditor] = React.useState(false);
  const [customers, setCustomers] = React.useState<ParsedRecipient[]>([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [selectedCustomerPhones, setSelectedCustomerPhones] = React.useState<
    Set<string>
  >(new Set());
  const [limitInfo, setLimitInfo] = React.useState<{
    dailyLimit: number;
    remaining: number;
  } | null>(null);
  const [correctionReview, setCorrectionReview] = React.useState<
    PhoneCorrection[] | null
  >(null);

  const applyMedia = async (getUrl: () => Promise<string>) => {
    setUploadingMedia(true);
    try {
      setHeaderMediaUrl(await getUrl());
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
      setHeaderMediaUrl("");
    } finally {
      setUploadingMedia(false);
    }
  };

  const template = React.useMemo(
    () => templates.find((t) => t.id === templateId),
    [templateId, templates],
  );
  const varIndices = React.useMemo(
    () => (template ? bodyVarIndices(template.components) : []),
    [template],
  );
  const hasHeaderVar = React.useMemo(
    () => (template ? headerHasVar(template.components) : false),
    [template],
  );
  const mediaHeaderType = React.useMemo(
    () => (template ? headerMediaType(template.components) : null),
    [template],
  );

  const reset = () => {
    setTemplateId("");
    setSendFromPhoneNumberId("");
    setVarMap([]);
    setHeaderValue("");
    setManualText("");
    setExcelRecipients(null);
    setExcelFileName("");
    setTab("manual");
    setScheduleMode("now");
    setScheduleAt("");
    setHeaderMediaUrl("");
    setUploadingMedia(false);
    setVideoFileForEditor(null);
    setShowVideoEditor(false);
    setCustomers([]);
    setSelectedCustomerPhones(new Set());
    setLimitInfo(null);
    setCorrectionReview(null);
  };

  // Seed the variable map when the template changes: {{1}} → phone, {{2}} →
  // name, the rest → a fixed value.
  React.useEffect(() => {
    if (!template) {
      setVarMap([]);
      return;
    }
    setVarMap(
      varIndices.map((_, i) =>
        i === 0
          ? { source: "phone" as VarSource }
          : i === 1
            ? { source: "name" as VarSource }
            : { source: "fixed" as VarSource, value: "" },
      ),
    );
    setHeaderValue("");
    setHeaderMediaUrl("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Load the partner's customers (from orders) the first time the tab is opened.
  React.useEffect(() => {
    if (tab !== "customers" || !partnerId || customers.length || loadingCustomers) {
      return;
    }
    setLoadingCustomers(true);
    fetchFromHasura(BROADCAST_CUSTOMERS_QUERY, { partner_id: partnerId })
      .then((data: any) => {
        const seen = new Set<string>();
        const list: ParsedRecipient[] = [];
        for (const o of data?.orders || []) {
          const phone = String(o?.phone || o?.user?.phone || "").trim();
          const digits = phone.replace(/[\s\-+()]/g, "");
          if (digits.length < 10 || seen.has(digits)) continue;
          seen.add(digits);
          list.push({ phone, name: String(o?.user?.full_name || "").trim() });
        }
        setCustomers(list);
        setSelectedCustomerPhones(new Set(list.map((c) => c.phone)));
      })
      .catch(() => toast.error("Couldn't load customers"))
      .finally(() => setLoadingCustomers(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, partnerId]);

  // Default the "send from" number to the partner's primary when opened.
  React.useEffect(() => {
    if (!open || sendFromPhoneNumberId || numbers.length === 0) return;
    const primary = numbers.find((n) => n.is_primary) || numbers[0];
    if (primary) setSendFromPhoneNumberId(primary.phone_number_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, numbers]);

  // Read the live daily cap (Meta tier) + today's usage for the SELECTED number
  // — Meta's limit is per-number, so the cap must track the sender.
  React.useEffect(() => {
    if (!open || !partnerId) return;
    setLimitInfo(null);
    const q = sendFromPhoneNumberId
      ? `?partnerId=${partnerId}&phoneNumberId=${encodeURIComponent(sendFromPhoneNumberId)}`
      : `?partnerId=${partnerId}`;
    fetch(`/api/whatsapp/meta/phone-quality${q}`)
      .then((r) => r.json())
      .then((d) => {
        const u = d?.usage;
        if (u) {
          const dailyLimit = Number(u.dailyLimit) || DAILY_LIMIT;
          const remaining = Number.isFinite(Number(u.remaining))
            ? Number(u.remaining)
            : dailyLimit;
          setLimitInfo({ dailyLimit, remaining });
        }
      })
      .catch(() => {
        /* fall back to the default cap below */
      });
  }, [open, partnerId, sendFromPhoneNumberId]);

  // A scheduled-for-later send gets the full daily tier (it runs on a future
  // day); a send-now is bounded by what is left today.
  const dailyLimit = limitInfo?.dailyLimit ?? DAILY_LIMIT;
  const remainingToday = limitInfo?.remaining ?? DAILY_LIMIT;
  const cap = scheduleMode === "later" ? dailyLimit : remainingToday;
  const capLabel = cap >= 1_000_000 ? "unlimited" : cap.toLocaleString();

  // Keep the customer selection inside the cap — trims the later picks whenever
  // the cap shrinks (tier loads, or "later" switches back to "now").
  React.useEffect(() => {
    setSelectedCustomerPhones((prev) => {
      if (prev.size <= cap) return prev;
      const kept = new Set<string>();
      for (const c of customers) {
        if (prev.has(c.phone)) {
          kept.add(c.phone);
          if (kept.size >= cap) break;
        }
      }
      return kept;
    });
  }, [cap, customers]);

  // One recipient per line, "phone[,name]" (comma or tab separated).
  const manualRecipients = React.useMemo<ParsedRecipient[]>(
    () =>
      manualText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(/[,\t]/).map((p) => p.trim());
          return { phone: parts[0] || "", name: parts[1] || "" };
        })
        .filter((r) => r.phone),
    [manualText],
  );

  const rawRecipients =
    tab === "excel"
      ? excelRecipients || []
      : tab === "customers"
        ? customers.filter((c) => selectedCustomerPhones.has(c.phone))
        : manualRecipients;

  const { valid, invalidCount, dupCount } = React.useMemo(() => {
    const seen = new Set<string>();
    let invalid = 0;
    let dup = 0;
    const out: ParsedRecipient[] = [];
    for (const r of rawRecipients) {
      const digits = (r.phone || "").replace(/[\s\-+()]/g, "");
      if (digits.length < 10) {
        invalid++;
        continue;
      }
      if (seen.has(digits)) {
        dup++;
        continue;
      }
      seen.add(digits);
      out.push(r);
    }
    return { valid: out, invalidCount: invalid, dupCount: dup };
  }, [rawRecipients]);

  const handleExcel = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
      });
      if (!rows.length) {
        toast.error("That sheet looks empty.");
        return;
      }
      let phoneCol = 0;
      let nameCol = 1;
      let startRow = 0;
      const first = rows[0].map((c) => String(c ?? "").toLowerCase().trim());
      const looksLikeHeader = first.some(
        (c) =>
          c.includes("phone") ||
          c.includes("mobile") ||
          c.includes("number") ||
          c === "name",
      );
      if (looksLikeHeader) {
        startRow = 1;
        const pIdx = first.findIndex(
          (c) =>
            c.includes("phone") || c.includes("mobile") || c.includes("number"),
        );
        const nIdx = first.findIndex((c) => c.includes("name"));
        if (pIdx >= 0) phoneCol = pIdx;
        if (nIdx >= 0) nameCol = nIdx;
      }
      const parsed: ParsedRecipient[] = [];
      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i] || [];
        const phone = String(row[phoneCol] ?? "").trim();
        const name = String(row[nameCol] ?? "").trim();
        if (phone) parsed.push({ phone, name });
      }
      if (!parsed.length) {
        toast.error(
          "No phone numbers found. Expected a 'phone' column (and optional 'name').",
        );
        return;
      }
      setExcelRecipients(parsed);
      setExcelFileName(file.name);
      toast.success(`Loaded ${parsed.length} rows from ${file.name}`);
    } catch (e) {
      console.error("Excel parse failed:", e);
      toast.error(
        "Couldn't read that file. Use .xlsx or .csv with phone + name columns.",
      );
    }
  };

  const previewText = React.useMemo(() => {
    if (!template) return "";
    let text = bodyText(template.components);
    const sample = valid[0];
    varIndices.forEach((n, i) => {
      const m = varMap[i];
      let v = `{{${n}}}`;
      if (m?.source === "phone") v = sample?.phone || "phone";
      else if (m?.source === "name") v = sample?.name || "name";
      else if (m?.source === "fixed") v = m.value || `{{${n}}}`;
      text = text.replace(new RegExp(`\\{\\{${n}\\}\\}`, "g"), v);
    });
    return text;
  }, [template, varIndices, varMap, valid]);

  const canSubmit =
    !!partnerId &&
    !!template &&
    valid.length > 0 &&
    valid.length <= cap &&
    varMap.every((m) => m.source !== "fixed" || (m.value ?? "").trim().length > 0) &&
    (!hasHeaderVar || headerValue.trim().length > 0) &&
    (!mediaHeaderType || headerMediaUrl.trim().length > 0) &&
    !uploadingMedia &&
    (scheduleMode === "now" || scheduleAt.trim().length > 0);

  // Auto-correct number formats first, show the owner exactly what changed (and
  // anything that can't be fixed), then send. Nothing to fix → straight through.
  const handleSend = () => {
    if (!canSubmit || !template) return;
    const corrections = valid.map(correctRecipientPhone);
    const needsReview = corrections.some((c) => c.changed || !c.valid);
    if (needsReview) {
      setCorrectionReview(corrections);
      return;
    }
    doSubmit(
      corrections
        .filter((c) => c.valid)
        .map((c) => ({ phone: c.corrected, name: c.name })),
    );
  };

  const doSubmit = async (recipientsToSend: ParsedRecipient[]) => {
    if (!template || recipientsToSend.length === 0) return;
    setSubmitting(true);
    try {
      const scheduledAt =
        scheduleMode === "later" && scheduleAt
          ? new Date(scheduleAt).toISOString()
          : null;
      const res = await fetch("/api/whatsapp/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          templateId: template.id,
          scheduledAt,
          variableMap: varMap,
          headerParams: hasHeaderVar ? [headerValue.trim()] : null,
          headerMediaUrl: mediaHeaderType ? headerMediaUrl : null,
          recipients: recipientsToSend,
          sendFromPhoneNumberId: sendFromPhoneNumberId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create broadcast");
      toast.success(
        scheduledAt
          ? `Broadcast scheduled for ${data.total_recipients} recipients`
          : `Broadcast queued for ${data.total_recipients} recipients`,
      );
      setCorrectionReview(null);
      reset();
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  const segOn =
    "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50";
  const segOff =
    "border border-transparent bg-transparent font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            New broadcast
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            Pick an approved template, choose who receives it, and send now or
            schedule for later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Send-from number — only when more than one is connected */}
          {numbers.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className={FORM_LABEL}>Send from</label>
              <select
                className={INPUT}
                value={sendFromPhoneNumberId}
                onChange={(e) => setSendFromPhoneNumberId(e.target.value)}
              >
                {numbers.map((n) => (
                  <option key={n.phone_number_id} value={n.phone_number_id}>
                    {n.display_phone || n.phone_number_id}
                    {n.is_primary ? " · default" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                Recipients see this number as the sender. Its own daily limit
                applies.
              </p>
            </div>
          )}

          {/* Template */}
          <div className="flex flex-col gap-1.5">
            <label className={FORM_LABEL}>Template</label>
            {templates.length === 0 ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[12.5px] leading-[1.5] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                No approved <b>Marketing</b> templates yet. Create one (category
                Marketing) in <b>Templates</b> and wait for Meta approval, then
                come back here.
              </div>
            ) : (
              <select
                className={INPUT}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Select an approved template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.language} ·{" "}
                    {t.category === "MARKETING" ? "Marketing" : t.category}
                  </option>
                ))}
              </select>
            )}
          </div>

          {template && (
            <>
              {/* Live preview */}
              <div className="rounded-lg border border-zinc-200 bg-[#e5ddd5] p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <div
                  className="max-w-[90%] whitespace-pre-wrap rounded-lg bg-white p-3 text-[13px] leading-[1.5] text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                  translate="no"
                >
                  {previewText}
                </div>
              </div>

              {hasHeaderVar && (
                <div className="flex flex-col gap-1.5">
                  <label className={FORM_LABEL}>Header value</label>
                  <input
                    className={INPUT}
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder="Value for the header {{1}}"
                  />
                </div>
              )}

              {mediaHeaderType && (
                <div className="flex flex-col gap-1.5">
                  <label className={cn(FORM_LABEL, "capitalize")}>
                    Header {mediaHeaderType}
                  </label>
                  {mediaHeaderType === "image" && (
                    <ImageUpload
                      value={headerMediaUrl}
                      onChange={(url) => setHeaderMediaUrl(url)}
                      label=""
                      folder="wa-broadcast"
                    />
                  )}
                  {mediaHeaderType === "video" && (
                    <div className="flex flex-col gap-2">
                      {headerMediaUrl && (
                        <video
                          src={headerMediaUrl}
                          controls
                          className="w-full max-w-xs rounded-md border border-zinc-200 dark:border-zinc-700"
                        />
                      )}
                      <input
                        type="file"
                        accept="video/mp4,video/*"
                        className={cn(INPUT, "py-1.5")}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setVideoFileForEditor(f);
                            setShowVideoEditor(true);
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  {mediaHeaderType === "document" && (
                    <div className="flex flex-col gap-2">
                      {headerMediaUrl && (
                        <a
                          href={headerMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                        >
                          Uploaded document
                        </a>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className={cn(INPUT, "py-1.5")}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            void applyMedia(
                              () => uploadFileToS3(f, f.name) as Promise<string>,
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  {uploadingMedia && (
                    <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                      Uploading…
                    </p>
                  )}
                  {showVideoEditor && videoFileForEditor && (
                    <VideoEditor
                      isOpen={showVideoEditor}
                      videoFile={videoFileForEditor}
                      onClose={() => {
                        setShowVideoEditor(false);
                        setVideoFileForEditor(null);
                      }}
                      onComplete={(blob) => {
                        setShowVideoEditor(false);
                        setVideoFileForEditor(null);
                        void applyMedia(
                          () =>
                            uploadFileToS3(
                              blob,
                              `wa-broadcast-${Date.now()}.mp4`,
                            ) as Promise<string>,
                        );
                      }}
                    />
                  )}
                </div>
              )}

              {/* Variable mapping */}
              {varIndices.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div>
                    <label className={FORM_LABEL}>Message variables</label>
                    <p className="mt-1 text-[11.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                      Choose what fills each placeholder for every recipient.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {varIndices.map((n, i) => (
                      <div key={n} className="flex flex-wrap items-center gap-2">
                        <code className="w-12 shrink-0 font-mono text-[12px] text-zinc-500 dark:text-zinc-400">
                          {`{{${n}}}`}
                        </code>
                        <select
                          className={cn(INPUT, "w-40 shrink-0")}
                          value={varMap[i]?.source || "fixed"}
                          onChange={(e) =>
                            setVarMap((m) =>
                              m.map((x, idx) =>
                                idx === i
                                  ? { ...x, source: e.target.value as VarSource }
                                  : x,
                              ),
                            )
                          }
                        >
                          <option value="phone">Recipient phone</option>
                          <option value="name">Recipient name</option>
                          <option value="fixed">Fixed value</option>
                        </select>
                        {varMap[i]?.source === "fixed" && (
                          <input
                            className={cn(INPUT, "min-w-0 flex-1")}
                            value={varMap[i]?.value || ""}
                            onChange={(e) =>
                              setVarMap((m) =>
                                m.map((x, idx) =>
                                  idx === i ? { ...x, value: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder={`Value for {{${n}}}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipients */}
              <div className="flex flex-col gap-2">
                <label className={FORM_LABEL}>Recipients</label>

                <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "h-[30px] flex-1 rounded-md px-3 text-[12.5px] leading-none transition-colors",
                        tab === t.key ? segOn : segOff,
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === "manual" && (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      rows={6}
                      placeholder={
                        "One per line:\n9876543210, Asha\n9123456780, Ravi\n9000000000"
                      }
                      className={cn(
                        INPUT,
                        "h-auto resize-y py-2 font-mono text-[12.5px] leading-[1.6]",
                      )}
                    />
                    <p className="text-[11.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                      Format: <code>phone, name</code> — name optional, phone
                      required.
                    </p>
                  </div>
                )}

                {tab === "customers" && (
                  <div className="flex flex-col gap-2">
                    {loadingCustomers ? (
                      <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                        Loading customers…
                      </p>
                    ) : customers.length === 0 ? (
                      <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                        No customers found from your orders yet.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                            {selectedCustomerPhones.size}/{customers.length}{" "}
                            selected
                            {customers.length > cap && (
                              <span className="text-amber-700 dark:text-amber-400">
                                {" "}
                                · max {capLabel}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className="text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                            onClick={() =>
                              setSelectedCustomerPhones(
                                selectedCustomerPhones.size >=
                                  Math.min(cap, customers.length)
                                  ? new Set()
                                  : new Set(
                                      customers.slice(0, cap).map((c) => c.phone),
                                    ),
                              )
                            }
                          >
                            {selectedCustomerPhones.size >=
                            Math.min(cap, customers.length)
                              ? "Clear all"
                              : `Select all (max ${capLabel})`}
                          </button>
                        </div>
                        <div className="max-h-48 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                          {customers.map((c) => (
                            <label
                              key={c.phone}
                              className="flex items-center gap-2 px-2 py-1.5 text-[12.5px] leading-none"
                            >
                              <input
                                type="checkbox"
                                className="accent-zinc-900 dark:accent-zinc-100"
                                checked={selectedCustomerPhones.has(c.phone)}
                                onChange={(e) =>
                                  setSelectedCustomerPhones((prev) => {
                                    if (e.target.checked && prev.size >= cap) {
                                      toast.error(
                                        `You can send to at most ${capLabel} ${
                                          scheduleMode === "later"
                                            ? "per day on your plan"
                                            : "today (daily limit minus what's already sent)"
                                        }.`,
                                      );
                                      return prev;
                                    }
                                    const n = new Set(prev);
                                    if (e.target.checked) n.add(c.phone);
                                    else n.delete(c.phone);
                                    return n;
                                  })
                                }
                              />
                              <span
                                className="font-mono text-[11.5px] text-zinc-950 dark:text-zinc-50"
                                translate="no"
                              >
                                {c.phone}
                              </span>
                              {c.name && (
                                <span
                                  className="truncate text-zinc-500 dark:text-zinc-400"
                                  translate="no"
                                >
                                  {c.name}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {tab === "excel" && (
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleExcel(f);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminV3Button
                        type="button"
                        variant="small"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload size={14} strokeWidth={1.8} /> Choose .xlsx / .csv
                      </AdminV3Button>
                      {excelFileName && (
                        <span className="flex items-center gap-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                          {excelFileName}
                          <button
                            type="button"
                            aria-label="Remove file"
                            onClick={() => {
                              setExcelRecipients(null);
                              setExcelFileName("");
                            }}
                          >
                            <X size={13} strokeWidth={1.9} />
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                      Columns: <b>phone</b> (required) and <b>name</b> (optional).
                      Header row auto-detected; otherwise column 1 = phone, column
                      2 = name.
                    </p>
                  </div>
                )}

                {/* Recipient summary */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="outline">
                    {valid.length} valid recipient{valid.length === 1 ? "" : "s"}
                  </StatusPill>
                  {invalidCount > 0 && (
                    <StatusPill tone="amber">
                      {invalidCount} skipped (bad number)
                    </StatusPill>
                  )}
                  {dupCount > 0 && (
                    <StatusPill tone="neutral">
                      {dupCount} duplicate{dupCount === 1 ? "" : "s"} removed
                    </StatusPill>
                  )}
                  <StatusPill tone="neutral">
                    Limit: {capLabel}
                    {scheduleMode === "later" ? "/day" : " left today"}
                  </StatusPill>
                  {valid.length > cap && (
                    <span className="text-[11.5px] text-red-600 dark:text-red-400">
                      Over your limit — remove{" "}
                      {(valid.length - cap).toLocaleString()}. You can send at most{" "}
                      {capLabel} {scheduleMode === "later" ? "per day" : "today"}.
                    </span>
                  )}
                  {cap <= 0 && (
                    <span className="text-[11.5px] text-red-600 dark:text-red-400">
                      Daily limit already reached — schedule for later or try again
                      tomorrow.
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="flex flex-col gap-2">
                <label className={FORM_LABEL}>When to send</label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] leading-none text-zinc-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      className="accent-zinc-900 dark:accent-zinc-100"
                      checked={scheduleMode === "now"}
                      onChange={() => setScheduleMode("now")}
                    />
                    Send now
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] leading-none text-zinc-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      className="accent-zinc-900 dark:accent-zinc-100"
                      checked={scheduleMode === "later"}
                      onChange={() => {
                        setScheduleMode("later");
                        // ~15 min out, so the field is never empty or in the past.
                        if (!scheduleAt) {
                          setScheduleAt(
                            toLocalInput(new Date(Date.now() + 15 * 60 * 1000)),
                          );
                        }
                      }}
                    />
                    Schedule for later
                  </label>
                  {scheduleMode === "later" && (
                    <input
                      type="datetime-local"
                      className={cn(INPUT, "w-auto")}
                      value={scheduleAt}
                      min={toLocalInput(new Date(Date.now() + 60 * 1000))}
                      onChange={(e) => setScheduleAt(e.target.value)}
                    />
                  )}
                </div>
                {scheduleMode === "later" && (
                  <p className="text-[11.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                    Sends at this date &amp; time in your local timezone (
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}); it may
                    fire up to a minute later. You can cancel any time before it
                    starts.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <AdminV3Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </AdminV3Button>
          <AdminV3Button
            variant="primary"
            onClick={handleSend}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Creating…
              </>
            ) : scheduleMode === "later" ? (
              "Schedule broadcast"
            ) : (
              `Send to ${valid.length || ""} now`
            )}
          </AdminV3Button>
        </DialogFooter>
      </DialogContent>

      <PhoneCorrectionDialog
        corrections={correctionReview}
        submitting={submitting}
        scheduleLater={scheduleMode === "later"}
        onCancel={() => setCorrectionReview(null)}
        onConfirm={(recipients) => doSubmit(recipients)}
      />
    </Dialog>
  );
}

/**
 * Review step: every number whose format was auto-corrected (original →
 * corrected) plus any that couldn't be validated, so the owner sees exactly
 * what will be sent before the broadcast starts.
 */
function PhoneCorrectionDialog({
  corrections,
  submitting,
  scheduleLater,
  onCancel,
  onConfirm,
}: {
  corrections: PhoneCorrection[] | null;
  submitting: boolean;
  scheduleLater: boolean;
  onCancel: () => void;
  onConfirm: (recipients: ParsedRecipient[]) => void;
}) {
  const open = !!corrections;
  const list = corrections || [];
  const changed = list.filter((c) => c.valid && c.changed);
  const invalid = list.filter((c) => !c.valid);
  const sendable = list.filter((c) => c.valid);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Review number corrections
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            We tidied up some numbers before sending. {sendable.length} will be
            sent
            {invalid.length > 0 &&
              `, ${invalid.length} can't be fixed and will be skipped`}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {changed.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">
                Corrected ({changed.length})
              </div>
              <div className="max-h-48 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {changed.map((c, i) => (
                  <div
                    key={`${c.original}-${i}`}
                    className="flex items-center gap-2 px-2 py-1.5 text-[11.5px] leading-none"
                    translate="no"
                  >
                    <span className="font-mono text-zinc-400 line-through dark:text-zinc-500">
                      {c.original}
                    </span>
                    <ChevronRight
                      size={12}
                      className="text-zinc-400 dark:text-zinc-500"
                    />
                    <span className="font-mono text-green-700 dark:text-green-400">
                      {c.corrected}
                    </span>
                    {c.name && (
                      <span className="truncate text-zinc-500 dark:text-zinc-400">
                        {c.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {invalid.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[11.5px] font-medium text-red-600 dark:text-red-400">
                Can&apos;t be fixed — will be skipped ({invalid.length})
              </div>
              <div className="max-h-40 divide-y divide-red-100 overflow-y-auto rounded-md border border-red-200 dark:divide-red-950 dark:border-red-900">
                {invalid.map((c, i) => (
                  <div
                    key={`${c.original}-${i}`}
                    className="flex items-center gap-2 px-2 py-1.5 text-[11.5px] leading-none"
                  >
                    <span
                      className="font-mono text-red-700 dark:text-red-400"
                      translate="no"
                    >
                      {c.original || "(empty)"}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      not a valid phone number
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <AdminV3Button
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Back
          </AdminV3Button>
          <AdminV3Button
            variant="primary"
            onClick={() =>
              onConfirm(
                sendable.map((c) => ({ phone: c.corrected, name: c.name })),
              )
            }
            disabled={submitting || sendable.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Creating…
              </>
            ) : scheduleLater ? (
              `Schedule ${sendable.length}`
            ) : (
              `Send ${sendable.length} now`
            )}
          </AdminV3Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
