"use client";

import * as React from "react";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import VideoEditor from "@/components/VideoEditor";

import { AdminV3Button } from "../ui/primitives";
import {
  CATEGORIES,
  DEFAULT_FOOTER,
  LANGUAGES,
  previewText,
  variableCount,
  type ButtonDraft,
  type ButtonKind,
  type HeaderFormat,
  type TemplateRow,
} from "./shared";

/**
 * Create / edit a WhatsApp message template.
 *
 * A straight port of admin-v2's `TemplateEditorView`: same state, same
 * validation, same `buildComponents()` payload, same POST/PATCH endpoints. Only
 * the chrome is v3 (sticky sub-view header, zinc palette, plain fields instead
 * of shadcn) — the design file has no editor screen of its own, so this follows
 * the sub-view shape the rest of v3 uses.
 */

/* --------------------------------------------------------------- field kit */

const FIELD_BASE =
  "w-full rounded-md border border-zinc-200 bg-white text-zinc-950 outline-none placeholder:text-zinc-400 " +
  "focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 " +
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 " +
  "dark:focus:border-zinc-500 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500";

function Field({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(FIELD_BASE, "h-9 px-3 text-[13.5px] font-normal leading-none", className)}
      {...props}
    />
  );
}

function AreaField({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        FIELD_BASE,
        "min-h-[104px] resize-y px-3 py-2.5 text-[13.5px] font-normal leading-[1.5]",
        className,
      )}
      {...props}
    />
  );
}

