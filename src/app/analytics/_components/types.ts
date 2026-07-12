export type Range = "1d" | "7d" | "30d" | "90d" | "365d";

export type KpiBlock = { value: number; delta: number | null; avgRating?: number | null };

export type SeriesPoint = {
  d: string;
  orders: number;
  gmv: number;
  customers: number;
  scans: number;
  newPartners: number;
  delivery: number;
  takeaway: number;
};

export type LiveOrder = {
  id: string;
  displayId: string | null;
  createdAt: string;
  status: string | null;
  totalPrice: number;
  type: string | null;
  orderedby: string | null;
  tableNumber: number | null;
  tableName: string | null;
  partnerName: string;
  partnerDistrict: string | null;
  partnerId: string | null;
};

export type LivePartnerOption = {
  id: string;
  name: string;
  district: string | null;
};

export type SelectedPartner = {
  id: string;
  name: string;
  district: string | null;
  totalOrders: number;
  delivery: number;
  takeaway: number;
  monthTotal: number;
  monthDelivery: number;
  monthTakeaway: number;
  monthGmv: number;
};

export type SelectedPartnerStats = {
  partners: SelectedPartner[];
  windowStart?: string;
  syncedAt: string;
};

export type LiveWindowId = "24h" | "7d" | "30d";

export type LiveStats = {
  recentOrders: LiveOrder[];
  activeRestaurantsToday: number;
  window: {
    id: LiveWindowId;
    since: string;
    total: { count: number; gmv: number };
    delivery: { count: number; gmv: number };
    takeaway: { count: number; gmv: number };
  };
  pendingNow: number;
  partners: LivePartnerOption[];
  syncedAt: string;
};

export type AnalyticsOrderItem = {
  name: string;
  price: number;
  quantity: number;
  isFreebie: boolean;
};

// Full order shape returned by /api/stats/partner-orders — mirrors the
// fields the admin-v2 OrderDetails view renders, mapped to camelCase.
export type AnalyticsOrder = {
  id: string;
  displayId: string | null;
  createdAt: string;
  status: string | null;
  type: string | null;
  totalPrice: number;
  tableNumber: number | null;
  tableName: string | null;
  deliveryAddress: string | null;
  deliveryLocation: { coordinates: [number, number] } | null;
  phone: string | null;
  orderedby: string | null;
  paymentMethod: string | null;
  isPaid: boolean;
  cashfreePaymentId: string | null;
  orderChannel: string | null;
  notes: string | null;
  gstIncluded: number | null;
  extraCharges: Array<{ name: string; amount: number; charge_type?: string }>;
  discounts: Array<{
    type?: string;
    value?: number;
    savings?: number;
    max_discount_amount?: number | null;
    reason?: string;
    freebie_item_names?: string;
  }>;
  cancelReason: string | null;
  cancelledBy: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  bookingPersons: number | null;
  loyaltyPointsRedeemed: number;
  loyaltyRedeemValue: number;
  loyaltyPointsEarned: number | null;
  userName: string | null;
  userPhone: string | null;
  items: AnalyticsOrderItem[];
};

export type PartnerOrdersPartner = {
  id: string;
  name: string;
  district: string | null;
  currency: string;
  gstPercentage: number;
  country: string | null;
};

export type OrderStat = { count: number; gmv: number };

export type PartnerOrdersStats = {
  partner: PartnerOrdersPartner;
  summary: {
    today: OrderStat;
    all: OrderStat;
    month: OrderStat;
    week: OrderStat;
  };
  monthSelection: { year: number; month: number };
  channels: {
    from: string | null;
    to: string | null;
    app: OrderStat;
    web: OrderStat;
    whatsapp: OrderStat;
    total: OrderStat;
  };
  scope: "today" | "all";
  page: number;
  pageSize: number;
  totalCount: number;
  orders: AnalyticsOrder[];
  syncedAt: string;
};

export type PartnerRow = {
  id: string;
  name: string;
  district: string | null;
  orders: number;
  gmv: number;
};

export type QrRow = {
  qr_id: string;
  count: number;
  partner_name: string;
  district: string | null;
  table_number: number | null;
  table_name: string | null;
};

export type CityRow = { city: string; count: number };

export type Channel = {
  orders: number;
  gmv: number;
  ordersDelta: number | null;
  gmvDelta: number | null;
};

export type Channels = {
  directDelivery: Channel;
  directTakeaway: Channel;
};

export type ChannelTotals = {
  direct: Channel;
};

export type PublicStats = {
  range: Range;
  window: { start: string; end: string };
  kpis: {
    activeCustomers: KpiBlock;
    orders: KpiBlock;
    gmv: KpiBlock;
    scans: KpiBlock;
    activePartners: KpiBlock;
    newPartners: KpiBlock;
    reviews: KpiBlock & { avgRating: number | null };
    offersClaimed: KpiBlock;
    cancelled: KpiBlock;
    completionRate: number;
  };
  series: SeriesPoint[];
  channels: Channels;
  channelTotals: ChannelTotals;
  topPartnersByOrders: PartnerRow[];
  topPartnersByGmv: PartnerRow[];
  topQr: QrRow[];
  topCities: CityRow[];
  allTime: {
    partners: number;
    users: number;
    orders: number;
    gmv: number;
    avgOrderValue: number;
    qrScans: number;
    reviews: number;
    avgRating: number | null;
  };
  syncedAt: string;
};

export type WatchlistStatus = "paying" | "test" | "free";

export type WatchlistEntry = {
  id: string; // analytics_watchlist row id
  partnerId: string;
  name: string;
  district: string | null;
  username: string | null;
  planInr: number;
  status: WatchlistStatus;
  note: string | null;
  createdAt: string;
  // live order stats (computed on read, never stored)
  totalOrders: number;
  gmvTotal: number;
  avgDaily: number;
  avgWeekly: number;
  today: number;
  yesterday: number;
  week: number; // last 7 days
  prevWeek: number; // the 7 days before that
  month: number; // last 30 days
  prevMonth: number; // the 30 days before that
};

export type WatchlistResponse = {
  entries: WatchlistEntry[];
  syncedAt: string;
};

export type UsageRow = {
  partnerId: string | null;
  username: string;
  name: string;
  district: string | null;
  events: number;
  pageviews: number;
  visits: number;
  users: number;
  orders: number;
  scans: number;
};

export type UsageStats = {
  enabled: boolean;
  reason?: string;
  range: Range;
  window: { start: string; end: string };
  rows: UsageRow[];
  totals: {
    restaurants: number;
    events: number;
    pageviews: number;
    visits: number;
    users: number;
    orders: number;
    scans: number;
  };
  unmatched: { username: string; events: number }[];
  syncedAt: string;
};

export type PosthogStats = {
  enabled: boolean;
  reason?: string;
  visitors: number | null;
  visitorsPrev: number | null;
  visitorsDelta: number | null;
  sessions: number | null;
  pageviews: number | null;
  landingVisitors: number | null;
  landingPageviews: number | null;
  landingDelta: number | null;
  daily: Array<{ d: string; visitors: number; pageviews: number }>;
  topReferrers: Array<{ domain: string; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
  topCountries: Array<{ country: string; code: string | null; count: number }>;
  syncedAt: string;
};
