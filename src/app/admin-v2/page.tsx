"use client";

import { useState } from "react";
import { AdminNavbar } from "@/components/admin-v2/AdminNavbar";
import { AdminSidebar } from "@/components/admin-v2/AdminSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AdminV2Dashboard } from "@/components/admin-v2/AdminV2Dashboard";
import { AdminV2Orders } from "@/components/admin-v2/AdminV2Orders";

import { AdminV2Menu } from "@/components/admin-v2/AdminV2Menu";
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
                            <div className="px-4 mb-4">
                                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">Cravings Admin</span>
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
                        {activeView !== "Menu" && (
                            <h1 className="text-3xl font-bold mb-6">{activeView}</h1>
                        )}
                        {activeView === "Dashboard" ? (
                            <AdminV2Dashboard />
                        ) : activeView === "Orders" ? (
                            <AdminV2Orders />
                        ) : activeView === "Menu" ? (
                            <AdminV2Menu />
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