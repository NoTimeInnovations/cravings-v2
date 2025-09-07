"use client";
import { Partner, useAuthStore } from "@/store/authStore";
import useOrderStore, { Order } from "@/store/orderStore";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Howl } from "howler";
import { useRouter } from "next/navigation";
import { EditOrderModal } from "./pos/EditOrderModal";
import { usePOSStore } from "@/store/posStore";
import { getGstAmount } from "../hotelDetail/OrderDrawer";
import OrderItemCard from "./OrderItemCard";
import TodaysEarnings from "./orders/TodaysEarnings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import AlertToggle from "./AlertToggle";
import NewOrderAlertCard from "./orders/OrderDetailCard";
import OrderDetailCard from "./orders/OrderDetailCard";
import { OrderStatusDisplay, toStatusDisplayFormat } from "@/lib/statusHistory";

const OrdersTab = () => {
  const router = useRouter();
  const { userData, features } = useAuthStore();
  const prevOrdersRef = useRef<Order[]>([]);
  const allSeenOrderIds = useRef<Set<string>>(new Set());
  const initialLoadCompleted = useRef<boolean>(false);
  const {
    subscribePaginatedOrders,
    subscribeOrdersCount,
    partnerOrders,
    deleteOrder,
    updateOrderStatus,
    updateOrderStatusHistory,
  } = useOrderStore();
  const {
    orders,
    setOrders,
    removeOrder,
    loading,
    setLoading,
    totalCount,
    currentPage,
    limit,
    hasNextPage,
    hasPreviousPage,
    setTotalCount,
    nextPage,
    previousPage,
  } = useOrderSubscriptionStore();
  const [activeTab, setActiveTab] = useState<"table" | "delivery" | "pos">(
    "delivery"
  );
  const [newOrders, setNewOrders] = useState({
    table: false,
    delivery: false,
    pos: false,
  });
  const [sortedOrders, setSortedOrders] = useState<Order[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState({
    show: true,
    tableCount: 0,
    deliveryCount: 0,
    posCount: 0,
  });
  const soundRef = useRef<Howl | null>(null);
  const { setOrder, setEditOrderModalOpen } = usePOSStore();
  const orderAlertRef = useRef<boolean>(false);
  const [isCreateOrderOverlayOpen, setIsCreateOrderOverlayOpen] =
    useState(false);

  // Preload sound effect immediately
  useEffect(() => {
    soundRef.current = new Howl({
      src: ["/audio/tone.wav"],
      volume: 1,
      preload: true,
    });
  }, []);

  // Subscribe to order count
  useEffect(() => {
    if (!userData?.id) return;

    const unsubscribe = subscribeOrdersCount((count) => {
      setTotalCount(count);
    });

    return () => {
      unsubscribe();
    };
  }, [userData?.id, subscribeOrdersCount, setTotalCount]);

  // Priority subscription for new orders - runs before other effects
  useEffect(() => {
    if (!userData?.id) return;

    // Only set loading to true if we don't have any orders yet
    if (orders.length === 0) {
      setLoading(true);
    }

    // Calculate offset based on current page and limit
    const offset = (currentPage - 1) * limit;

    // Set up subscription for paginated orders
    const unsubscribe = subscribePaginatedOrders(
      limit,
      offset,
      (paginatedOrders) => {
        // First load - just record all existing orders
        if (!initialLoadCompleted.current) {
          paginatedOrders.forEach((order) => {
            allSeenOrderIds.current.add(order.id);
          });
          initialLoadCompleted.current = true;
          prevOrdersRef.current = paginatedOrders;
          setLoading(false);
          return;
        }

        // Find truly new orders - ones we haven't seen before in any pagination
        const genuinelyNewOrders = paginatedOrders.filter(
          (order) => !allSeenOrderIds.current.has(order.id)
        );

        // Add all current orders to our set of seen orders
        paginatedOrders.forEach((order) => {
          allSeenOrderIds.current.add(order.id);
        });

        // Count new pending orders that we haven't seen before
        const newTableOrders = genuinelyNewOrders.filter(
          (order) => order.status === "pending" && order.type === "table_order"
        );

        const newDeliveryOrders = genuinelyNewOrders.filter(
          (order) => order.status === "pending" && order.type === "delivery"
        );

        const newPOSOrders = genuinelyNewOrders.filter(
          (order) => order.type !== "table_order" && order.type !== "delivery"
        );

        const totalNewOrders =
          newTableOrders.length +
          newDeliveryOrders.length +
          newPOSOrders.length;

        if (totalNewOrders > 0 ) {

          // Show alert dialog with highest priority
          // const isAlertActive = localStorage?.getItem("alertActive") === "1";

          // if (isAlertActive) {
            soundRef.current?.play();
            console.log("new order sound played");
            setNewOrderAlert({
              show: true,
              tableCount: newTableOrders.length,
              deliveryCount: newDeliveryOrders.length,
              posCount: newPOSOrders.length,
            });
          // }

          // Update new order indicators
          setNewOrders({
            table: newTableOrders.length > 0,
            delivery: newDeliveryOrders.length > 0,
            pos: newPOSOrders.length > 0,
          });
        }

        prevOrdersRef.current = paginatedOrders;
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userData?.id, currentPage, limit]);

  useEffect(() => {
    if (partnerOrders) {
      console.log("Partner orders updated:", partnerOrders);

      setOrders(partnerOrders);
    }
  }, [partnerOrders, setOrders]);

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const success = await deleteOrder(orderId);
      if (success) {
        removeOrder(orderId);
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

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: "pending" | "completed" | "cancelled"
  ) => {
    try {
      await updateOrderStatus(orders, orderId, status, setOrders);
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "table" || value === "delivery" || value === "pos") {
      setActiveTab(value);
      setNewOrders((prev) => ({ ...prev, [value]: false }));
      localStorage?.setItem("ordersActiveTab", value);
    }
  };

  useEffect(() => {
    const filteredByTypeOrders = orders
      .filter((order) => {
        if (activeTab === "table") return order.type === "table_order";
        if (activeTab === "delivery") return order.type === "delivery";
        if (activeTab === "pos") return order.type === "pos";
        return false;
      })
      .sort((a, b) => {
        // Sort by created date, most recent first
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    setSortedOrders(filteredByTypeOrders);
    setDisplayedOrders(filteredByTypeOrders);
  }, [orders, activeTab]);

  const handleCreateNewOrder = () => {
    router.push("/admin/pos");
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      nextPage();
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      previousPage();
    }
  };

  const handleFirstPage = () => {
    if (currentPage > 1) {
      useOrderSubscriptionStore.setState({ currentPage: 1 });
    }
  };

  const [pageInput, setPageInput] = useState("");
  const pagesContainerRef = useRef<HTMLDivElement>(null);

  const handleGoToPage = () => {
    const pageNumber = parseInt(pageInput, 10);
    if (
      !isNaN(pageNumber) &&
      pageNumber >= 1 &&
      pageNumber <= Math.ceil(totalCount / limit)
    ) {
      useOrderSubscriptionStore.setState({ currentPage: pageNumber });
      setPageInput("");
      // Explicitly scroll to top for direct page input
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      toast.error("Invalid page number");
    }
  };

  const maxPages = Math.ceil(totalCount / limit) || 1;
  const startPage = Math.max(1, currentPage - 4);
  const endPage = Math.min(maxPages, startPage + 8);

  useEffect(() => {
    if (pagesContainerRef.current) {
      const container = pagesContainerRef.current;
      const activeButton = container.querySelector("[data-active='true']");

      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        const scrollLeft =
          buttonRect.left -
          containerRect.left -
          containerRect.width / 2 +
          buttonRect.width / 2;
        container.scrollTo({
          left: container.scrollLeft + scrollLeft,
          behavior: "smooth",
        });
      }
    }
  }, [currentPage]);

  useEffect(() => {
    const isTableEnabled = features?.ordering?.enabled;
    const isDeliveryEnabled = features?.delivery?.enabled;
    const isPosEnabled = features?.pos?.enabled;

    if (isDeliveryEnabled) {
      setActiveTab("delivery");
    } else if (isTableEnabled) {
      setActiveTab("table");
    } else if (isPosEnabled) {
      setActiveTab("pos");
    }
  }, [features]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentPage]);

  return (
    <div className="py-6 px-4 sm:px-[8%] max-w-7xl mx-auto relative">
      {/* <AlertToggle /> */}

      
          <OrderDetailCard
            newOrderAlert={newOrderAlert.show}
            orders={orders.filter((order) => order.status === "pending" && !toStatusDisplayFormat(order.status_history as OrderStatusDisplay)?.accepted?.isCompleted)}
            onClose={() => {
              setNewOrderAlert((prev) => ({ ...prev, show: false }));
              orderAlertRef.current = false;
            }}
          />
       

      <TodaysEarnings orders={orders} />
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 sm:mb-0">Orders Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          {features?.pos.enabled && (
            <Button
              variant={"outline"}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleCreateNewOrder}
            >
              Create New Order
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => router.push("/admin/orders/all")}
          >
            Show All Orders
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="flex w-full gap-1 mb-6 rounded-lg p-1">
          {features?.delivery.enabled && (
            <TabsTrigger
              value="delivery"
              className="relative flex-1 min-w-[100px] py-2"
            >
              Deliveries
              {newOrders.delivery && (
                <span className="absolute -top-1 -right-1 h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger
            value="table"
            className="relative flex-1 min-w-[100px] py-2"
          >
            Table Orders
            {newOrders.table && (
              <span className="absolute -top-1 -right-1 h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </TabsTrigger>
          {features?.pos.enabled && (
            <TabsTrigger
              value="pos"
              className="relative flex-1 min-w-[100px] py-2"
            >
              POS Orders
              {newOrders.pos && (
                <span className="absolute -top-1 -right-1 h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <>
            <TabsContent value="delivery">
              <div className="space-y-4">
                {displayedOrders.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-gray-50">
                    <p className="text-gray-500">No deliveries found</p>
                  </div>
                ) : (
                  <>
                    {displayedOrders.map((order, index) => (
                      <OrderItemCard
                        key={`delivery-${order.id}-${index}`}
                        gstAmount={getGstAmount(
                          order.items.reduce((sum, item) => {
                            return sum + item.price * item.quantity;
                          }, 0),
                          (userData as Partner)?.gst_percentage || 0
                        )}
                        grantTotal={order.totalPrice || 0}
                        order={order}
                        deleteOrder={handleDeleteOrder}
                        updateOrderStatus={(status) => {
                          handleUpdateOrderStatus(order.id, status);
                        }}
                        setOrder={setOrder}
                        setEditOrderModalOpen={setEditOrderModalOpen}
                        gstPercentage={
                          (userData as Partner)?.gst_percentage || 0
                        }
                      />
                    ))}
                  </>
                )}
              </div>
            </TabsContent>
            <TabsContent value="table">
              <div className="space-y-4">
                {displayedOrders.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-gray-50">
                    <p className="text-gray-500">No table orders found</p>
                  </div>
                ) : (
                  <>
                    {displayedOrders.map((order, index) => (
                      <OrderItemCard
                        key={`table-${order.id}-${index}`}
                        gstAmount={getGstAmount(
                          order.items.reduce((sum, item) => {
                            return sum + item.price * item.quantity;
                          }, 0),
                          (userData as Partner)?.gst_percentage || 0
                        )}
                        grantTotal={order.totalPrice || 0}
                        order={order}
                        deleteOrder={handleDeleteOrder}
                        updateOrderStatus={(status) => {
                          handleUpdateOrderStatus(order.id, status);
                        }}
                        setOrder={setOrder}
                        setEditOrderModalOpen={setEditOrderModalOpen}
                        gstPercentage={
                          (userData as Partner)?.gst_percentage || 0
                        }
                      />
                    ))}
                  </>
                )}
              </div>
            </TabsContent>
            <TabsContent value="pos">
              <div className="space-y-4">
                {displayedOrders.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-gray-50">
                    <p className="text-gray-500">No POS orders found</p>
                  </div>
                ) : (
                  <>
                    {displayedOrders.map((order, index) => {
                      const gstPercentage =
                        (userData as Partner)?.gst_percentage || 0;
                      const foodSubtotal = order.items.reduce((sum, item) => {
                        return sum + item.price * item.quantity;
                      }, 0);
                      const gstAmount = getGstAmount(
                        foodSubtotal,
                        gstPercentage
                      );
                      const totalPriceWithGst = foodSubtotal + gstAmount;
                      const extraChargesTotal = (
                        order?.extraCharges ?? []
                      ).reduce((acc, charge) => acc + charge.amount, 0);
                      const grandTotal = totalPriceWithGst + extraChargesTotal;

                      return (
                        <OrderItemCard
                          key={`pos-${order.id}-${index}`}
                          order={order}
                          deleteOrder={handleDeleteOrder}
                          updateOrderStatus={(status) => {
                            handleUpdateOrderStatus(order.id, status);
                          }}
                          setOrder={setOrder}
                          setEditOrderModalOpen={setEditOrderModalOpen}
                          gstPercentage={gstPercentage}
                          gstAmount={gstAmount}
                          grantTotal={grandTotal}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
        <div className="text-sm text-gray-500">
          Showing {orders.length > 0 ? (currentPage - 1) * limit + 1 : 0} -{" "}
          {Math.min(currentPage * limit, totalCount)} of {totalCount} orders
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFirstPage}
            disabled={currentPage === 1 || loading}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!hasPreviousPage || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>

          <div
            className="flex overflow-x-auto hide-scrollbar max-w-[280px] transition-all duration-300 ease-in-out"
            ref={pagesContainerRef}
          >
            {Array.from(
              { length: endPage - startPage + 1 },
              (_, i) => startPage + i
            ).map((page) => (
              <Button
                key={`page-${page}`}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                data-active={currentPage === page}
                onClick={() =>
                  useOrderSubscriptionStore.setState({ currentPage: page })
                }
                disabled={loading}
                className="min-w-[40px] px-3"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasNextPage || loading}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          <div className="flex items-center gap-1">
            <input
              type="text"
              className="w-12 h-8 border rounded px-2 text-center"
              placeholder="#"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGoToPage()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToPage}
              disabled={loading}
            >
              Go
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <EditOrderModal />
    </div>
  );
};

export default OrdersTab;
