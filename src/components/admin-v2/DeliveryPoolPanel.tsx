"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  poolGetConfig,
  poolSyncConfig,
  poolLinkRequests,
  poolApprove,
  poolReject,
  poolRiders,
  poolInvite,
  poolDisableRider,
  poolRemoveRider,
  poolOrders,
} from "@/app/actions/deliveryPoolPartner";

type Row = Record<string, any>;
type Res = { ok: boolean; data?: any; error?: string };

const str = (v: unknown) => (v == null ? "—" : String(v));

export default function DeliveryPoolPanel() {
  const { userData } = useAuthStore();
  const rid = (userData as any)?.id as string | undefined;
  const [config, setConfig] = useState<Row | null>(null);
  const [requests, setRequests] = useState<Row[]>([]);
  const [riders, setRiders] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [tab, setTab] = useState<"riders" | "orders">("riders");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    const [c, lr, rd, od] = await Promise.all([
      poolGetConfig(rid),
      poolLinkRequests(rid),
      poolRiders(rid),
      poolOrders(rid),
    ]);
    if (c.ok) setConfig(c.data);
    if (lr.ok) setRequests(lr.data?.data ?? []);
    if (rd.ok) setRiders(rd.data?.data ?? []);
    if (od.ok) setOrders(od.data?.data ?? []);
  }, [rid]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

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

  const sync = async () => {
    if (!rid) return;
    const coords = (userData as any)?.geo_location?.coordinates;
    const pickup =
      Array.isArray(coords) && coords.length === 2 ? { lat: coords[1], lng: coords[0] } : undefined;
    if (!pickup) {
      toast.error("Set your store location first (Settings → Store) so riders can find you.");
      return;
    }
    await act(
      poolSyncConfig(rid, { name: (userData as any)?.store_name, pool_enabled: true, pickup }),
      "Synced to Delivery Pool",
    );
  };

  if (!rid) return <div className="text-muted-foreground">Loading…</div>;

  const registered = !!config?.registered;
  const pickup = config?.pickup;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Setup / sync */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Delivery Pool</h2>
            <p className="text-sm text-muted-foreground">
              Menuthere rider network. Orders auto-dispatch to your linked riders when you accept them.
            </p>
          </div>
          <button
            onClick={sync}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white font-medium disabled:opacity-50"
          >
            {registered ? "Re-sync store" : "Register store in pool"}
          </button>
        </div>
        <div className="mt-3 text-sm">
          {registered ? (
            <span className="text-green-700">
              ✓ Registered · pickup {pickup ? `${pickup.lat?.toFixed?.(4)}, ${pickup.lng?.toFixed?.(4)}` : "not set"}
            </span>
          ) : (
            <span className="text-amber-700">
              Not registered yet — riders can&apos;t find you until you register your store + pickup location.
            </span>
          )}
        </div>
      </div>

      {/* Invite rider */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold mb-1">Add a rider</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Enter a rider&apos;s phone to invite them — they accept in the rider app and become linked.
        </p>
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            className="flex-1 max-w-xs border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => phone.trim() && act(poolInvite(rid, phone.trim()).then((r) => { if (r.ok) setPhone(""); return r; }), "Invite sent")}
            disabled={busy}
            className="px-4 py-2 rounded-lg border font-medium disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      </div>

      {/* Pending link requests */}
      {requests.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold mb-3">Rider link requests ({requests.length})</h3>
          <div className="space-y-2">
            {requests.map((q) => (
              <div key={str(q.id)} className="flex items-center justify-between border-t pt-2 first:border-t-0 first:pt-0">
                <div>
                  <div className="font-medium">{str(q.full_name)}</div>
                  <div className="text-xs text-muted-foreground">
                    {str(q.phone)} · {str(q.district)} · {str(q.vehicle_type)} · {str(q.completed_orders ?? 0)} done
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(poolApprove(rid, str(q.id)), "Approved")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = window.prompt("Reason for rejecting?") || "";
                      if (reason) act(poolReject(rid, str(q.id), reason), "Rejected");
                    }}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: riders / orders */}
      <div className="flex gap-2">
        {(["riders", "orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg border ${tab === t ? "bg-orange-600 text-white border-orange-600" : "bg-white"}`}
          >
            {t === "riders" ? `Linked riders (${riders.length})` : `Live orders (${orders.length})`}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        {tab === "riders" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-left">
                <th className="p-3">Rider</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Status</th>
                <th className="p-3">Done</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {riders.length ? (
                riders.map((r) => (
                  <tr key={str(r.rider_id)} className="border-t">
                    <td className="p-3">{str(r.full_name)}</td>
                    <td className="p-3">{str(r.phone)}</td>
                    <td className="p-3">
                      {r.disabled ? (
                        <span className="text-gray-400">disabled</span>
                      ) : (
                        <span className="text-green-700">{str(r.availability ?? "offline")}</span>
                      )}
                    </td>
                    <td className="p-3">{str(r.completed_orders ?? 0)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => act(poolDisableRider(rid, str(r.rider_id), !r.disabled), r.disabled ? "Enabled" : "Disabled")}
                        disabled={busy}
                        className="text-xs px-2 py-1 rounded border mr-1"
                      >
                        {r.disabled ? "Enable" : "Disable"}
                      </button>
                      <button
                        onClick={() => { if (window.confirm("Remove this rider?")) act(poolRemoveRider(rid, str(r.rider_id)), "Removed"); }}
                        disabled={busy}
                        className="text-xs px-2 py-1 rounded border text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3 text-gray-400" colSpan={5}>
                    No linked riders yet — invite by phone above, or approve incoming requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-left">
                <th className="p-3">Order</th>
                <th className="p-3">Status</th>
                <th className="p-3">Rider</th>
                <th className="p-3">Drop</th>
                <th className="p-3">Fee</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((o) => (
                  <tr key={str(o.id)} className="border-t">
                    <td className="p-3">{str(o.source_order_id ?? o.id).slice(0, 12)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                        {str(o.status)}
                      </span>
                    </td>
                    <td className="p-3">{str(o.rider_name)}</td>
                    <td className="p-3">{str(o.drop_address)}</td>
                    <td className="p-3">{o.delivery_fee != null ? `₹${str(o.delivery_fee)}` : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3 text-gray-400" colSpan={5}>
                    No active pool orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400">Auto-refreshes every 6s.</p>
    </div>
  );
}
