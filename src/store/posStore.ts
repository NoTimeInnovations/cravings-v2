import { create } from "zustand";
import { MenuItem } from "./menuStore_hasura";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Partner, Captain, useAuthStore } from "./authStore";
import {
  getGstAmount,
} from "@/components/hotelDetail/OrderDrawer";
import {
  createOrderMutation,
  getOrdersOfPartnerQuery,
} from "@/api/orders";
import { deleteBillMutation } from "@/api/pos";
import { getNextOrderNumber, Order } from "./orderStore";
import { v4 as uuidv4 } from "uuid";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getQrGroupForTable } from "@/lib/getQrGroupForTable";
import { QrGroup } from "@/app/admin/qr-management/page";
import { toast } from "sonner";
import { table } from "console";

interface QrCodeData {
  id: string;
  qr_number: string;
  table_number: number | null;
  partner_id: string;
  no_of_scans: number;
  table_name?: string | null;
}

interface CartItem extends MenuItem {
  quantity: number;
  offers?: {
    offer_price: number;
  }[];
}

export interface ExtraCharge {
  name: string;
  amount: number;
  id: string;
}

interface POSState {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  cartItems: CartItem[];
  extraCharges: ExtraCharge[];
  totalAmount: number;
  userPhone: string | null;
  deliveryAddress?: string;
  setDeliveryAddress: (address: string) => void;
  setUserPhone: (phone: string | null) => void;
  tableNumbers: number[];
  tableNumber: number | null;
  setTableNumber: (tableNumber: number | null) => void;
  tableName: string | null;
  setTableName: (tableName: string | null) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  increaseQuantity: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;
  clearCart: () => void;
  checkout: () => Promise<void>;
  pastBills: Order[];
  loadingBills: boolean;
  fetchPastBills: () => Promise<void>;
  deleteBill: (billId: string) => Promise<void>;
  order: Order | null;
  setOrder: (order: Order | null) => void;
  getPartnerTables: () => Promise<void>;
  qrCodeData: QrCodeData[] | [];
  postCheckoutModalOpen: boolean;
  editOrderModalOpen: boolean;
  cartModalOpen: boolean;
  setPostCheckoutModalOpen: (open: boolean) => void;
  setEditOrderModalOpen: (open: boolean) => void;
  setCartModalOpen: (open: boolean) => void;
  closeAllModalsAndPOS: () => void;
  addExtraCharge: (charge: Omit<ExtraCharge, "id">) => void;
  removeExtraCharge: (chargeId: string) => void;
  calculateTotalWithCharges: () => number;
  isCaptainOrder: boolean;
  setIsCaptainOrder: (isCaptain: boolean) => void;
  isPOSOpen: boolean;
  setIsPOSOpen: (open: boolean) => void;
  qrGroup: QrGroup | null;
  setQrGroup: (qrGroup: QrGroup | null) => void;
  fetchQrGroupForTable: (tableNumber: number) => Promise<void>;
  setDeliveryMode: (isDelivery: boolean) => void;
  removedQrGroupCharges: string[];
  removeQrGroupCharge: (qrGroupId: string) => void;
  addQrGroupCharge: (qrGroupId: string) => void;
  orderNote: string;
  setOrderNote: (note: string) => void;
  refreshOrdersAfterUpdate: () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  cartItems: [],
  extraCharges: [],
  totalAmount: 0,
  order: null,
  userPhone: null,
  tableNumber: null,
  tableNumbers: [],
  postCheckoutModalOpen: false,
  editOrderModalOpen: false,
  cartModalOpen: false,
  isCaptainOrder: false,
  deliveryAddress: "",
  isPOSOpen: false,
  qrGroup: null,
  removedQrGroupCharges: [],
  orderNote: "",
  tableName: null,
  qrCodeData: [],

  setTableName: (tableName: string | null) => {
    set({ tableName });
  },

  setDeliveryAddress: (address: string) => {
    set({ deliveryAddress: address });
    const order = get().order;
    if (order) {
      set({
        order: {
          ...order,
          deliveryAddress: address,
        },
      });
    }
    
  },

