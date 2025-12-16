"use client";

import React, { useEffect, useState } from "react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fixPartnerSubscription } from "./actions";

export default function SubscriptionIssuePage() {
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const query = `
        query GetPartnersWithSubs {
          partners(where: {subscription_details: {_is_null: false}}) {
            id
            store_name
            subscription_details
          }
        }
      `;
            const res = await fetchFromHasura(query);
            const allPartners = res.partners || [];

            // Filter for plan: null
            const filtered = allPartners.filter((p: any) => {
                const sub = p.subscription_details;
                // Check if plan is explicitly null or missing
                return sub && (sub.plan === null || sub.plan === undefined);
            });

            setPartners(filtered);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFix = async (id: string) => {
        setProcessing(id);
        try {
            const res = await fixPartnerSubscription(id);
            if (res.success) {
                toast.success("Fixed partner " + id);
                // Remove from list
                setPartners(prev => prev.filter(p => p.id !== id));
            } else {
                toast.error("Failed: " + res.error);
            }
        } catch (e) {
            toast.error("Error calling server action");
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Partners with NULL Plan</h1>
            <Button onClick={fetchData} variant="outline">Refresh</Button>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8" />
                </div>
            ) : partners.length === 0 ? (
                <p className="text-muted-foreground p-4 border rounded">No partners found with subscription_details.plan == null</p>
            ) : (
                <div className="grid gap-4">
                    {partners.map(p => (
                        <Card key={p.id}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{p.store_name}</CardTitle>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleFix(p.id)}
                                    disabled={processing === p.id}
                                >
                                    {processing === p.id ? <Loader2 className="animate-spin h-4 w-4" /> : "Repair Plan"}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto">
                                    {JSON.stringify(p.subscription_details, null, 2)}
                                </pre>
                                <div className="text-xs text-muted-foreground mt-2">ID: {p.id}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
