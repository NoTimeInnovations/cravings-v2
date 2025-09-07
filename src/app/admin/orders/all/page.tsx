"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";
import { Partner, useAuthStore } from "@/store/authStore";
import useOrderStore, { Order } from "@/store/orderStore";
import OrderItemCard from "@/components/admin/OrderItemCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePOSStore } from "@/store/posStore";
import { EditOrderModal } from "@/components/admin/pos/EditOrderModal";

const OrdersPage = () => {
  const { fetchOrderOfPartner, deleteOrder, updateOrderStatus } = useOrderStore();
  const { setEditOrderModalOpen, setOrder } = usePOSStore();
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"delivery" | "table" | "pos">("delivery");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      if (userData?.id) {
        setLoading(true);
        setError(null);
        try {
          const partnerOrders = await fetchOrderOfPartner(userData.id);
          if (partnerOrders) {
            setOrders(partnerOrders);
          } else {
            setError("Failed to load orders");
          }
        } catch (error) {
          console.error("Failed to fetch orders:", error);
          setError("Failed to load orders. Please try again.");
          toast.error("Failed to load orders");
        } finally {
          setLoading(false);
        }
      }
    };

    loadOrders();
  }, [userData?.id, fetchOrderOfPartner]);

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const success = await deleteOrder(orderId);
      if (success) {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        toast.success("Order deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete order");
        return false;
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
      return false;
    }
  };

  const getFilteredAndSortedOrders = () => {
    let result = [...orders];

    // Filter by tab
    result = result.filter((order) => {
      if (activeTab === "delivery") return order.type === "delivery";
      if (activeTab === "table") return order.type === "table_order";
      if (activeTab === "pos") return order.type === "pos";
      return false;
    });

    // Filter by status
    if (filter !== "all") {
      result = result.filter((order) => order.status === filter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((order) => {
        return (
          order.id.toLowerCase().includes(query) ||
          (order.user?.phone?.toLowerCase().includes(query) ?? false) ||
          order.items.some((item) => item.name.toLowerCase().includes(query)) ||
          order.phone?.includes(query) ||
          (order.tableNumber?.toString().includes(query) ?? false)
        );
      });
    }

    // Sort results
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      switch (sortBy) {
        case "newest":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "highest":
          return b.totalPrice - a.totalPrice;
        case "lowest":
          return a.totalPrice - b.totalPrice;
        default:
          return dateB - dateA;
      }
    });

    return result;
  };

  const filteredOrders = getFilteredAndSortedOrders();

  return (
    <div className="container mx-auto px-[8%] py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">All Orders</h1>
        
        <div className="flex flex-col w-full md:w-auto gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-[200px]">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest">Highest Amount</SelectItem>
                  <SelectItem value="lowest">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "delivery" | "table" | "pos")}
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="delivery">Delivery Orders</TabsTrigger>
          <TabsTrigger value="table">Table Orders</TabsTrigger>
          <TabsTrigger value="pos">POS Orders</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <>
            <TabsContent value="delivery">
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <p className="text-gray-500">No delivery orders found matching your criteria</p>
                ) : (
                  filteredOrders.map((order) => {
                    const grandTotal = order.totalPrice || 0;
                    const gstPercentage = (userData as Partner)?.gst_percentage || 0;
                    const foodTotal = order.items.reduce(
                      (total, item) => total + (item.price || 0) * item.quantity,
                      0
                    );
                    const gstAmount = order.gstIncluded
                      ? (foodTotal * gstPercentage) / 100
                      : 0;

                    return (
                      <OrderItemCard
                        key={order.id}
                        order={order}
                        grantTotal={grandTotal}
                        gstAmount={gstAmount}
                        gstPercentage={gstPercentage}
                        deleteOrder={handleDeleteOrder}
                        setEditOrderModalOpen={setEditOrderModalOpen}
                        setOrder={setOrder}
                        updateOrderStatus={(status) => {
                          updateOrderStatus(
                            orders,
                            order.id,
                            status,
                            setOrders
                          );
                        }}
                      />
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="table">
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <p className="text-gray-500">No table orders found matching your criteria</p>
                ) : (
                  filteredOrders.map((order) => {
                    const grandTotal = order.totalPrice || 0;
                    const foodTotal = order.items.reduce(
                      (total, item) => total + (item.price || 0) * item.quantity,
                      0
                    );
                    const gstPercentage = (userData as Partner)?.gst_percentage || 0;
                    const gstAmount = order.gstIncluded
                      ? (foodTotal * gstPercentage) / 100
                      : 0;

                    return (
                      <OrderItemCard
                        key={order.id}
                        order={order}
                        grantTotal={grandTotal}
                        gstAmount={gstAmount}
                        gstPercentage={gstPercentage}
                        deleteOrder={handleDeleteOrder}
                        setEditOrderModalOpen={setEditOrderModalOpen}
                        setOrder={setOrder}
                        updateOrderStatus={(status) => {
                          updateOrderStatus(
                            orders,
                            order.id,
                            status,
                            setOrders
                          );
                        }}
                      />
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="pos">
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <p className="text-gray-500">No POS orders found matching your criteria</p>
                ) : (
                  filteredOrders.map((order) => {
                    const grandTotal = order.totalPrice || 0;
                    const foodTotal = order.items.reduce(
                      (total, item) => total + (item.price || 0) * item.quantity,
                      0
                    );
                    const gstPercentage = (userData as Partner)?.gst_percentage || 0;
                    const gstAmount = order.gstIncluded
                      ? (foodTotal * gstPercentage) / 100
                      : 0;

                    return (
                      <OrderItemCard
                        key={order.id}
                        order={order}
                        grantTotal={grandTotal}
                        gstAmount={gstAmount}
                        gstPercentage={gstPercentage}
                        deleteOrder={handleDeleteOrder}
                        setEditOrderModalOpen={setEditOrderModalOpen}
                        setOrder={setOrder}
                        updateOrderStatus={(status) => {
                          updateOrderStatus(
                            orders,
                            order.id,
                            status,
                            setOrders
                          );
                        }}
                      />
                    );
                  })
                )}
              </div>
            </TabsContent>
            <EditOrderModal/>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default OrdersPage;