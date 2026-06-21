"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { WhatsAppHealthStatus } from "@/components/admin-v2/WhatsAppHealthStatus";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  Loader2,
  Pencil,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import VideoEditor from "@/components/VideoEditor";
import { uploadFileToS3 } from "@/app/actions/aws-s3";

type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
type ButtonKind = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

interface ButtonDraft {
  type: ButtonKind;
  text: string;
  url?: string;
  // URL buttons can be static (one fixed link) or dynamic (link ends with a
  // {{1}} variable filled per message). Dynamic links require an example.
  urlType?: "static" | "dynamic";
  urlExample?: string;
  phone_number?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  meta_template_id: string | null;
  rejection_reason: string | null;
  components: any[];
  created_at: string;
}

const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en", label: "English" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi" },
  { code: "ml", label: "Malayalam" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "ar", label: "Arabic" },
];

const CATEGORIES: Array<{ value: "UTILITY" | "MARKETING" | "AUTHENTICATION"; label: string; hint: string }> = [
  { value: "UTILITY", label: "Utility", hint: "Order updates, account alerts, receipts" },
  { value: "MARKETING", label: "Marketing", hint: "Promotions, offers, announcements" },
  { value: "AUTHENTICATION", label: "Authentication", hint: "One-time passcodes, login codes" },
];

// The standard OTP / login-code template the app uses to send verification
// codes (see src/app/actions/sendWhatsAppOtp.ts → name "otp_message_v2"). It's
// identical for every partner, so we offer it as a one-click default rather
// than making each partner hand-build an AUTHENTICATION template. Meta
// auto-generates the body + copy-code button for AUTHENTICATION templates.
const OTP_TEMPLATE_NAME = "otp_message_v2";
const OTP_TEMPLATE_PAYLOAD = {
  name: OTP_TEMPLATE_NAME,
  language: "en_US",
  category: "AUTHENTICATION" as const,
  components: [
    { type: "BODY", add_security_recommendation: true },
    { type: "FOOTER", code_expiration_minutes: 5 },
    { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
  ],
};

function statusVariant(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "PENDING":
    case "DRAFT":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "REJECTED":
    case "DISABLED":
      return "bg-red-100 text-red-800 border-red-200";
    case "PAUSED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function previewText(body: string, samples: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (_m, idx) => {
    const i = parseInt(idx, 10) - 1;
    return samples[i] ? samples[i] : `{{${idx}}}`;
  });
}

function variableCount(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g) || [];
  const indices = new Set<number>();
  matches.forEach((m) => {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!isNaN(n)) indices.add(n);
  });
  return indices.size;
}

