"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ShoppingBag } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useEffect, useState } from "react";
import { subscribeToHasura } from "@/lib/hasuraSubscription";

export const MyOrdersButton = () => {

    const router = useRouter();
    const { userData } = useAuthStore();
    const [hasAPendingOrder, setHasAPendingOrder] = useState(false);

    const SUBSCRIPTION_QUERY = `subscription MyOrders($userId: uuid!) {
              orders(where: {user_id: {_eq: $userId}}, order_by: {created_at: desc}, limit: 1) {
                id
                status_history
                status
              }
            }`;

    useEffect(() => {
        if (!userData?.id) return;

        const unsubscribe = subscribeToHasura({
            query: SUBSCRIPTION_QUERY,
            variables: { userId: userData.id },
            onNext: (data) => {
                if (data?.data?.orders?.length > 0) {
                    const lastOrder = data.data.orders[0];
                    if (lastOrder.status === "pending") {
                        setHasAPendingOrder(true);
                    } else {
                        setHasAPendingOrder(false);
                    }
                } else {
                    setHasAPendingOrder(false);
                }
            },
            onError: (error) => {
                console.error("Subscription error:", error);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [userData]);

    return (
        <>
            {
                userData && userData?.role === "user" && (

                    <button
                        aria-label="View orders"
                        onClick={() =>
                            router.push('/my-orders')
                        }
                        className="flex ml-auto relative mt-2 items-center justify-center h-14 w-14 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-300 transform hover:scale-110"
                    >
                        <ShoppingBag size={24} />
                        {
                            hasAPendingOrder && (
                                <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full"></div>
                            )
                        }
                    </button>



                )
            }</>
    )
}