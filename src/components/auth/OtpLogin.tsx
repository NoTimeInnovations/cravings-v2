"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sendOtpAction, verifyOtpAction } from "@/app/actions/otp";
import { Loader2 } from "lucide-react";

interface OtpLoginProps {
    onLoginSuccess: (phoneNumber: string) => Promise<void>;
    defaultPhone?: string;
}

export default function OtpLogin({ onLoginSuccess, defaultPhone = "", storeName }: OtpLoginProps & { storeName?: string | null }) {
    const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const handleSendOtp = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (phoneNumber.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        setIsLoading(true);
        // Clear previous OTP if this is a resend
        setOtp("");

        try {
            const res = await sendOtpAction(phoneNumber, storeName || "");
            if (res.success) {
                toast.success(res.message);
                setStep("otp");
                // Start simple timer for resend
                setResendTimer(30);
                // Clear any existing timer if needed, but here we just start a new one
                // potentially we should clear interval on unmount but for now this is fine
                const timer = setInterval(() => {
                    setResendTimer((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Failed to send OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 4) {
            toast.error("Please enter a valid 4-digit OTP");
            return;
        }

        setIsLoading(true);
        try {
            const res = await verifyOtpAction(phoneNumber, otp);
            if (res.success) {
                toast.success("OTP Verification Successful");
                toast.info("Logging in...");
                await onLoginSuccess(phoneNumber);
            } else {
                toast.error("Invalid OTP");
                setOtp(""); // Clear OTP on invalid
            }
        } catch (error) {
            toast.error("Verification failed");
            setOtp(""); // Clear OTP on error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            {step === "phone" ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="phone-otp" className="text-sm font-medium text-gray-700 ml-1">
                            Phone Number
                        </Label>
                        <div className="flex gap-3">
                            <div className="flex items-center justify-center w-14 bg-gray-50 border border-gray-200 rounded-lg text-base font-medium text-gray-600">
                                +91
                            </div>
                            <Input
                                id="phone-otp"
                                type="tel"
                                placeholder="9000000000"
                                value={phoneNumber}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    setPhoneNumber(val);
                                }}
                                className="flex-1 h-10 text-base bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200"
                                autoFocus
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        className="w-full h-10 bg-black hover:bg-gray-900 text-white rounded-lg font-semibold shadow-sm text-sm transition-all duration-200"
                        disabled={isLoading || phoneNumber.length !== 10}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Get OTP on WhatsApp"}
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="space-y-6 flex flex-col items-center w-full">
                        <div className="text-center space-y-2">
                            <p className="text-sm text-gray-500">
                                Code sent to <span className="font-medium text-gray-900">+91 {phoneNumber}</span> via WhatsApp
                            </p>
                        </div>

                        <InputOTP
                            maxLength={4}
                            value={otp}
                            onChange={(value: string) => setOtp(value)}
                        >
                            <InputOTPGroup className="gap-3 sm:gap-4">
                                <InputOTPSlot
                                    index={0}
                                    className="w-12 h-14 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200 bg-gray-50/50"
                                />
                                <InputOTPSlot
                                    index={1}
                                    className="w-12 h-14 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200 bg-gray-50/50"
                                />
                                <InputOTPSlot
                                    index={2}
                                    className="w-12 h-14 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200 bg-gray-50/50"
                                />
                                <InputOTPSlot
                                    index={3}
                                    className="w-12 h-14 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200 bg-gray-50/50"
                                />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-10 bg-black hover:bg-gray-900 text-white rounded-lg font-semibold shadow-sm text-sm active:scale-[0.98] transition-all duration-200"
                        disabled={isLoading || otp.length !== 4}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Proceed"}
                    </Button>

                    <div className="flex items-center justify-between text-sm px-2">
                        <button
                            type="button"
                            onClick={() => setStep("phone")}
                            className="text-gray-500 hover:text-gray-900 font-medium transition-colors"
                        >
                            Change Number
                        </button>

                        {resendTimer > 0 ? (
                            <span className="text-gray-400 font-medium">Resend in {resendTimer}s</span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleSendOtp()}
                                className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                                disabled={isLoading}
                            >
                                Resend OTP
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}
