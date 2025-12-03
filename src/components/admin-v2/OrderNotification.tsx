"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { OrderNotificationCard } from "./OrderNotificationCard";
import { Order } from "@/store/orderStore";
import { useAdminStore } from "@/store/adminStore";

export function OrderNotification() {
    const { orders } = useOrderSubscriptionStore();
    const { setActiveView, setSelectedOrderId } = useAdminStore();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Filter pending orders
    const pendingOrders = orders.filter(order => order.status === "pending");

    const handleOrderClick = (order: Order) => {
        setSelectedOrderId(order.id);
        setActiveView("Orders");
        setIsSheetOpen(false);
    };

    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    {pendingOrders.length > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                    {pendingOrders.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                            {pendingOrders.length}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[85vw] sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-4">
                    <SheetTitle>Pending Orders ({pendingOrders.length})</SheetTitle>
                </SheetHeader>

                <div className="space-y-3">
                    {pendingOrders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No pending orders
                        </div>
                    ) : (
                        pendingOrders.map(order => (
                            <OrderNotificationCard
                                key={order.id}
                                order={order}
                                onClick={() => handleOrderClick(order)}
                            />
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
