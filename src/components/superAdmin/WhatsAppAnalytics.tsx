'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageSquare,
  ShieldCheck,
  Package,
  IndianRupee,
  Send,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  X,
} from 'lucide-react';
import { fetchFromHasura } from '@/lib/hasuraClient';
import {
  getWhatsAppMessageStats,
  getWhatsAppTotalCounts,
  getWhatsAppDailyMessages,
  getWhatsAppPartnerUsage,
  getWhatsAppPartnerDetail,
} from '@/api/whatsappAnalytics';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COST_PER_MESSAGE = 0.115;

const TIME_RANGES = {
  TODAY: 'today',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_90_DAYS: 'last_90_days',
  THIS_YEAR: 'this_year',
  ALL_TIME: 'all_time',
  CUSTOM: 'custom',
} as const;

type TimeRangeType = (typeof TIME_RANGES)[keyof typeof TIME_RANGES];

type DateRange = {
  startDate: Date;
  endDate: Date;
};

const getDateRangeFromType = (
  rangeType: TimeRangeType,
  customRange: DateRange = { startDate: new Date(), endDate: new Date() }
): DateRange => {
  const today = new Date();
  switch (rangeType) {
    case TIME_RANGES.TODAY:
      return { startDate: startOfDay(today), endDate: endOfDay(today) };
    case TIME_RANGES.LAST_7_DAYS:
      return { startDate: subDays(today, 7), endDate: endOfDay(today) };
    case TIME_RANGES.LAST_30_DAYS:
      return { startDate: subDays(today, 30), endDate: endOfDay(today) };
    case TIME_RANGES.LAST_90_DAYS:
      return { startDate: subDays(today, 90), endDate: endOfDay(today) };
    case TIME_RANGES.THIS_YEAR:
      return { startDate: new Date(today.getFullYear(), 0, 1), endDate: endOfDay(today) };
    case TIME_RANGES.ALL_TIME:
      return { startDate: new Date('2020-01-01'), endDate: endOfDay(today) };
    case TIME_RANGES.CUSTOM:
      return customRange;
    default:
      return { startDate: subDays(today, 7), endDate: endOfDay(today) };
  }
};

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  otp: {
    label: 'OTP',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: <ShieldCheck size={24} className="text-blue-600" />,
  },
  order_update: {
    label: 'Order Update',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: <Package size={24} className="text-purple-600" />,
  },
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6'];

interface MessageStats {
  total: number;
  sent: number;
  failed: number;
  otp: number;
  order_update: number;
}

interface DailyData {
  date: string;
  otp: number;
  order_update: number;
  total: number;
}

interface PartnerRow {
  id: string;
  name: string;
  store_name: string;
  phone: string;
  messageCount: number;
}

interface PartnerDetailData {
  order_update: number;
  otp: number;
  total: number;
  sent: number;
  failed: number;
  messages: Array<{
    id: string;
    phone: string;
    template_name: string;
    message_type: string;
    category: string;
    status: string;
    created_at: string;
  }>;
}

