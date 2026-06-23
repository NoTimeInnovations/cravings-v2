"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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
  poolRiderDocs,
} from "@/app/actions/deliveryPoolPartner";
import RiderDocsModal from "@/components/deliveryPool/RiderDocsModal";
import RiderAvatar from "@/components/deliveryPool/RiderAvatar";
import RiderAvailabilityMap from "@/components/deliveryPool/RiderAvailabilityMap";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Row = Record<string, any>;
type Res = { ok: boolean; data?: any; error?: string };

const str = (v: unknown) => (v == null ? "—" : String(v));

type Tone = "green" | "red" | "gray";
const TONE: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gray: "bg-muted text-muted-foreground border-transparent",
};
function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", TONE[tone])}>
      {children}
    </span>
  );
}
const availTone = (s: unknown): Tone => (s === "online" || s === "idle" ? "green" : "gray");

function ToggleRow({
  on,
  onChange,
  label,
  desc,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="pr-2">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch
        checked={on}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-orange-600"
      />
    </div>
  );
}

export default function DeliveryPoolPanel() {
  const { userData } = useAuthStore();
  const rid = (userData as any)?.id as string | undefined;
  const [config, setConfig] = useState<Row | null>(null);
  const [requests, setRequests] = useState<Row[]>([]);
  const [riders, setRiders] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [tab, setTab] = useState<"riders" | "availability" | "orders">("riders");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [docRider, setDocRider] = useState<{ id: string; name?: string } | null>(null);

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

  // Auto-register this partner in the pool on open — no manual "register" step.
  useEffect(() => {
    if (!rid) return;
    const coords = (userData as any)?.geo_location?.coordinates;
    const pickup =
      Array.isArray(coords) && coords.length === 2 ? { lat: coords[1], lng: coords[0] } : undefined;
    poolSyncConfig(rid, {
      name: (userData as any)?.store_name,
      pool_enabled: true,
      pickup,
      banner_url: (userData as any)?.store_banner,
      address: (userData as any)?.address,
    }).then(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  if (!rid) return <div className="text-muted-foreground">Loading…</div>;

  const pickup = config?.pickup;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Setup / sync */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Delivery Pool</CardTitle>
          <CardDescription>
            Menuthere rider network. Orders auto-dispatch to your linked riders when you accept them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pickup ? (
            <Pill tone="green">✓ In the rider pool · pickup {pickup.lat?.toFixed?.(4)}, {pickup.lng?.toFixed?.(4)}</Pill>
          ) : (
            <p className="text-sm text-amber-700">
              Set your store location (Settings → Store) so riders can find you.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pool visibility */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base">Delivery pool visibility</CardTitle>
          <CardDescription>Control what the delivery pool sees for your orders.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y pt-0">
          <ToggleRow
            on={config?.hide_order_value ?? true}
            disabled={busy}
            onChange={(v) => act(poolSyncConfig(rid, { hide_order_value: v }), "Saved")}
            label="Hide order value"
            desc="Don't show the food order total to the delivery pool."
          />
          <ToggleRow
            on={config?.show_delivery_charge ?? true}
            disabled={busy}
            onChange={(v) => act(poolSyncConfig(rid, { show_delivery_charge: v }), "Saved")}
            label="Show delivery charge"
            desc="Show the delivery charge (from your delivery settings) to riders."
          />
        </CardContent>
      </Card>

      {/* Invite rider */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add a rider</CardTitle>
          <CardDescription>
            Enter a rider&apos;s phone to invite them — they accept in the rider app and become linked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="sm:max-w-xs"
            />
            <Button
              variant="outline"
              onClick={() => phone.trim() && act(poolInvite(rid, phone.trim()).then((r) => { if (r.ok) setPhone(""); return r; }), "Invite sent")}
              disabled={busy}
            >
              Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending link requests */}
      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rider link requests ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((q) => (
              <div key={str(q.id)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-3">
                  <RiderAvatar url={q.photo_url} name={q.full_name} size={40} />
                  <div>
                    <div className="font-medium">{str(q.full_name)}</div>
                    <div className="text-xs text-muted-foreground">
                      {str(q.phone)} · {str(q.district)} · {str(q.vehicle_type)} · {str(q.completed_orders ?? 0)} done
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    onClick={() => setDocRider({ id: str(q.rider_id), name: q.full_name ? String(q.full_name) : undefined })}>Docs</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy}
                    onClick={() => act(poolApprove(rid, str(q.id)), "Approved")}>Approve</Button>
                  <Button variant="outline" size="sm" disabled={busy}
                    onClick={() => { const reason = window.prompt("Reason for rejecting?") || ""; if (reason) act(poolReject(rid, str(q.id), reason), "Rejected"); }}>Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/60 p-1">
          {([
            ["riders", `Linked riders (${riders.length})`],
            ["availability", "Availability"],
            ["orders", `Live orders (${orders.length})`],
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

        {/* Linked riders */}
        <TabsContent value="riders" className="mt-4">
          {!riders.length ? (
            <Empty>No linked riders yet — invite by phone above, or approve incoming requests.</Empty>
          ) : (
            <>
              <Card className="hidden md:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Done</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riders.map((r) => (
                      <TableRow key={str(r.rider_id)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RiderAvatar url={r.photo_url} name={r.full_name} />
                            <span className="font-medium">{str(r.full_name)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{str(r.phone)}</TableCell>
                        <TableCell>
                          {r.disabled ? <Pill tone="red">Disabled</Pill> : <Pill tone={availTone(r.availability)}>{str(r.availability ?? "offline")}</Pill>}
                        </TableCell>
                        <TableCell>{str(r.completed_orders ?? 0)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" className="mr-1"
                            onClick={() => setDocRider({ id: str(r.rider_id), name: r.full_name ? String(r.full_name) : undefined })}>Docs</Button>
                          <Button variant="ghost" size="sm" className="mr-1" disabled={busy}
                            onClick={() => act(poolDisableRider(rid, str(r.rider_id), !r.disabled), r.disabled ? "Enabled" : "Disabled")}>{r.disabled ? "Enable" : "Disable"}</Button>
                          <Button variant="ghost" size="sm" className="text-red-600" disabled={busy}
                            onClick={() => { if (window.confirm("Remove this rider?")) act(poolRemoveRider(rid, str(r.rider_id)), "Removed"); }}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <div className="md:hidden space-y-3">
                {riders.map((r) => (
                  <Card key={str(r.rider_id)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <RiderAvatar url={r.photo_url} name={r.full_name} />
                          <div className="leading-tight">
                            <div className="font-medium">{str(r.full_name)}</div>
                            <div className="text-xs text-muted-foreground">{str(r.phone)} · {str(r.completed_orders ?? 0)} done</div>
                          </div>
                        </div>
                        {r.disabled ? <Pill tone="red">Disabled</Pill> : <Pill tone={availTone(r.availability)}>{str(r.availability ?? "offline")}</Pill>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="flex-1"
                          onClick={() => setDocRider({ id: str(r.rider_id), name: r.full_name ? String(r.full_name) : undefined })}>Docs</Button>
                        <Button variant="outline" size="sm" disabled={busy}
                          onClick={() => act(poolDisableRider(rid, str(r.rider_id), !r.disabled), r.disabled ? "Enabled" : "Disabled")}>{r.disabled ? "Enable" : "Disable"}</Button>
                        <Button variant="outline" size="sm" className="text-red-600" disabled={busy}
                          onClick={() => { if (window.confirm("Remove this rider?")) act(poolRemoveRider(rid, str(r.rider_id)), "Removed"); }}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Availability */}
        <TabsContent value="availability" className="mt-4">
          <RiderAvailabilityMap
            riders={riders}
            center={pickup ? [Number(pickup.lng), Number(pickup.lat)] : undefined}
          />
        </TabsContent>

        {/* Live orders */}
        <TabsContent value="orders" className="mt-4">
          {!orders.length ? (
            <Empty>No active pool orders.</Empty>
          ) : (
            <>
              <Card className="hidden md:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rider</TableHead>
                      <TableHead>Drop</TableHead>
                      <TableHead>Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((od) => (
                      <TableRow key={str(od.id)}>
                        <TableCell className="font-mono text-xs">{str(od.source_order_id ?? od.id).slice(0, 12)}</TableCell>
                        <TableCell><Pill tone="green">{str(od.status)}</Pill></TableCell>
                        <TableCell>{str(od.rider_name)}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">{str(od.drop_address)}</TableCell>
                        <TableCell>{od.delivery_fee != null ? `₹${str(od.delivery_fee)}` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <div className="md:hidden space-y-3">
                {orders.map((od) => (
                  <Card key={str(od.id)}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs">{str(od.source_order_id ?? od.id).slice(0, 12)}</span>
                        <Pill tone="green">{str(od.status)}</Pill>
                      </div>
                      <div className="text-sm text-muted-foreground">{str(od.drop_address)}</div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{str(od.rider_name)}</span>
                        <span className="font-semibold">{od.delivery_fee != null ? `₹${str(od.delivery_fee)}` : "—"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">Auto-refreshes every 6s.</p>

      <RiderDocsModal
        open={!!docRider}
        onClose={() => setDocRider(null)}
        riderId={docRider?.id ?? null}
        riderName={docRider?.name}
        fetchDocs={async (id) => {
          const r = await poolRiderDocs(rid, id);
          const j = r.ok ? r.data : null;
          return { docs: j?.data ?? [], fullName: j?.full_name, kyc: j?.kyc_status };
        }}
      />
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
