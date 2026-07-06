"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  computeSubscriptionGate,
  type SubscriptionGate,
} from "@/lib/subscriptionAccess";
import { TRIAL_ORDER_LIMIT, isGatedPlan, isTrialPlan } from "@/lib/subscriptionConfig";

const ORDER_USAGE_QUERY = `
  query TrialOrderUsage($pid: uuid!) {
    orders_aggregate(where: { partner_id: { _eq: $pid }, status: { _neq: "cancelled" } }) {
      aggregate { count }
    }
  }
`;

// created_at of the Nth non-cancelled order (offset = limit - 1) — anchors the
// 24h grace window deterministically once the cap is reached.
const NTH_ORDER_QUERY = `
  query NthOrder($pid: uuid!, $offset: Int!) {
    orders(
      where: { partner_id: { _eq: $pid }, status: { _neq: "cancelled" } }
      order_by: { created_at: asc }
      limit: 1
      offset: $offset
    ) {
      created_at
    }
  }
`;

interface UsageData {
  usage: number;
  hundredthOrderAt: string | null;
}

// Short-lived per-partner cache so remounts (nav between admin views) don't refetch.
const usageCache = new Map<string, { at: number; data: UsageData }>();
// In-flight requests keyed by partner so concurrent callers share one fetch.
const inflight = new Map<string, Promise<UsageData>>();
const CACHE_TTL_MS = 30_000;

async function fetchUsage(
  partnerId: string,
  limit: number,
): Promise<UsageData> {
  const agg = await fetchFromHasura(ORDER_USAGE_QUERY, { pid: partnerId });
  const usage = agg?.orders_aggregate?.aggregate?.count ?? 0;

  let hundredthOrderAt: string | null = null;
  if (usage >= limit) {
    const nth = await fetchFromHasura(NTH_ORDER_QUERY, {
      pid: partnerId,
      offset: limit - 1,
    });
    hundredthOrderAt = nth?.orders?.[0]?.created_at ?? null;
  }
  return { usage, hundredthOrderAt };
}

/**
 * Returns the current admin-v2 access gate for the logged-in partner.
 * - Pro-plan partners are evaluated synchronously from subscription_details.
 * - Trial-plan partners have their live order usage fetched (cached 60s).
 * - Everyone else resolves to "ok" with no network call.
 */
export function useSubscriptionGate(): {
  gate: SubscriptionGate;
  loading: boolean;
  refresh: () => void;
} {
  const { userData } = useAuthStore();
  const partnerId = userData?.role === "partner" ? userData.id : undefined;
  const sub =
    userData?.role === "partner" ? userData.subscription_details : undefined;
  const planId = sub?.plan?.id ?? null;

  const gated = isGatedPlan(planId);
  const needsUsage = isTrialPlan(planId);

  const [usageData, setUsageData] = useState<UsageData | null>(() =>
    partnerId ? usageCache.get(partnerId)?.data ?? null : null,
  );
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(
    async (force = false) => {
      if (!partnerId || !needsUsage) return;
      const cached = usageCache.get(partnerId);
      if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
        setUsageData(cached.data);
        return;
      }
      const myReq = ++reqId.current;
      setLoading(true);
      try {
        // Coalesce concurrent fetches for the same partner (rapid nav between
        // admin views / multiple hook mounts) into a single in-flight request.
        let p = inflight.get(partnerId);
        if (!p) {
          p = fetchUsage(partnerId, TRIAL_ORDER_LIMIT)
            .then((data) => {
              usageCache.set(partnerId, { at: Date.now(), data });
              return data;
            })
            .finally(() => inflight.delete(partnerId));
          inflight.set(partnerId, p);
        }
        const data = await p;
        if (myReq === reqId.current) setUsageData(data);
      } catch (e) {
        console.error("Failed to fetch trial usage", e);
      } finally {
        if (myReq === reqId.current) setLoading(false);
      }
    },
    [partnerId, needsUsage],
  );

  useEffect(() => {
    if (needsUsage && partnerId) load();
  }, [needsUsage, partnerId, load]);

  const gate = computeSubscriptionGate({
    subscriptionDetails: sub,
    usage: usageData?.usage,
    hundredthOrderAt: usageData?.hundredthOrderAt,
  });

  // While trial usage is still loading (no data yet), fail OPEN so we never flash
  // a block before we actually know the count.
  const effectiveGate: SubscriptionGate =
    needsUsage && usageData == null
      ? { ...gate, state: "ok", isBlocked: false }
      : gate;

  return {
    gate: effectiveGate,
    loading: gated ? loading : false,
    refresh: () => load(true),
  };
}
