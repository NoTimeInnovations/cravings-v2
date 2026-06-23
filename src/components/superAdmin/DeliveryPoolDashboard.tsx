"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getPoolOverview,
  getPoolOrders,
  getPoolRiders,
  getPoolOfferResponses,
  forcePoolAssign,
  cancelPoolOrder,
  setPoolRiderStatus,
  searchPoolRiders,
  searchPoolRestaurants,
  syncAllPoolRestaurants,
  getPoolRiderDocs,
  verifyPoolRiderKyc,
} from "@/app/actions/deliveryPoolAdmin";
import RiderDocsModal from "@/components/deliveryPool/RiderDocsModal";
import RiderAvatar from "@/components/deliveryPool/RiderAvatar";
import RiderAvailabilityMap from "@/components/deliveryPool/RiderAvailabilityMap";

type Row = Record<string, unknown>;
type Overview = {
  orders: Record<string, number>;
  orders_total: number;
  riders_online: number;
  riders_total: number;
  pool_restaurants: number;
  revenue_total: number;
  revenue_today: number;
};
type Res = { ok: boolean; data?: any; error?: string };

const PHASES = [
  "assigned",
  "going_to_pickup",
  "arrived_at_pickup",
  "picked_up",
  "dispatched",
  "arrived_near_customer",
];

