"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ShoppingBag } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useEffect, useState } from "react";

export const MyOrdersButton = () => {

    const router = useRouter();
    const { userData } = useAuthStore();
    const [hasAPendingOrder, setHasAPendingOrder] = useState(false);

    const fetchTheLastOrder = async () => {

        const query = `query MyOrders($userId: uuid!) {
            orders(where: {user_id: {_eq: $userId}}, order_by: {created_at: desc}, limit: 1) {
              id
              status_history
              status
            }
          }`;

        const { orders } = await fetchFromHasura(query, { userId: userData?.id });

        if (orders?.length > 0) {
            const lastOrder = orders[0];
            if (lastOrder.status === "pending") {
                setHasAPendingOrder(true);
                console.log("Has a pending order")
            }
        }

    }

    useEffect(() => {
        if (userData) {
            setTimeout(fetchTheLastOrder, 5000)
        }
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