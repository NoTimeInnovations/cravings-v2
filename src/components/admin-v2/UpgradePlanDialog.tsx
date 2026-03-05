"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore, Partner } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
    createSubscriptionAction,
    verifySubscriptionAction,
} from "@/app/actions/razorpay_payments";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { Check, Crown, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

type UpgradePlanDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    featureName?: string;
};

type PlanVariant = {
    id: string;
    name: string;
    price: string;
    type: "monthly" | "yearly";
    rz_plan_id: string;
    savings?: string;
};

type StandardPlan = {
    description: string;
    features: string[];
    monthly: PlanVariant;
    yearly: PlanVariant;
};

const indiaPlan: StandardPlan = {
    description: "Essential, contactless digital menu for your restaurant",
    features: [
        "Digital menu",
        "Unlimited items",
        "QR code generation",
        "Unlimited edits",
        "Manage availability",
        "Manage priority",
        "Google menu sync",
        "Chat support",
    ],
    monthly: {
        id: "in_digital_monthly",
        name: "Digital Menu Monthly",
        price: "299",
        type: "monthly",
        rz_plan_id: "plan_S7E5JO7kPtwGnA",
    },
    yearly: {
        id: "in_digital",
        name: "Digital Menu Yearly",
        price: "2999",
        type: "yearly",
        rz_plan_id: "plan_S7EEdzZoy456iP",
        savings: "Save ₹589",
    },
};

const internationalPlan: StandardPlan = {
    description: "Essential digital menu for your restaurant",
    features: [
        "Digital menu",
        "Unlimited items",
        "QR code generation",
        "Unlimited edits",
        "Manage availability",
        "Manage priority",
        "Google menu sync",
        "Priority chat support",
    ],
    monthly: {
        id: "int_digital_monthly",
        name: "Digital Menu Monthly",
        price: "19",
        type: "monthly",
        rz_plan_id: "plan_SIjWQgXZj9I2Vx",
    },
    yearly: {
        id: "int_digital",
        name: "Digital Menu Yearly",
        price: "190",
        type: "yearly",
        rz_plan_id: "plan_SIjXPD8frrA8TZ",
        savings: "Save $38",
    },
};

declare global {
    interface Window {
        Razorpay: any;
    }
}

