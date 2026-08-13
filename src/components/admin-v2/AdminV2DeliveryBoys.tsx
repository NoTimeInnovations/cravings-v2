"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
    EMPTY_STATS,
    periodStart,
    statsByRider,
    totalStats,
    type Period,
    type RiderStats,
    type Scope,
    type StatsOrder,
} from "@/lib/deliveryBoyStats";
import {
    getDeliveryBoyStatsOrdersQuery,
    getDeliveryBoysQuery,
    createDeliveryBoyMutation,
    deleteDeliveryBoyMutation,
    updateDeliveryBoyMutation,
} from "@/api/deliveryBoys";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Plus, Trash2, Truck, ArrowLeft, Pencil } from "lucide-react";
import { getFeatures } from "@/lib/getFeatures";
import { Switch } from "@/components/ui/switch";
import DeliveryAppDownloads from "@/components/admin-v2/DeliveryAppDownloads";

interface DeliveryBoy {
    id: string;
    name: string;
    phone: string;
    is_active: boolean;
    is_online: boolean;
    partner_id: string;
}

export function AdminV2DeliveryBoys() {
    const { userData } = useAuthStore();
    const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
    // Per-rider performance. Kept separate from the roster so editing a rider
    // never refetches orders, and a stats failure never blanks the list.
    const [period, setPeriod] = useState<Period>("day");
    // Defaults to delivered-only: the safer reading when a number might justify
    // a rider's pay. "all" additionally counts orders still out for delivery.
    const [scope, setScope] = useState<Scope>("completed");
    const [statsOrders, setStatsOrders] = useState<StatsOrder[]>([]);
    const [partnerGeo, setPartnerGeo] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isAddingDeliveryBoy, setIsAddingDeliveryBoy] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const features = userData?.role === "partner" ? getFeatures(userData.feature_flags || "") : null;
    const isDeliveryEnabled = features?.delivery?.enabled;

    useEffect(() => {
        if (userData?.role === "partner" && isDeliveryEnabled) {
            fetchDeliveryBoys();
            // Live online/offline status: poll every 5s (the codebase's
            // realtime pattern — there's no websocket client). Silent so the
            // table doesn't flicker or spam errors.
            const interval = setInterval(() => fetchDeliveryBoys(true), 5000);
            return () => clearInterval(interval);
        } else {
            setIsLoading(false);
        }
    }, [userData, isDeliveryEnabled]);

    // Orders are read for the LONGEST window on screen (30 days) and the shorter
    // periods are sliced from that in memory, so flipping Today/Week/Month is
    // instant and costs no extra request. Deliberately NOT on the 5s roster
    // poll — a month of orders every five seconds would be wasteful.
    useEffect(() => {
        if (!userData?.id || !isDeliveryEnabled) {
            setStatsLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetchFromHasura(getDeliveryBoyStatsOrdersQuery, {
                    partner_id: userData.id,
                    from: periodStart("month").toISOString(),
                });
                if (cancelled) return;
                setStatsOrders(res?.orders ?? []);
                setPartnerGeo(res?.partners_by_pk?.geo_location ?? null);
            } catch (error) {
                // Non-fatal: the roster still renders, the stats columns just
                // stay empty rather than taking the whole screen down.
                console.error("Error fetching delivery stats:", error);
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userData?.id, isDeliveryEnabled]);

    const riderStats = statsByRider(statsOrders, partnerGeo, period, scope);
    const overall = totalStats(riderStats);
    const currency = (n: number) =>
        `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    const fetchDeliveryBoys = async (silent = false) => {
        try {
            const response = await fetchFromHasura(getDeliveryBoysQuery, {
                partner_id: userData?.id,
            });
            if (response.delivery_boys) {
                setDeliveryBoys(response.delivery_boys);
            }
        } catch (error) {
            if (!silent) {
                console.error("Error fetching delivery boys:", error);
                toast.error("Failed to load delivery boys");
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleCreateDeliveryBoy = async () => {
        if (!name || !phone || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsCreating(true);
        try {
            // Check if phone already exists for this partner
            const checkPhone = await fetchFromHasura(`
                query CheckDeliveryBoyPhone($phone: String!, $partner_id: uuid!) {
                    delivery_boys(where: {phone: {_eq: $phone}, partner_id: {_eq: $partner_id}}) { id }
                }
            `, { phone, partner_id: userData?.id });

            if (checkPhone?.delivery_boys?.length > 0) {
                throw new Error("A delivery boy with this phone number already exists.");
            }

            await fetchFromHasura(createDeliveryBoyMutation, {
                name,
                phone,
                password,
                partner_id: userData?.id,
            });

            toast.success("Delivery boy created successfully");
            setIsAddingDeliveryBoy(false);
            setName("");
            setPhone("");
            setPassword("");
            fetchDeliveryBoys();
        } catch (error: any) {
            console.error("Error creating delivery boy:", error);
            toast.error(error.message || "Failed to create delivery boy");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteDeliveryBoy = async (id: string) => {
        if (!(await confirmDialog({
            title: "Delete this delivery boy?",
            description: "Their account will be removed and they will lose access to the delivery app. This action cannot be undone.",
            confirmText: "Delete",
            destructive: true,
        }))) return;

        setIsDeleting(id);
        try {
            await fetchFromHasura(deleteDeliveryBoyMutation, { id });
            toast.success("Delivery boy deleted successfully");
            fetchDeliveryBoys();
        } catch (error) {
            console.error("Error deleting delivery boy:", error);
            toast.error("Failed to delete delivery boy");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleToggleActive = async (boy: DeliveryBoy) => {
        try {
            await fetchFromHasura(updateDeliveryBoyMutation, {
                id: boy.id,
                name: boy.name,
                phone: boy.phone,
                is_active: !boy.is_active,
            });
            toast.success(`Delivery boy ${!boy.is_active ? "activated" : "deactivated"}`);
            fetchDeliveryBoys();
        } catch (error) {
            console.error("Error toggling delivery boy status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleEditSave = async (boy: DeliveryBoy) => {
        if (!name || !phone) {
            toast.error("Name and phone are required");
            return;
        }

        try {
            await fetchFromHasura(updateDeliveryBoyMutation, {
                id: boy.id,
                name,
                phone,
                is_active: boy.is_active,
            });

            if (password) {
                await fetchFromHasura(`
                    mutation UpdateDeliveryBoyPassword($id: uuid!, $password: String!) {
                        update_delivery_boys_by_pk(pk_columns: {id: $id}, _set: {password: $password}) { id }
                    }
                `, { id: boy.id, password });
            }

            toast.success("Delivery boy updated successfully");
            setEditingId(null);
            setName("");
            setPhone("");
            setPassword("");
            fetchDeliveryBoys();
        } catch (error) {
            console.error("Error updating delivery boy:", error);
            toast.error("Failed to update delivery boy");
        }
    };

    const startEdit = (boy: DeliveryBoy) => {
        setEditingId(boy.id);
        setName(boy.name);
        setPhone(boy.phone);
        setPassword("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setName("");
        setPhone("");
        setPassword("");
    };

    if (!isDeliveryEnabled) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <Truck className="h-16 w-16 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold">Delivery Not Enabled</h2>
                <p className="text-muted-foreground max-w-md">
                    This feature is not currently enabled for your account. Please contact support to enable delivery.
                </p>
            </div>
        );
    }

    if (isAddingDeliveryBoy) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setIsAddingDeliveryBoy(false)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Add New Delivery Boy</h1>
                        <p className="text-muted-foreground">Create a new delivery boy account.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Boy Details</CardTitle>
                        <CardDescription>Enter the details for the new delivery boy.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddingDeliveryBoy(false)}>Cancel</Button>
                            <Button onClick={handleCreateDeliveryBoy} disabled={isCreating}>
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Delivery Boy"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Delivery Boy Management</h1>
                    <p className="text-muted-foreground">Manage your delivery boys.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <DeliveryAppDownloads />
                    <Button onClick={() => setIsAddingDeliveryBoy(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Delivery Boy
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Delivery Boys</CardTitle>
                    <CardDescription>View and manage your registered delivery boys.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : deliveryBoys.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No delivery boys found. Add one to get started.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Period toggle. Slices the already-fetched 30 days,
                                so switching is instant and makes no request. */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex rounded-lg border p-0.5">
                                    {([
                                        ["day", "Today"],
                                        ["week", "Last 7 days"],
                                        ["month", "Last 30 days"],
                                    ] as [Period, string][]).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPeriod(value)}
                                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                                period === value
                                                    ? "bg-orange-500 text-white font-medium"
                                                    : "text-muted-foreground hover:bg-black/[0.04]"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="inline-flex rounded-lg border p-0.5">
                                        {([
                                            ["completed", "Delivered"],
                                            ["all", "Incl. in progress"],
                                        ] as [Scope, string][]).map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setScope(value)}
                                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                                    scope === value
                                                        ? "bg-stone-800 text-white font-medium"
                                                        : "text-muted-foreground hover:bg-black/[0.04]"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {statsLoading ? (
                                        "Loading stats…"
                                    ) : (
                                        <>
                                            <span className="font-medium text-foreground">{overall.orders}</span> orders
                                            {" · "}
                                            <span className="font-medium text-foreground">{currency(overall.value)}</span>
                                            {" · "}
                                            <span className="font-medium text-foreground">{currency(overall.deliveryCharge)}</span>{" "}delivery
                                            {" · "}
                                            <span className="font-medium text-foreground">{overall.km} km</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Orders</TableHead>
                                        <TableHead className="text-right">Order value</TableHead>
                                        <TableHead
                                            className="text-right"
                                            title="Delivery fees collected from customers on this rider's orders. Already included in Order value, not additional to it."
                                        >
                                            Delivery charge
                                        </TableHead>
                                        <TableHead
                                            className="text-right"
                                            title="Total straight-line distance from the restaurant to each customer, one way, summed over the period. Real road distance is higher."
                                        >
                                            Distance
                                            <span className="ml-1 font-normal text-muted-foreground">
                                                (straight-line)
                                            </span>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveryBoys.map((boy) => (
                                        <TableRow key={boy.id}>
                                            {editingId === boy.id ? (
                                                <>
                                                    <TableCell>
                                                        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-32" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 w-32" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (optional)" className="h-8 w-40" type="password" />
                                                    </TableCell>
                                                    {/* Placeholder for the four stats columns so the
                                                        edit row still lines up with the header. */}
                                                    <TableCell colSpan={4} />
                                                    <TableCell className="text-right space-x-1">
                                                        <Button variant="outline" size="sm" onClick={() => handleEditSave(boy)}>Save</Button>
                                                        <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`inline-block h-2 w-2 rounded-full ${boy.is_online ? "bg-green-500" : "bg-gray-400"}`}
                                                                title={boy.is_online ? "Online" : "Offline"}
                                                            />
                                                            <span>{boy.name}</span>
                                                            <span
                                                                className={`text-xs font-medium ${boy.is_online ? "text-green-600" : "text-gray-400"}`}
                                                            >
                                                                {boy.is_online ? "Online" : "Offline"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{boy.phone}</TableCell>
                                                    <TableCell>
                                                        <Switch
                                                            checked={boy.is_active}
                                                            onCheckedChange={() => handleToggleActive(boy)}
                                                        />
                                                    </TableCell>
                                                    {(() => {
                                                        const st: RiderStats = riderStats[boy.id] ?? EMPTY_STATS;
                                                        return (
                                                            <>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {statsLoading ? "—" : st.orders}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {statsLoading ? "—" : currency(st.value)}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {statsLoading ? "—" : currency(st.deliveryCharge)}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {statsLoading ? (
                                                                        "—"
                                                                    ) : st.orders === 0 ? (
                                                                        <span className="text-muted-foreground">0</span>
                                                                    ) : (
                                                                        <span
                                                                            title={
                                                                                st.ordersWithoutLocation > 0
                                                                                    ? `${st.ordersWithoutLocation} of ${st.orders} orders have no saved customer location, so they add nothing to this figure.`
                                                                                    : undefined
                                                                            }
                                                                        >
                                                                            {st.km} km
                                                                            {st.ordersWithoutLocation > 0 && (
                                                                                <span className="ml-1 text-amber-600">*</span>
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                            </>
                                                        );
                                                    })()}
                                                    <TableCell className="text-right space-x-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => startEdit(boy)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive/90"
                                                            onClick={() => handleDeleteDeliveryBoy(boy.id)}
                                                            disabled={isDeleting === boy.id}
                                                        >
                                                            {isDeleting === boy.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>

                            {/* Stated in the open, not just in a tooltip: someone
                                may pay riders on this number. */}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                <span className="font-medium">About distance:</span> this is the total
                                distance covered across all of a rider&apos;s orders in the selected
                                period, measured as a <span className="font-medium">straight line</span>{" "}
                                from the restaurant to each customer,{" "}
                                <span className="font-medium">one way</span>. Real road distance is
                                always higher — it ignores the route actually ridden and the return
                                trip — so treat this as a minimum, not a payout figure. Orders with no
                                saved customer location add nothing and are marked{" "}
                                <span className="text-amber-600">*</span>.
                                <br />
                                <span className="font-medium">Delivered</span> counts only orders that
                                actually reached the customer — use it when the figures justify pay.{" "}
                                <span className="font-medium">Incl. in progress</span> also counts orders
                                still out for delivery, so it shows current workload but can fall again
                                if one is cancelled. Cancelled orders never count in either.
                                <br />
                                <span className="font-medium">Delivery charge</span> is what customers
                                actually paid for delivery on those orders. It is already part of
                                Order value, not extra to it, and it excludes parcel and packing
                                charges. Orders placed with free delivery contribute nothing.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
