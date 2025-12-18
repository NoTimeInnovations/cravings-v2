"use client";

import { UtensilsCrossed } from "lucide-react";

import { useState } from "react";
import { AdminNavbar } from "@/components/admin-v2/AdminNavbar";
import { AdminSidebar } from "@/components/admin-v2/AdminSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const AdminV2Dashboard = dynamic(() => import("@/components/admin-v2/AdminV2Dashboard").then(mod => mod.AdminV2Dashboard), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2Orders = dynamic(() => import("@/components/admin-v2/AdminV2Orders").then(mod => mod.AdminV2Orders), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2Menu = dynamic(() => import("@/components/admin-v2/AdminV2Menu").then(mod => mod.AdminV2Menu), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2Settings = dynamic(() => import("@/components/admin-v2/AdminV2Settings").then(mod => mod.AdminV2Settings), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2CaptainSettings = dynamic(() => import("@/components/admin-v2/AdminV2CaptainSettings").then(mod => mod.AdminV2CaptainSettings), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2QrCodes = dynamic(() => import("@/components/admin-v2/AdminV2QrCodes").then(mod => mod.AdminV2QrCodes), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2Offers = dynamic(() => import("@/components/admin-v2/AdminV2Offers").then(mod => mod.AdminV2Offers), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2HelpSupport = dynamic(() => import("@/components/admin-v2/AdminV2HelpSupport").then(mod => mod.AdminV2HelpSupport), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
const AdminV2POS = dynamic(() => import("@/components/admin-v2/AdminV2POS").then(mod => mod.AdminV2POS), {
    loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
});
import { useAdminStore } from "@/store/adminStore";
import { PasswordProtectionModal } from "@/components/admin-v2/PasswordProtectionModal";

export default function AdminPage() {
    const { activeView, setActiveView } = useAdminStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [renderedViews, setRenderedViews] = useState<string[]>([]);

    // Track visited views to keep them mounted
    if (!renderedViews.includes(activeView)) {
        setRenderedViews([...renderedViews, activeView]);
    }


    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingView, setPendingView] = useState<string | null>(null);

    const handleNavigate = (view: string) => {
        if (view === "Settings") {
            setPendingView(view);
            setPasswordModalOpen(true);
        } else {
            setActiveView(view);
            if (view === "POS") {
                setIsSidebarOpen(false);
            }
        }
    };

    return (
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <div className="h-screen flex flex-col bg-orange-50 dark:bg-background">
                <AdminNavbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

                <div className="flex flex-1 overflow-hidden">
                    {/* Desktop Sidebar */}
                    <aside
                        className={`hidden lg:block border-r bg-background overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64" : "w-0 border-none"
                            }`}
                    >
                        <div className="w-64">
                            <AdminSidebar
                                activeView={activeView}
                                onNavigate={handleNavigate}
                            />
                        </div>
                    </aside>

                    {/* Mobile Sidebar (Sheet) */}
                    <SheetContent side="left" className="p-0 w-64">
                        <div className="py-4">
                            <div className="px-4 mb-4 flex items-center gap-2">
                                <UtensilsCrossed className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">Cravings</span>
                            </div>
                            <AdminSidebar
                                activeView={activeView}
                                onNavigate={(view) => {
                                    handleNavigate(view);
                                    if (view !== "Settings") {
                                        setIsMobileOpen(false);
                                    }
                                }}
                            />
                        </div>
                    </SheetContent>

                    {/* Main Content */}
                    <main className={`flex-1 overflow-y-auto ${activeView === "POS" ? "p-0 md:p-2" : "p-6"}`}>
                        {activeView !== "Menu" && activeView !== "Settings" && activeView !== "Captains" && activeView !== "QrCodes" && activeView !== "Offers" && activeView !== "Help & Support" && activeView !== "POS" && (
                            <h1 className="text-3xl font-bold mb-6">{activeView}</h1>
                        )}

                        {renderedViews.includes("Dashboard") && (
                            <div className={activeView === "Dashboard" ? "block" : "hidden"}>
                                <AdminV2Dashboard />
                            </div>
                        )}
                        {renderedViews.includes("Orders") && (
                            <div className={activeView === "Orders" ? "block" : "hidden"}>
                                <AdminV2Orders />
                            </div>
                        )}
                        {renderedViews.includes("Menu") && (
                            <div className={activeView === "Menu" ? "block" : "hidden"}>
                                <AdminV2Menu />
                            </div>
                        )}
                        {renderedViews.includes("Offers") && (
                            <div className={activeView === "Offers" ? "block" : "hidden"}>
                                <AdminV2Offers />
                            </div>
                        )}
                        {renderedViews.includes("QrCodes") && (
                            <div className={activeView === "QrCodes" ? "block" : "hidden"}>
                                <AdminV2QrCodes />
                            </div>
                        )}
                        {renderedViews.includes("Settings") && (
                            <div className={activeView === "Settings" ? "block" : "hidden"}>
                                <AdminV2Settings />
                            </div>
                        )}
                        {renderedViews.includes("Captains") && (
                            <div className={activeView === "Captains" ? "block" : "hidden"}>
                                <AdminV2CaptainSettings />
                            </div>
                        )}
                        {renderedViews.includes("Help & Support") && (
                            <div className={activeView === "Help & Support" ? "block" : "hidden"}>
                                <AdminV2HelpSupport />
                            </div>
                        )}
                        {renderedViews.includes("POS") && (
                            <div className={activeView === "POS" ? "block h-full" : "hidden"}>
                                <AdminV2POS />
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <PasswordProtectionModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
                onSuccess={() => {
                    if (pendingView) {
                        setActiveView(pendingView);
                        setIsMobileOpen(false);
                        setPendingView(null);
                    }
                }}
                actionDescription="access settings"
            />
        </Sheet>
    );
}