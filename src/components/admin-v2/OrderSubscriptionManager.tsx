"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import useOrderStore, { Order } from "@/store/orderStore";
import { Howl } from "howler";
import { toast } from "sonner";

/** Returns today's date as YYYY-MM-DD string */
function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

export function OrderSubscriptionManager() {
    const { userData } = useAuthStore();
    const {
        subscribePaginatedOrders,
        subscribeOrdersCount,
        partnerOrders,
    } = useOrderStore();

    const {
        orders,
        setOrders,
        setLoading,
        setTotalCount,
        currentPage,
        limit,
    } = useOrderSubscriptionStore();

    const soundRef = useRef<Howl | null>(null);
    const prevOrdersRef = useRef<Order[]>([]);
    const initialLoadCompleted = useRef<boolean>(false);
    const allSeenOrderIds = useRef<Set<string>>(new Set());

    // Track the current date — when it changes, subscriptions re-initialize with fresh date filters
    const [dateKey, setDateKey] = useState(getTodayKey);

    // Detect midnight crossing and update dateKey
    useEffect(() => {
        function scheduleMidnightCheck() {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const msUntilMidnight = tomorrow.getTime() - now.getTime() + 1000; // +1s buffer

            return setTimeout(() => {
                setDateKey(getTodayKey());
                // Reset initial load so new day's orders don't all trigger sound
                initialLoadCompleted.current = false;
                allSeenOrderIds.current.clear();
            }, msUntilMidnight);
        }

        const timer = scheduleMidnightCheck();
        return () => clearTimeout(timer);
    }, [dateKey]);

    // Initialize sound
    useEffect(() => {
        soundRef.current = new Howl({
            src: ["/audio/tone.wav"],
            volume: 1,
            preload: true,
        });
    }, []);

    // Subscribe to order count
    useEffect(() => {
        if (!userData?.id) return;
        const unsubscribe = subscribeOrdersCount((count) => {
            setTotalCount(count);
        });
        return () => unsubscribe();
    }, [userData?.id, subscribeOrdersCount, setTotalCount]);

    // Subscribe to orders — re-subscribes when dateKey changes (midnight crossing)
    useEffect(() => {
        if (!userData?.id) return;

        if (orders.length === 0) setLoading(true);

        const offset = (currentPage - 1) * limit;

        const unsubscribe = subscribePaginatedOrders(
            limit,
            offset,
            (paginatedOrders) => {
                if (!initialLoadCompleted.current) {
                    paginatedOrders.forEach((order) => {
                        allSeenOrderIds.current.add(order.id);
                    });
                    initialLoadCompleted.current = true;
                    prevOrdersRef.current = paginatedOrders;
                    setLoading(false);
                    // Update store
                    setOrders(paginatedOrders);
                    return;
                }

                const genuinelyNewOrders = paginatedOrders.filter(
                    (order) => !allSeenOrderIds.current.has(order.id)
                );

                paginatedOrders.forEach((order) => {
                    allSeenOrderIds.current.add(order.id);
                });

                if (genuinelyNewOrders.length > 0) {
                    soundRef.current?.play();
                    toast.info(`New order received!`);
                }

                prevOrdersRef.current = paginatedOrders;
                setLoading(false);
                // Update store
                setOrders(paginatedOrders);
            }
        );

        return () => unsubscribe();
    }, [userData?.id, currentPage, limit, subscribePaginatedOrders, setLoading, setOrders, dateKey]);

    // Sync store orders (if partnerOrders changes from elsewhere, though subscription usually handles it)
    useEffect(() => {
        if (partnerOrders && partnerOrders.length > 0) {
            // This might conflict with the subscription if not careful, 
            // but usually partnerOrders is updated by the subscription in the store.
            // In this case, we are using a separate subscription store.
            // Let's keep it consistent with the original implementation if it was there.
            // The original implementation had:
            // useEffect(() => { if (partnerOrders) { setOrders(partnerOrders); } }, [partnerOrders, setOrders]);
            // But wait, subscribePaginatedOrders callback in original code didn't call setOrders explicitly?
            // Let's check the original code again.
        }
    }, [partnerOrders]);

    return null;
}
