import React from "react";
import { Order } from "@/store/orderStore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Partner, useAuthStore } from "@/store/authStore";

interface OrderNotificationCardProps {
    order: Order;
    onClick: () => void;
}

export function OrderNotificationCard({ order, onClick }: OrderNotificationCardProps) {
    const { userData } = useAuthStore();
    const currency = (userData as Partner)?.currency || "₹";

    return (
        <div
            className="p-4 border rounded-lg bg-card hover:bg-accent cursor-pointer transition-colors"
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-bold text-sm">#{order.display_id}</p>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), "hh:mm a")}
                    </p>
                </div>
                <Badge variant="outline" className="text-xs">
                    {order.type === "table_order" ? "Dine-in" : order.type}
                </Badge>
            </div>

            <div className="space-y-1 mb-3">
                <p className="text-sm line-clamp-2">
                    {order.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                </p>
            </div>

            <div className="flex justify-between items-center">
                <p className="font-bold text-sm">
                    {currency}{order.totalPrice}
                </p>
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                    Pending
                </Badge>
            </div>
        </div>
    );
}
