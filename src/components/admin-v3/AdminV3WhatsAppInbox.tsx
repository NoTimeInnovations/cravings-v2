"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { cn } from "@/lib/utils";
import { AdminV3Button, V3Card } from "./ui/primitives";

/**
 * /admin-v3 → WhatsApp → Inbox.
 *
 * Same data path as admin-v2's inbox, deliberately unchanged: one Hasura
 * subscription over the partner's whole `whatsapp_messages` window, bucketed
 * into conversations client-side, plus the three REST routes
 * (`/api/whatsapp/inbox/{send,read,delete-chat}`) and the templates list. The
 * only thing rewritten here is the surface.
 *
 * Two things the design shows that v2 did not, both computed from real rows and
 * nothing invented:
 *  - the footer count ("N conversations · M waiting on you") — unread threads;
 *  - the 24-hour service window in the thread header, derived from the newest
 *    INBOUND message. Outside it Meta only accepts templates, which is exactly
 *    what the Template button is for, so the state is worth naming.
 */

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
  /** The number the customer LAST messaged — replies must go back out from it. */
  inbound_phone_number_id: string | null;
}

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
  // Messages arrive desc, so the first sighting of a phone is its latest
  // activity; later ones only bump the unread count.
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
        inbound_phone_number_id:
          m.direction === "in" ? m.phone_number_id ?? null : null,
      });
    } else {
      if (!existing.contact_name && m.contact_name) {
        existing.contact_name = m.contact_name;
      }
      if (m.direction === "in" && !m.is_read) existing.unread += 1;
      if (
        !existing.inbound_phone_number_id &&
        m.direction === "in" &&
        m.phone_number_id
      ) {
        existing.inbound_phone_number_id = m.phone_number_id;
      }
    }
  }
  return [...byPhone.values()];
}

/** List column: time today, else "5 Aug". */
function formatListTime(iso: string): string {
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

/** Bubble footer: "3 Aug · 6:12 PM". */
function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function initials(name: string | null, phone: string): string {
  const source = (name || "").trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    if (letters.trim()) return letters.toUpperCase();
  }
  return phone.slice(-2);
}

