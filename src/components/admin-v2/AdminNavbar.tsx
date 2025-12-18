import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Menu, UtensilsCrossed, Printer } from "lucide-react";
import { SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { Partner, useAuthStore } from "@/store/authStore";
import { useAdminStore } from "@/store/adminStore";
import { OrderNotification } from "./OrderNotification";
import { getFeatures } from "@/lib/getFeatures";

interface AdminNavbarProps {
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

export function AdminNavbar({ onToggleSidebar, isSidebarOpen }: AdminNavbarProps) {
    const { userData } = useAuthStore();
    const { setActiveView } = useAdminStore();

    return (
        <nav className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
            <div className="flex items-center gap-4">
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>
                </SheetTrigger>
                <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={onToggleSidebar}>
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle sidebar</span>
                </Button>
                <div className="flex items-center gap-2 hidden lg:flex">
                    <UtensilsCrossed className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">Cravings</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {userData?.role === 'partner' && !(userData as Partner).is_shop_open && (
                    <div className="hidden sm:flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full border border-red-200 dark:border-red-800 animate-pulse">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Store Closed
                    </div>
                )}
                {userData?.role === 'partner' && (() => {
                    const features = getFeatures((userData as Partner).feature_flags || "");
                    const hasPrintingFeatures = features.ordering.access || features.delivery.access || features.pos.access;

                    if (hasPrintingFeatures) {
                        return (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                onClick={() => console.log("PRINTER SETTINGS OPEN")}
                                title="Printer Settings"
                            >
                                <Printer className="h-5 w-5" />
                            </Button>
                        );
                    }
                    return null;
                })()}
                <OrderNotification />
                <ModeToggle />
                {userData?.role === 'partner' && (
                    <div
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setActiveView("Settings")}
                        title="Settings"
                    >
                        <Avatar>
                            <AvatarImage src={(userData as Partner).store_banner} className="object-cover" />
                            <AvatarFallback>{(userData as Partner).store_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                )}
            </div>
        </nav>
    );
}
