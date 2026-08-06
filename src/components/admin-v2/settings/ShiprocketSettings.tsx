"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Loader2,
    Package,
    PlugZap,
    Truck,
} from "lucide-react";
import {
    getShiprocketStatus,
    saveShiprocketCredentials,
    testShiprocketConnection,
    type ShiprocketStatus,
} from "@/app/actions/shiprocketPartner";
import {
    DEFAULT_SHIPROCKET_CONFIG,
    type ShiprocketConfig,
    type ShiprocketPickupLocation,
} from "@/lib/shiprocket/types";

/**
 * Settings → Integrations → Shiprocket.
 *
 * Self-saving (its own Save button) rather than registering with the floating
 * save action, for two reasons: the password field means "blank = keep what is
 * stored", which does not survive the shared store's "changed on mount" idiom;
 * and saving is followed by a slow call out to Shiprocket that needs its own
 * spinner.
 *
 * The stored password is NEVER sent back here, not even masked.
 */
export function ShiprocketSettings() {
    const { userData } = useAuthStore();
    const partnerId = (userData as any)?.id as string | undefined;

    const [status, setStatus] = useState<ShiprocketStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const [apiEmail, setApiEmail] = useState("");
    const [password, setPassword] = useState("");
    const [cfg, setCfg] = useState<ShiprocketConfig>(DEFAULT_SHIPROCKET_CONFIG);
    const [pickupLocations, setPickupLocations] = useState<ShiprocketPickupLocation[]>([]);
    const [wallet, setWallet] = useState<number | null>(null);

    /**
     * `resetForm` decides whether the editable fields are overwritten from the DB.
     *
     * It is false after a connection test on purpose. Testing is something a
     * partner does mid-edit — pick a mode, press Test, then choose a pickup
     * location — and reloading the saved row there would silently throw away
     * everything they had typed but not yet saved.
     */
    const load = useCallback(
        async (resetForm = true) => {
            if (!partnerId) return;
            try {
                const s = await getShiprocketStatus(partnerId);
                setStatus(s);
                if (resetForm) {
                    setApiEmail(s.apiEmail ?? "");
                    setCfg(s.config);
                }
            } catch (e) {
                console.error("[shiprocket] status load failed", e);
                toast.error("Could not load your Shiprocket settings");
            } finally {
                setLoading(false);
            }
        },
        [partnerId],
    );

    useEffect(() => {
        load();
    }, [load]);

    const patch = (p: Partial<ShiprocketConfig>) => setCfg((prev) => ({ ...prev, ...p }));
    const patchPackage = (p: Partial<ShiprocketConfig["package"]>) =>
        setCfg((prev) => ({ ...prev, package: { ...prev.package, ...p } }));

    const handleSave = async () => {
        if (!partnerId) return;
        if (!apiEmail.trim()) {
            toast.error("Enter the Shiprocket API user email");
            return;
        }
        setSaving(true);
        try {
            const res = await saveShiprocketCredentials(partnerId, {
                apiEmail: apiEmail.trim(),
                password: password.trim() || undefined,
                config: cfg,
            });
            if (!res.ok) {
                toast.error(res.error || "Could not save");
                return;
            }
            // Clear the field so the next save doesn't look like it's re-sending
            // a password that was never displayed.
            setPassword("");
            toast.success("Shiprocket settings saved");
            await load();
        } catch (e) {
            toast.error((e as Error).message || "Could not save");
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!partnerId) return;
        setTesting(true);
        try {
            const res = await testShiprocketConnection(partnerId);
            if (!res.ok) {
                toast.error(res.message || "Shiprocket rejected these credentials");
                await load(false);
                return;
            }
            // Only replace the list when the read actually succeeded — an
            // undefined list means Shiprocket refused that call, and blanking a
            // working dropdown would strand a partner mid-edit.
            if (res.pickupLocations) setPickupLocations(res.pickupLocations);
            setWallet(res.walletBalance ?? null);
            if (res.message) toast.warning(res.message);
            else toast.success("Connected to Shiprocket");
            await load(false);
        } catch (e) {
            toast.error((e as Error).message || "Connection test failed");
        } finally {
            setTesting(false);
        }
    };

    if (!userData) return null;

    const isParcel = cfg.mode === "parcel";
    const blocked = !status?.masterKeyConfigured;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-orange-600" />
                        Shiprocket
                    </CardTitle>
                    <CardDescription>
                        Ship orders through your own Shiprocket account. Shipping charges are
                        billed to your Shiprocket wallet, not through Menuthere.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading your Shiprocket settings…
                        </div>
                    ) : (
                        <>
                            {/* ── Connection status ─────────────────────────── */}
                            {blocked ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>
                                        Secure credential storage isn&apos;t configured on this server, so
                                        Shiprocket credentials can&apos;t be saved yet. Please contact support.
                                    </span>
                                </div>
                            ) : status?.verified && !status.lastError ? (
                                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>
                                        Connected
                                        {status.lastVerifiedAt
                                            ? ` — last checked ${new Date(status.lastVerifiedAt).toLocaleString()}`
                                            : ""}
                                        {cfg.pickup_location ? ` · picking up from “${cfg.pickup_location}”` : ""}
                                        {wallet != null ? ` · wallet ₹${wallet}` : ""}
                                    </span>
                                </div>
                            ) : status?.lastError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex gap-2">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>Connection failed — {status.lastError}</span>
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                                    Not connected yet. Add your API user below, save, then press{" "}
                                    <span className="font-medium">Test connection</span>.
                                </div>
                            )}

                            {status?.configured && status.verified && !status.featureEnabled && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    Shiprocket is set up but switched <span className="font-semibold">off</span>.
                                    Turn it on under <span className="font-semibold">Settings → Features</span> to
                                    start shipping.
                                </div>
                            )}

                            {/* ── How to get the credentials ────────────────── */}
                            <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-orange-900 space-y-1.5">
                                <div className="font-semibold">Create an API user in Shiprocket first</div>
                                <p>
                                    In Shiprocket go to <span className="font-medium">Settings → API → Add New
                                    API User</span>. Use an email that is{" "}
                                    <span className="font-semibold">different from your Shiprocket login email</span>{" "}
                                    — Shiprocket rejects the same one. The password is shown only once, so copy it
                                    before closing the dialog.
                                </p>
                                <a
                                    href="https://app.shiprocket.in/api-user"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                                >
                                    Open Shiprocket API settings <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            {/* ── Credentials ───────────────────────────────── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="sr_email">Shiprocket API user email</Label>
                                    <Input
                                        id="sr_email"
                                        type="email"
                                        autoComplete="off"
                                        value={apiEmail}
                                        onChange={(e) => setApiEmail(e.target.value)}
                                        placeholder="api-user@yourstore.com"
                                        disabled={blocked}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="sr_password">Shiprocket API user password</Label>
                                    <Input
                                        id="sr_password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={
                                            status?.configured
                                                ? "•••••• (leave blank to keep the saved password)"
                                                : "Paste the password Shiprocket showed you"
                                        }
                                        disabled={blocked}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Stored encrypted. We never show it again.
                                    </p>
                                </div>
                            </div>

                            {/* ── Shipping mode ─────────────────────────────── */}
                            <div className="space-y-1.5">
                                <Label>Shipping mode</Label>
                                <Select
                                    value={cfg.mode}
                                    onValueChange={(v) => patch({ mode: v as ShiprocketConfig["mode"] })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="parcel">
                                            Parcel courier — packed goods, anywhere in India
                                        </SelectItem>
                                        <SelectItem value="hyperlocal">
                                            Shiprocket Quick — same-city rider
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {isParcel
                                        ? "Rates are quoted from the delivery PIN code and the package size below."
                                        : "Rates are quoted from the pickup and delivery map pins. Package size is ignored, but the customer's address must have a map location."}
                                </p>
                            </div>

                            {/* ── Pickup location ───────────────────────────── */}
                            <div className="space-y-1.5">
                                <Label>Pickup location</Label>
                                {pickupLocations.length > 0 ? (
                                    <Select
                                        value={cfg.pickup_location || undefined}
                                        onValueChange={(v) => patch({ pickup_location: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a pickup location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pickupLocations.map((l) => (
                                                <SelectItem key={l.nickname} value={l.nickname}>
                                                    {l.nickname}
                                                    {l.city ? ` — ${l.city}` : ""}
                                                    {l.phoneVerified ? "" : " (phone not verified)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                                        {cfg.pickup_location ? (
                                            <>
                                                Currently <span className="font-medium text-foreground">
                                                    {cfg.pickup_location}
                                                </span>
                                                . Press Test connection to pick a different one.
                                            </>
                                        ) : (
                                            "Press Test connection to load the pickup locations from your Shiprocket account."
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    This must be a pickup location that already exists in Shiprocket — the name has
                                    to match theirs exactly, which is why it&apos;s chosen from a list rather than
                                    typed.
                                </p>
                            </div>

                            {/* ── Package defaults (parcel only) ────────────── */}
                            {isParcel && (
                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Package className="h-4 w-4 text-orange-600" />
                                        Default package size
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Shiprocket needs a size and weight on every parcel to quote a courier.
                                        These values are used for every order, so set them to your usual box.
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {([
                                            ["length", "Length (cm)"],
                                            ["breadth", "Breadth (cm)"],
                                            ["height", "Height (cm)"],
                                        ] as const).map(([key, label]) => (
                                            <div key={key} className="space-y-1.5">
                                                <Label htmlFor={`pkg_${key}`} className="text-xs">
                                                    {label}
                                                </Label>
                                                <Input
                                                    id={`pkg_${key}`}
                                                    type="number"
                                                    inputMode="decimal"
                                                    min={0.6}
                                                    step="0.5"
                                                    value={cfg.package[key]}
                                                    onChange={(e) =>
                                                        patchPackage({ [key]: parseFloat(e.target.value) || 0 } as any)
                                                    }
                                                />
                                            </div>
                                        ))}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="pkg_weight" className="text-xs">
                                                Weight (kg)
                                            </Label>
                                            <Input
                                                id="pkg_weight"
                                                type="number"
                                                inputMode="decimal"
                                                min={0.01}
                                                step="0.1"
                                                value={cfg.package.weight}
                                                onChange={(e) =>
                                                    patchPackage({ weight: parseFloat(e.target.value) || 0 })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Dispatch behaviour ────────────────────────── */}
                            <div className="space-y-3 rounded-lg border p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-0.5 pr-3">
                                        <Label className="text-sm">Ship automatically</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Book the shipment the moment an order reaches the status below. Off
                                            means you press <span className="font-medium">Ship with Shiprocket</span>{" "}
                                            on each order yourself.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={cfg.auto_dispatch}
                                        onCheckedChange={(v) => patch({ auto_dispatch: v })}
                                    />
                                </div>

                                {cfg.auto_dispatch && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Ship when the order is</Label>
                                        <Select
                                            value={cfg.dispatch_trigger}
                                            onValueChange={(v) =>
                                                patch({ dispatch_trigger: v as ShiprocketConfig["dispatch_trigger"] })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="accepted">Accepted</SelectItem>
                                                <SelectItem value="food_ready">Ready</SelectItem>
                                                <SelectItem value="dispatched">Dispatched</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <div className="space-y-0.5 pr-3">
                                        <Label className="text-sm">Schedule the pickup too</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Ask the courier to collect as soon as the AWB is assigned. Off means you
                                            schedule pickups in the Shiprocket panel.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={cfg.request_pickup}
                                        onCheckedChange={(v) => patch({ request_pickup: v })}
                                    />
                                </div>
                            </div>

                            {/* ── Actions ───────────────────────────────────── */}
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || blocked}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save settings
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleTest}
                                    disabled={testing || blocked || !status?.configured}
                                >
                                    {testing ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <PlugZap className="h-4 w-4 mr-2" />
                                    )}
                                    Test connection
                                </Button>
                                {!status?.configured && (
                                    <span className="text-xs text-muted-foreground">
                                        Save your API user before testing.
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
