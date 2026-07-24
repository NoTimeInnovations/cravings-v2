"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldAlert } from "lucide-react";

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
    const [lockCompleted, setLockCompleted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // The toggle value the user is trying to apply, held in a ref so it survives
    // the modal's close/success ordering (the "Verify" button auto-closes the
    // dialog, so onClose can fire around the same time as onSuccess).
    const pendingValueRef = useRef<boolean | null>(null);
    const [passwordOpen, setPasswordOpen] = useState(false);

    useEffect(() => {
        if (userData) setLockCompleted(readLock(userData as any));
    }, [userData]);

    // This section persists immediately on password-confirm, so it registers NO
    // floating Save action — clear any one left over by a previously-open section
    // so the global Save button doesn't linger over this screen.
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();
    useEffect(() => {
        setSaveAction(null);
        setHasChanges(false);
    }, [setSaveAction, setHasChanges]);

    // Clicking the switch never moves it directly — it stashes the intended value
    // and opens the master-password prompt. The switch only flips (and saves)
    // once the password is verified.
    const requestToggle = (next: boolean) => {
        pendingValueRef.current = next;
        setPasswordOpen(true);
    };

    // Persist the verified value straight to the partner row — no separate Save
    // step. Optimistic on the switch; reverts if the write fails.
    const persist = async (next: boolean) => {
        if (!userData) return;
        const previous = lockCompleted;
        setLockCompleted(next); // optimistic
        setIsSaving(true);
        try {
            // Read-modify-write delivery_rules so we don't clobber round-off /
            // bill-printing / delivery pricing owned by other settings sections.
            const existingDeliveryRules = (userData as any).delivery_rules || {};
            const updates = {
                delivery_rules: {
                    ...existingDeliveryRules,
                    lock_completed_orders: next,
                },
            };

            await updatePartner(userData.id, updates);
            revalidateTag(userData.id);
            setState(updates);
            toast.success(
                next ? "Completed-order lock enabled" : "Completed-order lock disabled"
            );
        } catch (error) {
            console.error("Error updating order lock setting:", error);
            setLockCompleted(previous); // revert on failure
            toast.error("Failed to update order lock setting");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordSuccess = () => {
        setPasswordOpen(false);
        if (pendingValueRef.current !== null) {
            persist(pendingValueRef.current);
        }
    };

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
                        requires the master password and saves immediately.
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
                                marked complete.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {isSaving && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            <Switch
                                checked={lockCompleted}
                                disabled={isSaving}
                                onCheckedChange={requestToggle}
                            />
                        </div>
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
