"use client";

import React, { useEffect } from "react";
import { useInventoryStore } from "@/store/inventoryStore";
import { PurchaseList } from "@/components/admin/inventory/PurchaseList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, IndianRupee, ShoppingBasket } from "lucide-react";
import { PurchaseListSkeleton } from "@/components/admin/inventory/PurchaseListSkelton";
import { PurchaseDetail } from "@/components/admin/inventory/PurchaseDetail";
import { CreateNewPurchasePage } from "@/components/admin/inventory/CreateNewPurchasePage";
import { EditPurchasePage } from "@/components/admin/inventory/EditPurchasePage";
import InventoryViewPage from "@/components/admin/inventory/InventoryViewPage";

const InventoryPage = () => {
  const {
    purchases,
    totalAmountThisMonth,
    isLoading,
    hasMore,
    initialLoadFinished,
    selectedPurchase,
    isCreatePurchasePage,
    isEditPurchasePage, // State to control edit view
    fetchTotalAmountThisMonth,
    fetchPaginatedPurchases,
    clearPurchases,
    setIsCreatePurchasePage,
    setIsInventoryPage,
    isInventoryPage,
  } = useInventoryStore();

  useEffect(() => {
    // This condition ensures we only fetch when on the main list view
    if (!selectedPurchase && !isCreatePurchasePage && !isEditPurchasePage) {
      fetchTotalAmountThisMonth();
      fetchPaginatedPurchases();
    }
    // Cleanup function to clear data when leaving the main list view
    return () => {
      const state = useInventoryStore.getState();
      if (
        !state.selectedPurchase &&
        !state.isCreatePurchasePage &&
        !state.isEditPurchasePage
      ) {
        clearPurchases();
      }
    };
  }, [
    selectedPurchase,
    isCreatePurchasePage,
    isEditPurchasePage, // Added to dependency array
    fetchTotalAmountThisMonth,
    fetchPaginatedPurchases,
    clearPurchases,
  ]);

  // Show skeleton only on the initial load
  const showSkeleton = isLoading && purchases.length === 0;

  if (isInventoryPage) {
    return (
      <main className="pt-4 sm:pt-10 pb-40 px-4 sm:px-[15%]">
        <InventoryViewPage />
      </main>
    );
  }

  // Render Edit Page if isEditPurchasePage is true
  if (isEditPurchasePage) {
    return (
      <main className="pt-4 sm:pt-10 pb-40 px-4 sm:px-[15%]">
        <EditPurchasePage />
      </main>
    );
  }

  // Render Purchase Detail view if a purchase is selected
  if (selectedPurchase) {
    return (
      <main className="p-4 pb-40 md:p-6 md:pb-40 lg:p-8 lg:pb-40">
        <PurchaseDetail />
      </main>
    );
  }

  // Render Create New Purchase page
  if (isCreatePurchasePage) {
    return (
      <main className="pt-4 sm:pt-10 pb-40 px-4 sm:px-[15%]">
        <CreateNewPurchasePage />
      </main>
    );
  }

  // Default view: The main inventory list and stats
  return (
    <main className="p-4 pb-40 md:p-6 md:pb-40 lg:p-8 lg:pb-40 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Purchase / Inventory <br /> Management
        </h1>

        <div className="flex gap-2 items-center">
          <Button onClick={() => setIsInventoryPage(true)}>
            <ShoppingBasket size={20} />
            Inventory
          </Button>
          <Button
            onClick={() => setIsCreatePurchasePage(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
          >
            <PlusCircle size={20} />
            New Purchase
          </Button>
        </div>
      </div>

      {/* --- Dashboard Stats Grid --- */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Purchases This Month
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(totalAmountThisMonth)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Purchases</h2>
        </div>

        {showSkeleton ? (
          <PurchaseListSkeleton />
        ) : (
          <>
            {purchases.length > 0 ? (
              <PurchaseList purchases={purchases} />
            ) : (
              <div className="rounded-md border flex items-center justify-center h-48">
                <p className="text-muted-foreground">No purchases found.</p>
              </div>
            )}
          </>
        )}

        {initialLoadFinished && hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => fetchPaginatedPurchases()}
              disabled={isLoading}
              variant="secondary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default InventoryPage;
