import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bike, XCircle } from "lucide-react";

// Mapbox-based live tracker reused from the customer order page. Lazy-loaded
// (ssr: false) because mapbox-gl needs window/document.
const DeliveryMap = dynamic(
    () => import("@/app/order/[id]/DeliveryMap"),
    { ssr: false },
);
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Order } from "@/store/orderStore";
import { Partner, useAuthStore } from "@/store/authStore";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import useOrderStore from "@/store/orderStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { toast } from "sonner";
import { Printer, Edit, MapPin, Phone, MessageCircle } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentMethodChooseV2 } from "./PaymentMethodChooseV2";
import { PasswordProtectionModal } from "./PasswordProtectionModal";
import { CancelOrderDialog } from "@/components/CancelOrderDialog";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getFeatures } from "@/lib/getFeatures";

const PorterTrackingPanel = dynamic(
  () => import("@/components/PorterTrackingPanel"),
  { ssr: false },
);

const DispatchProgressPanel = dynamic(
  () => import("@/components/admin-v2/DispatchProgressPanel"),
  { ssr: false },
);

const DeliveryRiderPanel = dynamic(
  () => import("@/components/DeliveryRiderPanel"),
  { ssr: false },
);


import { getExtraCharge } from "@/lib/getExtraCharge";
import { DeliveryBoyAssignment } from "./DeliveryBoyAssignment";
import { checkAllProvidersAvailability } from "@/app/actions/deliveryAgent";

interface OrderDetailsProps {
    order: Order | null;
    onBack: () => void;
    onEdit?: () => void;
}

/**
 * Small sub-panel that probes every registered 3PL provider for this
 * order's pickup→drop pair and shows the count of available partners.
 * Mounts only when the order is in `pending` or `accepted` (the window
 * where the partner can still decide how to dispatch). Cached on the hub
 * (60 s per rounded coord pair), so re-mounts are cheap.
 */
