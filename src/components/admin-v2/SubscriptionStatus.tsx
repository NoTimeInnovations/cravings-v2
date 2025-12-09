import React, { useState } from "react";
import { Partner, useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Crown, AlertTriangle, ShieldCheck } from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PricingSection from "@/components/international/PricingSection";
import { toast } from "sonner";

export function SubscriptionStatus() {
    const { userData } = useAuthStore();
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const sub = userData?.role === "partner" ? userData.subscription_details : undefined;
    const planName = sub?.plan?.name || "Free Trial";
    const status = sub?.status || "active";
    const expiry = sub?.expiryDate ? parseISO(sub.expiryDate) : null;
    const scansUsed = sub?.usage?.scans_cycle || 0;
    // Check both scan_limit and max_scan_count (international plans might use max_scan_count)
    const scanLimit = sub?.plan?.scan_limit ?? sub?.plan?.max_scan_count ?? 1000;
    const isUnlimited = scanLimit === -1;

    const usagePercent = isUnlimited ? 0 : Math.min(100, (scansUsed / scanLimit) * 100);

    const daysLeft = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const handleCancelRequest = async () => {
        setLoading(true);
        try {
            // API call to send email to admin
            const res = await fetch("/api/email/cancel-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partnerId: userData?.id, reason: "User requested via dashboard" })
            });

            if (res.ok) {
                toast.success("Cancellation request sent. Our team will contact you shortly.");
                setIsCancelOpen(false);
            } else {
                throw new Error("Failed to send request");
            }
        } catch (error) {
            toast.error("Could not send request. Please contact support@cravings.live");
        } finally {
            setLoading(false);
        }
    };

    const isInternational = userData?.role === "partner" && userData.country !== "IN";
    const isInternationalPlan = sub?.plan?.id?.startsWith("int_");

    return (
        <Card className="mb-6 border-orange-100 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-900">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                    {/* Plan Info */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{planName}</h3>
                            <Badge variant={status === "active" ? "default" : "destructive"} className={status === "active" ? "bg-green-600" : ""}>
                                {status.toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>Expires {expiry ? format(expiry, "PPP") : "Never"} ({daysLeft} days left)</span>
                        </div>
                    </div>

                    {/* Usage Stats - Show Scan Limit for everyone, Usage only for International */}
                    <div className="flex-1 w-full md:w-auto max-w-md space-y-2">
                        <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                            <span>{isInternational && isInternationalPlan ? "Monthly Scans" : "Monthly Scan Limit"}</span>
                            <span>
                                {isInternational && isInternationalPlan
                                    ? `${scansUsed} / ${isUnlimited ? "Unlimited" : scanLimit}`
                                    : `${isUnlimited ? "Unlimited" : scanLimit}`
                                }
                            </span>
                        </div>
                        {isInternational && isInternationalPlan && !isUnlimited && (
                            <>
                                <Progress value={usagePercent} className="h-2" color={usagePercent > 90 ? "bg-red-500" : "bg-orange-500"} />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Resets on 1st of every month</p>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-700 dark:hover:bg-orange-600">
                                    Upgrade Plan
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Upgrade Your Plan</DialogTitle>
                                    <DialogDescription>Choose a plan that fits your needs</DialogDescription>
                                </DialogHeader>
                                {/* Reuse PricingSection but we need to modify it to handle 'upgrade' mode vs 'signup' mode */}
                                {/* For now, just rendering it. We might need to pass a prop 'mode="upgrade"' */}
                                <PricingSection hideHeader country={(userData as Partner)?.country || "IN"} />
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/20 dark:hover:bg-red-900/30">
                                    Cancel Plan
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Cancel Subscription</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to cancel? This will downgrade your account at the end of the billing period.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Please note that refunds are processed manually. A request will be sent to our support team.
                                    </p>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={handleCancelRequest}
                                        disabled={loading}
                                    >
                                        {loading ? "Sending Request..." : "Confirm Cancellation"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
