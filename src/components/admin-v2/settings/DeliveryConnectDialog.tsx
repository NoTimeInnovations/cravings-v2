"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { sendDeliveryOtp, verifyDeliveryOtp } from "@/app/actions/deliveryConnect";
import type { ConnectProvider, VerifyOtpSuccess } from "@/lib/deliveryBridgeTypes";

const LABELS: Record<ConnectProvider, string> = {
    porter: "Porter",
    rapido: "Rapido",
};

export function DeliveryConnectDialog({
    open,
    onOpenChange,
    provider,
    partnerId,
    storeName,
    city,
    coords,
    initialMobile,
    onConnected,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    provider: ConnectProvider;
    partnerId: string;
    storeName?: string;
    city?: string;
    coords?: { lat: number; lng: number };
    initialMobile?: string;
    onConnected: (result: VerifyOtpSuccess) => void;
}) {
    const [step, setStep] = useState<"mobile" | "otp">("mobile");
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Reset each time the dialog (re)opens.
    useEffect(() => {
        if (open) {
            setStep("mobile");
            setMobile((initialMobile || "").replace(/\D/g, "").slice(-10));
            setOtp("");
            setSending(false);
            setVerifying(false);
        }
    }, [open, initialMobile]);

    const label = LABELS[provider];

    const handleSend = async () => {
        const m = mobile.replace(/\D/g, "");
        if (m.length !== 10 || !/^[6-9]/.test(m)) {
            toast.error("Enter a valid 10-digit mobile number");
            return;
        }
        setSending(true);
        try {
            const res = await sendDeliveryOtp({ partnerId, provider, mobile: m, storeName, city, coords });
            if (!res.ok) {
                toast.error(res.message);
                return;
            }
            toast.success(`OTP sent to ${m}`);
            setStep("otp");
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async () => {
        const code = otp.replace(/\D/g, "");
        if (code.length < 4) {
            toast.error("Enter the OTP you received");
            return;
        }
        setVerifying(true);
        try {
            const res = await verifyDeliveryOtp({
                partnerId,
                provider,
                mobile: mobile.replace(/\D/g, ""),
                otp: code,
                storeName,
            });
            if (!res.ok) {
                toast.error(res.message);
                return;
            }
            toast.success(`${label} connected · group ${res.group}`);
            onConnected(res);
            onOpenChange(false);
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-orange-600" />
                        Connect {label}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "mobile"
                            ? `Log in the ${label} account this store dispatches from. We'll send an OTP to the number.`
                            : `Enter the OTP ${label} just sent to ${mobile}.`}
                    </DialogDescription>
                </DialogHeader>

                {step === "mobile" ? (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>{label} account mobile</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">+91</span>
                                <Input
                                    value={mobile}
                                    onChange={(e) =>
                                        setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                                    }
                                    inputMode="numeric"
                                    placeholder="10-digit number"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Once connected, the dispatch group is set automatically to the first 5
                                digits of this number.
                            </p>
                        </div>
                        <Button onClick={handleSend} disabled={sending} className="w-full">
                            {sending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Send OTP
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>OTP</Label>
                            <Input
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                inputMode="numeric"
                                placeholder="Enter OTP"
                                autoFocus
                                className="text-center text-lg tracking-[0.3em]"
                            />
                        </div>
                        <Button onClick={handleVerify} disabled={verifying} className="w-full">
                            {verifying ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Verify &amp; Connect
                        </Button>
                        <div className="flex items-center justify-between text-xs">
                            <button
                                type="button"
                                onClick={() => setStep("mobile")}
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-3 w-3" /> Change number
                            </button>
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={sending}
                                className="text-orange-600 hover:underline disabled:opacity-50"
                            >
                                {sending ? "Resending…" : "Resend OTP"}
                            </button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
