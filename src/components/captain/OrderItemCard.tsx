import { Order } from "@/store/orderStore";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Clock, CheckCircle, XCircle, Printer, Edit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useReactToPrint } from "react-to-print";
import { useRef, useState } from "react";
import Link from "next/link";
// import BillTemplate from "@/components/captain/pos/BillTemplate";
// import KOTTemplate from "@/components/captain/pos/KOTTemplate";
import { Captain, useAuthStore } from "@/store/authStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getDateOnly } from "@/lib/formatDate";

interface OrderItemCardProps {
  order: Order;
  updateOrderStatus: (
    orderId: string,
    status: "completed" | "cancelled"
  ) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  setOrder: (order: Order | null) => void;
  setEditOrderModalOpen: (open: boolean) => void;
  grantTotal: number;
  gstAmount: number;
  gstPercentage: number;
}

const OrderItemCard = ({
  order,
  updateOrderStatus,
  deleteOrder,
  setOrder,
  setEditOrderModalOpen,
  grantTotal,
  gstAmount,
  gstPercentage,
}: OrderItemCardProps) => {
  const { userData } = useAuthStore();
  const captainData = userData as Captain | null;
  //   const billRef = useRef<HTMLDivElement>(null);
  //   const kotRef = useRef<HTMLDivElement>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  //   const handlePrintBill = useReactToPrint({
  //     content: () => billRef.current,
  //   });

  //   const handlePrintKOT = useReactToPrint({
  //     content: () => kotRef.current,
  //   });

  // Add console logging for grantTotal
  // console.log("OrderItemCard grantTotal details:", {
  //   orderId: order.id,
  //   grantTotal,
  //   orderTotalPrice: order.totalPrice,
  //   extraCharges: order.extraCharges,
  //   extraChargesTotal: (order.extraCharges || []).reduce((sum, c) => sum + (c.amount || 0), 0),
  //   foodSubtotal: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  //   gstAmount,
  //   gstPercentage
  // });

  // Add console logging for captain orders
  // if (order.orderedby === "captain") {
  //   console.log("Captain order details:", {
  //     orderCaptain: order.captain,
  //     userDataCaptain: captainData,
  //     orderId: order.id,
  //     captainId: order.captain_id
  //   });
  // }

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await updateOrderStatus(order.id, "cancelled");
      setIsCancelDialogOpen(false);
      toast.success("Order cancelled successfully");
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "completed":
        return "text-green-600 bg-green-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Completed Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this completed order? This action
              will mark the order as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              No, keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling..." : "Yes, cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
          {/* Left section - Order details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-2">
                <div className="font-medium text-base sm:text-lg truncate">
                  {order.orderedby === "captain"
                    ? `Order ${
                        (Number(order.display_id) ?? 0) > 0
                          ? `${order.display_id}-${getDateOnly(
                              order.createdAt
                            )}`
                          : order.id.slice(0, 8)
                      }`
                    : order.type === "delivery"
                    ? "Delivery Order"
                    : order.type === "table_order"
                    ? "Table Order"
                    : "POS Order"}
                  {(Number(order.display_id) ?? 0) > 0 && (
                    <h2 className="text-sm text-gray-800">
                      ID: {order.id.slice(0, 8)}
                    </h2>
                  )}
                </div>
                {/* Show TAKEAWAY label for orders with no delivery address or location */}
                {order.type === "delivery" &&
                  (!order.deliveryAddress ||
                    order.deliveryAddress === "Unknown" ||
                    order.deliveryAddress === "N/A" ||
                    !order.delivery_location) && (
                    <span className="text-red-600 font-bold text-sm ">
                      TAKEAWAY
                    </span>
                  )}
              </div>
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${getStatusColor(
                  order.status
                )}`}
              >
                {getStatusIcon(order.status)}
                <span>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>
            {order.orderedby === "captain" && (
              <div className="text-sm text-gray-600 mt-1 truncate">
                Captain: {order.captain?.name || "Unknown Captain"}
                {order.tableNumber && (
                  <span className="ml-2">• Table {order.tableName || order.tableNumber}</span>
                )}
                {(order.user?.phone || order.phone) &&
                  (order.user?.phone || order.phone || "").trim() !== "" && (
                    <span className="ml-2">
                      • Customer: {order.user?.phone || order.phone}
                    </span>
                  )}
              </div>
            )}
            <div className="text-sm text-gray-500 mt-1">
              {(() => {
                try {
                  if (!order.createdAt) return "Date not available";
                  const date = new Date(order.createdAt);
                  if (isNaN(date.getTime())) return "Invalid date";
                  return format(date, "PPp");
                } catch (error) {
                  return "Error formatting date";
                }
              })()}
            </div>
            <div className="mt-2 space-y-1">
              {order.items.map((item, index) => (
                <div key={index} className="text-xs sm:text-sm truncate">
                  {item.quantity}x {item.name}
                </div>
              ))}
            </div>
          </div>

          {/* Right section - Total and actions */}
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="font-medium text-base sm:text-lg">
                ₹{grantTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section with buttons */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-between">
          {/* Left side - KOT and Cancel buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link
              href={`/kot/${order.id}`}
              target="_blank"
              passHref
              className="flex-1 sm:flex-none"
            >
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto flex items-center gap-1.5 text-xs py-1 px-2.5 h-8"
              >
                <Printer className="h-3 w-3" />
                Print KOT
              </Button>
            </Link>
            {order.status === "completed" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsCancelDialogOpen(true)}
                className="flex-1 sm:flex-none w-full sm:w-auto text-xs py-1 px-2.5 h-8"
              >
                Cancel Order
              </Button>
            )}
          </div>

          {/* Right side - Edit button */}
          <div className="w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              variant="outline"
              onClick={() => {
                setOrder(order);
                setEditOrderModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-1 px-2.5 h-8 text-xs"
              disabled={!order.items || order.items.length === 0}
            >
              <Edit className="h-3 w-3" />
              Edit Order
            </Button>
          </div>
        </div>
      </Card>

      {/* Hidden templates for printing */}
      <div style={{ display: "none" }}>
        {/* <div ref={billRef}> */}
        {/* <BillTemplate
            order={order}
            userData={userData}
            gstAmount={gstAmount}
            gstPercentage={gstPercentage}
            grantTotal={grantTotal}
          /> */}
      </div>
      {/* <div ref={kotRef}>
          <KOTTemplate order={order} />
        </div> */}
      {/* </div> */}
    </>
  );
};

export default OrderItemCard;
