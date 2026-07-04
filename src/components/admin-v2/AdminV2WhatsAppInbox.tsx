"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquare,
  ChevronLeft,
  Send,
  Plus,
  CheckCheck,
  Check,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeft,
  MoreVertical,
  Trash2,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  direction: "in" | "out";
  contact_phone: string;
  contact_name: string | null;
  type: string;
  body: string | null;
  media_url: string | null;
  wa_message_id: string | null;
  status: string;
  error_reason: string | null;
  is_read: boolean;
  created_at: string;
  phone_number_id: string | null;
}

interface Conversation {
  contact_phone: string;
  contact_name: string | null;
  last_body: string | null;
  last_direction: "in" | "out";
  last_at: string;
  unread: number;
  // The number the customer LAST messaged — replies must go back out from it.
  inbound_phone_number_id: string | null;
}

// Hasura subscription — every message for this partner, newest first. We
// pull a large window in one shot and bucket client-side rather than
// running a separate "conversations" subscription, so inbound + outbound
// updates the right thread automatically.
const SUB_ALL_MESSAGES = `
  subscription PartnerInbox($partner_id: uuid!) {
    whatsapp_messages(
      where: { partner_id: { _eq: $partner_id } }
      order_by: { created_at: desc }
      limit: 1000
    ) {
      id
      direction
      contact_phone
      contact_name
      type
      body
      media_url
      wa_message_id
      status
      error_reason
      is_read
      created_at
      phone_number_id
    }
  }
`;

