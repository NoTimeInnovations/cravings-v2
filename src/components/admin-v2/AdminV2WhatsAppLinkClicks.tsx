"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { MousePointerClick, RefreshCw, Loader2, User } from "lucide-react";

type ClaimRow = { token_hash: string; claimed_at: string; user_id: string | null };
type ClickRow = {
    id: string;
    claimedAt: string;
    name: string | null;
    phone: string | null;
    resolved: boolean;
};

const CLAIMS_QUERY = `
  query OrderLinkClicks($p: uuid!, $limit: Int!) {
    order_link_claims(
      where: { partner_id: { _eq: $p } }
      order_by: { claimed_at: desc }
      limit: $limit
    ) {
      token_hash
      claimed_at
      user_id
    }
    order_link_claims_aggregate(where: { partner_id: { _eq: $p } }) {
      aggregate { count }
    }
  }
`;

const USERS_QUERY = `
  query OrderLinkClickUsers($ids: [uuid!]!) {
    users(where: { id: { _in: $ids } }) {
      id
      full_name
      phone
    }
  }
`;

const PAGE_LIMIT = 200;

// "2026-06-26T12:54:27Z" -> "5 min ago" / "3 hours ago" / "2 days ago" / date.
function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    if (Number.isNaN(then)) return "";
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} day${day > 1 ? "s" : ""} ago`;
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function absoluteTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AdminV2WhatsAppLinkClicks() {
    const { userData } = useAuthStore();
    const partnerId = (userData as any)?.id as string | undefined;

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<ClickRow[]>([]);
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        if (!partnerId) return;
        setLoading(true);
        try {
            const res = await fetchFromHasura(CLAIMS_QUERY, { p: partnerId, limit: PAGE_LIMIT });
            const claims: ClaimRow[] = res?.order_link_claims ?? [];
            const count: number = res?.order_link_claims_aggregate?.aggregate?.count ?? claims.length;

            // Resolve the customer accounts for these taps in one round-trip. A tap
            // by a NEW customer still resolves — the auto-login find-or-creates the
            // account from the link's phone before the claim is written. Only taps
            // whose account was later deleted come back unresolved.
            const ids = Array.from(new Set(claims.map((c) => c.user_id).filter(Boolean))) as string[];
            const usersById = new Map<string, { full_name: string | null; phone: string | null }>();
            if (ids.length > 0) {
                const ures = await fetchFromHasura(USERS_QUERY, { ids });
                (ures?.users ?? []).forEach((u: any) => usersById.set(u.id, { full_name: u.full_name, phone: u.phone }));
            }

            const mapped: ClickRow[] = claims.map((c) => {
                const u = c.user_id ? usersById.get(c.user_id) : undefined;
                const name = u?.full_name?.trim() || null;
                const phone = u?.phone?.trim() || null;
                return {
                    id: c.token_hash,
                    claimedAt: c.claimed_at,
                    name,
                    phone,
                    resolved: !!u,
                };
            });

            setRows(mapped);
            setTotal(count);
        } catch (e) {
            console.error("Failed to load order link clicks:", e);
        } finally {
            setLoading(false);
        }
    }, [partnerId]);

    useEffect(() => {
        load();
    }, [load]);

    const uniqueCustomers = new Set(rows.filter((r) => r.resolved && r.phone).map((r) => r.phone)).size;

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold sm:text-2xl">Order link taps</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Customers who tapped an &ldquo;order now&rdquo; link sent by your WhatsApp flows.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-2xl font-bold tabular-nums">{total}</p>
                    <p className="text-xs text-muted-foreground">Total taps</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-2xl font-bold tabular-nums">{uniqueCustomers}</p>
                    <p className="text-xs text-muted-foreground">Unique customers{rows.length < total ? " (recent)" : ""}</p>
                </div>
            </div>

            {loading && rows.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
                    No order-link taps yet.
                    <br />
                    They&rsquo;ll appear here when customers tap an &ldquo;order now&rdquo; link from your flows.
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.length < total && (
                        <p className="text-xs text-muted-foreground">
                            Showing the {rows.length} most recent of {total} taps.
                        </p>
                    )}
                    {rows.map((r) => {
                        const primary = r.name || r.phone || (r.resolved ? "Customer" : "Deleted customer");
                        const secondary = r.name && r.phone ? r.phone : null;
                        return (
                            <div
                                key={r.id}
                                className="flex items-center gap-3 rounded-xl border bg-card p-3"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                                    {r.resolved ? <MousePointerClick className="h-5 w-5" /> : <User className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{primary}</p>
                                    {secondary && <p className="truncate text-xs text-muted-foreground">{secondary}</p>}
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-xs font-medium text-muted-foreground" title={absoluteTime(r.claimedAt)}>
                                        {relativeTime(r.claimedAt)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground/70">{absoluteTime(r.claimedAt)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
