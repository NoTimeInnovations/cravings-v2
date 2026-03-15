"use client";

import { useEffect, useState } from "react";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { Partner, useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PaymentRecord {
  id: string;
  amount: number;
  payment_details: {
    plan?: { name?: string; id?: string };
    status?: string;
    startDate?: string;
    expiryDate?: string;
  };
  created_at: string;
}

const GET_PARTNER_PAYMENTS = `
  query GetPartnerPayments($partner_id: uuid!) {
    partner_payments(
      where: { partner_id: { _eq: $partner_id } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      id
      amount
      payment_details
      created_at
    }
  }
`;

export function AdminV2Billing() {
  const { userData } = useAuthStore();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.id) return;
    const fetchPayments = async () => {
      try {
        const res = await fetchFromHasura(GET_PARTNER_PAYMENTS, {
          partner_id: userData.id,
        });
        setPayments(res?.partner_payments || []);
      } catch (e) {
        console.error("Failed to fetch payment history", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [userData?.id]);

  const currency = (userData as Partner)?.currency || "₹";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Billing</h1>
      <SubscriptionStatus />

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment history yet
            </p>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payment.payment_details?.plan?.name || "Plan Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(
                        parseISO(payment.created_at),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                    {payment.payment_details?.expiryDate && (
                      <p className="text-xs text-muted-foreground">
                        Valid until{" "}
                        {format(
                          parseISO(payment.payment_details.expiryDate),
                          "MMM d, yyyy",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">
                      {currency}
                      {(payment.amount / 100).toLocaleString()}
                    </p>
                    <Badge
                      variant="default"
                      className="bg-green-600 text-[10px]"
                    >
                      Paid
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
