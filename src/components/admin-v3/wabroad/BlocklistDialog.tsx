"use client";

import * as React from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { AdminV3Button } from "../ui/primitives";
import { fmtTime, INPUT } from "./shared";

interface OptOutRow {
  id?: string;
  phone: string;
  reason: string | null;
  created_at?: string;
}

/**
 * Per-partner blocklist — the numbers excluded from every broadcast (auto-added
 * when a customer replies STOP, or added by hand here).
 *
 * Same three calls admin-v2 makes: GET/POST/DELETE `/api/whatsapp/optouts`.
 */
export function BlocklistDialog({
  open,
  onOpenChange,
  partnerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partnerId?: string;
}) {
  const [rows, setRows] = React.useState<OptOutRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [newPhone, setNewPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(
    async (q = "") => {
      if (!partnerId) return;
      setLoading(true);
      try {
        const url = `/api/whatsapp/optouts?partnerId=${partnerId}${
          q ? `&search=${encodeURIComponent(q)}` : ""
        }`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        setRows(data.optouts || []);
        setTotal(data.total || 0);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load blocklist");
      } finally {
        setLoading(false);
      }
    },
    [partnerId],
  );

  React.useEffect(() => {
    if (open) {
      setSearch("");
      load("");
    }
  }, [open, load]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, open, load]);

  const add = async () => {
    const phone = newPhone.trim();
    if (!phone || !partnerId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/optouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add");
      toast.success(
        data.alreadyBlocked ? "Already on the blocklist" : "Number blocked",
      );
      setNewPhone("");
      load(search.trim());
    } catch (e: any) {
      toast.error(e?.message || "Failed to add");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (phone: string) => {
    if (!partnerId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/optouts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to remove");
      toast.success("Unblocked — they can receive broadcasts again");
      load(search.trim());
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Blocklist{" "}
            <span className="text-[13px] font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
              ({total})
            </span>
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            Customers who replied STOP, plus numbers you add here, are never sent
            any broadcast — they are excluded automatically at send time. A
            customer can rejoin on their own by replying START.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <input
            className={INPUT}
            placeholder="Block a number (with country code, e.g. 919633440123)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <AdminV3Button
            variant="primary"
            className="h-9 shrink-0 px-3"
            onClick={add}
            disabled={busy || !newPhone.trim()}
            aria-label="Block this number"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} strokeWidth={2} />
            )}
          </AdminV3Button>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          />
          <input
            className={cn(INPUT, "pl-8")}
            placeholder="Search blocked numbers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-[13px] text-zinc-500 dark:text-zinc-400">
              <Loader2 size={15} className="animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
              {search ? "No matches." : "No blocked numbers yet."}
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id || r.phone}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div
                    className="truncate font-mono text-[12.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                    translate="no"
                  >
                    {r.phone}
                  </div>
                  <div className="mt-1 text-[11.5px] leading-none text-zinc-500 dark:text-zinc-400">
                    {r.reason === "STOP" ? "Replied STOP" : "Added manually"}
                    {r.created_at ? ` · ${fmtTime(r.created_at)}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.phone)}
                  disabled={busy}
                  title="Unblock"
                  aria-label={`Unblock ${r.phone}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                >
                  <X size={15} strokeWidth={1.9} />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