export function AdminV2WhatsAppTemplates() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  // The editor is shown as an inline view (component switch), not a modal.
  const [editor, setEditor] = useState<
    { mode: "create" } | { mode: "edit"; template: TemplateRow } | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [addingOtp, setAddingOtp] = useState(false);

  // The OTP template is the same for everyone; show a one-click "add" until the
  // partner has it (in any status — submitted/approved).
  const hasOtpTemplate = templates.some((t) => t.name === OTP_TEMPLATE_NAME);

  const load = async (withSync = false) => {
    if (!partnerId) return;
    if (withSync) setSyncing(true);
    else setLoading(true);
    try {
      const url = `/api/whatsapp/templates?partnerId=${partnerId}${withSync ? "&sync=1" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setTemplates(data.templates || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const loadStatus = async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
      const data = await res.json();
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    if (!partnerId) return;
    loadStatus();
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const handleDelete = async (row: TemplateRow) => {
    if (!partnerId) return;
    if (!confirm(`Delete template "${row.name}"? This removes it from Meta too.`)) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(
        `/api/whatsapp/templates/${row.id}?partnerId=${partnerId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      toast.success("Template deleted");
      setTemplates((t) => t.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  // One-click create + submit the standard OTP template for Meta review.
  const handleAddOtp = async () => {
    if (!partnerId) return;
    setAddingOtp(true);
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, ...OTP_TEMPLATE_PAYLOAD }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Meta rejected the template");
      toast.success("OTP template submitted — Meta will review within ~24h");
      load(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit OTP template");
    } finally {
      setAddingOtp(false);
    }
  };

  // Component switching: while the editor view is open, it replaces the list.
  if (editor) {
    return (
      <TemplateEditorView
        mode={editor.mode}
        initial={editor.mode === "edit" ? editor.template : null}
        partnerId={partnerId}
        onClose={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          load(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-green-600" />
            WhatsApp Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Create message templates and submit them to Meta for approval. Approved templates can
            be sent to your customers through the WhatsApp Business API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => load(true)}
            disabled={syncing || !connected}
            title={!connected ? "Connect your WABA in Settings first" : "Sync statuses from Meta"}
          >
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync from Meta
          </Button>
          <Button
            onClick={() => setEditor({ mode: "create" })}
            disabled={!connected}
            title={!connected ? "Connect your WABA in Settings first" : "Create a new template"}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {connected === false && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex gap-3 p-4 items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-amber-900">
                Connect your WhatsApp Business Account
              </div>
              <div className="text-amber-800/80 mt-0.5">
                Template management requires a connected WABA. Open Settings → WhatsApp Business
                and click <b>Connect WhatsApp Business</b>.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connected && <WhatsAppHealthStatus partnerId={partnerId} />}

      {connected && !loading && !hasOtpTemplate && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <ShieldCheck className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-medium">
                  OTP / Login code
                  <Badge className="border-green-200 bg-green-100 text-green-800">
                    Recommended
                  </Badge>
                </div>
                <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
                  The standard verification-code template used to log customers in over
                  WhatsApp. It&apos;s the same for every business — just add it and we&apos;ll
                  submit it to Meta for review.
                </p>
              </div>
            </div>
            <Button
              onClick={handleAddOtp}
              disabled={addingOtp}
              className="shrink-0 bg-green-600 text-white hover:bg-green-700"
            >
              {addingOtp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Add &amp; submit for review
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your templates</CardTitle>
          <CardDescription>
            Templates auto-review at Meta within ~24h. Sync to refresh statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No templates yet. Click <b>New Template</b> to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{t.name}</span>
                      <Badge variant="outline" className="font-normal">{t.language}</Badge>
                      <Badge variant="outline" className="font-normal">{t.category}</Badge>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded border ${statusVariant(t.status)}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    {t.rejection_reason &&
                      t.rejection_reason.trim().toUpperCase() !== "NONE" && (
                        <div className="text-xs text-red-700 mt-1">
                          Rejected: {t.rejection_reason}
                        </div>
                      )}
                  </div>
                  <div className="flex gap-1 self-end sm:self-auto">
                    {(t.status === "APPROVED" || t.status === "REJECTED") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditor({ mode: "edit", template: t })}
                        title="Edit template"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t)}
                      disabled={deletingId === t.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function TemplateEditorView({
  partnerId,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  partnerId: string | undefined;
  mode: "create" | "edit";
  initial?: TemplateRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit";
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING" | "AUTHENTICATION">("UTILITY");
  const [headerFormat, setHeaderFormat] = useState<HeaderFormat>("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  // Meta Resumable-Upload handle for a media header — required by template create
  // (a raw URL is rejected). Resolved when the partner picks header media.
  const [headerMediaHandle, setHeaderMediaHandle] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [videoFileForEditor, setVideoFileForEditor] = useState<File | null>(null);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [headerSample, setHeaderSample] = useState("");
  const [body, setBody] = useState("");
  const [bodySamples, setBodySamples] = useState<string[]>([]);
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<ButtonDraft[]>([]);
  // Authentication templates: Meta auto-generates the body + Copy-code button;
  // we only let the partner set how long the code stays valid.
  const [codeExpiryMinutes, setCodeExpiryMinutes] = useState(5);
  const [submitting, setSubmitting] = useState(false);

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
    setFooter("");
    setButtons([]);
    setCodeExpiryMinutes(5);
  };

  // Prefill the form from an existing template when entering edit mode.
  useEffect(() => {
    if (isEdit && initial) {
      setName(initial.name);
      setLanguage(initial.language);
      setCategory(initial.category as any);
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
          if (typeof (c as any).code_expiration_minutes === "number") {
            expiry = (c as any).code_expiration_minutes;
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
      setFooter(footerTxt);
      setButtons(btns);
      setCodeExpiryMinutes(expiry);
    } else if (!isEdit) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initial?.id]);

  // Keep bodySamples length in sync with the {{n}} variable count.
  const varCount = useMemo(() => variableCount(body), [body]);
  useEffect(() => {
    setBodySamples((s) => {
      const next = [...s];
      while (next.length < varCount) next.push("");
      next.length = varCount;
      return next;
    });
  }, [varCount]);

  // Header may include a single {{1}} variable per Meta's rules
  const headerHasVar = /\{\{\d+\}\}/.test(headerText);

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
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
            return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number || "" };
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
    try {
      let res: Response;
      if (isEdit && initial) {
        res = await fetch(
          `/api/whatsapp/templates/${initial.id}?partnerId=${partnerId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category,
              components: buildComponents(),
            }),
          },
        );
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
      toast.error(e?.message || "Failed to submit template");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="mt-0.5 shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit WhatsApp template" : "New WhatsApp template"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {isEdit ? (
              "Name and language can't be changed after creation. Editing puts the template back into review at Meta."
            ) : (
              <>
                Templates are reviewed by Meta. Use <code>{"{{1}}"}</code>{" "}
                placeholders for variables and provide example values.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
          {/* Left column: form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="order_status_update"
                disabled={isEdit}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Name is locked. To rename, delete and recreate."
                  : <>Slug: <code>{slug || "—"}</code>. Lowercase, 3–512 chars, letters/numbers/underscore only.</>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage} disabled={isEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === category)?.hint}
                </p>
              </div>
            </div>

            {category === "AUTHENTICATION" && (
              <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-900">
                  One-time passcode template
                </p>
                <p className="text-xs text-blue-800">
                  Meta writes this template for you — &ldquo;&#123;&#123;1&#125;&#125; is your
                  verification code&rdquo; plus a &ldquo;don&apos;t share this code&rdquo; note —
                  and adds a Copy-code button. There&apos;s no body text to write. Just
                  set the name, language, and how long the code stays valid.
                </p>
                <div className="space-y-1 pt-1">
                  <Label className="text-xs">Code expires after (minutes)</Label>
                  <Input
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
                </div>
              </div>
            )}

            {category !== "AUTHENTICATION" && (
              <>
            <div className="space-y-1.5">
              <Label>Header</Label>
              <Select value={headerFormat} onValueChange={(v) => setHeaderFormat(v as HeaderFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No header</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                </SelectContent>
              </Select>
              {headerFormat === "TEXT" && (
                <>
                  <Input
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="Hello {{1}}"
                    maxLength={60}
                  />
                  {headerHasVar && (
                    <Input
                      value={headerSample}
                      onChange={(e) => setHeaderSample(e.target.value)}
                      placeholder="Example value for {{1}}"
                    />
                  )}
                </>
              )}
              {headerFormat !== "NONE" && headerFormat !== "TEXT" && (
                <div className="space-y-2">
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
                    <div className="space-y-2">
                      {headerMediaUrl && headerMediaHandle && (
                        <video
                          src={headerMediaUrl}
                          controls
                          className="w-full max-w-xs rounded-md border"
                        />
                      )}
                      <Input
                        type="file"
                        accept="video/mp4,video/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setVideoFileForEditor(f);
                            setShowVideoEditor(true);
                          }
                          e.target.value = "";
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        MP4 (H.264/AAC), ≤5MB — trimmed &amp; transcoded automatically.
                      </p>
                    </div>
                  )}
                  {headerFormat === "DOCUMENT" && (
                    <div className="space-y-2">
                      {headerMediaUrl && headerMediaHandle && (
                        <a
                          href={headerMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline"
                        >
                          Uploaded document
                        </a>
                      )}
                      <Input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleDocumentFile(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  {uploadingMedia ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing media…
                    </p>
                  ) : headerMediaHandle ? (
                    <p className="text-xs text-green-600">Header media ready ✓</p>
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

            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Hi {{1}}, your order #{{2}} is ready for pickup."
                maxLength={1024}
              />
              <p className="text-xs text-muted-foreground">
                {body.length}/1024 · {varCount} variable{varCount === 1 ? "" : "s"}
              </p>
              {varCount > 0 && (
                <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                  <p className="text-xs font-medium text-muted-foreground">Example values</p>
                  {bodySamples.map((s, i) => (
                    <Input
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

            <div className="space-y-1.5">
              <Label>Footer (optional)</Label>
              <Input
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Reply STOP to unsubscribe"
                maxLength={60}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label>Buttons (optional, up to 3)</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addButton("QUICK_REPLY")}
                    disabled={buttons.length >= 3}
                  >
                    + Quick reply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addButton("URL")}
                    disabled={buttons.length >= 3}
                  >
                    + URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addButton("PHONE_NUMBER")}
                    disabled={buttons.length >= 3}
                  >
                    + Phone
                  </Button>
                </div>
              </div>
              {buttons.map((b, i) => (
                <div key={i} className="space-y-1.5 p-2 border rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {b.type === "QUICK_REPLY"
                        ? "Quick reply"
                        : b.type === "URL"
                        ? "URL button"
                        : "Phone button"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeButton(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={b.text}
                    onChange={(e) => updateButton(i, { text: e.target.value })}
                    placeholder="Button label"
                    maxLength={25}
                  />
                  {b.type === "URL" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Select
                          value={b.urlType || "static"}
                          onValueChange={(v) =>
                            updateButton(i, { urlType: v as "static" | "dynamic" })
                          }
                        >
                          <SelectTrigger className="w-32 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="static">Static URL</SelectItem>
                            <SelectItem value="dynamic">Dynamic URL</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
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
                          <Input
                            value={b.urlExample || ""}
                            onChange={(e) =>
                              updateButton(i, { urlExample: e.target.value })
                            }
                            placeholder="Example full URL, e.g. https://example.com/order/123"
                          />
                          <p className="text-xs text-muted-foreground">
                            End the URL with {"{{1}}"} — it&apos;s filled in per
                            message. Provide one example link for Meta&apos;s review.
                          </p>
                        </>
                      )}
                    </>
                  )}
                  {b.type === "PHONE_NUMBER" && (
                    <Input
                      value={b.phone_number || ""}
                      onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                      placeholder="+1234567890"
                    />
                  )}
                </div>
              ))}
            </div>
              </>
            )}
          </div>

          {/* Right column: preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-lg border bg-[#e5ddd5] p-4 min-h-[300px]">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[88%] space-y-2 text-sm">
                {headerFormat === "TEXT" && headerText && (
                  <div className="font-semibold">
                    {headerHasVar ? previewText(headerText, [headerSample]) : headerText}
                  </div>
                )}
                {headerFormat !== "NONE" && headerFormat !== "TEXT" && headerMediaUrl && (
                  <div className="bg-muted rounded h-32 flex items-center justify-center text-xs text-muted-foreground">
                    {headerFormat} preview
                  </div>
                )}
                {category === "AUTHENTICATION" && (
                  <>
                    <div className="whitespace-pre-wrap text-foreground">
                      123456 is your verification code. For your security, do not
                      share this code.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      This code expires in {codeExpiryMinutes} minutes.
                    </div>
                  </>
                )}
                {body && (
                  <div className="whitespace-pre-wrap text-foreground">
                    {previewText(body, bodySamples)}
                  </div>
                )}
                {footer && (
                  <div className="text-xs text-muted-foreground">{footer}</div>
                )}
              </div>
              {category === "AUTHENTICATION" && (
                <div className="mt-2 space-y-1">
                  <div className="bg-white rounded text-center py-1.5 text-sm text-[#34B7F1] font-medium shadow-sm">
                    Copy code
                  </div>
                </div>
              )}
              {buttons.length > 0 && (
                <div className="mt-2 space-y-1">
                  {buttons.map((b, i) => (
                    <div
                      key={i}
                      className="bg-white rounded text-center py-1.5 text-sm text-[#34B7F1] font-medium shadow-sm"
                    >
                      {b.text || "Button"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={!valid || submitting}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? "Saving…" : "Submitting…"}
            </>
          ) : (
            isEdit ? "Save & resubmit" : "Submit for review"
          )}
        </Button>
      </div>
    </div>
  );
}
