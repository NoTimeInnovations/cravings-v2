"use client";

import { useEffect, useState } from "react";
import { useAuthStore, Captain } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, LogOut, ShoppingCart, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POSMenu } from "@/components/admin-v2/pos/POSMenu";
import { POSCartSidebar } from "@/components/admin-v2/pos/POSCartSidebar";
import { ModeToggle } from "@/components/mode-toggle";

export default function CaptainDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, userData } = useAuthStore();
  const {
    setIsPOSOpen,
    getPartnerTables,
    cartItems,
    pastBills,
    fetchPastBills,
    editingOrderId,
    clearCart
  } = usePOSStore();

  const [activeTab, setActiveTab] = useState<"menu" | "cart">("menu");

  useEffect(() => {
    // Redirect logic
    if (!userData) {
      // router.replace("/captainlogin"); 
    } else if (userData.role !== "captain") {
      router.replace("/captainlogin");
    }
  }, [userData, router]);

  useEffect(() => {
    // Trap captain on /captain
    if (userData && userData.role === "captain" && pathname !== "/captain") {
      router.replace("/captain");
    }
  }, [userData, pathname, router]);

  useEffect(() => {
    setIsPOSOpen(true);
    if (userData) {
      getPartnerTables();
      fetchPastBills(); // Fetch orders for the sidebar
    }
    return () => setIsPOSOpen(false);
  }, [userData, getPartnerTables, setIsPOSOpen, fetchPastBills]);

  const handleSignOut = () => {
    signOut();
    router.push("/captainlogin");
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b bg-card flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center max-w-[45%]">
          <h1 className="font-bold text-base sm:text-xl text-orange-600 leading-tight line-clamp-2 break-words">
            {(userData as any).partner?.store_name || "POS"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <div className="text-sm font-medium hidden sm:block">
            {userData.role === 'captain' ? (userData as Captain).name : userData.email}
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-600"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      {editingOrderId && (
        <div className="flex-none bg-orange-100 dark:bg-orange-950/30 px-4 py-2 flex justify-between items-center border-b border-orange-200 dark:border-orange-900">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Editing Order #{pastBills.find(b => b.id === editingOrderId)?.display_id || editingOrderId.slice(0, 8)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearCart()}
            className="h-7 text-xs text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900/50"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel Edit
          </Button>
        </div>
      )}

      {/* Main Content (Mimicking AdminV2POS) */}
      <div className="flex-1 flex flex-col md:overflow-hidden overflow-auto relative bg-muted/10">
        <div className="flex-1 flex gap-0 md:gap-4 md:p-4 p-0 md:overflow-hidden overflow-visible relative">

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
            {/* Pass onMobileBack to allow switching back to Menu on mobile */}
            <POSCartSidebar key={activeTab} onMobileBack={() => setActiveTab("menu")} />
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
                  <ShoppingCart className="h-6 w-6" />
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0) > 0 && (
                    <span className="absolute -top-3 -right-3 bg-white text-orange-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-orange-600">
                      {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </div>
              ) : (
                <Utensils className="h-6 w-6" />
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
      </div>
    </div>
  );
}
