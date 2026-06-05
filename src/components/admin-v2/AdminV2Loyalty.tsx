"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { getFeatures } from "@/lib/getFeatures";
import { toast } from "sonner";
import {
  Gift,
  Search,
  Users,
  Coins,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Plus,
  Minus,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  getPartnerLoyaltySummary,
  getPartnerLoyaltyMembers,
  getCustomerLoyaltyForPartner,
  adminAdjustLoyalty,
} from "@/app/actions/loyalty";
import {
  loyaltyTxnLabel,
  type LoyaltyMemberView,
  type LoyaltyPartnerSummary,
  type LoyaltyTxnView,
} from "@/lib/loyalty/config";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TxnRow({ txn, currency }: { txn: LoyaltyTxnView; currency: string }) {
  const credit = txn.delta > 0;
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{loyaltyTxnLabel(txn.type)}</div>
        <div className="text-xs text-muted-foreground truncate">
          {fmtDate(txn.createdAt)}
          {txn.orderDisplayId ? ` · #${txn.orderDisplayId}` : ""}
          {txn.note ? ` · ${txn.note}` : ""}
        </div>
      </div>
      <div className="text-right shrink-0 pl-3">
        <div className={`text-sm font-bold ${credit ? "text-emerald-600" : "text-orange-600"}`}>
          {credit ? "+" : ""}
          {txn.delta} pts
        </div>
        <div className="text-[11px] text-muted-foreground">bal {txn.balanceAfter}</div>
      </div>
    </div>
  );
}