function buildConversations(messages: Message[]): Conversation[] {
  const byPhone = new Map<string, Conversation>();
  // Messages are already sorted desc, so the first time we see a phone is
  // its latest activity. Subsequent entries just bump the unread count.
  for (const m of messages) {
    const existing = byPhone.get(m.contact_phone);
    if (!existing) {
      byPhone.set(m.contact_phone, {
        contact_phone: m.contact_phone,
        contact_name: m.contact_name,
        last_body: m.body,
        last_direction: m.direction,
        last_at: m.created_at,
        unread: m.direction === "in" && !m.is_read ? 1 : 0,
        // First inbound we encounter (desc order) is the latest inbound → the
        // number the customer last messaged, which the reply must use.
        inbound_phone_number_id:
          m.direction === "in" ? m.phone_number_id ?? null : null,
      });
    } else {
      if (!existing.contact_name && m.contact_name) {
        existing.contact_name = m.contact_name;
      }
      if (m.direction === "in" && !m.is_read) existing.unread += 1;
      if (!existing.inbound_phone_number_id && m.direction === "in" && m.phone_number_id) {
        existing.inbound_phone_number_id = m.phone_number_id;
      }
    }
  }
  return [...byPhone.values()];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function statusIcon(status: string) {
  switch (status) {
    case "queued":
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

export function AdminV2WhatsAppInbox({ onBack }: { onBack?: () => void } = {}) {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Resolve connection state once so the empty state shows a helpful
  // pointer back to Settings if the partner hasn't connected a WABA.
  useEffect(() => {
    if (!partnerId) return;
    fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`)
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, [partnerId]);

  // Live subscription. Re-renders both the conversation list and the
  // open thread on every change.
  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    const unsub = subscribeToHasura({
      query: SUB_ALL_MESSAGES,
      variables: { partner_id: partnerId },
      onNext: (payload: any) => {
        setMessages(payload?.data?.whatsapp_messages || []);
        setLoading(false);
      },
      onError: (err) => {
        console.error("Inbox subscription error:", err);
        setLoading(false);
        toast.error("Inbox connection lost — refresh to reconnect.");
      },
    });
    return () => {
      try {
        unsub?.();
      } catch {}
    };
  }, [partnerId]);

  const conversations = useMemo(() => buildConversations(messages), [messages]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const hay = `${c.contact_name || ""} ${c.contact_phone}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, search]);

  // Thread = messages for the selected contact, oldest first so the
  // composer at the bottom always shows the latest reply.
  const thread = useMemo(() => {
    if (!selected) return [];
    return messages
      .filter((m) => m.contact_phone === selected)
      .slice()
      .reverse();
  }, [messages, selected]);

  // Auto-scroll thread to bottom on new message + when switching threads.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, selected]);

  // Mark inbound messages as read whenever the partner opens a thread.
  useEffect(() => {
    if (!partnerId || !selected) return;
    const hasUnread = messages.some(
      (m) => m.contact_phone === selected && m.direction === "in" && !m.is_read,
    );
    if (!hasUnread) return;
    fetch("/api/whatsapp/inbox/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, contactPhone: selected }),
    }).catch(() => {});
  }, [partnerId, selected, messages]);

  const handleSend = async () => {
    if (!partnerId || !selected) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const optimistic = text;
    setDraft("");
    try {
      const res = await fetch("/api/whatsapp/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          to: selected,
          text: optimistic,
          sendFromPhoneNumberId: selectedConv?.inbound_phone_number_id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Send failed");
        // Keep what they typed so they can edit + retry.
        setDraft(optimistic);
      }
    } catch (e: any) {
      toast.error(e?.message || "Send failed");
      setDraft(optimistic);
    } finally {
      setSending(false);
    }
  };

  const handleStartNew = (phone: string) => {
    const normalized = phone.replace(/[^0-9]/g, "");
    if (normalized.length < 8) {
      toast.error("Enter a valid phone number with country code");
      return;
    }
    setSelected(normalized);
    setNewConvOpen(false);
  };

  const handleDeleteChat = async () => {
    if (!partnerId || !selected) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/whatsapp/inbox/delete-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, contactPhone: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to delete chat");
        return;
      }
      toast.success(
        `Cleared ${data?.deleted ?? 0} messages on our side. WhatsApp history is unaffected.`,
      );
      setDeleteOpen(false);
      setSelected(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete chat");
    } finally {
      setDeleting(false);
    }
  };

  const handleSendTemplate = async (payload: {
    name: string;
    language: string;
    bodyText: string;
    parameters: string[];
    headerParams: string[];
    buttonParams: string[];
  }): Promise<boolean> => {
    if (!partnerId || !selected) return false;
    try {
      const res = await fetch("/api/whatsapp/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          to: selected,
          template: payload,
          sendFromPhoneNumberId: selectedConv?.inbound_phone_number_id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to send template");
        return false;
      }
      setTemplateOpen(false);
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Failed to send template");
      return false;
    }
  };

  const selectedConv = useMemo(
    () => conversations.find((c) => c.contact_phone === selected),
    [conversations, selected],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-7xl mx-auto -mt-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 mb-1 flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> WhatsApp
            </button>
          )}
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-600" />
            WhatsApp Inbox
          </h1>
          <p className="text-xs text-muted-foreground">
            Conversations on your connected WhatsApp Business number.
          </p>
        </div>
        <Button
          onClick={() => setNewConvOpen(true)}
          disabled={!connected}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" /> New
        </Button>
      </div>

      {connected === false && (
        <Card className="border-amber-200 bg-amber-50/60 p-3 mb-3 flex gap-2 items-start">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-xs">
            <div className="font-medium text-amber-900">
              Connect your WhatsApp Business Account
            </div>
            <div className="text-amber-800/80">
              Open Settings → WhatsApp Business and click <b>Connect WhatsApp Business</b>.
            </div>
          </div>
        </Card>
      )}

      <Card className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT: conversation list */}
        <div
          className={cn(
            "w-full sm:w-80 sm:border-r flex flex-col",
            selected ? "hidden sm:flex" : "flex",
          )}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or number"
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-10 px-4">
                No conversations yet. Incoming messages will appear here.
              </div>
            ) : (
              filteredConversations.map((c) => (
                <button
                  key={c.contact_phone}
                  onClick={() => setSelected(c.contact_phone)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b transition hover:bg-muted/60 flex flex-col gap-0.5",
                    selected === c.contact_phone && "bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {c.contact_name || `+${c.contact_phone}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(c.last_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {c.last_direction === "out" ? "You: " : ""}
                      {c.last_body || "(no text)"}
                    </span>
                    {c.unread > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center text-[10px] font-semibold rounded-full bg-green-600 text-white px-1.5 min-w-5 h-5">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  {c.contact_name && (
                    <span className="text-[10px] text-muted-foreground">
                      +{c.contact_phone}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: thread */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            !selected && "hidden sm:flex",
          )}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="sm:hidden -ml-2"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {selectedConv?.contact_name || `+${selected}`}
                  </div>
                  {selectedConv?.contact_name && (
                    <div className="text-[10px] text-muted-foreground">+{selected}</div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete chat (our side only)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#efeae2] dark:bg-[#0b141a] p-4 space-y-1">
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.direction === "out" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-lg px-3 py-2 shadow-sm text-sm",
                        m.direction === "out"
                          ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground"
                          : "bg-white dark:bg-[#202c33] text-foreground",
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {m.body || (
                          <span className="italic text-muted-foreground">
                            ({m.type})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground">
                        <span>{formatTime(m.created_at)}</span>
                        {m.direction === "out" && statusIcon(m.status)}
                      </div>
                      {m.error_reason && (
                        <div className="text-[10px] text-red-600 mt-1">
                          {m.error_reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>

              <div className="border-t p-2 flex gap-2 items-end bg-background">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplateOpen(true)}
                  className="shrink-0"
                  title="Send an approved template (works outside the 24h window)"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Template
                </Button>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  className="resize-none min-h-[40px] max-h-32"
                  disabled={sending}
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                  size="sm"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <NewConversationDialog
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        onStart={handleStartNew}
      />

      <DeleteChatDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        contactName={selectedConv?.contact_name || null}
        contactPhone={selected}
        onConfirm={handleDeleteChat}
        deleting={deleting}
      />

      <TemplatePickerDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        partnerId={partnerId}
        onSend={handleSendTemplate}
      />
    </div>
  );
}

function DeleteChatDialog({
  open,
  onOpenChange,
  contactName,
  contactPhone,
  onConfirm,
  deleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string | null;
  contactPhone: string | null;
  onConfirm: () => void;
  deleting: boolean;
}) {
  const label = contactName || (contactPhone ? `+${contactPhone}` : "this contact");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete chat?</DialogTitle>
        </DialogHeader>
        <div className="text-sm space-y-2 py-1">
          <p>
            This permanently clears the chat with <b>{label}</b> from our
            inbox.
          </p>
          <p className="text-xs text-muted-foreground">
            The conversation will <b>not</b> be deleted from WhatsApp — the
            recipient still has the full history, and any new messages they send
            will reappear here.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  components: any;
  status: string;
}

interface TemplateParts {
  bodyText: string;
  bodyVarCount: number;
  headerVarCount: number;
  buttonVarCount: number;
}

function extractTemplateParts(components: any): TemplateParts {
  const list: any[] = Array.isArray(components) ? components : [];
  const body = list.find((c) => c?.type === "BODY" || c?.type === "body");
  const header = list.find((c) => c?.type === "HEADER" || c?.type === "header");
  const buttons = list.find((c) => c?.type === "BUTTONS" || c?.type === "buttons");
  const bodyText: string = body?.text || "";
  const countVars = (s: string) => {
    const matches = s.match(/\{\{\d+\}\}/g) || [];
    return new Set(matches).size;
  };
  const headerText: string = header?.format === "TEXT" || header?.format === "text"
    ? header?.text || ""
    : "";
  // URL buttons can have one {{1}} placeholder for the dynamic suffix.
  let buttonVarCount = 0;
  if (Array.isArray(buttons?.buttons)) {
    for (const b of buttons.buttons) {
      if ((b?.type === "URL" || b?.type === "url") && typeof b?.url === "string") {
        buttonVarCount += countVars(b.url);
      }
    }
  }
  return {
    bodyText,
    bodyVarCount: countVars(bodyText),
    headerVarCount: countVars(headerText),
    buttonVarCount,
  };
}

function TemplatePickerDialog({
  open,
  onOpenChange,
  partnerId,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string | undefined;
  onSend: (payload: {
    name: string;
    language: string;
    bodyText: string;
    parameters: string[];
    headerParams: string[];
    buttonParams: string[];
  }) => Promise<boolean>;
}) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [headerParams, setHeaderParams] = useState<string[]>([]);
  const [buttonParams, setButtonParams] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Reset state every time the dialog closes — keeps inputs clean across sends.
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setBodyParams([]);
      setHeaderParams([]);
      setButtonParams([]);
      return;
    }
    if (!partnerId) return;
    setLoading(true);
    fetch(`/api/whatsapp/templates?partnerId=${partnerId}`)
      .then((r) => r.json())
      .then((d) => {
        const all: TemplateRow[] = Array.isArray(d?.templates) ? d.templates : [];
        // Only APPROVED templates can actually be sent via Meta.
        const approved = all.filter(
          (t) => (t.status || "").toUpperCase() === "APPROVED",
        );
        setTemplates(approved);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open, partnerId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) || null,
    [templates, selectedId],
  );

  const parts = useMemo(
    () =>
      selectedTemplate
        ? extractTemplateParts(selectedTemplate.components)
        : null,
    [selectedTemplate],
  );

  useEffect(() => {
    if (!parts) return;
    setBodyParams(Array(parts.bodyVarCount).fill(""));
    setHeaderParams(Array(parts.headerVarCount).fill(""));
    setButtonParams(Array(parts.buttonVarCount).fill(""));
  }, [parts]);

  const canSend = useMemo(() => {
    if (!selectedTemplate || !parts) return false;
    const allFilled = (arr: string[]) => arr.every((v) => v.trim().length > 0);
    return allFilled(bodyParams) && allFilled(headerParams) && allFilled(buttonParams);
  }, [selectedTemplate, parts, bodyParams, headerParams, buttonParams]);

  const handleSubmit = async () => {
    if (!selectedTemplate || !parts) return;
    setSending(true);
    try {
      await onSend({
        name: selectedTemplate.name,
        language: selectedTemplate.language,
        bodyText: parts.bodyText,
        parameters: bodyParams,
        headerParams,
        buttonParams,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send a template</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No approved templates yet. Create one in Settings → WhatsApp
            Business and wait for Meta to approve it.
          </div>
        ) : !selectedTemplate ? (
          <ul className="max-h-[50vh] overflow-y-auto divide-y border rounded-md">
            {templates.map((t) => {
              const tp = extractTemplateParts(t.components);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{t.name}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {t.category} · {t.language}
                      </span>
                    </div>
                    {tp.bodyText && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                        {tp.bodyText}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{selectedTemplate.name}</div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {selectedTemplate.category} · {selectedTemplate.language}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedId(null)}
              >
                Change
              </Button>
            </div>

            {parts?.bodyText && (
              <div className="rounded-md bg-muted/50 p-2 text-xs whitespace-pre-wrap">
                {parts.bodyText}
              </div>
            )}

            {parts && parts.headerVarCount > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Header variables</div>
                {Array.from({ length: parts.headerVarCount }).map((_, i) => (
                  <Input
                    key={`h-${i}`}
                    value={headerParams[i] ?? ""}
                    onChange={(e) => {
                      const next = [...headerParams];
                      next[i] = e.target.value;
                      setHeaderParams(next);
                    }}
                    placeholder={`{{${i + 1}}}`}
                  />
                ))}
              </div>
            )}

            {parts && parts.bodyVarCount > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Body variables</div>
                {Array.from({ length: parts.bodyVarCount }).map((_, i) => (
                  <Input
                    key={`b-${i}`}
                    value={bodyParams[i] ?? ""}
                    onChange={(e) => {
                      const next = [...bodyParams];
                      next[i] = e.target.value;
                      setBodyParams(next);
                    }}
                    placeholder={`{{${i + 1}}}`}
                  />
                ))}
              </div>
            )}

            {parts && parts.buttonVarCount > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Button URL variables</div>
                {Array.from({ length: parts.buttonVarCount }).map((_, i) => (
                  <Input
                    key={`btn-${i}`}
                    value={buttonParams[i] ?? ""}
                    onChange={(e) => {
                      const next = [...buttonParams];
                      next[i] = e.target.value;
                      setButtonParams(next);
                    }}
                    placeholder={`{{${i + 1}}}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedTemplate && (
            <Button
              onClick={handleSubmit}
              disabled={!canSend || sending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewConversationDialog({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (phone: string) => void;
}) {
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!open) setPhone("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Include country code. The first outbound to a new number only works if
            the recipient has messaged your WhatsApp number within the last 24 hours,
            otherwise Meta will reject it.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onStart(phone)}
            disabled={!phone.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
