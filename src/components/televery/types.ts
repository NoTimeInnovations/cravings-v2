// Shapes returned by GET /api/televery/overview. They mirror that route's JSON
// 1:1 — keep them in sync with src/app/api/televery/overview/route.ts.

export type TeleveryBusiness = {
  id: string;
  username: string | null;
  storeName: string | null;
  location: string | null;
  phone: string | null;
  status: string | null;
  orders: number;
  revenue: number;
  /** Split by where the customer came from. Televery's branch is on
   *  whatsapp_source "main", so every outlet answers on Televery's own number —
   *  a WhatsApp order for any of them is one Televery originated. Everything
   *  else is the customer arriving at the shop's own link. */
  whatsappOrders: number;
  whatsappRevenue: number;
  directOrders: number;
  directRevenue: number;
};

export type TeleveryOutletOrder = {
  id: string;
  displayId: string | number | null;
  createdAt: string;
  status: string | null;
  type: string | null;
  totalPrice: number | null;
  orderChannel: string | null;
  customerName: string | null;
  customerPhone: string | null;
};

/** One page of a single connected business's orders (the drill-down payload). */
export type TeleveryOutletOrders = {
  partnerId: string;
  page: number;
  pageSize: number;
  total: number;
  orders: TeleveryOutletOrder[];
};

export type TeleveryOverview = {
  brand: { id: string; name: string } | null;
  totals: {
    businesses: number;
    orders: number;
    revenue: number;
    whatsappOrders: number;
    whatsappRevenue: number;
    directOrders: number;
    directRevenue: number;
  };
  businesses: TeleveryBusiness[];
  /** False when the brand is no longer on whatsapp_source "main", i.e. outlets
   *  may have their own numbers and "via WhatsApp" no longer implies "via Televery". */
  channelSplitAttributable: boolean;
  outletOrders: TeleveryOutletOrders | null;
};

/**
 * Sidebar sections. The string doubles as the sidebar label and the active-view
 * key, exactly like admin-v2's `activeView`.
 */
export type TeleveryView = "Dashboard" | "Businesses";
