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

/** How recent an order must be to count as "just arrived" and ring the alarm. */
const NEW_ORDER_WINDOW_MS = 5 * 60 * 1000;

function isJustCreated(order: Order) {
    const created = new Date(order.createdAt ?? "").getTime();
    return Number.isFinite(created) && Date.now() - created <= NEW_ORDER_WINDOW_MS;
}

/**
 * Drives the Android app's looping new-order alert.
 *
 * The native app rings until an order is accepted, but it has no idea what
 * "accepted" means — that state lives here, in the live order subscription.
 * These console lines are the bridge the WebView listens on, the same mechanism
 * as the existing "PRINTER SETTINGS OPEN" / "REFRESH LOCATION" signals. In a
 * plain browser they are just log lines and cost nothing.
 *
 * Belt and braces only: the app also polls the order's status itself, because
 * this bridge cannot reach it once the dashboard is closed. What this buys is
 * an instant stop while the dashboard IS open, rather than waiting for a poll.
 */
let lastAlertSignal: "start" | "stop" | null = null;

function signalOrderAlert(signal: "start" | "stop") {
    // The subscription fires on every order change; only speak up on a real
    // transition so the log (and the bridge) stays quiet.
    if (lastAlertSignal === signal) return;
    lastAlertSignal = signal;
    console.log(signal === "start" ? "ORDER ALERT START" : "ORDER ALERT STOP");
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
    const initialLoadCompleted = useRef<boolean>(false);
    const allSeenOrderIds = useRef<Set<string>>(new Set());
    // Orders that rang the alarm and have not been dealt with yet. The alarm
    // loops until this is empty, i.e. until every new order has been accepted
    // (or otherwise moved off `pending` — cancelled counts as dealt with too).
    const alertingOrderIds = useRef<Set<string>>(new Set());

    // Track time window — periodically refresh to keep the rolling 24hr window current
    const [dateKey, setDateKey] = useState(getTimeWindowKey);

    // Refresh the 24hr window every minute so the subscription stays current.
    //
    // The seen-order set is deliberately NOT cleared here. It used to be, along
    // with resetting initialLoadCompleted, which meant that once a minute the very
    // next batch was silently swallowed as a fresh "baseline" — an order landing in
    // that batch never rang. Keeping the ids means the re-subscribe simply sees
    // everything as already-seen and stays quiet, while a real new order still rings.
    useEffect(() => {
        const interval = setInterval(() => {
            setDateKey(getTimeWindowKey());
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
                    setLoading(false);
                    settleAlarm(paginatedOrders);
                    // Update store
                    setOrders(paginatedOrders);
                    // Opening the dashboard silences an alert a push started, but
                    // deliberately never starts one: a day-old unaccepted order
                    // should not set the phone ringing just because someone
                    // opened the app.
                    if (!paginatedOrders.some((o) => o.status === "pending")) {
                        signalOrderAlert("stop");
                    }
                    return;
                }

                // An order is NEW when its id has never been seen AND it was created
                // just now. The recency test is what makes this reliable: the old
                // guard required the page to GROW, but the page holds `limit` (10)
                // orders, so once a partner had 10 orders in the 24hr window a new
                // order simply pushed the oldest off, the length never changed, and
                // the alarm went permanently silent. Recency still rejects the case
                // that guard existed for — old ids surfacing from a pagination shift
                // or from paging around — because those orders are not recent.
                const genuinelyNewOrders = paginatedOrders.filter(
                    (order) =>
                        !allSeenOrderIds.current.has(order.id) && isJustCreated(order)
                );

                paginatedOrders.forEach((order) => {
                    allSeenOrderIds.current.add(order.id);
                });

                if (genuinelyNewOrders.length > 0) {
                    genuinelyNewOrders.forEach((order) =>
                        alertingOrderIds.current.add(order.id)
                    );
                    // Already looping for an earlier unaccepted order? Let it run —
                    // restarting would cut the tone off mid-loop.
                    if (!soundRef.current?.playing()) soundRef.current?.play();
                    // Same trigger for the Android app's own looping alert. Rides
                    // on isJustCreated above, so an old id resurfacing from a
                    // pagination shift cannot set the phone ringing.
                    if (genuinelyNewOrders.some((o) => o.status === "pending")) {
                        signalOrderAlert("start");
                    }
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

                // Tell the Android app to stop once nothing is pending. Keyed off
                // the pending count rather than the accept click, so it settles
                // just as well when the order is accepted on another device or
                // cancelled. Not gated on alertingOrderIds: the phone may be
                // ringing from a push this dashboard never saw arrive.
                if (!paginatedOrders.some((o) => o.status === "pending")) {
                    signalOrderAlert("stop");
                }

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
