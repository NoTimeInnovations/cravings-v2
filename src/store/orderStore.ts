import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  pushEcommerceEvent,
  resolveCurrencyCode,
  categoryName,
  baseItemId,
} from "@/lib/partnerDataLayer";
import { sanitizePrintText } from "@/lib/sanitizePrintText";
import { getTakeawayAdjustment, applyTakeawayAdjustment } from "@/lib/takeawayPricing";
import { ROUND_OFF_NAME, computeRoundOff, isRoundOffEnabled } from "@/lib/roundOff";
import { getFeatures } from "@/lib/getFeatures";
import { getSafeStorage } from "@/lib/safeStorage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useAuthStore, Captain } from "./authStore";
import {
  createOrderItemsMutation,
  createOrderMutation,
  createOrderWithItemsMutation,
  createPendingOrderWithItemsMutation,
  ordersCountSubscription,
} from "@/api/orders";
import { getOrderChannel } from "@/lib/orderChannel";
import {
  draftOrdersSubscription,
  paginatedOrdersSubscription,
  subscriptionQuery,
  userSubscriptionQuery,
} from "@/api/orders";
import { toast } from "sonner";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { QrGroup } from "@/app/admin/qr-management/page";
import { revalidateTag } from "@/app/actions/revalidate";
import { decrementStockForOrder, claimOrderStock } from "@/lib/stockDecrement";
import { restockOrderStock } from "@/app/actions/restockOrder";
import { ymd } from "@/lib/prebooking";
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
import { dispatchDeliveryAgent, cancelDeliveryAgent } from "@/app/actions/deliveryAgent";
import { dispatchViaDeliveryBridge, cancelDispatch, scheduleDelayedDispatch, clearDelayedDispatch } from "@/app/actions/porterBridge";
import { dispatchDeliveryPool, cancelDeliveryPoolDispatch } from "@/app/actions/deliveryPoolDispatch";
import { awardLoyaltyForOrder } from "@/app/actions/loyalty";
import { linkMapsUsageToOrder } from "@/app/actions/trackGoogleApi";
import { peekMapsSessionId, resetMapsSession } from "@/lib/mapsUsage";
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

/**
 * A single third-party-portal recharge the partner manually logs (Porter /
 * Rapido / Uber prepaid top-up). The bridge can't see the recharge amount, so
 * the partner types it here; balance = Σ recharges − Σ delivered-order fares.
 * Stored as a jsonb array in the partners.delivery_recharges column.
 */
export interface DeliveryRecharge {
  /** Client-generated unique id (stable across edits). */
  id: string;
  provider: "porter" | "rapido" | "uber";
  /** Amount recharged, in the partner's currency. */
  amount: number;
  /** ISO date (yyyy-mm-dd) the recharge was done — editable by the partner. */
  date: string;
  note?: string;
  /** ISO timestamp the row was created (audit; distinct from `date`). */
  created_at: string;
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
  takeaway_time_allowed: {
    from: string;
    to: string;
  } | null;
  isDeliveryActive: boolean;
  needDeliveryLocation: boolean;
  need_user_name?: boolean;
  // When true, the customer MUST type their address details (flat / floor /
  // building) in the box below the map at checkout. False/unset => optional.
  need_address_details?: boolean;
  parcel_charge?: number;
  parcel_charge_type?: "fixed" | "variable" | "itemwise"; // fixed = flat amount, variable = per item, itemwise = per-item custom charges
  parcel_charge_items?: Record<string, number>;
  hide_delivery_charge?: boolean;
  /**
   * When true (and `feature_flags.delivery_agent.enabled`), the delivery
   * charge comes from delivery-agents-server's availability endpoint
   * instead of any of the internal range/rate/fixed-rate config. All those
   * internal fields are ignored on the checkout side.
   */
  use_delivery_agent_charge?: boolean;
  /** Provider priority for the delivery-bridge dispatch sequence (tried in
   *  this order). e.g. ["uber","porter","rapido"]. Defaults to porter-first. */
  delivery_provider_priority?: string[];
  /** Booking method for the delivery-bridge dispatch: "bike" (normal 2-wheeler
   *  ride) or "parcel" (courier/parcel class). Defaults to "bike". */
  delivery_vehicle_mode?: "bike" | "parcel" | "scooty";
  /** Per-provider payment mode for the delivery-bridge dispatch. "wallet" draws
   *  from that provider's prepaid balance (Porter credits / Rapido wallet);
   *  Uber is effectively cash-only upstream. Defaults to cash for any unset
   *  provider. Sent to the bridge as `paymentModes`. */
  delivery_payment_modes?: {
    porter?: "cash" | "wallet";
    uber?: "cash" | "wallet";
    rapido?: "cash" | "wallet";
  };
  /** How many seconds the bridge waits for a rider on each provider before
   *  escalating to the next in the priority list. Sent as `timeoutSec`.
   *  Defaults to 90. */
  delivery_wait_seconds?: number;
  /** Per-provider delivery-bridge GROUP number. Replaces the per-provider
   *  mobile: the bridge resolves the group to a pool of accounts and books on a
   *  free one (lets a partner run several Rapido accounts — 1 live order each).
   *  Sent to the bridge as `groups`. */
  delivery_provider_groups?: {
    porter?: string;
    uber?: string;
    rapido?: string;
  };
  /** Auto-book a rider through the delivery bridge on the trigger below. When
   *  false the order is NOT auto-dispatched — the operator books it manually
   *  ("Book Porter now" in the order details). Defaults to true (absent = on). */
  porter_auto_dispatch?: boolean;
  /** Which order-status transition auto-books the rider: "accepted" (default —
   *  fires the moment the order is accepted, today's behavior) or "food_ready"
   *  (waits until the kitchen marks it ready). */
  porter_dispatch_trigger?: "accepted" | "food_ready";
  /** Minutes to wait AFTER the trigger before booking (0 = immediate). Clamped
   *  0–120. When > 0 the dispatch is deferred via orders.porter_dispatch_due_at,
   *  swept by the dispatch-due-porter cron. */
  porter_dispatch_delay_min?: number;
  /** Delivery fee charged to the customer at checkout: "porter" (the live
   *  Porter/bridge quote for the trip — the default, and today's behavior for
   *  porter_bridge partners) or "custom" (the partner's own delivery_rules
   *  pricing). Absent = "porter". */
  porter_pricing_mode?: "custom" | "porter";
  /** Menuthere Delivery Pool per-restaurant OTP toggles — rider must enter a
   *  code to confirm pickup (shown to the restaurant) / delivery (sent to the
   *  customer). Read by deliveryPoolDispatch at hand-off. */
  pool_pickup_otp?: boolean;
  pool_drop_otp?: boolean;
  announcement?: string;
  banner_mode?: "single" | "carousel";
  carousel_banners?: string[];
}

/**
 * Bookable slot times for a given weekday (0 = Sunday … 6 = Saturday).
 * `slots` is an explicit list of "HH:MM" times the admin offers that day.
 */
export interface PrebookingRange {
  from: string; // "HH:MM" (24h, restaurant-local)
  to: string;
}

