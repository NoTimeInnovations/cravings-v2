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
  Send,
  Plus,
  CheckCheck,
  Check,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeft,
} from "lucide-react";
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
}

interface Conversation {
  contact_phone: string;
  contact_name: string | null;
  last_body: string | null;
  last_direction: "in" | "out";
  last_at: string;
  unread: number;
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
      });
    } else {
      if (!existing.contact_name && m.contact_name) {
        existing.contact_name = m.contact_name;
      }
      if (m.direction === "in" && !m.is_read) existing.unread += 1;
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

export function AdminV2WhatsAppInbox() {
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
        body: JSON.stringify({ partnerId, to: selected, text: optimistic }),
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

  const selectedConv = useMemo(
    () => conversations.find((c) => c.contact_phone === selected),
    [conversations, selected],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-7xl mx-auto -mt-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
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
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {selectedConv?.contact_name || `+${selected}`}
                  </div>
                  {selectedConv?.contact_name && (
                    <div className="text-[10px] text-muted-foreground">+{selected}</div>
                  )}
                </div>
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
    </div>
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
