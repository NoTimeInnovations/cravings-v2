"use client";
import { Captain, useAuthStore } from "@/store/authStore";
import useOrderStore, { Order } from "@/store/orderStore";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import OrderItemCard from "@/components/captain/OrderItemCard";
import { EditCaptainOrderModal } from "./pos/EditCaptainOrderModal";
import { revalidateTag } from "@/app/actions/revalidate";

const CaptainOrdersTab = () => {
  const { userData } = useAuthStore();
  const captainData = userData as Captain;
  const prevOrdersRef = useRef<Order[]>([]);
  const { subscribeOrders, deleteOrder, fetchOrderOfPartner, updateOrderStatus } = useOrderStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const {
    setOrder,
    setEditOrderModalOpen,
  } = usePOSStore();

  // Helper function to sort orders
  const sortOrders = (ordersToSort: Order[]) => {
    return [...ordersToSort].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Always newest first
    });
  };

  // Helper function to process and filter orders
  const processAndFilterOrders = (fetchedOrders: Order[]) => {
    if (!fetchedOrders) return [];
    // Show all orders taken by this captain, regardless of status
    const captainOrders = fetchedOrders.filter(
      order => order.captain_id === captainData.id
    );
    // Sort orders by date (newest first)
    return sortOrders(captainOrders);
  };

  // Initial fetch of orders
  useEffect(() => {
    const fetchInitialOrders = async () => {
      if (captainData?.partner_id) {
        try {
          setLoading(true);
          const fetchedOrders = await fetchOrderOfPartner(captainData.partner_id);
          
          if (!fetchedOrders) {
            setOrders([]);
            setLoading(false);
            return;
          }

          const processedOrders = processAndFilterOrders(fetchedOrders);
          setTotalOrders(processedOrders.length);
          const paginatedOrders = processedOrders.slice(0, ordersPerPage);
          setOrders(paginatedOrders);
          setHasMoreOrders(processedOrders.length > ordersPerPage);
        } catch (error) {
          console.error('Failed to load orders:', error);
          toast.error("Failed to load orders");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchInitialOrders();
  }, [captainData?.partner_id, captainData?.id, fetchOrderOfPartner]);

  // Subscribe to order updates
  useEffect(() => {
    if (!captainData?.partner_id) return;

    const unsubscribe = subscribeOrders((updatedOrders) => {
      if (!updatedOrders) return;

      const processedOrders = processAndFilterOrders(updatedOrders);
      setTotalOrders(processedOrders.length);

      // Always reset to page 1 and show the latest orders
      setCurrentPage(1);
        setOrders(processedOrders.slice(0, ordersPerPage));
      prevOrdersRef.current = processedOrders;
    });

    return () => {
      unsubscribe();
    };
  }, [captainData?.partner_id, captainData?.id, subscribeOrders, ordersPerPage]);

  // Listen for order updates from EditCaptainOrderModal
  useEffect(() => {
    const handleOrderUpdate = async () => {
      if (captainData?.partner_id) {
        try {
          setLoading(true);
          const fetchedOrders = await fetchOrderOfPartner(captainData.partner_id);
          
          if (fetchedOrders) {
            const processedOrders = processAndFilterOrders(fetchedOrders);
            setTotalOrders(processedOrders.length);
            
            // Reset to first page and show updated orders
            setCurrentPage(1);
            setOrders(processedOrders.slice(0, ordersPerPage));
            setHasMoreOrders(processedOrders.length > ordersPerPage);
          }
        } catch (error) {
          console.error('Failed to refresh orders:', error);
          toast.error("Failed to refresh orders");
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('orderUpdated', handleOrderUpdate);
    
    return () => {
      window.removeEventListener('orderUpdated', handleOrderUpdate);
    };
  }, [captainData?.partner_id, captainData?.id, fetchOrderOfPartner]);

  const fetchNextPage = async () => {
    if (!captainData?.partner_id || !hasMoreOrders) return;

    try {
      setLoading(true);
      const offset = currentPage * ordersPerPage;
      
      const fetchedOrders = await fetchOrderOfPartner(captainData.partner_id);
      
      if (!fetchedOrders) return;

      const processedOrders = processAndFilterOrders(fetchedOrders);
      const paginatedOrders = processedOrders.slice(offset, offset + ordersPerPage);
      setOrders(prevOrders => [...prevOrders, ...paginatedOrders]);
      setHasMoreOrders(processedOrders.length > offset + ordersPerPage);
      setCurrentPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more orders:', error);
      toast.error("Failed to load more orders");
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (hasMoreOrders) {
      fetchNextPage();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // Calculate the start index for the previous page
      const startIndex = (currentPage - 2) * ordersPerPage;
      // Show the previous page's orders
      setOrders(prevOrders => prevOrders.slice(startIndex, startIndex + ordersPerPage));
    }
  };

  // Calculate total pages based on total orders count
  const totalPages = Math.ceil(totalOrders / ordersPerPage);

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: "completed" | "cancelled"
  ) => {
    try {
      // Check if the order has items before confirming
      const orderToUpdate = orders.find(o => o.id === orderId);
      if (newStatus === "completed" && (!orderToUpdate || orderToUpdate.items.length === 0)) {
        toast.error("Cannot complete order: No items in the order");
        return;
      }

      await updateOrderStatus(orders, orderId, newStatus, setOrders);
      if (newStatus === "completed") {
        revalidateTag(captainData.partner_id);
      }
      toast.success(`Order marked as ${newStatus}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error(`Failed to update order status`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-200px)]">
      
      {/* Fixed Header */}
      <div className="flex-none p-4 border-b">
      </div>

      {/* Scrollable Orders Section */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No orders found
              </p>
            ) :
              orders.map((order, index) => {
                const gstPercentage = captainData?.gst_percentage || 0;
                const foodSubtotal = order.items.reduce((sum, item) => {
                  return sum + item.price * item.quantity;
                }, 0);

                const gstAmount = getGstAmount(foodSubtotal, gstPercentage);
                const totalPriceWithGst = foodSubtotal + gstAmount;

                // Calculate extra charges total
                const extraChargesTotal = (order.extraCharges || []).reduce(
                  (acc, charge) => acc + (charge.amount || 0),
                  0
                );

                // Use the order's totalPrice if it exists and matches our calculation
                // Otherwise use our calculated total
                const calculatedTotal = totalPriceWithGst + extraChargesTotal;
                const grantTotal = order.totalPrice === calculatedTotal ? 
                  order.totalPrice : 
                  calculatedTotal;

                return (
                  <OrderItemCard
                    key={order.id + "-" + index}
                    deleteOrder={async (id) => { await deleteOrder(id); }}
                    grantTotal={grantTotal}
                    gstAmount={gstAmount}
                    gstPercentage={gstPercentage}
                    order={order}
                    setEditOrderModalOpen={setEditOrderModalOpen}
                    setOrder={setOrder}
                    updateOrderStatus={handleUpdateOrderStatus}
                  />
                );
              })
            }
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex-none p-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={!hasMoreOrders}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Order Modal */}
      <EditCaptainOrderModal />
    </div>
  );
};

export default CaptainOrdersTab;