export interface PrebookingWindow {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  enabled: boolean;
  /** One or more open ranges for the day (e.g. lunch + dinner). */
  ranges?: PrebookingRange[];
  /** Legacy single-range fields (back-compat; collapsed into `ranges` on read). */
  from?: string;
  to?: string;
  /** Legacy explicit slots (back-compat; collapsed into a range on read). */
  slots?: string[];
}

/**
 * Partner-level prebooking config, persisted as a JSON string in
 * `partners.prebooking_settings`. Gated by the `prebooking` feature flag.
 * Times are restaurant-local; no timezone conversion is applied.
 */
/** Which selectors the checkout scheduling picker shows. When one is hidden the
 *  other is auto-selected to its first available option. */
export type PrebookingPickerMode = "both" | "date_only" | "time_only";

/** How slots are generated: fixed weekday time ranges, or a rolling list of
 *  times relative to "now" (now + interval, N slots) that refreshes each minute. */
export type PrebookingSlotMode = "windows" | "rolling";

export interface PrebookingSettings {
  /** Master toggle for scheduled delivery/takeaway prebooking. */
  prebooking_enabled: boolean;
  /** Master toggle for dine-in slot (table) booking. */
  slot_booking_enabled: boolean;

  // ── Prebooking: scheduled delivery/takeaway ──────────────────────────────
  /** Minimum advance notice before the chosen slot, in minutes. */
  min_lead_time_minutes: number;
  /** How many days ahead an order may be scheduled (0 = today only). */
  max_advance_days: number;
  /** When true, only today is selectable (overrides max_advance_days). */
  today_only?: boolean;
  /** Optional absolute booking window (YYYY-MM-DD). When set, the date picker only
   *  offers dates within [start_date, end_date]; overrides max_advance_days. */
  start_date?: string;
  end_date?: string;
  /** Which selectors the checkout picker shows: both, date only, or time only. */
  picker_mode?: PrebookingPickerMode;
  /** Slot generation: fixed weekday ranges (windows) or rolling from now. */
  slot_mode?: PrebookingSlotMode;
  /** Rolling mode: spacing between slots, in minutes (e.g. 15). */
  rolling_interval_minutes?: number;
  /** Rolling mode: how many slots to offer (e.g. 2 -> now+interval, now+2*interval). */
  rolling_slot_count?: number;
  /** Explicit "schedule for later" slot times per weekday (delivery/takeaway). */
  windows: PrebookingWindow[];
  /** Order types for which "schedule for later" is offered (delivery/takeaway). */
  allowed_order_types: ("delivery" | "takeaway" | "dine_in")[];
  /** When true, scheduling a delivery/takeaway slot is OPTIONAL at checkout: the
   *  customer sees a "Book a slot" opt-in instead of being forced to pick one, and
   *  can order ASAP (no slot). Default false = a slot is required (legacy behavior). */
  prebooking_optional?: boolean;

  // ── Slot booking: dine-in table reservations (independent settings) ───────
  /** Minimum advance notice for a dine-in reservation, in minutes. */
  dine_in_min_lead_time_minutes: number;
  /** How many days ahead a table can be booked. */
  dine_in_max_advance_days: number;
  /** When true, only today is selectable for dine-in (overrides dine_in_max_advance_days). */
  dine_in_today_only?: boolean;
  /** Optional absolute booking window for dine-in (YYYY-MM-DD). */
  dine_in_start_date?: string;
  dine_in_end_date?: string;
  /** Which selectors the dine-in slot picker shows: both, date only, or time only. */
  dine_in_picker_mode?: PrebookingPickerMode;
  /** Dine-in slot generation: fixed weekday ranges or rolling from now. */
  dine_in_slot_mode?: PrebookingSlotMode;
  dine_in_rolling_interval_minutes?: number;
  dine_in_rolling_slot_count?: number;
  /** When true, ask the customer how many people the table booking is for. */
  dine_in_ask_people_count?: boolean;
  /** When true, booking a dine-in table slot is OPTIONAL at checkout: the customer
   *  sees a "Book a table slot" opt-in instead of being forced to reserve, and can
   *  order without a reservation. Default false = a reservation is required. */
  slot_booking_optional?: boolean;
  /** Explicit dine-in table slot times per weekday. */
  dine_in_windows: PrebookingWindow[];
}

const DEFAULT_FROM = "10:00";
const DEFAULT_TO = "22:00";

const defaultWindows = (): PrebookingWindow[] =>
  Array.from({ length: 7 }, (_, day) => ({
    day: day as PrebookingWindow["day"],
    enabled: true,
    ranges: [{ from: DEFAULT_FROM, to: DEFAULT_TO }],
  }));

export const DEFAULT_PREBOOKING_SETTINGS: PrebookingSettings = {
  prebooking_enabled: true,
  slot_booking_enabled: true,
  // Lead time / max-days are no longer surfaced in settings; keep sensible
  // defaults so the customer picker still works (no artificial lead, week ahead).
  min_lead_time_minutes: 0,
  max_advance_days: 7,
  today_only: false,
  windows: defaultWindows(),
  allowed_order_types: ["delivery", "takeaway", "dine_in"],
  prebooking_optional: false,
  dine_in_min_lead_time_minutes: 0,
  dine_in_max_advance_days: 7,
  dine_in_today_only: false,
  slot_booking_optional: false,
  dine_in_windows: defaultWindows(),
};

/** Store-wide order-type availability. Persisted as JSON in `partners.order_types_enabled`. */
export interface OrderTypesEnabled {
  delivery: boolean;
  takeaway: boolean;
  dine_in: boolean;
}

export const DEFAULT_ORDER_TYPES_ENABLED: OrderTypesEnabled = {
  delivery: true,
  takeaway: true,
  dine_in: true,
};

