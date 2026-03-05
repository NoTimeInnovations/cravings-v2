"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, parseISO, isValid, addDays } from "date-fns";
import { fetchFromHasura } from "@/lib/hasuraClient";
import plansData from "@/data/plans.json";
import { addPaymentV2, updateSubscriptionV2, getPaymentHistory } from "@/app/actions/subscriptionV2";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface Partner {
    id: string;
    store_name: string;
    phone: string;
    status: string;
    subscription_details: {
        plan: {
            id: string;
            name: string;
        } | null;
        status: string;
        expiryDate: string;
        startDate: string;
    } | null;
}

const SubscriptionManagementV2 = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const limit = 20;

    type ViewMode = 'list' | 'edit' | 'payment' | 'history';
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Modal States replaced by View Mode
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

    // Edit Subscription Form
    const [editForm, setEditForm] = useState({
        planId: "",
        expiryDate: new Date(),
    });

    // Payment Form
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        date: new Date(),
        notes: "",
        planId: "", // Add planId to payment form
    });

    const [actionLoading, setActionLoading] = useState(false);

    const fetchPartners = async (reset = false) => {
        setLoading(true);
        const currentOffset = reset ? 0 : offset;

        // We only want partners who have non-null subscription_details
        // or we can just fetch all and filter in UI, but better to filter in query if possible.
        // However, Hasura JSONB filtering can be tricky. Let's fetch partners and see.
        // Assuming we want to manage ALL partners regardless of having subscription_details for now,
        // to allow adding new subscriptions.

        // For V2, let's focus on partners who might have the JSON structure.

        const baseWhere = `{subscription_details: {_is_null: false}}`;
        const searchWhere = searchTerm
            ? `{_or: [{store_name: {_ilike: "%${searchTerm}%"}}, {phone: {_ilike: "%${searchTerm}%"}}]}`
            : null;

        const whereClause = searchWhere
            ? `where: {_and: [${baseWhere}, ${searchWhere}]}`
            : `where: ${baseWhere}`;

        const query = `
      query GetPartnersV2 {
        partners(limit: ${limit}, offset: ${currentOffset}, ${whereClause}, order_by: {created_at: desc}) {
          id
          store_name
          phone
          status
          subscription_details
        }
      }
    `;

        try {
            const data = await fetchFromHasura(query, {});
            if (reset) {
                setPartners(data.partners);
                setOffset(limit);
            } else {
                setPartners([...partners, ...data.partners]);
                setOffset(currentOffset + limit);
            }
        } catch (error) {
            console.error("Error fetching partners:", error);
            toast.error("Failed to fetch partners");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'list') {
            fetchPartners(true);
        }
    }, [searchTerm, viewMode]);

    const handleEditClick = (partner: Partner) => {
        setSelectedPartner(partner);
        const expiry = partner.subscription_details?.expiryDate
            ? parseISO(partner.subscription_details.expiryDate)
            : new Date();

        setEditForm({
            planId: partner.subscription_details?.plan?.id || "",
            expiryDate: isValid(expiry) ? expiry : new Date(),
        });
        setViewMode('edit');
    };

    const handleViewHistoryClick = async (partner: Partner) => {
        setSelectedPartner(partner);
        setViewMode('history');
        setLoading(true);
        try {
            const res = await getPaymentHistory(partner.id);
            if (res.success) {
                setPaymentHistory(res.data);
            } else {
                toast.error("Failed to load history");
            }
        } catch (e) {
            toast.error("Error loading history");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentClick = (partner: Partner) => {
        setSelectedPartner(partner);
        setPaymentForm({
            amount: 0,
            date: new Date(),
            notes: "",
            planId: "",
        });
        setViewMode('payment');
    };

    const handlePlanChange = (val: string, isEditMode: boolean = true) => {
        const foundPlan = [...plansData.india, ...plansData.international].find(p => p.id === val);
        const daysToAdd = foundPlan?.period_days || 365; // Default to 1 year if not found
        const newExpiry = addDays(new Date(), daysToAdd);

        if (isEditMode) {
            setEditForm({
                ...editForm,
                planId: val,
                expiryDate: newExpiry
            });
        } else {
            setPaymentForm({
                ...paymentForm,
                planId: val,
                // We might want to pre-fill amount based on plan price too? 
                // Let's at least auto-set amount if it's 0 or user hasn't typed?
                // For now, just set planId. User might want to override amount.
            });
            // Optional: Auto-fill amount from plan price
            if (foundPlan) {
                // Parse price string e.g. "₹1000" or "$9"
                const priceString = foundPlan.price.replace(/[^0-9.]/g, '');
                const price = parseFloat(priceString);
                if (!isNaN(price)) {
                    setPaymentForm(prev => ({ ...prev, planId: val, amount: price }));
                } else {
                    setPaymentForm(prev => ({ ...prev, planId: val }));
                }
            }
        }
    };

    const saveSubscription = async () => {
        if (!selectedPartner) return;
        setActionLoading(true);

        try {
            // Find plan details
            const foundPlan = [...plansData.india, ...plansData.international].find(p => p.id === editForm.planId);

            const planForUpdate = foundPlan ? {
                id: foundPlan.id,
                name: foundPlan.name
            } : null;

            const newDetails = {
                startDate: new Date().toISOString(), // Default for new subscriptions
                ...selectedPartner.subscription_details, // Overwrites startDate if exists
                plan: planForUpdate,
                expiryDate: editForm.expiryDate.toISOString(),
                status: "active" as const
            };

            const res = await updateSubscriptionV2(selectedPartner.id, newDetails);
            if (res.success) {
                toast.success("Subscription updated successfully");
                setViewMode('list');
                // Refresh happens in useEffect
            } else {
                toast.error(res.error || "Failed to update");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setActionLoading(false);
        }
    };

    const savePayment = async () => {
        if (!selectedPartner) return;
        setActionLoading(true);

        try {
            // 1. Record Payment
            const resPayment = await addPaymentV2({
                partnerId: selectedPartner.id,
                amount: paymentForm.amount,
                date: paymentForm.date.toISOString().split('T')[0], // format as YYYY-MM-DD
                paymentDetails: { notes: paymentForm.notes, planId: paymentForm.planId }
            });

            if (!resPayment.success) {
                toast.error(resPayment.error || "Failed to add payment");
                setActionLoading(false);
                return;
            }

            // 2. If Plan is selected, Update Subscription
            if (paymentForm.planId) {
                const foundPlan = [...plansData.india, ...plansData.international].find(p => p.id === paymentForm.planId);
                const planForUpdate = foundPlan ? {
                    id: foundPlan.id,
                    name: foundPlan.name
                } : null;

                const daysToAdd = foundPlan?.period_days || 365;
                const newExpiry = addDays(new Date(), daysToAdd).toISOString();

                const newDetails = {
                    startDate: new Date().toISOString(),
                    // We preserve existing details but override plan and status
                    ...selectedPartner.subscription_details,
                    plan: planForUpdate,
                    expiryDate: newExpiry,
                    status: "active" as const
                };

                const resSub = await updateSubscriptionV2(selectedPartner.id, newDetails);
                if (!resSub.success) {
                    toast.warning("Payment recorded, but failed to update subscription plan.");
                } else {
                    toast.success("Payment recorded and subscription updated.");
                }
            } else {
                toast.success("Payment recorded successfully");
            }

            setViewMode('list');

        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setActionLoading(false);
        }
    };

    // Helper to format date safely
    const safeFormat = (dateStr: string | undefined) => {
        if (!dateStr) return "N/A";
        try {
            return format(parseISO(dateStr), "MMM dd, yyyy");
        } catch (e) {
            return "Invalid Date";
        }
    };

    const getPlanLocation = (planId: string | undefined) => {
        if (!planId) return "";
        if (plansData.india.some(p => p.id === planId)) return " (India)";
        if (plansData.international.some(p => p.id === planId)) return " (Intl)";
        return "";
    };

    const getFilteredPlans = () => {
        const currentPlanId = selectedPartner?.subscription_details?.plan?.id;
        const isInternational = plansData.international.some(p => p.id === currentPlanId);
        const isIndia = plansData.india.some(p => p.id === currentPlanId);

        if (isInternational) return { india: [], international: plansData.international };
        if (isIndia) return { india: plansData.india, international: [] };

        return { india: plansData.india, international: plansData.international };
    };

    const filteredPlans = getFilteredPlans();

    const getSubscriptionStatus = (partner: Partner) => {
        if (!partner.subscription_details) return "Inactive";
        if (partner.subscription_details.expiryDate) {
            const expiry = parseISO(partner.subscription_details.expiryDate);
            const today = new Date();
            if (isValid(expiry) && format(expiry, 'yyyy-MM-dd') < format(today, 'yyyy-MM-dd')) {
                return "Expired";
            }
        }
        return partner.subscription_details.status || "Inactive";
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            case 'expired':
                return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
        }
    };

    // RENDER FUNCTIONS

    const renderEditView = () => (
        <Card>
            <CardHeader>
                <CardTitle>Manage Subscription: {selectedPartner?.store_name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Plan</Label>
                        <Select
                            value={editForm.planId}
                            onValueChange={(val) => handlePlanChange(val, true)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredPlans.india.length > 0 && filteredPlans.india.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.name} - {plan.price}</SelectItem>
                                ))}
                                {filteredPlans.international.length > 0 && filteredPlans.international.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.name} (Intl) - {plan.price}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 flex flex-col">
                        <Label>Expiry Date</Label>
                        <Input
                            type="date"
                            value={editForm.expiryDate ? format(editForm.expiryDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                                const date = e.target.valueAsDate;
                                if (date) {
                                    setEditForm({ ...editForm, expiryDate: date });
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="flex gap-4 mt-6">
                    <Button variant="outline" onClick={() => setViewMode('list')}>Cancel</Button>
                    <Button onClick={saveSubscription} disabled={actionLoading}>
                        {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const renderPaymentView = () => (
        <Card>
            <CardHeader>
                <CardTitle>Record Payment: {selectedPartner?.store_name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Plan (Optional - Automatically Updates Subscription)</Label>
                        <Select
                            value={paymentForm.planId}
                            onValueChange={(val) => handlePlanChange(val, false)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a plan to upgrade/renew" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- No Plan Change --</SelectItem>
                                {filteredPlans.india.length > 0 && filteredPlans.india.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.name} - {plan.price}</SelectItem>
                                ))}
                                {filteredPlans.international.length > 0 && filteredPlans.international.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.name} (Intl) - {plan.price}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2 flex flex-col">
                        <Label>Payment Date</Label>
                        <Input
                            type="date"
                            value={paymentForm.date ? format(paymentForm.date, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                                const date = e.target.valueAsDate;
                                if (date) {
                                    setPaymentForm({ ...paymentForm, date: date });
                                }
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Input
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            placeholder="Transaction ID, etc."
                        />
                    </div>
                </div>
                <div className="flex gap-4 mt-6">
                    <Button variant="outline" onClick={() => setViewMode('list')}>Cancel</Button>
                    <Button onClick={savePayment} disabled={actionLoading}>
                        {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Record Payment
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const renderHistoryView = () => (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Payment History: {selectedPartner?.store_name}</CardTitle>
                    <Button variant="outline" onClick={() => setViewMode('list')}>Back to List</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="py-4">
                    {loading && paymentHistory.length === 0 ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : paymentHistory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paymentHistory.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{safeFormat(payment.date)}</TableCell>
                                        <TableCell>{payment.amount}</TableCell>
                                        <TableCell>{payment.payment_details?.notes || "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground p-4">No payment history found.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const renderListView = () => (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Subscription Management V2</CardTitle>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search Partners..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Store Name</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expiry Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {partners.map((partner) => (
                                <TableRow key={partner.id}>
                                    <TableCell className="font-medium">
                                        <div>{partner.store_name}</div>
                                        <div className="text-sm text-muted-foreground">{partner.phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        {partner.subscription_details?.plan?.name || "No Plan"}
                                        <span className="text-xs text-muted-foreground">
                                            {getPlanLocation(partner.subscription_details?.plan?.id)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-xs font-medium",
                                            getStatusColor(getSubscriptionStatus(partner))
                                        )}>
                                            {getSubscriptionStatus(partner)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {safeFormat(partner.subscription_details?.expiryDate)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEditClick(partner)}>
                                                Manage Plan
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handlePaymentClick(partner)}>
                                                Record Payment
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleViewHistoryClick(partner)}>
                                                View Payments
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && partners.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No partners found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {partners.map((partner) => (
                        <div key={partner.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="font-semibold text-lg">{partner.store_name}</div>
                                    <div className="text-sm text-muted-foreground">{partner.phone}</div>
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    getStatusColor(getSubscriptionStatus(partner))
                                )}>
                                    {getSubscriptionStatus(partner)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground mb-1">Plan</div>
                                    <div className="font-medium">
                                        {partner.subscription_details?.plan?.name || "No Plan"}
                                        <span className="text-xs text-muted-foreground block">
                                            {getPlanLocation(partner.subscription_details?.plan?.id)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground mb-1">Expiry</div>
                                    <div className="font-medium">
                                        {safeFormat(partner.subscription_details?.expiryDate)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button variant="outline" className="w-full justify-center" onClick={() => handleEditClick(partner)}>
                                    Manage Plan
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="w-full justify-center" onClick={() => handlePaymentClick(partner)}>
                                        Record Payment
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-center border" onClick={() => handleViewHistoryClick(partner)}>
                                        History
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!loading && partners.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No partners found.
                        </div>
                    )}
                </div>
                {partners.length > 0 && (
                    <div className="mt-4 flex justify-center">
                        <Button variant="ghost" onClick={() => fetchPartners(false)} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Load More"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {viewMode === 'list' && renderListView()}
            {viewMode === 'edit' && renderEditView()}
            {viewMode === 'payment' && renderPaymentView()}
            {viewMode === 'history' && renderHistoryView()}
        </div>
    );
};

export default SubscriptionManagementV2;
