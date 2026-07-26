"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore, Partner } from "@/store/authStore";
import { getThirdPartyChargeData } from "@/app/actions/deliveryCharges";
import type { ThirdPartyChargeData, ChargeProvider } from "@/lib/deliveryBridgeTypes";
import {
    Loader2,
    RefreshCw,
    Wallet,
    ExternalLink,
    TrendingDown,
} from "lucide-react";

const PROVIDERS: ChargeProvider[] = ["porter", "rapido", "uber"];

const PROVIDER_LABEL: Record<ChargeProvider, string> = {
    porter: "Porter",
    rapido: "Rapido",
    uber: "Uber",
};

const PROVIDER_ACCENT: Record<ChargeProvider, string> = {
    porter: "border-orange-200 bg-orange-50/40",
    rapido: "border-yellow-200 bg-yellow-50/40",
    uber: "border-neutral-300 bg-neutral-50",
};

// Below this the Porter card flags the wallet as running low (mirrors the bridge).
const PORTER_LOW = 150;

function fmtDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Settings → Ordering → "3rd Party Delivery Charges".
 *
 * Porter is PREPAID and the delivery bridge exposes its real wallet, so the
 * Porter balance + transaction history are pulled LIVE from Porter's API — no
 * manual recharge logging. Rapido / Uber have no wallet API, so they show
 * delivery spend (from real orders) only.
 */
