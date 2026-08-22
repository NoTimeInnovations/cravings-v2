"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Zap } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";

const readAutoAccept = (userData: any): boolean =>
    !!userData?.delivery_rules?.auto_accept_orders;

/**
 * Auto-accept incoming orders.
 *
 * The switch only records the partner's intent; the accepting itself happens
 * server-side on the Hasura order event, so it covers orders from the storefront,
 * the POS, the captain app and the public API alike — see
 * src/app/api/webhooks/hasura/order-event/route.ts.
 */
export function OrderHandlingSettings() {
    const { userData, setState } = useAuthStore();
    const [autoAccept, setAutoAccept] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userData) setAutoAccept(readAutoAccept(userData as any));
    }, [userData]);

    // Saves on toggle, so this section registers no floating Save action — clear
    // any left by a previously-open section.
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();
    useEffect(() => {
        setSaveAction(null);
        setHasChanges(false);
    }, [setSaveAction, setHasChanges]);

    const persist = async (next: boolean) => {
        if (!userData) return;
        const previous = autoAccept;
        setAutoAccept(next); // optimistic
        setIsSaving(true);
        try {
            // Read-modify-write: delivery_rules is shared with delivery pricing,
            // parcel charges and bill printing.
            const existingDeliveryRules = (userData as any).delivery_rules || {};
            const updates = {
                delivery_rules: {
                    ...existingDeliveryRules,
                    auto_accept_orders: next,
                },
            };
            await updatePartner(userData.id, updates);
            revalidateTag(userData.id);
            setState(updates);
            toast.success(next ? "Orders will be accepted automatically" : "Auto-accept turned off");
        } catch (error) {
            console.error("Error updating auto-accept setting:", error);
            setAutoAccept(previous); // revert on failure
            toast.error("Failed to update auto-accept");
        } finally {
            setIsSaving(false);
        }
    };

    // Writes to the partner row; only meaningful in a partner session.
    if (!userData || (userData as any).role !== "partner") return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Order Handling
                    </CardTitle>
                    <CardDescription>
                        What happens the moment an order arrives. Saves immediately.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5 pr-4">
                            <Label className="text-base">Auto-accept orders</Label>
                            <p className="text-sm text-muted-foreground">
                                New orders go straight to <strong>Accepted</strong> instead of
                                waiting for someone to accept them — so the new-order alarm stops
                                ringing and the kitchen can start immediately.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                The bill prints automatically on this dashboard as each order is
                                accepted. If you have already set up auto-print for the Accepted
                                status under Bill Printing, that choice is used instead — so a
                                Bill&nbsp;+&nbsp;KOT setup keeps printing both.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Online-payment orders are still only accepted once the payment
                                confirms, never while they are unpaid.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            <Switch
                                checked={autoAccept}
                                onCheckedChange={persist}
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                    {autoAccept && (
                        <p className="text-sm text-amber-600">
                            With this on, nobody is asked to confirm an order before the kitchen
                            sees it. Turn it off if orders need to be checked first.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
