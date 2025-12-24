"use client";

import { useEffect, useState } from "react";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Receipt } from "lucide-react";
import { POSMenu } from "./pos/POSMenu";
import { POSCartSidebar } from "@/components/admin-v2/pos/POSCartSidebar";
import { EditOrderModal } from "@/components/admin/pos/EditOrderModal";
import { subscribeToHasura } from "@/lib/hasuraSubscription";

export function AdminV2POS() {
    const {
        isPOSOpen,
        setIsPOSOpen,
        editOrderModalOpen,
        getPartnerTables,
        cartItems,
        pastBills,
        fetchPastBills,
        setIsCaptainOrder
    } = usePOSStore();
    const { userData } = useAuthStore();



    useEffect(() => {
        setIsPOSOpen(true);
        setIsCaptainOrder(false);

        let unsubscribe: any;

        if (userData) {
            // Initial fetch (optional, but good for immediate data)
            getPartnerTables();

            // Set up real-time subscription
            const partnerId = userData.role === 'captain' ? (userData as any).partner_id : userData.id;

            if (partnerId) {
                unsubscribe = subscribeToHasura({
                    query: `
                        subscription GetPartnerTablesLive($partner_id: uuid!) {
                            qr_codes(where: {partner_id: {_eq: $partner_id}}) {
                                id
                                qr_number
                                table_number
                                partner_id
                                no_of_scans
                                table_name

                            }
                        }
                    `,
                    variables: { partner_id: partnerId },
                    onNext: (data) => {
                        if (data?.data?.qr_codes) {
                            const qrCodes = data.data.qr_codes;

                            const validQrs = qrCodes.filter((qr: any) =>
                                qr.table_number !== null &&
                                qr.table_number !== undefined &&
                                qr.table_number !== 0
                            );

                            const tableNumbers = validQrs
                                .map((qr: any) => Number(qr.table_number))
                                .sort((a: number, b: number) => a - b);

                            const tables = validQrs
                                .map((qr: any) => ({
                                    id: qr.id,
                                    number: Number(qr.table_number),
                                    name: qr.table_name || undefined
                                }))
                                .sort((a: any, b: any) => a.number - b.number);

                            usePOSStore.setState({ tableNumbers, tables, qrCodeData: qrCodes });
                        }
                    },
                    onError: (e) => console.error("Table subscription error:", e)
                });
            }
        }

        return () => {
            setIsPOSOpen(false);
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            } else if (unsubscribe && typeof unsubscribe.dispose === 'function') {
                unsubscribe.dispose();
            }
        };
    }, [userData]);

    const [activeTab, setActiveTab] = useState<"menu" | "cart">("menu");
    const [cartInitialView, setCartInitialView] = useState<"current" | "today">("current");

    const handleSwitchToCart = (view: "current" | "today" = "current") => {
        setCartInitialView(view);
        setActiveTab("cart");
        if (view === "today") {
            fetchPastBills();
        }
    };

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
                    <POSCartSidebar
                        key={`${activeTab}-${cartInitialView}`}
                        onMobileBack={() => setActiveTab("menu")}
                        initialViewMode={cartInitialView}
                    />
                </div>
            </div>

            {/* Mobile Floating Cart/Orders Buttons */}
            {activeTab === "menu" && (
                <>
                    {/* Bottom Left: Orders */}
                    <div className="md:hidden fixed bottom-6 left-6 z-50">
                        <button
                            onClick={() => handleSwitchToCart("today")}
                            className="relative bg-white dark:bg-zinc-900 text-orange-600 p-4 rounded-full shadow-lg border border-orange-100 dark:border-orange-900/50 hover:bg-orange-50 transition-all active:scale-95 flex items-center justify-center"
                        >
                            <div className="relative">
                                <Receipt className="h-6 w-6" />
                                {pastBills.some(order => order.status === 'pending') && (
                                    <span className="absolute -top-3 -right-3 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white dark:border-zinc-900"></span>
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Bottom Right: Cart */}
                    <div className="md:hidden fixed bottom-6 right-6 z-50">
                        <button
                            onClick={() => handleSwitchToCart("current")}
                            className="relative bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center"
                        >
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-cart"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                                {cartItems.reduce((acc, item) => acc + item.quantity, 0) > 0 && (
                                    <span className="absolute -top-3 -right-3 bg-white text-orange-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-orange-600">
                                        {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </>
            )}

            <EditOrderModal />
        </div>
    );
}
