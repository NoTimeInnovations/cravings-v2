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
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SubscriptionStatus() {
    const { userData } = useAuthStore();
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [scansUsed, setScansUsed] = useState(0);

    const sub = userData?.role === "partner" ? userData.subscription_details : undefined;
    const planName = sub?.plan?.name || "Free Trial";

    // Date calculation
    const expiry = sub?.expiryDate ? parseISO(sub.expiryDate) : null;
    const daysLeft = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isExpired = daysLeft < 0;

    // Status logic: if expired calculate locally, otherwise use DB status
    const dbStatus = sub?.status || "active";
    const status = isExpired ? "expired" : dbStatus;

    const scanLimit = sub?.plan?.scan_limit ?? sub?.plan?.max_scan_count ?? 1000;
    const isUnlimited = scanLimit === -1;

    // Calculate percentage based on state-based scansUsed
    const usagePercent = isUnlimited ? 0 : Math.min(100, (scansUsed / scanLimit) * 100);

    const handleCancelRequest = async () => {
        setLoading(true);
        // Mock cancellation request
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        setIsCancelOpen(false);
        toast.info("Cancellation request sent to support.");
    };

    const isInternational = userData?.role === "partner" && userData.country !== "IN";
    const isInternationalPlan = userData?.role === "partner" && userData?.subscription_details?.plan?.id?.startsWith("int_");

    useEffect(() => {
        if (!userData?.id || !isInternational) return;

        const fetchScans = async () => {
            const GET_PARTNER_TOTAL_SCANS = `
              query GetPartnerTotalScans($partner_id: uuid!) {
                qr_codes_aggregate(where: {partner_id: {_eq: $partner_id}}) {
                  aggregate {
                    sum {
                      no_of_scans
                    }
                  }
                }
              }
            `;
            try {
                const res = await fetchFromHasura(GET_PARTNER_TOTAL_SCANS, { partner_id: userData.id });
                setScansUsed(res?.qr_codes_aggregate?.aggregate?.sum?.no_of_scans || 0);
            } catch (e) {
                console.error("Failed to fetch scan stats", e);
            }
        };
        fetchScans();
    }, [userData?.id, isInternational]);

    return (
        <div className="space-y-4 mb-6">
            {isExpired && (
                <Alert variant="destructive" className="border-red-600 text-red-700 [&>svg]:text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Subscription Expired</AlertTitle>
                    <AlertDescription>
                        Your subscription expired on {expiry ? format(expiry, "PPP") : "recently"}.
                        Please upgrade your plan to continue using premium features.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="border-orange-600 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-900">
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
                                <span>Expires {expiry ? format(expiry, "PPP") : "Never"} ({isExpired ? 'Expired' : `${daysLeft} days left`})</span>
                            </div>
                        </div>

                        {/* Usage Stats - Show Scan Limit for everyone, Usage only for International */}
                        {isInternationalPlan && (
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
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                className={`bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-700 dark:hover:bg-orange-600 ${isExpired ? "animate-pulse" : ""}`}
                                onClick={() => window.location.href = "/pricing"}
                            >
                                {isExpired ? "Renew Plan Now" : "Upgrade Plan"}
                            </Button>

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
        </div>
    );
}