export interface Order {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  /** Loyalty points spent on this order (0 if none). `totalPrice` already reflects the deduction. */
  loyaltyPointsRedeemed?: number;
  /** ₹ value of the loyalty points redeemed on this order. */
  loyaltyRedeemValue?: number;
  /** Loyalty points awarded for this order once completed (null until processed). */
  loyaltyPointsEarned?: number | null;
  payment_method?: "cash" | "card" | "upi";
  createdAt: string;
  notes?: string | null;
  tableNumber?: number | null;
  qrId?: string | null;
  status: "pending" | "completed" | "cancelled" | "preparing" | "accepted" | "food_ready" | "dispatched" | "in_transit";
  partnerId: string;
  display_id?: string;
  status_history?: OrderStatusStorage;
  partner?: {
    gst_percentage?: number;
    currency?: string;
    store_name?: string;
    store_banner?: string | null;
    theme?: any;
    country?: string;
    whatsapp_number?: string;
    upi_id?: string;
    show_payment_qr?: boolean;
    feature_flags?: string | null;
    petpooja_restaurant_id?: string | null;
    geo_location?: {
      type?: string;
      coordinates?: [number, number];
    } | string | null;
  };
  delivery_agent?: {
    provider?: string;
    name?: string;
    phone?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      lastUpdated?: string;
    };
  } | null;
  phone?: string | null;
  userId?: string;
  user?: {
    phone?: string;
    name?: string;
    email?: string;
    full_name?: string | null;
  };
  type?: "table_order" | "delivery" | "pos";
  /** Prebooking: scheduled date "YYYY-MM-DD" (restaurant-local). Null = immediate order. */
  scheduled_date?: string | null;
  /** Prebooking: scheduled time "HH:MM:SS" (restaurant-local). Null = immediate order. */
  scheduled_time?: string | null;
  /** Prebooking: end of the chosen slot "HH:MM:SS"; lets it display as a from–to range. */
  scheduled_time_to?: string | null;
  /** Dine-in reservation: party size (number of guests). Null = not a table reservation. */
  booking_persons?: number | null;
  /** Where the order was placed from: "app" (published TWA), "whatsapp" (a
   * WhatsApp order link), or "web" (website). */
  order_channel?: "app" | "web" | "whatsapp" | null;
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
  delivery_boy_id?: string;
  assigned_at?: string;
  delivered_at?: string;
  growjet_order_number?: string | null;
  /** Hub-managed provider id. 'adloggs' is the first/only plugin currently. */
  delivery_provider?: string | null;
  /** External id returned by the provider plugin (e.g. Adloggs `order_uuid`). */
  delivery_provider_order_id?: string | null;
  /** Normalized state owned by delivery-agents-server. */
  delivery_provider_state?:
    | "pending"
    | "assigned"
    | "arrived_pickup"
    | "picked_up"
    | "out_for_delivery"
    | "arrived_drop"
    | "delivered"
    | "cancelled"
    | "rto_initiated"
    | "rto_delivered"
    | "booking"
    | null;
  delivery_provider_meta?: {
    trackUrl?: string;
    fee?: number;
    distance?: number;
    otps?: {
      delivery_otp?: string | null;
      pickup_otp?: string | null;
      return_otp?: string | null;
    };
    /** Delivery-bridge dispatch id (set when an order goes through the
     *  multi-provider Porter/Uber/Rapido dispatch). */
    dispatchId?: string;
    /** Handover OTPs from the delivery-bridge booking (Rapido). 4-digit. */
    pickupPin?: string | null;
    dropPin?: string | null;
    rider_platform?: { name?: string; lsp_uniq_id?: string };
    [k: string]: any;
  } | null;
  delivery_provider_last_event_at?: string | null;
  /** When set (future timestamp) the order is scheduled for a delayed porter
   *  auto-book; the dispatch-due-porter cron books it at this time. Drives the
   *  countdown shown in OrderDetails. Cleared to null once booked/cancelled. */
  porter_dispatch_due_at?: string | null;
  delivery_boy?: {
    id: string;
    name: string;
    phone: string;
    current_lat?: number;
    current_lng?: number;
    location_updated_at?: string;
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
  discounts?:
  | {
    id: string;
    type: "percentage" | "flat";
    value: number;
    reason?: string;
  }[]
  | null;
  is_paid?: boolean;
  cashfree_payment_id?: string;
  cancel_reason?: string | null;
  // "customer" (legacy "user"), "partner-cravings" (cancelled in the Cravings
  // admin) or "partner-petpooja" (cancelled from the Petpooja POS). Legacy
  // "partner" rows predate the cravings/petpooja split.
  cancelled_by?:
    | "user"
    | "partner"
    | "customer"
    | "partner-cravings"
    | "partner-petpooja"
    | null;
  review?: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  } | null;
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
  // Partner currency SYMBOL (e.g. "₹") for dataLayer ecommerce events; set via setHotelId.
  currencySymbol: string | null;
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
  // One-shot intent: when a deep link (e.g. WhatsApp reorder) wants checkout
  // opened on load. OrderDrawer's mount effect force-closes the modal otherwise,
  // which would clobber a reorder-initiated open; it honors this flag instead.
  pendingCheckoutOpen: boolean;
  setPendingCheckoutOpen: (open: boolean) => void;
  lastOrderPlacedAt: number;
  notifyOrderPlaced: () => void;
  orderType: "takeaway" | "delivery" | "dine_in" | null;
  setOrderType: (type: "takeaway" | "delivery" | "dine_in") => void;
  setOpenDrawerBottom: (open: boolean) => void;
  setOpenOrderDrawer: (open: boolean) => void;
  setDeliveryInfo: (info: DeliveryInfo | null) => void;

  setHotelId: (id: string, currencySymbol?: string | null) => void;
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
    notes?: string,
    tableName?: string,
    discounts?: { code: string; type: string; value: number; savings: number; pp_discount_id?: string; description?: string; terms_conditions?: string; max_discount_amount?: number; min_order_value?: number; discount_on_total?: boolean; discount_order_types?: string; valid_days?: string; applicable_on?: string; rank?: number; freebie_item_count?: number; freebie_item_ids?: string; freebie_item_names?: string; freebie_items?: { id: string; name: string; price: number; pp_id?: string; category?: any }[] } | null,
    customerName?: string,
    customerPhone?: string,
    cashfreeOrderId?: string | null,
    prebooking?: { date: string; time: string; timeTo?: string; persons?: number; dineIn?: boolean } | null,
    deferForPayment?: boolean,
    /**
     * Loyalty redemption applied to this order. When present (value > 0), the
     * Petpooja push payload is built net of it: `total_price` is reduced and a
     * synthetic Fixed ("flat") loyalty discount is appended to `discounts[]` so
     * the POS shows the redemption. The authoritative ledger debit still happens
     * server-side via redeemLoyaltyPoints after the order is created.
     */
    loyaltyRedeem?: { points: number; value: number } | null,
  ) => Promise<Order | null>;
  getCurrentOrder: () => HotelOrderState;
  fetchOrderOfPartner: (partnerId: string) => Promise<Order[] | null>;
  setOpenAuthModal: (open: boolean) => void;
  genOrderId: () => string;
  setUserAddress: (address: string) => void;
  setOrderNote: (note: string) => void;
  setUserCoordinates: (coords: { lat: number; lng: number } | null) => void;
  subscribeOrders: (callback?: (orders: Order[]) => void) => () => void;
  subscribePaginatedOrders: (
    limit: number,
    offset: number,
    callback?: (orders: Order[]) => void
  ) => () => void;
  subscribeOrdersCount: (callback?: (count: number) => void) => () => void;
  subscribeDraftOrders: (callback: (orders: Order[]) => void) => () => void;
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
  updateOrderPaymentMethod: (
    orderId: string,
    paymentMethod: string,
    orders: Order[],
    setOrders: (orders: Order[]) => void
  ) => Promise<void>;
  setPartnerOrders: (orders: Order[]) => void;
}

