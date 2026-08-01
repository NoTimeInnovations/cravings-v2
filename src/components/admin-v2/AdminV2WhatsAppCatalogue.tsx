"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Loader2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
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

function ItemRow({ item }: { item: CatalogItemStatus }) {
  const blocked = !!item.reason;
  return (
    <div className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
          <ImageOff className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        {blocked ? (
          <p className="truncate text-xs text-amber-700">{item.reasonText}</p>
        ) : item.syncedAt ? (
          <p className="truncate text-xs text-muted-foreground">
            In your WhatsApp catalogue
          </p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">Not sent yet</p>
        )}
      </div>
      <span
        className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${
          blocked
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : item.syncedAt
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-border bg-muted text-muted-foreground"
        }`}
      >
        {blocked ? (REASON_LABEL[item.reason as string] ?? item.reason) : item.syncedAt ? "Synced" : "Pending"}
      </span>
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
      if (!r.ok) {
        // An unsettled run is NOT a failure — Meta was still processing, and the
        // items stay pending for the next run. Saying "failed" would send the
        // partner chasing a problem that does not exist.
        const unsettled = r.summary && r.summary.settled === false;
        const msg = r.message || (unsettled ? "still processing" : "sync failed");
        if (unsettled) toast.info(`WhatsApp is still processing — ${msg}`);
        else toast.error(msg);
        setError(msg);
      } else {
        const n = r.summary?.pushed ?? 0;
        toast.success(`${n} item${n === 1 ? "" : "s"} sent to your WhatsApp catalogue`);
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
  const visible = showAll ? status.items : status.items.slice(0, 25);

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

      <div className="grid gap-3 sm:grid-cols-3">
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
            Menu items ({status.total})
          </p>
          {status.ineligibleCount > 0 && (
            <p className="text-xs text-muted-foreground">Problems listed first</p>
          )}
        </div>
        {status.items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            You have no menu items yet.
          </p>
        ) : (
          visible.map((item) => <ItemRow key={item.id} item={item} />)
        )}
      </div>

      {status.items.length > visible.length && (
        <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
          Show all {status.total} items
        </Button>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
