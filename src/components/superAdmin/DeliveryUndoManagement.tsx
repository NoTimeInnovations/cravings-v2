"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Loader2,
  MapPin,
  ImagePlus,
  Plus,
  Search,
  Send,
  RefreshCw,
  Store,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { processImage } from "@/lib/processImage";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  bulkSetDuListedMutation,
  getDuAppConfigQuery,
  getDuCandidatesQuery,
  getDuListingsQuery,
  getDuNotificationsQuery,
  updateDuAppConfigMutation,
  upsertDuListingMutation,
} from "@/api/deliveryUndo";
import {
  getDeliveryUndoAnalytics,
  getDeliveryUndoHealth,
  resyncDeliveryUndo,
  sendDuNotification,
  type DuAnalytics,
  type DuAudience,
} from "@/app/actions/deliveryUndo";

/* ─────────────────────────── types ─────────────────────────── */

interface DuListing {
  partner_id: string;
  is_listed: boolean;
  rank_boost: number;
  badge: string | null;
  cuisines: string[];
  display_name_override: string | null;
  tagline_override: string | null;
  wa_number_override: string | null;
  wa_message_template: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  listed_at?: string | null;
}

interface DuPartner {
  id: string;
  store_name: string | null;
  username: string | null;
  district: string | null;
  location: string | null;
  store_banner: string | null;
  phone: string | null;
  whatsapp_numbers: { number: string; area: string }[] | null;
  geo_location: { type: string; coordinates: [number, number] } | null;
  country_code: string | null;
  is_shop_open: boolean | null;
  du_listing: DuListing | null;
}

/** A home-screen category pill. `image` also fills the search-grid tile. */
interface DuCuisine {
  name: string;
  image?: string;
}

interface DuConfig {
  cuisines?: DuCuisine[];
  /** Legacy plain-string form, still written on every save for old app builds. */
  cuisineChips?: string[];
  trendingSearches?: string[];
  defaultRadiusKm?: number;
  maxRadiusKm?: number;
  sortMode?: string;
  showClosedRestaurants?: boolean;
  [k: string]: unknown;
}

interface DuNotificationLog {
  id: string;
  title: string;
  message: string;
  audience_type: string;
  audience_values: string[];
  recipients: number | null;
  status: string;
  error: string | null;
  created_at: string;
}

/** Badges the app renders as a pill over the card image. */
const BADGE_OPTIONS = ["Popular", "New", "Late night", "Best seller"] as const;

/* ───────────────────────── helpers ───────────────────────── */

/**
 * Mirrors the app's WhatsApp resolution exactly (see the Flutter
 * WhatsAppService): override → whatsapp_numbers[0] → phone, digits only,
 * country code prepended when missing. Shown in the UI so an operator can see
 * the number the app will actually dial before listing anyone.
 */
function resolveWhatsapp(p: DuPartner): string | null {
  const raw =
    p.du_listing?.wa_number_override ||
    p.whatsapp_numbers?.[0]?.number ||
    p.phone;
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const cc = (p.country_code || "").replace(/\D/g, "");
  if (cc && !digits.startsWith(cc)) digits = cc + digits;
  return digits.length >= 8 ? `+${digits}` : null;
}

function resolveGeo(p: DuPartner): { lat: number; lng: number } | null {
  if (p.du_listing?.lat != null && p.du_listing?.lng != null) {
    return { lat: p.du_listing.lat, lng: p.du_listing.lng };
  }
  const c = p.geo_location?.coordinates;
  // GeoJSON is [lng, lat] — the reverse of how everyone writes it.
  if (Array.isArray(c) && c.length === 2) return { lat: c[1], lng: c[0] };
  return null;
}

/**
 * Why a partner cannot be listed yet. The app would render a broken card or
 * a dead WhatsApp tap otherwise, so this blocks rather than warns.
 */
function blockers(p: DuPartner): string[] {
  const out: string[] = [];
  if (!resolveWhatsapp(p)) out.push("No WhatsApp number");
  if (!resolveGeo(p)) out.push("No location set");
  return out;
}

