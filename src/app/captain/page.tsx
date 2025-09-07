"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, PlusCircle, X, Trash2 } from "lucide-react";
import CaptainOrdersTab from "./CaptainOrdertab";
import { CaptainPOS } from "./pos/CaptainPOS";
import { Captaincart } from "./pos/Captaincart";
import { CaptainCheckoutModal } from "./pos/CaptainCheckoutModal";
import { EditCaptainOrderModal } from "./pos/EditCaptainOrderModal";
import { toast } from "sonner";
import { usePOSStore } from "@/store/posStore";
import { useEffect } from "react";

export default function CaptainDashboard() {
  const router = useRouter();
  const { signOut, userData } = useAuthStore();
  const { cartItems, clearCart, isPOSOpen, setIsPOSOpen } = usePOSStore();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect to login if not authenticated as captain
    if (!userData || userData.role !== "captain") {
      router.replace("/captainlogin");
    }
  }, [userData, router]);

  useEffect(() => {
    // Trap captain on /captain
    if (userData && userData.role === "captain" && pathname !== "/captain") {
      router.replace("/captain");
    }
  }, [userData, pathname, router]);

  const handleSignOut = () => {
    signOut();
    router.push("/captainlogin");
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) {
      toast.error("Cart is already empty");
      return;
    }
    clearCart();
    toast.success("Cart cleared successfully");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <div className="flex-none p-3 sm:p-4 border-b bg-white">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold">Captain Dashboard</h1>
            {userData?.role === 'captain' && (userData as any)?.partner?.store_name && (
              <div className="text-xl sm:text-2xl font-bold mr-6">
                {(userData as any).partner.store_name}
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm sm:text-base"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-2 sm:p-4 overflow-hidden flex flex-col">
        {/* Create New Order Button */}
        <div className="flex-none flex justify-end mb-3 sm:mb-4">
          <Button 
            className="flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto"
            onClick={() => setIsPOSOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Create New Order</span>
            <span className="sm:hidden">New Order</span>
          </Button>
        </div>

        {/* Orders Management */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-none p-3 sm:p-4">
            <CardTitle className="text-lg sm:text-xl">All Orders</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <CaptainOrdersTab />
          </CardContent>
        </Card>
      </div>

      {/* POS Overlay */}
      {isPOSOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex-none p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create New Order</h2>
              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleClearCart}
                    className="h-8 flex items-center gap-2"
                    title="Clear Cart"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">Clear Cart</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (cartItems.length > 0) {
                      toast.error("Please complete or cancel the current order first");
                      return;
                    }
                    setIsPOSOpen(false);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <CaptainPOS />
            </div>
            <div className="flex-none border-t">
              <Captaincart />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CaptainCheckoutModal />
      <EditCaptainOrderModal />
    </div>
  );
}
