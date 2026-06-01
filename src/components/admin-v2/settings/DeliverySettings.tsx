"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore, Partner } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Loader2, Save, Plus, Trash2, Clock, Keyboard, Wallet, RefreshCw, AlertCircle } from "lucide-react";
import { DeliveryRules, DeliveryRange } from "@/store/orderStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useMenuStore } from "@/store/menuStore_hasura";
import { countryCodes } from "@/utils/countryCodes";
import { getDeliveryAgentWallet } from "@/app/actions/deliveryAgent";

function TimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);
    const [selecting, setSelecting] = useState<"hours" | "minutes">("hours");
    const [inputMode, setInputMode] = useState<"clock" | "keyboard">("clock");
    const [tempH, setTempH] = useState(12);
    const [tempM, setTempM] = useState(0);
    const [tempPeriod, setTempPeriod] = useState<"AM" | "PM">("AM");
    const [kbHour, setKbHour] = useState("");
    const [kbMin, setKbMin] = useState("");

    useEffect(() => {
        if (open) {
            const [h24, m] = (value || "00:00").split(":").map(Number);
            const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
            setTempH(h12);
            setTempM(m);
            setTempPeriod(h24 >= 12 ? "PM" : "AM");
            setSelecting("hours");
            setInputMode("clock");
            setKbHour(String(h12));
            setKbMin(String(m).padStart(2, "0"));
        }
    }, [open, value]);

    const to24 = (h12: number, period: "AM" | "PM") => {
        if (period === "AM") return h12 === 12 ? 0 : h12;
        return h12 === 12 ? 12 : h12 + 12;
    };

    const handleSet = () => {
        let finalH = tempH;
        let finalM = tempM;
        if (inputMode === "keyboard") {
            finalH = Math.min(12, Math.max(1, parseInt(kbHour) || 12));
            finalM = Math.min(59, Math.max(0, parseInt(kbMin) || 0));
        }
        const h24 = to24(finalH, tempPeriod);
        onChange(`${String(h24).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`);
        setOpen(false);
    };

    const handleClear = () => {
        onChange("00:00");
        setOpen(false);
    };

    const displayValue = (() => {
        const [h24, m] = (value || "00:00").split(":").map(Number);
        const period = h24 >= 12 ? "PM" : "AM";
        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
        return `${h12}:${String(m).padStart(2, "0")} ${period}`;
    })();

    const CLOCK_SIZE = 240;
    const CENTER = CLOCK_SIZE / 2;
    const RADIUS = 95;

    const clockNumbers = selecting === "hours"
        ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const selectedVal = selecting === "hours" ? tempH : tempM;

    const getAngle = (val: number) => {
        if (selecting === "hours") {
            return ((val % 12) * 30 - 90) * (Math.PI / 180);
        }
        return (val * 6 - 90) * (Math.PI / 180);
    };

    const handAngle = getAngle(selectedVal);
    const handX = CENTER + (RADIUS - 20) * Math.cos(handAngle);
    const handY = CENTER + (RADIUS - 20) * Math.sin(handAngle);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-background hover:bg-accent transition-colors"
            >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{displayValue}</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70" onClick={() => setOpen(false)}>
                    <div className="bg-[#2b2b2b] rounded-[28px] w-[320px] shadow-2xl z-[100000]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 pt-5 pb-4">
                            <p className="text-[#aaa] text-xs font-medium mb-4 tracking-wide">Set time</p>
                            <div className="flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => { setSelecting("hours"); setInputMode("clock"); }}
                                    className={`text-[52px] font-light leading-none transition-colors ${selecting === "hours" ? "text-white" : "text-[#666]"}`}
                                >
                                    {tempH}
                                </button>
                                <span className="text-[52px] font-light leading-none text-[#666] mx-0.5">:</span>
                                <button
                                    type="button"
                                    onClick={() => { setSelecting("minutes"); setInputMode("clock"); }}
                                    className={`text-[52px] font-light leading-none transition-colors ${selecting === "minutes" ? "text-white" : "text-[#666]"}`}
                                >
                                    {String(tempM).padStart(2, "0")}
                                </button>
                                <div className="flex flex-col ml-3 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setTempPeriod("AM")}
                                        className={`text-sm font-bold transition-colors ${tempPeriod === "AM" ? "text-white" : "text-[#666]"}`}
                                    >
                                        AM
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTempPeriod("PM")}
                                        className={`text-sm font-bold transition-colors ${tempPeriod === "PM" ? "text-white" : "text-[#666]"}`}
                                    >
                                        PM
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        {inputMode === "clock" ? (
                            <div className="px-6 pb-2 flex justify-center bg-[#2b2b2b] rounded-xl">
                                <div className="relative" style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}>
                                    <div className="absolute inset-0 rounded-full bg-[#3a3a3a]" />
                                    {/* Center dot */}
                                    <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-orange-500 -translate-x-1/2 -translate-y-1/2 z-10" />
                                    {/* Hand line */}
                                    <svg className="absolute inset-0 z-[5]" width={CLOCK_SIZE} height={CLOCK_SIZE}>
                                        <line x1={CENTER} y1={CENTER} x2={handX} y2={handY} stroke="#f97316" strokeWidth="2" />
                                    </svg>
                                    {/* Numbers */}
                                    {clockNumbers.map((num, i) => {
                                        const angle = (i * 30 - 90) * (Math.PI / 180);
                                        const x = CENTER + RADIUS * Math.cos(angle);
                                        const y = CENTER + RADIUS * Math.sin(angle);
                                        const isSelected = num === selectedVal;
                                        return (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => {
                                                    if (selecting === "hours") {
                                                        setTempH(num);
                                                        setTimeout(() => setSelecting("minutes"), 300);
                                                    } else {
                                                        setTempM(num);
                                                    }
                                                }}
                                                className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex items-center justify-center text-sm font-medium z-10 transition-colors
                                                    ${isSelected ? "bg-orange-500 text-white" : "text-[#ccc] hover:bg-[#4a4a4a]"}`}
                                                style={{ left: x, top: y }}
                                            >
                                                {selecting === "minutes" ? String(num).padStart(2, "0") : num}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 pb-4">
                                <p className="text-[#aaa] text-sm font-medium mb-3">Type in time</p>
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={kbHour}
                                            onChange={e => {
                                                const v = e.target.value.replace(/\D/g, "");
                                                setKbHour(v);
                                                const n = parseInt(v);
                                                if (n >= 1 && n <= 12) setTempH(n);
                                            }}
                                            className="w-full bg-[#3a3a3a] border-b-2 border-orange-500 text-white text-2xl font-bold text-center py-2 rounded-t-lg outline-none"
                                        />
                                        <p className="text-[#888] text-xs mt-1 text-center">hour</p>
                                    </div>
                                    <span className="text-2xl font-bold text-[#666] pb-6">:</span>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={kbMin}
                                            onChange={e => {
                                                const v = e.target.value.replace(/\D/g, "");
                                                setKbMin(v);
                                                const n = parseInt(v);
                                                if (n >= 0 && n <= 59) setTempM(n);
                                            }}
                                            className="w-full bg-[#3a3a3a] border-b-2 border-orange-500 text-white text-2xl font-bold text-center py-2 rounded-t-lg outline-none"
                                        />
                                        <p className="text-[#888] text-xs mt-1 text-center">minute</p>
                                    </div>
                                    <div className="pb-5">
                                        <select
                                            value={tempPeriod}
                                            onChange={e => setTempPeriod(e.target.value as "AM" | "PM")}
                                            className="bg-[#3a3a3a] text-white text-lg font-medium px-3 py-2 rounded-lg border border-[#555] outline-none"
                                        >
                                            <option value="AM">am</option>
                                            <option value="PM">pm</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-3">
                            <button
                                type="button"
                                onClick={() => setInputMode(prev => prev === "clock" ? "keyboard" : "clock")}
                                className="p-2 rounded-full text-[#aaa] hover:bg-[#3a3a3a] transition-colors"
                            >
                                {inputMode === "clock" ? <Keyboard className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </button>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={handleClear} className="px-4 py-2 text-sm font-bold text-[#aaa] hover:text-white transition-colors">
                                    CLEAR
                                </button>
                                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-bold text-[#aaa] hover:text-white transition-colors">
                                    CANCEL
                                </button>
                                <button type="button" onClick={handleSet} className="px-4 py-2 text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors">
                                    SET
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export function DeliverySettings() {
    const { userData, setState, features } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    const [deliveryRate, setDeliveryRate] = useState(0);
    const [priceAdjustment, setPriceAdjustment] = useState<number | null>(null);
    const [deliveryRules, setDeliveryRules] = useState<DeliveryRules>({
        delivery_radius: 5,
        delivery_ranges: [],
        delivery_mode: "basic",
        is_fixed_rate: false,
        minimum_order_amount: 0,
        delivery_time_allowed: null,
        takeaway_time_allowed: null,
        isDeliveryActive: true,
        needDeliveryLocation: true,
        need_user_name: false,
        parcel_charge: 0,
        parcel_charge_type: "fixed",
        parcel_charge_items: {},
        hide_delivery_charge: false,
    });
    const [whatsappNumbers, setWhatsappNumbers] = useState<{ number: string; area: string }[]>([]);
    const [countryCode, setCountryCode] = useState("+91");

    // Delivery Bridge per-provider mobiles (partners.{porter,uber,rapido}_mobile).
    // Editable below; the bridge resolves each provider's account from these.
    const [porterMobile, setPorterMobile] = useState("");
    const [uberMobile, setUberMobile] = useState("");
    const [rapidoMobile, setRapidoMobile] = useState("");

    // Adloggs per-merchant state. The id stored on partners.adloggs_merchant_id
    // is what delivery-agents-server forwards to every Adloggs API call so this
    // partner's orders, wallet and availability all route to the right
    // restaurant under our Adloggs partner account.
    const [adloggsMerchantId, setAdloggsMerchantId] = useState("");
    const [savingMerchantId, setSavingMerchantId] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [walletEnabled, setWalletEnabled] = useState<boolean | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [walletError, setWalletError] = useState<string | null>(null);

    const currencySymbol = (userData as Partner)?.currency || "₹";

    useEffect(() => {
        if (userData?.role === "partner") {
            setDeliveryRate(userData.delivery_rate || 0);
            setPriceAdjustment((userData as any).price_adjustment ?? null);

            const hasAdvancedRules = userData.delivery_rules?.delivery_ranges && userData.delivery_rules.delivery_ranges.length > 0;
            const hasLegacyRules = userData.delivery_rules?.first_km_range;
            const deliveryMode = userData.delivery_rules?.delivery_mode || (hasAdvancedRules ? "advanced" : "basic");

            setDeliveryRules({
                delivery_radius: userData.delivery_rules?.delivery_radius || 5,
                delivery_ranges: userData.delivery_rules?.delivery_ranges || [],
                first_km_range: userData.delivery_rules?.first_km_range || (deliveryMode === "basic" && !hasLegacyRules ? { km: 1, rate: 0 } : undefined),
                delivery_mode: deliveryMode,
                is_fixed_rate: userData.delivery_rules?.is_fixed_rate || false,
                minimum_order_amount: userData.delivery_rules?.minimum_order_amount || 0,
                delivery_time_allowed: userData.delivery_rules?.delivery_time_allowed || null,
                takeaway_time_allowed: userData.delivery_rules?.takeaway_time_allowed || null,
                isDeliveryActive: userData.delivery_rules?.isDeliveryActive ?? true,
                needDeliveryLocation: userData.delivery_rules?.needDeliveryLocation ?? true,
                need_user_name: userData.delivery_rules?.need_user_name ?? false,
                parcel_charge: userData.delivery_rules?.parcel_charge || 0,
                parcel_charge_type: userData.delivery_rules?.parcel_charge_type || "fixed",
                parcel_charge_items: userData.delivery_rules?.parcel_charge_items || {},
                hide_delivery_charge: userData.delivery_rules?.hide_delivery_charge ?? false,
                delivery_provider_priority:
                    userData.delivery_rules?.delivery_provider_priority || ["porter", "uber", "rapido"],
            });

            // Initialize WhatsApp numbers
            setWhatsappNumbers(
                userData.whatsapp_numbers?.length > 0
                    ? userData.whatsapp_numbers
                    : [{ number: userData.phone || "", area: "default" }]
            );

            // Initialize country code
            setCountryCode(userData.country_code || "+91");
            setPorterMobile(userData.porter_mobile ?? "");
            setUberMobile(userData.uber_mobile ?? "");
            setRapidoMobile(userData.rapido_mobile ?? "");

            // Initialize Adloggs merchant id input from persisted partner row.
            setAdloggsMerchantId(((userData as Partner)?.adloggs_merchant_id ?? "") as string);
        }
    }, [userData]);

    // Fetch wallet whenever the 3PL feature is on. Re-runs when the merchant
    // id changes so the partner sees the correct balance after editing it.
    const loadWallet = useCallback(async () => {
        if (!features?.delivery_agent?.access || !features?.delivery_agent?.enabled) return;
        setWalletLoading(true);
        setWalletError(null);
        try {
            const merchantId = ((userData as Partner)?.adloggs_merchant_id ?? "").trim();
            const res = await getDeliveryAgentWallet({
                partnerMerchantId: merchantId || undefined,
            });
            if (!res.ok) {
                setWalletError(res.message || "Failed to load balance");
                setWalletBalance(null);
                setWalletEnabled(null);
            } else {
                const data = res.data as { balance?: number; enabled?: boolean };
                setWalletBalance(typeof data.balance === "number" ? data.balance : null);
                setWalletEnabled(!!data.enabled);
            }
        } catch (e: any) {
            setWalletError(e?.message || "Failed to load balance");
        } finally {
            setWalletLoading(false);
        }
    }, [features?.delivery_agent?.access, features?.delivery_agent?.enabled, userData]);

    useEffect(() => {
        loadWallet();
    }, [loadWallet]);

    const handleSaveMerchantId = useCallback(async () => {
        if (!userData) return;
        // One-time set. If the partner already has an id, the UI doesn't
        // even render the input, but block here too in case of a stale
        // client or replay.
        if ((userData as Partner)?.adloggs_merchant_id) {
            toast.error("Merchant id is already set — contact support to change it.");
            return;
        }
        const value = adloggsMerchantId.trim();
        if (!value) {
            toast.error("Enter a merchant id");
            return;
        }
        if (!/^[0-9]+$/.test(value)) {
            toast.error("Adloggs merchant id must be digits only");
            return;
        }
        setSavingMerchantId(true);
        try {
            await updatePartner(userData.id, { adloggs_merchant_id: value });
            setState({ adloggs_merchant_id: value } as Partial<Partner>);
            revalidateTag(userData.id);
            toast.success("Adloggs merchant id saved");
            await loadWallet();
        } catch (e: any) {
            toast.error(e?.message || "Failed to save");
        } finally {
            setSavingMerchantId(false);
        }
    }, [userData, adloggsMerchantId, setState, loadWallet]);

    const handleSaveDelivery = useCallback(async () => {
        if (!userData) return;

        // Validate WhatsApp numbers
        for (const item of whatsappNumbers) {
            if (!item.number || item.number.length !== 10) {
                toast.error(`Please enter a valid WhatsApp Number for ${item.area || "unnamed area"}`);
                return;
            }
            if (!item.area) {
                toast.error("Please specify an area for each number");
                return;
            }
        }

        // Delivery Bridge mobiles — each must be blank or a 10-digit Indian number.
        for (const [label, m] of [
            ["Porter", porterMobile],
            ["Uber", uberMobile],
            ["Rapido", rapidoMobile],
        ] as const) {
            if (m.trim() && !/^[6-9][0-9]{9}$/.test(m.trim())) {
                toast.error(`${label} mobile must be a 10-digit number (or left blank)`);
                return;
            }
        }

        setIsSaving(true);
        try {
            const updates = {
                delivery_rate: deliveryRate,
                delivery_rules: deliveryRules,
                whatsapp_numbers: whatsappNumbers,
                country_code: countryCode,
                price_adjustment: priceAdjustment,
                porter_mobile: porterMobile.trim() || null,
                uber_mobile: uberMobile.trim() || null,
                rapido_mobile: rapidoMobile.trim() || null,
            };

            await updatePartner(userData.id, updates);

            await revalidateTag(userData.id);
            await revalidateTag("hotel-data");
            setState(updates);
            toast.success("Delivery settings updated successfully");
        } catch (error) {
            console.error("Error updating delivery settings:", error);
            toast.error("Failed to update delivery settings");
        } finally {
            setIsSaving(false);
        }
    }, [userData, deliveryRate, deliveryRules, whatsappNumbers, countryCode, priceAdjustment, porterMobile, uberMobile, rapidoMobile, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSaveDelivery);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSaveDelivery, setSaveAction, setHasChanges]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    // Check for changes
    useEffect(() => {
        if (!userData) return;
        const data = userData as any;

        const initialRate = data.delivery_rate || 0;

        const hasAdvancedRules = data.delivery_rules?.delivery_ranges && data.delivery_rules.delivery_ranges.length > 0;
        const hasLegacyRules = data.delivery_rules?.first_km_range;
        const deliveryMode = data.delivery_rules?.delivery_mode || (hasAdvancedRules ? "advanced" : "basic");

        const initialRules = {
            delivery_radius: data.delivery_rules?.delivery_radius || 5,
            delivery_ranges: data.delivery_rules?.delivery_ranges || [],
            first_km_range: data.delivery_rules?.first_km_range || (deliveryMode === "basic" && !hasLegacyRules ? { km: 1, rate: 0 } : undefined),
            delivery_mode: deliveryMode,
            is_fixed_rate: data.delivery_rules?.is_fixed_rate || false,
            minimum_order_amount: data.delivery_rules?.minimum_order_amount || 0,
            delivery_time_allowed: data.delivery_rules?.delivery_time_allowed || null,
            takeaway_time_allowed: data.delivery_rules?.takeaway_time_allowed || null,
            isDeliveryActive: data.delivery_rules?.isDeliveryActive ?? true,
            needDeliveryLocation: data.delivery_rules?.needDeliveryLocation ?? true,
            need_user_name: data.delivery_rules?.need_user_name ?? false,
            parcel_charge: data.delivery_rules?.parcel_charge || 0,
            parcel_charge_type: data.delivery_rules?.parcel_charge_type || "fixed",
            hide_delivery_charge: data.delivery_rules?.hide_delivery_charge ?? false,
        };

        const initialWhatsapp = data.whatsapp_numbers?.length > 0
            ? data.whatsapp_numbers
            : [{ number: data.phone || "", area: "default" }];
        const initialCountryCode = data.country_code || "+91";

        const initialPriceAdjustment = data.price_adjustment ?? null;
        const initialPorterMobile = data.porter_mobile ?? "";
        const initialUberMobile = data.uber_mobile ?? "";
        const initialRapidoMobile = data.rapido_mobile ?? "";

        const hasChanges =
            deliveryRate !== initialRate ||
            JSON.stringify(deliveryRules) !== JSON.stringify(initialRules) ||
            JSON.stringify(whatsappNumbers) !== JSON.stringify(initialWhatsapp) ||
            countryCode !== initialCountryCode ||
            priceAdjustment !== initialPriceAdjustment ||
            porterMobile !== initialPorterMobile ||
            uberMobile !== initialUberMobile ||
            rapidoMobile !== initialRapidoMobile;

        setHasChanges(hasChanges);

    }, [
        userData,
        deliveryRate,
        deliveryRules,
        whatsappNumbers,
        countryCode,
        priceAdjustment,
        porterMobile,
        uberMobile,
        rapidoMobile,
        setHasChanges
    ]);

    const addRange = () => {
        const newRange: DeliveryRange = { from_km: 0, to_km: 1, rate: 0 };
        setDeliveryRules(prev => ({
            ...prev,
            delivery_ranges: [...(prev.delivery_ranges || []), newRange]
        }));
    };

    const removeRange = (index: number) => {
        setDeliveryRules(prev => ({
            ...prev,
            delivery_ranges: (prev.delivery_ranges || []).filter((_, i) => i !== index)
        }));
    };

    const updateRange = (index: number, field: keyof DeliveryRange, value: number) => {
        setDeliveryRules(prev => {
            const newRanges = [...(prev.delivery_ranges || [])];
            newRanges[index] = { ...newRanges[index], [field]: value };
            return { ...prev, delivery_ranges: newRanges };
        });
    };

    const addWhatsappNumber = () => {
        setWhatsappNumbers(prev => [...prev, { number: "", area: "" }]);
    };

    const removeWhatsappNumber = (index: number) => {
        if (whatsappNumbers.length === 1) {
            toast.error("You must have at least one WhatsApp number");
            return;
        }
        setWhatsappNumbers(prev => prev.filter((_, i) => i !== index));
    };

    const updateWhatsappNumber = (index: number, field: "number" | "area", value: string) => {
        setWhatsappNumbers(prev => {
            const newNumbers = [...prev];
            newNumbers[index] = { ...newNumbers[index], [field]: value };
            return newNumbers;
        });
    };

    // When BOTH the delivery_agent feature is on AND the partner has opted
    // into "let the 3PL calculate the charge", we hide the internal rate /
    // range / radius config. Customer-side checkout reads the live quote
    // from delivery-agents-server instead.
    // Default-on: if `use_delivery_agent_charge` is undefined and the feature
    // is enabled, treat as on. Partner must explicitly set `false` to turn off.
    const agentChargeEnabled =
        !!features?.delivery_agent?.access &&
        !!features?.delivery_agent?.enabled &&
        deliveryRules.use_delivery_agent_charge !== false;

    // Porter bridge owns the customer-billed delivery charge end-to-end —
    // when this is on, the legacy distance-based pricing UI is irrelevant
    // (Porter's live quote is the price). Hide that whole pricing block.
    const porterChargeEnabled =
        !!features?.porter_bridge?.access &&
        !!features?.porter_bridge?.enabled;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Delivery Configuration</CardTitle>
                    <CardDescription>Configure how you handle deliveries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Delivery</Label>
                            <p className="text-sm text-muted-foreground">Turn delivery on or off.</p>
                        </div>
                        <Switch
                            checked={deliveryRules.isDeliveryActive}
                            onCheckedChange={(checked) => setDeliveryRules(prev => ({ ...prev, isDeliveryActive: checked }))}
                        />
                    </div>

                    {features?.delivery_agent?.access && features?.delivery_agent?.enabled && (
                        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                            <div className="space-y-0.5">
                                <Label className="text-base">Auto calculate delivery charge</Label>
                                <p className="text-sm text-muted-foreground">
                                    Fetches a live price and serviceability check from your 3PL provider (Adloggs) at checkout. When on, all other delivery-charge settings below are hidden and ignored. Recommended for 3PL-enabled stores.
                                </p>
                            </div>
                            <Switch
                                checked={deliveryRules.use_delivery_agent_charge !== false}
                                onCheckedChange={(checked) => setDeliveryRules(prev => ({ ...prev, use_delivery_agent_charge: checked }))}
                            />
                        </div>
                    )}

                    {porterChargeEnabled && (
                        <div className="rounded-lg border border-orange-200 bg-white p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-50 text-orange-600">
                                    {/* small inline svg keeps the bundle light vs another lucide import */}
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
                                </span>
                                <Label className="text-base">Delivery Bridge Settings</Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Dispatch routes through your provider accounts on the bridge. Enter the
                                mobile each provider is logged in with — leave one blank to fall back to
                                your Porter number (or store phone). Manage the accounts (OTP login, view
                                bookings) at{" "}
                                <a
                                    href="https://deliverybridge.menuthere.com/accounts"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2 font-medium"
                                >
                                    deliverybridge.menuthere.com
                                </a>
                                .
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {([
                                    { label: "Porter", value: porterMobile, set: setPorterMobile },
                                    { label: "Uber", value: uberMobile, set: setUberMobile },
                                    { label: "Rapido", value: rapidoMobile, set: setRapidoMobile },
                                ] as { label: string; value: string; set: (v: string) => void }[]).map(({ label, value, set }) => (
                                    <div key={label} className="space-y-1">
                                        <Label className="text-sm">{label} mobile</Label>
                                        <div className="flex items-center rounded-md border bg-white pl-2 focus-within:ring-1 focus-within:ring-orange-300">
                                            <span className="select-none text-sm text-muted-foreground">+91</span>
                                            <Input
                                                type="tel"
                                                inputMode="numeric"
                                                value={value}
                                                placeholder="10-digit"
                                                onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                                className="border-0 shadow-none focus-visible:ring-0"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-orange-100 pt-3">
                                <Label className="text-base">Provider priority</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Dispatch tries these in order (normal bike), one at a time, escalating if no rider is found in time. The customer is charged the highest of the available quotes.
                                </p>
                                <div className="space-y-1.5">
                                    {(deliveryRules.delivery_provider_priority || ["porter", "uber", "rapido"]).map((prov, i, arr) => (
                                        <div key={prov} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
                                            <span className="w-5 text-center font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                                            <span className="flex-1 capitalize">{prov}</span>
                                            <button
                                                type="button"
                                                disabled={i === 0}
                                                aria-label={`Move ${prov} up`}
                                                onClick={() => setDeliveryRules(prev => {
                                                    const a = [...(prev.delivery_provider_priority || ["porter", "uber", "rapido"])];
                                                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                                                    return { ...prev, delivery_provider_priority: a };
                                                })}
                                                className="rounded px-2 py-0.5 hover:bg-muted disabled:opacity-30"
                                            >↑</button>
                                            <button
                                                type="button"
                                                disabled={i === arr.length - 1}
                                                aria-label={`Move ${prov} down`}
                                                onClick={() => setDeliveryRules(prev => {
                                                    const a = [...(prev.delivery_provider_priority || ["porter", "uber", "rapido"])];
                                                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                                                    return { ...prev, delivery_provider_priority: a };
                                                })}
                                                className="rounded px-2 py-0.5 hover:bg-muted disabled:opacity-30"
                                            >↓</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {features?.delivery_agent?.access && features?.delivery_agent?.enabled && (
                        <div className="rounded-lg border border-blue-200 bg-white p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-blue-600" />
                                    <Label className="text-base">Adloggs wallet</Label>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={loadWallet}
                                    disabled={walletLoading}
                                    title="Refresh balance"
                                >
                                    {walletLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            <div className="rounded-md bg-muted/40 p-3">
                                {walletLoading ? (
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Checking balance…
                                    </div>
                                ) : walletError ? (
                                    <div className="text-sm text-red-700 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" /> {walletError}
                                    </div>
                                ) : walletEnabled === false ? (
                                    <div className="text-sm text-amber-700">
                                        Wallet not enabled on Adloggs for this merchant.
                                        Contact Adloggs support to enable it.
                                    </div>
                                ) : walletBalance != null ? (
                                    <div>
                                        <div className="text-2xl font-semibold">
                                            {currencySymbol}{walletBalance.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {(userData as Partner)?.adloggs_merchant_id
                                                ? `For merchant ${(userData as Partner)?.adloggs_merchant_id}`
                                                : "Default partner-account wallet (set a merchant id below for per-restaurant balance)"}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">No balance returned.</div>
                                )}
                            </div>

                            {/* Adloggs merchant id is intentionally one-time editable.
                                Once set, the input disappears so partners can't change
                                it mid-flight — any reassignment must go through us
                                (history of orders is tied to the merchant ledger). */}
                            {!((userData as Partner)?.adloggs_merchant_id) ? (
                                <div className="space-y-2">
                                    <Label className="text-sm">Adloggs merchant id</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={adloggsMerchantId}
                                            onChange={(e) => setAdloggsMerchantId(e.target.value)}
                                            placeholder="e.g. 236859"
                                            inputMode="numeric"
                                            className="font-mono"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleSaveMerchantId}
                                            disabled={savingMerchantId || !adloggsMerchantId.trim()}
                                        >
                                            {savingMerchantId ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Issued by Adloggs when your restaurant was onboarded as a separate
                                        merchant. This can only be set once — contact support to change it
                                        later.
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {!agentChargeEnabled && !porterChargeEnabled && (
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Don&apos;t show delivery charge</Label>
                                <p className="text-sm text-muted-foreground">Show &quot;Extra delivery charges apply&quot; note instead of adding delivery charge to bill.</p>
                            </div>
                            <Switch
                                checked={deliveryRules.hide_delivery_charge ?? false}
                                onCheckedChange={(checked) => setDeliveryRules(prev => ({ ...prev, hide_delivery_charge: checked }))}
                            />
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Need Delivery Location?</Label>
                            <Select
                                value={deliveryRules.needDeliveryLocation ? "yes" : "no"}
                                onValueChange={(val) => setDeliveryRules(prev => ({
                                    ...prev,
                                    needDeliveryLocation: val === "yes",
                                    is_fixed_rate: val === "yes" ? prev.is_fixed_rate : true
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Minimum Order Amount ({currencySymbol})</Label>
                            <Input
                                type="number"
                                min="0"
                                value={deliveryRules.minimum_order_amount}
                                onChange={(e) => setDeliveryRules(prev => ({ ...prev, minimum_order_amount: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    {deliveryRules.needDeliveryLocation && !porterChargeEnabled && (
                        <div className="space-y-2">
                            <Label>Delivery Radius (km)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={deliveryRules.delivery_radius}
                                onChange={(e) => setDeliveryRules(prev => ({ ...prev, delivery_radius: Number(e.target.value) }))}
                            />
                        </div>
                    )}

                    {deliveryRules.needDeliveryLocation && !agentChargeEnabled && !porterChargeEnabled && (
                        <>
                            <div className="space-y-2">
                                <Label>Pricing Type</Label>
                                <Select
                                    value={deliveryRules.is_fixed_rate ? "fixed" : "variable"}
                                    onValueChange={(val) => setDeliveryRules(prev => ({ ...prev, is_fixed_rate: val === "fixed" }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Fixed Rate</SelectItem>
                                        <SelectItem value="variable">Variable (Distance Based)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {deliveryRules.is_fixed_rate ? (
                                <div className="space-y-2">
                                    <Label>Fixed Delivery Charge ({currencySymbol})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={deliveryRate}
                                        onChange={(e) => setDeliveryRate(Number(e.target.value))}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">Variable Pricing</Label>
                                        <Select
                                            value={deliveryRules.delivery_mode || "basic"}
                                            onValueChange={(val: "basic" | "advanced") => setDeliveryRules(prev => ({
                                                ...prev,
                                                delivery_mode: val,
                                                delivery_ranges: val === "advanced" ? (prev.delivery_ranges?.length ? prev.delivery_ranges : []) : undefined,
                                                first_km_range: val === "basic" ? (prev.first_km_range || { km: 1, rate: 0 }) : undefined
                                            }))}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="basic">Basic (Base + Per KM)</SelectItem>
                                                <SelectItem value="advanced">Advanced (Ranges)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {deliveryRules.delivery_mode === "basic" && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Base Distance (First X km)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={deliveryRules.first_km_range?.km || 0}
                                                    onChange={(e) => setDeliveryRules(prev => ({
                                                        ...prev,
                                                        first_km_range: { ...prev.first_km_range!, km: Number(e.target.value) }
                                                    }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Base Charge ({currencySymbol})</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={deliveryRules.first_km_range?.rate || 0}
                                                    onChange={(e) => setDeliveryRules(prev => ({
                                                        ...prev,
                                                        first_km_range: { ...prev.first_km_range!, rate: Number(e.target.value) }
                                                    }))}
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Charge Per Additional KM ({currencySymbol})</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={deliveryRate}
                                                    onChange={(e) => setDeliveryRate(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {deliveryRules.delivery_mode === "advanced" && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                {(deliveryRules.delivery_ranges || []).map((range, idx) => (
                                                    <div key={idx} className="flex items-end gap-2">
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">From (km)</Label>
                                                            <Input type="number" min="0" value={range.from_km} onChange={(e) => updateRange(idx, "from_km", Number(e.target.value))} />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">To (km)</Label>
                                                            <Input type="number" min="0" value={range.to_km} onChange={(e) => updateRange(idx, "to_km", Number(e.target.value))} />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">Rate ({currencySymbol})</Label>
                                                            <Input type="number" min="0" value={range.rate} onChange={(e) => updateRange(idx, "rate", Number(e.target.value))} />
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRange(idx)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={addRange}>
                                                <Plus className="mr-2 h-4 w-4" /> Add Range
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div className="space-y-2">
                        <Label>Delivery Time Window</Label>
                        <div className="flex items-center gap-3">
                            <TimePicker
                                value={deliveryRules.delivery_time_allowed?.from || "00:00"}
                                onChange={(val) => setDeliveryRules(prev => ({
                                    ...prev,
                                    delivery_time_allowed: { from: val, to: prev.delivery_time_allowed?.to || "23:59" }
                                }))}
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <TimePicker
                                value={deliveryRules.delivery_time_allowed?.to || "23:59"}
                                onChange={(val) => setDeliveryRules(prev => ({
                                    ...prev,
                                    delivery_time_allowed: { from: prev.delivery_time_allowed?.from || "00:00", to: val }
                                }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Takeaway Time Window</Label>
                        <div className="flex items-center gap-3">
                            <TimePicker
                                value={deliveryRules.takeaway_time_allowed?.from || "00:00"}
                                onChange={(val) => setDeliveryRules(prev => ({
                                    ...prev,
                                    takeaway_time_allowed: { from: val, to: prev.takeaway_time_allowed?.to || "23:59" }
                                }))}
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <TimePicker
                                value={deliveryRules.takeaway_time_allowed?.to || "23:59"}
                                onChange={(val) => setDeliveryRules(prev => ({
                                    ...prev,
                                    takeaway_time_allowed: { from: prev.takeaway_time_allowed?.from || "00:00", to: val }
                                }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Parcel/Packaging Charge</Label>
                        <div className="flex gap-3 items-start">
                            <Select
                                value={deliveryRules.parcel_charge_type || "fixed"}
                                onValueChange={(val) => setDeliveryRules(prev => ({
                                    ...prev,
                                    parcel_charge_type: val as "fixed" | "variable" | "itemwise"
                                }))}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="variable">Per Item</SelectItem>
                                    <SelectItem value="itemwise">Item-wise</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    min="0"
                                    value={deliveryRules.parcel_charge || 0}
                                    onChange={(e) => setDeliveryRules(prev => ({
                                        ...prev,
                                        parcel_charge: Number(e.target.value)
                                    }))}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {(deliveryRules.parcel_charge_type || "fixed") === "fixed"
                                ? `Flat ${currencySymbol}${deliveryRules.parcel_charge || 0} charge added to delivery and takeaway orders.`
                                : deliveryRules.parcel_charge_type === "itemwise"
                                    ? `Default ${currencySymbol}${deliveryRules.parcel_charge || 0} per item. Override for specific items below.`
                                    : `${currencySymbol}${deliveryRules.parcel_charge || 0} per item — total charge = item count × per-item charge.`
                            }
                        </p>
                        {deliveryRules.parcel_charge_type === "itemwise" && (
                            <ItemwiseParcelCharges
                                customCharges={deliveryRules.parcel_charge_items || {}}
                                defaultCharge={deliveryRules.parcel_charge || 0}
                                currencySymbol={currencySymbol}
                                onChange={(items) => setDeliveryRules(prev => ({
                                    ...prev,
                                    parcel_charge_items: items
                                }))}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Price Adjustment</CardTitle>
                    <CardDescription>Adjust all menu item prices for delivery/hotel links. Hidden from customers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Label>Adjustment per item ({currencySymbol})</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 20 or -10"
                            value={priceAdjustment ?? ""}
                            onChange={(e) => setPriceAdjustment(e.target.value === "" ? null : parseInt(e.target.value))}
                        />
                        <p className="text-sm text-muted-foreground">
                            Positive = increase prices, Negative = decrease prices. Applies to all items on your /hotels/ page.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Name</CardTitle>
                    <CardDescription>Ask customers for their name when ordering.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Ask for customer name</Label>
                            <p className="text-sm text-muted-foreground">
                                Require customers to enter their name during login and order placement.
                            </p>
                        </div>
                        <Switch
                            checked={deliveryRules.need_user_name ?? false}
                            onCheckedChange={(checked) => setDeliveryRules(prev => ({
                                ...prev,
                                need_user_name: checked
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {features?.multiwhatsapp?.access && features?.multiwhatsapp?.enabled && <Card>
                <CardHeader>
                    <CardTitle>Delivery Contact Numbers</CardTitle>
                    <CardDescription>Manage WhatsApp numbers for different delivery areas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Country Code</Label>
                        <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {countryCodes.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.country} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        {whatsappNumbers.map((item, idx) => (
                            <div key={idx} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/20">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Area/Location</Label>
                                    <Input
                                        value={item.area}
                                        onChange={(e) => updateWhatsappNumber(idx, "area", e.target.value)}
                                        placeholder="e.g., Downtown, North Zone"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">WhatsApp Number (10 digits)</Label>
                                    <Input
                                        value={item.number}
                                        onChange={(e) => updateWhatsappNumber(idx, "number", e.target.value)}
                                        placeholder="9876543210"
                                        maxLength={10}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => removeWhatsappNumber(idx)}
                                    disabled={whatsappNumbers.length === 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addWhatsappNumber}>
                        <Plus className="mr-2 h-4 w-4" /> Add WhatsApp Number
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Add multiple WhatsApp numbers for different delivery areas to help customers contact the right person.
                    </p>
                </CardContent>
            </Card>}

        </div>
    );
}

function ItemwiseParcelCharges({
    customCharges,
    defaultCharge,
    currencySymbol,
    onChange,
}: {
    customCharges: Record<string, number>;
    defaultCharge: number;
    currencySymbol: string;
    onChange: (items: Record<string, number>) => void;
}) {
    const { items: menuItems, fetchMenu } = useMenuStore();
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (menuItems.length === 0) fetchMenu();
    }, []);

    const filtered = search
        ? menuItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
        : menuItems;

    const updateCharge = (itemId: string, value: string) => {
        const num = Number(value);
        const updated = { ...customCharges };
        if (value === "" || num === defaultCharge) {
            delete updated[itemId];
        } else {
            updated[itemId] = num;
        }
        onChange(updated);
    };

    const customCount = Object.keys(customCharges).length;

    return (
        <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                    Custom charges ({customCount} item{customCount !== 1 ? "s" : ""} overridden)
                </p>
                {customCount > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => onChange({})}
                    >
                        Reset all
                    </Button>
                )}
            </div>
            <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
            />
            <div className="max-h-[300px] overflow-y-auto space-y-1">
                {filtered.map((item) => {
                    const itemId = item.id || "";
                    const hasCustom = itemId in customCharges;
                    return (
                        <div
                            key={itemId}
                            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${hasCustom ? "bg-orange-500/10" : ""}`}
                        >
                            <span className="flex-1 truncate">{item.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-muted-foreground">{currencySymbol}</span>
                                <Input
                                    type="number"
                                    min="0"
                                    className="h-7 w-20 text-sm"
                                    placeholder={String(defaultCharge)}
                                    value={hasCustom ? customCharges[itemId] : ""}
                                    onChange={(e) => updateCharge(itemId, e.target.value)}
                                />
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No items found</p>
                )}
            </div>
        </div>
    );
}
