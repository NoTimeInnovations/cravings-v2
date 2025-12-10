import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Menu, UtensilsCrossed } from "lucide-react";
import { SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { Partner, useAuthStore } from "@/store/authStore";
import { OrderNotification } from "./OrderNotification";

interface AdminNavbarProps {
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

export function AdminNavbar({ onToggleSidebar, isSidebarOpen }: AdminNavbarProps) {
    const { userData } = useAuthStore();

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
                <OrderNotification />
                <ModeToggle />
                <div className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full cursor-pointer select-none">
                    <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <Avatar>
                        <AvatarImage className="object-cover" src={(userData as Partner)?.store_banner} />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </nav>
    );
}
