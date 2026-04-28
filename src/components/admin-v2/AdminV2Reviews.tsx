"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Star, MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import { getPartnerReviewsQuery } from "@/api/reviews";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  order_id: string | null;
  user: {
    full_name: string | null;
    phone: string | null;
  } | null;
  order: {
    id: string;
    display_id: string | null;
    type: string | null;
    total_price: number | null;
    created_at: string;
  } | null;
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= value
              ? "h-4 w-4 fill-orange-500 text-orange-500"
              : "h-4 w-4 text-gray-300"
          }
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{value}/5</span>
    </div>
  );
}

function getOrderTypeLabel(order: ReviewRow["order"]): string {
  if (!order) return "—";
  if (order.type === "delivery") return "Delivery / Takeaway";
  if (order.type === "table_order") return "Dine-in";
  return order.type ?? "—";
}

export function AdminV2Reviews() {
  const { userData } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFromHasura(getPartnerReviewsQuery, { partner_id: userData.id })
      .then((res: any) => {
        if (cancelled) return;
        setReviews(res?.reviews ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load reviews", err);
        setError("Couldn't load reviews. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userData?.id]);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return { avg: sum / reviews.length, count: reviews.length };
  }, [reviews]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Customer reviews from delivery and takeaway orders.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:max-w-md">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">
                {stats.count ? stats.avg.toFixed(1) : "—"}
              </span>
              <Star className="h-5 w-5 fill-orange-500 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{stats.count}</span>
              <MessageSquare className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-sm text-red-500">
              {error}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No reviews yet. Reviews will appear once customers rate their
              delivery or takeaway orders.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">
                        {r.user?.full_name || "Customer"}
                      </div>
                      {r.user?.phone && (
                        <div className="text-xs text-muted-foreground">
                          {r.user.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.order ? (
                        <span className="font-mono text-xs">
                          #
                          {r.order.display_id ||
                            r.order.id.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getOrderTypeLabel(r.order)}
                    </TableCell>
                    <TableCell>
                      <StarRow value={r.rating} />
                    </TableCell>
                    <TableCell className="max-w-md text-sm text-gray-700">
                      {r.comment || (
                        <span className="text-muted-foreground italic">
                          No comment
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminV2Reviews;
