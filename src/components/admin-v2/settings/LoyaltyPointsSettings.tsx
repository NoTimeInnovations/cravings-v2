"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Gift, Percent, Coins, Wallet } from "lucide-react";
import { getFeatures } from "@/lib/getFeatures";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import {
    parseLoyaltySettingsV2,
    serializeLoyaltySettingsV2,
    resolveLoyaltyForType,
    computeEarnPoints,
    pointsToValue,
    LOYALTY_ORDER_TYPES,
    type LoyaltyOrderType,
    type LoyaltySettingsV2,
    type PerTypeLoyalty,
} from "@/lib/loyalty/config";

const TYPE_LABEL: Record<LoyaltyOrderType, string> = {
    delivery: "Delivery",
    takeaway: "Takeaway",
    dine_in: "Dine-in",
};

export function LoyaltyPointsSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    const [cfg, setCfg] = useState<LoyaltySettingsV2>(() => parseLoyaltySettingsV2(null));
    const [active, setActive] = useState<LoyaltyOrderType>("delivery");
    const [initialLoaded, setInitialLoaded] = useState(false);

    const currency = (userData as any)?.currency || "₹";
    const enabled = !!getFeatures((userData as any)?.feature_flags || null).loyalty_points?.enabled;

    useEffect(() => {
        if (!userData) return;
        setCfg(parseLoyaltySettingsV2((userData as any)?.loyalty_settings));
        setInitialLoaded(true);
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            const payload = serializeLoyaltySettingsV2(cfg);
            await updatePartner((userData as any).id, { loyalty_settings: payload });
            revalidateTag((userData as any).id);
            setState({ loyalty_settings: payload } as any);
            toast.success("Loyalty settings saved");
            setHasChanges(false);
        } catch (e) {
            console.error("Error saving loyalty settings:", e);
            toast.error("Failed to save loyalty settings");
        }
    }, [cfg, userData, setState, setHasChanges]);

    useEffect(() => {
        if (!initialLoaded) return;
        setHasChanges(true);
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [cfg, initialLoaded, handleSave, setSaveAction, setHasChanges]);

    const num = (v: string) => (v === "" ? 0 : Math.max(0, parseFloat(v) || 0));

    const block = cfg.per_type[active];
    // Patch the currently-selected order type's rules.
    const patch = useCallback(
        (p: Partial<PerTypeLoyalty>) =>
            setCfg((prev) => ({
                ...prev,
                per_type: { ...prev.per_type, [active]: { ...prev.per_type[active], ...p } },
            })),
        [active],
    );

    const example = useMemo(() => {
        const sample = 500;
        const s = resolveLoyaltyForType(cfg, active).settings;
        const pts = computeEarnPoints(sample, s);
        return { sample, pts, value: pointsToValue(pts, s) };
    }, [cfg, active]);

    if (!userData) return null;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-orange-600" />
                        Loyalty Points
                    </CardTitle>
                    <CardDescription>
                        Customers earn points on completed orders and redeem them on future orders at
                        your store only. 1 point = {currency}1. Rules are set separately for each order
                        type — you can even turn loyalty off for just one type.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {!enabled && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            Loyalty points are currently <span className="font-semibold">off</span>. Turn
                            them on under <span className="font-semibold">Settings → Features</span> to
                            start awarding points. You can still configure the rules below.
                        </div>
                    )}

                    {/* Order-type selector */}
                    <div className="inline-flex flex-wrap rounded-md border bg-white p-0.5">
                        {LOYALTY_ORDER_TYPES.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setActive(t)}
                                className={`rounded px-4 py-1.5 text-sm transition ${
                                    active === t
                                        ? "bg-orange-500 text-white"
                                        : "text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                {TYPE_LABEL[t]}
                                {!cfg.per_type[t].enabled && (
                                    <span className="ml-1 text-[10px] opacity-70">off</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Per-type enable */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5 pr-3">
                            <Label className="text-sm">Loyalty on {TYPE_LABEL[active]} orders</Label>
                            <p className="text-xs text-muted-foreground">
                                Turn off to stop earning and redeeming points on{" "}
                                {TYPE_LABEL[active].toLowerCase()} orders.
                            </p>
                        </div>
                        <Switch checked={block.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
                    </div>

                    <div
                        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                            block.enabled ? "" : "opacity-50 pointer-events-none"
                        }`}
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="earn_percent" className="flex items-center gap-1.5">
                                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                                Earn rate (% of order)
                            </Label>
                            <Input
                                id="earn_percent"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={100}
                                step="0.5"
                                value={block.earn_percent}
                                onChange={(e) => patch({ earn_percent: Math.min(100, num(e.target.value)) })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Points awarded after an order is completed.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="min_order_amount" className="flex items-center gap-1.5">
                                <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                                Min order to earn ({currency})
                            </Label>
                            <Input
                                id="min_order_amount"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="1"
                                value={block.min_order_amount}
                                onChange={(e) => patch({ min_order_amount: num(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">Orders below this earn nothing.</p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="max_redeem_percent" className="flex items-center gap-1.5">
                                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                                Max redeemable (% of bill)
                            </Label>
                            <Input
                                id="max_redeem_percent"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={100}
                                step="5"
                                value={block.max_redeem_percent}
                                onChange={(e) =>
                                    patch({ max_redeem_percent: Math.min(100, num(e.target.value)) })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Cap on how much of an order points can cover.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="min_redeem_points">Min points to redeem</Label>
                            <Input
                                id="min_redeem_points"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step="1"
                                value={block.min_redeem_points}
                                onChange={(e) => patch({ min_redeem_points: Math.round(num(e.target.value)) })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Customers need at least this many points to redeem.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
                        <div className="text-sm text-orange-900">
                            <span className="font-semibold">Example ({TYPE_LABEL[active]}):</span> a {currency}
                            {example.sample.toLocaleString()} order earns{" "}
                            <span className="font-semibold">{example.pts} points</span>
                            {example.pts > 0 ? (
                                <>
                                    {" "}worth{" "}
                                    <span className="font-semibold">
                                        {currency}
                                        {example.value}
                                    </span>{" "}
                                    on their next visit.
                                </>
                            ) : block.enabled ? (
                                <> — increase the earn rate or lower the minimum order.</>
                            ) : (
                                <> — loyalty is off for {TYPE_LABEL[active].toLowerCase()} orders.</>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
