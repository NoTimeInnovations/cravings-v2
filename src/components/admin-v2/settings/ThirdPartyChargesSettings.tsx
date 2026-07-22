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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuthStore, Partner } from "@/store/authStore";
import type { DeliveryRecharge } from "@/store/orderStore";
import {
    getThirdPartyChargeData,
    saveDeliveryRecharges,
} from "@/app/actions/deliveryCharges";
import type { ThirdPartyChargeData, ChargeProvider } from "@/lib/deliveryBridgeTypes";
import {
    Loader2,
    Plus,
    Trash2,
    Pencil,
    Check,
    X,
    RefreshCw,
    Wallet,
    AlertTriangle,
    TrendingDown,
    ArrowUpCircle,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

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

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const MIGRATION_SQL =
    "ALTER TABLE partners ADD COLUMN IF NOT EXISTS delivery_recharges jsonb;";

export function ThirdPartyChargesSettings() {
    const { userData, setState } = useAuthStore();
    const partnerId = userData?.id;
    const currencySymbol = (userData as Partner)?.currency || "₹";

    const [data, setData] = useState<ThirdPartyChargeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Add-recharge form
    const [showAdd, setShowAdd] = useState(false);
    const [addProvider, setAddProvider] = useState<ChargeProvider>("porter");
    const [addAmount, setAddAmount] = useState("");
    const [addDate, setAddDate] = useState(todayISO());
    const [addNote, setAddNote] = useState("");

    // Inline edit
    const [editId, setEditId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editNote, setEditNote] = useState("");

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

    const recharges = data?.recharges ?? [];

    // Persist a new recharge array, then refresh derived totals + sync authStore.
    const persist = useCallback(
        async (next: DeliveryRecharge[], successMsg: string) => {
            if (!partnerId) return;
            setSaving(true);
            try {
                const res = await saveDeliveryRecharges({ partnerId, recharges: next });
                if (!res.ok) {
                    toast.error(res.message);
                    return;
                }
                setState({ delivery_recharges: res.recharges } as Partial<Partner>);
                toast.success(successMsg);
                await load();
            } catch (e) {
                toast.error((e as Error).message);
            } finally {
                setSaving(false);
            }
        },
        [partnerId, setState, load],
    );

    const handleAdd = async () => {
        const amount = Number(addAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Enter a valid recharge amount");
            return;
        }
        const entry: DeliveryRecharge = {
            // Prefer a real uuid; the fallback mixes time + two random draws to
            // make an in-session collision effectively impossible. The server
            // also de-dupes ids on save as a final guard.
            id:
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
                          .toString(36)
                          .slice(2)}`,
            provider: addProvider,
            amount,
            date: addDate || todayISO(),
            note: addNote.trim() || undefined,
            created_at: new Date().toISOString(),
        };
        await persist([entry, ...recharges], "Recharge added");
        setShowAdd(false);
        setAddAmount("");
        setAddNote("");
        setAddDate(todayISO());
    };

    const startEdit = (r: DeliveryRecharge) => {
        setEditId(r.id);
        setEditAmount(String(r.amount));
        setEditDate(r.date || todayISO());
        setEditNote(r.note ?? "");
    };

    const handleEditSave = async (id: string) => {
        const amount = Number(editAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        const next = recharges.map((r) =>
            r.id === id
                ? { ...r, amount, date: editDate || r.date, note: editNote.trim() || undefined }
                : r,
        );
        await persist(next, "Recharge updated");
        setEditId(null);
    };

    const handleDelete = async (id: string) => {
        await persist(
            recharges.filter((r) => r.id !== id),
            "Recharge removed",
        );
    };

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
                        Track how much you&apos;ve recharged into each delivery portal and how much
                        has been spent on deliveries — so you know before a portal runs dry.
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

            {data?.needsMigration && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" /> One-time database setup required
                    </div>
                    <p>
                        Recharge tracking needs a new column on the partners table. Consumption below
                        still works, but you can&apos;t log recharges until this runs on Hasura:
                    </p>
                    <code className="block rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-900">
                        {MIGRATION_SQL}
                    </code>
                </div>
            )}

            {/* Per-provider summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PROVIDERS.map((provider) => {
                    const s = data?.summaries[provider];
                    const recharged = s?.totalRecharged ?? 0;
                    const walletSpent = s?.walletSpent ?? 0;
                    const totalSpent = s?.totalSpent ?? 0;
                    const balance = s?.balance ?? 0;
                    const low = recharged > 0 && balance <= recharged * 0.15;
                    return (
                        <Card key={provider} className={PROVIDER_ACCENT[provider]}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">{PROVIDER_LABEL[provider]}</span>
                                    {s?.connectedMobile ? (
                                        <span className="text-[11px] rounded-full bg-white/70 border px-2 py-0.5 text-muted-foreground">
                                            ••{s.connectedMobile.slice(-4)}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-muted-foreground">
                                            not connected
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <div
                                        className={`text-2xl font-bold ${
                                            balance < 0
                                                ? "text-red-600"
                                                : low
                                                  ? "text-amber-600"
                                                  : "text-foreground"
                                        }`}
                                    >
                                        {currencySymbol}
                                        {balance.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        balance remaining
                                    </div>
                                    {low && balance >= 0 && (
                                        <div className="mt-1 text-[11px] font-medium text-amber-600">
                                            Running low — consider a recharge
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                                    <div>
                                        <div className="flex items-center gap-1 text-emerald-600">
                                            <ArrowUpCircle className="h-3 w-3" /> Recharged
                                        </div>
                                        <div className="font-semibold text-foreground">
                                            {currencySymbol}
                                            {recharged.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1 text-amber-600">
                                            <Wallet className="h-3 w-3" /> Wallet spent
                                        </div>
                                        <div className="font-semibold text-foreground">
                                            {currencySymbol}
                                            {walletSpent.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" /> Total delivery cost{" "}
                                        <span className="font-medium text-foreground">
                                            {currencySymbol}
                                            {totalSpent.toFixed(2)}
                                        </span>
                                    </span>
                                    <span>
                                        {s?.orderCount ?? 0} order{(s?.orderCount ?? 0) === 1 ? "" : "s"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Live Porter wallet */}
            {data?.porterWallet && (
                <Card className="border-orange-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-orange-600" />
                            <div>
                                <div className="text-sm font-medium">Live Porter wallet</div>
                                <div className="text-xs text-muted-foreground">
                                    Actual prepaid balance on Porter right now
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold">
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
                    </CardContent>
                </Card>
            )}

            {/* Recharge ledger */}
            <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base">Recharge log</CardTitle>
                        <CardDescription>
                            Every time you top up a portal, add the amount here.
                        </CardDescription>
                    </div>
                    {!showAdd && (
                        <Button
                            size="sm"
                            onClick={() => setShowAdd(true)}
                            disabled={data?.needsMigration}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add recharge
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-3">
                    {showAdd && (
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Provider</Label>
                                    <Select
                                        value={addProvider}
                                        onValueChange={(v) => setAddProvider(v as ChargeProvider)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PROVIDERS.map((p) => (
                                                <SelectItem key={p} value={p}>
                                                    {PROVIDER_LABEL[p]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Amount ({currencySymbol})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={addAmount}
                                        onChange={(e) => setAddAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Date</Label>
                                    <Input
                                        type="date"
                                        value={addDate}
                                        max={todayISO()}
                                        onChange={(e) => setAddDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Note (optional)</Label>
                                    <Input
                                        value={addNote}
                                        onChange={(e) => setAddNote(e.target.value)}
                                        placeholder="ref / mode"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={handleAdd} disabled={saving}>
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowAdd(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {recharges.length === 0 && !showAdd ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No recharges logged yet.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {recharges.map((r) =>
                                editId === r.id ? (
                                    <div
                                        key={r.id}
                                        className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                                    >
                                        <div className="space-y-1">
                                            <Label className="text-xs">Amount</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={editAmount}
                                                onChange={(e) => setEditAmount(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Date</Label>
                                            <Input
                                                type="date"
                                                value={editDate}
                                                max={todayISO()}
                                                onChange={(e) => setEditDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Note</Label>
                                            <Input
                                                value={editNote}
                                                onChange={(e) => setEditNote(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 pb-0.5">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleEditSave(r.id)}
                                                disabled={saving}
                                                title="Save"
                                            >
                                                <Check className="h-4 w-4 text-emerald-600" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setEditId(null)}
                                                disabled={saving}
                                                title="Cancel"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={r.id}
                                        className="py-2.5 flex items-center gap-3"
                                    >
                                        <span className="text-xs font-medium rounded px-2 py-0.5 bg-muted capitalize w-16 text-center">
                                            {PROVIDER_LABEL[r.provider as ChargeProvider] ?? r.provider}
                                        </span>
                                        <span className="text-sm font-semibold text-emerald-700 w-24">
                                            +{currencySymbol}
                                            {Number(r.amount).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground w-28">
                                            {fmtDate(r.date)}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex-1 truncate">
                                            {r.note ?? ""}
                                        </span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => startEdit(r)}
                                            title="Edit"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(r.id)}
                                            disabled={saving}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                        </Button>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

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