  setPostCheckoutModalOpen: (open) => {
    set({ postCheckoutModalOpen: open });
    if (!open) {
      get().clearCart();
    }
  },
  setEditOrderModalOpen: (open) => set({ editOrderModalOpen: open }),
  setCartModalOpen: (open) => set({ cartModalOpen: open }),
  closeAllModalsAndPOS: () => {
    set({ 
      postCheckoutModalOpen: false,
      editOrderModalOpen: false,
      cartModalOpen: false,
      isPOSOpen: false
    });
    get().clearCart();
  },

  setIsCaptainOrder: (isCaptain) => set({ isCaptainOrder: isCaptain }),
  getPartnerTables: async () => {
    try {
      const userData = useAuthStore.getState().userData;
      console.log("Getting partner tables with user data:", {
        userData,
        role: userData?.role,
        partnerId: userData?.role === "captain" ? (userData as Captain)?.partner_id : userData?.id
      });

      // Wait for user data to be loaded
      if (!userData) {
        console.log("User data not loaded yet, waiting...");
        return;
      }

      // For captains, we need their partner_id
      if (userData.role === "captain") {
        const captainData = userData as Captain;
        if (!captainData.partner_id) {
          console.error("Captain data missing partner_id:", captainData);
          return;
        }
        const partnerId = captainData.partner_id;
        // console.log("Fetching tables for partner ID:", partnerId, "from captain:", userData);

        const response = await fetchFromHasura(
          `
          query GetPartnerTables($partner_id: uuid!) {
            qr_codes(where: {partner_id: {_eq: $partner_id}}) {
              id
              qr_number
              table_number
              partner_id
              no_of_scans
              table_name
            }
          }
        `,
          {
            partner_id: partnerId,
          }
        );

        // console.log("All QR codes for partner:", response.qr_codes);
        
        if (!response.qr_codes || !Array.isArray(response.qr_codes)) {
          console.error("Invalid response format:", response);
          return;
        }

        // Get all table numbers, including 0
        const qrCodes = response.qr_codes as QrCodeData[];
        const tableNumbers = qrCodes
          .filter((qr) => qr.table_number !== null && qr.table_number !== undefined)
          .map((qr) => Number(qr.table_number))
          .sort((a: number, b: number) => a - b); // Sort numerically

        

        // console.log("Extracted table numbers:", tableNumbers);
        
        if (tableNumbers.length === 0) {
          console.warn("No table numbers found in qr_codes for partner:", partnerId);
          // Log all QR codes that might have null table numbers
          qrCodes.forEach((qr) => {
            if (qr.table_number === null || qr.table_number === undefined) {
              console.log("QR code with null/undefined table number:", qr);
            }
          });
        }

        set({ tableNumbers , qrCodeData: qrCodes || null });
      } else {
        // For partners, use their own ID
        const partnerId = userData.id;
        // console.log("Fetching tables for partner ID:", partnerId);

        const response = await fetchFromHasura(
          `
          query GetPartnerTables($partner_id: uuid!) {
            qr_codes(where: {partner_id: {_eq: $partner_id}}) {
              id
              qr_number
              table_number
              partner_id
              no_of_scans
            }
          }
        `,
          {
            partner_id: partnerId,
          }
        );

        if (!response.qr_codes || !Array.isArray(response.qr_codes)) {
          console.error("Invalid response format:", response);
          return;
        }

        const qrCodes = response.qr_codes as QrCodeData[];
        const tableNumbers = qrCodes
          .filter((qr) => qr.table_number !== null && qr.table_number !== undefined)
          .map((qr) => Number(qr.table_number))
          .sort((a: number, b: number) => a - b);

        set({ tableNumbers });
      }
    } catch (error) {
      console.error("Error fetching partner tables:", error);
      throw error;
    }
  },

  setTableNumber: (tableNumber: number | null) => {
    set({ tableNumber });
    
    // Clear QR group first when changing table numbers
    set({ qrGroup: null });
    
    // Remove any existing QR group charges from extraCharges when switching tables
    set((state) => ({
      extraCharges: state.extraCharges.filter(charge => !charge.id.startsWith('qr-group-')),
      removedQrGroupCharges: [], // Clear removed QR group charges when switching tables
    }));
    
    // If table number is set, fetch QR group for that table
    if (tableNumber !== null) {
      const { fetchQrGroupForTable } = get();
      fetchQrGroupForTable(tableNumber).catch((error) => {
        console.error("Failed to fetch QR group for table:", error);
      });
    }
  },

