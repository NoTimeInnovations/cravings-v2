"use client";

import { useEffect, useState } from "react";
import { getDispatchProgress } from "@/app/actions/porterBridge";

interface Rider {
  status: string;
  wonProvider: string | null;
  driver: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
  } | null;
  trackUrl: string | null;
}

const PROVIDER_LABEL: Record<string, string> = {
  porter: "Porter",
  uber: "Uber",
  rapido: "Rapido",
};

/**
 * Provider-agnostic "delivery partner" card for orders dispatched through the
 * delivery bridge. Once a rider is assigned (porter / uber / rapido), shows the
 * rider's name, phone, vehicle number and the live track link. Renders nothing
 * until a rider is actually assigned. Polls the bridge (read-only) — fast while
 * waiting, slow once assigned. Mount it only for orders that have a dispatchId.
 */
export default function DeliveryRiderPanel({ orderId }: { orderId: string }) {
  const [r, setR] = useState<Rider | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const res = await getDispatchProgress(orderId);
      if (!active) return;
      if (res.ok) {
        const d = res.data as unknown as Rider;
        setR(d);
        const assigned = d.status === "assigned" && !!d.driver?.name;
        timer = setTimeout(tick, assigned ? 20000 : 6000);
      }
      // 404 (no dispatch) / error → stop polling; nothing to show.
    };
    tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  if (!r || !r.driver?.name) return null;
  const provider = r.wonProvider
    ? (PROVIDER_LABEL[r.wonProvider] ?? r.wonProvider)
    : "Delivery";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Delivery partner</h3>
        <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{provider}</span>
      </div>
      <div className="text-sm font-medium">{r.driver.name}</div>
      {r.driver.vehicleNumber && (
        <div className="mt-0.5 font-mono text-sm text-muted-foreground">
          {r.driver.vehicleNumber}
          {r.driver.vehicleModel ? ` · ${r.driver.vehicleModel}` : ""}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-3">
        {r.driver.phone && (
          <a
            href={`tel:${r.driver.phone}`}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Call {r.driver.phone}
          </a>
        )}
        {r.trackUrl && (
          <a
            href={r.trackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Track delivery live →
          </a>
        )}
      </div>
    </div>
  );
}
