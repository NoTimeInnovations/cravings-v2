"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { sendCatalogueToCustomer } from "@/app/actions/whatsappCatalogSend";
import {
  updateCatalogItem,
  setCatalogItemExcluded,
  deleteCatalogItem,
  syncSingleCatalogItem,
} from "@/app/actions/whatsappCatalogItems";
import {
  getCatalogSyncStatus,
  provisionAndSyncCatalog,
  type CatalogStatus,
  type CatalogItemStatus,
} from "@/app/actions/whatsappCatalogProvision";

/**
 * WhatsApp Catalogue — what is published to WhatsApp, what is not, and why.
 *
 * The eligibility rules are NOT reimplemented here: getCatalogSyncStatus runs
 * the same buildCatalogProduct the sync runs, so this screen can never claim an
 * item will sync when it will not.
 *
 * Deliberately honest about the two things we cannot do from code — the
 * catalogue must be linked to the number by hand in WhatsApp Manager, and on a
 * coexistence number that link is unreadable afterwards, so this screen never
 * claims a connection it cannot verify.
 */

const REASON_LABEL: Record<string, string> = {
  no_image: "No photo",
  no_price: "No price",
  no_name: "No name",
  deleted: "Removed from menu",
};

function ItemRow({
  item,
  busy,
  onEdit,
  onToggleExclude,
  onDelete,
  onSync,
}: {
  item: CatalogItemStatus;
  busy: boolean;
  onEdit: () => void;
  onToggleExclude: () => void;
  onDelete: () => void;
  onSync: () => void;
}) {
  const blocked = !!item.reason;
  const badge = item.excluded
    ? { text: "Off WhatsApp", cls: "border-border bg-muted text-muted-foreground" }
    : blocked
      ? {
          text: REASON_LABEL[item.reason as string] ?? item.reason ?? "",
          cls: "border-amber-300 bg-amber-50 text-amber-700",
        }
      : item.syncedAt
        ? { text: "Synced", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" }
        : { text: "Pending", cls: "border-border bg-muted text-muted-foreground" };

  return (
    <div className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className={`h-9 w-9 shrink-0 rounded object-cover ${item.excluded ? "opacity-40" : ""}`}
          loading="lazy"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
          <ImageOff className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${item.excluded ? "text-muted-foreground" : ""}`}>
          {item.name}
        </p>
        {blocked ? (
          <p className="truncate text-xs text-amber-700">{item.reasonText}</p>
        ) : item.excluded ? (
          <p className="truncate text-xs text-muted-foreground">
            Removed from WhatsApp — still on your menu
          </p>
        ) : item.syncedAt ? (
          <p className="truncate text-xs text-muted-foreground">In your WhatsApp catalogue</p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">Not sent yet</p>
        )}
      </div>

      <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
        {badge.text}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {busy ? (
          <Loader2 className="mx-2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            {/* Only offered when it would actually do something: a dish that is
                blocked (no photo, no price) cannot be pushed, and offering the
                button would just produce an error toast. */}
            {!item.excluded && !blocked && !item.syncedAt && (
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Send to WhatsApp" onClick={onSync}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={item.excluded ? "Add back to WhatsApp" : "Remove from WhatsApp"}
              onClick={onToggleExclude}
            >
              {item.excluded ? <Undo2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-600 hover:text-rose-700"
              title="Delete from WhatsApp and your menu"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminV2WhatsAppCatalogue() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sendPhone, setSendPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  /** id of the row currently mid-action, so only that row shows a spinner. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogItemStatus | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  /** Keyed on the URL, so correcting a typo clears the error instead of leaving
   *  the preview permanently hidden (the old code set style.display="none" and
   *  nothing ever set it back). */
  const [badPreviewUrl, setBadPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    setError(null);
    const r = await getCatalogSyncStatus(partnerId);
    if (r.ok) setStatus(r.status);
    else setError(r.message);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSync = async () => {
    if (!partnerId || syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const r = await provisionAndSyncCatalog(partnerId);

      // Unsettled is checked FIRST and independently of `ok`. syncPartnerCatalog
      // returns ok = (failed === 0), and an unsettled run has failed === 0 with
      // pushed === 0 — so it arrives here as ok:true and the old code cheerfully
      // reported "0 items sent to your WhatsApp catalogue" in green. The honesty
      // branch was sitting under `if (!r.ok)`, which that case never takes.
      //
      // Nothing was marked synced, so the correct message is "still working",
      // not success and not failure.
      const unsettled = r.summary?.settled === false;
      if (unsettled) {
        const msg =
          "WhatsApp is still processing your menu — nothing was marked as sent yet. Check back shortly or sync again.";
        toast.info(msg);
        setError(msg);
      } else if (!r.ok) {
        const msg = r.message || "sync failed";
        toast.error(msg);
        setError(msg);
      } else {
        const n = r.summary?.pushed ?? 0;
        if (n === 0) {
          // Settled, nothing failed, nothing pushed: there was nothing eligible
          // to send. Saying "0 items sent" as a success reads like a bug.
          toast.info("Nothing to send — no items are ready for WhatsApp yet.");
        } else {
          toast.success(`${n} item${n === 1 ? "" : "s"} sent to your WhatsApp catalogue`);
        }
      }

      // The basket is a separate per-number setting and can fail on its own —
      // most often a stale partner token. Surfaced as a warning rather than
      // folded into the sync result, because the menu did reach the catalogue
      // and telling the partner the sync failed would be wrong.
      if (r.commerce && !r.commerce.ok) {
        const failed = (r.commerce.results ?? []).filter((c) => !c.ok);
        // Two different shapes of failure, and they must not be mixed: a list of
        // NUMBERS reads as "for +91 …", while a whole-call failure carries a
        // SENTENCE. Interpolating the latter into the former produced
        // "…basket for no connected WhatsApp number for this partner."
        const numbers = failed
          .map((c) => c.displayPhone || c.phoneNumberId)
          .filter(Boolean)
          .join(", ");
        toast.warning(
          numbers
            ? `Couldn't switch on the WhatsApp basket for ${numbers}. Customers will see the catalogue but can't add to a basket.`
            : `Couldn't switch on the WhatsApp basket — ${r.commerce.message || "unknown error"}.`,
        );
      }
    } catch (e) {
      const msg = (e as Error).message || "sync failed";
      toast.error(msg);
      setError(msg);
    } finally {
      setSyncing(false);
      await load();
    }
  };

  const handleSend = async () => {
    if (!partnerId || sending || !sendPhone.trim()) return;
    setSending(true);
    try {
      const r = await sendCatalogueToCustomer(partnerId, sendPhone.trim());
      if (r.ok) {
        const n = r.sent ?? 0;
        toast.success(
          r.eligible && r.eligible > n
            ? `Sent ${n} of your ${r.eligible} dishes (WhatsApp caps a menu message at ${n}).`
            : `Sent ${n} dish${n === 1 ? "" : "es"} to ${sendPhone.trim()}.`,
        );
      } else {
        toast.error(r.message || "Could not send the menu.");
      }
    } catch (e) {
      toast.error((e as Error).message || "Could not send the menu.");
    } finally {
      setSending(false);
    }
  };

  /** Every per-item action shares this: spinner on one row, reload after, and
   *  the action's own message surfaced rather than a generic failure. */
  const runItemAction = async (
    id: string,
    fn: () => Promise<{ ok: boolean; message?: string }>,
    successText: string,
  ) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const r = await fn();
      if (r.ok) toast.success(r.message || successText);
      else toast.error(r.message || "That didn't work.");
    } catch (e) {
      toast.error((e as Error).message || "That didn't work.");
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const openEdit = (item: CatalogItemStatus) => {
    setEditing(item);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
    setEditImage(item.imageUrl ?? "");
    setBadPreviewUrl(null);
  };

  const saveEdit = async () => {
    if (!partnerId || !editing || savingEdit) return;
    setSavingEdit(true);
    try {
      const r = await updateCatalogItem(partnerId, editing.id, {
        name: editName,
        description: editDesc,
        imageUrl: editImage,
      });
      if (r.ok) {
        toast.success(r.message || "Saved.");
        setEditing(null);
        await load();
      } else {
        toast.error(r.message || "Could not save.");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your catalogue…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Could not load your catalogue."}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  const blocked = status.items.filter((i) => i.reason);
  // Search filters the WHOLE list before the 25-row cap, otherwise a dish past
  // row 25 would be unfindable — which is the main reason to have a search box
  // on a 124-item menu at all.
  const q = query.trim().toLowerCase();
  const matched = q
    ? status.items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q),
      )
    : status.items;
  const visible = showAll || q ? matched : matched.slice(0, 25);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ShoppingBag className="h-5 w-5 text-teal-600" /> WhatsApp Catalogue
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish your menu to WhatsApp so customers can browse dishes and build a
          basket without leaving the chat.
        </p>
      </div>

      {!status.enabled && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            WhatsApp Catalogue isn’t switched on for your store yet. Contact support
            to enable it.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold tabular-nums">{status.eligibleCount}</p>
          <p className="text-sm text-muted-foreground">Ready for WhatsApp</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold tabular-nums text-emerald-700">
            {status.syncedCount}
          </p>
          <p className="text-sm text-muted-foreground">Already sent</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p
            className={`text-2xl font-bold tabular-nums ${
              status.ineligibleCount ? "text-amber-700" : ""
            }`}
          >
            {status.ineligibleCount}
          </p>
          <p className="text-sm text-muted-foreground">Need attention</p>
        </div>
        {status.excludedCount > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-2xl font-bold tabular-nums">{status.excludedCount}</p>
            <p className="text-sm text-muted-foreground">Off WhatsApp (by you)</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Button onClick={handleSync} disabled={syncing || !status.enabled || !status.eligibleCount}>
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing…
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Sync {status.eligibleCount} item
              {status.eligibleCount === 1 ? "" : "s"}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Sends every ready dish to WhatsApp. Safe to run any time — it updates
          what’s there rather than duplicating it.
        </p>
      </div>

      {status.catalogId && status.syncedCount > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="font-medium">Send your menu to a customer</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sends a browsable list of dishes straight into the chat. WhatsApp only
            allows this if they’ve messaged you in the last 24 hours.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="tel"
              inputMode="tel"
              value={sendPhone}
              onChange={(e) => setSendPhone(e.target.value)}
              placeholder="Customer’s WhatsApp number"
              className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
            />
            <Button
              variant="outline"
              onClick={handleSend}
              disabled={sending || !sendPhone.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Send menu
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {status.catalogId && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium">Your catalogue exists on WhatsApp.</p>
            <p className="mt-0.5 text-muted-foreground">
              It still has to be connected to your number once, by hand, in WhatsApp
              Manager → Account tools → Catalogue. We can’t do that step for you, and
              we can’t read back whether it’s done — so if customers don’t see the
              catalogue in chat, that’s the thing to check.
            </p>
          </div>
        </div>
      )}

      {blocked.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>
              {blocked.length} dish{blocked.length === 1 ? "" : "es"}
            </strong>{" "}
            can’t go to WhatsApp yet. Most often it’s a missing photo — WhatsApp will
            not list an item without one.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Menu items ({q ? `${matched.length} of ${status.total}` : status.total})
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes"
              className="h-8 w-44 rounded-md border bg-background pl-7 pr-2 text-sm"
            />
          </div>
        </div>
        {status.items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            You have no menu items yet.
          </p>
        ) : visible.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No dishes match “{query}”.
          </p>
        ) : (
          visible.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onEdit={() => openEdit(item)}
              onSync={() =>
                runItemAction(
                  item.id,
                  () => syncSingleCatalogItem(partnerId!, item.id),
                  `${item.name} is now on WhatsApp.`,
                )
              }
              onToggleExclude={() =>
                runItemAction(
                  item.id,
                  () => setCatalogItemExcluded(partnerId!, item.id, !item.excluded),
                  item.excluded
                    ? `${item.name} is back on WhatsApp.`
                    : `${item.name} removed from WhatsApp. It's still on your menu.`,
                )
              }
              onDelete={() => {
                // Deleting reaches OUTSIDE this screen — storefront, QR menu and
                // POS all lose the dish — so it gets an explicit confirmation
                // that says so.
                if (
                  !window.confirm(
                    `Delete "${item.name}"?\n\nThis removes it from WhatsApp AND from your menu, so it disappears from your storefront, QR menu and POS too.`,
                  )
                )
                  return;
                void runItemAction(
                  item.id,
                  () => deleteCatalogItem(partnerId!, item.id),
                  `${item.name} deleted.`,
                );
              }}
            />
          ))
        )}
      </div>

      {!q && matched.length > visible.length && (
        <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
          Show all {status.total} items
        </Button>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !savingEdit && setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold">Edit dish</h3>
            {/* Said up front, because it is the surprising part: this is not a
                WhatsApp-only edit. */}
            <p className="mt-1 text-xs text-muted-foreground">
              Changes apply to your whole menu — storefront, QR menu and POS — and
              are sent to WhatsApp straight away.
            </p>

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Shown under the dish in WhatsApp"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Photo URL</label>
                <input
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  placeholder="https://…"
                />
                <p className="text-xs text-muted-foreground">
                  WhatsApp will not list a dish without a photo.
                </p>
                {editImage.trim() ? (
                  badPreviewUrl === editImage.trim() ? (
                    <p className="mt-2 text-xs text-rose-600">
                      That image didn’t load. Check the link.
                    </p>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={editImage.trim()}
                      src={editImage.trim()}
                      alt=""
                      className="mt-2 h-20 w-20 rounded object-cover"
                      onError={() => setBadPreviewUrl(editImage.trim())}
                    />
                  )
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={savingEdit || !editName.trim()}>
                {savingEdit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save & update WhatsApp"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
