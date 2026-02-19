"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Edit,
  SquareArrowUpRight,
  SquareArrowOutDownRight,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { Partner, useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { toast } from "sonner";
import useOrderStore from "@/store/orderStore";
import { EditOrderModal } from "@/components/admin/pos/EditOrderModal";
import { fetchFromHasura } from "@/lib/hasuraClient";

import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import { toStatusDisplayFormat } from "@/lib/statusHistory";
import Link from "next/link";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getStatusDisplay } from "@/lib/getStatusDisplay";
import { getDateOnly } from "@/lib/formatDate";

const Page = () => {
  const { userData } = useAuthStore();
  const { userOrders, subscribeUserOrders } = useOrderStore();
  const { setOrder, setEditOrderModalOpen } = usePOSStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (userData?.id) {
      const unsubscribe = subscribeUserOrders((orders) => {
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [userData]);

  const handleEditOrder = (order: any) => {
    setOrder({
      id: order.id,
      totalPrice: order.totalPrice,
      tableNumber: order.tableNumber,
      phone: order.phone,
      items: order.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
      })),
      extraCharges: order.extraCharges || [],
      createdAt: order.createdAt,
      status: order.status,
      partnerId: order.partnerId,
    });
    setEditOrderModalOpen(true);
  };



  const calculateGst = (amount: number, gstPercentage: number) => {
    return (amount * gstPercentage) / 100;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = userOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(userOrders.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Navbar */}
      <div className="bg-white border-b sticky top-0 z-50 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-lg">My Orders</h1>
      </div>

      <div className="container mx-auto px-4 pb-8 pt-4 max-w-3xl">

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : userOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            You haven&apos;t placed any orders yet.
          </div>
        ) : (
          <div className="space-y-6">
            {currentOrders.map((order, index) => {
              const gstPercentage =
                (order.partner as Partner)?.gst_percentage || 0;
              const foodTotal = (order.items || []).reduce(
                (sum: number, item: any) => sum + item.price * item.quantity,
                0
              );

              const extraChargesTotal =
                (order.extraCharges || []).reduce(
                  (sum: number, charge: any) =>
                    sum +
                    getExtraCharge(
                      order?.items || [],
                      charge.amount,
                      charge.charge_type
                    ) || 0,
                  0
                ) || 0;

              const taxableAmount = foodTotal + extraChargesTotal;

              const discounts = order.discounts || [];
              const discountAmount = discounts.reduce((total: number, discount: any) => {
                if (discount.type === "flat") {
                  return total + discount.value;
                } else {
                  return total + (taxableAmount * discount.value) / 100;
                }
              }, 0);

              const discountedTaxableAmount = Math.max(0, taxableAmount - discountAmount);
              const gstAmount = getGstAmount(discountedTaxableAmount, gstPercentage);
              const grandTotal = discountedTaxableAmount + gstAmount;
              const statusDisplay = getStatusDisplay(order);

              return (
                <Link
                  href={`/order/${order.id}`}
                  id={`order-${order.id}`}
                  key={order.id}
                  className="block border border-gray-200 rounded-xl p-5 shadow-sm bg-white hover:shadow-md transition-shadow relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {order.partner?.store_name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusDisplay.className}`}
                        >
                          {statusDisplay.text}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        #{order.id.slice(0, 8)} • {format(new Date(order.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div
                      className="text-orange-600 bg-orange-50 p-2 rounded-full transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.quantity} × {item.name}
                        </span>
                        <span className="font-medium">
                          {(order.partner as Partner)?.currency || "₹"}
                          {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">
                          - {(order.partner as Partner)?.currency || "₹"}
                          {discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center font-bold text-gray-900">
                    <span>Total</span>
                    <span>
                      {(order.partner as Partner)?.currency || "₹"}
                      {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        <EditOrderModal />
      </div>
    </div>
  );
};

export default Page;