const useOrderStore = create(
  persist<OrderState>(
    (set, get) => ({
      hotelId: null,
      currencySymbol: null,
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
      pendingCheckoutOpen: false,
      orderType: null,
      lastOrderPlacedAt: 0,
      notifyOrderPlaced: () => set({ lastOrderPlacedAt: Date.now() }),

      setOrderType: (type: "takeaway" | "delivery" | "dine_in") => {
        set({ orderType: type });
      },

      setOpenOrderDrawer: (open: boolean) => set({ open_order_drawer: open }),
      setDeliveryInfo: (info: DeliveryInfo | null) => {
        // console.log("Setting delivery info:", info);
        set({ deliveryInfo: info });
      },
      setDeliveryCost: (cost: number | null) => set({ deliveryCost: cost }),
      setOpenDrawerBottom: (open: boolean) => set({ open_drawer_bottom: open }),
      setPartnerOrders: (orders: Order[]) => set({ partnerOrders: orders }),

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

          const { userData: authData } = useAuthStore.getState();
          const storeName = authData && 'store_name' in authData ? authData.store_name : undefined;
          await Notification.user.sendOrderStatusNotification(order, status, storeName);

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
        newStatus: "completed" | "cancelled" | "pending" | "accepted" | "food_ready" | "dispatched" | "in_transit",
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

          if (newStatus === "cancelled") {
            // Stock is decremented at PLACEMENT (for every order type, including
            // pending online), so a cancel must add it back. Idempotent via the
            // RELEASE gate inside restockOrderStock. Fire-and-forget.
            restockOrderStock(orderId).catch((e) =>
              console.warn("[restock] cancel restock threw:", e),
            );
          }

          if (newStatus === "completed") {
            // Stock is decremented at order PLACEMENT now (placeOrder, for every
            // order type including pending online), not at completion.

            // Award loyalty points for the completed order. Server-side, idempotent,
            // re-reads the real order, and self-gates on the partner's loyalty flag —
            // so it's safe to fire-and-forget and never blocks the status update.
            awardLoyaltyForOrder(orderId)
              .then((r) => {
                if (r.ok && r.points > 0) {
                  toast.success(`${r.points} loyalty points credited to the customer`);
                }
              })
              .catch((e) => console.warn("[loyalty] award failed", e));
          }

          // Send order status notification to user (fire-and-forget, never block order)
          try {
            const order = orders.find((o) => o.id === orderId);
            if (order) {
              const { userData: authData2 } = useAuthStore.getState();
              const storeName2 = authData2 && 'store_name' in authData2 ? authData2.store_name : undefined;
              await Notification.user.sendOrderStatusNotification(
                order,
                newStatus,
                storeName2
              );
            }
          } catch (notifError) {
            console.error("Notification failed (order still updated):", notifError);
          }

          // Delivery-agents-server hooks. Gated by partner.feature_flags.delivery_agent.
          // Only fires for true delivery orders: type === "delivery", a non-empty
          // delivery_address, AND geocoded drop coords (delivery_location). Takeaway
          // orders are stored as type="delivery" with a null address, and dine-in/pos
          // orders use type="pos" — both skipped. The delivery_location check also
          // exempts in-store POS delivery orders (they carry a text-only address like
          // "Address not specified" but never a pin) — a 3PL rider can't be routed
          // without coordinates and the restaurant handles POS delivery itself.
          // Fire-and-forget — must NEVER block the local Hasura mutation.
          // Growjet partners (feature_flags.growjet_delivery) are untouched here:
          // Growjet still fires from pp_menu_insert.markFoodReady, not from this path.
          try {
            const features = getFeatures((userData as any)?.feature_flags || null);
            const order = orders.find((o) => o.id === orderId);
            const isRealDelivery =
              order?.type === "delivery" &&
              typeof order?.deliveryAddress === "string" &&
              order.deliveryAddress.trim().length > 0 &&
              !!order?.delivery_location;

            if (features.delivery_agent.access && features.delivery_agent.enabled && isRealDelivery) {
              if (newStatus === "accepted") {
                dispatchDeliveryAgent(orderId).then((r) => {
                  if (!r.ok) console.warn(`[delivery-agent] dispatch failed: ${r.message}`);
                }).catch((e) => console.warn("[delivery-agent] dispatch threw:", e));
              } else if (newStatus === "cancelled") {
                cancelDeliveryAgent(orderId, "Cancelled from admin dashboard").then((r) => {
                  // 404 here means the order was never dispatched via this server — fine.
                  if (!r.ok && r.status !== 404) console.warn(`[delivery-agent] cancel failed: ${r.message}`);
                }).catch((e) => console.warn("[delivery-agent] cancel threw:", e));
              }
            }

            // Porter-bridge — independent of delivery_agent. Same shape, same
            // gates: real delivery, `accepted` → dispatch / `cancelled` → cancel.
            // Failures persist into orders.delivery_provider_state="failed" so
            // the admin UI can show why. Coexists with delivery_agent: both
            // can be enabled simultaneously, in which case both dispatch and
            // the partner has two riders incoming — by design unusual, the
            // operator gates this themselves at the feature-flag level.
            if (features.porter_bridge.access && features.porter_bridge.enabled && isRealDelivery) {
              // Config-driven (delivery_rules): auto on/off, trigger status
              // (accepted | food_ready), and an optional delay in minutes.
              const rules = (userData as any)?.delivery_rules || {};
              const autoBook = rules.porter_auto_dispatch !== false; // default on
              const trigger = rules.porter_dispatch_trigger === "food_ready" ? "food_ready" : "accepted";
              const delayMin = Math.max(0, Math.min(120, Number(rules.porter_dispatch_delay_min) || 0));
              if (autoBook && newStatus === trigger) {
                const book = delayMin > 0
                  ? scheduleDelayedDispatch(orderId, delayMin) // stamp due_at; cron books
                  : dispatchViaDeliveryBridge(orderId);        // book immediately
                book.then((r) => {
                  if (!r.ok) console.warn(`[delivery-bridge] dispatch failed: ${r.message}`);
                }).catch((e) => console.warn("[delivery-bridge] dispatch threw:", e));
              } else if (newStatus === "cancelled") {
                // Drop a still-pending delayed booking, then cancel any live dispatch.
                clearDelayedDispatch(orderId).catch(() => {});
                cancelDispatch(orderId, "Cancelled from admin dashboard").then((r) => {
                  if (!r.ok && r.status !== 404) console.warn(`[delivery-bridge] cancel failed: ${r.message}`);
                }).catch((e) => console.warn("[delivery-bridge] cancel threw:", e));
              }
            }

            // Menuthere Delivery Pool — independent rider network. Same gates as
            // the other providers: real delivery, `accepted` → dispatch /
            // `cancelled` → cancel. Failures persist into delivery_provider_state.
            if (features.delivery_pool.access && features.delivery_pool.enabled && isRealDelivery) {
              if (newStatus === "accepted") {
                dispatchDeliveryPool(orderId).then((r) => {
                  if (!r.ok) console.warn(`[delivery-pool] dispatch failed: ${r.message}`);
                }).catch((e) => console.warn("[delivery-pool] dispatch threw:", e));
              } else if (newStatus === "cancelled") {
                // No reason/who passed — cancelDeliveryPoolDispatch reads the order's
                // real cancel_reason + cancelled_by (set by the cancel dialog) itself.
                cancelDeliveryPoolDispatch(orderId).then((r) => {
                  if (!r.ok && r.status !== 404) console.warn(`[delivery-pool] cancel failed: ${r.message}`);
                }).catch((e) => console.warn("[delivery-pool] cancel threw:", e));
              }
            }
          } catch (e) {
            console.warn("[delivery-agent] hook setup failed:", e);
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

      updateOrderPaymentMethod: async (
        orderId: string,
        paymentMethod: string,
        orders: Order[],
        setOrders: (orders: Order[]) => void
      ) => {
        try {
          const response = await fetchFromHasura(
            `mutation UpdateOrderPaymentMethod($orderId: uuid!, $paymentMethod: String!) {
                update_orders_by_pk(pk_columns: {id: $orderId}, _set: {payment_method: $paymentMethod}) {
                  id
                  payment_method
                }
              }`,
            { orderId, paymentMethod }
          );

          if (response.errors) throw new Error(response.errors[0].message);

          const updatedOrders = orders.map((order) =>
            order.id === orderId ? { ...order, payment_method: paymentMethod as any } : order
          );

          setOrders(updatedOrders);
          toast.success("Payment method updated");
        } catch (error) {
          console.error(error);
          toast.error("Failed to update payment method");
        }
      },

      setOpenPlaceOrderModal: (open) => {
        set({ open_place_order_modal: open });
      },

      setPendingCheckoutOpen: (open) => {
        set({ pendingCheckoutOpen: open });
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
              scheduled_date: order.scheduled_date ?? null,
              scheduled_time: order.scheduled_time ?? null,
              scheduled_time_to: order.scheduled_time_to ?? null,
              booking_persons: order.booking_persons ?? null,
              order_channel: order.order_channel ?? null,
              phone: order.phone,
              deliveryAddress: order.delivery_address,
              delivery_location: order.delivery_location,
              partnerId: order.partner_id,
              partner: order.partner,
              display_id: order.display_id,
              notes: order.notes || null,
              userId: order.user_id,
              gstIncluded: order.gst_included,
              tableName: order.qr_code?.table_name || order.table_name || null,
              extraCharges: order.extra_charges || [], // Handle null case
              discounts: order.discounts || [], // Handle null case
              delivery_charge: order.delivery_charge, // Include delivery_charge
              is_paid: order.is_paid || false,
              cashfree_payment_id: order.cashfree_payment_id || null,
              delivery_provider: order.delivery_provider ?? null,
              delivery_provider_state: order.delivery_provider_state ?? null,
              delivery_provider_meta: order.delivery_provider_meta ?? null,
              porter_dispatch_due_at: order.porter_dispatch_due_at ?? null,
              user: order.user,
              items: order.order_items.map((i: any) => ({
                id: i.item.id,
                quantity: i.quantity,
                name: i.item?.name || "Unknown",
                price: i.item?.offers?.[0]?.offer_price || i.item?.price || 0,
                category: i.item?.category,
                is_freebie: i.item?.is_freebie || false,
              })),
              review: order.reviews?.[0]
                ? {
                    id: order.reviews[0].id,
                    rating: order.reviews[0].rating,
                    comment: order.reviews[0].comment,
                    created_at: order.reviews[0].created_at,
                  }
                : null,
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
          return () => { };
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
          return () => { };
        }

        const now = new Date();
        const todayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        return subscribeToHasura({
          query: paginatedOrdersSubscription,
          variables: {
            partner_id: userData.id,
            limit,
            offset,
            today_start: todayStart.toISOString(),
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

      subscribeDraftOrders: (callback) => {
        const { userData } = useAuthStore.getState();
        if (!userData?.id) {
          return () => { };
        }
        return subscribeToHasura({
          query: draftOrdersSubscription,
          variables: { partner_id: userData.id },
          onNext: (data) => {
            if (data?.data?.orders) {
              callback(data.data.orders.map(transformOrderFromHasura));
            }
          },
        });
      },

      subscribeOrdersCount: (callback) => {
        const { userData } = useAuthStore.getState();

        if (!userData?.id) {
          return () => { };
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

      setHotelId: (id: string, currencySymbol?: string | null) => {
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
            currencySymbol:
              currencySymbol !== undefined ? currencySymbol : state.currencySymbol,
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

        pushEcommerceEvent("add_to_cart", {
          currency: resolveCurrencyCode(get().currencySymbol),
          value: item.price,
          items: [
            {
              item_id: baseItemId(item.id),
              item_name: item.name,
              item_variant: item.variantSelections?.[0]?.name,
              item_category: categoryName(item.category),
              price: item.price,
              quantity: 1,
            },
          ],
        });
      },

      removeItem: (itemId) => {
        const state = get();
        if (!state.hotelId) return;

        const removed = state.items?.find((i) => i.id === itemId);

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

        if (removed) {
          pushEcommerceEvent("remove_from_cart", {
            currency: resolveCurrencyCode(get().currencySymbol),
            value: removed.price * removed.quantity,
            items: [
              {
                item_id: baseItemId(removed.id),
                item_name: removed.name,
                item_variant: removed.variantSelections?.[0]?.name,
                item_category: categoryName(removed.category),
                price: removed.price,
                quantity: removed.quantity,
              },
            ],
          });
        }
      },

      decreaseQuantity: (itemId) => {
        const state = get();
        if (!state.hotelId) return;

        const decreased = state.items?.find((i) => i.id === itemId);

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

        if (decreased) {
          pushEcommerceEvent("remove_from_cart", {
            currency: resolveCurrencyCode(get().currencySymbol),
            value: decreased.price,
            items: [
              {
                item_id: baseItemId(decreased.id),
                item_name: decreased.name,
                item_variant: decreased.variantSelections?.[0]?.name,
                item_category: categoryName(decreased.category),
                price: decreased.price,
                quantity: 1,
              },
            ],
          });
        }
      },

      deleteOrder: async (orderId: string) => {
        try {
          // Add stock back BEFORE the hard delete destroys the order_items
          // (restockOrderStock reads them). Idempotent: if the order was already
          // cancelled/expired-and-restocked, the RELEASE gate makes this a no-op.
          await restockOrderStock(orderId);

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

        const increased = state.items?.find((i) => i.id === itemId);

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

        if (increased) {
          pushEcommerceEvent("add_to_cart", {
            currency: resolveCurrencyCode(get().currencySymbol),
            value: increased.price,
            items: [
              {
                item_id: baseItemId(increased.id),
                item_name: increased.name,
                item_variant: increased.variantSelections?.[0]?.name,
                item_category: categoryName(increased.category),
                price: increased.price,
                quantity: 1,
              },
            ],
          });
        }
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
        notes?: string,
        tableName?: string,
        discounts?: { code: string; type: string; value: number; savings: number; pp_discount_id?: string; description?: string; terms_conditions?: string; max_discount_amount?: number; min_order_value?: number; discount_on_total?: boolean; discount_order_types?: string; valid_days?: string; applicable_on?: string; rank?: number; freebie_item_count?: number; freebie_item_ids?: string; freebie_item_names?: string; freebie_items?: { id: string; name: string; price: number; pp_id?: string; category?: any }[] } | null,
        customerName?: string,
        /**
         * Phone to write to `orders.phone`. Lets the checkout modal pass a
         * per-order receiver phone (e.g. V2's address form `receiverPhone`)
         * without forcing it to mutate `users.phone`. Falls back to the
         * authenticated user's phone when not provided.
         */
        customerPhone?: string,
        cashfreeOrderId?: string | null,
        prebooking?: { date: string; time: string; timeTo?: string; persons?: number; dineIn?: boolean } | null,
        /**
         * Deferred (online-payment) mode: persist the order as
         * `status="pending_payment"` BEFORE the customer pays, WITHOUT pushing
         * to Petpooja or notifying. The Petpooja push payload is stashed in
         * cf_pp_payload so finalizeCfOrder (webhook/return/cron) can push it once
         * payment confirms. Returns the order without clearing the cart.
         */
        deferForPayment?: boolean,
        loyaltyRedeem?: { points: number; value: number } | null,
      ) => {
        try {
          const state = get();
          // Prebooking (scheduled order): restaurant-local date/time, no tz conversion.
          const scheduled_date = prebooking?.date || null;
          const scheduled_time = prebooking?.time
            ? (prebooking.time.length === 5 ? `${prebooking.time}:00` : prebooking.time)
            : null;
          // End of the chosen slot, stored so it displays as a from–to range.
          const scheduled_time_to = prebooking?.timeTo
            ? (prebooking.timeTo.length === 5 ? `${prebooking.timeTo}:00` : prebooking.timeTo)
            : null;
          // Dine-in table reservation: forces table_order (no QR) and carries party size.
          const isDineInReservation = !!prebooking?.dineIn;
          const booking_persons = prebooking?.persons ?? null;

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
          // A dine-in order stays a table_order even when the customer skipped an
          // (optional) slot reservation. Without the orderType check, an opted-out
          // dine-in order (no reservation, no QR table) would fall through to
          // "delivery" and be persisted with a spurious delivery address/location.
          const type =
            (tableNumber ?? 0) > 0 ||
            isDineInReservation ||
            state.orderType === "dine_in"
              ? "table_order"
              : "delivery";
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
          if (type === "delivery" && deliveryCharge && deliveryCharge > 0 && !hotelData?.delivery_rules?.hide_delivery_charge) {
            exCharges.push({
              name: "Delivery Charge",
              amount: deliveryCharge,
              charge_type: "FLAT_FEE",
              id: uuidv4(),
            });
          }

          // Bake the takeaway per-item surcharge into prices when the order is
          // takeaway. `effectiveItems` then drives the persisted subtotal and the
          // stored line items so receipts / Petpooja reflect the charged price. The
          // matching `gstIncluded` is computed on adjusted prices by the checkout modal.
          const takeawayAdj =
            state.orderType === "takeaway" ? getTakeawayAdjustment(hotelData) : 0;
          const effectiveItems = applyTakeawayAdjustment(currentOrder.items, takeawayAdj);

          // Calculate totals
          const subtotal = effectiveItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          const totalExtraCharges = exCharges.reduce(
            (sum, charge) => sum + charge.amount,
            0
          );

          const discountSavings = discounts?.savings || 0;
          let grandTotal = Math.max(0, subtotal + (gstIncluded || 0) + totalExtraCharges - discountSavings);

          // Round Off: when enabled, append a final charge that brings the grand
          // total UP to the next whole number (always 0..1). Computed on the true
          // final total (items + all charges + GST − discount) and pushed onto
          // exCharges so total_price and the persisted/Petpooja extra_charges stay
          // in lockstep. `grandTotal` is reassigned so every downstream total
          // (ppTotalPrice, total_price) picks up the rounded value.
          if (isRoundOffEnabled(hotelData?.delivery_rules)) {
            const roundOffAmount = computeRoundOff(grandTotal);
            if (roundOffAmount !== 0) {
              exCharges.push({
                name: ROUND_OFF_NAME,
                amount: roundOffAmount,
                charge_type: "FLAT_FEE",
                id: uuidv4(),
              });
              grandTotal = Math.round((grandTotal + roundOffAmount) * 100) / 100;
            }
          }

          const getNextDisplayOrderNumber = await getNextOrderNumber(
            hotelData.id
          );

          const orderId = uuidv4();

          const isTakeaway = state.orderType === "takeaway";

          // For deferred (online-payment) orders we stash the Petpooja push
          // payload here and push it later in finalizeCfOrder (after payment).
          let cfPpPayload: any = null;

          // PetPooja Order Push Logic
          if (hotelData.petpooja_restaurant_id) {
            // Loyalty redemption: build the Petpooja payload net of the redeemed
            // ₹ value and relay it as a Fixed discount. The value is known here
            // (computed client-side) and matches what redeemLoyaltyPoints debits
            // server-side after the order is created — so the POS totals reconcile.
            // Baking it here (before the cfPpPayload stash) also fixes the online
            // path: the stashed payload finalizeCfOrder pushes is loyalty-correct.
            const loyaltyValue = Math.max(0, Math.round(((loyaltyRedeem?.value) || 0) * 100) / 100);
            const ppTotalPrice = Math.max(0, Math.round((grandTotal - loyaltyValue) * 100) / 100);
            const ppDiscounts: any[] = [];
            if (discounts) {
              ppDiscounts.push({
                code: discounts.code,
                type: discounts.type,
                value: discounts.value,
                savings: discounts.savings,
                pp_discount_id: discounts.pp_discount_id || null,
                description: discounts.description || null,
                terms_conditions: discounts.terms_conditions || null,
                max_discount_amount: discounts.max_discount_amount || null,
                min_order_value: discounts.min_order_value || null,
                discount_on_total: discounts.discount_on_total ?? true,
                discount_order_types: discounts.discount_order_types || null,
                valid_days: discounts.valid_days || null,
                applicable_on: discounts.applicable_on || null,
                rank: discounts.rank || null,
                freebie_item_count: discounts.freebie_item_count || null,
                freebie_item_ids: discounts.freebie_item_ids || null,
                freebie_item_names: discounts.freebie_item_names || null,
              });
            }
            if (loyaltyValue > 0) {
              ppDiscounts.push({
                code: "LOYALTY",
                type: "flat",
                value: loyaltyValue,
                savings: loyaltyValue,
                pp_discount_id: null,
                description: "Loyalty points redemption",
                discount_on_total: true,
                applicable_on: "All",
                rank: 99,
              });
            }

            const petpoojaOrder: Order = {
              id: orderId,
              items: currentOrder.items,
              totalPrice: ppTotalPrice,
              createdAt,
              tableNumber: tableNumber || null,
              qrId: validQrId,
              status: "pending",
              partnerId: hotelData.id,
              userId: userData.id,
              user: {
                phone: userData.phone || "N/A",
                full_name: customerName || (userData as any).full_name || null,
              },
              gstIncluded,
              extraCharges: exCharges,
              type,
              deliveryAddress:
                type === "delivery" && !isTakeaway ? state.userAddress : null,
              notes: notes || null,
              display_id: getNextDisplayOrderNumber.toString(),
              tableName: tableName || null,
            };

            const payload = {
              id: orderId,
              short_id: orderId?.slice(0, 8),
              total_price: ppTotalPrice,
              created_at: createdAt,
              table_number: tableNumber || null,
              qr_id: validQrId,
              status: "pending",
              partner_id: hotelData.id,
              user_id: userData.id,
              user: {
                phone: userData.phone || "N/A",
                full_name: customerName || (userData as any).full_name || null,
              },
              type,
              scheduled_date,
              scheduled_time,
              scheduled_time_to,
              booking_persons,
              delivery_address:
                type === "delivery" && !isTakeaway
                  ? sanitizePrintText(state.userAddress)
                  : null,
              phone: (customerPhone?.trim() || userData.phone || null),
              customer_name: customerName || (userData as any).full_name || null,
              notes: notes || null,
              payment_status: "pending",
              gst_included: gstIncluded || 0,
              extra_charges: exCharges,
              delivery_location:
                type === "delivery" && !isTakeaway
                  ? {
                    type: "Point",
                    coordinates: [
                      state.coordinates?.lng || 0,
                      state.coordinates?.lat || 0,
                    ],
                  }
                  : null,
              orderedby: userData.id,
              status_history: null,
              captain_id: null,
              payment_details: null,
              display_id: getNextDisplayOrderNumber.toString(),
              table_name: tableName || null,
              // Online (Cashfree/Razorpay) orders defer the push until payment
              // confirms — mark them as an online method (mirrors the persisted
              // order's "cashfree" at createPendingCfOrder) so pp_menu_insert maps
              // payment_type -> ONLINE. Only true COD (immediate push) is "cash";
              // hardcoding "cash" made every prepaid order show as COD in Petpooja.
              payment_method: deferForPayment ? "cashfree" : "cash",
              petpooja_restaurant_id: hotelData.petpooja_restaurant_id,
              discounts: ppDiscounts,
              items: [
                ...effectiveItems.map((item) => {
                  const menuId = item.id.split("|")[0];
                  const ppIdFromMenu = hotelData?.menus?.find((m) => m.id === menuId)?.pp_id;
                  return {
                    id: uuidv4(),
                    order_id: orderId,
                    menu_id: menuId,
                    quantity: item.quantity,
                    variant: item.variantSelections?.[0] ? {
                      id: item.variantSelections?.[0]?.id,
                      name: item.variantSelections?.[0]?.name,
                    } : null,
                    item: {
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      offers: item.offers,
                      category: item.category,
                      pp_id: item.pp_id || ppIdFromMenu || null,
                    },
                    created_at: createdAt,
                  };
                }),
                ...(discounts?.type === "freebie" && discounts.freebie_items?.length
                  ? discounts.freebie_items.map((fi) => {
                      const ppIdFromMenu = hotelData?.menus?.find((m) => m.id === fi.id)?.pp_id;
                      return {
                        id: uuidv4(),
                        order_id: orderId,
                        menu_id: fi.id,
                        quantity: discounts.freebie_item_count || 1,
                        variant: null,
                        item: {
                          id: fi.id,
                          name: fi.name,
                          price: fi.price,
                          offers: [],
                          category: fi.category || null,
                          pp_id: fi.pp_id || ppIdFromMenu || null,
                          is_freebie: true,
                        },
                        created_at: createdAt,
                      };
                    })
                  : []),
              ],
            };

            // Stash for deferred finalize; pushed to Petpooja after payment.
            cfPpPayload = payload;

            if (!deferForPayment) {
              try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_PETPOOJA_BACKEND_URL}/api/webhook/push-order`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(payload),
                });

                if (!response.ok) {
                  const errorData = await response.text();
                  throw new Error(
                    `Failed to place order: ${response.statusText}. ${errorData}`
                  );
                }
              } catch (error) {
                console.error("Failed to push order to PetPooja webhook", error);
                throw error;
              }

              // Update state
              set((state) => ({
                ...state,
                hotelOrders: {
                  ...state.hotelOrders,
                  [state.hotelId!]: {
                    items: [],
                    totalPrice: 0,
                    order: petpoojaOrder,
                    orderId: null,
                    coordinates: null,
                  },
                },
                order: petpoojaOrder,
                items: [],
                orderId: null,
                totalPrice: 0,
              }));
            }

            // await Notification.partner.sendOrderNotification(petpoojaOrder); // Skip this too as per instructions? "dont send whatsapp messaage" usually refers to user -> host WA. Notification.partner might be internal. I'll keep it commented out or skipped based on "dont send whatsapp message". Instructions said "dont send whatsapp messaage". 

            // return petpoojaOrder;
          }

          // Where the order was placed from: website vs published TWA app.
          const order_channel = getOrderChannel();

          // Create order in database. For deferred online-payment orders we
          // use the pending mutation (status pending_payment, payment_method
          // cashfree, unpaid, + stashed Petpooja payload) so the order survives
          // even if the customer never returns; finalizeCfOrder completes it.
          const orderResponse = await fetchFromHasura(
            deferForPayment ? createPendingOrderWithItemsMutation : createOrderWithItemsMutation,
            {
              id: orderId,
              short_id: orderId?.slice(0, 8),
              totalPrice: grandTotal,
              gst_included: gstIncluded,
              extra_charges: exCharges.length > 0 ? exCharges : null,
              createdAt,
              tableNumber: tableNumber || null,
              qrId: validQrId,
              partnerId: hotelData.id,
              userId: userData.id,
              type,
              // Persist the checkout phone onto the order row itself (the same
              // value we send to Petpooja). Without this, orders.phone stays
              // null and the dashboard can only fall back to users.phone —
              // which is empty for online-payment customers who signed in
              // without a verified phone (so drafts showed no phone at all).
              phone: customerPhone?.trim() || userData.phone || null,
              status: deferForPayment ? "pending_payment" : "pending",
              order_channel,
              ...(deferForPayment
                ? {
                    payment_method: "cashfree",
                    payment_status: "pending",
                    is_paid: false,
                    cf_pp_payload: cfPpPayload,
                  }
                : {}),
              delivery_address:
                type === "delivery" && !isTakeaway
                  ? sanitizePrintText(state.userAddress)
                  : null,
              delivery_location:
                type === "delivery" && !isTakeaway
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
              discounts: discounts ? [discounts] : null,
              source: "customer",
              cashfree_order_id: cashfreeOrderId || null,
              scheduled_date,
              scheduled_time,
              scheduled_time_to,
              booking_persons,
              orderItems: [
                ...effectiveItems.map((item) => ({
                  menu_id: item.id.split("|")[0],
                  quantity: item.quantity,
                  item: {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    offers: item.offers,
                    category: item.category,
                    ...(item.tax_inclusive && { tax_inclusive: true }),
                  },
                })),
                ...(discounts?.type === "freebie" && discounts.freebie_items?.length
                  ? discounts.freebie_items.map((fi) => ({
                      menu_id: fi.id,
                      quantity: discounts.freebie_item_count || 1,
                      item: {
                        id: fi.id,
                        name: fi.name,
                        price: fi.price,
                        offers: [],
                        category: fi.category || null,
                        is_freebie: true,
                      },
                    }))
                  : []),
              ],
            }
          );

          if (orderResponse.errors || !orderResponse?.insert_orders_one?.id) {
            throw new Error(
              orderResponse.errors?.[0]?.message || "Failed to create order"
            );
          }

          // Attribute this checkout's Google Maps requests (address autocomplete
          // / details / geocode / map loads, tagged with the maps session id) to
          // the order just created, then start a fresh maps session.
          try {
            const mapsSession = peekMapsSessionId();
            if (mapsSession) {
              void linkMapsUsageToOrder(mapsSession, orderId);
              resetMapsSession();
            }
          } catch {
            /* usage attribution must never block order placement */
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
              full_name: customerName || (userData as any).full_name || null,
            },
            gstIncluded,
            extraCharges: exCharges,
            discounts: discounts ? [discounts] as any : [],
          };

          // Stock-managed partners: decrement stock at PLACEMENT for EVERY order
          // — including online orders that are still pending_payment (the slot
          // locks the moment the order is placed, not when payment completes).
          // CLAIM_STOCK makes this exactly-once; the same order is restocked on
          // cancel/expire/delete via restockOrderStock. Best-effort.
          try {
            const stockOn = getFeatures(hotelData.feature_flags || null)?.stockmanagement?.enabled;
            if (stockOn) {
              // Scheduled order -> that date's stock; immediate -> today.
              const stockDate = scheduled_date || ymd(new Date());
              const claimed = await claimOrderStock(orderId, stockDate);
              if (claimed) {
                await decrementStockForOrder(
                  currentOrder.items.map((it) => ({
                    menuId: it.id.split("|")[0],
                    quantity: it.quantity,
                  })),
                  { stockDate },
                );
                revalidateTag(hotelData.id);
              }
            }
          } catch (e) {
            console.error("Stock decrement failed (order still placed):", e);
          }

          // Deferred (online-payment) order: it's only pending_payment, so do
          // NOT clear the cart or notify the partner yet. finalizeCfOrder does
          // the Petpooja push / notification once payment confirms. Return the
          // order so the modal can track its id.
          if (deferForPayment) {
            return newOrder;
          }

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

          if (!hotelData.petpooja_restaurant_id) {
            try {
              await Notification.partner.sendOrderNotification(newOrder);
            } catch (notifError) {
              console.error("Partner notification failed (order still placed):", notifError);
            }
          }

          // // Send WhatsApp order placed template (only if feature flag enabled)
          // const features = getFeatures(hotelData.feature_flags || null);
          // if (features.whatsappnotifications.access && features.whatsappnotifications.enabled) {
          //   try {
          //     const partnerPhone = `${hotelData.country_code || "+91"}${hotelData.phone}`;
          //     await Notification.user.sendWhatsAppOrderPlaced(newOrder, hotelData.store_name, partnerPhone);
          //   } catch (e) {
          //     console.error("WhatsApp order placed notification failed:", e);
          //   }
          // }

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
                where: { partner_id: { _eq: $partnerId }, status: { _nin: ["pending_payment", "expired"] } }
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
                payment_method
                order_channel
                status_history
                partner_id
                gst_included
                display_id
                extra_charges
                discounts
                phone
                user_id
                orderedby
                captain_id
                qr_code{
                  table_name
                }
                table_name
                growjet_order_number
                delivery_agent
                delivery_provider
                delivery_provider_order_id
                delivery_provider_state
                delivery_provider_meta
                delivery_provider_last_event_at
                porter_dispatch_due_at
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
                  item
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
              scheduled_date: order.scheduled_date ?? null,
              scheduled_time: order.scheduled_time ?? null,
              scheduled_time_to: order.scheduled_time_to ?? null,
              booking_persons: order.booking_persons ?? null,
              order_channel: order.order_channel ?? null,
              payment_method: order.payment_method,
              phone: order.phone,
              deliveryAddress: order.delivery_address,
              partnerId: order.partner_id,
              delivery_location: order.delivery_location,
              gstIncluded: order.gst_included,
              extraCharges: order.extra_charges || [],
              discounts: order.discounts || [],
              delivery_charge: order.delivery_charge,
              status_history: order.status_history,
              userId: order.user_id,
              display_id: order.display_id,
              user: order.user,
              orderedby: order.orderedby,
              captain_id: order.captain_id,
              tableName: order.qr_code?.table_name || order.table_name || null,
              captain: captainData, // Use the properly structured captain data
              delivery_boy_id: order.delivery_boy_id,
              assigned_at: order.assigned_at,
              delivered_at: order.delivered_at,
              delivery_boy: order.delivery_boy,
              growjet_order_number: order.growjet_order_number,
              delivery_agent: order.delivery_agent,
              delivery_provider: order.delivery_provider,
              delivery_provider_order_id: order.delivery_provider_order_id,
              delivery_provider_state: order.delivery_provider_state,
              delivery_provider_meta: order.delivery_provider_meta,
              delivery_provider_last_event_at: order.delivery_provider_last_event_at,
              porter_dispatch_due_at: order.porter_dispatch_due_at ?? null,
              items: order.order_items.map((i: any) => ({
                id: i.menu?.id,
                quantity: i.quantity,
                name: i.item?.name || "Unknown",
                price: i.item?.price || i.menu?.price || 0,
                category: i.menu?.category,
                stocks: i.menu?.stocks,
                is_freebie: i.item?.is_freebie || false,
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
      storage: createJSONStorage(() => getSafeStorage()),
      partialize: (state) => {
        // pendingCheckoutOpen is a transient one-shot intent — never persist it.
        const { orderType: _orderType, pendingCheckoutOpen: _pco, ...rest } =
          state as any;
        return rest;
      },
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
      is_freebie: item.item?.is_freebie || false,
    })),
    totalPrice: order.total_price || 0,
    createdAt: order.created_at,
    payment_method: order.payment_method || null,
    notes: order.notes || null,
    tableNumber: order.table_number || null,
    qrId: order.qr_id || null,
    status: order.status,
    cancel_reason: order.cancel_reason ?? null,
    cancelled_by: order.cancelled_by ?? null,
    partnerId: order.partner_id,
    status_history: order.status_history,
    partner: order.partner,
    phone: order.phone,
    userId: order.user_id,
    user: order.user,
    display_id: order.display_id,
    type: order.type,
    scheduled_date: order.scheduled_date ?? null,
    scheduled_time: order.scheduled_time ?? null,
    scheduled_time_to: order.scheduled_time_to ?? null,
    booking_persons: order.booking_persons ?? null,
    order_channel: order.order_channel ?? null,
    deliveryAddress: order.delivery_address,
    gstIncluded: order.gst_included || 0,
    orderedby: order.orderedby,
    tableName: order.qr_code?.table_name || null,
    delivery_charge: order.delivery_charge || null,
    delivery_location: order.delivery_location,
    order_number: order.order_number,
    discounts: order.discounts || [],
    captain_id: order.captain_id,
    captain: order.captainid,
    delivery_boy_id: order.delivery_boy_id,
    assigned_at: order.assigned_at,
    delivered_at: order.delivered_at,
    delivery_boy: order.delivery_boy,
    growjet_order_number: order.growjet_order_number,
    delivery_agent: order.delivery_agent,
    delivery_provider: order.delivery_provider,
    delivery_provider_order_id: order.delivery_provider_order_id,
    delivery_provider_state: order.delivery_provider_state,
    delivery_provider_meta: order.delivery_provider_meta,
    delivery_provider_last_event_at: order.delivery_provider_last_event_at,
    porter_dispatch_due_at: order.porter_dispatch_due_at ?? null,
    extraCharges: order.extra_charges,
    is_paid: order.is_paid || false,
    cashfree_payment_id: order.cashfree_payment_id || null,
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
