"use client";

import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Coins, Gift, ArrowDownLeft, ArrowUpRight, RotateCcw, Loader2 } from "lucide-react";
import { getLoyaltyBalance, getLoyaltyHistory } from "@/app/actions/loyalty";
import {
  loyaltyTxnLabel,
  type LoyaltyBalanceView,
  type LoyaltyTxnView,
  type LoyaltyTxnType,
} from "@/lib/loyalty/config";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function txnIcon(type: LoyaltyTxnType) {
  switch (type) {
    case "earn":
    case "adjust_credit":
      return ArrowDownLeft;
    case "redeem":
    case "adjust_debit":
      return ArrowUpRight;
    case "refund":
      return RotateCcw;
    default:
      return Coins;
  }
}

/**
 * Customer-facing partner-scoped loyalty history. Mobile-app styled bottom sheet:
 * a points "card" hero + an earn/redeem transaction feed with running balance.
 * Controlled — render via <LoyaltyPointsBadge> or drive `open` yourself.
 */
export function LoyaltyHistorySheet({
  partnerId,
  currency = "₹",
  storeName,
  open,
  onOpenChange,
}: {
  partnerId: string;
  currency?: string;
  storeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [balance, setBalance] = useState<LoyaltyBalanceView | null>(null);
  const [history, setHistory] = useState<LoyaltyTxnView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !partnerId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getLoyaltyBalance(partnerId), getLoyaltyHistory(partnerId, 50)])
      .then(([b, h]) => {
        if (cancelled) return;
        setBalance(b);
        setHistory(h);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, partnerId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 max-h-[85vh] flex flex-col border-0 z-[1000]"
        overlayClassName="z-[1000]"
      >
        <SheetHeader className="px-5 pt-5 pb-2">
          <SheetTitle className="flex items-center gap-2 text-left">
            <Gift className="h-5 w-5 text-orange-600" />
            {storeName ? (
              <><span translate="no" className="notranslate">{storeName}</span> Rewards</>
            ) : (
              "Loyalty Points"
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Points card */}
        <div className="px-5">
          <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white p-5 shadow-lg">
            <div className="flex items-center gap-1.5 text-orange-50 text-sm">
              <Coins className="h-4 w-4" /> Available points
            </div>
            <div className="text-5xl font-extrabold mt-1 tracking-tight">
              {loading && !balance ? "—" : (balance?.balance ?? 0).toLocaleString()}
            </div>
            <div className="text-orange-50 text-sm mt-0.5">
              worth {currency}
              {Math.round((balance?.balance ?? 0) * (balance?.pointValue ?? 1))} here
            </div>
            <div className="flex gap-5 mt-4 pt-3 border-t border-white/20 text-xs">
              <div>
                <div className="text-orange-100">Earned</div>
                <div className="font-bold text-base">{balance?.lifetimeEarned ?? 0}</div>
              </div>
              <div>
                <div className="text-orange-100">Redeemed</div>
                <div className="font-bold text-base">{balance?.lifetimeRedeemed ?? 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="px-5 pt-5 pb-2 text-sm font-semibold text-muted-foreground">History</div>
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No points activity yet. Order to start earning!
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((t) => {
                const Icon = txnIcon(t.type);
                const credit = t.delta > 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        credit ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{loyaltyTxnLabel(t.type)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {fmtDate(t.createdAt)}
                        {t.orderDisplayId ? ` · #${t.orderDisplayId}` : ""}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm ${credit ? "text-emerald-600" : "text-orange-600"}`}>
                        {credit ? "+" : ""}
                        {t.delta}
                      </div>
                      <div className="text-[11px] text-muted-foreground">bal {t.balanceAfter}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Compact tappable points pill for a logged-in customer on a partner page. Self-fetches
 * the balance and renders nothing if loyalty isn't enabled for the partner (or the user
 * isn't a logged-in customer). Opens the history sheet on tap.
 */
export function LoyaltyPointsBadge({
  partnerId,
  currency = "₹",
  storeName,
  className,
}: {
  partnerId: string;
  currency?: string;
  storeName?: string;
  className?: string;
}) {
  const [view, setView] = useState<LoyaltyBalanceView | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    if (!partnerId) return;
    getLoyaltyBalance(partnerId)
      .then(setView)
      .catch(() => setView(null));
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when the sheet closes (balance may have changed after a redemption).
  useEffect(() => {
    if (!open) load();
  }, [open, load]);

  if (!view || !view.enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-full bg-orange-100 text-orange-700 px-3 py-1.5 text-sm font-semibold shadow-sm active:scale-95 transition-transform"
        }
        aria-label="View loyalty points"
      >
        <Coins className="h-4 w-4" />
        {view.balance.toLocaleString()} pts
      </button>
      <LoyaltyHistorySheet
        partnerId={partnerId}
        currency={currency}
        storeName={storeName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