function ProviderAvailabilityPanel({
    pickup,
    drop,
    status,
}: {
    pickup: { lat: number; lng: number } | null;
    drop: { lat: number; lng: number } | null;
    status: string | undefined;
}) {
    const eligible = status === "pending" || status === "accepted";

    const [data, setData] = useState<{
        totalProviders: number;
        availableCount: number;
        providers: Array<{
            provider: string;
            displayName: string;
            available: boolean;
            etaToPickupMin?: number;
            distanceKm?: number;
            estimatedPrice?: number;
            reason?: string;
        }>;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!eligible || !pickup || !drop) {
            setData(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        (async () => {
            const res = await checkAllProvidersAvailability({
                pickup,
                drop,
                paymentMethod: "online",
            });
            if (cancelled) return;
            setLoading(false);
            if (res.ok) setData(res.data as any);
            else setData(null);
        })();
        return () => {
            cancelled = true;
        };
    }, [eligible, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

    if (!eligible) return null;
    if (!pickup || !drop) return null;
    if (loading && !data) {
        return (
            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                Checking 3PL serviceability…
            </div>
        );
    }
    if (!data) return null;

    const tone =
        data.availableCount === 0
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50";
    return (
        <div className={`rounded-md border p-3 ${tone}`}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                    {data.availableCount} of {data.totalProviders} delivery partner
                    {data.totalProviders === 1 ? "" : "s"} can serve this address
                </p>
            </div>
            {data.providers.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                    {data.providers.map((p) => (
                        <li
                            key={p.provider}
                            className="flex items-center justify-between gap-2"
                        >
                            <span className="capitalize">
                                {p.displayName || p.provider}
                            </span>
                            {p.available ? (
                                <span className="font-medium text-emerald-700">
                                    available
                                    {p.estimatedPrice !== undefined
                                        ? ` · ₹${p.estimatedPrice.toFixed(0)}`
                                        : ""}
                                    {p.distanceKm !== undefined
                                        ? ` · ${p.distanceKm.toFixed(1)} km`
                                        : ""}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">
                                    {p.reason === "DISTANCE_TOO_LONG"
                                        ? "too far"
                                        : p.reason === "ERROR"
                                            ? "error"
                                            : "unserviceable"}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function OrderDetails({ order, onBack, onEdit }: OrderDetailsProps) {
    const { userData } = useAuthStore();
    const { updateOrderStatus, updateOrderPaymentMethod } = useOrderStore();
    const { setOrders, orders } = useOrderSubscriptionStore();
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = React.useState(false);
    const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);
    const [cancelOpen, setCancelOpen] = React.useState(false);

    if (!order) return null;

    const handleUpdateOrderStatus = async (status: string) => {
        if (status === "cancelled") {
            if (order.status !== "pending") {
                toast.error(
                    `Only pending orders can be cancelled (current status: ${order.status})`,
                );
                return;
            }
            setCancelOpen(true);
            return;
        }
        if (order.status === "completed") {
            setPendingAction(() => async () => {
                try {
                    await updateOrderStatus(orders, order.id, status as any, setOrders);
                    toast.success("Order status updated");
                } catch (error) {
                    toast.error("Failed to update status");
                }
            });
            setPasswordModalOpen(true);
            return;
        }

        try {
            await updateOrderStatus(orders, order.id, status as any, setOrders);
            toast.success("Order status updated");


        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handlePrint = async (type: 'bill' | 'kot') => {
        if (type === 'bill') {
            if (order.status === 'accepted') {
                try {
                    await updateOrderStatus(orders, order.id, 'completed', setOrders);
                    toast.success("Order marked as completed");

                } catch (error) {
                    console.error("Error updating order status on print:", error);
                }
            }

            if (!order.payment_method) {
                setPaymentModalOpen(true);
            } else {
                window.open(`/bill/${order.id}`, '_blank');
            }
        } else {
            window.open(`/kot/${order.id}`, '_blank');
        }
    };

    const handlePaymentMethodConfirm = async (method: string) => {
        await updateOrderPaymentMethod(order.id, method, orders, setOrders);
        setPaymentModalOpen(false);

        // Also perform completion logic if it wasn't already accepted/completed
        if (order.status === 'accepted') {
            try {
                await updateOrderStatus(orders, order.id, 'completed', setOrders);

            } catch (e) { console.error(e); }
        }

        window.open(`/bill/${order.id}`, '_blank');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "accepted": return "bg-blue-100 text-blue-800";
            case "food_ready": return "bg-orange-100 text-orange-800";
            case "dispatched": return "bg-purple-100 text-purple-900";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    // Calculate totals
    const currency = (userData as Partner)?.currency || "₹";
    const gstPercentage = (userData as Partner)?.gst_percentage || 0;

    const foodSubtotal = order.items.reduce((sum, item) => sum + ((item as any).is_freebie ? 0 : item.price * item.quantity), 0);

    const chargesSubtotal = (order.extraCharges || []).reduce((sum, charge) => {
        return sum + getExtraCharge(
            order.items,
            charge.amount,
            charge.charge_type as any
        );
    }, 0);

    const subtotal = foodSubtotal + chargesSubtotal;

    const gstAmount = order.gstIncluded ?? (foodSubtotal * gstPercentage) / 100;

    const discounts = order.discounts || [];
    const discountAmount = discounts.reduce((total, discount) => {
        const disc = discount as any;
        if (disc.type === "flat") {
            return total + (disc.value || 0);
        } else if (disc.type === "percentage") {
            return total + (subtotal * (disc.value || 0)) / 100;
        }
        return total;
    }, 0);

    const grandTotal = order.totalPrice;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold">Order #{order.display_id}</h2>
                            <Badge className={getStatusColor(order.status)}>
                                {order.status.toUpperCase()}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            {format(new Date(order.createdAt), "PPP p")}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">ID: #{order.id.slice(0, 8)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Select
                        value={order.status}
                        onValueChange={handleUpdateOrderStatus}
                    >
                        <SelectTrigger className={`w-[130px] ${getStatusColor(order.status)} border-none shrink-0`}>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="food_ready">Food Ready</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="shrink-0">
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrint('kot')}>
                                Print KOT
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint('bill')}>
                                Print Bill
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            {order.status === "cancelled" && order.cancel_reason && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <XCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                            Cancellation reason
                            {order.cancelled_by ? ` · by ${order.cancelled_by}` : ""}
                        </p>
                        <p className="mt-1 text-sm sm:text-base text-red-900 break-words">
                            {order.cancel_reason}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold mb-3">Customer Details</h3>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Order Info:</span>
                            <div className="flex gap-2">
                                {(order.tableName || (order.tableNumber && order.tableNumber !== 0)) && (
                                    <Badge variant="outline" className="font-medium">
                                        Table: {order.tableName || order.tableNumber}
                                    </Badge>
                                )}
                                <Badge variant="secondary" className="font-medium capitalize">
                                    {(order.type === 'delivery' && !order.deliveryAddress)
                                        ? "Takeaway"
                                        : (order.type === "table_order" ? "Dine-in" : order.type)}
                                </Badge>
                            </div>
                        </div>
                        {(order.phone || order.user?.phone) && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Phone:</span>
                                <div className="flex items-center gap-3">
                                    <a
                                        href={`tel:${order.phone || order.user?.phone}`}
                                        className="font-medium flex items-center gap-1.5 text-blue-600 hover:underline"
                                    >
                                        <Phone className="h-3.5 w-3.5" />
                                        {order.phone || order.user?.phone}
                                    </a>
                                    <a
                                        href={`https://wa.me/${(() => { const p = (order.phone || order.user?.phone || "").replace(/\s+/g, ""); return /^\+/.test(p) ? p : /^\d{10}$/.test(p) ? `+91${p}` : p; })()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium flex items-center gap-1 text-green-600 hover:underline"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        WhatsApp
                                    </a>
                                </div>
                            </div>
                        )}
                        {order.deliveryAddress && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium text-right">{order.deliveryAddress}</span>
                            </div>
                        )}
                        {order.delivery_location?.coordinates && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Location:</span>
                                <a
                                    href={`https://www.google.com/maps?q=${order.delivery_location.coordinates[1]},${order.delivery_location.coordinates[0]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium flex items-center gap-1.5 text-blue-600 hover:underline"
                                >
                                    <MapPin className="h-3.5 w-3.5" />
                                    View on Google Maps
                                </a>
                            </div>
                        )}
                        {order.notes && (
                            <div className="pt-2 border-t mt-2">
                                <span className="text-muted-foreground block mb-1">Order Note:</span>
                                <p className="text-sm">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Delivery Boy Assignment — hidden when partner uses a 3PL delivery agent */}
                {order.type === "delivery" &&
                    order.status !== "completed" &&
                    order.status !== "cancelled" &&
                    !getFeatures((userData as Partner)?.feature_flags || null).delivery_agent.enabled && (
                        <DeliveryBoyAssignment order={order} />
                    )}
            </div>

            {(() => {
                // Only render the Delivery Agent card when the partner actually
                // has one of the 3PL features turned on. Just having access
                // (i.e. plan-eligible) isn't enough — Adloggs UI was showing up
                // on partners who'd never enabled it.
                const f = getFeatures((userData as Partner)?.feature_flags || null);
                return (
                    (f.growjet_delivery.access && f.growjet_delivery.enabled) ||
                    (f.delivery_agent.access && f.delivery_agent.enabled)
                );
            })() && (() => {
                const partner = userData as Partner | null;
                const agent = order.delivery_agent;
                const agentLat = agent?.location?.latitude;
                const agentLng = agent?.location?.longitude;
                const dropLng = order.delivery_location?.coordinates?.[0];
                const dropLat = order.delivery_location?.coordinates?.[1];
                const hotelGeo = partner?.geo_location;
                const hotelCoords =
                    hotelGeo && typeof hotelGeo === "object" && Array.isArray((hotelGeo as any).coordinates)
                        ? ((hotelGeo as any).coordinates as [number, number])
                        : null;
                const hotelLng = hotelCoords?.[0] ?? null;
                const hotelLat = hotelCoords?.[1] ?? null;
                const routeMode: "to_destination" | "to_hotel" =
                    order.status === "dispatched" || order.status === "in_transit"
                        ? "to_destination"
                        : "to_hotel";
                const lastUpdated = agent?.location?.lastUpdated;
                const lastUpdatedAgo = lastUpdated
                    ? Math.max(0, Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000))
                    : null;
                const formatAgo = (sec: number) =>
                    sec < 60
                        ? `${sec}s ago`
                        : sec < 3600
                            ? `${Math.floor(sec / 60)}m ago`
                            : `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m ago`;
                const canShowMap =
                    agentLat != null && agentLng != null && dropLat != null && dropLng != null
                    && order.status !== "completed" && order.status !== "cancelled";

                return (
                    <div className="border rounded-lg bg-card p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h3 className="font-semibold">Delivery Agent</h3>
                            <div className="flex items-center gap-2">
                                {order.delivery_provider === "adloggs" && order.delivery_provider_order_id && (
                                    <Badge className="bg-blue-100 text-blue-800 font-mono">
                                        adloggs · {order.delivery_provider_state ?? "—"}
                                    </Badge>
                                )}
                                {order.growjet_order_number ? (
                                    <Badge className="bg-green-100 text-green-800 font-mono">
                                        ✓ {order.growjet_order_number}
                                    </Badge>
                                ) : !order.delivery_provider_order_id ? (
                                    <Badge variant="outline" className="text-muted-foreground font-mono">
                                        Nil
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                        {(() => {
                            const f = getFeatures((userData as Partner)?.feature_flags || null).delivery_agent;
                            return f.access && f.enabled;
                        })() && (
                            <ProviderAvailabilityPanel
                                pickup={
                                    hotelLat != null && hotelLng != null
                                        ? { lat: hotelLat, lng: hotelLng }
                                        : null
                                }
                                drop={
                                    dropLat != null && dropLng != null
                                        ? { lat: dropLat, lng: dropLng }
                                        : null
                                }
                                status={order.status}
                            />
                        )}
                        {order.delivery_provider === "adloggs" && order.delivery_provider_meta?.trackUrl && (
                            <a
                                href={order.delivery_provider_meta.trackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline"
                            >
                                Open Adloggs tracking page →
                            </a>
                        )}
                        {order.delivery_provider === "adloggs" &&
                            order.status !== "completed" &&
                            order.status !== "cancelled" &&
                            (() => {
                                const otps = (order.delivery_provider_meta as any)?.otps;
                                const pickup = otps?.pickup_otp;
                                const drop = otps?.delivery_otp;
                                if (!pickup && !drop) return null;
                                return (
                                    <div className="grid grid-cols-2 gap-2">
                                        {pickup && (
                                            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                                    Pickup OTP
                                                </p>
                                                <p className="mt-0.5 font-mono font-bold tracking-[0.2em] text-blue-900">
                                                    {pickup}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-blue-700/80">
                                                    Tell the rider when they arrive
                                                </p>
                                            </div>
                                        )}
                                        {drop && (
                                            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                                                    Delivery OTP
                                                </p>
                                                <p className="mt-0.5 font-mono font-bold tracking-[0.2em] text-orange-900">
                                                    {drop}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-orange-700/80">
                                                    Customer reads this at drop-off
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        {agent ? (
                            <>
                                <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                                        <Bike className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {agent.name || "Rider being assigned"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(() => {
                                                const lsp = (order.delivery_provider_meta as any)?.rider_platform?.name;
                                                const provider = agent.provider || order.delivery_provider;
                                                if (lsp && provider) return `${lsp} · via ${provider}`;
                                                if (lsp) return lsp;
                                                if (provider) return `${provider} delivery partner`;
                                                return "Delivery partner";
                                            })()}
                                        </p>
                                    </div>
                                    {agent.phone && (
                                        <a
                                            href={`tel:${agent.phone}`}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                                        >
                                            <Phone className="h-3.5 w-3.5" />
                                            {agent.phone}
                                        </a>
                                    )}
                                </div>

                                {canShowMap ? (
                                    <div className="relative h-64 overflow-hidden rounded-md border">
                                        <DeliveryMap
                                            deliveryLng={dropLng!}
                                            deliveryLat={dropLat!}
                                            driverLng={agentLng}
                                            driverLat={agentLat}
                                            hotelLng={hotelLng}
                                            hotelLat={hotelLat}
                                            hotelBanner={partner?.store_banner ?? null}
                                            hotelName={partner?.store_name ?? null}
                                            routeMode={routeMode}
                                            radiusKm={partner?.delivery_rules?.delivery_radius ?? null}
                                            onMapClick={() => {
                                                const destLat = routeMode === "to_hotel" && hotelLat != null
                                                    ? hotelLat
                                                    : dropLat;
                                                const destLng = routeMode === "to_hotel" && hotelLng != null
                                                    ? hotelLng
                                                    : dropLng;
                                                const url = `https://www.google.com/maps/dir/${agentLat},${agentLng}/${destLat},${destLng}`;
                                                window.open(url, "_blank");
                                            }}
                                        />
                                        {lastUpdatedAgo != null && (
                                            <div className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] shadow">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                                                </span>
                                                <span className="font-medium text-gray-800">
                                                    Live · {formatAgo(lastUpdatedAgo)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Rider details will appear once the delivery partner assigns one.
                            </p>
                        )}
                    </div>
                );
            })()}

            {/* Delivery-bridge multi-provider dispatch progress — which provider
                is being checked now + each provider's outcome (cancelled/live).
                Shows for any order dispatched through the bridge (has a dispatchId). */}
            {(order.delivery_provider_meta as { dispatchId?: string } | null)?.dispatchId && (
                <DispatchProgressPanel orderId={order.id} />
            )}

            {/* Assigned rider (provider-agnostic): name, phone, vehicle, track —
                shown once any provider's rider is assigned via the dispatch. */}
            {(order.delivery_provider_meta as { dispatchId?: string } | null)?.dispatchId && order.id && (
                <DeliveryRiderPanel orderId={order.id} />
            )}

            {/* Legacy Porter tracking (pre-dispatch orders without a dispatchId).
                Dispatch orders use DeliveryRiderPanel above instead. */}
            {order.delivery_provider === "porter" &&
                !(order.delivery_provider_meta as { dispatchId?: string } | null)?.dispatchId && (
                <PorterTrackingPanel
                    orderId={order.id}
                    provider={order.delivery_provider}
                    crn={order.delivery_provider_order_id}
                    state={order.delivery_provider_state}
                    meta={order.delivery_provider_meta as any}
                    showCancel
                />
            )}

            {(order.payment_method || order.is_paid) && (
                <div className="border rounded-lg bg-card p-4">
                    <h3 className="font-semibold mb-3">Payment Details</h3>
                    <div className="text-sm space-y-2">
                        {order.payment_method && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Method:</span>
                                <span className="font-medium capitalize">{order.payment_method}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            {order.is_paid ? (
                                <span className="font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full text-xs">Payment Complete</span>
                            ) : (
                                <span className="font-medium text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full text-xs">Pending</span>
                            )}
                        </div>
                        {order.cashfree_payment_id && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cashfree ID:</span>
                                <span className="font-medium font-mono text-xs">{order.cashfree_payment_id}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b">
                    <h3 className="font-semibold">Order Items</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {order.items.map((item, index) => {
                            const isFreebie = (item as any).is_freebie;
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">
                                        {item.name}
                                        {isFreebie && <span className="text-xs font-bold ml-1 opacity-60">(FREE)</span>}
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{currency}{isFreebie ? 0 : item.price}</TableCell>
                                    <TableCell className="text-right">{currency}{isFreebie ? 0 : item.price * item.quantity}</TableCell>
                                </TableRow>
                            );
                        })}

                        

                        {/* Extra Charges */}
                        {(order.extraCharges || []).map((charge, index) => (
                            <TableRow key={`charge-${index}`} className="bg-muted/50 font-medium text-muted-foreground">
                                <TableCell colSpan={3} className="text-right text-sm">
                                    {charge.name}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                    {currency}
                                    {getExtraCharge(
                                        order.items,
                                        charge.amount,
                                        charge.charge_type as any
                                    ).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Subtotal */}
                        <TableRow className="bg-muted/50 font-medium border-t-2">
                            <TableCell colSpan={3} className="text-right">
                                Subtotal
                            </TableCell>
                            <TableCell className="text-right">
                                {currency}{subtotal.toFixed(2)}
                            </TableCell>
                        </TableRow>

                        {/* Discounts */}
                        {discounts.map((discount, index) => {
                            const disc = discount as any;
                            const discountValue = disc.type === "freebie"
                                ? (disc.savings || disc.value || 0)
                                : disc.type === "flat"
                                ? disc.value
                                : (subtotal * disc.value) / 100;
                            const discountLabel = disc.type === "freebie"
                                ? `Freebie Discount${disc.freebie_item_names ? ` (${disc.freebie_item_names})` : ""}`
                                : disc.type === "percentage"
                                ? `${disc.value}% Off`
                                : "Flat Discount";
                            return (
                                <TableRow key={`discount-${index}`} className="bg-muted/50 font-medium text-green-600">
                                    <TableCell colSpan={3} className="text-right text-sm">
                                        {discountLabel}
                                        {disc.reason && ` (${disc.reason})`}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-green-600">
                                        - {currency}{discountValue.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}


                        {/* GST/VAT */}
                        {gstAmount > 0 && (
                            <TableRow className="bg-muted/50 font-medium">
                                <TableCell colSpan={3} className="text-right">
                                    {(userData as Partner)?.country === "United Arab Emirates" ? "VAT" : "GST"} ({gstPercentage}%)
                                </TableCell>
                                <TableCell className="text-right">
                                    {currency}{gstAmount.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Total Amount */}
                        <TableRow className="bg-muted/50 font-bold text-lg border-t-2">
                            <TableCell colSpan={3} className="text-right">Total Amount</TableCell>
                            <TableCell className="text-right">
                                {currency}{grandTotal.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <PaymentMethodChooseV2
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={handlePaymentMethodConfirm}
            />

            <PasswordProtectionModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
                onSuccess={() => pendingAction?.()}
                actionDescription="edit this completed order"
            />

            <CancelOrderDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                orderId={order.id}
                orderShortId={order.display_id || order.id.slice(0, 8)}
                isPetpooja={!!(userData as Partner)?.petpooja_restaurant_id}
            />
        </div >
    );
}
