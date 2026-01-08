import { Order } from "@/store/orderStore";
import { toStatusDisplayFormat } from "./statusHistory";

export const getStatusDisplay = (
  order: Order
): { text: string; className: string } => {
  const displayStatus = toStatusDisplayFormat(order?.status_history || {});
  const isAccepted = displayStatus.accepted?.isCompleted;
  const isDispatched = displayStatus.dispatched?.isCompleted;
  const isCompleted = displayStatus.completed?.isCompleted;
  const isCancelled = order?.status === "cancelled";
  const orderType = order?.type;

  if (isCancelled) {
    return {
      text: "Cancelled",
      className: "bg-red-100 text-red-800",
    };
  }

  if (isCompleted) {
    return {
      text: "Completed",
      className: "bg-green-100 text-green-800",
    };
  }

  if (isDispatched) {
    if (orderType === "delivery") {
      if (order.deliveryAddress && order.delivery_location) {
        return {
          text: "Dispatched",
          className: "bg-purple-100 text-purple-800",
        };
      }
      return {
        text: "Ready for pickup",
        className: "bg-purple-100 text-purple-800",
      };
    }

    return {
      text: "Ready to serve",
      className: "bg-purple-100 text-purple-800",
    };
  }

  if (isAccepted) {
    return {
      text: "Accepted",
      className: "bg-blue-100 text-blue-800",
    };
  }

  return {
    text: "Pending",
    className: "bg-yellow-100 text-yellow-800",
  };
};