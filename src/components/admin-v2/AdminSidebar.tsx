"use client";

import {
    LayoutDashboard,
    ShoppingBag,
    UtensilsCrossed,
    FileBarChart,
    Settings,
    UserCog,
    QrCode,
    LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

interface SidebarItem {
    title: string;
    icon: React.ElementType;
    id: string;
}

const sidebarItems: SidebarItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
    { title: "Orders", icon: ShoppingBag, id: "orders" },
    { title: "Menu", icon: UtensilsCrossed, id: "menu" },
    { title: "QrCodes", icon: QrCode, id: "qrcodes" },
    { title: "Captains", icon: UserCog, id: "captains" },
    { title: "Settings", icon: Settings, id: "settings" },
];

interface AdminSidebarProps {
    activeView: string;
    onNavigate: (view: string) => void;
    className?: string;
}

export function AdminSidebar({ activeView, onNavigate, className }: AdminSidebarProps) {
    const { features } = useAuthStore();

    const filteredItems = sidebarItems.filter((item) => {
        if (item.id === "captains") {
            return features?.captainordering?.enabled;
        }
        if (item.id === "orders") {
            return features?.ordering?.enabled;
        }
        return true;
    });

    return (
        <div className={cn("flex flex-col h-full py-4", className)}>
            <div className="px-3 py-2">
                <div className="space-y-1">
                    {filteredItems.map((item) => (
                        <Button
                            key={item.id}
                            variant={activeView === item.title ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start",
                                activeView === item.title && "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 font-medium"
                            )}
                            onClick={() => onNavigate(item.title)}
                        >
                            <item.icon className={cn("mr-2 h-4 w-4", activeView === item.title && "text-orange-600 dark:text-orange-400")} />
                            {item.title}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mt-auto px-3 py-4 border-t border-border">
                <Button
                    variant={activeView === "Help & Support" ? "secondary" : "ghost"}
                    className={cn(
                        "w-full justify-start text-muted-foreground",
                        activeView === "Help & Support" && "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 font-medium"
                    )}
                    onClick={() => onNavigate("Help & Support")}
                >
                    <LifeBuoy className={cn("mr-2 h-4 w-4", activeView === "Help & Support" && "text-orange-600 dark:text-orange-400")} />
                    Help & Support
                </Button>
            </div>
        </div >
    );
}
