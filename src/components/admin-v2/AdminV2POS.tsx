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
        getPartnerTables,
        cartItems,
        pastBills
    } = usePOSStore();
    const { userData } = useAuthStore();

    useEffect(() => {
        setIsPOSOpen(true);
        if (userData) {
            getPartnerTables();
        }
        return () => setIsPOSOpen(false);
    }, [userData]);

    const [activeTab, setActiveTab] = useState<"menu" | "cart">("menu");

    if (!userData) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full md:overflow-hidden overflow-auto relative">
            <div className="flex-1 flex gap-4 md:overflow-hidden overflow-visible relative md:p-0 p-0">
                {/* Left Side: Menu (Grid) */}
                <div
                    className={`
                        flex-1 overflow-hidden rounded-lg md:border bg-card shadow-sm flex flex-col md:flex
                        ${activeTab === "menu" ? "flex" : "hidden"}
                    `}
                >
                    <POSMenu />
                </div>

                {/* Right Side: Cart (Sidebar) */}
                <div
                    className={`
                        md:w-[400px] w-full flex-shrink-0 flex flex-col rounded-lg md:border bg-card shadow-sm md:overflow-hidden overflow-visible md:flex
                        ${activeTab === "cart" ? "flex" : "hidden"}
                    `}
                >
                    <POSCartSidebar onMobileBack={() => setActiveTab("menu")} />
                </div>
            </div>

            {/* Mobile Floating Cart Button */}
            {activeTab === "menu" && (
                <div className="md:hidden fixed bottom-6 right-6 z-50">
                    <button
                        onClick={() => setActiveTab(activeTab === "menu" ? "cart" : "menu")}
                        className="relative bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center"
                    >
                        {activeTab === "menu" ? (
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-cart"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                                {cartItems.reduce((acc, item) => acc + item.quantity, 0) > 0 && (
                                    <span className="absolute -top-3 -right-3 bg-white text-orange-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-orange-600">
                                        {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
                        )}

                        {/* Blinking Red Dot for Pending Orders */}
                        {pastBills.some(order => order.status === 'pending') && (
                            <span className="absolute top-0 left-0 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                            </span>
                        )}
                    </button>
                </div>
            )}

            <EditOrderModal />
        </div>
    );
}
