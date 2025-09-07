// src/components/orders/OrderDetailCard.tsx

import React, { useState, useEffect, useRef } from "react";
import useOrderStore, { Order } from "@/store/orderStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { formatDate, getDateOnly } from "@/lib/formatDate";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";
import "./orderDetailCard.css";

interface OrderDetailCardProps {
  orders: Order[];
  onClose: () => void;
  newOrderAlert?: boolean;
}

const SingleOrderView: React.FC<{
  order: Order;
  onProcessed: (orderId: string) => void;
}> = ({ order, onProcessed }) => {
  const { updateOrderStatus, updateOrderStatusHistory } = useOrderStore();
  const { userData } = useAuthStore();

  const handleAccept = () => {
    onProcessed(order.id);
    toast.promise(updateOrderStatusHistory(order.id, "accepted", [order]), {
      loading: "Accepting order...",
      success: "Order Accepted!",
      error: (err) => {
        console.error("Failed to accept order:", err);
        return "Failed to accept order.";
      },
    });
  };

  const handleCancel = () => {
    onProcessed(order.id);
    toast.promise(
      updateOrderStatus([], order.id, "cancelled", () => {}),
      {
        loading: "Cancelling order...",
        success: "Order Cancelled!",
        error: (err) => {
          console.error("Failed to cancel order:", err);
          return "Failed to cancel order.";
        },
      }
    );
  };

  const foodSubtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const gstPercentage = (userData as Partner)?.gst_percentage || 0;
  const gstAmount = getGstAmount(foodSubtotal, gstPercentage);
  const extraChargesTotal = (order.extraCharges ?? []).reduce(
    (acc, charge) => acc + charge.amount,
    0
  );
  const grantTotal = foodSubtotal + gstAmount + extraChargesTotal;
  const orderTypeDisplay =
    !order?.deliveryAddress && order.type === "delivery"
      ? "Takeaway"
      : order?.type?.replace(/_/g, " ");

  return (
    <div
      id="order-alert-modal-card"
      className="w-full h-full p-6 flex flex-col text-black dark:text-white"
    >
      <div className="flex-shrink-0 mb-4">
        <h2 className="text-lg font-semibold flex justify-between items-center capitalize">
          <span>{orderTypeDisplay}</span>
          <span className="text-sm font-medium text-gray-500">
            {(Number(order.display_id) ?? 0) > 0
              ? `${order.display_id}-${getDateOnly(order.createdAt)}`
              : order.id.slice(0, 8)}
          </span>
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Received at {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="flex-grow overflow-y-auto pr-3 space-y-4">
        <div className="text-sm border p-3 rounded-md bg-gray-50/50 dark:bg-zinc-800/50">
          <h3 className="font-semibold mb-2">Customer Details</h3>
          {(order?.phone || order.user?.phone) && (
            <p>
              <strong>Phone:</strong>{" "}
              {order.user?.phone || order.phone || "N/A"}
            </p>
          )}
          {order.type === "table_order" && (
            <p>
              <strong>Table:</strong>{" "}
              {order.tableName || order.tableNumber || "N/A"}
            </p>
          )}
          {order.type === "delivery" &&
            (order.deliveryAddress || order.delivery_location) && (
              <p>
                <strong>Address:</strong> {order.deliveryAddress || "N/A"}
              </p>
            )}
        </div>
        <div className="text-sm border p-3 rounded-md">
          <h3 className="font-semibold mb-2">Order Items</h3>
          <div className="space-y-1">
            {order.items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex justify-between items-center"
              >
                <span>
                  {item.name}{" "}
                  <span className="text-gray-500">x {item.quantity}</span>
                </span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm border p-3 rounded-md">
          <h3 className="font-semibold mb-2">Bill Details</h3>
          <div className="space-y-1 font-medium">
            <div className="flex justify-between">
              <span>Subtotal:</span> <span>₹{foodSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST ({gstPercentage}%):</span>{" "}
              <span>₹{gstAmount.toFixed(2)}</span>
            </div>
            {(order.extraCharges ?? []).map((charge, index) => (
              <div key={index} className="flex justify-between">
                <span>{charge.name}:</span>{" "}
                <span>₹{charge.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t my-1"></div>
            <div className="flex justify-between text-base font-bold">
              <span>Grand Total:</span> <span>₹{grantTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="destructive" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleAccept}>Accept</Button>
      </div>
    </div>
  );
};

const OrderDetailCard: React.FC<OrderDetailCardProps> = ({
  orders,
  onClose,
  newOrderAlert = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const orderSetted = useRef(false);
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (orders.length > 0 && newOrderAlert ) {
      setVisibleOrders(orders);
      orderSetted.current = true;
      setIsOpen(true);
    }
  }, [orders, newOrderAlert]);

    const handleClose = () => {
    setIsOpen(false);
    orderSetted.current = false;
    // setVisibleOrders([]);
    onClose();
  
  };

  useEffect(() => {
    if(visibleOrders.length === 0) {
      handleClose();
    }
  },[visibleOrders]);

  if (orders.length === 0) {
    return null;
  }

  // if media width < 425 px return null 
  if (typeof window !== "undefined" && window.innerWidth < 500) {
    return null;
  }



  const handleProcessed = (orderId: string) => {
    setVisibleOrders((currentOrders) =>
      currentOrders.filter((o) => o.id !== orderId)
    );
  };

  return (
      <AlertDialog open={isOpen} onOpenChange={handleClose}>
        <AlertDialogContent id="order-alert-detail-card" className="w-full p-0 border-none bg-transparent shadow-none flex items-center justify-center">
          <AlertDialogCancel
            onClick={handleClose}
            className="absolute top-4 right-4 z-50 rounded-full p-1.5 border-none bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black"
          >
            <X className="h-5 w-5" />
          </AlertDialogCancel>

          <Swiper
            effect={"cards"}
            grabCursor={true}
            modules={[EffectCards]}
            className="w-[280px] h-[520px] sm:w-[400px]"
            key={visibleOrders.length}
          >
            {visibleOrders.map((order) => (
              <SwiperSlide key={order.id}>
                <SingleOrderView order={order} onProcessed={handleProcessed} />
              </SwiperSlide>
            ))}
          </Swiper>
        </AlertDialogContent>
      </AlertDialog>
  );
};

export default OrderDetailCard;
