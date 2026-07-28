"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Check } from "lucide-react";
import { COMEBACK_BUTTON_BASE } from "@/lib/comeback/orderLinkSuffix";

/**
 * Write and submit a comeback template without leaving the screen.
 *
 * Most restaurant owners have never written a win-back message, and the ones they
 * reach for first — a big discount, up front — are the ones the evidence says
 * perform worst: the richest offer reacquires the customers who churn soonest and
 * spend least. So this leads with drafts that ask for a reply rather than buy one,
 * and puts the discount version last with that tradeoff spelled out.
 *
 * Every draft carries a working opt-out, but HOW depends on the draft, and that is
 * deliberate. Of the 14 approved marketing templates on this platform, every one
 * uses a single button type — URL alone, or quick-reply alone. Nothing here has
 * ever mixed the two, so a mixed template is an unproven shape to submit on a
 * partner's behalf, and a rejection costs them the whole approval round-trip.
 *
 * So: a draft with a menu link uses the URL button and puts the opt-out in the
 * footer as "Reply STOP to unsubscribe" — the webhook's STOP_WORDS set matches
 * that text exactly. A draft without a link uses a "Stop these messages"
 * quick-reply instead, which the webhook also catches (it treats any button
 * payload containing "stop" as an opt-out). Either way the customer can leave.
 */

export interface TemplateDraft {
  key: string;
  label: string;
  rationale: string;
  body: string;
  /** Shown under the message in the WhatsApp bubble. */
  footer?: string;
  includeMenuButton: boolean;
  /**
   * Uses a DYNAMIC url button, so each recipient gets their own signed-in link
   * straight into the menu instead of a shared "visit our site" address.
   */
  personalLink?: boolean;
}

export const COMEBACK_DRAFTS: TemplateDraft[] = [
  {
    key: "check_in",
    label: "A simple check-in",
    rationale:
      "No discount. Asks a question so people reply — and a reply opens a free 24-hour window where you can talk to them properly in the Inbox, at no extra cost.",
    body:
      "Hi {{1}}, it's been a while since we last saw you at {{2}} 🙂\n\n" +
      "We'd genuinely like to know — was everything alright last time?\n\n" +
      "Just reply here, we read every message.",
    footer: "You can stop these anytime",
    includeMenuButton: false,
  },
  {
    key: "whats_new",
    label: "We've missed you",
    rationale:
      "Warm, no discount, one tap to the menu. A good default when you have something new on to talk about.",
    body:
      "Hi {{1}}, we've missed you at {{2}}! 👋\n\n" +
      "There are a few new things on the menu we think you'd like.\n\n" +
      "Come see what's cooking 👇",
    footer: "Reply STOP to unsubscribe",
    includeMenuButton: true,
  },
  {
    key: "one_tap",
    label: "One tap back in",
    rationale:
      "Each customer gets their own link that signs them in and opens your menu — no login, no searching. The lowest-friction option, and the one to pick if you only try one.",
    body:
      "Hi {{1}}, it's been a while since your last order from {{2}} 🙂\n\n" +
      "Your usual is a tap away — we've kept you signed in.\n\n" +
      "See what's on today 👇",
    footer: "Reply STOP to unsubscribe",
    includeMenuButton: true,
    personalLink: true,
  },
  {
    key: "thank_you_offer",
    label: "A small thank-you offer",
    rationale:
      "Use this sparingly, and ideally only as a second message. A discount works, but it trains people to wait for one — and against a 3–9% net margin it is the expensive option.",
    body:
      "Hi {{1}}, we'd love to have you back at {{2}} 🧡\n\n" +
      "Here's {{3}} off your next order as a small thank-you for being a customer.\n\n" +
      "Valid for the next 7 days.",
    footer: "Reply STOP to unsubscribe",
    includeMenuButton: true,
  },
];

/** Meta requires lowercase letters, digits and underscores only. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

/** Placeholders in order of appearance, so the example array matches the body. */
function variableCount(body: string): number {
  const found = new Set(Array.from(body.matchAll(/\{\{(\d+)\}\}/g)).map((m) => m[1]));
  return found.size;
}