export function AdminV2Loyalty() {
  const { userData } = useAuthStore();
  const currency = (userData as any)?.currency || "₹";
  const enabled = !!getFeatures((userData as any)?.feature_flags || null).loyalty_points?.access;

  const [summary, setSummary] = useState<LoyaltyPartnerSummary | null>(null);
  const [members, setMembers] = useState<LoyaltyMemberView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Detail drawer
  const [selected, setSelected] = useState<LoyaltyMemberView | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [history, setHistory] = useState<LoyaltyTxnView[]>([]);
  const [detailMember, setDetailMember] = useState<LoyaltyMemberView | null>(null);
  const [adjustDir, setAdjustDir] = useState<"credit" | "debit">("credit");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const loadList = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        getPartnerLoyaltySummary(),
        getPartnerLoyaltyMembers({ search: term, limit: 100 }),
      ]);
      setSummary(s);
      setMembers(m);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load loyalty data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) loadList("");
  }, [enabled, loadList]);

  // Debounced search
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => loadList(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search, enabled, loadList]);

  const openDetail = async (m: LoyaltyMemberView) => {
    setSelected(m);
    setDetailMember(m);
    setAdjustPoints("");
    setAdjustNote("");
    setAdjustDir("credit");
    setDetailLoading(true);
    try {
      const { member, history } = await getCustomerLoyaltyForPartner(m.userId);
      if (member) setDetailMember(member);
      setHistory(history);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load customer history");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (userId: string) => {
    const { member, history } = await getCustomerLoyaltyForPartner(userId);
    if (member) setDetailMember(member);
    setHistory(history);
  };

  const handleAdjust = async () => {
    if (!detailMember) return;
    const pts = parseInt(adjustPoints, 10);
    if (!Number.isFinite(pts) || pts <= 0) {
      toast.error("Enter a positive number of points");
      return;
    }
    setAdjusting(true);
    try {
      const res = await adminAdjustLoyalty({
        userId: detailMember.userId,
        points: pts,
        direction: adjustDir,
        note: adjustNote.trim(),
      });
      if (!res.ok) {
        toast.error(res.message || "Could not adjust points");
      } else {
        toast.success(`${adjustDir === "credit" ? "Added" : "Removed"} ${pts} points`);
        setAdjustPoints("");
        setAdjustNote("");
        await refreshDetail(detailMember.userId);
        loadList(search.trim());
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not adjust points");
    } finally {
      setAdjusting(false);
    }
  };

  if (!enabled) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Loyalty points aren&apos;t enabled</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ask support to enable the loyalty feature, then turn it on under Settings → Features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Gift className="h-6 w-6 text-orange-600" />
          Loyalty
        </h1>
        <p className="text-muted-foreground">Points your customers have earned and redeemed.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Users} label="Members" value={(summary?.members ?? 0).toLocaleString()} />
            <StatCard
              icon={Coins}
              label="Outstanding"
              value={`${(summary?.outstandingPoints ?? 0).toLocaleString()} pts`}
              sub={`${currency}${(summary?.outstandingValue ?? 0).toLocaleString()} liability`}
            />
            <StatCard icon={TrendingUp} label="Issued (lifetime)" value={`${(summary?.lifetimeIssued ?? 0).toLocaleString()} pts`} />
            <StatCard icon={TrendingDown} label="Redeemed (lifetime)" value={`${(summary?.lifetimeRedeemed ?? 0).toLocaleString()} pts`} />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Member list */}
      <Card>
        <CardContent className="p-0 divide-y">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-5 w-40" />
              </div>
            ))
          ) : members.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {search ? "No customers match your search." : "No loyalty members yet."}
            </div>
          ) : (
            members.map((m) => (
              <button
                key={m.userId}
                onClick={() => openDetail(m)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-semibold shrink-0">
                  {(m.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    {m.name}
                    {m.flagged && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.phone || "—"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{m.balance.toLocaleString()} pts</div>
                  <div className="text-xs text-muted-foreground">{currency}{Math.round(m.balance)} value</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Customer detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-5 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-orange-600" />
              {detailMember?.name || "Customer"}
            </SheetTitle>
          </SheetHeader>

          {detailMember && (
            <div className="flex-1 overflow-y-auto">
              {/* Balance hero */}
              <div className="m-5 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5">
                <div className="text-orange-50 text-sm">Current balance</div>
                <div className="text-4xl font-extrabold mt-1">{detailMember.balance.toLocaleString()}</div>
                <div className="text-orange-50 text-sm">points · worth {currency}{Math.round(detailMember.balance)}</div>
                <div className="flex gap-4 mt-4 text-xs text-orange-50">
                  <div>Earned <span className="font-semibold text-white">{detailMember.lifetimeEarned}</span></div>
                  <div>Redeemed <span className="font-semibold text-white">{detailMember.lifetimeRedeemed}</span></div>
                  <div>{detailMember.phone}</div>
                </div>
              </div>

              {detailMember.flagged && (
                <div className="mx-5 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  This account failed an integrity check and is locked. Contact support.
                </div>
              )}

              {/* Manual adjust */}
              <div className="mx-5 mb-4 rounded-xl border p-4">
                <div className="font-semibold text-sm mb-3">Adjust points</div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => setAdjustDir("credit")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium border transition-colors ${
                      adjustDir === "credit" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                  <button
                    onClick={() => setAdjustDir("debit")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium border transition-colors ${
                      adjustDir === "debit" ? "bg-orange-50 border-orange-300 text-orange-700" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Minus className="h-4 w-4" /> Remove
                  </button>
                </div>
                <Input
                  type="number"
                  min={1}
                  placeholder="Points"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  className="mb-2"
                />
                <Input
                  placeholder="Reason (shown to customer)"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="mb-3"
                  maxLength={280}
                />
                <Button onClick={handleAdjust} disabled={adjusting} className="w-full bg-orange-600 hover:bg-orange-700">
                  {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : adjustDir === "credit" ? "Add points" : "Remove points"}
                </Button>
              </div>

              {/* History */}
              <div className="mx-5 mb-6">
                <div className="font-semibold text-sm mb-1">Transaction history</div>
                {detailLoading ? (
                  <div className="py-6 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                ) : history.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</div>
                ) : (
                  <div className="divide-y">
                    {history.map((t) => (
                      <TxnRow key={t.id} txn={t} currency={currency} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
