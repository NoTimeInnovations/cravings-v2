import React, { useEffect, useState } from "react";
import useOrderStore from "@/store/orderStore";
import { format } from "date-fns";
import { Loader2, ShoppingBag, ExternalLink } from "lucide-react";
import { useAuthStore, Partner } from "@/store/authStore";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getDateOnly } from "@/lib/formatDate";
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
                <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
            </div>
        );
    }

    if (partnerOrders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center p-4">
                <div className="p-4 rounded-full bg-gray-100">
                    <ShoppingBag size={40} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No orders yet</h3>
                <p className="text-sm text-gray-500">
                    You haven't placed any orders with this partner yet.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pt-10 p-4 pb-24 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900">Your Orders</h2>
                <a href="/my-orders" className="text-sm font-medium underline text-orange-600">
                    All Orders
                </a>
            </div>

            {partnerOrders.map((order) => {
                const gstPercentage =
                    (order.partner as Partner)?.gst_percentage || 0;
                const foodTotal = (order.items || []).reduce(
                    (sum: number, item: any) => sum + item.price * item.quantity,
                    0
                );

                const extraChargesTotal =
                    (order.extraCharges || []).reduce(
                        (sum: number, charge: any) =>
                            sum +
                            getExtraCharge(
                                order?.items || [],
                                charge.amount,
                                charge.charge_type
                            ) || 0,
                        0
                    ) || 0;

                const subtotal = foodTotal + extraChargesTotal;

                const discounts = order.discounts || [];
                const discountAmount = discounts.reduce((total: number, discount: any) => {
                    if (discount.type === "flat") {
                        return total + discount.value;
                    } else {
                        return total + (subtotal * discount.value) / 100;
                    }
                }, 0);

                const discountedSubtotal = Math.max(0, subtotal - discountAmount);
                const discountedFoodTotal = Math.max(0, foodTotal - discountAmount);
                const gstAmount = getGstAmount(discountedFoodTotal, gstPercentage);
                const grandTotal = discountedSubtotal + gstAmount;
                const statusDisplay = getStatusDisplay(order);

                return (
                    <Link
                        href={`/order/${order.id}`}
                        key={order.id}
                        className="block border border-gray-200 rounded-xl p-5 shadow-sm bg-white hover:shadow-md transition-shadow relative"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg text-gray-900">
                                        {order.partner?.store_name}
                                    </h3>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusDisplay.className}`}
                                    >
                                        {statusDisplay.text}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    #{order.id.slice(0, 8)} • {format(new Date(order.createdAt), "MMM d, h:mm a")}
                                </p>
                            </div>
                            <div className="text-orange-600 bg-orange-50 p-2 rounded-full transition-colors">
                                <ExternalLink className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-1 mb-4">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-700">
                                        {item.quantity} × {item.name}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {order.partner?.currency || "₹"}
                                        {(item.price * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span className="font-medium">
                                        - {(order.partner as Partner)?.currency || "₹"}
                                        {discountAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-3 flex justify-between items-center font-bold text-gray-900">
                            <span>Total</span>
                            <span>
                                {order.partner?.currency || "₹"}
                                {grandTotal.toFixed(2)}
                            </span>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default CompactOrders;