export function ComebackTemplateCreator({
  open, onOpenChange, partnerId, storeName, username, phoneNumberId, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partnerId: string;
  storeName: string;
  username: string | null;
  phoneNumberId?: string | null;
  onCreated: (urlButtonIndex: number | null) => void;
}) {
  const [draftKey, setDraftKey] = useState(COMEBACK_DRAFTS[0].key);
  const draft = useMemo(
    () => COMEBACK_DRAFTS.find((d) => d.key === draftKey) || COMEBACK_DRAFTS[0],
    [draftKey],
  );
  const [body, setBody] = useState(COMEBACK_DRAFTS[0].body);
  const [name, setName] = useState("comeback_check_in");
  const [saving, setSaving] = useState(false);

  const pick = (k: string) => {
    const d = COMEBACK_DRAFTS.find((x) => x.key === k)!;
    setDraftKey(k);
    setBody(d.body);
    setName(`comeback_${d.key}`);
  };

  // What the customer will actually see, with the variables filled in.
  const rendered = body
    .replace(/\{\{1\}\}/g, "Priya")
    .replace(/\{\{2\}\}/g, storeName || "our place")
    .replace(/\{\{3\}\}/g, "₹75");

  const submit = async () => {
    const clean = slugify(name);
    if (!clean) return toast.error("Give the template a name");
    const nVars = variableCount(body);
    if (nVars === 0) return toast.error("Keep at least {{1}} so the message uses their name");

    // Meta wants one example value per placeholder, in order.
    const examples = ["Priya", storeName || "our place", "₹75"].slice(0, nVars);

    const components: any[] = [
      { type: "BODY", text: body, example: { body_text: [examples] } },
    ];
    if (draft.footer) components.push({ type: "FOOTER", text: draft.footer });

    // One button TYPE per template — never a URL and a quick-reply together (see
    // the note at the top of this file). The opt-out route differs accordingly.
    // A dynamic button's URL ends in {{1}} and Meta requires a sample value; the
    // real per-recipient suffix is filled in at send time by the dispatcher.
    const buttons: any[] = !draft.includeMenuButton || !username
      ? [{ type: "QUICK_REPLY", text: "Stop these messages" }]
      : draft.personalLink
        ? [{
            type: "URL",
            text: "Open my menu",
            url: COMEBACK_BUTTON_BASE,
            example: [`https://menuthere.com/${username}?olt=abc123`],
          }]
        : [{ type: "URL", text: "See the menu", url: `https://menuthere.com/${username}` }];
    components.push({ type: "BUTTONS", buttons });

    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          name: clean,
          language: "en",
          category: "MARKETING",
          components,
          phoneNumberId: phoneNumberId || undefined,
        }),
      }).then((r) => r.json());

      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Sent to WhatsApp for approval — usually a few minutes.");
      onOpenChange(false);
      // Tell the caller whether this template carries a dynamic button, so the
      // settings row records which button index to fill at send time.
      onCreated(draft.personalLink ? 0 : null);
    } catch {
      toast.error("Couldn't create the template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Write your comeback message</DialogTitle>
          <DialogDescription>
            WhatsApp has to approve marketing messages before they can be sent. Pick a
            starting point, edit it however you like, and we&apos;ll submit it — approval
            usually takes a few minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {COMEBACK_DRAFTS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => pick(d.key)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  draftKey === d.key
                    ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30"
                    : "hover:border-muted-foreground/40"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {draftKey === d.key && <Check className="h-3.5 w-3.5 text-orange-600" />}
                  {d.label}
                </span>
              </button>
            ))}
          </div>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            {draft.rationale}
          </p>

          <div>
            <Label className="text-sm">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className="mt-1.5 font-mono text-sm"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              <code>{"{{1}}"}</code> is the customer&apos;s name, <code>{"{{2}}"}</code> your
              store name{draft.key === "thank_you_offer" ? <>, <code>{"{{3}}"}</code> the offer</> : null}.
            </p>
          </div>

          {/* What it actually looks like on the phone. */}
          <div>
            <Label className="text-sm">Preview</Label>
            <div className="mt-1.5 rounded-lg bg-[#e5ddd5] p-4 dark:bg-neutral-800">
              <div className="max-w-sm rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-700">
                <p className="whitespace-pre-wrap text-sm">{rendered}</p>
                {draft.footer && (
                  <p className="mt-2 text-[11px] text-muted-foreground">{draft.footer}</p>
                )}
                <div className="mt-2 space-y-1 border-t pt-2">
                  <p className="text-center text-sm text-blue-600">
                    {!draft.includeMenuButton || !username
                      ? "Stop these messages"
                      : draft.personalLink
                        ? "Open my menu"
                        : "See the menu"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm">Template name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              placeholder="comeback_check_in"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Only you see this. Lowercase letters, numbers and underscores.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
