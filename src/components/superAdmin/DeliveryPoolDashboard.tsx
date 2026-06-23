"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

type Tone = "green" | "red" | "amber" | "gray" | "orange";
const TONE: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  gray: "bg-muted text-muted-foreground border-transparent",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
};
function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", TONE[tone])}>
      {children}
    </span>
  );
}
const kycTone = (s: unknown): Tone => (s === "verified" ? "green" : s === "rejected" ? "red" : "amber");
const onlineTone = (s: unknown): Tone => (s === "online" || s === "idle" ? "green" : "gray");

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
  const [assignFor, setAssignFor] = useState<{ id: string; label: string } | null>(null);
  const [assignRiders, setAssignRiders] = useState<Row[]>([]);
  const [assignRiderId, setAssignRiderId] = useState<string>("");
  const [assignBusy, setAssignBusy] = useState(false);

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

  const cards: { label: string; value: string | number; tone?: string }[] = [
    { label: "Orders", value: overview?.orders_total ?? 0 },
    { label: "Searching", value: o.searching ?? 0, tone: "text-amber-600" },
    { label: "In progress", value: inProgress, tone: "text-orange-600" },
    { label: "Delivered", value: o.delivered ?? 0, tone: "text-emerald-600" },
    { label: "Riders online", value: overview?.riders_online ?? 0, tone: "text-emerald-600" },
    { label: "Pool restaurants", value: overview?.pool_restaurants ?? 0 },
    { label: "Revenue today", value: `₹${overview?.revenue_today ?? 0}` },
    { label: "Total revenue", value: `₹${overview?.revenue_total ?? 0}` },
  ];

  const openAssign = async (id: string, label: string) => {
    setAssignFor({ id, label });
    setAssignRiderId("");
    const res = await getPoolRiders();
    const list = ((res?.data as Row[]) ?? []).slice().sort((a, b) => {
      const oa = a.status === "online" || a.status === "idle" ? 0 : 1;
      const ob = b.status === "online" || b.status === "idle" ? 0 : 1;
      return oa - ob || String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""));
    });
    setAssignRiders(list);
  };

  const confirmAssign = async () => {
    if (!assignFor || !assignRiderId) return;
    setAssignBusy(true);
    const r = await forcePoolAssign(assignFor.id, assignRiderId);
    setAssignBusy(false);
    if (r.ok) {
      toast.success("Force-assigned");
      setAssignFor(null);
      load();
    } else {
      toast.error(r.error || "Failed");
    }
  };

  return (
    <div className="space-y-5">
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{err}</div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-none">
            <CardContent className="p-4">
              <div className={cn("text-2xl font-bold tracking-tight", c.tone)}>{c.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex-1 min-w-[140px]">
          {syncing
            ? "Syncing delivery-pool partners…"
            : syncInfo
              ? `Auto-registered ${syncInfo.synced}/${syncInfo.total} delivery-pool partners`
              : ""}
        </span>
        <Button variant="outline" size="sm" onClick={runSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Re-sync partners"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/60 p-1">
          {([
            ["orders", "Live orders"],
            ["riders", "Riders"],
            ["responses", "Responses"],
            ["availability", "Availability"],
            ["geo", "Geo search"],
          ] as const).map(([v, label]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Live orders ── */}
        <TabsContent value="orders" className="mt-4">
          {!rows.length ? (
            <Empty>No live orders</Empty>
          ) : (
            <>
              {/* desktop */}
              <Card className="hidden md:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rider</TableHead>
                      <TableHead>Drop</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={str(r.id)}>
                        <TableCell className="font-mono text-xs">{str(r.source_order_id ?? r.id).slice(0, 12)}</TableCell>
                        <TableCell>{str(r.restaurant_name)}</TableCell>
                        <TableCell><Pill tone="orange">{str(r.status)}</Pill></TableCell>
                        <TableCell>{str(r.rider_name)}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">{str(r.drop_address)}</TableCell>
                        <TableCell>{r.delivery_fee != null ? `₹${str(r.delivery_fee)}` : "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" className="mr-1" disabled={busy} onClick={() => openAssign(str(r.id), str(r.source_order_id ?? r.id).slice(0, 12))}>Assign</Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" disabled={busy}
                            onClick={() => { if (window.confirm("Cancel this order?")) act(cancelPoolOrder(str(r.id), "admin"), "Cancelled"); }}>Cancel</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              {/* mobile */}
              <div className="md:hidden space-y-3">
                {rows.map((r) => (
                  <Card key={str(r.id)}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs">{str(r.source_order_id ?? r.id).slice(0, 12)}</span>
                        <Pill tone="orange">{str(r.status)}</Pill>
                      </div>
                      <div className="font-medium">{str(r.restaurant_name)}</div>
                      <div className="text-sm text-muted-foreground">{str(r.drop_address)}</div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{str(r.rider_name)}</span>
                        <span className="font-semibold">{r.delivery_fee != null ? `₹${str(r.delivery_fee)}` : "—"}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1" disabled={busy} onClick={() => openAssign(str(r.id), str(r.source_order_id ?? r.id).slice(0, 12))}>Assign</Button>
                        <Button variant="outline" size="sm" className="flex-1 text-red-600" disabled={busy}
                          onClick={() => { if (window.confirm("Cancel this order?")) act(cancelPoolOrder(str(r.id), "admin"), "Cancelled"); }}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Riders ── */}
        <TabsContent value="riders" className="mt-4">
          {!rows.length ? (
            <Empty>No riders</Empty>
          ) : (
            <>
              <Card className="hidden md:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>On trip</TableHead>
                      <TableHead>Done</TableHead>
                      <TableHead>KYC</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={str(r.id)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RiderAvatar url={r.photo_url as string | null} name={r.full_name as string} />
                            <div className="leading-tight">
                              <div className="font-medium">{str(r.full_name)}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{str(r.id).slice(0, 8)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{str(r.vehicle_type)}</TableCell>
                        <TableCell>
                          {r.account_status === "blocked"
                            ? <Pill tone="red">Blocked</Pill>
                            : <Pill tone={onlineTone(r.status)}>{str(r.status ?? "offline")}</Pill>}
                        </TableCell>
                        <TableCell>{str(r.active_order_count ?? 0)}</TableCell>
                        <TableCell>{str(r.completed_orders ?? 0)}</TableCell>
                        <TableCell><Pill tone={kycTone(r.kyc_status)}>{str(r.kyc_status)}</Pill></TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" className="mr-1"
                            onClick={() => setDocRider({ id: str(r.id), name: r.full_name ? String(r.full_name) : undefined })}>Docs / KYC</Button>
                          <Button variant="ghost" size="sm" className="text-red-600 mr-1" disabled={busy}
                            onClick={() => { if (window.confirm("Block this rider's account?")) act(setPoolRiderStatus(str(r.id), "blocked"), "Blocked"); }}>Block</Button>
                          <Button variant="ghost" size="sm" className="text-emerald-700" disabled={busy}
                            onClick={() => act(setPoolRiderStatus(str(r.id), "active"), "Activated")}>Activate</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <div className="md:hidden space-y-3">
                {rows.map((r) => (
                  <Card key={str(r.id)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <RiderAvatar url={r.photo_url as string | null} name={r.full_name as string} />
                          <div className="leading-tight">
                            <div className="font-medium">{str(r.full_name)}</div>
                            <div className="text-xs text-muted-foreground capitalize">{str(r.vehicle_type)} · {str(r.completed_orders ?? 0)} done</div>
                          </div>
                        </div>
                        {r.account_status === "blocked"
                          ? <Pill tone="red">Blocked</Pill>
                          : <Pill tone={onlineTone(r.status)}>{str(r.status ?? "offline")}</Pill>}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Pill tone={kycTone(r.kyc_status)}>KYC: {str(r.kyc_status)}</Pill>
                        <span className="text-muted-foreground">On trip: {str(r.active_order_count ?? 0)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="flex-1"
                          onClick={() => setDocRider({ id: str(r.id), name: r.full_name ? String(r.full_name) : undefined })}>Docs / KYC</Button>
                        <Button variant="outline" size="sm" className="text-red-600" disabled={busy}
                          onClick={() => { if (window.confirm("Block this rider's account?")) act(setPoolRiderStatus(str(r.id), "blocked"), "Blocked"); }}>Block</Button>
                        <Button variant="outline" size="sm" className="text-emerald-700" disabled={busy}
                          onClick={() => act(setPoolRiderStatus(str(r.id), "active"), "Activated")}>Activate</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Responses ── */}
        <TabsContent value="responses" className="mt-4">
          {!rows.length ? (
            <Empty>No accept/reject activity yet</Empty>
          ) : (
            <>
              <Card className="hidden md:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={str(r.id)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RiderAvatar url={r.photo_url as string | null} name={r.rider_name as string} />
                            <span>{str(r.rider_name)}</span>
                          </div>
                        </TableCell>
                        <TableCell><Pill tone={r.status === "accepted" ? "green" : "red"}>{r.status === "accepted" ? "Accepted" : "Rejected"}</Pill></TableCell>
                        <TableCell className="font-mono text-xs">{str(r.source_order_id ?? r.order_id).slice(0, 8)}</TableCell>
                        <TableCell>{str(r.restaurant_name)}</TableCell>
                        <TableCell className="text-muted-foreground">{fmtTime(r.responded_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <div className="md:hidden space-y-3">
                {rows.map((r) => (
                  <Card key={str(r.id)}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <RiderAvatar url={r.photo_url as string | null} name={r.rider_name as string} />
                          <span className="font-medium">{str(r.rider_name)}</span>
                        </div>
                        <Pill tone={r.status === "accepted" ? "green" : "red"}>{r.status === "accepted" ? "Accepted" : "Rejected"}</Pill>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{str(r.restaurant_name)} · <span className="font-mono text-xs">{str(r.source_order_id ?? r.order_id).slice(0, 8)}</span></span>
                        <span>{fmtTime(r.responded_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Availability ── */}
        <TabsContent value="availability" className="mt-4">
          <RiderAvailabilityMap riders={rows} />
        </TabsContent>

        {/* ── Geo search ── */}
        <TabsContent value="geo" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Lat</Label>
                  <Input value={geo.lat} onChange={(e) => setGeo({ ...geo, lat: e.target.value })} placeholder="10.6896" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lng</Label>
                  <Input value={geo.lng} onChange={(e) => setGeo({ ...geo, lng: e.target.value })} placeholder="76.7089" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Radius km</Label>
                  <Input value={geo.radius} onChange={(e) => setGeo({ ...geo, radius: e.target.value })} />
                </div>
                <Button onClick={runGeo} disabled={busy} className="bg-orange-600 hover:bg-orange-700">Search</Button>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Riders ({geoRiders.length})</h4>
                  {geoRiders.length ? geoRiders.map((r) => (
                    <div key={str(r.id)} className="flex justify-between text-sm border-t py-1.5">
                      <span>{str(r.full_name)} · <span className="text-muted-foreground">{str(r.status)}</span></span>
                      <span className="text-muted-foreground">{str(r.distance_km)} km</span>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">No riders in range.</p>}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Restaurants ({geoRestaurants.length})</h4>
                  {geoRestaurants.length ? geoRestaurants.map((r) => (
                    <div key={str(r.restaurant_id)} className="flex justify-between text-sm border-t py-1.5">
                      <span>{str(r.name)}</span>
                      <span className="text-muted-foreground">{str(r.distance_km)} km</span>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">No restaurants in range.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">Auto-refreshes every 5s · data from the Delivery Pool order-service.</p>

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

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign a rider</DialogTitle>
            <DialogDescription>
              Force-assign order <span className="font-mono">{assignFor?.label}</span> to a rider (bypasses eligibility).
            </DialogDescription>
          </DialogHeader>
          <Select value={assignRiderId} onValueChange={setAssignRiderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a rider" />
            </SelectTrigger>
            <SelectContent>
              {assignRiders.map((r) => {
                const online = r.status === "online" || r.status === "idle";
                return (
                  <SelectItem key={str(r.id)} value={str(r.id)}>
                    {str(r.full_name)} · {online ? "online" : "offline"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {!assignRiders.length && <p className="text-xs text-muted-foreground">No riders found.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!assignRiderId || assignBusy}
              onClick={confirmAssign}
            >
              {assignBusy ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