export function UpgradePlanDialog({ open, onOpenChange, featureName }: UpgradePlanDialogProps) {
    const { userData } = useAuthStore();
    const router = useRouter();
    const partner = userData as Partner;
    // Use partner's country when available, fall back to localStorage (Cloudflare)
    const partnerCountry = (partner as any)?.country;
    const [countryCode, setCountryCode] = useState("IN");

    useEffect(() => {
        if (partnerCountry) {
            setCountryCode(partnerCountry === "India" ? "IN" : "OTHER");
            return;
        }
        try {
            const stored = localStorage.getItem("user-country-info");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.countryCode) setCountryCode(parsed.countryCode);
            }
        } catch {}
    }, [partnerCountry]);

    const isIndia = countryCode === "IN";
    const plan = isIndia ? indiaPlan : internationalPlan;
    const currencySymbol = isIndia ? "₹" : "$";
    const [isAnnual, setIsAnnual] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState<string | null>(null);


    const activeVariant = isAnnual ? plan.yearly : plan.monthly;
    const currentPlanId = partner?.subscription_details?.plan?.id;
    const isCurrent = currentPlanId === activeVariant.id;

    const handlePayment = async () => {
        if (!activeVariant.rz_plan_id || !userData) return;

        setIsLoading(true);
        setLoadingText("Initializing Secure Payment...");

        try {
            const response = await createSubscriptionAction(
                activeVariant.id,
                activeVariant.rz_plan_id,
                userData.id,
                (userData as any).store_name,
            );

            if (!response.success || !response.subscription_id) {
                toast.error("Could not initiate payment. Please contact support.");
                setIsLoading(false);
                return;
            }

            const options = {
                key: response.key_id,
                subscription_id: response.subscription_id,
                name: "Menuthere App",
                description: `Upgrade to ${activeVariant.name}`,
                handler: async function (res: any) {
                    setLoadingText("Verifying Payment...");
                    const verifyRes = await verifySubscriptionAction(
                        res.razorpay_payment_id,
                        res.razorpay_subscription_id,
                        res.razorpay_signature,
                        userData.id,
                        {
                            id: activeVariant.id,
                            name: activeVariant.name,
                            rz_plan_id: activeVariant.rz_plan_id,
                            price: activeVariant.price,
                            period_days: isAnnual ? 365 : 30,
                        },
                    );
                    if (verifyRes.success) {
                        toast.success("Upgrade Successful! Welcome to " + activeVariant.name);
                        router.push("/admin-v2");
                    } else {
                        toast.error("Payment verification failed. Please contact support.");
                        setIsLoading(false);
                    }
                },
                prefill: {
                    name: (userData as any).name || "",
                    email: (userData as any).email || "",
                    contact: (userData as any).phone || "",
                },
                theme: { color: "#EA580C" },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (res: any) {
                toast.error(res.error.description);
                setIsLoading(false);
            });
            rzp.open();
        } catch (error) {
            console.error("Payment Error", error);
            toast.error("Something went wrong with payment");
            setIsLoading(false);
        }
    };

    const description = featureName
        ? `${featureName} is a premium feature. Upgrade to unlock it.`
        : "Upgrade to unlock premium features.";

    const isDesktop = useMediaQuery("(min-width: 640px)");

    const toggle = (
        <div className="flex items-center justify-center gap-3 mb-5">
            <span className={cn("text-sm font-medium transition-colors", !isAnnual ? "text-foreground" : "text-muted-foreground")}>
                Monthly
            </span>
            <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
                    isAnnual ? "bg-orange-600" : "bg-gray-300 dark:bg-gray-600",
                )}
            >
                <span className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                    isAnnual ? "translate-x-[22px]" : "translate-x-[2px]",
                )} />
            </button>
            <span className={cn("text-sm font-medium transition-colors", isAnnual ? "text-foreground" : "text-muted-foreground")}>
                Annual
            </span>
        </div>
    );

    const planCard = (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                        {currencySymbol}{activeVariant.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {isAnnual ? "/year" : "/month"}
                    </span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                    {isAnnual
                        ? `${currencySymbol}${Math.round(Number(activeVariant.price) / 12)}/mo`
                        : `${currencySymbol}${Number(activeVariant.price) * 12}/yr`}
                </span>
            </div>
            <div>
                {activeVariant.savings && (
                    <span className="inline-block text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                        {activeVariant.savings}
                    </span>
                )}
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
            </div>
            <div className="space-y-2.5">
                {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-sm text-foreground">{feature}</span>
                    </div>
                ))}
            </div>
            <Button
                onClick={handlePayment}
                disabled={isCurrent}
                className={cn(
                    "w-full h-12 text-sm font-semibold rounded-xl",
                    isCurrent ? "" : "bg-orange-600 hover:bg-orange-700 text-white",
                )}
            >
                {isCurrent ? "Current Plan" : "Upgrade Now"}
            </Button>
        </div>
    );

    return (
        <>
            <FullScreenLoader
                isLoading={isLoading}
                loadingTexts={loadingText ? [loadingText] : ["Processing..."]}
            />
            {open && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 animate-[fadeIn_200ms_ease-out]"
                        onClick={() => onOpenChange(false)}
                    />

                    {isDesktop ? (
                        /* Desktop: centered dialog */
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6 pointer-events-auto animate-[scaleIn_200ms_ease-out]">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="flex items-center gap-2 text-lg font-bold">
                                        <Crown className="h-5 w-5 text-yellow-500" />
                                        Upgrade to Standard
                                    </h2>
                                    <button
                                        onClick={() => onOpenChange(false)}
                                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <X className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>
                                <p className="text-sm text-muted-foreground mb-5">{description}</p>
                                {toggle}
                                {planCard}
                            </div>
                        </div>
                    ) : (
                        /* Mobile: bottom sheet */
                        <div className="absolute bottom-0 left-0 right-0 z-10 animate-[slideUp_300ms_ease-out]">
                            <div className="bg-background rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] max-h-[90dvh] overflow-y-auto">
                                <div className="flex justify-center pt-3 pb-1">
                                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                </div>
                                <div className="px-5 pb-6">
                                    <div className="flex items-center justify-between mb-1">
                                        <h2 className="flex items-center gap-2 text-lg font-bold">
                                            <Crown className="h-5 w-5 text-yellow-500" />
                                            Upgrade to Standard
                                        </h2>
                                        <button
                                            onClick={() => onOpenChange(false)}
                                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <X className="h-5 w-5 text-gray-500" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-5">{description}</p>
                                    {toggle}
                                    {planCard}
                                </div>
                                <div className="h-safe-area-bottom" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
}
