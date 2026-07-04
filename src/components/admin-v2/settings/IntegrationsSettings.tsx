"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import Img from "@/components/Img";
import { Loader2, Upload, MessageCircle, Unplug, CheckCircle2, Lock } from "lucide-react";
import { HotelData } from "@/app/hotels/[...id]/page";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { UpgradePrompt } from "@/components/admin-v2/UpgradePrompt";
import { WhatsAppHealthStatus } from "@/components/admin-v2/WhatsAppHealthStatus";

export function IntegrationsSettings() {
    const { userData, setState } = useAuthStore();
    const planId = (userData as any)?.subscription_details?.plan?.id;
    const isOnFreePlan = isFreePlan(planId);

    // Delivery Platform link state
    const [zomatoLink, setZomatoLink] = useState("");
    const [uberEatsLink, setUberEatsLink] = useState("");
    const [talabatLink, setTalabatLink] = useState("");
    const [doordashLink, setDoordashLink] = useState("");

    // Google Business State
    const [googleConnected, setGoogleConnected] = useState(false);
    const [googleHasTokens, setGoogleHasTokens] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);
    const [googleLocations, setGoogleLocations] = useState<any[]>([]);
    const [selectedGoogleLocation, setSelectedGoogleLocation] = useState("");
    const [linkedLocationId, setLinkedLocationId] = useState<string | null>(null);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isSyncingMenu, setIsSyncingMenu] = useState(false);

    // WhatsApp Business Integration State
    // "menuthere" = use our shared WhatsApp, "own" = connect their own WABA
    const [whatsappMode, setWhatsappMode] = useState<"menuthere" | "own" | null>(null);
    const [wabaConnected, setWabaConnected] = useState(false);
    const [wabaPhoneNumber, setWabaPhoneNumber] = useState<string | null>(null);
    // Every connected number (a partner can link several). Primary first.
    const [wabaNumbers, setWabaNumbers] = useState<
        Array<{ id: string; phone_number_id: string; display_phone: string | null; is_primary: boolean; flow_enabled: boolean }>
    >([]);
    const [isWabaLoading, setIsWabaLoading] = useState(false);
    // Where login OTPs are sent FROM. Defaults to "menuthere"; "own" sends from
    // the partner's connected number. Only shown when their WhatsApp is connected.
    const [otpSender, setOtpSender] = useState<"menuthere" | "own">(
        ((userData as any)?.otp_sender === "own" ? "own" : "menuthere"),
    );

    // Google Tag Manager container (GTM-XXXXXXX) — loaded on the partner's storefront.
    const [gtmId, setGtmId] = useState<string>((userData as any)?.gtm_container_id ?? "");
    const [savingGtm, setSavingGtm] = useState(false);
    // WABA + Phone Number IDs captured from the Embedded Signup session-info
    // postMessage (see the listener effect below). In the Coexistence flow these
    // arrive ONLY via postMessage — the access token doesn't carry them.
    const waSessionRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

    // Handle WhatsApp connection redirect params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("whatsapp_connected") === "true") {
            toast.success("WhatsApp Business Account connected successfully!");
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete("whatsapp_connected");
            window.history.replaceState({}, "", url.toString());
        }
        if (params.get("whatsapp_error")) {
            toast.error("WhatsApp connection failed: " + params.get("whatsapp_error"));
            const url = new URL(window.location.href);
            url.searchParams.delete("whatsapp_error");
            window.history.replaceState({}, "", url.toString());
        }
    }, []);

    // Preload Facebook SDK so FB.login runs synchronously inside the user click
    // — otherwise the popup gets blocked and Meta falls back to a full redirect.
    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        if (!appId) return;
        const w = window as any;
        if (w.__fbSdkReady || w.__fbSdkInitStarted) return;
        w.__fbSdkInitStarted = true;

        w.fbAsyncInit = () => {
            w.FB.init({
                appId,
                cookie: true,
                xfbml: false,
                version: "v21.0",
            });
            w.__fbSdkReady = true;
        };

        if (!document.getElementById("facebook-jssdk")) {
            const script = document.createElement("script");
            script.id = "facebook-jssdk";
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;
            script.crossOrigin = "anonymous";
            document.body.appendChild(script);
        }
    }, []);

    // Capture the Embedded Signup session info (WABA ID + Phone Number ID) that
    // the popup posts back via window.postMessage. For the WhatsApp Business app
    // (Coexistence) flow this is the ONLY place those IDs are exposed — the
    // access token is scoped to whatsapp_business_manage_events and contains no
    // WABA. We stash them here and forward them to the backend when FB.login
    // returns the auth code.
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            // Accept the session-info message from ANY Facebook host. On mobile,
            // Embedded Signup is served from m.facebook.com (and other
            // *.facebook.com subdomains), so an exact www/web/business allowlist
            // silently dropped the message on phones — losing the WABA / phone
            // IDs and failing the connect. Mirror Meta's sample listener (a
            // hostname suffix check), scoped to facebook.com / fb.com.
            let originHost: string;
            try {
                originHost = new URL(event.origin).hostname;
            } catch {
                return;
            }
            const isFacebookOrigin =
                originHost === "facebook.com" ||
                originHost.endsWith(".facebook.com") ||
                originHost === "fb.com" ||
                originHost.endsWith(".fb.com");
            if (!isFacebookOrigin) return;
            try {
                const parsed =
                    typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                // type: "WA_EMBEDDED_SIGNUP"; event e.g. "FINISH",
                // "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"; data carries the IDs.
                if (parsed?.type === "WA_EMBEDDED_SIGNUP" && parsed?.data) {
                    const { waba_id, phone_number_id } = parsed.data;
                    if (waba_id || phone_number_id) {
                        waSessionRef.current = { waba_id, phone_number_id };
                    }
                }
            } catch {
                // Not an Embedded Signup message — ignore.
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    // Handle Google Business connection redirect params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("google_connected") === "true" && userData?.id) {
            toast.success("Google Business Account connected successfully!");
            checkGoogleConnection(userData.id);
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete("google_connected");
            window.history.replaceState({}, "", url.toString());
        }
        if (params.get("google_error")) {
            toast.error("Google connection failed: " + params.get("google_error"));
            const url = new URL(window.location.href);
            url.searchParams.delete("google_error");
            window.history.replaceState({}, "", url.toString());
        }
    }, [userData?.id]);

    useEffect(() => {
        if (userData?.role === "partner") {
            const socialLinks = getSocialLinks(userData as HotelData);
            setZomatoLink(socialLinks.zomato || "");
            setUberEatsLink(socialLinks.uberEats || "");
            setTalabatLink(socialLinks.talabat || "");
            setDoordashLink(socialLinks.doordash || "");

            // Check Google Connection
            checkGoogleConnection(userData.id);

            // Check WhatsApp Business Connection
            checkWhatsAppConnection(userData.id);
        }
        // Only re-run when the actual partner changes — depending on the whole
        // userData object re-fires this (and the WhatsApp status fetch) on every
        // setState (e.g. toggling otp_sender), which flashes the spinner and
        // briefly unmounts the toggle the user just clicked.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.id, userData?.role]);

    const checkGoogleConnection = async (partnerId: string) => {
        setIsGoogleLoading(true);
        setGoogleError(null);
        try {
            // First try partner's own tokens
            const partnerRes = await fetch(`/api/google-business/locations?partnerId=${partnerId}&mode=partner`);
            const partnerData = await partnerRes.json();
            console.log('[GoogleBusiness] Partner check:', partnerRes.status, partnerData);

            if (partnerRes.ok && partnerData.success) {
                setGoogleConnected(true);
                setGoogleHasTokens(true);
                setGoogleLocations(partnerData.locations || []);
                if (partnerData.linkedLocationId) {
                    setLinkedLocationId(partnerData.linkedLocationId);
                }
                return;
            }

            // Partner API failed. Distinguish "no tokens" from "tokens exist but API failed".
            const noTokens = partnerRes.status === 404 && partnerData.error === 'Partner not connected to Google';
            setGoogleHasTokens(!noTokens);
            if (!noTokens) {
                setGoogleError(partnerData.error || `Google API error (${partnerRes.status})`);
            }

            // Fallback: Check via Master Account (superadmin-linked partners)
            const masterRes = await fetch(`/api/google-business/locations?partnerId=${partnerId}`);
            const masterData = await masterRes.json();
            console.log('[GoogleBusiness] Master check:', masterRes.status, masterData);

            if (masterRes.ok && masterData.success && masterData.linkedLocationId) {
                // Partner is linked via Master Account
                setGoogleConnected(true);
                setGoogleLocations(masterData.locations || []);
                setLinkedLocationId(masterData.linkedLocationId);
                setGoogleError(null);
            } else {
                setGoogleConnected(false);
            }
        } catch (e: any) {
            console.error('[GoogleBusiness] checkGoogleConnection error:', e);
            setGoogleConnected(false);
            setGoogleError(e?.message || 'Connection check failed');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!userData) return;
        // Redirect to auth with return url back to settings
        const redirect = encodeURIComponent(`${window.location.pathname}?view=Settings`);
        window.location.href = `/api/google-business/auth/login?partnerId=${userData.id}&redirect=${redirect}`;
    };

    const handleSendInvite = async () => {
        if (!selectedGoogleLocation || !userData) return;
        setIsGoogleLoading(true);
        try {
            const res = await fetch('/api/google-business/invite-manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: userData.id, locationId: selectedGoogleLocation })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Request sent successfully! Our team will accept it shortly.");
            } else {
                toast.error("Failed to send request: " + data.error);
            }
        } catch (e) {
            toast.error("Request failed");
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleSyncMenu = async () => {
        if (!userData || !linkedLocationId) return;

        // Rate limit check
        const lastSync = localStorage.getItem(`google_sync_${userData.id}`);
        const today = new Date().toDateString();
        if (lastSync === today) {
            toast.info("You can only sync to Google once per day.");
            return;
        }

        if (!confirm("Sync menu to Google? This will overwrite your Google Menu.")) return;

        setIsSyncingMenu(true);
        const toastId = toast.loading("Syncing menu...");

        try {
            const res = await fetch('/api/google-business/menu/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: userData.id, locationId: 'auto' })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem(`google_sync_${userData.id}`, today);
                toast.success("Menu synced successfully!");
            } else {
                toast.error("Sync failed: " + data.error);
            }
        } catch (e) {
            toast.error("Sync failed");
        } finally {
            setIsSyncingMenu(false);
            toast.dismiss(toastId);
        }
    };

    // ─── WhatsApp Business Integration ─────────────────────────────
    const checkWhatsAppConnection = async (partnerId: string) => {
        setIsWabaLoading(true);
        try {
            const res = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
            const data = await res.json();
            if (res.ok && data.connected) {
                setWabaConnected(true);
                setWabaNumbers(Array.isArray(data.integrations) ? data.integrations : []);
                // display_phone is the PRIMARY number (default sender).
                setWabaPhoneNumber(data.display_phone || null);
                setWhatsappMode("own");
            } else {
                setWabaConnected(false);
                setWabaNumbers([]);
                setWabaPhoneNumber(null);
                // Default to menuthere if no preference saved
                setWhatsappMode((userData as any)?.whatsapp_integration_mode || "menuthere");
            }
        } catch {
            setWabaConnected(false);
            setWabaNumbers([]);
            setWhatsappMode("menuthere");
        } finally {
            setIsWabaLoading(false);
        }
    };

    const handleConnectWhatsApp = () => {
        if (!userData) return;
        const w = window as any;
        // SDK is preloaded on mount; if it isn't ready yet the user clicked
        // before init finished — bail out cleanly rather than queue, because
        // queuing breaks the user-gesture chain and the popup gets blocked.
        if (!w.__fbSdkReady) {
            toast.error("WhatsApp connector is still loading, please try again in a moment.");
            return;
        }

        // FB.login rejects async callbacks ("Expression is of type
        // asyncfunction, not function") — keep this synchronous and run the
        // exchange in a helper.
        const exchangeCode = async (code: string) => {
            setIsWabaLoading(true);
            try {
                const session = waSessionRef.current;
                const res = await fetch("/api/whatsapp/meta/auth/callback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code,
                        partnerId: userData.id,
                        // From the session-info postMessage (Coexistence flow).
                        waba_id: session.waba_id,
                        phone_number_id: session.phone_number_id,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.connected) {
                    toast.error(data?.error || "WhatsApp connection failed");
                    return;
                }
                toast.success("WhatsApp connected");
                await checkWhatsAppConnection(userData.id);
            } catch (e: any) {
                toast.error(e?.message || "WhatsApp connection failed");
            } finally {
                setIsWabaLoading(false);
                waSessionRef.current = {};
            }
        };

        w.FB.login(
            (response: any) => {
                if (!response?.authResponse) {
                    toast.error("WhatsApp connection was cancelled");
                    return;
                }
                const { code } = response.authResponse;
                void exchangeCode(code);
            },
            {
                config_id: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
                response_type: "code",
                override_default_response_type: true,
                extras: {
                    setup: {},
                    // WhatsApp Business app onboarding (Coexistence): partners link
                    // the number they already run on the WhatsApp Business app.
                    // These four fields mirror Meta's working hosted onboarding URL
                    // (config 4370725216536298). Meta returns the WABA + Phone
                    // Number IDs via the session-info postMessage captured above,
                    // NOT in the token (which is scoped to
                    // whatsapp_business_manage_events).
                    featureType: "whatsapp_business_app_onboarding",
                    sessionInfoVersion: "3",
                    version: "v4",
                    features: [{ name: "app_only_install" }],
                },
            }
        );
    };

    // Disconnect one number (phoneNumberId given) or all (omitted). After either,
    // re-read the status so the list + primary reflect what's left.
    const handleDisconnectWhatsApp = async (phoneNumberId?: string) => {
        if (!userData) return;
        const single = !!phoneNumberId && wabaNumbers.length > 1;
        const msg = single
            ? "Disconnect this number? Your other numbers stay connected."
            : "Disconnect your WhatsApp Business Account? You can reconnect anytime.";
        if (!confirm(msg)) return;

        setIsWabaLoading(true);
        try {
            const res = await fetch("/api/whatsapp/meta/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partnerId: userData.id,
                    ...(phoneNumberId ? { phoneNumberId } : {}),
                }),
            });
            if (res.ok) {
                toast.success("WhatsApp disconnected");
                await checkWhatsAppConnection(userData.id);
            } else {
                toast.error("Failed to disconnect");
            }
        } catch {
            toast.error("Failed to disconnect");
        } finally {
            setIsWabaLoading(false);
        }
    };

    // Turn automated flows (auto-replies) ON/OFF for a specific number. Inbound
    // messages are still recorded to the inbox when off — only auto-replies stop.
    const handleToggleFlow = async (phoneNumberId: string, enabled: boolean) => {
        if (!userData) return;
        // Optimistic flip so the switch feels instant.
        setWabaNumbers((prev) =>
            prev.map((n) =>
                n.phone_number_id === phoneNumberId ? { ...n, flow_enabled: enabled } : n,
            ),
        );
        try {
            const res = await fetch("/api/whatsapp/meta/set-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partnerId: userData.id, phoneNumberId, enabled }),
            });
            if (!res.ok) throw new Error();
            toast.success(enabled ? "Flows turned on for this number" : "Flows turned off for this number");
        } catch {
            // Roll back on failure.
            setWabaNumbers((prev) =>
                prev.map((n) =>
                    n.phone_number_id === phoneNumberId ? { ...n, flow_enabled: !enabled } : n,
                ),
            );
            toast.error("Failed to update flow setting");
        }
    };

    // Make a number the default sender (order/loyalty notifications, OTP, the
    // storefront "message us" link, and the broadcast default all use it).
    const handleSetPrimaryWhatsApp = async (phoneNumberId: string) => {
        if (!userData) return;
        setIsWabaLoading(true);
        try {
            const res = await fetch("/api/whatsapp/meta/set-primary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partnerId: userData.id, phoneNumberId }),
            });
            if (res.ok) {
                toast.success("Default sender updated");
                await checkWhatsAppConnection(userData.id);
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d?.error || "Failed to update default sender");
            }
        } catch {
            toast.error("Failed to update default sender");
        } finally {
            setIsWabaLoading(false);
        }
    };

    const handleWhatsAppModeChange = async (mode: "menuthere" | "own") => {
        setWhatsappMode(mode);
        if (!userData) return;
        try {
            await updatePartner(userData.id, { whatsapp_integration_mode: mode });
            setState({ whatsapp_integration_mode: mode } as any);
        } catch {
            // silent — non-critical
        }
    };

    // Keep the OTP-sender toggle in sync with the loaded partner.
    useEffect(() => {
        setOtpSender((userData as any)?.otp_sender === "own" ? "own" : "menuthere");
    }, [(userData as any)?.otp_sender]);

    const handleOtpSenderChange = async (mode: "menuthere" | "own") => {
        setOtpSender(mode);
        if (!userData) return;
        try {
            await updatePartner(userData.id, { otp_sender: mode });
            setState({ otp_sender: mode } as any);
        } catch {
            // silent — non-critical
        }
    };

    // Keep the GTM input in sync with the loaded partner.
    useEffect(() => {
        setGtmId((userData as any)?.gtm_container_id ?? "");
    }, [(userData as any)?.gtm_container_id]);

    // Save the partner's GTM container. Accepts a bare id, a pasted install
    // snippet, or a URL — we pull GTM-XXXX out. The strict regex is enforced
    // here AND in <PartnerGtm> (the value is injected into an inline script).
    const handleSaveGtm = async () => {
        if (!userData) return;
        const GTM_RE = /^GTM-[A-Z0-9]{4,12}$/;
        const matched = gtmId.toUpperCase().match(/GTM-[A-Z0-9]{4,12}/);
        const value = gtmId.trim() === "" ? "" : matched ? matched[0] : gtmId.trim().toUpperCase();
        if (value !== "" && !GTM_RE.test(value)) {
            toast.error("Enter a valid container ID, e.g. GTM-XXXXXXX (not a G-… or AW-… id)");
            return;
        }
        const toSave = value === "" ? null : value;
        try {
            setSavingGtm(true);
            setGtmId(value);
            await updatePartner(userData.id, { gtm_container_id: toSave });
            setState({ gtm_container_id: toSave } as any);
            // Bust the namespaced per-partner GTM layout cache (tagged
            // `partner-gtm:${username}`). We intentionally do NOT bust the
            // partner-UUID tag: GTM isn't stored in that cache, and a UUID tag
            // would fire an IndexNow/Bing re-crawl for an analytics-only change.
            const uname = (userData as any).username;
            if (uname) await revalidateTag(`partner-gtm:${uname}`);
            toast.success(toSave ? "Google Tag Manager connected" : "Google Tag Manager removed");
        } catch {
            toast.error("Failed to save Google Tag Manager container");
        } finally {
            setSavingGtm(false);
        }
    };

    // ─── Batched save for Delivery Platform links only ─────────────
    // Google + WhatsApp persist immediately via their own handlers; this
    // batched save only owns the 4 delivery-platform social-link keys and
    // preserves every other social_links key (instagram/facebook/etc.).
    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            const existingSocialLinks = getSocialLinks(userData as HotelData);
            const social_links = {
                ...existingSocialLinks,
                zomato: zomatoLink,
                uberEats: uberEatsLink,
                talabat: talabatLink,
                doordash: doordashLink,
            };
            await updatePartner(userData.id, { social_links });
            await revalidateTag(userData.id);
            setState({ social_links } as any);
            toast.success("Integration settings saved");
        } catch (error) {
            console.error("Error saving integration settings:", error);
            toast.error("Failed to save integration settings");
        }
    }, [userData, zomatoLink, uberEatsLink, talabatLink, doordashLink, setState]);

    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    // Delivery-platform links card is commented out below, so there's nothing to
    // batch-save here (Google/WhatsApp save immediately via their own flows).
    // Re-enable this registration if the platform-links card is restored.
    // useEffect(() => {
    //     if (userData?.role !== "partner") return;
    //     setHasChanges(true);
    //     setSaveAction(handleSave);
    //     return () => {
    //         setSaveAction(null);
    //         setHasChanges(false);
    //     };
    // }, [userData?.role, handleSave, setSaveAction, setHasChanges]);
    void handleSave;
    void setSaveAction;
    void setHasChanges;

    return (
        <div className="space-y-6">
            <div className="grid gap-6">
                {/* Delivery Platforms card hidden — not needed for now.
                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Platforms</CardTitle>
                        <CardDescription>Add links to your delivery partner pages so customers can order from their preferred platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Zomato</Label>
                                <Input value={zomatoLink} onChange={(e) => setZomatoLink(e.target.value)} placeholder="https://zomato.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Uber Eats</Label>
                                <Input value={uberEatsLink} onChange={(e) => setUberEatsLink(e.target.value)} placeholder="https://ubereats.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Talabat</Label>
                                <Input value={talabatLink} onChange={(e) => setTalabatLink(e.target.value)} placeholder="https://talabat.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>DoorDash</Label>
                                <Input value={doordashLink} onChange={(e) => setDoordashLink(e.target.value)} placeholder="https://doordash.com/..." />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                */}

                <Card className="relative order-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CardTitle>Google Business Profile</CardTitle>
                            {isOnFreePlan && <Lock className="h-4 w-4 text-orange-600" />}
                        </div>
                        <CardDescription>Connect your Google Business Profile to sync your menu and orders.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isOnFreePlan ? (
                            <UpgradePrompt
                                variant="card"
                                feature="Google Business Sync"
                                description="Upgrade to sync your menu with Google Business Profile."
                            />
                        ) : !googleConnected ? (
                            <div className="flex flex-col gap-4">
                                {googleError && !/quota exceeded|ratelimitexceeded|resource_exhausted/i.test(googleError) && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                                        <p className="text-sm font-medium text-red-800">
                                            {googleHasTokens ? "Google account linked, but we couldn't load your business profile" : "Google connection failed"}
                                        </p>
                                        <p className="text-xs text-red-700 break-words">{googleError}</p>
                                        {/no google business accounts/i.test(googleError) && (
                                            <p className="text-xs text-red-700 pt-1">
                                                You don't have a Google Business Profile yet. Create or claim one at{" "}
                                                <a href="https://business.google.com/create" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                                                    business.google.com
                                                </a>
                                                , then click "Re-link Business Profile" below.
                                            </p>
                                        )}
                                    </div>
                                )}
                                <p className="text-sm text-muted-foreground">Link your Google account to allow Menuthere to manage your menu automatically.</p>
                                <Button disabled={isGoogleLoading} onClick={handleGoogleLogin} className="w-full sm:w-auto">
                                    {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {googleHasTokens ? "Re-link Business Profile" : "Link Business Profile"}
                                </Button>
                            </div>
                        ) : linkedLocationId ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <Img src="https://www.gstatic.com/images/branding/product/1x/google_my_business_48dp.png" alt="GMB" className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-green-800">Connected & Linked</p>
                                        <p className="text-sm text-green-700">Your restaurant is linked. Menu sync is active.</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSyncMenu}
                                    disabled={isSyncingMenu}
                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isSyncingMenu ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Sync Menu Now
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Your Restaurant Location</Label>
                                    <Select value={selectedGoogleLocation} onValueChange={setSelectedGoogleLocation}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {googleLocations.map((loc: any) => (
                                                <SelectItem key={loc.name} value={loc.name}>
                                                    {loc.title} ({loc.storeCode || 'No Code'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleSendInvite}
                                    disabled={!selectedGoogleLocation || isGoogleLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Give Management Access
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    This will invite our MenuThere admin as manager of your Google Business location. Once we accept, your store joins the MenuThere organisation and we can sync your menu.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* WhatsApp Business Integration — shown first */}
                <Card className="relative order-1">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CardTitle>WhatsApp Business</CardTitle>
                            {isOnFreePlan && <Lock className="h-4 w-4 text-orange-600" />}
                        </div>
                        <CardDescription>
                            Choose how to send WhatsApp messages to your customers — use Menuthere's shared WhatsApp or connect your own business number.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isOnFreePlan ? (
                            <UpgradePrompt
                                variant="card"
                                feature="WhatsApp Business Integration"
                                description="Upgrade to connect your own WhatsApp Business account."
                            />
                        ) : isWabaLoading ? (
                            <div className="flex items-center gap-2 py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Checking connection...</span>
                            </div>
                        ) : (
                            <>
                                {/* Option Selection */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {/* Option 1: Use Menuthere's WhatsApp */}
                                    <button
                                        type="button"
                                        onClick={() => handleWhatsAppModeChange("menuthere")}
                                        className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                                            whatsappMode === "menuthere"
                                                ? "border-green-500 bg-green-50"
                                                : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                    >
                                        {whatsappMode === "menuthere" && (
                                            <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />
                                        )}
                                        <div className="flex items-center gap-2">
                                            <MessageCircle className="h-5 w-5 text-green-600" />
                                            <span className="font-semibold text-sm">Use Menuthere&apos;s WhatsApp</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Messages are sent from Menuthere&apos;s shared number. No setup needed — works instantly.
                                        </p>
                                    </button>

                                    {/* Option 2: Connect Own WhatsApp */}
                                    <button
                                        type="button"
                                        onClick={() => handleWhatsAppModeChange("own")}
                                        className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                                            whatsappMode === "own"
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                    >
                                        {whatsappMode === "own" && (
                                            <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-blue-600" />
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Unplug className="h-5 w-5 text-blue-600" />
                                            <span className="font-semibold text-sm">Connect Your Own WhatsApp</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Messages are sent from your own WhatsApp Business number. Customers see your brand.
                                        </p>
                                    </button>
                                </div>

                                {/* Show connect/status based on selected mode */}
                                {whatsappMode === "own" && (
                                    <div className="mt-2">
                                        {wabaConnected && wabaNumbers.length > 0 ? (
                                            <div className="space-y-3">
                                                {/* One row per connected number */}
                                                <div className="space-y-2">
                                                    {wabaNumbers.map((n) => (
                                                        <div
                                                            key={n.id}
                                                            className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3"
                                                        >
                                                            <div className="rounded-full bg-green-100 p-2">
                                                                <MessageCircle className="h-5 w-5 text-green-600" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-semibold text-green-800 truncate">
                                                                        {n.display_phone || n.phone_number_id}
                                                                    </p>
                                                                    {n.is_primary && (
                                                                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border border-green-300 bg-green-100 text-green-800">
                                                                            Default sender
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {!n.is_primary && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSetPrimaryWhatsApp(n.phone_number_id)}
                                                                        disabled={isWabaLoading}
                                                                        className="text-xs text-blue-700 hover:underline mt-0.5 disabled:opacity-50"
                                                                    >
                                                                        Make default sender
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                                                                <span className="text-[10px] font-medium text-muted-foreground">Flows</span>
                                                                <Switch
                                                                    checked={n.flow_enabled !== false}
                                                                    onCheckedChange={(v) => handleToggleFlow(n.phone_number_id, v)}
                                                                    title={n.flow_enabled !== false ? "Auto-replies are ON for this number" : "Auto-replies are OFF for this number"}
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDisconnectWhatsApp(n.phone_number_id)}
                                                                disabled={isWabaLoading}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                                                                title="Disconnect this number"
                                                            >
                                                                <Unplug className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {wabaNumbers.length > 1 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Customers who message any of these numbers get replies from that
                                                        same number. The <b>default sender</b> is used for order &amp;
                                                        loyalty notifications, OTP, and the storefront link.
                                                    </p>
                                                )}

                                                <WhatsAppHealthStatus partnerId={userData?.id} />

                                                <Button
                                                    onClick={handleConnectWhatsApp}
                                                    disabled={isWabaLoading}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    {isWabaLoading ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <MessageCircle className="mr-2 h-4 w-4" />
                                                    )}
                                                    Connect another number
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground">
                                                    Connect your WhatsApp Business Account via Meta. You&apos;ll be guided through the setup process.
                                                </p>
                                                <Button
                                                    onClick={handleConnectWhatsApp}
                                                    disabled={isWabaLoading}
                                                    className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                                                >
                                                    {isWabaLoading ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <MessageCircle className="mr-2 h-4 w-4" />
                                                    )}
                                                    Connect WhatsApp Business
                                                </Button>
                                                <p className="text-xs text-muted-foreground">
                                                    You&apos;ll need a Meta Business Account and a WhatsApp Business phone number.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {whatsappMode === "menuthere" && (
                                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                        <p className="text-sm text-green-800">
                                            Active — Order notifications will be sent via Menuthere&apos;s WhatsApp.
                                        </p>
                                    </div>
                                )}

                                {/* Login OTP sender — only when their own WhatsApp is connected */}
                                {wabaConnected && (
                                    <div className="mt-2 space-y-3 border-t pt-4">
                                        <div>
                                            <p className="text-sm font-semibold">Login OTP sender</p>
                                            <p className="text-xs text-muted-foreground">
                                                Choose which WhatsApp number sends the login verification code (OTP) to your customers.
                                            </p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOtpSenderChange("menuthere")}
                                                className={`relative flex flex-col gap-1.5 rounded-lg border-2 p-3 text-left transition-all ${
                                                    otpSender === "menuthere"
                                                        ? "border-green-500 bg-green-50"
                                                        : "border-muted hover:border-muted-foreground/30"
                                                }`}
                                            >
                                                {otpSender === "menuthere" && (
                                                    <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />
                                                )}
                                                <span className="text-sm font-semibold">Menuthere (default)</span>
                                                <p className="text-xs text-muted-foreground">
                                                    OTP is sent from Menuthere&apos;s shared WhatsApp number.
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOtpSenderChange("own")}
                                                className={`relative flex flex-col gap-1.5 rounded-lg border-2 p-3 text-left transition-all ${
                                                    otpSender === "own"
                                                        ? "border-blue-500 bg-blue-50"
                                                        : "border-muted hover:border-muted-foreground/30"
                                                }`}
                                            >
                                                {otpSender === "own" && (
                                                    <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-blue-600" />
                                                )}
                                                <span className="text-sm font-semibold">Your WhatsApp</span>
                                                <p className="text-xs text-muted-foreground">
                                                    OTP is sent from your own connected number
                                                    {wabaPhoneNumber ? ` (${wabaPhoneNumber})` : ""}.
                                                </p>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Google Tag Manager — partner connects their own container.
                    Not plan-gated (standard free analytics integration). */}
                <Card className="relative order-3">
                    <CardHeader>
                        <CardTitle>Google Tag Manager</CardTitle>
                        <CardDescription>
                            Load your own Google Tag Manager container on your storefront to run your analytics, ads and pixels.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="gtm-id">Container ID</Label>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Input
                                    id="gtm-id"
                                    value={gtmId}
                                    onChange={(e) => setGtmId(e.target.value)}
                                    placeholder="GTM-XXXXXXX"
                                    className="font-mono sm:max-w-xs"
                                />
                                <Button onClick={handleSaveGtm} disabled={savingGtm} className="w-full sm:w-auto">
                                    {savingGtm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Paste your container ID (<span className="font-mono">GTM-XXXXXXX</span>) or the full install snippet — we&apos;ll pull the ID out. This is your Tag Manager container, not a <span className="font-mono">G-…</span> (GA4) or <span className="font-mono">AW-…</span> (Ads) ID. It loads on your storefront and custom domain.
                        </p>
                        {(userData as any)?.gtm_container_id ? (
                            <p className="flex items-center gap-1 text-xs text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Active on your storefront
                            </p>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
