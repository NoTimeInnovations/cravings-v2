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
};

export type TeleveryOutletOrder = {
  id: string;
  displayId: string | number | null;
  createdAt: string;
  status: string | null;
  type: string | null;
  totalPrice: number | null;
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
  totals: { businesses: number; orders: number; revenue: number };
  businesses: TeleveryBusiness[];
  outletOrders: TeleveryOutletOrders | null;
};

/**
 * Sidebar sections. The string doubles as the sidebar label and the active-view
 * key, exactly like admin-v2's `activeView`.
 */
export type TeleveryView = "Dashboard" | "Businesses";
