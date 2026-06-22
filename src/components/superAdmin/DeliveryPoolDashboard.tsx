"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPoolOverview,
  getPoolOrders,
  getPoolRiders,
} from "@/app/actions/deliveryPoolAdmin";

type Row = Record<string, unknown>;
type Overview = {
  orders: Record<string, number>;
  orders_total: number;
  riders_online: number;
  riders_total: number;
  pool_restaurants: number;
};

const PHASES = [
  "assigned",
  "going_to_pickup",
  "arrived_at_pickup",
  "picked_up",
  "dispatched",
  "arrived_near_customer",
];

const str = (v: unknown) => (v == null ? "—" : String(v));

export default function DeliveryPoolDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"orders" | "riders">("orders");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ov = (await getPoolOverview()) as Overview | null;
    if (!ov) {
      setErr("Delivery Pool unreachable — check DELIVERY_POOL_URL and that order-service is running.");
      return;
    }
    setErr(null);
    setOverview(ov);
    const res = tab === "orders" ? await getPoolOrders() : await getPoolRiders();
    setRows((res?.data as Row[]) ?? []);
  }, [tab]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const o = overview?.orders ?? {};
  const inProgress = PHASES.reduce((s, k) => s + (o[k] ?? 0), 0);

  const cards: [string, number][] = [
    ["Orders", overview?.orders_total ?? 0],
    ["Searching", o.searching ?? 0],
    ["In progress", inProgress],
    ["Delivered", o.delivered ?? 0],
    ["Riders online", overview?.riders_online ?? 0],
    ["Pool restaurants", overview?.pool_restaurants ?? 0],
  ];

  return (
    <div>
      {err && <div className="mb-4 rounded bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-3 mb-5">
        {cards.map(([label, n]) => (
          <div
            key={label}
            className="bg-white rounded-lg px-5 py-3 border border-[#ffba79]/20 min-w-[120px]"
          >
            <div className="text-2xl font-bold">{n}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        {(["orders", "riders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded border ${
              tab === t
                ? "bg-orange-600 text-white border-orange-600"
                : "bg-white border-gray-300"
            }`}
          >
            {t === "orders" ? "Live orders" : "Riders"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-[#ffba79]/20">
        {tab === "orders" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-left">
                <th className="p-3">Order</th>
                <th className="p-3">Restaurant</th>
                <th className="p-3">Status</th>
                <th className="p-3">Rider</th>
                <th className="p-3">Drop</th>
                <th className="p-3">Fee</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={str(r.id)} className="border-t">
                    <td className="p-3">{str(r.source_order_id ?? r.id).slice(0, 12)}</td>
                    <td className="p-3">{str(r.restaurant_name)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                        {str(r.status)}
                      </span>
                    </td>
                    <td className="p-3">{str(r.rider_name)}</td>
                    <td className="p-3">{str(r.drop_address)}</td>
                    <td className="p-3">{r.delivery_fee != null ? `₹${str(r.delivery_fee)}` : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3 text-gray-400" colSpan={6}>
                    No live orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-left">
                <th className="p-3">Rider</th>
                <th className="p-3">District</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Status</th>
                <th className="p-3">Active</th>
                <th className="p-3">Done</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => {
                  const online = r.status === "online" || r.status === "idle";
                  return (
                    <tr key={str(r.id)} className="border-t">
                      <td className="p-3">{str(r.full_name)}</td>
                      <td className="p-3">{str(r.district)}</td>
                      <td className="p-3">{str(r.vehicle_type)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            online ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {str(r.status ?? "offline")}
                        </span>
                      </td>
                      <td className="p-3">{str(r.active_order_count ?? 0)}</td>
                      <td className="p-3">{str(r.completed_orders ?? 0)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="p-3 text-gray-400" colSpan={6}>
                    No riders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Auto-refreshes every 5s · data from the Delivery Pool order-service.
      </p>
    </div>
  );
}
