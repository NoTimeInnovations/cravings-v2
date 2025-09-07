import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useAuthStore, Captain } from "./authStore";
import {
  createOrderItemsMutation,
  createOrderMutation,
  createOrderWithItemsMutation,
  ordersCountSubscription,
  paginatedOrdersSubscription,
  subscriptionQuery,
  userSubscriptionQuery,
} from "@/api/orders";
import { toast } from "sonner";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { QrGroup } from "@/app/admin/qr-management/page";
import { revalidateTag } from "@/app/actions/revalidate";
import { usePOSStore } from "./posStore";
import { v4 as uuidv4 } from "uuid";
import {
  defaultStatusHistory,
  OrderStatusDisplay,
  OrderStatusHistoryTypes,
  OrderStatusStorage,
  setStatusHistory,
  toStatusDisplayFormat,
} from "@/lib/statusHistory";
import { Notification } from "@/app/actions/notification";
// import { sendOrderNotification } from "@/app/actions/notification";

export interface OrderItem extends HotelDataMenus {
  id: string;
  quantity: number;
}

export interface DeliveryRange {
  from_km: number;
  to_km: number;
  rate: number;
}

// Legacy format for backward compatibility
export interface LegacyFirstKmRange {
  km: number;
  rate: number;
}

export interface DeliveryRules {
  delivery_radius: number;
  // New format
  delivery_ranges?: DeliveryRange[];
  // Legacy format
  first_km_range?: LegacyFirstKmRange;
  // Mode indicator
  delivery_mode?: "basic" | "advanced";
  is_fixed_rate: boolean;
  minimum_order_amount: number;
  delivery_time_allowed: {
    from: string;
    to: string;
  } | null;
  isDeliveryActive : boolean;
  needDeliveryLocation: boolean;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  createdAt: string;
  notes?: string | null;
  tableNumber?: number | null;
  qrId?: string | null;
  status: "pending" | "completed" | "cancelled";
  partnerId: string;
  display_id?: string;
  status_history?: OrderStatusStorage;
  partner?: {
    gst_percentage?: number;
    currency?: string;
    store_name?: string;
  };
  phone?: string | null;
  userId?: string;
  user?: {
    phone?: string;
    name?: string;
    email?: string;
  };
  type?: "table_order" | "delivery" | "pos";
  deliveryAddress?: string | null;
  gstIncluded?: number;
  orderedby?: string;
  delivery_charge?: number | null;
  delivery_location?: {
    type: string;
    coordinates: [number, number];
  };
  order_number?: string;
  captain_id?: string;
  captain?: {
    id: string;
    name: string;
    phone?: string;
    email: string;
  };
  tableName?: string | null; 
  extraCharges?:
    | {
        name: string;
        amount: number;
        charge_type?: string;
        id?: string;
      }[]
    | null;
}

export interface DeliveryInfo {
  distance: number;
  cost: number;
  ratePerKm: number;
  minimumOrderAmount: number;
  isOutOfRange: boolean;
}

interface HotelOrderState {
  items: OrderItem[];
  totalPrice: number;
  order: Order | null;
  orderId: string | null;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
}

interface OrderState {
  hotelId: string | null;
  hotelOrders: Record<string, HotelOrderState>;
  userAddress: string | null;
  orderNote: string | null;
  open_auth_modal: boolean;
  open_drawer_bottom: boolean;
  order: Order | null;
  items: OrderItem[] | null;
  orderId: string | null;
  totalPrice: number | null;
  open_order_drawer: boolean;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  deliveryInfo: DeliveryInfo | null;
  deliveryCost: number | null;
  open_place_order_modal: boolean;
  setOpenPlaceOrderModal: (open: boolean) => void;
  orderType: "takeaway" | "delivery" | null;
  setOrderType: (type: "takeaway" | "delivery") => void;
  setOpenDrawerBottom: (open: boolean) => void;
  setOpenOrderDrawer: (open: boolean) => void;
  setDeliveryInfo: (info: DeliveryInfo | null) => void;