export function ThirdPartyChargesSettings() {
    const { userData } = useAuthStore();
    const partnerId = userData?.id;
    const currencySymbol = (userData as Partner)?.currency || "₹";

    const [data, setData] = useState<ThirdPartyChargeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!partnerId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getThirdPartyChargeData({ partnerId });
            if (!res.ok) setError(res.message);
            else setData(res);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [partnerId]);

    useEffect(() => {
        load();
    }, [load]);

    const orders = data?.orders ?? [];
    const [showAllOrders, setShowAllOrders] = useState(false);
    const visibleOrders = useMemo(
        () => (showAllOrders ? orders : orders.slice(0, 20)),
        [orders, showAllOrders],
    );

    if (loading && !data) {
        return (
            <Card>
                <CardContent className="py-16 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading charges…
                </CardContent>
            </Card>
        );
    }

    if (error && !data) {
        return (
            <Card>
                <CardContent className="py-10 text-center space-y-3">
                    <p className="text-sm text-red-600">{error}</p>
                    <Button variant="outline" size="sm" onClick={load}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header + refresh */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">3rd Party Delivery Charges</h2>
                    <p className="text-sm text-muted-foreground">
                        Your Porter prepaid wallet balance — live from Porter — and how much
                        each delivery portal has cost, so you know before a portal runs dry.
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Per-provider cards. Porter = LIVE wallet balance; Rapido/Uber = spend. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PROVIDERS.map((provider) => {
                    const s = data?.summaries[provider];
                    const porterLive = provider === "porter" ? data?.porterWallet ?? null : null;
                    const totalSpent = s?.totalSpent ?? 0;
                    const walletSpent = s?.walletSpent ?? 0;
                    const orderCount = s?.orderCount ?? 0;
                    // Only Porter has a live prepaid balance; null = not connected.
                    const balance = porterLive ? porterLive.balance : null;
                    const low = balance != null && balance < PORTER_LOW;
                    return (
                        <Card key={provider} className={PROVIDER_ACCENT[provider]}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">{PROVIDER_LABEL[provider]}</span>
                                    {porterLive ? (
                                        <span className="text-[11px] rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 font-medium text-emerald-700">
                                            ● Live{s?.connectedMobile ? ` ••${s.connectedMobile.slice(-4)}` : ""}
                                        </span>
                                    ) : s?.connectedMobile ? (
                                        <span className="text-[11px] rounded-full bg-white/70 border px-2 py-0.5 text-muted-foreground">
                                            ••{s.connectedMobile.slice(-4)}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-muted-foreground">
                                            not connected
                                        </span>
                                    )}
                                </div>

                                {provider === "porter" ? (
                                    porterLive ? (
                                        <div>
                                            <div
                                                className={`text-2xl font-bold ${
                                                    balance! < 0
                                                        ? "text-red-600"
                                                        : low
                                                          ? "text-amber-600"
                                                          : "text-foreground"
                                                }`}
                                            >
                                                {currencySymbol}
                                                {balance!.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                live balance on Porter
                                            </div>
                                            {low && balance! >= 0 && (
                                                <div className="mt-1 text-[11px] font-medium text-amber-600">
                                                    Running low — recharge soon
                                                </div>
                                            )}
                                            {porterLive.rechargeLink && (
                                                <a
                                                    href={porterLive.rechargeLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 text-xs text-orange-600 underline"
                                                >
                                                    Recharge <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-2xl font-bold text-muted-foreground">—</div>
                                            <div className="text-xs text-muted-foreground">
                                                Connect Porter to see the live wallet balance
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div>
                                        <div className="text-2xl font-bold text-foreground">
                                            {currencySymbol}
                                            {totalSpent.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            delivery spend
                                        </div>
                                    </div>
                                )}

                                {/* Real spend from delivered orders (not manual). */}
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                                    <span className="inline-flex items-center gap-1">
                                        <Wallet className="h-3 w-3" /> Wallet spent{" "}
                                        <span className="font-medium text-foreground">
                                            {currencySymbol}
                                            {walletSpent.toFixed(2)}
                                        </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" />
                                        {currencySymbol}
                                        {totalSpent.toFixed(2)} · {orderCount} order
                                        {orderCount === 1 ? "" : "s"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Porter wallet — live balance + REAL transaction history from the API. */}
            {data?.porterWallet && (
                <Card className="border-orange-200">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-orange-600" /> Porter wallet
                            </CardTitle>
                            <CardDescription>
                                Live prepaid balance and transactions, straight from Porter — no
                                manual entry needed.
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div
                                className={`text-xl font-bold ${
                                    data.porterWallet.balance < PORTER_LOW ? "text-amber-600" : ""
                                }`}
                            >
                                {currencySymbol}
                                {data.porterWallet.balance.toFixed(2)}
                            </div>
                            {data.porterWallet.rechargeLink && (
                                <a
                                    href={data.porterWallet.rechargeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-orange-600 underline inline-flex items-center gap-1"
                                >
                                    Recharge <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {data.porterWallet.history.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-3 text-center">
                                No wallet transactions yet.
                            </p>
                        ) : (
                            <div className="divide-y max-h-80 overflow-y-auto">
                                {data.porterWallet.history.map((h, i) => (
                                    <div key={i} className="py-2 flex items-center gap-3">
                                        <span
                                            className={`text-xs font-medium rounded px-2 py-0.5 w-16 text-center ${
                                                h.type === "credit"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-rose-100 text-rose-700"
                                            }`}
                                        >
                                            {h.type === "credit" ? "Recharge" : "Trip"}
                                        </span>
                                        <span className="text-sm flex-1 truncate">{h.title}</span>
                                        <span className="text-xs text-muted-foreground w-28 shrink-0">
                                            {h.date}
                                        </span>
                                        <span
                                            className={`text-sm font-semibold w-24 text-right shrink-0 ${
                                                h.type === "credit" ? "text-emerald-700" : "text-rose-600"
                                            }`}
                                        >
                                            {h.type === "credit" ? "+" : "−"}
                                            {currencySymbol}
                                            {h.amount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Per-order charges */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Delivery charges by order</CardTitle>
                    <CardDescription>
                        What each delivery actually cost, per provider.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {orders.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No third-party deliveries yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-muted-foreground border-b">
                                        <th className="py-2 pr-3 font-medium">Order</th>
                                        <th className="py-2 pr-3 font-medium">Date</th>
                                        <th className="py-2 pr-3 font-medium">Provider</th>
                                        <th className="py-2 pr-3 font-medium">Status</th>
                                        <th className="py-2 pr-3 font-medium">Pay</th>
                                        <th className="py-2 pr-0 font-medium text-right">Charge</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {visibleOrders.map((o) => (
                                        <tr key={o.orderId}>
                                            <td className="py-2 pr-3 font-medium">
                                                {o.displayId != null ? `#${o.displayId}` : "—"}
                                            </td>
                                            <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                                                {fmtDate(o.createdAt)}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {["porter", "rapido", "uber"].includes(o.provider) ? (
                                                    <span
                                                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize ${
                                                            PROVIDER_ACCENT[o.provider as ChargeProvider]
                                                        }`}
                                                    >
                                                        {o.provider}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 text-muted-foreground capitalize">
                                                {o.state ?? "—"}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {o.paymentMode === "wallet" ? (
                                                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                                        <Wallet className="h-3 w-3" /> Wallet
                                                    </span>
                                                ) : o.paymentMode === "cash" ? (
                                                    <span className="text-xs text-muted-foreground">Cash</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-0 text-right font-semibold">
                                                {o.fare != null
                                                    ? `${currencySymbol}${o.fare.toFixed(2)}`
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {orders.length > visibleOrders.length && (
                                <div className="pt-3 text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowAllOrders(true)}
                                    >
                                        Show all {orders.length} orders
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
