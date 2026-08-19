"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuthStore } from "@/store/authStore";
import type { WhatsAppStatus } from "./RightRail";

/**
 * Connection + flow state for the partner's WhatsApp channel.
 *
 * Same two endpoints admin-v2's DashboardGetStarted uses, fetched once and
 * shared by the sidebar dot, the Get Started checklist and the channel card —
 * three consumers, one round trip each, instead of three duplicate fetches.
 *
 * Never throws: WhatsApp being unreachable must not take the dashboard down, so
 * a failure resolves to "not connected" and the UI simply offers to connect.
 */
export function useWhatsAppStatus() {
  const { userData } = useAuthStore();
  const partnerId = userData?.role === "partner" ? userData.id : undefined;

  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const statusRes = await fetch(
        `/api/whatsapp/meta/status?partnerId=${partnerId}`,
      );
      const statusJson = statusRes.ok ? await statusRes.json() : null;
      const connected = !!statusJson?.connected;

      let flowsActive = 0;
      let flowsTotal = 0;
      if (connected) {
        try {
          const flowsRes = await fetch(`/api/whatsapp/flows?partnerId=${partnerId}`);
          const flowsJson = flowsRes.ok ? await flowsRes.json() : null;
          const flows: any[] = Array.isArray(flowsJson?.flows) ? flowsJson.flows : [];
          flowsTotal = flows.length;
          flowsActive = flows.filter((f) => !!f?.enabled).length;
        } catch {
          // Flow counts are decoration; a connected channel is still connected.
        }
      }

      setStatus({
        connected,
        displayPhone: statusJson?.display_phone ?? null,
        flowsActive,
        flowsTotal,
      });
    } catch (e) {
      console.error("useWhatsAppStatus failed:", e);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, loading, refresh: load };
}
