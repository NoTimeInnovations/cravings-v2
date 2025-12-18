import React, { useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useAuthStore, Partner, Captain } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PasswordProtectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    actionDescription?: string;
}

export function PasswordProtectionModal({
    isOpen,
    onClose,
    onSuccess,
    actionDescription = "continue",
}: PasswordProtectionModalProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { userData } = useAuthStore();

    const handleConfirm = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!password) return;

        setLoading(true);
        try {
            if (!userData) {
                toast.error("User not verified");
                return;
            }

            let isValid = false;

            if (userData.role === "partner") {
                const response = await fetchFromHasura(
                    `
                    query VerifyPartnerPassword($id: uuid!, $password: String!) {
                        partners(where: {id: {_eq: $id}, password: {_eq: $password}}) {
                            id
                        }
                    }
                    `,
                    {
                        id: userData.id,
                        password: password,
                    }
                );
                isValid = response?.partners?.length > 0;
            } else if (userData.role === "captain") {
                const response = await fetchFromHasura(
                    `
                    query VerifyCaptainPassword($id: uuid!, $password: String!) {
                        captain(where: {id: {_eq: $id}, password: {_eq: $password}}) {
                            id
                        }
                    }
                    `,
                    {
                        id: userData.id,
                        password: password,
                    }
                );
                isValid = response?.captain?.length > 0;
            } else if (userData.role === "superadmin") {
                const response = await fetchFromHasura(
                    `
                    query VerifySuperAdminPassword($id: uuid!, $password: String!) {
                        super_admin(where: {id: {_eq: $id}, password: {_eq: $password}}) {
                            id
                        }
                    }
                    `,
                    {
                        id: userData.id,
                        password: password,
                    }
                );
                isValid = response?.super_admin?.length > 0;
            }

            if (isValid) {
                setPassword("");
                onSuccess();
                onClose();
            } else {
                toast.error("Incorrect password");
            }
        } catch (error) {
            console.error("Password verification failed:", error);
            toast.error("Verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enter Password</AlertDialogTitle>
                    <AlertDialogDescription>
                        Please enter your password to {actionDescription}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <form onSubmit={handleConfirm} className="space-y-4 py-2">
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel type="button" onClick={onClose}>Cancel</AlertDialogCancel>
                        <AlertDialogAction type="submit" disabled={loading || !password}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    );
}