const str = (v: unknown) => (v == null ? "—" : String(v));
const fmtTime = (v: unknown) => {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function DeliveryPoolDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"orders" | "riders" | "responses" | "availability" | "geo">("orders");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncInfo, setSyncInfo] = useState<{ total: number; synced: number } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // geo search
  const [geo, setGeo] = useState({ lat: "", lng: "", radius: "5" });
  const [geoRiders, setGeoRiders] = useState<Row[]>([]);
  const [geoRestaurants, setGeoRestaurants] = useState<Row[]>([]);
  const [docRider, setDocRider] = useState<{ id: string; name?: string } | null>(null);

  const load = useCallback(async () => {
    const ov = (await getPoolOverview()) as Overview | null;
    if (!ov) {
      setErr("Delivery Pool unreachable — check DELIVERY_POOL_URL and that order-service is running.");
      return;
    }
    setErr(null);
    setOverview(ov);
    if (tab === "geo") return;
    const res =
      tab === "orders"
        ? await getPoolOrders()
        : tab === "responses"
          ? await getPoolOfferResponses()
          : await getPoolRiders();
    setRows((res?.data as Row[]) ?? []);
  }, [tab]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const runSync = async () => {
    setSyncing(true);
    const r = await syncAllPoolRestaurants();
    setSyncing(false);
    if (r.ok) {
      setSyncInfo({ total: r.total, synced: r.synced });
      load();
    } else {
      toast.error(r.error || "Partner sync failed");
    }
  };
  // Auto-register every delivery_pool partner into the pool once on mount.
  useEffect(() => {
    runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (p: Promise<Res>, okMsg: string) => {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (r.ok) {
      toast.success(okMsg);
      load();
    } else {
      toast.error(r.error || "Failed");
    }
  };

  const runGeo = async () => {
    const lat = parseFloat(geo.lat);
    const lng = parseFloat(geo.lng);
    const radius = parseFloat(geo.radius) || 5;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Enter a valid lat & lng");
      return;
    }
    setBusy(true);
    const [rd, rs] = await Promise.all([
      searchPoolRiders(lat, lng, radius),
      searchPoolRestaurants(lat, lng, radius),
    ]);
    setBusy(false);
    setGeoRiders((rd?.data as Row[]) ?? []);
    setGeoRestaurants((rs?.data as Row[]) ?? []);
  };

  const o = overview?.orders ?? {};
  const inProgress = PHASES.reduce((s, k) => s + (o[k] ?? 0), 0);

  const cards: [string, string | number][] = [
    ["Orders", overview?.orders_total ?? 0],
    ["Searching", o.searching ?? 0],
    ["In progress", inProgress],
    ["Delivered", o.delivered ?? 0],
    ["Riders online", overview?.riders_online ?? 0],
    ["Pool restaurants", overview?.pool_restaurants ?? 0],
    ["Revenue today", `₹${overview?.revenue_today ?? 0}`],
    ["Total revenue", `₹${overview?.revenue_total ?? 0}`],
  ];

  return (
    <div>
      {err && <div className="mb-4 rounded bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-3 mb-5">
        {cards.map(([label, n]) => (
          <div key={label} className="bg-white rounded-lg px-5 py-3 border border-[#ffba79]/20 min-w-[120px]">
            <div className="text-2xl font-bold">{n}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 mb-3 flex items-center gap-3">
        <span>
          {syncing
            ? "Syncing delivery-pool partners…"
            : syncInfo
              ? `Auto-registered ${syncInfo.synced}/${syncInfo.total} delivery-pool partners`
              : ""}
        </span>
        <button onClick={runSync} disabled={syncing} className="px-2 py-0.5 rounded border disabled:opacity-50">
          Re-sync partners
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        {(["orders", "riders", "responses", "availability", "geo"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded border ${
              tab === t ? "bg-orange-600 text-white border-orange-600" : "bg-white border-gray-300"
            }`}
          >
            {t === "orders"
              ? "Live orders"
              : t === "riders"
                ? "Riders"
                : t === "responses"
                  ? "Responses"
                  : t === "availability"
                    ? "Availability"
                    : "Geo search"}
          </button>
        ))}
      </div>

      {tab === "geo" ? (
        <div className="bg-white rounded-lg border border-[#ffba79]/20 p-4">
          <div className="flex flex-wrap gap-2 items-end mb-4">
            <label className="text-xs text-gray-500">
              Lat
              <input value={geo.lat} onChange={(e) => setGeo({ ...geo, lat: e.target.value })} placeholder="10.6896" className="block border rounded px-2 py-1.5 text-sm w-32" />
            </label>
            <label className="text-xs text-gray-500">
              Lng
              <input value={geo.lng} onChange={(e) => setGeo({ ...geo, lng: e.target.value })} placeholder="76.7089" className="block border rounded px-2 py-1.5 text-sm w-32" />
            </label>
            <label className="text-xs text-gray-500">
              Radius km
              <input value={geo.radius} onChange={(e) => setGeo({ ...geo, radius: e.target.value })} className="block border rounded px-2 py-1.5 text-sm w-24" />
            </label>
            <button onClick={runGeo} disabled={busy} className="px-4 py-2 rounded bg-orange-600 text-white text-sm disabled:opacity-50">
              Search
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Riders ({geoRiders.length})</h4>
              {geoRiders.map((r) => (
                <div key={str(r.id)} className="flex justify-between text-sm border-t py-1.5">
                  <span>{str(r.full_name)} · {str(r.status)}</span>
                  <span className="text-gray-500">{str(r.distance_km)} km</span>
                </div>
              ))}
              {!geoRiders.length && <p className="text-xs text-gray-400">No riders in range.</p>}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Restaurants ({geoRestaurants.length})</h4>
              {geoRestaurants.map((r) => (
                <div key={str(r.restaurant_id)} className="flex justify-between text-sm border-t py-1.5">
                  <span>{str(r.name)}</span>
                  <span className="text-gray-500">{str(r.distance_km)} km</span>
                </div>
              ))}
              {!geoRestaurants.length && <p className="text-xs text-gray-400">No restaurants in range.</p>}
            </div>
          </div>
        </div>
      ) : tab === "availability" ? (
        <RiderAvailabilityMap riders={rows} />
      ) : (
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
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr key={str(r.id)} className="border-t">
                      <td className="p-3">{str(r.source_order_id ?? r.id).slice(0, 12)}</td>
                      <td className="p-3">{str(r.restaurant_name)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">{str(r.status)}</span>
                      </td>
                      <td className="p-3">{str(r.rider_name)}</td>
                      <td className="p-3">{str(r.drop_address)}</td>
                      <td className="p-3">{r.delivery_fee != null ? `₹${str(r.delivery_fee)}` : "—"}</td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            const rid = window.prompt("Rider ID to force-assign (see Riders tab):")?.trim();
                            if (rid) act(forcePoolAssign(str(r.id), rid), "Force-assigned");
                          }}
                          disabled={busy}
                          className="text-xs px-2 py-1 rounded border mr-1"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => { if (window.confirm("Cancel this order?")) act(cancelPoolOrder(str(r.id), "admin"), "Cancelled"); }}
                          disabled={busy}
                          className="text-xs px-2 py-1 rounded border text-red-600"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-3 text-gray-400" colSpan={7}>No live orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : tab === "responses" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-left">
                  <th className="p-3">Rider</th>
                  <th className="p-3">Decision</th>
                  <th className="p-3">Order</th>
                  <th className="p-3">Restaurant</th>
                  <th className="p-3">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr key={str(r.id)} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <RiderAvatar url={r.photo_url as string | null} name={r.rider_name as string} />
                          <span>{str(r.rider_name)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            r.status === "accepted" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {r.status === "accepted" ? "Accepted" : "Rejected"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{str(r.source_order_id ?? r.order_id).slice(0, 8)}</td>
                      <td className="p-3">{str(r.restaurant_name)}</td>
                      <td className="p-3 text-gray-500">{fmtTime(r.responded_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-3 text-gray-400" colSpan={5}>No accept/reject activity yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-left">
                  <th className="p-3">Rider</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">On trip</th>
                  <th className="p-3">Done</th>
                  <th className="p-3">KYC</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => {
                    const online = r.status === "online" || r.status === "idle";
                    return (
                      <tr key={str(r.id)} className="border-t">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <RiderAvatar url={r.photo_url as string | null} name={r.full_name as string} />
                            <span>{str(r.full_name)}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs">{str(r.id).slice(0, 8)}</td>
                        <td className="p-3">{str(r.vehicle_type)}</td>
                        <td className="p-3">
                          {r.account_status === "blocked" ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">Blocked</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${online ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {str(r.status ?? "offline")}
                            </span>
                          )}
                        </td>
                        <td className="p-3">{str(r.active_order_count ?? 0)}</td>
                        <td className="p-3">{str(r.completed_orders ?? 0)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              r.kyc_status === "verified"
                                ? "bg-green-50 text-green-700"
                                : r.kyc_status === "rejected"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {str(r.kyc_status)}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <button
                            onClick={() =>
                              setDocRider({ id: str(r.id), name: r.full_name ? String(r.full_name) : undefined })
                            }
                            className="text-xs px-2 py-1 rounded border mr-1"
                          >
                            Docs / KYC
                          </button>
                          <button
                            onClick={() => { if (window.confirm("Block this rider's account?")) act(setPoolRiderStatus(str(r.id), "blocked"), "Blocked"); }}
                            disabled={busy}
                            className="text-xs px-2 py-1 rounded border text-red-600 mr-1"
                          >
                            Block
                          </button>
                          <button
                            onClick={() => act(setPoolRiderStatus(str(r.id), "active"), "Activated")}
                            disabled={busy}
                            className="text-xs px-2 py-1 rounded border text-green-700"
                          >
                            Activate
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-3 text-gray-400" colSpan={8}>No riders</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">Auto-refreshes every 5s · data from the Delivery Pool order-service.</p>

      <RiderDocsModal
        open={!!docRider}
        onClose={() => setDocRider(null)}
        riderId={docRider?.id ?? null}
        riderName={docRider?.name}
        canVerify
        fetchDocs={async (id) => {
          const j = await getPoolRiderDocs(id);
          return { docs: (j?.data as any[]) ?? [], fullName: j?.full_name, kyc: j?.kyc_status };
        }}
        onVerify={async (status, reason) => {
          const r = await verifyPoolRiderKyc(docRider!.id, status, reason);
          if (r.ok) {
            toast.success(`KYC ${status}`);
            load();
          } else {
            toast.error(r.error || "Failed");
          }
          return { ok: r.ok, error: r.error };
        }}
      />
    </div>
  );
}
