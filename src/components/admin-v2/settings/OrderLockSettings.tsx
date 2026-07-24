"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

    // The toggle value the user is trying to apply, held in a ref so it survives
    // the modal's close/success ordering. (The password modal's "Verify" button
    // auto-closes the dialog, so onClose can fire around the same time as
    // onSuccess — a ref is immune to that render/closure timing, unlike state.)
    const pendingValueRef = useRef<boolean | null>(null);
    const [passwordOpen, setPasswordOpen] = useState(false);

    useEffect(() => {
        if (userData) setLockCompleted(readLock(userData as any));
    }, [userData]);

    // Clicking the switch never moves it directly — it stashes the intended value
    // and opens the master-password prompt. The switch only flips once the
    // password is verified (handlePasswordSuccess).
    const requestToggle = (next: boolean) => {
        pendingValueRef.current = next;
        setPasswordOpen(true);
    };

    // Runs only after the master password is verified. Applies the stashed value
    // absolutely (idempotent) and closes the modal. The ref is intentionally NOT
    // cleared in onClose, so this always reads the intended value.
    const handlePasswordSuccess = () => {
        if (pendingValueRef.current !== null) {
            setLockCompleted(pendingValueRef.current);
        }
        setPasswordOpen(false);
    };

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
                actionDescription={`${lockCompleted ? "disable" : "enable"} the completed-order lock`}
                onClose={() => setPasswordOpen(false)}
                onSuccess={handlePasswordSuccess}
            />
        </div>
    );
}
