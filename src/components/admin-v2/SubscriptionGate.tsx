"use client";

import type { ReactNode } from "react";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { SubscriptionNoticeBanner } from "./SubscriptionNoticeBanner";
import { SubscriptionBlockedScreen } from "./SubscriptionBlockedScreen";

/**
 * Wraps the admin-v2 content area. For partners on the gated model (100-order
 * trial or Pro plan) it shows a notice banner while approaching a limit and
 * replaces the content with a lock screen once access is blocked — EXCEPT on the
 * Billing view, which stays reachable so they can review/renew. Storefront and
 * every non-gated partner are unaffected.
 */
export function SubscriptionGate({
  activeView,
  onNavigate,
  children,
}: {
  activeView: string;
  onNavigate: (view: string) => void;
  children: ReactNode;
}) {
  const { gate, refresh } = useSubscriptionGate();

  if (gate.isBlocked && activeView !== "Billing") {
    return (
      <SubscriptionBlockedScreen
        gate={gate}
        onGoBilling={() => onNavigate("Billing")}
      />
    );
  }

  return (
    <>
      <SubscriptionNoticeBanner gate={gate} onRenewed={refresh} />
      {children}
    </>
  );
}
