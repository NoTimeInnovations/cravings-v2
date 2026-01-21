"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAccounts, removeAccount } from "@/lib/addAccount";
import { Partner, useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    ChevronDown,
    UserCircle,
    LogOut,
    Plus,
    X,
    Check,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Account {
    id: string;
    name: string;
    email: string;
    store_name: string;
    role: string;
    password: string;
}

export function AdminAccountSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isSwitching, setIsSwitching] = useState(false);
    const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const {
        userData,
        signInPartnerWithEmail,
        signInCaptainWithEmail,
        signInSuperAdminWithEmail,
        signInWithPhone,
        signOut,
    } = useAuthStore();

    const partner = userData as Partner;

    // Fetch accounts on mount and when dropdown opens
    useEffect(() => {
        const loadAccounts = async () => {
            const storedAccounts = await getAccounts();
            // Filter to only show partner accounts for admin panel
            const partnerAccounts = storedAccounts.filter(
                (acc: Account) => acc.role === "partner" || acc.role === "superadmin" || acc.role === "captain"
            );
            setAccounts(partnerAccounts);
        };

        if (isOpen) {
            loadAccounts();
        }
    }, [isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleSwitchAccount = async (account: Account) => {
        setIsSwitching(true);
        setSwitchingAccountId(account.id);

        try {
            switch (account.role) {
                case "partner":
                    await signInPartnerWithEmail(account.email, account.password);
                    break;
                case "superadmin":
                    await signInSuperAdminWithEmail(account.email, account.password);
                    break;
                case "captain":
                    await signInCaptainWithEmail(account.email, account.password);
                    break;
                case "user":
                    await signInWithPhone(account.password);
                    break;
                default:
                    toast.error("Unknown account role: " + account.role);
                    console.error("Unknown account role:", account.role);
                    return;
            }

            toast.success(`Switched to ${account.store_name || account.name}`);
            setIsOpen(false);

            // Redirect to admin-v2 and refresh the page
            setTimeout(() => {
                router.push("/admin-v2");
                router.refresh();
            }, 500);
        } catch (error) {
            console.error("Failed to switch account:", error);
            toast.error("Failed to switch account");
        } finally {
            setIsSwitching(false);
            setSwitchingAccountId(null);
        }
    };

    const handleRemoveAccount = async (accountId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await removeAccount(accountId);
        const updatedAccounts = accounts.filter((acc) => acc.id !== accountId);
        setAccounts(updatedAccounts);
    };

    const handleAddAccount = () => {
        setIsOpen(false);
        router.push("/login");
    };

    const handleLogout = async () => {
        setIsOpen(false);
        await signOut();
        router.push("/login");
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-orange-50 dark:hover:bg-orange-900/20"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Avatar className="h-8 w-8">
                    <AvatarImage src={partner?.store_banner} className="object-cover" />
                    <AvatarFallback className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 text-xs">
                        {partner?.store_name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium truncate max-w-[120px]">
                        {partner?.store_name || "My Store"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {partner?.email}
                    </span>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                )} />
            </Button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-background rounded-lg shadow-lg border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Current Account Header */}
                    <div className="px-4 py-3 bg-muted/50 border-b border-border">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={partner?.store_banner} className="object-cover" />
                                <AvatarFallback className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                    {partner?.store_name?.slice(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">
                                    {partner?.store_name || "My Store"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {partner?.email}
                                </p>
                            </div>
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        </div>
                    </div>

                    {/* Other Accounts */}
                    {accounts.length > 0 && (
                        <div className="py-2 border-b border-border">
                            <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Switch Account
                            </p>
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors",
                                        isSwitching && "opacity-50 pointer-events-none"
                                    )}
                                    onClick={() => handleSwitchAccount(account)}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
                                            {account.store_name?.slice(0, 2).toUpperCase() || account.name?.slice(0, 2).toUpperCase() || "??"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {account.store_name || account.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {account.email}
                                        </p>
                                    </div>
                                    {switchingAccountId === account.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                    ) : (
                                        <button
                                            onClick={(e) => handleRemoveAccount(account.id, e)}
                                            className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors"
                                            title="Remove account"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="py-2">
                        <button
                            onClick={handleAddAccount}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors"
                        >
                            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Plus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <span className="font-medium">Add another account</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                        >
                            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <LogOut className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Sign out</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Full-screen loading overlay when switching */}
            {isSwitching && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-lg font-medium text-orange-600 dark:text-orange-400">
                            Switching account...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
