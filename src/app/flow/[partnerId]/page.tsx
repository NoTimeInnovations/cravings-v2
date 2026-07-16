"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import FlowBuilder, { type CallLoggerFlowApi } from "@/components/callLogger/FlowBuilder";

/**
 * Partner-facing call-flow editor at menuthere.com/flow/<partnerId>. The Call
 * Logger app opens this in a WebView with the partner's per-device token in the URL
 * fragment (#<token>) — it's read once, stripped from the visible URL, and used to
 * load/save the flow via the partner-scoped device proxy. No separate login: the
 * token authenticates the partner. Editing here changes the live flow without any
 * app update.
 */
export default function PartnerFlowPage() {
  const params = useParams<{ partnerId: string }>();
  const partnerId = params.partnerId;
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.location.hash.replace(/^#/, "").trim();
    if (t) {
      setToken(t);
      // Strip the token from the address so it can't be seen or shared.
      window.history.replaceState(null, "", window.location.pathname);
    }
    setReady(true);
  }, []);

  const api = useMemo<CallLoggerFlowApi | undefined>(() => {
    if (!token) return undefined;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const parse = async (r: Response) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
      return body;
    };
    return {
      getFlow: () => fetch(`/api/call-logger/device/flow`, { headers }).then(parse),
      saveFlow: (b) =>
        fetch(`/api/call-logger/device/flow`, {
          method: "PUT",
          headers,
          body: JSON.stringify(b),
        }).then(parse),
      runFlow: (n) =>
        fetch(`/api/call-logger/device/run-flow`, {
          method: "POST",
          headers,
          body: JSON.stringify({ number: n }),
        }).then(parse),
    };
  }, [token]);

  if (!ready) return null;

  if (!token) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
        Open this from the Call Logger app (“Edit flow”) to manage your call
        follow-up flow.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Call follow-up flow</h1>
      <FlowBuilder partnerId={partnerId} accountEmail="" api={api} />
    </div>
  );
}
