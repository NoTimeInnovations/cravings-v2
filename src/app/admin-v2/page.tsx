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
import { useAdminStore } from "@/store/adminStore";

export default function AdminPage() {
    const { activeView, setActiveView } = useAdminStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
                            <AdminSidebar activeView={activeView} onNavigate={setActiveView} />
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
                                    setActiveView(view);
                                    setIsMobileOpen(false);
                                }}
                            />
                        </div>
                    </SheetContent>

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto p-6">
                        {activeView !== "Menu" && activeView !== "Settings" && activeView !== "Captains" && activeView !== "QrCodes" && activeView !== "Offers" && activeView !== "Help & Support" && (
                            <h1 className="text-3xl font-bold mb-6">{activeView}</h1>
                        )}
                        {activeView === "Dashboard" ? (
                            <AdminV2Dashboard />
                        ) : activeView === "Orders" ? (
                            <AdminV2Orders />
                        ) : activeView === "Menu" ? (
                            <AdminV2Menu />
                        ) : activeView === "Offers" ? (
                            <AdminV2Offers />
                        ) : activeView === "QrCodes" ? (
                            <AdminV2QrCodes />
                        ) : activeView === "Settings" ? (
                            <AdminV2Settings />
                        ) : activeView === "Captains" ? (
                            <AdminV2CaptainSettings />
                        ) : activeView === "Help & Support" ? (
                            <AdminV2HelpSupport />
                        ) : (
                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 bg-card h-96 flex items-center justify-center">
                                Content for {activeView}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </Sheet>
    );
}