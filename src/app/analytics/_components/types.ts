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
  delivery_rules?: any;
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

export type WatchlistStatus = "paid" | "free_trial";

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
  last24h: number; // rolling last 24 hours
  prev24h: number; // the 24 hours before that
  week: number; // last 7 days
  prevWeek: number; // the 7 days before that
  month: number; // last 30 days
  prevMonth: number; // the 30 days before that
};

export type WatchlistResponse = {
  entries: WatchlistEntry[];
  syncedAt: string;
};

// ---- All Customers (CRM roster; stats computed only on Sync, never live)
export type CustomerInterest = "warm" | "hot" | "active";

export type CustomerEntry = {
  id: string; // analytics_customers row id
  partnerId: string;
  name: string;
  district: string | null;
  username: string | null;
  joinedAt: string | null; // partner created_at (when they joined)
  interest: CustomerInterest;
  note: string | null; // free-text CRM note
  menuCreated: boolean;
  menuItemCount: number;
  whatsappConnected: boolean;
  paymentGateway: string | null; // 'cashfree' | 'razorpay' | 'manual' | custom
  pgStatus: string | null;
  delivery: string | null; // 'porter' | 'rapido' | 'own' | 'mix'
  deliveryNote: string | null; // free text, mainly for 'mix'
  qrTable: boolean;
  qrCounter: boolean;
  qrSwiggyZomato: boolean;
  qrOwnParcels: boolean;
  totalOrders: number; // all-time ONLINE orders (POS excluded)
  weekly: number[]; // [thisWeek, 1wk ago, … 7wk ago] online orders
  statsSyncedAt: string | null;
  createdAt: string;
};

export type CustomersResponse = {
  entries: CustomerEntry[];
  syncedAt: string | null; // most recent stats_synced_at across the roster
};

// editable manual fields (camelCase → sent to PATCH)
export type CustomerPatch = Partial<
  Pick<
    CustomerEntry,
    | "interest"
    | "note"
    | "menuCreated"
    | "whatsappConnected"
    | "paymentGateway"
    | "pgStatus"
    | "delivery"
    | "deliveryNote"
    | "qrTable"
    | "qrCounter"
    | "qrSwiggyZomato"
    | "qrOwnParcels"
  >
>;

// block list — test/junk restaurants kept out of all analytics
export type BlocklistEntry = {
  id: string; // analytics_blocklist row id
  partnerId: string;
  name: string;
  district: string | null;
  username: string | null;
  note: string | null;
  createdAt: string;
};

export type BlocklistResponse = {
  entries: BlocklistEntry[];
  syncedAt?: string;
};

// current vs previous equal period
export type TrendPair = { curr: number; prev: number };

// ---- partner signups over time (Target tab "Customers joined" panel)
export type SignupsRange = {
  from: string; // YYYY-MM-DD (IST)
  to: string; // YYYY-MM-DD (IST)
  days: number; // inclusive
  prevFrom: string;
  prevTo: string;
  total: number; // partners joined in [from, to]
  prevTotal: number; // partners joined in the prior equal-length period
  perDay: number;
  perWeek: number;
  perMonth: number;
};

export type SignupsResponse = {
  range: SignupsRange;
  series: { d: string; count: number }[]; // one entry per day in [from, to]
  kpis: {
    allTime: number;
    last24h: TrendPair;
    last7: TrendPair;
    last30: TrendPair;
  };
  syncedAt: string;
};

export type DailyLogEntry = {
  id: string; // analytics_daily_log row id
  logDate: string; // YYYY-MM-DD (IST)
  calls: number;
  freeTrials: number;
  paidCustomers: number;
  note: string | null;
  createdAt: string;
};

// each metric summarised over last-24h / last-7d / last-30d vs the prior period
export type DailyLogSummary = {
  calls: { d1: TrendPair; d7: TrendPair; d30: TrendPair };
  freeTrials: { d1: TrendPair; d7: TrendPair; d30: TrendPair };
  paidCustomers: { d1: TrendPair; d7: TrendPair; d30: TrendPair };
};

export type DailyLogResponse = {
  entries: DailyLogEntry[];
  summary: DailyLogSummary;
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
