"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { PasswordProtectionModal } from "../PasswordProtectionModal";

// Hard-coded master password guarding this "extreme" toggle. Typing it is the
// only way to switch the completed-order lock on or off — see the product
// requirement for an admin-only safeguard independent of the partner's own
// password.
const MASTER_PASSWORD = "menuthere@rinshad";

const readLock = (userData: any): boolean =>
    !!userData?.delivery_rules?.lock_completed_orders;

export function OrderLockSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const [lockCompleted, setLockCompleted] = useState(false);

    // The toggle value the user is trying to apply, pending master-password auth.
    const [pendingValue, setPendingValue] = useState<boolean | null>(null);
    const [passwordOpen, setPasswordOpen] = useState(false);

    useEffect(() => {
        if (userData) setLockCompleted(readLock(userData as any));
    }, [userData]);

    // Clicking the switch never moves it directly — it opens the master-password
    // prompt for the intended value. The switch only flips once the password is
    // verified (applyPending).
    const requestToggle = (next: boolean) => {
        setPendingValue(next);
        setPasswordOpen(true);
    };

    // Memoized on pendingValue so the modal's onSuccess always applies the latest
    // intended value. The modal calls onSuccess() before onClose() (which clears
    // pendingValue), so this reads the correct value; the `prev` fallback guards
    // against any future reordering.
    const applyPending = useCallback(() => {
        setLockCompleted((prev) => (pendingValue !== null ? pendingValue : prev));
    }, [pendingValue]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            // Read-modify-write delivery_rules so we don't clobber round-off /
            // bill-printing / delivery pricing owned by other settings sections.
            const existingDeliveryRules = (userData as any).delivery_rules || {};
            const updates = {
                delivery_rules: {
                    ...existingDeliveryRules,
                    lock_completed_orders: lockCompleted,
                },
            };

            await updatePartner(userData.id, updates);
            revalidateTag(userData.id);
            setState(updates);
            toast.success("Order lock setting updated");
        } catch (error) {
            console.error("Error updating order lock setting:", error);
            toast.error("Failed to update order lock setting");
        } finally {
            setIsSaving(false);
        }
    }, [userData, lockCompleted, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSave, setSaveAction, setHasChanges]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    useEffect(() => {
        if (!userData) return;
        setHasChanges(lockCompleted !== readLock(userData as any));
    }, [lockCompleted, userData, setHasChanges]);

    // This setting writes to the partner row; only render for a partner session.
    // (Placed after all hooks so hook order stays stable.)
    if (!userData || (userData as any).role !== "partner") return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-600" />
                        Order Lock
                    </CardTitle>
                    <CardDescription>
                        Advanced safeguard for completed orders. Turning this on or off
                        requires the master password.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5 pr-4">
                            <Label className="text-base">Lock completed orders</Label>
                            <p className="text-sm text-muted-foreground">
                                When on, a completed order can no longer be edited anywhere
                                (POS, captain app or dashboard) — staff can only cancel it.
                                Use this to stop bills from being changed after an order is
                                marked complete. Remember to press Save after changing it.
                            </p>
                        </div>
                        <Switch
                            checked={lockCompleted}
                            onCheckedChange={(next) => requestToggle(next)}
                        />
                    </div>
                </CardContent>
            </Card>

            <PasswordProtectionModal
                isOpen={passwordOpen}
                masterPassword={MASTER_PASSWORD}
                actionDescription={`${pendingValue ? "enable" : "disable"} the completed-order lock`}
                onClose={() => {
                    setPasswordOpen(false);
                    setPendingValue(null);
                }}
                onSuccess={applyPending}
            />
        </div>
    );
}