  setHotelId: (id: string) => void;
  addItem: (item: HotelDataMenus) => void;
  removeItem: (itemId: string) => void;
  increaseQuantity: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;
  clearOrder: () => void;
  placeOrder: (
    hotelData: HotelData,
    tableNumber?: number,
    qrId?: string,
    gstIncluded?: number,
    extraCharges?:
      | {
          name: string;
          amount: number;
          charge_type?: string;
        }[]
      | null,
    deliveryCharge?: number,
    notes?: string
  ) => Promise<Order | null>;
  getCurrentOrder: () => HotelOrderState;
  fetchOrderOfPartner: (partnerId: string) => Promise<Order[] | null>;
  setOpenAuthModal: (open: boolean) => void;
  genOrderId: () => string;
  setUserAddress: (address: string) => void;
  setOrderNote: (note: string) => void;
  setUserCoordinates: (coords: { lat: number; lng: number }) => void;
  subscribeOrders: (callback?: (orders: Order[]) => void) => () => void;
  subscribePaginatedOrders: (
    limit: number,
    offset: number,
    callback?: (orders: Order[]) => void
  ) => () => void;
  subscribeOrdersCount: (callback?: (count: number) => void) => () => void;
  partnerOrders: Order[];
  userOrders: Order[];
  subscribeUserOrders: (callback?: (orders: Order[]) => void) => () => void;
  deleteOrder: (orderId: string) => Promise<boolean>;
  updateOrderStatus: (
    orders: Order[],
    orderId: string,
    newStatus: "completed" | "cancelled" | "pending",
    setOrders: (orders: Order[]) => void
  ) => Promise<void>;
  updateOrderStatusHistory: (
    orderId: string,
    status: OrderStatusHistoryTypes,
    orders: Order[]
  ) => Promise<void>;
}