const WhatsAppAnalytics = () => {
  const [timeRange, setTimeRange] = useState<TimeRangeType>(TIME_RANGES.LAST_30_DAYS);
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });
  const [stats, setStats] = useState<MessageStats>({
    total: 0,
    sent: 0,
    failed: 0,
    otp: 0,
    order_update: 0,
  });
  const [allTimeTotal, setAllTimeTotal] = useState(0);
  const [allTimeOtp, setAllTimeOtp] = useState(0);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [partnerTotal, setPartnerTotal] = useState(0);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerPage, setPartnerPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [partnerLoading, setPartnerLoading] = useState(false);

  // Partner detail modal
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null);
  const [partnerDetail, setPartnerDetail] = useState<PartnerDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const PARTNERS_PER_PAGE = 10;

  const getDateRange = useCallback(() => {
    return getDateRangeFromType(timeRange, customDateRange);
  }, [timeRange, customDateRange]);

  // Fetch main stats + daily data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const range = getDateRange();
        const startDate = range.startDate.toISOString();
        const endDate = range.endDate.toISOString();

        const [statsResult, totalResult, dailyResult] = await Promise.all([
          fetchFromHasura(getWhatsAppMessageStats, { startDate, endDate }),
          fetchFromHasura(getWhatsAppTotalCounts, {}),
          fetchFromHasura(getWhatsAppDailyMessages, { startDate, endDate }),
        ]);

        if (statsResult) {
          setStats({
            total: statsResult.total?.aggregate?.count || 0,
            sent: statsResult.sent?.aggregate?.count || 0,
            failed: statsResult.failed?.aggregate?.count || 0,
            otp: statsResult.otp?.aggregate?.count || 0,
            order_update: statsResult.order_update?.aggregate?.count || 0,
          });
        }

        if (totalResult) {
          setAllTimeTotal(totalResult.total?.aggregate?.count || 0);
          setAllTimeOtp(totalResult.otp?.aggregate?.count || 0);
        }

        // Process daily data
        if (dailyResult?.whatsapp_message_logs) {
          const dayMap: Record<string, DailyData> = {};
          for (const msg of dailyResult.whatsapp_message_logs) {
            const day = format(new Date(msg.created_at), 'yyyy-MM-dd');
            if (!dayMap[day]) {
              dayMap[day] = { date: day, otp: 0, order_update: 0, total: 0 };
            }
            const cat = msg.category as keyof Omit<DailyData, 'date' | 'total'>;
            if (dayMap[day][cat] !== undefined) {
              dayMap[day][cat]++;
            }
            dayMap[day].total++;
          }
          setDailyData(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));
        } else {
          setDailyData([]);
        }
      } catch (error) {
        console.error('Error fetching WhatsApp stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getDateRange]);

  // Fetch partner usage
  useEffect(() => {
    const fetchPartners = async () => {
      setPartnerLoading(true);
      try {
        const range = getDateRange();
        const startDate = range.startDate.toISOString();
        const endDate = range.endDate.toISOString();

        const result = await fetchFromHasura(getWhatsAppPartnerUsage, {
          startDate,
          endDate,
          limit: PARTNERS_PER_PAGE,
          offset: partnerPage * PARTNERS_PER_PAGE,
          search: partnerSearch ? `%${partnerSearch}%` : '%',
        });

        if (result) {
          setPartners(
            (result.partners || []).map((p: any) => ({
              id: p.id,
              name: p.name || 'Unknown',
              store_name: p.store_name || '',
              phone: p.phone || '',
              messageCount: p.whatsapp_message_logs_aggregate?.aggregate?.count || 0,
            }))
          );
          setPartnerTotal(result.partners_aggregate?.aggregate?.count || 0);
        }
      } catch (error) {
        console.error('Error fetching partner usage:', error);
      } finally {
        setPartnerLoading(false);
      }
    };

    fetchPartners();
  }, [getDateRange, partnerPage, partnerSearch]);

  // Fetch partner detail
  const openPartnerDetail = async (partner: PartnerRow) => {
    setSelectedPartner(partner);
    setDetailLoading(true);
    try {
      const range = getDateRange();
      const result = await fetchFromHasura(getWhatsAppPartnerDetail, {
        partnerId: partner.id,
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
      });
      if (result) {
        setPartnerDetail({
          order_update: result.order_update?.aggregate?.count || 0,
          otp: result.otp?.aggregate?.count || 0,
          total: result.total?.aggregate?.count || 0,
          sent: result.sent?.aggregate?.count || 0,
          failed: result.failed?.aggregate?.count || 0,
          messages: result.messages || [],
        });
      }
    } catch (error) {
      console.error('Error fetching partner detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value as TimeRangeType);
    setPartnerPage(0);
  };

  const handleCustomDateChange = (range: DateRange) => {
    setCustomDateRange(range);
    if (timeRange !== TIME_RANGES.CUSTOM) {
      setTimeRange(TIME_RANGES.CUSTOM);
    }
    setPartnerPage(0);
  };

  const totalCost = stats.total * COST_PER_MESSAGE;
  const allTimeCost = allTimeTotal * COST_PER_MESSAGE;
  const totalPartnerPages = Math.ceil(partnerTotal / PARTNERS_PER_PAGE);

  // Pie chart data
  const pieData = [
    { name: 'OTP', value: stats.otp },
    { name: 'Order Update', value: stats.order_update },
  ].filter((d) => d.value > 0);

  return (
    <div>
      {/* Header + Date Filter */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">WhatsApp Message Analytics</h3>
          <p className="text-sm text-gray-500">
            Cost per message: ₹{COST_PER_MESSAGE}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="p-2 rounded border-2 border-[#ffba79]/20 bg-[#fffefd]"
            value={timeRange}
            onChange={handleTimeRangeChange}
          >
            <option value={TIME_RANGES.TODAY}>Today</option>
            <option value={TIME_RANGES.LAST_7_DAYS}>Last 7 days</option>
            <option value={TIME_RANGES.LAST_30_DAYS}>Last 30 days</option>
            <option value={TIME_RANGES.LAST_90_DAYS}>Last 90 days</option>
            <option value={TIME_RANGES.THIS_YEAR}>This year</option>
            <option value={TIME_RANGES.ALL_TIME}>All time</option>
            <option value={TIME_RANGES.CUSTOM}>Custom Range</option>
          </select>
          {timeRange === TIME_RANGES.CUSTOM && (
            <DateRangePicker
              onUpdate={handleCustomDateChange}
              initialDateFrom={customDateRange.startDate}
              initialDateTo={customDateRange.endDate}
            />
          )}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <h3 className="text-2xl font-bold">{loading ? '...' : stats.total.toLocaleString()}</h3>
              <p className="text-xs text-gray-500">All time: {allTimeTotal.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <MessageSquare size={24} className="text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">OTP Messages</p>
              <h3 className="text-2xl font-bold">{loading ? '...' : stats.otp.toLocaleString()}</h3>
              <p className="text-xs text-gray-500">All time: {allTimeOtp.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <ShieldCheck size={24} className="text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sent / Failed</p>
              <h3 className="text-2xl font-bold">
                {loading ? '...' : (
                  <>
                    <span className="text-green-600">{stats.sent.toLocaleString()}</span>
                    {' / '}
                    <span className="text-red-500">{stats.failed.toLocaleString()}</span>
                  </>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                {stats.total > 0
                  ? `${((stats.sent / stats.total) * 100).toFixed(1)}% success rate`
                  : 'No messages yet'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-100">
              <Send size={24} className="text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <h3 className="text-2xl font-bold">
                {loading ? '...' : `₹${totalCost.toFixed(3)}`}
              </h3>
              <p className="text-xs text-gray-500">All time: ₹{allTimeCost.toFixed(3)}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <IndianRupee size={24} className="text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Category Breakdown Cards */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const count = stats[key as keyof MessageStats] as number;
            const cost = count * COST_PER_MESSAGE;
            return (
              <Card key={key} className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-full ${config.bgColor}`}>
                    {config.icon}
                  </div>
                </div>
                <p className="text-xs text-gray-600">{config.label}</p>
                <h4 className="text-xl font-bold">{loading ? '...' : count.toLocaleString()}</h4>
                <p className="text-xs text-gray-500">₹{cost.toFixed(3)}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Daily Messages Bar Chart */}
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd] lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Daily Messages</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => format(new Date(val), 'dd MMM')}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  labelFormatter={(val) => format(new Date(val), 'dd MMM yyyy')}
                  formatter={(value: number, name: string) => [
                    value,
                    CATEGORY_CONFIG[name]?.label || name,
                  ]}
                />
                <Legend
                  formatter={(value) => CATEGORY_CONFIG[value]?.label || value}
                />
                <Bar dataKey="otp" stackId="a" fill="#3b82f6" />
                <Bar dataKey="order_update" stackId="a" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No data for selected period
            </div>
          )}
        </Card>

        {/* Pie Chart */}
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <h3 className="text-lg font-semibold mb-4">Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Messages']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No data for selected period
            </div>
          )}
        </Card>
      </div>

      {/* Partner Usage Table */}
      <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd] mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold">Partner Usage</h3>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search partners..."
              className="pl-9"
              value={partnerSearch}
              onChange={(e) => {
                setPartnerSearch(e.target.value);
                setPartnerPage(0);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Store</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    Messages <ArrowUpDown size={14} />
                  </div>
                </TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-center">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    No partner usage found
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell className="text-gray-600">{partner.store_name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {partner.messageCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{(partner.messageCount * COST_PER_MESSAGE).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => openPartnerDetail(partner)}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPartnerPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {partnerPage * PARTNERS_PER_PAGE + 1}–
              {Math.min((partnerPage + 1) * PARTNERS_PER_PAGE, partnerTotal)} of{' '}
              {partnerTotal}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPartnerPage((p) => Math.max(0, p - 1))}
                disabled={partnerPage === 0}
                className="p-2 rounded border disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPartnerPage((p) => Math.min(totalPartnerPages - 1, p + 1))}
                disabled={partnerPage >= totalPartnerPages - 1}
                className="p-2 rounded border disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Partner Detail Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl">
              <div>
                <h3 className="font-semibold text-lg">{selectedPartner.name}</h3>
                <p className="text-sm text-gray-500">{selectedPartner.store_name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPartner(null);
                  setPartnerDetail(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : partnerDetail ? (
              <div className="p-4 space-y-4">
                {/* Partner stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold">{partnerDetail.total.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <p className="text-xs text-gray-500">Sent</p>
                    <p className="text-lg font-bold text-green-600">{partnerDetail.sent.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 text-center">
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className="text-lg font-bold text-red-500">{partnerDetail.failed.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 text-center">
                    <p className="text-xs text-gray-500">Cost</p>
                    <p className="text-lg font-bold text-orange-600">
                      ₹{(partnerDetail.total * COST_PER_MESSAGE).toFixed(3)}
                    </p>
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <p className="text-xs text-gray-500">{CATEGORY_CONFIG['order_update'].label}</p>
                    <p className="text-lg font-bold">{partnerDetail.order_update.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">₹{(partnerDetail.order_update * COST_PER_MESSAGE).toFixed(3)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <p className="text-xs text-gray-500">{CATEGORY_CONFIG['otp'].label}</p>
                    <p className="text-lg font-bold">{partnerDetail.otp.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">₹{(partnerDetail.otp * COST_PER_MESSAGE).toFixed(3)}</p>
                  </div>
                </div>

                {/* Recent messages */}
                <div>
                  <h4 className="font-semibold mb-2">Recent Messages</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phone</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partnerDetail.messages.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-gray-400">
                              No messages
                            </TableCell>
                          </TableRow>
                        ) : (
                          partnerDetail.messages.map((msg) => (
                            <TableRow key={msg.id}>
                              <TableCell className="font-mono text-sm">{msg.phone}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {CATEGORY_CONFIG[msg.category]?.label || msg.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {msg.template_name || '—'}
                              </TableCell>
                              <TableCell>
                                {msg.status === 'sent' ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">Sent</Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 text-xs">Failed</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {format(new Date(msg.created_at), 'dd MMM, hh:mm a')}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppAnalytics;