const STATUS_LABEL: Record<string, string> = {
  queued: "sending",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** The Meta 24-hour service window, from the newest inbound in this thread. */
function describeWindow(thread: Message[]): string {
  let newestInbound = 0;
  for (const m of thread) {
    if (m.direction !== "in") continue;
    const t = new Date(m.created_at).getTime();
    if (t > newestInbound) newestInbound = t;
  }
  if (!newestInbound) return "no reply window — template only";
  const left = newestInbound + WINDOW_MS - Date.now();
  if (left <= 0) return "24h window closed — template only";
  const hours = Math.floor(left / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h left in 24h window`;
  return `${Math.max(1, Math.round(left / 60000))}m left in 24h window`;
}

/* --------------------------------------------------------------- the screen */

export function AdminV3WhatsAppInbox({ onBack }: { onBack?: () => void } = {}) {
  const { userData } = useAuthStore();
  const partnerId = (userData as { id?: string } | undefined)?.id;

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [newConvOpen, setNewConvOpen] = React.useState(false);
  const [connected, setConnected] = React.useState<boolean | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [numbers, setNumbers] = React.useState<
    Array<{
      id: string;
      phone_number_id: string;
      display_phone: string | null;
      is_primary: boolean;
    }>
  >([]);
  const [accountFilter, setAccountFilter] = React.useState<string>("all");

  const threadEndRef = React.useRef<HTMLDivElement | null>(null);

  // Connection state, so the empty case can point back at Settings instead of
  // looking like an inbox that simply never receives anything.
  React.useEffect(() => {
    if (!partnerId) return;
    fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`)
      .then((r) => r.json())
      .then((d) => {
        setConnected(!!d.connected);
        setNumbers(Array.isArray(d.integrations) ? d.integrations : []);
      })
      .catch(() => setConnected(false));
  }, [partnerId]);

  React.useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    const unsub = subscribeToHasura({
      query: SUB_ALL_MESSAGES,
      variables: { partner_id: partnerId },
      onNext: (payload: { data?: { whatsapp_messages?: Message[] } }) => {
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

  // Legacy rows carry no phone_number_id and therefore only appear under "all".
  const accountMessages = React.useMemo(
    () =>
      accountFilter === "all"
        ? messages
        : messages.filter((m) => m.phone_number_id === accountFilter),
    [messages, accountFilter],
  );

  const conversations = React.useMemo(
    () => buildConversations(accountMessages),
    [accountMessages],
  );

  const filteredConversations = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.contact_name || ""} ${c.contact_phone}`.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const waiting = React.useMemo(
    () => conversations.filter((c) => c.unread > 0).length,
    [conversations],
  );

  const thread = React.useMemo(() => {
    if (!selected) return [];
    return accountMessages
      .filter((m) => m.contact_phone === selected)
      .slice()
      .reverse();
  }, [accountMessages, selected]);

  const selectedConv = React.useMemo(
    () => conversations.find((c) => c.contact_phone === selected),
    [conversations, selected],
  );

  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, selected]);

  // Mark inbound read on open, scoped to the active account so the same
  // customer's badge on another number is left alone.
  React.useEffect(() => {
    if (!partnerId || !selected) return;
    const hasUnread = accountMessages.some(
      (m) => m.contact_phone === selected && m.direction === "in" && !m.is_read,
    );
    if (!hasUnread) return;
    fetch("/api/whatsapp/inbox/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        contactPhone: selected,
        phoneNumberId: accountFilter !== "all" ? accountFilter : null,
      }),
    }).catch(() => {});
  }, [partnerId, selected, accountFilter, accountMessages]);

  const sendFrom = () =>
    (accountFilter !== "all"
      ? accountFilter
      : selectedConv?.inbound_phone_number_id) || null;

  const handleSend = async () => {
    if (!partnerId || !selected) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch("/api/whatsapp/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          to: selected,
          text,
          sendFromPhoneNumberId: sendFrom(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Send failed");
        setDraft(text); // keep it so they can edit and retry
      }
    } catch (e) {
      toast.error((e as Error)?.message || "Send failed");
      setDraft(text);
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
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to delete chat");
    } finally {
      setDeleting(false);
    }
  };

  const handleSendTemplate = async (payload: TemplateSendPayload) => {
    if (!partnerId || !selected) return false;
    try {
      const res = await fetch("/api/whatsapp/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          to: selected,
          template: payload,
          sendFromPhoneNumberId: sendFrom(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to send template");
        return false;
      }
      setTemplateOpen(false);
      return true;
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to send template");
      return false;
    }
  };

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1">
      {/* ------------------------------------------------------------ header */}
      <div className="flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 px-[clamp(14px,3vw,28px)] py-3 dark:border-zinc-800">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to WhatsApp"
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </button>
        )}
        <div className="min-w-0 flex-[1_1_200px]">
          <h1 className="m-0 text-[16px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Inbox
          </h1>
          <p className="mt-[3px] text-[12.5px] leading-none text-zinc-500 dark:text-zinc-400">
            Conversations on your connected number
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AdminV3Button
            variant="primary"
            className="h-[34px] px-3.5"
            disabled={!connected}
            onClick={() => setNewConvOpen(true)}
          >
            <Plus size={15} strokeWidth={2} />
            New chat
          </AdminV3Button>
        </div>
      </div>

      {/* -------------------------------------------------------------- body */}
      <div className="flex flex-col gap-3.5 pb-5 pt-3.5 lg:min-h-0 lg:flex-1 lg:px-[clamp(14px,3vw,28px)]">
        {connected === false && (
          <div className="mx-0 flex items-start gap-2 border-y border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900 dark:bg-amber-950 lg:rounded-xl lg:border">
            <AlertCircle
              size={16}
              className="mt-px flex-none text-amber-600 dark:text-amber-400"
            />
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-semibold leading-tight text-amber-900 dark:text-amber-300">
                Connect your WhatsApp Business account
              </p>
              <p className="mt-1 text-[12.5px] leading-tight text-amber-800 dark:text-amber-400/80">
                Open Settings → WhatsApp Business and click Connect WhatsApp
                Business. Until then this inbox stays empty.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-stretch gap-3.5 lg:min-h-0 lg:flex-1 lg:flex-nowrap">
          {/* -------------------------------------------- conversation list */}
          <V3Card
            className={cn(
              "min-w-0 flex-[1_1_280px] flex-col overflow-hidden lg:flex lg:h-full lg:max-w-[380px]",
              "h-[calc(100dvh-16rem)] min-h-[380px] lg:h-auto lg:min-h-0",
              selected ? "hidden lg:flex" : "flex",
            )}
          >
            <div className="shrink-0 space-y-2 border-b border-zinc-100 px-3.5 py-3 dark:border-zinc-800">
              {numbers.length > 1 && (
                <select
                  value={accountFilter}
                  onChange={(e) => {
                    setAccountFilter(e.target.value);
                    // The open thread may not exist under the new account.
                    setSelected(null);
                  }}
                  className="h-[34px] w-full rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] leading-none text-zinc-950 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                >
                  <option value="all">All numbers</option>
                  {numbers.map((n) => (
                    <option key={n.phone_number_id} value={n.phone_number_id}>
                      {(n.display_phone || n.phone_number_id) +
                        (n.is_primary ? " · default" : "")}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex h-[34px] items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
                <Search
                  size={15}
                  strokeWidth={1.8}
                  className="flex-none text-zinc-400 dark:text-zinc-500"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or number"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[13px] leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="m-0 text-[13.5px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
                    {search.trim()
                      ? "No conversation matches that."
                      : "No conversations yet."}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-tight text-zinc-400 dark:text-zinc-500">
                    Incoming messages appear here the moment they arrive.
                  </p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const active = selected === c.contact_phone;
                  return (
                    <button
                      key={c.contact_phone}
                      type="button"
                      onClick={() => setSelected(c.contact_phone)}
                      className={cn(
                        "flex w-full items-start gap-[11px] border-b border-l-2 border-zinc-100 px-3.5 py-3 text-left transition-colors dark:border-zinc-800",
                        active
                          ? "border-l-zinc-900 bg-zinc-100 dark:border-l-zinc-50 dark:bg-zinc-800"
                          : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                      )}
                    >
                      <span
                        translate="no"
                        className="notranslate flex h-8 w-8 flex-none items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[11px] font-semibold leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {initials(c.contact_name, c.contact_phone)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span
                            translate="no"
                            className={cn(
                              "notranslate min-w-0 flex-1 truncate text-[13px] leading-none text-zinc-950 dark:text-zinc-50",
                              c.unread > 0 ? "font-semibold" : "font-medium",
                            )}
                          >
                            {c.contact_name || `+${c.contact_phone}`}
                          </span>
                          <span className="flex-none text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                            {formatListTime(c.last_at)}
                          </span>
                        </span>
                        <span
                          translate="no"
                          className={cn(
                            "notranslate mt-[3px] block truncate text-[12.5px] leading-[1.35]",
                            c.unread > 0
                              ? "text-zinc-700 dark:text-zinc-300"
                              : "text-zinc-400 dark:text-zinc-500",
                          )}
                        >
                          {c.last_direction === "out" ? "You: " : ""}
                          {c.last_body || "(no text)"}
                        </span>
                        <span
                          translate="no"
                          className="notranslate mt-[3px] block text-[12px] leading-none text-zinc-400 tabular-nums dark:text-zinc-500"
                        >
                          +{c.contact_phone}
                        </span>
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-zinc-900 px-[5px] text-[10.5px] font-semibold leading-none text-white dark:bg-zinc-50 dark:text-zinc-900">
                          {c.unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="shrink-0 bg-zinc-50 px-3.5 py-[11px] text-[12px] leading-none text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
              {loading
                ? "Loading conversations…"
                : `${conversations.length} conversation${
                    conversations.length === 1 ? "" : "s"
                  } · ${waiting} waiting on you`}
            </div>
          </V3Card>

          {/* ------------------------------------------------------ thread */}
          <V3Card
            className={cn(
              "min-w-0 flex-[1_1_420px] flex-col overflow-hidden lg:flex lg:h-full",
              "h-[calc(100dvh-16rem)] min-h-[380px] lg:h-auto lg:min-h-0",
              selected ? "flex" : "hidden lg:flex",
            )}
          >
            {!selected ? (
              <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                <div>
                  <p className="m-0 text-[13.5px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
                    Select a conversation
                  </p>
                  <p className="mt-1 text-[12.5px] leading-tight text-zinc-400 dark:text-zinc-500">
                    Its full message history opens here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 flex-wrap items-center gap-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Back to conversations"
                    className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 lg:hidden"
                  >
                    <ArrowLeft size={15} strokeWidth={1.8} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      translate="no"
                      className="notranslate truncate text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                    >
                      {selectedConv?.contact_name || `+${selected}`}
                    </div>
                    <div
                      translate="no"
                      className="notranslate mt-[3px] truncate text-[12px] leading-none text-zinc-400 tabular-nums dark:text-zinc-500"
                    >
                      +{selected} · {describeWindow(thread)}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        title="Conversation options"
                        className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <MoreVertical size={15} strokeWidth={1.7} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete chat (our side only)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-950">
                  {thread.length === 0 && (
                    <p className="m-auto text-center text-[12.5px] leading-tight text-zinc-400 dark:text-zinc-500">
                      No messages yet. Your first reply starts the thread.
                    </p>
                  )}
                  {thread.map((m) => {
                    const out = m.direction === "out";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex",
                          out ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[min(78%,520px)] px-[13px] py-[11px]",
                            out
                              ? "rounded-[12px_12px_4px_12px] bg-zinc-900 dark:bg-zinc-50"
                              : "rounded-[12px_12px_12px_4px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
                          )}
                        >
                          <div
                            translate="no"
                            className={cn(
                              "notranslate whitespace-pre-wrap break-words text-[13px] leading-[1.55]",
                              out
                                ? "text-zinc-50 dark:text-zinc-900"
                                : "text-zinc-950 dark:text-zinc-50",
                            )}
                          >
                            {m.body || (
                              <span className="italic opacity-70">
                                ({m.type})
                              </span>
                            )}
                          </div>
                          <div
                            className={cn(
                              "mt-1.5 text-right text-[12px] leading-none",
                              out
                                ? "text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-400 dark:text-zinc-500",
                            )}
                          >
                            {formatBubbleTime(m.created_at)}
                            {out && STATUS_LABEL[m.status]
                              ? ` · ${STATUS_LABEL[m.status]}`
                              : ""}
                          </div>
                          {m.error_reason && (
                            <div className="mt-1 text-right text-[11.5px] leading-tight text-red-500">
                              {m.error_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-zinc-100 px-3.5 py-3 dark:border-zinc-800">
                  <AdminV3Button
                    variant="secondary"
                    className="h-[34px] px-3"
                    title="Send an approved template (works outside the 24h window)"
                    onClick={() => setTemplateOpen(true)}
                  >
                    <FileText
                      size={15}
                      strokeWidth={1.7}
                      className="text-zinc-500 dark:text-zinc-400"
                    />
                    Template
                  </AdminV3Button>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                    placeholder="Type a message…"
                    className="h-9 w-auto min-w-0 flex-[1_1_200px] rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] leading-none text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  />
                  <AdminV3Button
                    variant="primary"
                    title="Send"
                    aria-label="Send"
                    className="h-[34px] w-[38px] px-0"
                    disabled={sending || !draft.trim()}
                    onClick={handleSend}
                  >
                    {sending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} strokeWidth={1.7} />
                    )}
                  </AdminV3Button>
                </div>
              </>
            )}
          </V3Card>
        </div>
      </div>

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

/* ------------------------------------------------------------ shared inputs */

const FIELD_CLASS =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] leading-none text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

/* ------------------------------------------------------------ delete dialog */

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
  const label =
    contactName || (contactPhone ? `+${contactPhone}` : "this contact");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Delete chat?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <p className="m-0 text-[13.5px] leading-[1.5] text-zinc-700 dark:text-zinc-300">
            This permanently clears the chat with{" "}
            <b translate="no" className="notranslate">
              {label}
            </b>{" "}
            from our inbox.
          </p>
          <p className="m-0 text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            The conversation is <b>not</b> deleted from WhatsApp — the recipient
            still has the full history, and anything new they send reappears
            here.
          </p>
        </div>
        <DialogFooter>
          <AdminV3Button
            variant="secondary"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminV3Button>
          <AdminV3Button variant="danger" disabled={deleting} onClick={onConfirm}>
            {deleting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            Delete
          </AdminV3Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------- template picker */

interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  components: unknown;
  status: string;
}

interface TemplateParts {
  bodyText: string;
  bodyVarCount: number;
  headerVarCount: number;
  buttonVarCount: number;
}

export interface TemplateSendPayload {
  name: string;
  language: string;
  bodyText: string;
  parameters: string[];
  headerParams: string[];
  buttonParams: string[];
}

function extractTemplateParts(components: unknown): TemplateParts {
  const list: Array<Record<string, any>> = Array.isArray(components)
    ? (components as Array<Record<string, any>>)
    : [];
  const body = list.find((c) => c?.type === "BODY" || c?.type === "body");
  const header = list.find((c) => c?.type === "HEADER" || c?.type === "header");
  const buttons = list.find(
    (c) => c?.type === "BUTTONS" || c?.type === "buttons",
  );
  const bodyText: string = body?.text || "";
  const countVars = (s: string) =>
    new Set(s.match(/\{\{\d+\}\}/g) || []).size;
  const headerText: string =
    header?.format === "TEXT" || header?.format === "text"
      ? header?.text || ""
      : "";
  // URL buttons can carry one {{1}} placeholder for the dynamic suffix.
  let buttonVarCount = 0;
  if (Array.isArray(buttons?.buttons)) {
    for (const b of buttons.buttons as Array<Record<string, any>>) {
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
  onSend: (payload: TemplateSendPayload) => Promise<boolean>;
}) {
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [bodyParams, setBodyParams] = React.useState<string[]>([]);
  const [headerParams, setHeaderParams] = React.useState<string[]>([]);
  const [buttonParams, setButtonParams] = React.useState<string[]>([]);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
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
        setTemplates(
          all.filter((t) => (t.status || "").toUpperCase() === "APPROVED"),
        );
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open, partnerId]);

  const selectedTemplate = React.useMemo(
    () => templates.find((t) => t.id === selectedId) || null,
    [templates, selectedId],
  );

  const parts = React.useMemo(
    () =>
      selectedTemplate ? extractTemplateParts(selectedTemplate.components) : null,
    [selectedTemplate],
  );

  React.useEffect(() => {
    if (!parts) return;
    setBodyParams(Array(parts.bodyVarCount).fill(""));
    setHeaderParams(Array(parts.headerVarCount).fill(""));
    setButtonParams(Array(parts.buttonVarCount).fill(""));
  }, [parts]);

  const canSend = React.useMemo(() => {
    if (!selectedTemplate || !parts) return false;
    const allFilled = (arr: string[]) => arr.every((v) => v.trim().length > 0);
    return (
      allFilled(bodyParams) && allFilled(headerParams) && allFilled(buttonParams)
    );
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

  const varBlock = (
    title: string,
    count: number,
    values: string[],
    set: (next: string[]) => void,
    keyPrefix: string,
  ) => (
    <div className="space-y-1.5">
      <div className="text-[12.5px] font-semibold leading-none text-zinc-700 dark:text-zinc-300">
        {title}
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <input
          key={`${keyPrefix}-${i}`}
          type="text"
          value={values[i] ?? ""}
          onChange={(e) => {
            const next = [...values];
            next[i] = e.target.value;
            set(next);
          }}
          placeholder={`{{${i + 1}}}`}
          className={FIELD_CLASS}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Send a template
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : templates.length === 0 ? (
          <p className="py-8 text-center text-[13px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            No approved templates yet. Create one in Settings → WhatsApp Business
            and wait for Meta to approve it.
          </p>
        ) : !selectedTemplate ? (
          <ul className="max-h-[50vh] list-none overflow-y-auto rounded-md border border-zinc-200 p-0 dark:border-zinc-800">
            {templates.map((t) => {
              const tp = extractTemplateParts(t.components);
              return (
                <li
                  key={t.id}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className="w-full px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        translate="no"
                        className="notranslate truncate text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50"
                      >
                        {t.name}
                      </span>
                      <span className="flex-none text-[11px] uppercase leading-none text-zinc-400 dark:text-zinc-500">
                        {t.category} · {t.language}
                      </span>
                    </div>
                    {tp.bodyText && (
                      <div
                        translate="no"
                        className="notranslate mt-1.5 line-clamp-2 whitespace-pre-wrap text-[12.5px] leading-[1.45] text-zinc-500 dark:text-zinc-400"
                      >
                        {tp.bodyText}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div
                  translate="no"
                  className="notranslate truncate text-[13.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50"
                >
                  {selectedTemplate.name}
                </div>
                <div className="mt-1 text-[11px] uppercase leading-none text-zinc-400 dark:text-zinc-500">
                  {selectedTemplate.category} · {selectedTemplate.language}
                </div>
              </div>
              <AdminV3Button
                variant="small"
                onClick={() => setSelectedId(null)}
              >
                Change
              </AdminV3Button>
            </div>

            {parts?.bodyText && (
              <div
                translate="no"
                className="notranslate whitespace-pre-wrap rounded-md bg-zinc-100 p-2.5 text-[12.5px] leading-[1.5] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {parts.bodyText}
              </div>
            )}

            {parts && parts.headerVarCount > 0 &&
              varBlock(
                "Header variables",
                parts.headerVarCount,
                headerParams,
                setHeaderParams,
                "h",
              )}
            {parts && parts.bodyVarCount > 0 &&
              varBlock(
                "Body variables",
                parts.bodyVarCount,
                bodyParams,
                setBodyParams,
                "b",
              )}
            {parts && parts.buttonVarCount > 0 &&
              varBlock(
                "Button URL variables",
                parts.buttonVarCount,
                buttonParams,
                setButtonParams,
                "btn",
              )}
          </div>
        )}

        <DialogFooter>
          <AdminV3Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </AdminV3Button>
          {selectedTemplate && (
            <AdminV3Button
              variant="strong"
              disabled={!canSend || sending}
              onClick={handleSubmit}
            >
              {sending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Send
            </AdminV3Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------- new conversation */

function NewConversationDialog({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (phone: string) => void;
}) {
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    if (!open) setPhone("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            New conversation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <input
            type="text"
            value={phone}
            autoFocus
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className={FIELD_CLASS}
          />
          <p className="m-0 text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            Include the country code. A first outbound to a new number only lands
            if they messaged you within the last 24 hours — otherwise Meta rejects
            it and you need a template.
          </p>
        </div>
        <DialogFooter>
          <AdminV3Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </AdminV3Button>
          <AdminV3Button
            variant="strong"
            disabled={!phone.trim()}
            onClick={() => onStart(phone)}
          >
            Open
          </AdminV3Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
