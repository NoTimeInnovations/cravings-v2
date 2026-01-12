import React, { useEffect, useState } from "react";
import useOrderStore from "@/store/orderStore";
import { format } from "date-fns";
import { Loader2, ShoppingBag, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import Link from "next/link";

interface CompactOrdersProps {
    hotelId: string;
    styles: any;
}

const CompactOrders = ({ hotelId, styles }: CompactOrdersProps) => {
    const { userOrders, subscribeUserOrders } = useOrderStore();
    const { userData } = useAuthStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData?.id) {
            const unsubscribe = subscribeUserOrders(() => {
                setLoading(false);
            });
            return () => {
                unsubscribe();
            };
        }
    }, [userData, subscribeUserOrders]);

    const partnerOrders = userOrders
        .filter((order) => order.partnerId === hotelId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (loading && partnerOrders.length === 0) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="animate-spin h-8 w-8" style={{ color: styles.accent }} />
            </div>
        );
    }

    if (partnerOrders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center p-4">
                <div
                    className="p-4 rounded-full bg-gray-100"
                    style={{ backgroundColor: `${styles.accent}15` }}
                >
                    <ShoppingBag size={40} style={{ color: styles.accent }} />
                </div>
                <h3 className="text-lg font-semibold">No orders yet</h3>
                <p className="text-sm opacity-70">
                    You haven't placed any orders with this partner yet.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pt-10 p-4 pb-24">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold" style={{ color: styles.color || "#000" }}>Your Orders</h2>
                <a href="/my-orders" className="text-sm font-medium underline" style={{ color: styles.accent || "#ea580c" }}>
                    All Orders
                </a>
            </div>

            {partnerOrders.map((order) => {
                const statusDisplay = getStatusDisplay(order);

                return (
                    <Link
                        href={`/order/${order.id}`}
                        key={order.id}
                        className="block border border-gray-200 rounded-xl p-5 shadow-sm bg-white hover:shadow-md transition-shadow relative"
                        style={{
                            borderColor: styles.border?.borderColor || "#e5e7eb"
                        }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg">
                                        Order #{order.id.split("-")[0]}
                                    </h3>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusDisplay.className}`}
                                    >
                                        {statusDisplay.text}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {format(new Date(order.createdAt), "MMM d, h:mm a")}
                                </p>
                            </div>
                            <div
                                className="text-orange-600 bg-orange-50 p-2 rounded-full transition-colors"
                                style={{
                                    color: styles.accent,
                                    backgroundColor: `${styles.accent}15`
                                }}
                            >
                                <ExternalLink className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-1 mb-4">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-700">
                                        {item.quantity} × {item.name}
                                    </span>
                                    <span className="font-medium">
                                        {order.partner?.currency || "₹"}
                                        {(item.price * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-3 flex justify-between items-center font-bold text-gray-900" style={{ borderColor: styles.border?.borderColor || "#e5e7eb" }}>
                            <span>Total</span>
                            <span style={{ color: styles.accent }}>
                                {order.partner?.currency || "₹"}
                                {order.totalPrice.toFixed(2)}
                            </span>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default CompactOrders;
