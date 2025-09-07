"use client";
import React, { useState } from "react";
import { POSMenuItems } from "@/components/pos/POSMenuItems";
import { POSCart } from "@/components/pos/POSCart";
import { PostCheckoutModal } from "@/components/admin/pos/PostCheckoutModal";
import { EditOrderModal } from "@/components/admin/pos/EditOrderModal";
import { POSConfirmModal } from "@/components/pos/POSConfirmModal";
import { usePOSStore } from "@/store/posStore";
import Link from "next/link";
import { RiBillLine } from "react-icons/ri";
import AuthInitializer from "@/providers/AuthInitializer";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Page() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { setPostCheckoutModalOpen, cartItems, clearCart } = usePOSStore();

  const handleClearCart = () => {
    if (cartItems.length === 0) {
      toast.error("Cart is already empty");
      return;
    }
    clearCart();
    toast.success("Cart cleared successfully");
  };

  return (
    <>
      <AuthInitializer />
      <div className="container mx-auto py-8 px-4">
        <div className="flex-none p-4 border-b bg-white">
          <div className="container mx-auto">
            <div className="flex justify-between items-center">
              <h1 className="text-xl sm:text-2xl font-bold">POS System</h1>
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
                <Link
                  href="/admin/orders"
                  className="bg-black text-white hover:text-black border-2 hover:border-black hover:bg-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm sm:text-base"
                >
                  <RiBillLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Show Orders</span>
                  <span className="sm:hidden">Orders</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="pb-[500px]">
          {showConfirmModal ? (
            <POSConfirmModal 
            onClose={() => setShowConfirmModal(false)}
            onConfirm={() => {
              setShowConfirmModal(false);
              setPostCheckoutModalOpen(true);
            }}
            />
          ) : (
            <>
            <POSMenuItems />
            <POSCart onViewOrder={() => setShowConfirmModal(true)} />
            </>
          )}
        </div>
        <PostCheckoutModal />
        <EditOrderModal />
      </div>
    </>
  );
}
