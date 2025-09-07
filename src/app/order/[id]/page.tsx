"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDate } from "@/lib/formatDate";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExtraCharge } from "@/store/posStore";
import StatusHistoryTimeline from "@/components/StatusHistoryTimeline";
import { toStatusDisplayFormat } from "@/lib/statusHistory";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { Order, OrderItem } from "@/store/orderStore";
import OfferLoadinPage from "@/components/OfferLoadinPage";
import { getStatusDisplay } from "@/lib/getStatusDisplay";

const GET_ORDER_QUERY = `
  subscription GetOrder($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      total_price
      created_at
      notes
      table_number
      qr_id
      type
      delivery_address
      delivery_location
      status
      status_history
      partner_id
      partner {
        gst_percentage
        currency
        store_name
      }
      gst_included
      extra_charges
      phone
      user_id
      user {
        full_name
        phone
        email
      }
      partner {
        name
        currency
      }
      order_items {
        id
        quantity
        item
      }
    }
  }
`;

const OrderPage = () => {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeToHasura({
      query: GET_ORDER_QUERY,
      variables: { id: orderId },
      onNext: (data) => {
        if (data?.data.orders_by_pk) {
          const order = data.data.orders_by_pk;
          setOrder({
            id: order?.id,
            totalPrice: order?.total_price,
            createdAt: order?.created_at,
            tableNumber: order?.table_number,
            qrId: order?.qr_id,
            status: order?.status,
            status_history: order?.status_history,
            type: order?.type,
            phone: order?.phone,
            notes: order?.notes,
            deliveryAddress: order?.delivery_address,
            delivery_location: order?.delivery_location,
            partnerId: order?.partner_id,
            partner: order?.partner,
            userId: order?.user_id,
            gstIncluded: order?.gst_included,
            extraCharges: order?.extra_charges || [],
            delivery_charge: order?.delivery_charge,
            user: order?.user,
            items: order?.order_items.map((i: any) => ({
              id: i.item.id,
              quantity: i.quantity,
              name: i.item?.name || "Unknown",
              price: i.item?.offers?.[0]?.offer_price || i.item?.price || 0,
              category: i.menu?.category,
            })),
          });
        } else {
          setError("Order not found");
        }
        setLoading(false);
      },
      onError: (error) => {
        console.error("Error fetching order data:", error);
        setError("Failed to load order data");
        setLoading(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  // Calculate order totals
  const subtotal = order?.items?.reduce(
    (sum, orderItem) => sum + orderItem.price * orderItem.quantity,
    0
  );

  const extraChargesTotal =
    order?.extraCharges?.reduce(
      (sum, charge) =>
        sum +
        getExtraCharge(
          order?.items,
          charge.amount,
          charge.charge_type as "FLAT_FEE" | "PER_ITEM"
        ),
      0
    ) || 0;

  const gstPercentage = order?.gstIncluded || 0;
  const gstAmount = ((subtotal ?? 0) * gstPercentage) / 100;
  const grandTotal = (subtotal ?? 0) + gstAmount + extraChargesTotal;

  const statusDisplay = getStatusDisplay(order as Order);

  return (
    <>
      {loading ? (
        <>
          <OfferLoadinPage message="Loading Order.." />
        </>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto bg-white rounded-lg overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold">
                    Order #{order?.id.slice(0, 8)}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {order?.createdAt && formatDate(order?.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.className}`}
                  >
                    {statusDisplay.text}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">
                    Order Information
                  </h2>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Order Type</p>
                      <p className="capitalize">
                        {order?.type?.replace("_", " ")}
                      </p>
                    </div>
                    {order?.type === "table_order" && order?.tableNumber && (
                      <div>
                        <p className="text-sm text-gray-500">Table Number</p>
                        <p>{order?.tableNumber}</p>
                      </div>
                    )}
                    {order?.type === "delivery" && (
                      <div>
                        <p className="text-sm text-gray-500">
                          Delivery Address
                        </p>
                        <p>{order?.deliveryAddress || "N/A"}</p>
                        {order.delivery_location &&
                          (order.delivery_location?.coordinates?.length ?? 0) >
                            0 && (
                            <div className="mt-2">
                              <a
                                href={`https://www.google.com/maps?q=${order.delivery_location.coordinates[1]},${order.delivery_location.coordinates[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${order.delivery_location.coordinates[0]},${order.delivery_location.coordinates[1]})/${order.delivery_location.coordinates[0]},${order.delivery_location.coordinates[1]},16/600x300?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                                  alt="Delivery location"
                                  className="w-full h-auto rounded-md border border-gray-200"
                                />
                              </a>
                              <p className="text-xs text-gray-500 mt-1">
                                Click on map to view in Google Maps
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Customer Phone</p>
                      <p>{order?.user?.phone || order?.phone || "Unknown"}</p>
                    </div>

                    {order?.notes && (
                      <div className="text-orange-500">
                        <p className="text-sm opacity-70">Notes</p>
                        <p>{order?.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:hidden">
                  <StatusHistoryTimeline
                    status_history={order?.status_history || {}}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Order Items</h2>
                  <div className="border rounded-lg divide-y">
                    {order?.items.map((orderItem: OrderItem) => (
                      <div
                        key={orderItem.id}
                        className="p-3 flex justify-between"
                      >
                        <div>
                          <p className="font-medium">{orderItem.name}</p>
                          <p className="text-sm text-gray-500">
                            {orderItem.category?.name && (
                              <>{orderItem.category.name} × </>
                            )}
                            {orderItem.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          {order?.partner?.currency || "₹"}
                          {(orderItem.price * orderItem.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    {order?.extraCharges?.map((charge, index) => (
                      <div key={index} className="flex justify-between">
                        <p className="text-sm text-gray-500">{charge.name}</p>
                        <p className="text-sm">
                          {order?.partner?.currency || "₹"}
                          {charge.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}

                    <div className="flex justify-between border-t pt-2">
                      <p className="text-sm text-gray-500">Subtotal</p>
                      <p className="text-sm">
                        {order?.partner?.currency || "₹"}
                        {subtotal?.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">
                        GST ({gstPercentage}%)
                      </p>
                      <p className="text-sm">
                        {order?.partner?.currency || "₹"}
                        {gstAmount.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex justify-between font-bold border-t pt-2">
                      <p>Grand Total</p>
                      <p>
                        {order?.partner?.currency || "₹"}
                        {order?.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:block">
              <StatusHistoryTimeline
                status_history={order?.status_history || {}}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderPage;