  setUserPhone: (phone: string | null) => {
    set({ userPhone: phone });
  },

  setOrder: (order: Order | null) => {
    set({ order });
  },

  addToCart: (item: MenuItem) => {
    const { cartItems } = get();
    const existingItem = cartItems.find((cartItem) => cartItem.id === item.id);

    if (existingItem) {
      get().increaseQuantity(item.id!);
      return;
    }

    set((state) => ({
      cartItems: [...state.cartItems, { ...item, quantity: 1 }],
      totalAmount: state.totalAmount + item.price,
    }));
  },

  removeFromCart: (itemId: string) => {
    const { cartItems } = get();
    const item = cartItems.find((item) => item.id === itemId);

    if (!item) return;

    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.id !== itemId),
      totalAmount: state.totalAmount - item.price * item.quantity,
    }));
  },

  increaseQuantity: (itemId: string) => {
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      ),
      totalAmount:
        state.totalAmount +
        (state.cartItems.find((item) => item.id === itemId)?.price || 0),
    }));
  },

  decreaseQuantity: (itemId: string) => {
    const { cartItems } = get();
    const item = cartItems.find((item) => item.id === itemId);

    if (!item) return;

    if (item.quantity === 1) {
      get().removeFromCart(itemId);
      return;
    }

    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
      ),
      totalAmount: state.totalAmount - item.price,
    }));
  },

  clearCart: () => {
    set({ cartItems: [], totalAmount: 0, extraCharges: [], removedQrGroupCharges: [], orderNote: "" });
  },

  addExtraCharge: (charge: Omit<ExtraCharge, "id">) => {
    const newCharge = {
      ...charge,
      id: uuidv4(),
    };
    set((state) => ({
      extraCharges: [...state.extraCharges, newCharge],
    }));
  },

  removeExtraCharge: (chargeId: string) => {
    set((state) => ({
      extraCharges: state.extraCharges.filter(
        (charge) => charge.id !== chargeId
      ),
    }));
  },

  calculateTotalWithCharges: () => {
    const { cartItems, extraCharges } = get();
    const hotelData = useAuthStore.getState().userData as Partner;
    const gstPercentage = hotelData?.gst_percentage || 0;

    // Calculate food subtotal
    const foodSubtotal = cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    // Calculate all extra charges subtotal (including QR group charges)
    const extraChargesSubtotal = extraCharges.reduce(
      (total, charge) => total + charge.amount,
      0
    );

    // Calculate GST on food and extra charges
    const gstAmount = getGstAmount(
      foodSubtotal + extraChargesSubtotal,
      gstPercentage
    );

    // Return grand total
    return foodSubtotal + extraChargesSubtotal + gstAmount;
  },

  checkout: async () => {
    try {
      set({ loading: true });
      const { cartItems, extraCharges, isCaptainOrder, qrGroup, orderNote } = get();
      const userData = useAuthStore.getState().userData;
      console.log("User Data:", {
        id: userData?.id,
        role: userData?.role,
        partner_id: (userData as Captain)?.partner_id,
        raw: userData
      });
      
      const userId = userData?.id;
      
      // Get partner ID based on user type
      let partnerId: string;
      let gstPercentage: number;
      if (userData?.role === "captain") {
        const captainData = userData as Captain;
        partnerId = captainData.partner_id;
        console.log("Captain Data:", {
          id: captainData.id,
          partner_id: captainData.partner_id,
          role: captainData.role
        });
        gstPercentage = captainData.gst_percentage || 0;
      } else {
        const partnerData = userData as Partner;
        partnerId = partnerData.id;
        console.log("Partner Data:", {
          id: partnerData.id,
          role: partnerData.role
        });
        gstPercentage = partnerData.gst_percentage || 0;
      }
      
      console.log("Final partnerId being used:", partnerId);
      
      if (!userId || !partnerId) {
        throw new Error("User ID or Partner ID is not available");
      }

      // Calculate amounts
      const foodSubtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Prepare all extra charges (manual + QR group)
      const allExtraCharges = [...extraCharges];
      
      // QR group charges are now included in extraCharges, so no need to add them separately

      const grandTotal =
        foodSubtotal +
        allExtraCharges.reduce((sum, charge) => sum + charge.amount, 0) +
        getGstAmount(foodSubtotal, gstPercentage);

      const orderId = uuidv4();
      const createdAt = new Date().toISOString();

      console.log("Creating order with details:", {
        orderId,
        partnerId,
        userId,
        isCaptainOrder,
        createdAt,
        totalPrice: foodSubtotal,
        type: "pos",
        status: "completed" as "completed",
        tableNumber: get().tableNumber,
        extraCharges: allExtraCharges,
        gstIncluded: gstPercentage,
        captainId: isCaptainOrder ? userId : null,
        orderNote: orderNote
      });

      const getNextDisplayOrderNumber = await getNextOrderNumber(partnerId);

      // Create order in database
      const orderResponse = await fetchFromHasura(createOrderMutation, {
        id: orderId,
        totalPrice: foodSubtotal,
        gst_included: gstPercentage,
        extra_charges: allExtraCharges.length > 0 ? allExtraCharges : null,
        createdAt,
        tableNumber: get().tableNumber || null,
        qrId: null,
        partnerId,
        userId: null,
        type: "pos",
        status: "completed" as "completed",
        delivery_address: get().deliveryAddress || null,
        delivery_location: null,
        orderedby: isCaptainOrder ? "captain" : null,
        captain_id: isCaptainOrder ? userId : null,
        notes: orderNote || null,
        phone: get().userPhone || null,
        display_id: getNextDisplayOrderNumber.toString(), 
        table_name: get().tableName || null,
      });

      if (orderResponse.errors || !orderResponse?.insert_orders_one?.id) {
        console.error("Order creation failed:", {
          errors: orderResponse.errors,
          sentData: {
            id: orderId,
            totalPrice: foodSubtotal,
            partnerId,
            type: "pos",
            status: "completed" as "completed",
            tableNumber: get().tableNumber,
            extraCharges: allExtraCharges,
            gstIncluded: gstPercentage,
            captainId: isCaptainOrder ? userId : null
          }
        });
        throw new Error(orderResponse.errors?.[0]?.message || "Failed to create order");
      }

      // Create order items
      const orderItemsResponse = await fetchFromHasura(
        `mutation CreateOrderItems($orderItems: [order_items_insert_input!]!) {
          insert_order_items(objects: $orderItems) {
            returning {
              id
              order_id
              menu_id
              quantity
            }
          }
        }`,
        {
          orderItems: cartItems.map((item) => ({
            order_id: orderId,
            menu_id: item.id?.split("|")[0],
            quantity: item.quantity,
            item: {
              id: item.id,
              name: item.name,
              price: item.price,
              category: item.category,
            },
          })),
        }
      );

      if (orderItemsResponse.errors) {
        console.error("Order items creation failed:", orderItemsResponse.errors);
        throw new Error(orderItemsResponse.errors[0]?.message || "Failed to create order items");
      }

      // Create order object
      const newOrder: Order = {
        id: orderId,
        items: cartItems.map(item => ({
          id: item.id || "",
          quantity: item.quantity,
          name: item.name,
          price: item.price,
          category: item.category,
          offers: item.offers || [],
          image_url: item.image_url || "",
          description: item.description || "",
          is_top: item.is_top || false,
          is_available: item.is_available || true,
          priority: item.priority || 0,
        })),
        totalPrice: grandTotal,
        createdAt,
        tableNumber: get().tableNumber,
        qrId: undefined,
        status: "completed",
        partnerId,
        userId: undefined,
        user: {
          phone: get().userPhone || "N/A",
        },
        gstIncluded: gstPercentage,
        extraCharges: allExtraCharges,
        type: "pos",
        deliveryAddress: get().deliveryAddress || undefined,
        phone: get().userPhone || "N/A",
        orderedby: isCaptainOrder ? "captain" : undefined,
        captain_id: isCaptainOrder ? userId : undefined,
        notes: orderNote || undefined,
        display_id : getNextDisplayOrderNumber.toString(),
      };

      set({ order: newOrder, postCheckoutModalOpen: true });
      toast.success("Order placed successfully!");
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to place order");
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  pastBills: [],
  loadingBills: false,

  fetchPastBills: async () => {
    try {
      set({ loadingBills: true });
      const response = await fetchFromHasura(getOrdersOfPartnerQuery, {
        partner_id: useAuthStore.getState().userData?.id,
      });
      set({ pastBills: response.orders, loadingBills: false });
    } catch (error) {
      console.error("Error fetching past bills:", error);
      set({ loadingBills: false });
      throw error;
    }
  },

  deleteBill: async (billId: string) => {
    try {
      await fetchFromHasura(deleteBillMutation, {
        id: billId,
      });

      const currentBills = get().pastBills;
      set({ pastBills: currentBills.filter((bill) => bill.id !== billId) });
    } catch (error) {
      console.error("Error deleting bill:", error);
      throw error;
    }
  },

  setIsPOSOpen: (open) => set({ isPOSOpen: open }),

  setQrGroup: (qrGroup: QrGroup | null) => set({ qrGroup }),

  fetchQrGroupForTable: async (tableNumber: number) => {
    try {
      const userData = useAuthStore.getState().userData;
      let partnerId: string;
      
      if (userData?.role === "captain") {
        const captainData = userData as Captain;
        partnerId = captainData.partner_id;
      } else {
        const partnerData = userData as Partner;
        partnerId = partnerData.id;
      }
      
      if (!partnerId) {
        console.error("Partner ID not available");
        return;
      }

      const qrGroup = await getQrGroupForTable(partnerId, tableNumber);
      
      if (qrGroup) {
        set({ qrGroup });
        
        // Calculate the QR group charge amount
        const { cartItems } = get();
        const qrGroupCharges = getExtraCharge(
          cartItems as any[],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE"
        );
        
        // Only add as extra charge if it's not already removed and has a positive amount
        const { removedQrGroupCharges, extraCharges } = get();
        const isAlreadyRemoved = removedQrGroupCharges.includes(qrGroup.id);
        const isAlreadyAdded = extraCharges.some(charge => charge.name === qrGroup.name);
        
        if (!isAlreadyRemoved && qrGroupCharges > 0 && !isAlreadyAdded) {
          // Add QR group charge as an extra charge
          const newCharge: ExtraCharge = {
            id: `qr-group-${qrGroup.id}`,
            name: qrGroup.name,
            amount: qrGroupCharges,
          };
          
          set((state) => ({
            extraCharges: [...state.extraCharges, newCharge],
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching QR group for table:", error);
    }
  },

  setDeliveryMode: (isDelivery: boolean) => {
    if (isDelivery) {
      set({ tableNumber: 0, qrGroup: null });
      // Fetch QR group for table 0 (delivery)
      const { fetchQrGroupForTable } = get();
      fetchQrGroupForTable(0).catch((error) => {
        console.error("Failed to fetch QR group for delivery:", error);
      });
    }
  },

  removeQrGroupCharge: (qrGroupId: string) => {
    set((state) => ({
      removedQrGroupCharges: [...state.removedQrGroupCharges, qrGroupId],
      extraCharges: state.extraCharges.filter(charge => charge.id !== `qr-group-${qrGroupId}`),
    }));
  },

  addQrGroupCharge: (qrGroupId: string) => {
    const { qrGroup, cartItems, extraCharges } = get();
    
    if (qrGroup && qrGroup.id === qrGroupId) {
      const qrGroupCharges = getExtraCharge(
        cartItems as any[],
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE"
      );
      
      if (qrGroupCharges > 0) {
        const newCharge: ExtraCharge = {
          id: `qr-group-${qrGroupId}`,
          name: qrGroup.name,
          amount: qrGroupCharges,
        };
        
        set((state) => ({
          removedQrGroupCharges: state.removedQrGroupCharges.filter((id) => id !== qrGroupId),
          extraCharges: [...state.extraCharges, newCharge],
        }));
      }
    }
  },

  setOrderNote: (note: string) => set({ orderNote: note }),

  refreshOrdersAfterUpdate: () => {
    // This function will be used to trigger order refresh in components
    // Components can listen to this to refetch orders after updates
    const event = new CustomEvent('orderUpdated', { detail: { timestamp: Date.now() } });
    window.dispatchEvent(event);
  },
}));
