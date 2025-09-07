import React from "react";
import { Order } from "@/store/orderStore";

const KOTTemplate = ({ ref, order }: { ref: React.RefObject<HTMLDivElement | null>, order: Order }) => {

    if (!order) return null;

  return (
    <div ref={ref} className="p-4 kot-template">
      <h2 className="text-xl font-bold text-center">KITCHEN ORDER TICKET</h2>
      <div className="border-b border-black my-2"></div>
      <div className="flex justify-between mb-2">
        <span className="font-medium">Order #:</span>
        <span>{order.id.slice(0,8)}</span>
      </div>
      <div className="flex justify-between mb-4">
        <span className="font-medium">Table:</span>
        <span>{order.tableNumber || "Takeaway"}</span>
      </div>
      {order.notes && (
        <div className="mb-4 p-2">
          <div className="font-bold text-sm">Order Notes:</div>
          <div className="text-sm">{order.notes}</div>
        </div>
      )}
      <div className="border-b border-black my-2"></div>
      <h3 className="font-bold mb-2">Items:</h3>
      <ul className="space-y-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>
              {item.quantity}x {item.name}
            </span>
            {/* {item.notes && <span className="text-sm">({item.})</span>} */}
          </li>
        ))}
      </ul>
      <div className="border-b border-black my-2"></div>
      <div className="text-center text-sm mt-4">
        {new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })}
      </div>
    </div>
  );
};

export default KOTTemplate;