const useOrderStore = create(
  persist<OrderState>(
    (set, get) => ({
      hotelId: null,
      hotelOrders: {},
      userAddress: null,
      orderNote: null,
      open_auth_modal: false,
      order: null,
      items: [],
      orderId: null,
      partnerOrders: [],
      totalPrice: 0,
      userOrders: [],
      open_order_drawer: false,
      deliveryInfo: null,
      deliveryCost: null,
      coordinates: null,
      open_drawer_bottom: false,
      open_place_order_modal: false,
      orderType: null,

      setOrderType: (type: "takeaway" | "delivery") => {
        set({ orderType: type });
      },

      setOpenOrderDrawer: (open: boolean) => set({ open_order_drawer: open }),
      setDeliveryInfo: (info: DeliveryInfo | null) =>
        set({ deliveryInfo: info }),
      setDeliveryCost: (cost: number | null) => set({ deliveryCost: cost }),
      setOpenDrawerBottom: (open: boolean) => set({ open_drawer_bottom: open }),

      updateOrderStatusHistory: async (
        orderId: string,
        status: OrderStatusHistoryTypes,
        orders: Order[]
      ) => {
        try {
          const order = orders.find((o) => o.id === orderId);
          if (!order) {
            throw new Error("Order not found");
          }

          const currentStatusHistory =
            order.status_history || defaultStatusHistory;

          const updatedStatusHistory = setStatusHistory(
            currentStatusHistory,
            status,
            { isCompleted: true }
          );

          const defaultQuery = `mutation UpdateOrderStatusHistory($orderId: uuid!, $statusHistory: json!) {
              update_orders_by_pk(
                pk_columns: {id: $orderId},
                _set: {status_history: $statusHistory}
              ) {
                id
                status_history
              }
            }`;

          const updateStatusAndStatusHistoryQuery = `mutation UpdateOrderStatusHistory($orderId: uuid!, $statusHistory: json!) {
              update_orders_by_pk(
                pk_columns: {id: $orderId},
                _set: {status_history: $statusHistory , status: "completed"}
              ) {
                id
                status_history
                status
              }
            }`;

          const response = await fetchFromHasura(
            status === "completed"
              ? updateStatusAndStatusHistoryQuery
              : defaultQuery,
            {
              orderId,
              statusHistory: updatedStatusHistory,
            }
          );

          await Notification.user.sendOrderStatusNotification(order, status);

          if (response.errors) {
            throw new Error(
              response.errors[0]?.message || "Failed to update status history"
            );
          }

          const updatedOrders = orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status_history: updatedStatusHistory,
                }
              : o
          );

          toast.success(`Order status updated`);
        } catch (error) {
          console.error(error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update order status history"
          );
        }
      },

      updateOrderStatus: async (
        orders: Order[],
        orderId: string,
        newStatus: "completed" | "cancelled" | "pending",
        setOrders: (orders: Order[]) => void
      ) => {
        const userData = useAuthStore.getState().userData;

        try {
          const response = await fetchFromHasura(
            `mutation UpdateOrderStatus($orderId: uuid!, $status: String!) {
                update_orders_by_pk(pk_columns: {id: $orderId}, _set: {status: $status}) {
                  id
                  status
                }
              }`,
            { orderId, status: newStatus }
          );

          if (response.errors) throw new Error(response.errors[0].message);

          if (newStatus === "completed") {
            const order = orders.find((o) => o.id === orderId);
            if (order) {
              for (const item of order.items) {
                if (item.stocks?.[0]?.id) {
                  await fetchFromHasura(
                    `mutation DecreaseStockQuantity($stockId: uuid!, $quantity: numeric!) {
                        update_stocks_by_pk(
                          pk_columns: {id: $stockId},
                          _inc: {stock_quantity: $quantity}
                        ) {
                          id
                          stock_quantity
                        }
                      }`,
                    {
                      stockId: item.stocks?.[0]?.id,
                      quantity: -item.quantity,
                    }
                  );
                }
              }
              revalidateTag(userData?.id as string);
            }
          }

          if (newStatus === "cancelled") {
            const order = orders.find((o) => o.id === orderId);
            if (order) {
              await Notification.user.sendOrderStatusNotification(
                order,
                newStatus
              );
            }
          }

          const updatedOrders = orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          );

          setOrders(updatedOrders);
          toast.success(`Order marked as ${newStatus}`);
        } catch (error) {
          console.error(error);
          toast.error(`Failed to update order status`);
        }
      },

      setOpenPlaceOrderModal: (open) => {
        set({ open_place_order_modal: open })
      },

      setUserCoordinates: (coords) => {
        set({ coordinates: coords });
      },

      subscribeUserOrders: (callback) => {
        const userId = useAuthStore.getState().userData?.id;

        const unsubscribe = subscribeToHasura({
          query: userSubscriptionQuery,
          variables: { user_id: userId },
          onNext: (data) => {
            const allOrders = data.data?.orders.map((order: any) => ({
              id: order.id,
              totalPrice: order.total_price,
              createdAt: order.created_at,
              tableNumber: order.table_number,
              qrId: order.qr_id,
              status: order.status,
              status_history: order.status_history,
              type: order.type,
              phone: order.phone,
              deliveryAddress: order.delivery_address,
              delivery_location: order.delivery_location,
              partnerId: order.partner_id,
              partner: order.partner,
              notes: order.notes || null,
              userId: order.user_id,
              gstIncluded: order.gst_included,
              tableName: order.qr_code?.table_name || order.table_name || null,
              extraCharges: order.extra_charges || [], // Handle null case
              delivery_charge: order.delivery_charge, // Include delivery_charge
              user: order.user,
              items: order.order_items.map((i: any) => ({
                id: i.item.id,
                quantity: i.quantity,
                name: i.item?.name || "Unknown",
                price: i.item?.offers?.[0]?.offer_price || i.item?.price || 0,
                category: i.item?.category,
              })),
            }));

            if (allOrders) {
              set({ userOrders: allOrders });
              if (callback) callback(allOrders);
            }
          },
          onError: (error) => {
            console.error("Subscription error:", error);
          },
        });

        return unsubscribe;
      },

      subscribeOrders: (callback) => {
        const { userData } = useAuthStore.getState();

        let partnerId = userData?.id;
        if (userData?.role === "captain") {
          partnerId = userData.partner_id;
        }

        if (!partnerId) {
          return () => {};
        }

        return subscribeToHasura({
          query: subscriptionQuery,
          variables: {
            partner_id: partnerId,
          },
          onNext: (data) => {
            if (data?.data?.orders) {
              console.log(data.data.orders);

              const orders = data.data.orders.map(transformOrderFromHasura);
              set({ partnerOrders: orders });

              if (callback) {
                callback(orders);
              }
            }
          },
        });
      },

      subscribePaginatedOrders: (limit, offset, callback) => {
        const { userData } = useAuthStore.getState();

        if (!userData?.id) {
          return () => {};
        }

        const now = new Date();
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const todayEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );

        return subscribeToHasura({
          query: paginatedOrdersSubscription,
          variables: {
            partner_id: userData.id,
            limit,
            offset,
            today_start: todayStart.toISOString(),
            today_end: todayEnd.toISOString(),
          },
          onNext: (data) => {
            if (data?.data?.orders) {
              const orders = data.data.orders.map(transformOrderFromHasura);
              set({ partnerOrders: orders });

              if (callback) {
                callback(orders);
              }
            }
          },
        });
      },

      subscribeOrdersCount: (callback) => {
        const { userData } = useAuthStore.getState();

        if (!userData?.id) {
          return () => {};
        }

        return subscribeToHasura({
          query: ordersCountSubscription,
          variables: { partner_id: userData.id },
          onNext: (data) => {
            if (data?.data?.orders_aggregate?.aggregate?.count !== undefined) {
              const count = data.data.orders_aggregate.aggregate.count;

              if (callback) {
                callback(count);
              }
            }
          },
        });
      },

      setHotelId: (id: string) => {
        set((state) => {
          const hotelOrders = { ...state.hotelOrders };
          if (!hotelOrders[id]) {
            hotelOrders[id] = {
              items: [],
              totalPrice: 0,
              order: null,
              orderId: null,
              coordinates: null,
            };
          }
          return {
            hotelId: id,
            hotelOrders,
            order: hotelOrders[id].order,
            items: hotelOrders[id].items,
            orderId: hotelOrders[id].orderId,
            totalPrice: hotelOrders[id].totalPrice,
          };
        });
      },

      getCurrentOrder: () => {
        const state = get();
        if (!state.hotelId) {
          return {
            items: [],
            totalPrice: 0,
            order: null,
            orderId: null,
            coordinates: null,
          };
        }
        return (
          state.hotelOrders[state.hotelId] || {
            items: [],
            totalPrice: 0,
            order: null,
            orderId: null,
            coordinates: null,
          }
        );
      },

      setUserAddress: (address: string) => {
        set({ userAddress: address });
      },

      setOrderNote: (note: string) => {
        set({ orderNote: note });
      },

      setOpenAuthModal: (open) => set({ open_auth_modal: open }),

      genOrderId: () => {
        const state = get();
        const orderId = uuidv4();

        if (state.hotelId) {
          set((state) => {
            const hotelOrders = { ...state.hotelOrders };
            hotelOrders[state.hotelId!] = {
              ...(hotelOrders[state.hotelId!] || {
                items: [],
                totalPrice: 0,
                order: null,
              }),
              orderId,
            };
            return { hotelOrders };
          });
        }
        return orderId;
      },

      addItem: (item) => {
        const state = get();
        if (!state.hotelId) return;

        set((state) => {
          const hotelOrders = { ...state.hotelOrders };
          const hotelOrder = hotelOrders[state.hotelId!] || {
            items: [],
            totalPrice: 0,
            order: null,
            orderId: null,
          };

          if (item.variantSelections && item.variantSelections.length > 0) {
            const itemIdWithVariants = `${item.id}`;

            const existingItem = hotelOrder.items.find(
              (i) => i.id === itemIdWithVariants
            );

            if (existingItem) {
              // If same variant combination exists, just increase quantity
              const updatedItems = hotelOrder.items.map((i) =>
                i.id === itemIdWithVariants
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              );

              hotelOrders[state.hotelId!] = {
                ...hotelOrder,
                items: updatedItems,
                totalPrice: hotelOrder.totalPrice + item.price,
              };
            } else {
              // Create new item with variant information
              const newItem: OrderItem = {
                ...item,
                id: itemIdWithVariants,
                quantity: 1,
                variantSelections: item.variantSelections,
                name: item.name, // This already includes variant info from the component
                price: item.price, // This is the total price of all variants
              };

              hotelOrders[state.hotelId!] = {
                ...hotelOrder,
                items: [...hotelOrder.items, newItem],
                totalPrice: hotelOrder.totalPrice + item.price,
              };
            }

          } else {
            // Original logic for items without variants
            const existingItem = hotelOrder.items.find((i) => i.id === item.id);

            if (existingItem) {
              const updatedItems = hotelOrder.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              );
              hotelOrders[state.hotelId!] = {
                ...hotelOrder,
                items: updatedItems,
                totalPrice: hotelOrder.totalPrice + item.price,
              };
            } else {
              const newItem: OrderItem = {
                ...item,
                id: item.id || "",
                quantity: 1,
                variantSelections: [],
              };
              hotelOrders[state.hotelId!] = {
                ...hotelOrder,
                items: [...hotelOrder.items, newItem],
                totalPrice: hotelOrder.totalPrice + item.price,
              };
            }
          }

          return {
            hotelOrders,
            items: hotelOrders[state.hotelId!].items,
            orderId: hotelOrders[state.hotelId!].orderId,
            totalPrice: hotelOrders[state.hotelId!].totalPrice,
          };
        });
      },

      removeItem: (itemId) => {
        const state = get();
        if (!state.hotelId) return;

        set((state) => {
          const hotelOrders = { ...state.hotelOrders };
          const hotelOrder = hotelOrders[state.hotelId!];
          if (!hotelOrder) return state;

          const itemToRemove = hotelOrder.items.find(
            (item) => item.id === itemId
          );
          if (!itemToRemove) return state;

          // Calculate price to subtract (handles both regular items and variant items)
          const priceToSubtract = itemToRemove.price * itemToRemove.quantity;

          hotelOrders[state.hotelId!] = {
            ...hotelOrder,
            items: hotelOrder.items.filter((item) => item.id !== itemId),
            totalPrice: hotelOrder.totalPrice - priceToSubtract,
          };

          return {
            hotelOrders,
            items: hotelOrders[state.hotelId!].items,
            orderId: hotelOrders[state.hotelId!].orderId,
            totalPrice: hotelOrders[state.hotelId!].totalPrice,
          };
        });
      },

      decreaseQuantity: (itemId) => {
        const state = get();
        if (!state.hotelId) return;

        set((state) => {
          const hotelOrders = { ...state.hotelOrders };
          const hotelOrder = hotelOrders[state.hotelId!];
          if (!hotelOrder) return state;

          const itemToDecrease = hotelOrder.items.find(
            (item) => item.id === itemId
          );

          console.log(itemToDecrease);

          if (!itemToDecrease) return state;

          if (itemToDecrease.quantity > 1) {
            // Decrease quantity
            const updatedItems = hotelOrder.items.map((item) =>
              item.id === itemId
                ? { ...item, quantity: item.quantity - 1 }
                : item
            );

            hotelOrders[state.hotelId!] = {
              ...hotelOrder,
              items: updatedItems,
              totalPrice: hotelOrder.totalPrice - itemToDecrease.price,
            };
          } else {
            // Remove item if quantity would go to 0
            hotelOrders[state.hotelId!] = {
              ...hotelOrder,
              items: hotelOrder.items.filter((item) => item.id !== itemId),
              totalPrice: hotelOrder.totalPrice - itemToDecrease.price,
            };
          }

          return {
            hotelOrders,
            items: hotelOrders[state.hotelId!].items,
            orderId: hotelOrders[state.hotelId!].orderId,
            totalPrice: hotelOrders[state.hotelId!].totalPrice,
          };
        });
      },

      deleteOrder: async (orderId: string) => {
        try {
          const deleteItemsResponse = await fetchFromHasura(
            `mutation DeleteOrderItems($orderId: uuid!) {
              delete_order_items(where: {order_id: {_eq: $orderId}}) {
                affected_rows
              }
            }`,
            { orderId }
          );

          if (deleteItemsResponse.errors) {
            throw new Error(
              deleteItemsResponse.errors[0]?.message ||
                "Failed to delete order items"
            );
          }

          const deleteOrderResponse = await fetchFromHasura(
            `mutation DeleteOrder($orderId: uuid!) {
              delete_orders_by_pk(id: $orderId) {
                id
              }
            }`,
            { orderId }
          );

          if (deleteOrderResponse.errors) {
            throw new Error(
              deleteOrderResponse.errors[0]?.message || "Failed to delete order"
            );
          }

          set((state) => {
            const partnerOrders = state.partnerOrders.filter(
              (order) => order.id !== orderId
            );
            const userOrders = state.userOrders.filter(
              (order) => order.id !== orderId
            );
            return { partnerOrders, userOrders };
          });

          toast.success("Order deleted successfully");
          return true;
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to delete order"
          );
          return false;
        }
      },

      increaseQuantity: (itemId) => {
        const state = get();
        if (!state.hotelId) return;

        set((state) => {
          const hotelOrders = { ...state.hotelOrders };
          const hotelOrder = hotelOrders[state.hotelId!];
          if (!hotelOrder) return state;

          const item = hotelOrder.items.find((i) => i.id === itemId);
          if (!item) return state;

          const updatedItems = hotelOrder.items.map((i) =>
            i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
          );

          hotelOrders[state.hotelId!] = {
            ...hotelOrder,
            items: updatedItems,
            totalPrice: hotelOrder.totalPrice + item.price,
          };

          return {
            hotelOrders,
            items: hotelOrders[state.hotelId!].items,
            orderId: hotelOrders[state.hotelId!].orderId,
            totalPrice: hotelOrders[state.hotelId!].totalPrice,
          };
        });
      },

      placeOrder: async (
        hotelData: HotelData,
        tableNumber?: number,
        qrId?: string,
        gstIncluded?: number,
        extraCharges?:
          | {
              name: string;
              amount: number;
              charge_type?: string;
            }[]
          | null,
        deliveryCharge?: number,
        notes?: string
      ) => {
        try {
          const state = get();

          // Validation checks
          if (!state.hotelId) {
            toast.error("No hotel selected");
            return null;
          }

          const currentOrder = state.hotelOrders[state.hotelId] || {
            items: [],
            totalPrice: 0,
            order: null,
            orderId: null,
          };

          if (currentOrder.items.length === 0) {
            toast.error("Cannot place empty order");
            return null;
          }

          const userData = useAuthStore.getState().userData;
          if (!userData?.id || userData?.role !== "user") {
            toast.error("Please login as user to place order");
            return null;
          }

          const isValidUUID = (str: string) => {
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return uuidRegex.test(str);
          };

          const validQrId = qrId && isValidUUID(qrId) ? qrId : null;
          const type = (tableNumber ?? 0) > 0 ? "table_order" : "delivery";
          const createdAt = new Date().toISOString();

          // Prepare extra charges
          const exCharges: {
            name: string;
            amount: number;
            charge_type?: string;
            id?: string;
          }[] = [];

          // Add any provided extra charges
          if (extraCharges && extraCharges.length > 0) {
            extraCharges.forEach((charge) => {
              exCharges.push({
                name: charge.name,
                amount: charge.amount,
                charge_type: charge.charge_type || "FLAT_FEE",
                id: uuidv4(),
              });
            });
          }

          // Add delivery charge if applicable
          if (type === "delivery" && deliveryCharge && deliveryCharge > 0) {
            exCharges.push({
              name: "Delivery Charge",
              amount: deliveryCharge,
              charge_type: "FLAT_FEE",
              id: uuidv4(),
            });
          }

          // Calculate totals
          const subtotal = currentOrder.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          const totalExtraCharges = exCharges.reduce(
            (sum, charge) => sum + charge.amount,
            0
          );

          const grandTotal = subtotal + (gstIncluded || 0) + totalExtraCharges;

          const getNextDisplayOrderNumber = await getNextOrderNumber(
            hotelData.id
          );

          const orderId = uuidv4();

          // Create order in database
          const orderResponse = await fetchFromHasura(createOrderWithItemsMutation, {
            id: orderId,
            totalPrice: grandTotal,
            gst_included: gstIncluded,
            extra_charges: exCharges.length > 0 ? exCharges : null,
            createdAt,
            tableNumber: tableNumber || null,
            qrId: validQrId,
            partnerId: hotelData.id,
            userId: userData.id,
            type,
            status: "pending",
            delivery_address: type === "delivery" ? state.userAddress : null,
            delivery_location:
              type === "delivery"
                ? {
                    type: "Point",
                    coordinates: [
                      state.coordinates?.lng || 0,
                      state.coordinates?.lat || 0,
                    ],
                  }
                : null,
            notes: notes || null,
            display_id: getNextDisplayOrderNumber.toString(),
            orderItems: currentOrder.items.map((item) => ({
                menu_id: item.id.split("|")[0],
                quantity: item.quantity,
                item: {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  offers: item.offers,
                  category: item.category,
                },
              })),
          });

          if (orderResponse.errors || !orderResponse?.insert_orders_one?.id) {
            throw new Error(
              orderResponse.errors?.[0]?.message || "Failed to create order"
            );
          }


          // Prepare new order object
          const newOrder: Order = {
            id: orderId,
            items: currentOrder.items,
            totalPrice: grandTotal,
            createdAt,
            tableNumber: tableNumber || null,
            qrId: validQrId,
            status: "pending",
            partnerId: hotelData.id,
            userId: userData.id,
            user: {
              phone: userData.phone || "N/A",
            },
            gstIncluded,
            extraCharges: exCharges,
          };

          // Update state
          set((state) => ({
            ...state,
            hotelOrders: {
              ...state.hotelOrders,
              [state.hotelId!]: {
                items: [],
                totalPrice: 0,
                order: newOrder,
                orderId: null,
                coordinates: null,
              },
            },
            order: newOrder,
            items: [],
            orderId: null,
            totalPrice: 0,
          }));

          await Notification.partner.sendOrderNotification(newOrder);
          return newOrder;
        } catch (error) {
          console.error("Order placement error:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to place order"
          );
          return null;
        }
      },

      fetchOrderOfPartner: async (partnerId: string) => {
        try {
          // First fetch the orders with captain data included
          const ordersResponse = await fetchFromHasura(
            `query GetPartnerOrders($partnerId: uuid!) {
              orders(
                where: { partner_id: { _eq: $partnerId } }
                order_by: { created_at: desc }
              ) {
                id
                total_price
                created_at
                table_number
                qr_id
                type
                delivery_address
                delivery_location
                status
                status_history
                partner_id
                gst_included
                display_id
                extra_charges
                phone
                user_id
                orderedby
                captain_id
                qr_code{
                  table_name
                }
                table_name
                captainid {
                  id
                  name
                  email
                }
                user {
                  full_name
                  phone
                  email
                }
                order_items {
                  id
                  quantity
                  menu {
                    id
                    name
                    price
                    category {
                      id
                      name
                      priority
                    }
                    description
                    image_url
                    is_top
                    is_available
                    priority
                    stocks {
                      stock_quantity
                      id
                    }
                  }
                }
              }
            }`,
            { partnerId }
          );

          if (ordersResponse.errors) {
            throw new Error(
              ordersResponse.errors[0]?.message || "Failed to fetch orders"
            );
          }

          return ordersResponse.orders.map((order: any) => {
            // Ensure captain data is properly structured
            const captainData = order.captainid
              ? {
                  id: order.captainid.id,
                  name: order.captainid.name,
                  email: order.captainid.email,
                }
              : null;

            return {
              id: order.id,
              totalPrice: order.total_price,
              createdAt: order.created_at,
              tableNumber: order.table_number,
              qrId: order.qr_id,
              status: order.status,
              type: order.type,
              phone: order.phone,
              deliveryAddress: order.delivery_address,
              partnerId: order.partner_id,
              delivery_location: order.delivery_location,
              gstIncluded: order.gst_included,
              extraCharges: order.extra_charges || [],
              delivery_charge: order.delivery_charge,
              status_history: order.status_history,
              userId: order.user_id,
              display_id: order.display_id,
              user: order.user,
              orderedby: order.orderedby,
              captain_id: order.captain_id,
              tableName: order.qr_code?.table_name || order.table_name || null,
              captain: captainData, // Use the properly structured captain data
              items: order.order_items.map((i: any) => ({
                id: i.menu?.id,
                quantity: i.quantity,
                name: i.menu?.name || "Unknown",
                price: i.menu?.offers?.[0]?.offer_price || i.menu?.price || 0,
                category: i.menu?.category,
                stocks: i.menu?.stocks,
              })),
            };
          });
        } catch (error) {
          console.error("Error fetching orders:", error);
          toast.error("Failed to load orders");
          return null;
        }
      },

      clearOrder: () => {
        set((state) => {
          const hotelOrders = { ...state.hotelOrders };
          if (state.hotelId) {
            hotelOrders[state.hotelId] = {
              items: [],
              totalPrice: 0,
              order: null,
              orderId: null,
              coordinates: null,
            };
          }
          return {
            hotelOrders,
            items: [],
            orderId: null,
            totalPrice: 0,
            orderType: null,
          };
        });
      },
    }),
    {
      name: "order-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

function transformOrderFromHasura(order: any): Order {
 
    return {
    id: order.id,
    items: order.order_items.map((item: any) => ({
      id: item.menu?.id || "",
      name: item.item?.name || item.menu?.name || "",
      price: item.item?.price || item.menu?.price || 0,
      quantity: item.quantity || 0,
      category: item.menu?.category?.name || "",
      image_url: item.menu?.image_url || "",
      description: item.menu?.description || "",
      is_top: item.menu?.is_top || false,
      is_available: item.menu?.is_available || true,
    })),
    totalPrice: order.total_price || 0,
    createdAt: order.created_at,
    notes: order.notes || null,
    tableNumber: order.table_number || null,
    qrId: order.qr_id || null,
    status: order.status,
    partnerId: order.partner_id,
    status_history: order.status_history,
    partner: order.partner,
    phone: order.phone,
    userId: order.user_id,
    user: order.user,
    display_id: order.display_id,
    type: order.type,
    deliveryAddress: order.delivery_address,
    gstIncluded: order.gst_included || 0,
    orderedby: order.orderedby,
    tableName: order.qr_code?.table_name || null,
    delivery_charge: order.delivery_charge || null,
    delivery_location: order.delivery_location,
    order_number: order.order_number,
    captain_id: order.captain_id,
    captain: order.captainid,
    extraCharges: order.extra_charges,
  };
}

export const getNextOrderNumber = async (partnerId: string) => {
  // today's date
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );

  //get last of today
  const { orders } = await fetchFromHasura(
    `
    query GetLastOrderOfToday($partnerId: uuid!) {
      orders(
        where: {
          partner_id: { _eq: $partnerId },
          created_at: { _gte: "${todayStart.toISOString()}", _lte: "${todayEnd.toISOString()}" }
        },
        order_by: { created_at: desc },
        limit: 1
      ) {
        id
        display_id
      }
    }
  `,
    {
      partnerId: partnerId,
    }
  );

  if (orders.length === 0) {
    return 1;
  } else {
    const lastOrder = orders[0];
    if (lastOrder.display_id !== null && lastOrder.display_id !== undefined) {
      const lastDisplayId = parseInt(lastOrder.display_id, 10);
      return lastDisplayId + 1;
    } else {
      return 1;
    }
  }
};

export default useOrderStore;
