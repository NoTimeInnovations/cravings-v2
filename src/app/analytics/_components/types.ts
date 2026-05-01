export type Range = "1d" | "7d" | "30d" | "90d" | "365d";

export type KpiBlock = { value: number; delta: number | null; avgRating?: number | null };

export type SeriesPoint = {
  d: string;
  orders: number;
  gmv: number;
  customers: number;
  scans: number;
  newPartners: number;
  direct: number;
  pos: number;
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

export type LiveStats = {
  recentOrders: LiveOrder[];
  activeRestaurantsToday: number;
  lastHour: {
    total: { count: number; gmv: number };
    delivery: { count: number; gmv: number };
    takeaway: { count: number; gmv: number };
    dinein: { count: number; gmv: number };
  };
  pendingNow: number;
  partners: LivePartnerOption[];
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
  directDinein: Channel;
  posDinein: Channel;
  posTakeaway: Channel;
  posDelivery: Channel;
};

export type ChannelTotals = {
  direct: Channel;
  pos: Channel;
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