/**
 * Pushes the current Hasura state to Cloudflare D1.
 *
 * Every save must be followed by this — Hasura records the decision, but the
 * app reads D1, so an unsynced save is invisible to users. Surfaced as a
 * toast rather than done silently so a failure is never mistaken for success.
 */
async function pushToApp() {
  const res = await resyncDeliveryUndo();
  if (res.ok) {
    const skipped = res.skipped?.length ?? 0;
    toast.success(
      `Live in the app — ${res.listings} kitchens, ${res.dishes} dishes` +
        (skipped ? ` (${skipped} skipped)` : ""),
    );
    res.skipped?.forEach((s) =>
      toast.warning(`${s.name}: ${s.reason}`, { duration: 6000 }),
    );
  } else {
    toast.error(`Saved, but not live yet: ${res.error}`, { duration: 8000 });
  }
  return res;
}

/* ───────────────────────── component ───────────────────────── */

const DeliveryUndoManagement = () => {
  const [tab, setTab] = useState("listings");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Delivery Undo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Which kitchens appear in the Delivery Undo app, how they are
          presented, and what gets pushed to users.
        </p>
      </div>

      <HealthStrip />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="listings">
            <Store className="w-4 h-4 mr-2" /> Listings
          </TabsTrigger>
          <TabsTrigger value="config">
            <MapPin className="w-4 h-4 mr-2" /> App config
          </TabsTrigger>
          <TabsTrigger value="notify">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <ListingsTab />
        </TabsContent>
        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="notify">
          <NotifyTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/** Shows whether what's in the app matches what's in Hasura. */
const HealthStrip = () => {
  const [health, setHealth] = useState<Awaited<
    ReturnType<typeof getDeliveryUndoHealth>
  > | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setHealth(await getDeliveryUndoHealth());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stale = (health?.staleHours ?? 0) > 24;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
      <span className="font-medium">App data</span>
      {health?.ok ? (
        <>
          <Badge variant="secondary">{health.listings} kitchens</Badge>
          <Badge variant="secondary">{health.dishes} dishes</Badge>
          <span className="text-xs text-muted-foreground">
            {health.lastReconcileAt
              ? `synced ${new Date(health.lastReconcileAt).toLocaleString()}`
              : "never synced"}
            {stale && " · stale"}
          </span>
        </>
      ) : (
        <span className="text-xs text-destructive">
          {health?.error ?? "checking…"}
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        className="ml-auto"
        disabled={syncing}
        onClick={async () => {
          setSyncing(true);
          await pushToApp();
          await refresh();
          setSyncing(false);
        }}
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
        Force resync
      </Button>
    </div>
  );
};

/* ───────────────────────── listings ───────────────────────── */

/** Rows per page. The list was previously capped at a flat 100 with no way to
 *  reach anything past it. */
const PAGE_SIZE = 50;

const ListingsTab = () => {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<DuPartner[]>([]);
  const [listed, setListed] = useState<DuListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DuPartner | null>(null);
  const [onlyListed, setOnlyListed] = useState(false);
  const [page, setPage] = useState(0);
  /** Total matching the CURRENT search + filter, from the server. Needed to know
   *  whether a next page exists at all. */
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const term = search.trim() ? `%${search.trim()}%` : "%";
      // "Listed only" filters on the SERVER. Filtering the fetched page in the
      // browser instead meant it could only ever surface the listed partners that
      // happened to fall in the first page alphabetically — with 163 listed and a
      // 100-row cap, most of them were unreachable no matter how you paged.
      const extra = onlyListed ? { du_listing: { is_listed: { _eq: true } } } : {};
      const [cands, current] = await Promise.all([
        fetchFromHasura(getDuCandidatesQuery, {
          search: term,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          extra,
        }),
        fetchFromHasura(getDuListingsQuery),
      ]);
      setCandidates(cands?.partners ?? []);
      setTotal(cands?.partners_aggregate?.aggregate?.count ?? 0);
      setListed(current?.du_listings ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load listings");
    } finally {
      setLoading(false);
    }
  }, [search, page, onlyListed]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Unlisting the last row of the last page — the whole point of "Listed only" —
  // shrinks the result set under the current offset and would leave the operator
  // staring at an empty page with a Previous button as the only way out. Step
  // back instead, repeatedly if several pages vanished at once.
  useEffect(() => {
    if (!loading && page > 0 && candidates.length === 0) {
      setPage((n) => Math.max(0, n - 1));
    }
  }, [loading, page, candidates.length]);

  const listedIds = useMemo(
    () => new Set(listed.map((l) => l.partner_id)),
    [listed],
  );

  // No client-side filtering: the query already applied both the search and the
  // listed filter, so this page IS the answer for the current page number.
  const rows = candidates;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastShown = page * PAGE_SIZE + rows.length;

  const toggleListed = async (p: DuPartner, next: boolean) => {
    const issues = blockers(p);
    if (next && issues.length) {
      toast.error(`Can't list ${p.store_name}: ${issues.join(", ")}`);
      return;
    }
    try {
      await fetchFromHasura(bulkSetDuListedMutation, {
        objects: [
          {
            partner_id: p.id,
            is_listed: next,
            listed_at: next ? new Date().toISOString() : null,
            listed_by: "superadmin",
          },
        ],
      });
      toast.success(next ? `${p.store_name} listed` : `${p.store_name} removed`);
      load();
      await pushToApp();
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search partners by name, username or area…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <Switch
            checked={onlyListed}
            onCheckedChange={(v) => {
              setOnlyListed(v);
              setPage(0);
            }}
          />
          Listed only
        </label>
        <Badge variant="secondary" className="whitespace-nowrap">
          {listed.length} listed
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          No partners match that search.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const isListed = listedIds.has(p.id);
            const issues = blockers(p);
            const wa = resolveWhatsapp(p);
            const l = listed.find((x) => x.partner_id === p.id);
            return (
              <Card key={p.id} className={isListed ? "border-primary/40" : ""}>
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <Switch
                    checked={isListed}
                    disabled={!isListed && issues.length > 0}
                    onCheckedChange={(v) => toggleListed(p, v)}
                  />
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {l?.display_name_override || p.store_name}
                      {l?.badge && <Badge>{l.badge}</Badge>}
                      {(l?.rank_boost ?? 0) !== 0 && (
                        <Badge variant="outline">
                          priority {l?.rank_boost}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[p.district, p.location].filter(Boolean).join(" · ") ||
                        "No area"}
                      {wa ? ` · ${wa}` : ""}
                    </div>
                    {issues.length > 0 && (
                      <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        {issues.join(", ")} — fix in the partner's settings
                        first
                      </div>
                    )}
                    {l?.cuisines?.length ? (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {l.cuisines.map((c) => (
                          <Badge key={c} variant="secondary" className="text-[10px]">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(p)}
                  >
                    Edit
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


      {/* Pager. There was none at all: the list fetched a flat 100 rows with no
          offset, so anything past the hundredth partner alphabetically simply
          could not be reached. */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-sm text-muted-foreground">
            Showing {firstShown}–{lastShown} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((n) => Math.max(0, n - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((n) => n + 1)}
              disabled={lastShown >= total}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <ListingEditor
          partner={editing}
          existing={listed.find((l) => l.partner_id === editing.id) ?? null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
};

/* ─────────────────── listing editor dialog ─────────────────── */

const ListingEditor = ({
  partner,
  existing,
  onClose,
  onSaved,
}: {
  partner: DuPartner;
  existing: DuListing | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const geo = resolveGeo(partner);
  const [form, setForm] = useState({
    is_listed: existing?.is_listed ?? false,
    rank_boost: existing?.rank_boost ?? 0,
    badge: existing?.badge ?? "",
    cuisines: existing?.cuisines?.join(", ") ?? "",
    display_name_override: existing?.display_name_override ?? "",
    tagline_override: existing?.tagline_override ?? "",
    wa_number_override: existing?.wa_number_override ?? "",
    wa_message_template: existing?.wa_message_template ?? "Hi",
    lat: existing?.lat ?? geo?.lat ?? "",
    lng: existing?.lng ?? geo?.lng ?? "",
    notes: existing?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await fetchFromHasura(upsertDuListingMutation, {
        object: {
          partner_id: partner.id,
          is_listed: form.is_listed,
          rank_boost: Number(form.rank_boost) || 0,
          badge: form.badge.trim() || null,
          cuisines: form.cuisines
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          display_name_override: form.display_name_override.trim() || null,
          tagline_override: form.tagline_override.trim() || null,
          wa_number_override: form.wa_number_override.trim() || null,
          wa_message_template: form.wa_message_template.trim() || "Hi",
          lat: form.lat === "" ? null : Number(form.lat),
          lng: form.lng === "" ? null : Number(form.lng),
          notes: form.notes.trim() || null,
          listed_at: form.is_listed ? new Date().toISOString() : null,
          listed_by: "superadmin",
        },
      });
      toast.success("Listing saved");
      await pushToApp();
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewWa = resolveWhatsapp({
    ...partner,
    du_listing: {
      ...(existing ?? ({} as DuListing)),
      wa_number_override: form.wa_number_override || null,
    } as DuListing,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{partner.store_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Listed in the app</span>
            <Switch
              checked={form.is_listed}
              onCheckedChange={(v) => set("is_listed", v)}
            />
          </label>

          <Field label="Priority" hint="Higher shows first. 0 = pure distance order.">
            <Input
              type="number"
              value={form.rank_boost}
              onChange={(e) => set("rank_boost", e.target.value)}
            />
          </Field>

          <Field label="Badge" hint="Pill over the card image. Blank for none.">
            <div className="flex gap-1.5 flex-wrap">
              {BADGE_OPTIONS.map((b) => (
                <Button
                  key={b}
                  type="button"
                  size="sm"
                  variant={form.badge === b ? "default" : "outline"}
                  onClick={() => set("badge", form.badge === b ? "" : b)}
                >
                  {b}
                </Button>
              ))}
            </div>
          </Field>

          <Field
            label="Cuisines"
            hint="Comma separated. Matches the home-screen category pills."
          >
            <Input
              value={form.cuisines}
              onChange={(e) => set("cuisines", e.target.value)}
              placeholder="Biryani, Arabic, Mandi"
            />
          </Field>

          <Field label="Display name" hint="Blank uses the store name.">
            <Input
              value={form.display_name_override}
              onChange={(e) => set("display_name_override", e.target.value)}
              placeholder={partner.store_name ?? ""}
            />
          </Field>

          <Field label="Tagline">
            <Input
              value={form.tagline_override}
              onChange={(e) => set("tagline_override", e.target.value)}
              placeholder="Authentic Arabian mandi"
            />
          </Field>

          <Field
            label="WhatsApp override"
            hint="Blank derives from the partner's saved numbers."
          >
            <Input
              value={form.wa_number_override}
              onChange={(e) => set("wa_number_override", e.target.value)}
              placeholder="+919847021134"
            />
            <p className="text-xs text-muted-foreground mt-1">
              App will open:{" "}
              <span className="font-mono">{previewWa ?? "— unusable —"}</span>
            </p>
          </Field>

          <Field label="Opening message">
            <Input
              value={form.wa_message_template}
              onChange={(e) => set("wa_message_template", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <Input
                value={form.lat}
                onChange={(e) => set("lat", e.target.value)}
              />
            </Field>
            <Field label="Longitude">
              <Input
                value={form.lng}
                onChange={(e) => set("lng", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Internal notes">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    {hint && <p className="text-xs text-muted-foreground mb-1">{hint}</p>}
    {children}
  </div>
);

/* ─────────────────────── app config ─────────────────────── */

/** S3 keys have to survive a cuisine name like "Kerala / Malabar". */
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cuisine";

const ConfigTab = () => {
  const [config, setConfig] = useState<DuConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newChip, setNewChip] = useState("");
  /** Name of the cuisine whose image is mid-upload, or null. */
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchFromHasura(getDuAppConfigQuery);
        setConfig(res?.du_app_config?.[0]?.config ?? {});
      } catch (e) {
        console.error(e);
        toast.error("Couldn't load config");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (next: DuConfig) => {
    setSaving(true);
    try {
      await fetchFromHasura(updateDuAppConfigMutation, { config: next });
      setConfig(next);
      toast.success("Config saved");
      await pushToApp();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // `cuisines` is the rich list the app prefers; `cuisineChips` is the older
  // plain-string field. Older configs only have the latter, so fall back to it
  // and let the first save promote them.
  const cuisines: DuCuisine[] =
    config.cuisines ?? (config.cuisineChips ?? []).map((name) => ({ name }));

  /**
   * Writes both shapes. Keeping `cuisineChips` in sync means an app build that
   * predates cuisine images still renders its filter row.
   */
  const saveCuisines = (next: DuCuisine[]) =>
    save({ ...config, cuisines: next, cuisineChips: next.map((c) => c.name) });

  const pickImage = async (index: number, file: File) => {
    setUploading(cuisines[index].name);
    const blobUrl = URL.createObjectURL(file);
    try {
      // Same pipeline as menu images: centre-crop to a square and re-encode
      // before it ever reaches S3, so a 6 MB phone photo doesn't become the
      // tile the app downloads.
      const processed = await processImage(blobUrl, "upload");
      const url = await uploadFileToS3(
        processed,
        `delivery-undo/cuisines/${slugify(cuisines[index].name)}-${Date.now()}.webp`,
      );
      await saveCuisines(
        cuisines.map((c, i) => (i === index ? { ...c, image: url } : c)),
      );
    } catch (e) {
      console.error(e);
      toast.error("Image upload failed");
    } finally {
      URL.revokeObjectURL(blobUrl);
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-medium">Cuisine categories</h3>
            <p className="text-xs text-muted-foreground">
              The filter row under the search bar, and the &ldquo;Browse by
              cuisine&rdquo; grid in search. Order here is the order in the app.
              A pill only matches restaurants whose cuisines include exactly
              this word. Images show in the search grid; without one the app
              falls back to a coloured tile.
            </p>
          </div>

          <div className="space-y-2">
            {cuisines.map((cuisine, i) => (
              <div
                key={cuisine.name}
                className="flex items-center gap-3 border rounded-lg p-2"
              >
                <label
                  className="relative w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted grid place-items-center cursor-pointer group"
                  title={cuisine.image ? "Change image" : "Add image"}
                >
                  {cuisine.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cuisine.image}
                      alt={cuisine.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="absolute inset-0 bg-black/50 text-white text-[10px] font-medium grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {cuisine.image ? "Change" : "Add"}
                  </span>
                  {uploading === cuisine.name && (
                    <span className="absolute inset-0 bg-black/60 grid place-items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={saving || uploading !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      // Reset first: picking the same file twice in a row
                      // fires no change event otherwise.
                      e.target.value = "";
                      if (file) pickImage(i, file);
                    }}
                  />
                </label>

                <span className="flex-1 text-sm font-medium">
                  {cuisine.name}
                </span>

                {cuisine.image && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() =>
                      saveCuisines(
                        cuisines.map((c, x) =>
                          x === i ? { name: c.name } : c,
                        ),
                      )
                    }
                  >
                    Remove image
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-destructive"
                  disabled={saving}
                  aria-label={`Remove ${cuisine.name}`}
                  onClick={() =>
                    saveCuisines(cuisines.filter((_, x) => x !== i))
                  }
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {cuisines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No cuisines — the app hides the filter row entirely.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add a cuisine, e.g. Shawarma"
              value={newChip}
              onChange={(e) => setNewChip(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newChip.trim()) {
                  saveCuisines([...cuisines, { name: newChip.trim() }]);
                  setNewChip("");
                }
              }}
            />
            <Button
              disabled={!newChip.trim() || saving}
              onClick={() => {
                saveCuisines([...cuisines, { name: newChip.trim() }]);
                setNewChip("");
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium">Feed behaviour</h3>

          <Field
            label="Sort mode"
            hint="Distance is the product promise. Open-first sinks closed kitchens below open ones."
          >
            <div className="flex gap-2">
              {["distance", "open_then_distance"].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={config.sortMode === m ? "default" : "outline"}
                  onClick={() => save({ ...config, sortMode: m })}
                >
                  {m === "distance" ? "Nearest first" : "Open first"}
                </Button>
              ))}
            </div>
          </Field>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                Show closed restaurants
              </span>
              <p className="text-xs text-muted-foreground">
                Off hides them entirely, which can empty the feed at night.
              </p>
            </div>
            <Switch
              checked={config.showClosedRestaurants !== false}
              onCheckedChange={(v) =>
                save({ ...config, showClosedRestaurants: v })
              }
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Default radius (km)">
              <Input
                type="number"
                defaultValue={config.defaultRadiusKm ?? 10}
                onBlur={(e) =>
                  save({ ...config, defaultRadiusKm: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Max radius (km)">
              <Input
                type="number"
                defaultValue={config.maxRadiusKm ?? 25}
                onBlur={(e) =>
                  save({ ...config, maxRadiusKm: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ───────────────────── notifications ───────────────────── */

const NotifyTab = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState("");
  const [audienceType, setAudienceType] =
    useState<DuAudience["type"]>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<DuNotificationLog[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetchFromHasura(getDuNotificationsQuery, { limit: 15 });
      setHistory(res?.du_notifications ?? []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchFromHasura(getDuListingsQuery);
        const rows = (res?.du_listings ?? []) as { partner: DuPartner }[];
        setDistricts(
          [...new Set(rows.map((r) => r.partner?.district).filter(Boolean))].sort() as string[],
        );
        setAreas(
          [...new Set(rows.map((r) => r.partner?.location).filter(Boolean))].sort() as string[],
        );
      } catch (e) {
        console.error(e);
      }
      loadHistory();
    })();
  }, [loadHistory]);

  const options = audienceType === "district" ? districts : areas;

  const send = async () => {
    setConfirming(false);
    setSending(true);
    try {
      const audience: DuAudience =
        audienceType === "all"
          ? { type: "all" }
          : { type: audienceType, values: selected };

      const res = await sendDuNotification({
        title,
        message,
        audience,
        route: route.trim() || null,
        sentBy: "superadmin",
      });

      if (res.ok) {
        toast.success(
          `Sent${res.recipients != null ? ` to ${res.recipients} devices` : ""}`,
        );
        setTitle("");
        setMessage("");
        setRoute("");
      } else {
        toast.error(res.error ?? "Send failed");
      }
      loadHistory();
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim() && message.trim() &&
    (audienceType === "all" || selected.length > 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="p-4 space-y-4">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kaifan Restaurant is open"
              maxLength={65}
            />
          </Field>

          <Field label="Message">
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Chicken Mandi, Alfaham and 60 more — 399 m from you"
              maxLength={200}
            />
          </Field>

          <Field
            label="Opens (optional)"
            hint="Deep link inside the app. Blank just opens the home feed."
          >
            <Input
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="/r/kaifan"
            />
          </Field>

          <Field label="Audience">
            <div className="flex gap-2 mb-2">
              {(["all", "district", "area"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={audienceType === t ? "default" : "outline"}
                  onClick={() => {
                    setAudienceType(t);
                    setSelected([]);
                  }}
                >
                  {t === "all"
                    ? "Everyone"
                    : t === "district"
                      ? "By district"
                      : "By area"}
                </Button>
              ))}
            </div>

            {audienceType !== "all" && (
              <div className="flex gap-1.5 flex-wrap border rounded-md p-2 max-h-40 overflow-y-auto">
                {options.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No {audienceType}s yet — list some restaurants first.
                  </p>
                )}
                {options.map((o) => (
                  <Badge
                    key={o}
                    variant={selected.includes(o) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setSelected((s) =>
                        s.includes(o) ? s.filter((x) => x !== o) : [...s, o],
                      )
                    }
                  >
                    {o}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {audienceType === "all"
                ? "Goes to every install with notifications on."
                : `Matches installs tagged with the selected ${audienceType}${
                    audienceType === "district" ? "s" : "s"
                  }. The app sets that tag when a user's location resolves, so anyone who never granted location is not reachable this way.`}
            </p>
          </Field>

          <Button
            className="w-full"
            disabled={!canSend || sending}
            onClick={() => setConfirming(true)}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send notification
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-medium mb-2">Recent sends</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{n.title}</span>
                    <Badge
                      variant={n.status === "sent" ? "secondary" : "destructive"}
                    >
                      {n.status}
                    </Badge>
                    {n.recipients != null && (
                      <span className="text-xs text-muted-foreground">
                        {n.recipients} devices
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {n.audience_type === "all"
                      ? "Everyone"
                      : `${n.audience_type}: ${n.audience_values.join(", ")}`}{" "}
                    · {new Date(n.created_at).toLocaleString()}
                  </p>
                  {n.error && (
                    <p className="text-xs text-destructive mt-1">{n.error}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* A push cannot be recalled, so the last step is always deliberate. */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this notification?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This goes to real phones immediately and cannot be recalled.
                </p>
                <div className="border rounded-md p-3 bg-muted/50">
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="text-sm">{message}</p>
                </div>
                <p className="text-sm">
                  Audience:{" "}
                  <strong>
                    {audienceType === "all"
                      ? "everyone with notifications on"
                      : `${audienceType} — ${selected.join(", ")}`}
                  </strong>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeliveryUndoManagement;

/* ─────────────────────── analytics ─────────────────────── */

const RANGES = [7, 30, 90] as const;

/**
 * Traffic for the app and the website.
 *
 * Deliberately not a charting library: four numbers, a sparkline and one table
 * is the whole story, and pulling in a chart package for it would cost more
 * than it explains.
 */
const AnalyticsTab = () => {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<DuAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      setData(await getDeliveryUndoAnalytics(d));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load analytics</p>
            <p className="text-sm text-muted-foreground">{data?.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const t = data.totals ?? {};
  const peakDay = Math.max(
    1,
    ...(data.daily ?? []).map((d) => d.app + d.site),
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Since {data.since}
          {loading && " · refreshing…"}
        </p>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? "default" : "outline"}
              onClick={() => setDays(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Website views" value={data.site?.pageViews ?? 0} />
        <Stat label="Menu views" value={t.restaurant_view ?? 0} />
        <Stat label="Order Now taps" value={t.wa_tap ?? 0} />
        <Stat label="Searches" value={t.search_performed ?? 0} />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-medium">Per restaurant</h3>
            <p className="text-xs text-muted-foreground">
              Taps ÷ views. A high view count with a low rate usually means the
              menu is browsable but something about it stops people ordering.
            </p>
          </div>
          {data.restaurants?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Restaurant</th>
                    <th className="py-2 font-medium text-right">Menu views</th>
                    <th className="py-2 font-medium text-right">Order taps</th>
                    <th className="py-2 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.restaurants.map((r) => (
                    <tr key={r.listingId} className="border-t">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 text-right tabular-nums">
                        {r.menuViews}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {r.orderTaps}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {r.tapRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No restaurant traffic in this window yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium">Daily</h3>
            {data.daily?.length ? (
              <div className="flex items-end gap-1 h-28">
                {data.daily.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col justify-end gap-0.5 min-w-1"
                    title={`${d.day} · app ${d.app} · site ${d.site}`}
                  >
                    <div
                      className="bg-primary/80 rounded-sm"
                      style={{ height: `${(d.app / peakDay) * 100}%` }}
                    />
                    <div
                      className="bg-muted-foreground/40 rounded-sm"
                      style={{ height: `${(d.site / peakDay) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Solid = app, grey = website.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium">Website pages</h3>
            {data.site?.byPath.length ? (
              <div className="space-y-1.5">
                {data.site.byPath.map((p) => (
                  <div
                    key={p.path}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-muted-foreground">
                      {p.path}
                    </span>
                    <span className="tabular-nums">{p.views}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No visits yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">
        {value.toLocaleString()}
      </p>
    </CardContent>
  </Card>
);
