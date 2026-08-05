"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import useOrderStore, { Order } from "@/store/orderStore";
import { Howl } from "howler";
import { toast } from "sonner";
import { isDesktopApp } from "@/lib/isDesktopApp";

/** Returns a key that changes periodically to trigger re-subscription with fresh 24hr window */
function getTimeWindowKey() {
    return Date.now().toString();
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
    // Orders that rang the alarm and have not been dealt with yet. The alarm
    // loops until this is empty, i.e. until every new order has been accepted
    // (or otherwise moved off `pending` — cancelled counts as dealt with too).
    const alertingOrderIds = useRef<Set<string>>(new Set());

    // Track time window — periodically refresh to keep the rolling 24hr window current
    const [dateKey, setDateKey] = useState(getTimeWindowKey);

    // Refresh the 24hr window every minute so the subscription stays current
    useEffect(() => {
        const interval = setInterval(() => {
            setDateKey(getTimeWindowKey());
            initialLoadCompleted.current = false;
            allSeenOrderIds.current.clear();
        }, 60 * 1000); // every 1 minute

        return () => clearInterval(interval);
    }, []);

    // Initialize sound. It LOOPS: a new order keeps ringing until it is accepted,
    // so a busy counter can't miss one. Silenced by settleAlarm() below.
    //
    // Desktop app ONLY — in a browser the dashboard stays silent (the toast still
    // shows). soundRef stays null there, so every play()/stop() below is a no-op.
    useEffect(() => {
        if (!isDesktopApp()) return;
        soundRef.current = new Howl({
            src: ["/audio/custom_sound.mp3"],
            volume: 1,
            loop: true,
            preload: true,
        });
        return () => {
            soundRef.current?.stop();
            soundRef.current?.unload();
            soundRef.current = null;
        };
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

        // Silence the alarm once every order that raised it has been accepted
        // (i.e. left `pending`) or vanished from the list. Runs on EVERY update,
        // including the re-seed after the 24hr window refreshes, so accepting an
        // order always stops the ringing promptly.
        const settleAlarm = (currentOrders: Order[]) => {
            if (alertingOrderIds.current.size === 0) return;
            const stillPending = new Set(
                currentOrders
                    .filter((order) => order.status === "pending")
                    .map((order) => order.id)
            );
            alertingOrderIds.current.forEach((id) => {
                if (!stillPending.has(id)) alertingOrderIds.current.delete(id);
            });
            if (alertingOrderIds.current.size === 0) soundRef.current?.stop();
        };

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
                    settleAlarm(paginatedOrders);
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

                // Only show new-order notification if the list actually grew.
                // When an order is deleted, pagination shifts can surface
                // previously-unseen IDs — those are NOT new orders.
                const listGrew = paginatedOrders.length > prevOrdersRef.current.length;
                if (genuinelyNewOrders.length > 0 && listGrew) {
                    genuinelyNewOrders.forEach((order) =>
                        alertingOrderIds.current.add(order.id)
                    );
                    // Already looping for an earlier unaccepted order? Let it run —
                    // restarting would cut the tone off mid-loop.
                    if (!soundRef.current?.playing()) soundRef.current?.play();
                    // Stable id → a fresh new-order alert replaces the previous
                    // one instead of stacking another toast on top.
                    toast.info(
                        genuinelyNewOrders.length === 1
                            ? "New order received!"
                            : `${genuinelyNewOrders.length} new orders received!`,
                        { id: "new-order-toast" },
                    );
                }

                settleAlarm(paginatedOrders);

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
