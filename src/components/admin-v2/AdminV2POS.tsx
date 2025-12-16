"use client";

import { useEffect, useState } from "react";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";
import { POSMenu } from "./pos/POSMenu";
import { POSCartSidebar } from "@/components/admin-v2/pos/POSCartSidebar";
import { EditOrderModal } from "@/components/admin/pos/EditOrderModal";

export function AdminV2POS() {
    const {
        isPOSOpen,
        setIsPOSOpen,
        editOrderModalOpen,
    } = usePOSStore();
    const { userData } = useAuthStore();

    useEffect(() => {
        setIsPOSOpen(true);
        return () => setIsPOSOpen(false);
    }, []);

    const [activeTab, setActiveTab] = useState<"menu" | "cart">("menu");

    if (!userData) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex p-2 bg-muted border-b gap-2 shrink-0">
                <button
                    onClick={() => setActiveTab("menu")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "menu"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Menu
                </button>
                <button
                    onClick={() => setActiveTab("cart")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "cart"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Cart
                </button>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden relative md:p-0 p-2">
                {/* Left Side: Menu (Grid) */}
                <div
                    className={`
                        flex-1 overflow-hidden rounded-lg border bg-card shadow-sm flex flex-col
                        ${activeTab === "menu" ? "flex" : "hidden md:flex"}
                    `}
                >
                    <POSMenu />
                </div>

                {/* Right Side: Cart (Sidebar) */}
                <div
                    className={`
                        md:w-[400px] w-full flex-shrink-0 flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden
                        ${activeTab === "cart" ? "flex" : "hidden md:flex"}
                    `}
                >
                    <POSCartSidebar />
                </div>
            </div>

            <EditOrderModal />
        </div>
    );
}
