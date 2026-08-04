"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Clock,
  MessageCircleQuestion,
  ExternalLink,
  ImageIcon,
  Video as VideoIcon,
  AudioLines,
  FileText,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import type { FlowGraph } from "@/lib/whatsappFlow/types";

// One simulated step: an outbound message, or a flow marker (delay / wait).
interface SimStep {
  kind:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "buttons"
    | "cta"
    | "catalog"
    | "delay"
    | "wait";
  marker?: boolean;
  text?: string;
  caption?: string;
  mediaUrl?: string;
  filename?: string;
  items?: { id: string; label: string }[];
  buttonText?: string;
  url?: string;
  seconds?: number;
  waitFor?: "reply" | "choice";
}

interface SimResult {
  ok: boolean;
  mode: "message" | "order" | "loyalty";
  trigger: {
    matchType: string;
    keywords: string[];
    orderStatus?: string;
    loyaltyEvent?: string;
  };
  situation: Record<string, unknown> | null;
  steps: SimStep[];
  endedBy: "complete" | "wait";
}

// Minimal WhatsApp-style formatting: *bold*, _italic_, ~strike~. Non-nested, which
// is all WhatsApp itself supports; newlines are preserved by the caller's CSS.
function formatWa(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const inner = tok.slice(1, -1);
    if (tok[0] === "*") out.push(<strong key={key++}>{inner}</strong>);
    else if (tok[0] === "_") out.push(<em key={key++}>{inner}</em>);
    else out.push(<s key={key++}>{inner}</s>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[85%] self-start rounded-lg rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-relaxed text-gray-800 shadow-sm ring-1 ring-black/5 whitespace-pre-wrap break-words">
      {children}
    </div>
  );
}

function MediaLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-gray-500">
      <Icon className="h-4 w-4" /> {label}
    </span>
  );
}

function StepView({ step }: { step: SimStep }) {
  if (step.kind === "delay") {
    const s = step.seconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const human = [h && `${h}h`, m && `${m}m`, sec && `${sec}s`].filter(Boolean).join(" ") || "0s";
    return (
      <div className="my-1 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> waits {human}, then continues
      </div>
    );
  }
  if (step.kind === "wait") {
    return (
      <div className="my-1 flex items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground self-center">
        <MessageCircleQuestion className="h-3.5 w-3.5" />
        {step.waitFor === "choice"
          ? "Waits for the customer to tap a button"
          : "Waits for the customer to reply"}
      </div>
    );
  }
  if (step.kind === "image") {
    return (
      <Bubble>
        {step.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={step.mediaUrl} alt="" className="mb-1 max-h-40 rounded-md object-cover" />
        ) : (
          <MediaLabel icon={ImageIcon} label="Image" />
        )}
        {step.caption ? <div>{formatWa(step.caption)}</div> : null}
      </Bubble>
    );
  }
  if (step.kind === "video") {
    return (
      <Bubble>
        <MediaLabel icon={VideoIcon} label="Video" />
        {step.caption ? <div className="mt-1">{formatWa(step.caption)}</div> : null}
      </Bubble>
    );
  }
  if (step.kind === "audio") {
    return (
      <Bubble>
        <MediaLabel icon={AudioLines} label="Voice message" />
      </Bubble>
    );
  }
  if (step.kind === "document") {
    return (
      <Bubble>
        <MediaLabel icon={FileText} label={step.filename || "Document"} />
        {step.caption ? <div className="mt-1">{formatWa(step.caption)}</div> : null}
      </Bubble>
    );
  }
  if (step.kind === "cta") {
    return (
      <Bubble>
        {step.text ? <div>{formatWa(step.text)}</div> : null}
        <a
          href={step.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-[13px] font-medium text-sky-700 hover:bg-sky-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {step.buttonText || "Open"}
        </a>
      </Bubble>
    );
  }
  if (step.kind === "catalog") {
    return (
      <Bubble>
        {step.text ? <div>{formatWa(step.text)}</div> : null}
        <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-[13px] font-medium text-teal-700">
          <ShoppingBag className="h-3.5 w-3.5" />
          View catalog
        </div>
      </Bubble>
    );
  }
  if (step.kind === "buttons") {
    return (
      <div className="flex max-w-[85%] flex-col gap-1 self-start">
        <Bubble>{step.text ? formatWa(step.text) : ""}</Bubble>
        <div className="flex flex-col gap-1">
          {(step.items || []).map((it) => (
            <div
              key={it.id}
              className="rounded-md border bg-white px-3 py-1.5 text-center text-[13px] font-medium text-sky-700 shadow-sm"
            >
              {it.label}
            </div>
          ))}
        </div>
      </div>
    );
  }
  // text
  return <Bubble>{formatWa(step.text || "")}</Bubble>;
}

function boolChip(label: string, val: unknown) {
  const on = String(val) === "true";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        on ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {label}: {on ? "Yes" : "No"}
    </span>
  );
}

export function TestFlowDialog({
  open,
  onOpenChange,
  partnerId,
  getGraph,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partnerId?: string;
  getGraph: () => FlowGraph;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);

  const run = useCallback(async () => {
    if (!partnerId) {
      setError("Testing needs a store — open this flow from a partner's dashboard.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/flows/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, graph: getGraph() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Test failed");
      setResult(data as SimResult);
    } catch (e: any) {
      setError(e?.message || "Test failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId, getGraph]);

  // Re-run each time the dialog opens so the preview reflects the current graph
  // and the current shop/delivery situation.
  useEffect(() => {
    if (open) run();
    else {
      setResult(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sit = result?.situation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Test this flow</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={run}
              disabled={loading}
              className="mr-4 h-7 gap-1.5 px-2 text-xs"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Run again
            </Button>
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          This shows the reply a customer gets <span className="font-medium">right now</span>,
          based on your current store status and this flow&apos;s steps.
        </p>

        {/* Current situation / trigger context */}
        {result && (
          <div className="rounded-md border bg-muted/40 p-2 text-[11px]">
            {result.mode === "message" && sit ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {boolChip("Shop open", sit.shop_open)}
                {boolChip("Delivery", sit.delivery_available_now)}
                {boolChip("Takeaway", sit.takeaway_available_now)}
                {(sit.delivery_hours || sit.takeaway_hours) ? (
                  <span className="w-full pt-0.5 text-muted-foreground">
                    Delivery {String(sit.delivery_hours) || "—"} · Takeaway{" "}
                    {String(sit.takeaway_hours) || "—"}
                  </span>
                ) : null}
              </div>
            ) : result.mode === "order" ? (
              <span className="text-muted-foreground">
                Previewed with sample order data · status{" "}
                <span className="font-medium text-foreground">
                  {result.trigger.orderStatus || "—"}
                </span>
              </span>
            ) : result.mode === "loyalty" ? (
              <span className="text-muted-foreground">
                Previewed with sample loyalty data · event{" "}
                <span className="font-medium text-foreground">
                  {result.trigger.loyaltyEvent || "—"}
                </span>
              </span>
            ) : null}
          </div>
        )}

        {/* Chat preview */}
        <div className="min-h-[160px] rounded-lg bg-[#e5ddd5] p-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-red-600">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : result && result.steps.length ? (
            <div className="flex flex-col gap-1.5">
              {result.steps.map((s, i) => (
                <StepView key={i} step={s} />
              ))}
              {result.endedBy === "complete" && (
                <div className="mt-1 self-center text-[10px] text-black/40">
                  — end of flow —
                </div>
              )}
            </div>
          ) : result ? (
            <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-black/50">
              This flow sends no messages in the current situation.
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
