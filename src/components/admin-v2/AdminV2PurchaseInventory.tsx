"use client";

import React, { useEffect } from "react";
import { useInventoryStore } from "@/store/inventoryStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, IndianRupee, ShoppingBasket } from "lucide-react";
import { PurchaseListSkeleton } from "@/components/admin/inventory/PurchaseListSkelton";
import { AdminV2PurchaseList } from "./inventory/AdminV2PurchaseList";
import { AdminV2PurchaseDetail } from "./inventory/AdminV2PurchaseDetail";
import { AdminV2CreatePurchasePage } from "./inventory/AdminV2CreatePurchasePage";
import { AdminV2EditPurchasePage } from "./inventory/AdminV2EditPurchasePage";
import { AdminV2InventoryViewPage } from "./inventory/AdminV2InventoryViewPage";

export const AdminV2PurchaseInventory = () => {
    const {
        purchases,
        totalAmountThisMonth,
        isLoading,
        hasMore,
        initialLoadFinished,
        selectedPurchase,
        isCreatePurchasePage,
        isEditPurchasePage,
        fetchTotalAmountThisMonth,
        fetchPaginatedPurchases,
        clearPurchases,
        setIsCreatePurchasePage,
        setIsInventoryPage,
        isInventoryPage,
    } = useInventoryStore();

    useEffect(() => {
        if (!selectedPurchase && !isCreatePurchasePage && !isEditPurchasePage) {
            fetchTotalAmountThisMonth();
            fetchPaginatedPurchases();
        }
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
        isEditPurchasePage,
        fetchTotalAmountThisMonth,
        fetchPaginatedPurchases,
        clearPurchases,
    ]);

    const showSkeleton = isLoading && purchases.length === 0;

    if (isInventoryPage) {
        return (
            <div className="space-y-6">
                <AdminV2InventoryViewPage />
            </div>
        );
    }

    if (isEditPurchasePage) {
        return (
            <div className="space-y-6">
                <AdminV2EditPurchasePage />
            </div>
        );
    }

    if (selectedPurchase) {
        return (
            <div className="space-y-6">
                <AdminV2PurchaseDetail />
            </div>
        );
    }

    if (isCreatePurchasePage) {
        return (
            <div className="space-y-6">
                <AdminV2CreatePurchasePage />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">
                    Purchase / Inventory Management
                </h1>

                <div className="flex gap-2 items-center">
                    <Button onClick={() => setIsInventoryPage(true)} variant="outline">
                        <ShoppingBasket className="mr-2 h-4 w-4" />
                        Inventory
                    </Button>
                    <Button
                        onClick={() => setIsCreatePurchasePage(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Purchase
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            <AdminV2PurchaseList purchases={purchases} />
                        ) : (
                            <div className="rounded-md border flex items-center justify-center h-48 bg-card text-card-foreground">
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
                            variant="outline"
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
        </div>
    );
};