function SelectField({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(FIELD_BASE, "h-9 px-2.5 text-[13.5px] font-normal leading-none", className)}
      {...props}
    >
      {children}
    </select>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
      {children}
    </span>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------- view */

export function TemplateEditorView({
  partnerId,
  phoneNumberId,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  partnerId: string | undefined;
  phoneNumberId?: string;
  mode: "create" | "edit";
  initial?: TemplateRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit";
  const [name, setName] = React.useState("");
  const [language, setLanguage] = React.useState("en_US");
  const [category, setCategory] = React.useState<
    "UTILITY" | "MARKETING" | "AUTHENTICATION"
  >("UTILITY");
  const [headerFormat, setHeaderFormat] = React.useState<HeaderFormat>("NONE");
  const [headerText, setHeaderText] = React.useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = React.useState("");
  // Meta Resumable-Upload handle for a media header — required by template
  // create (a raw URL is rejected). Resolved when the partner picks media.
  const [headerMediaHandle, setHeaderMediaHandle] = React.useState("");
  const [uploadingMedia, setUploadingMedia] = React.useState(false);
  const [videoFileForEditor, setVideoFileForEditor] = React.useState<File | null>(null);
  const [showVideoEditor, setShowVideoEditor] = React.useState(false);
  const [headerSample, setHeaderSample] = React.useState("");
  const [body, setBody] = React.useState("");
  const [bodySamples, setBodySamples] = React.useState<string[]>([]);
  const [footer, setFooter] = React.useState(DEFAULT_FOOTER);
  const [buttons, setButtons] = React.useState<ButtonDraft[]>([]);
  // Authentication templates: Meta auto-generates the body + Copy-code button;
  // we only let the partner set how long the code stays valid.
  const [codeExpiryMinutes, setCodeExpiryMinutes] = React.useState(5);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const reset = () => {
    setName("");
    setLanguage("en_US");
    setCategory("UTILITY");
    setHeaderFormat("NONE");
    setHeaderText("");
    setHeaderMediaUrl("");
    setHeaderMediaHandle("");
    setUploadingMedia(false);
    setVideoFileForEditor(null);
    setShowVideoEditor(false);
    setHeaderSample("");
    setBody("");
    setBodySamples([]);
    setFooter(DEFAULT_FOOTER);
    setButtons([]);
    setCodeExpiryMinutes(5);
  };

  // Prefill the form from an existing template when entering edit mode.
  React.useEffect(() => {
    if (isEdit && initial) {
      setName(initial.name);
      setLanguage(initial.language);
      setCategory(initial.category as "UTILITY" | "MARKETING" | "AUTHENTICATION");
      let header: HeaderFormat = "NONE";
      let headerTxt = "";
      let headerMedia = "";
      let headerEx = "";
      let bodyTxt = "";
      let bodyEx: string[] = [];
      let footerTxt = "";
      let btns: ButtonDraft[] = [];
      let expiry = 5;
      for (const c of initial.components || []) {
        if (c.type === "HEADER") {
          header = (c.format || "TEXT") as HeaderFormat;
          if (header === "TEXT") {
            headerTxt = c.text || "";
            headerEx = c.example?.header_text?.[0] || "";
          } else {
            headerMedia = c.example?.header_handle?.[0] || "";
          }
        } else if (c.type === "BODY") {
          bodyTxt = c.text || "";
          bodyEx = c.example?.body_text?.[0] || [];
        } else if (c.type === "FOOTER") {
          footerTxt = c.text || "";
          if (typeof c.code_expiration_minutes === "number") {
            expiry = c.code_expiration_minutes;
          }
        } else if (c.type === "BUTTONS") {
          btns = (c.buttons || []).slice(0, 3).map((b: any) => {
            const isUrl = b.type === "URL";
            const dynamic = isUrl && /\{\{\d+\}\}/.test(b.url || "");
            return {
              type: b.type as ButtonKind,
              text: b.text || "",
              url: b.url,
              urlType: isUrl ? (dynamic ? "dynamic" : "static") : undefined,
              urlExample: dynamic
                ? (Array.isArray(b.example) ? b.example[0] : b.example) || ""
                : undefined,
              phone_number: b.phone_number,
            } as ButtonDraft;
          });
        }
      }
      setHeaderFormat(header);
      setHeaderText(headerTxt);
      setHeaderMediaUrl(headerMedia);
      setHeaderSample(headerEx);
      setBody(bodyTxt);
      setBodySamples(bodyEx);
      // Prefill the opt-out footer when the template has none — but never for
      // AUTHENTICATION (its footer is Meta's code-expiry line, not custom text).
      setFooter(
        footerTxt || (initial.category === "AUTHENTICATION" ? "" : DEFAULT_FOOTER),
      );
      setButtons(btns);
      setCodeExpiryMinutes(expiry);
    } else if (!isEdit) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initial?.id]);

  // Keep bodySamples length in sync with the {{n}} variable count.
  const varCount = React.useMemo(() => variableCount(body), [body]);
  React.useEffect(() => {
    setBodySamples((s) => {
      const next = [...s];
      while (next.length < varCount) next.push("");
      next.length = varCount;
      return next;
    });
  }, [varCount]);

  // Header may include a single {{1}} variable per Meta's rules.
  const headerHasVar = /\{\{\d+\}\}/.test(headerText);

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
  const nameInvalid = !slug || slug.length < 3 || slug.length > 512;

  const addButton = (type: ButtonKind) => {
    if (buttons.length >= 3) return;
    setButtons((b) => [
      ...b,
      { type, text: "", ...(type === "URL" ? { urlType: "static" as const } : {}) },
    ]);
  };
  const updateButton = (idx: number, patch: Partial<ButtonDraft>) => {
    setButtons((b) => b.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };
  const removeButton = (idx: number) => {
    setButtons((b) => b.filter((_, i) => i !== idx));
  };

  // Resumable-upload the (already S3-hosted) header media to Meta and return the
  // handle the template create needs as example.header_handle[0].
  const fetchMediaHandle = async (url: string, fileType?: string): Promise<string> => {
    const res = await fetch("/api/whatsapp/templates/media-handle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, url, fileType }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.handle) {
      throw new Error(data?.error || "Could not process media");
    }
    return data.handle as string;
  };

  // Store the header media's public URL + resolve its Meta handle.
  const applyHeaderMedia = async (url: string, fileType?: string) => {
    setHeaderMediaUrl(url);
    setUploadingMedia(true);
    try {
      setHeaderMediaHandle(await fetchMediaHandle(url, fileType));
    } catch (e: any) {
      toast.error(e?.message || "Could not process media");
      setHeaderMediaHandle("");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Video: transcoded by VideoEditor (H.264/AAC mp4, ≤5MB) → S3 → handle.
  const onVideoComplete = async (blob: Blob) => {
    setShowVideoEditor(false);
    setVideoFileForEditor(null);
    setUploadingMedia(true);
    try {
      const url = (await uploadFileToS3(blob, `wa-template-${Date.now()}.mp4`)) as string;
      await applyHeaderMedia(url, "video/mp4");
    } catch (e: any) {
      toast.error(e?.message || "Video upload failed");
      setUploadingMedia(false);
    }
  };

  const handleDocumentFile = async (file: File) => {
    setUploadingMedia(true);
    try {
      const url = (await uploadFileToS3(file, file.name)) as string;
      await applyHeaderMedia(url, file.type || "application/pdf");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
      setUploadingMedia(false);
    }
  };

  const buildComponents = (): any[] => {
    // Authentication (OTP) templates have a fixed shape: Meta auto-generates the
    // body ("<code> is your verification code") + security note, and we add a
    // Copy-code button. No custom body/header/footer text is allowed.
    if (category === "AUTHENTICATION") {
      return [
        { type: "BODY", add_security_recommendation: true },
        { type: "FOOTER", code_expiration_minutes: codeExpiryMinutes },
        { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
      ];
    }

    const comps: any[] = [];
    if (headerFormat !== "NONE") {
      if (headerFormat === "TEXT" && headerText) {
        const header: any = { type: "HEADER", format: "TEXT", text: headerText };
        if (headerHasVar && headerSample) {
          header.example = { header_text: [headerSample] };
        }
        comps.push(header);
      } else if (headerFormat !== "TEXT" && headerMediaHandle) {
        comps.push({
          type: "HEADER",
          format: headerFormat,
          example: { header_handle: [headerMediaHandle] },
        });
      }
    }
    if (body) {
      const bodyComp: any = { type: "BODY", text: body };
      if (varCount > 0 && bodySamples.every((s) => s.trim().length > 0)) {
        bodyComp.example = { body_text: [bodySamples] };
      }
      comps.push(bodyComp);
    }
    if (footer.trim()) {
      comps.push({ type: "FOOTER", text: footer.trim() });
    }
    if (buttons.length > 0) {
      const cleanButtons = buttons
        .filter((b) => b.text.trim())
        .map((b) => {
          if (b.type === "URL") {
            const btn: any = { type: "URL", text: b.text, url: b.url || "" };
            // Dynamic links carry a {{1}} variable; Meta requires an example URL.
            if (b.urlType === "dynamic" && b.urlExample?.trim()) {
              btn.example = [b.urlExample.trim()];
            }
            return btn;
          }
          if (b.type === "PHONE_NUMBER")
            return {
              type: "PHONE_NUMBER",
              text: b.text,
              phone_number: b.phone_number || "",
            };
          return { type: "QUICK_REPLY", text: b.text };
        });
      if (cleanButtons.length > 0) {
        comps.push({ type: "BUTTONS", buttons: cleanButtons });
      }
    }
    return comps;
  };

  const valid =
    category === "AUTHENTICATION"
      ? !nameInvalid
      : !nameInvalid &&
        body.trim().length > 0 &&
        (varCount === 0 || bodySamples.every((s) => s.trim().length > 0)) &&
        (headerFormat !== "TEXT" || !headerHasVar || headerSample.trim().length > 0) &&
        buttons.every((b) => {
          if (!b.text.trim()) return false;
          if (b.type === "URL") {
            if (!b.url?.trim()) return false;
            if (b.urlType === "dynamic") {
              // Dynamic URL must contain a {{1}} variable and an example value.
              if (!/\{\{\d+\}\}/.test(b.url)) return false;
              if (!b.urlExample?.trim()) return false;
            }
          }
          if (b.type === "PHONE_NUMBER" && !b.phone_number?.trim()) return false;
          return true;
        });

  const submit = async () => {
    if (!partnerId) return;
    if (!valid) {
      toast.error("Please fill in all required fields, including example values.");
      return;
    }
    if (uploadingMedia) {
      toast.error("Please wait for the header media to finish uploading.");
      return;
    }
    if (headerFormat !== "NONE" && headerFormat !== "TEXT" && !headerMediaHandle) {
      toast.error("Upload the header media before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      let res: Response;
      if (isEdit && initial) {
        res = await fetch(`/api/whatsapp/templates/${initial.id}?partnerId=${partnerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, components: buildComponents() }),
        });
      } else {
        res = await fetch("/api/whatsapp/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partnerId,
            name: slug,
            language,
            category,
            components: buildComponents(),
            phoneNumberId: phoneNumberId || undefined,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Meta rejected the template");
      toast.success(
        isEdit
          ? "Template updated — Meta will re-review within 24h"
          : "Template submitted — Meta will review within 24h",
      );
      reset();
      onSaved();
    } catch (e: any) {
      // Surface the reason inline (persists) AND as a toast. Nothing was saved
      // server-side on failure, and the form keeps everything typed so the
      // partner can fix the issue and resubmit.
      const message = e?.message || "Failed to submit template";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col pb-10">
      {/* ------------------------------------------------- sticky sub-header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to templates"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            {isEdit ? "Edit template" : "New template"}
          </div>
          <div className="mt-0.5 text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {isEdit
              ? "Editing puts the template back into review at Meta"
              : "Meta reviews every template before it can be sent"}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </AdminV3Button>
          <AdminV3Button
            variant="strong"
            className="h-[34px] px-3.5"
            onClick={submit}
            disabled={!valid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {isEdit ? "Saving…" : "Submitting…"}
              </>
            ) : isEdit ? (
              "Save & resubmit"
            ) : (
              "Submit for review"
            )}
          </AdminV3Button>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 px-0 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <div className="flex flex-wrap items-start gap-3.5">
          {/* --------------------------------------------------- left: form */}
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
            <section className="rounded-none border border-x-0 border-zinc-200 bg-white p-4 shadow-[0_1px_2px_0_rgba(9,9,11,.05)] dark:border-zinc-800 dark:bg-zinc-900 lg:rounded-[10px] lg:border-x">
              <div className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Name</FieldLabel>
                  <Field
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="order_status_update"
                    disabled={isEdit}
                  />
                  <Hint>
                    {isEdit ? (
                      "Name is locked. To rename, delete and recreate."
                    ) : (
                      <>
                        Slug: <code className="font-mono">{slug || "—"}</code>. Lowercase,
                        3–512 chars, letters/numbers/underscore only.
                      </>
                    )}
                  </Hint>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>Language</FieldLabel>
                    <SelectField
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={isEdit}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>Category</FieldLabel>
                    <SelectField
                      value={category}
                      onChange={(e) =>
                        setCategory(
                          e.target.value as "UTILITY" | "MARKETING" | "AUTHENTICATION",
                        )
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </SelectField>
                    <Hint>{CATEGORIES.find((c) => c.value === category)?.hint}</Hint>
                  </label>
                </div>

                {category === "AUTHENTICATION" && (
                  <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <p className="text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                      One-time passcode template
                    </p>
                    <Hint>
                      Meta writes this template for you — &ldquo;&#123;&#123;1&#125;&#125; is
                      your verification code&rdquo; plus a &ldquo;don&apos;t share this
                      code&rdquo; note — and adds a Copy-code button. There&apos;s no body
                      text to write. Just set the name, language, and how long the code stays
                      valid.
                    </Hint>
                    <label className="flex flex-col gap-1.5 pt-1">
                      <FieldLabel>Code expires after (minutes)</FieldLabel>
                      <Field
                        type="number"
                        min={1}
                        max={90}
                        value={codeExpiryMinutes}
                        onChange={(e) =>
                          setCodeExpiryMinutes(
                            Math.max(1, Math.min(90, Number(e.target.value) || 5)),
                          )
                        }
                        className="w-28"
                      />
                    </label>
                  </div>
                )}

                {category !== "AUTHENTICATION" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Header</FieldLabel>
                      <SelectField
                        value={headerFormat}
                        onChange={(e) => setHeaderFormat(e.target.value as HeaderFormat)}
                      >
                        <option value="NONE">No header</option>
                        <option value="TEXT">Text</option>
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video</option>
                        <option value="DOCUMENT">Document</option>
                      </SelectField>
                      {headerFormat === "TEXT" && (
                        <>
                          <Field
                            value={headerText}
                            onChange={(e) => setHeaderText(e.target.value)}
                            placeholder="Hello {{1}}"
                            maxLength={60}
                          />
                          {headerHasVar && (
                            <Field
                              value={headerSample}
                              onChange={(e) => setHeaderSample(e.target.value)}
                              placeholder="Example value for {{1}}"
                            />
                          )}
                        </>
                      )}
                      {headerFormat !== "NONE" && headerFormat !== "TEXT" && (
                        <div className="flex flex-col gap-2">
                          {headerFormat === "IMAGE" && (
                            <ImageUpload
                              value={headerMediaHandle ? headerMediaUrl : ""}
                              onChange={(url) => {
                                if (url) void applyHeaderMedia(url);
                                else {
                                  setHeaderMediaUrl("");
                                  setHeaderMediaHandle("");
                                }
                              }}
                              label="Header image (sample for Meta review + sent to customers)"
                              folder="wa-templates"
                            />
                          )}
                          {headerFormat === "VIDEO" && (
                            <div className="flex flex-col gap-2">
                              {headerMediaUrl && headerMediaHandle && (
                                <video
                                  src={headerMediaUrl}
                                  controls
                                  className="w-full max-w-xs rounded-md border border-zinc-200 dark:border-zinc-700"
                                />
                              )}
                              <Field
                                type="file"
                                accept="video/mp4,video/*"
                                className="h-auto py-2 text-[12.5px] file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-[12.5px] file:text-zinc-700 dark:file:bg-zinc-700 dark:file:text-zinc-200"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setVideoFileForEditor(f);
                                    setShowVideoEditor(true);
                                  }
                                  e.target.value = "";
                                }}
                              />
                              <Hint>
                                MP4 (H.264/AAC), ≤5MB — trimmed &amp; transcoded
                                automatically.
                              </Hint>
                            </div>
                          )}
                          {headerFormat === "DOCUMENT" && (
                            <div className="flex flex-col gap-2">
                              {headerMediaUrl && headerMediaHandle && (
                                <a
                                  href={headerMediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-zinc-700 underline dark:text-zinc-300"
                                >
                                  Uploaded document
                                </a>
                              )}
                              <Field
                                type="file"
                                accept="application/pdf,.pdf"
                                className="h-auto py-2 text-[12.5px] file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-[12.5px] file:text-zinc-700 dark:file:bg-zinc-700 dark:file:text-zinc-200"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleDocumentFile(f);
                                  e.target.value = "";
                                }}
                              />
                            </div>
                          )}
                          {uploadingMedia ? (
                            <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                              <Loader2 size={14} className="animate-spin" /> Processing media…
                            </p>
                          ) : headerMediaHandle ? (
                            <p className="text-xs font-medium text-green-700 dark:text-green-400">
                              Header media ready ✓
                            </p>
                          ) : null}
                          {showVideoEditor && videoFileForEditor && (
                            <VideoEditor
                              isOpen={showVideoEditor}
                              videoFile={videoFileForEditor}
                              onClose={() => {
                                setShowVideoEditor(false);
                                setVideoFileForEditor(null);
                              }}
                              onComplete={(blob) => {
                                void onVideoComplete(blob);
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Body</FieldLabel>
                      <AreaField
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={5}
                        placeholder="Hi {{1}}, your order #{{2}} is ready for pickup."
                        maxLength={1024}
                      />
                      <Hint>
                        {body.length}/1024 · {varCount} variable{varCount === 1 ? "" : "s"}
                      </Hint>
                      {varCount > 0 && (
                        <div className="flex flex-col gap-1.5 border-l-2 border-zinc-200 pl-3 dark:border-zinc-700">
                          <p className="text-xs font-medium leading-none text-zinc-500 dark:text-zinc-400">
                            Example values
                          </p>
                          {bodySamples.map((s, i) => (
                            <Field
                              key={i}
                              value={s}
                              onChange={(e) => {
                                const next = [...bodySamples];
                                next[i] = e.target.value;
                                setBodySamples(next);
                              }}
                              placeholder={`Example for {{${i + 1}}}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Footer (optional)</FieldLabel>
                      <Field
                        value={footer}
                        onChange={(e) => setFooter(e.target.value)}
                        placeholder="Reply STOP to unsubscribe"
                        maxLength={60}
                      />
                      <Hint>
                        Prefilled with an opt-out line — edit or clear it if you don&apos;t
                        want one.
                      </Hint>
                    </label>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <FieldLabel>Buttons (optional, up to 3)</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              ["QUICK_REPLY", "+ Quick reply"],
                              ["URL", "+ URL"],
                              ["PHONE_NUMBER", "+ Phone"],
                            ] as Array<[ButtonKind, string]>
                          ).map(([kind, label]) => (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => addButton(kind)}
                              disabled={buttons.length >= 3}
                              className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2.5 text-[12.5px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {buttons.map((b, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-1.5 rounded-md border border-zinc-200 p-2.5 dark:border-zinc-700"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium leading-none text-zinc-500 dark:text-zinc-400">
                              {b.type === "QUICK_REPLY"
                                ? "Quick reply"
                                : b.type === "URL"
                                  ? "URL button"
                                  : "Phone button"}
                            </span>
                            <button
                              type="button"
                              title="Remove button"
                              aria-label="Remove button"
                              onClick={() => removeButton(i)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
                            >
                              <Trash2 size={14} strokeWidth={1.8} />
                            </button>
                          </div>
                          <Field
                            value={b.text}
                            onChange={(e) => updateButton(i, { text: e.target.value })}
                            placeholder="Button label"
                            maxLength={25}
                          />
                          {b.type === "URL" && (
                            <>
                              <div className="flex items-center gap-2">
                                <SelectField
                                  value={b.urlType || "static"}
                                  onChange={(e) =>
                                    updateButton(i, {
                                      urlType: e.target.value as "static" | "dynamic",
                                    })
                                  }
                                  className="w-32 shrink-0"
                                >
                                  <option value="static">Static URL</option>
                                  <option value="dynamic">Dynamic URL</option>
                                </SelectField>
                                <Field
                                  value={b.url || ""}
                                  onChange={(e) => updateButton(i, { url: e.target.value })}
                                  placeholder={
                                    b.urlType === "dynamic"
                                      ? "https://example.com/{{1}}"
                                      : "https://…"
                                  }
                                />
                              </div>
                              {b.urlType === "dynamic" && (
                                <>
                                  <Field
                                    value={b.urlExample || ""}
                                    onChange={(e) =>
                                      updateButton(i, { urlExample: e.target.value })
                                    }
                                    placeholder="Example full URL, e.g. https://example.com/order/123"
                                  />
                                  <Hint>
                                    End the URL with {"{{1}}"} — it&apos;s filled in per
                                    message. Provide one example link for Meta&apos;s review.
                                  </Hint>
                                </>
                              )}
                            </>
                          )}
                          {b.type === "PHONE_NUMBER" && (
                            <Field
                              value={b.phone_number || ""}
                              onChange={(e) =>
                                updateButton(i, { phone_number: e.target.value })
                              }
                              placeholder="+1234567890"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {submitError && (
              <div className="mx-0 rounded-none border border-x-0 border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950 lg:rounded-[10px] lg:border-x">
                <div className="text-[13.5px] font-semibold leading-tight text-red-800 dark:text-red-300">
                  WhatsApp didn&apos;t accept this template
                </div>
                <div className="mt-1 text-[12.5px] leading-[1.45] text-red-700 dark:text-red-400">
                  {submitError}
                </div>
                <div className="mt-1 text-xs leading-[1.45] text-red-600 dark:text-red-500">
                  Nothing was saved — fix the issue above and submit again.
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------ right: preview */}
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2 px-3.5 lg:px-0">
            <FieldLabel>Preview</FieldLabel>
            <div className="min-h-[280px] rounded-[10px] border border-zinc-200 bg-[#E5DDD5] p-4 dark:border-zinc-700 dark:bg-[#0B141A]">
              <div className="flex max-w-[88%] flex-col gap-2 rounded-lg bg-white p-3 text-[13.5px] leading-[1.45] shadow-sm dark:bg-zinc-800">
                {headerFormat === "TEXT" && headerText && (
                  <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {headerHasVar ? previewText(headerText, [headerSample]) : headerText}
                  </div>
                )}
                {headerFormat !== "NONE" && headerFormat !== "TEXT" && headerMediaUrl && (
                  <div className="flex h-32 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                    {headerFormat} preview
                  </div>
                )}
                {category === "AUTHENTICATION" && (
                  <>
                    <div className="whitespace-pre-wrap text-zinc-950 dark:text-zinc-50">
                      123456 is your verification code. For your security, do not share this
                      code.
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      This code expires in {codeExpiryMinutes} minutes.
                    </div>
                  </>
                )}
                {body && (
                  <div className="whitespace-pre-wrap text-zinc-950 dark:text-zinc-50">
                    {previewText(body, bodySamples)}
                  </div>
                )}
                {footer && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{footer}</div>
                )}
              </div>
              {category === "AUTHENTICATION" && (
                <div className="mt-2 rounded bg-white py-1.5 text-center text-[13.5px] font-medium leading-none text-[#34B7F1] shadow-sm dark:bg-zinc-800">
                  Copy code
                </div>
              )}
              {buttons.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {buttons.map((b, i) => (
                    <div
                      key={i}
                      className="rounded bg-white py-1.5 text-center text-[13.5px] font-medium leading-none text-[#34B7F1] shadow-sm dark:bg-zinc-800"
                    >
                      {b.text || "Button"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
