"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 50;

type SwitchPartner = {
  id: string;
  store_name: string | null;
  username: string | null;
  email: string | null;
  status: string | null;
  admin_dashboard_version: string | null;
};

/**
 * Search + filter + count in one round trip.
 *
 * `$extra` is a `partners_bool_exp` slot rather than string interpolation so the
 * "v3 only" filter is applied SERVER-side and the pager stays honest — filtering
 * a fetched page in the browser is what made the Delivery Undo pager lie (commit
 * f7491b82), and both FeatureFlagManagement and EditPartners still pull the whole
 * ~1000-row partner table into memory. `{}` is a no-op for the unfiltered path.
 */
const ADMIN_DASHBOARD_PARTNERS = `
  query AdminDashboardPartners(
    $search: String = "%"
    $limit: Int = 50
    $offset: Int = 0
    $extra: partners_bool_exp = {}
  ) {
    partners(
      where: {
        _and: [
          {
            _or: [
              { store_name: { _ilike: $search } }
              { username: { _ilike: $search } }
              { email: { _ilike: $search } }
            ]
          }
          $extra
        ]
      }
      order_by: { store_name: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      store_name
      username
      email
      status
      admin_dashboard_version
    }
    partners_aggregate(
      where: {
        _and: [
          {
            _or: [
              { store_name: { _ilike: $search } }
              { username: { _ilike: $search } }
              { email: { _ilike: $search } }
            ]
          }
          $extra
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const SET_VERSION = `
  mutation SetAdminDashboardVersion($partnerId: uuid!, $version: String!) {
    update_partners_by_pk(
      pk_columns: { id: $partnerId }
      _set: { admin_dashboard_version: $version }
    ) {
      id
      admin_dashboard_version
    }
  }
`;

/** Anything that is not the literal "v3" is v2 — including null on old rows. */
const isV3 = (p: Pick<SwitchPartner, "admin_dashboard_version">) =>
  p.admin_dashboard_version === "v3";

const AdminDashboardSwitch = () => {
  const [rows, setRows] = useState<SwitchPartner[]>([]);
  const [total, setTotal] = useState(0);
  const [v3Total, setV3Total] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [onlyV3, setOnlyV3] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const term = `%${search.trim()}%`;
      const extra = onlyV3
        ? { admin_dashboard_version: { _eq: "v3" } }
        : {};
      const [pageData, v3Count] = await Promise.all([
        fetchFromHasura(ADMIN_DASHBOARD_PARTNERS, {
          search: term,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          extra,
        }),
        // Standalone so the "N on v3" headline reflects the whole platform, not
        // whatever the current search happens to match.
        fetchFromHasura(
          `query V3Count {
            partners_aggregate(where: { admin_dashboard_version: { _eq: "v3" } }) {
              aggregate { count }
            }
          }`,
        ),
      ]);
      setRows(pageData?.partners ?? []);
      setTotal(pageData?.partners_aggregate?.aggregate?.count ?? 0);
      setV3Total(v3Count?.partners_aggregate?.aggregate?.count ?? 0);
    } catch (e) {
      console.error("AdminDashboardSwitch load failed:", e);
      toast.error("Couldn't load partners");
    } finally {
      setLoading(false);
    }
  }, [search, page, onlyV3]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Switching the last v3 partner on the last page back to v2 while "v3 only"
  // is on shrinks the result set under the current offset, leaving an empty page
  // whose only escape is Previous. Step back instead — repeatedly if several
  // pages vanished at once.
  useEffect(() => {
    if (!loading && page > 0 && rows.length === 0) {
      setPage((n) => Math.max(0, n - 1));
    }
  }, [loading, page, rows.length]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastShown = page * PAGE_SIZE + rows.length;

  const setVersion = async (p: SwitchPartner, next: boolean) => {
    const version = next ? "v3" : "v2";
    const previous = p.admin_dashboard_version;

    setSaving(p.id);
    // Optimistic. Fired OUTSIDE the setState updater on purpose —
    // FeatureFlagManagement calls its mutation from inside one, which
    // double-fires under StrictMode in dev.
    setRows((prev) =>
      prev.map((r) =>
        r.id === p.id ? { ...r, admin_dashboard_version: version } : r,
      ),
    );

    try {
      await fetchFromHasura(SET_VERSION, { partnerId: p.id, version });
      // Busts getDashboardVersion()'s unstable_cache — it is tagged with the
      // same partner id — so the partner lands on the new dashboard on their
      // very next page load, with no logout/login.
      await revalidateTag(p.id);
      setV3Total((n) => Math.max(0, n + (next ? 1 : -1)));
      toast.success(
        `${p.store_name || p.username || "Partner"} → ${version} dashboard`,
      );
    } catch (e) {
      console.error("AdminDashboardSwitch update failed:", e);
      toast.error("Couldn't switch dashboard — reverted");
      setRows((prev) =>
        prev.map((r) =>
          r.id === p.id ? { ...r, admin_dashboard_version: previous } : r,
        ),
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Which partner dashboard each store gets. Everyone is on{" "}
        <strong>v2</strong> by default; flipping a partner to <strong>v3</strong>{" "}
        sends them to the redesigned <code>/admin-v3</code> — no logout needed.
        The routing decision is cached for up to a minute, so a partner already
        browsing may take that long to move across. v3 currently ships only the
        Dashboard and the sidebar; every other section still opens in v2.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by store name, username or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="only-v3"
            checked={onlyV3}
            onCheckedChange={(v) => {
              setOnlyV3(v);
              setPage(0);
            }}
          />
          <Label htmlFor="only-v3" className="cursor-pointer whitespace-nowrap">
            v3 only
          </Label>
        </div>
        <Badge variant="outline" className="whitespace-nowrap">
          {v3Total} on v3
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading partners…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          {onlyV3
            ? "No partner is on v3 yet."
            : "No partners match that search."}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const on = isV3(p);
            return (
              <Card key={p.id} className={on ? "border-primary/40" : ""}>
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <Switch
                    checked={on}
                    disabled={saving === p.id}
                    onCheckedChange={(v) => setVersion(p, v)}
                  />
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {p.store_name || p.username || "(unnamed)"}
                      {p.status !== "active" && (
                        <Badge variant="outline">{p.status || "no status"}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      {[p.username && `@${p.username}`, p.email]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </div>
                  <Badge variant={on ? "default" : "secondary"}>
                    {on ? "v3" : "v2"}
                  </Badge>
                  {saving === p.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
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
    </div>
  );
};

export default AdminDashboardSwitch;
