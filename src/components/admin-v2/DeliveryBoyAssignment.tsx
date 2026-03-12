"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getActiveDeliveryBoysQuery, assignDeliveryBoyMutation } from "@/api/deliveryBoys";
import { useAuthStore } from "@/store/authStore";
import { Order } from "@/store/orderStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { toast } from "sonner";
import { Loader2, Phone, Truck } from "lucide-react";
import { Notification } from "@/app/actions/notification";

interface DeliveryBoyOption {
    id: string;
    name: string;
    phone: string;
}

interface DeliveryBoyAssignmentProps {
    order: Order;
}

export function DeliveryBoyAssignment({ order }: DeliveryBoyAssignmentProps) {
    const { userData } = useAuthStore();
    const { orders, setOrders } = useOrderSubscriptionStore();
    const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoyOption[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isReassigning, setIsReassigning] = useState(false);

    useEffect(() => {
        if (userData?.id) {
            fetchDeliveryBoys();
        }
    }, [userData?.id]);

    const fetchDeliveryBoys = async () => {
        try {
            const response = await fetchFromHasura(getActiveDeliveryBoysQuery, {
                partner_id: userData?.id,
            });
            if (response.delivery_boys) {
                setDeliveryBoys(response.delivery_boys);
            }
        } catch (error) {
            console.error("Error fetching delivery boys:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedId) {
            toast.error("Please select a delivery boy");
            return;
        }

        setIsAssigning(true);
        try {
            await fetchFromHasura(assignDeliveryBoyMutation, {
                order_id: order.id,
                delivery_boy_id: selectedId,
            });

            // Send notification to customer
            try {
                const storeName = userData && 'store_name' in userData ? userData.store_name : undefined;
                await Notification.user.sendOrderStatusNotification(order, "dispatched", storeName);
            } catch (e) {
                console.error("Failed to send customer notification:", e);
            }

            // Send notification to delivery boy via OneSignal
            try {
                await Notification.deliveryBoy.sendAssignmentNotification(
                    selectedId,
                    order.id,
                    order.display_id || order.id.slice(0, 8),
                    order.deliveryAddress || "No address"
                );
            } catch (e) {
                console.error("Failed to send delivery boy notification:", e);
            }

            // Update local order state
            const updatedOrders = orders.map((o) =>
                o.id === order.id
                    ? { ...o, status: "dispatched" as const, delivery_boy_id: selectedId, assigned_at: new Date().toISOString() }
                    : o
            );
            setOrders(updatedOrders);

            toast.success("Delivery boy assigned successfully");
            setIsReassigning(false);
            setSelectedId("");
        } catch (error) {
            console.error("Error assigning delivery boy:", error);
            toast.error("Failed to assign delivery boy");
        } finally {
            setIsAssigning(false);
        }
    };

    // Already assigned - show delivery boy info with reassign option
    if (order.delivery_boy_id && order.delivery_boy) {
        return (
            <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-900/10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-purple-600" />
                        <h3 className="font-semibold text-purple-900 dark:text-purple-300">Delivery Boy Assigned</h3>
                    </div>
                    {order.status !== "completed" && order.status !== "cancelled" && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setIsReassigning(!isReassigning)}
                        >
                            {isReassigning ? "Cancel" : "Reassign"}
                        </Button>
                    )}
                </div>
                <div className="text-sm space-y-1">
                    <p className="font-medium">{order.delivery_boy.name}</p>
                    <a
                        href={`tel:${order.delivery_boy.phone}`}
                        className="flex items-center gap-1.5 text-blue-600 hover:underline"
                    >
                        <Phone className="h-3.5 w-3.5" />
                        {order.delivery_boy.phone}
                    </a>
                </div>
                {isReassigning && (
                    <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-2">Select a new delivery boy:</p>
                        {isLoading ? (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : deliveryBoys.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active delivery boys available.</p>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Select value={selectedId} onValueChange={setSelectedId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select delivery boy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {deliveryBoys
                                            .filter((boy) => boy.id !== order.delivery_boy_id)
                                            .map((boy) => (
                                                <SelectItem key={boy.id} value={boy.id}>
                                                    {boy.name} ({boy.phone})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAssign} disabled={isAssigning || !selectedId} size="sm">
                                    {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Assignment UI
    return (
        <div className="p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4" />
                <h3 className="font-semibold">Assign Delivery Boy</h3>
            </div>
            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : deliveryBoys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active delivery boys. Add one in the Delivery Boys section.</p>
            ) : (
                <div className="flex items-center gap-2">
                    <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select delivery boy" />
                        </SelectTrigger>
                        <SelectContent>
                            {deliveryBoys.map((boy) => (
                                <SelectItem key={boy.id} value={boy.id}>
                                    {boy.name} ({boy.phone})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAssign} disabled={isAssigning || !selectedId} size="sm">
                        {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                    </Button>
                </div>
            )}
        </div>
    );
}
