'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Building,
  Scan,
  Activity,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { fetchFromHasura } from '@/lib/hasuraClient';
import { Progress } from '@/components/ui/progress';
import { getOrderStatusMetrics, getQRScanMetrics } from '@/api/analytics';
import { format, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';

// Define a constant object for time range options
const TIME_RANGES = {
  TODAY: 'today',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_90_DAYS: 'last_90_days',
  THIS_YEAR: 'this_year',
  ALL_TIME: 'all_time',
  CUSTOM: 'custom'
} as const;

type TimeRangeType = typeof TIME_RANGES[keyof typeof TIME_RANGES];

type DateRange = {
  startDate: Date;
  endDate: Date;
};

// Helper function to calculate date range that doesn't depend on component state
const getDateRangeFromType = (rangeType: TimeRangeType, customRange: DateRange = { startDate: new Date(), endDate: new Date() }): DateRange => {
  const today = new Date();
  
  switch (rangeType) {
    case TIME_RANGES.TODAY:
      return {
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      };
    case TIME_RANGES.LAST_7_DAYS:
      return {
        startDate: subDays(today, 7),
        endDate: endOfDay(today)
      };
    case TIME_RANGES.LAST_30_DAYS:
      return {
        startDate: subDays(today, 30),
        endDate: endOfDay(today)
      };
    case TIME_RANGES.LAST_90_DAYS:
      return {
        startDate: subDays(today, 90),
        endDate: endOfDay(today)
      };
    case TIME_RANGES.THIS_YEAR:
      return {
        startDate: new Date(today.getFullYear(), 0, 1), // January 1st of current year
        endDate: endOfDay(today)
      };
    case TIME_RANGES.ALL_TIME:
      return {
        startDate: new Date('2000-01-01'),
        endDate: endOfDay(today)
      };
    case TIME_RANGES.CUSTOM:
      return customRange;
    default:
      return {
        startDate: subDays(today, 7),
        endDate: endOfDay(today)
      };
  }
};

interface OrderStats {
  cancelled: number;
  completed: number;
  pending: number;
  total: number;
  totalAmount: number;
}

interface ScanStats {
  totalScans: number;
}

const Analytics = () => {
  const [timeRange, setTimeRange] = useState<TimeRangeType>(TIME_RANGES.TODAY);
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [orderStats, setOrderStats] = useState<OrderStats>({
    cancelled: 0,
    completed: 0,
    pending: 0,
    total: 0,
    totalAmount: 0
  });
  const [scanStats, setScanStats] = useState<ScanStats>({
    totalScans: 0
  });
  const [loading, setLoading] = useState(false);
  
  // Use a ref to track if we need to fetch data
  const shouldFetch = useRef(true);
  
  // Use a ref to store the current date range to avoid unnecessary fetches
  const currentFetchParams = useRef({
    timeRange,
    startDate: customDateRange.startDate,
    endDate: customDateRange.endDate
  });

  // Fetch QR scan metrics (independent of date range)
  useEffect(() => {
    const fetchScanStats = async () => {
      try {
        const scanResult = await fetchFromHasura(getQRScanMetrics, {});
        
        if (scanResult && scanResult.total_scans) {
          setScanStats({
            totalScans: scanResult.total_scans.aggregate.sum?.no_of_scans || 0
          });
        }
      } catch (error) {
        console.error('Error fetching QR scan stats:', error);
      }
    };
    
    fetchScanStats();
  }, []);

  // Effect to fetch order data
  useEffect(() => {
    // Skip if we don't need to fetch
    if (!shouldFetch.current) {
      shouldFetch.current = true;
      return;
    }
    
    // Check if we actually need to fetch new data
    const dateRange = getDateRangeFromType(timeRange, customDateRange);
    
    // If nothing changed, don't fetch
    if (
      currentFetchParams.current.timeRange === timeRange &&
      currentFetchParams.current.startDate.getTime() === dateRange.startDate.getTime() &&
      currentFetchParams.current.endDate.getTime() === dateRange.endDate.getTime()
    ) {
      return;
    }
    
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        const formattedStartDate = format(dateRange.startDate, "yyyy-MM-dd'T'00:00:00'Z'");
        const formattedEndDate = format(dateRange.endDate, "yyyy-MM-dd'T'23:59:59'Z'");
        
        // Fetch order stats
        const orderResult = await fetchFromHasura(getOrderStatusMetrics, {
          startDate: formattedStartDate,
          endDate: formattedEndDate
        });
        
        if (orderResult) {
          setOrderStats({
            cancelled: orderResult.cancelled.aggregate.count || 0,
            completed: orderResult.completed.aggregate.count || 0,
            pending: orderResult.pending.aggregate.count || 0,
            total: orderResult.total.aggregate.count || 0,
            totalAmount: orderResult.total.aggregate.sum?.total_price || 0
          });
        }
        
        // Update the current fetch parameters
        currentFetchParams.current = {
          timeRange,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        };
      } catch (error) {
        console.error('Error fetching order stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderData();
  }, [timeRange, customDateRange]);

  // Calculate percentages
  const totalOrders = orderStats.total;
  const completedPercentage = totalOrders > 0 ? Math.round((orderStats.completed / totalOrders) * 100) : 0;
  const pendingPercentage = totalOrders > 0 ? Math.round((orderStats.pending / totalOrders) * 100) : 0;
  const cancelledPercentage = totalOrders > 0 ? Math.round((orderStats.cancelled / totalOrders) * 100) : 0;

  // Handle time range selection
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value as TimeRangeType);
  };
  
  // Handle date range update from DateRangePicker
  const handleCustomDateChange = (range: DateRange) => {
    // Prevent unnecessary state updates
    if (
      range.startDate.getTime() === customDateRange.startDate.getTime() &&
      range.endDate.getTime() === customDateRange.endDate.getTime()
    ) {
      return;
    }
    
    // Set flag to avoid unnecessary fetches
    shouldFetch.current = true;
    
    // Update state
    setCustomDateRange(range);
    
    // Only update timeRange if needed
    if (timeRange !== TIME_RANGES.CUSTOM) {
      setTimeRange(TIME_RANGES.CUSTOM);
    }
  };

  return (
    <div>
      {/* Date Range Filters */}
      <div className="mb-6 flex flex-row justify-between items-center">
        <h3 className="text-lg font-semibold">Orders Analytics</h3>
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Traffic</p>
              <h3 className="text-2xl font-bold">$$.$$</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Activity size={24} className="text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">New Users</p>
              <h3 className="text-2xl font-bold">$$.$$</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Users size={24} className="text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">No. of Orders</p>
              <h3 className="text-2xl font-bold">{loading ? "..." : orderStats.total}</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <ShoppingBag size={24} className="text-purple-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Order Value</p>
              <h3 className="text-2xl font-bold">₹{loading ? "..." : orderStats.totalAmount.toFixed(2)}</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <DollarSign size={24} className="text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Order Status Cards */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Order Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Completed Orders</p>
                <h3 className="text-2xl font-bold">{loading ? "..." : orderStats.completed}</h3>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
            <Progress value={completedPercentage} className="h-2 bg-gray-200" />
            <p className="text-xs text-gray-500 mt-2">{completedPercentage}% of total orders</p>
          </Card>
          
          <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <h3 className="text-2xl font-bold">{loading ? "..." : orderStats.pending}</h3>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock size={24} className="text-yellow-600" />
              </div>
            </div>
            <Progress value={pendingPercentage} className="h-2 bg-gray-200" />
            <p className="text-xs text-gray-500 mt-2">{pendingPercentage}% of total orders</p>
          </Card>
          
          <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Cancelled Orders</p>
                <h3 className="text-2xl font-bold">{loading ? "..." : orderStats.cancelled}</h3>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
            <Progress value={cancelledPercentage} className="h-2 bg-gray-200" />
            <p className="text-xs text-gray-500 mt-2">{cancelledPercentage}% of total orders</p>
          </Card>
        </div>
      </div>

      {/* Second Row of KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Partners</p>
              <h3 className="text-2xl font-bold">$$.$$</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Building size={24} className="text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Partners Created Per Day</p>
              <h3 className="text-2xl font-bold">$$.$$</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Building size={24} className="text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Per Hotel Scan</p>
              <h3 className="text-2xl font-bold">$$.$$</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Scan size={24} className="text-purple-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Scans</p>
              <h3 className="text-2xl font-bold">{loading ? "..." : scanStats.totalScans}</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <Scan size={24} className="text-orange-600" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Active Users Card (Marked as Least Priority) */}
      <div className="mb-6">
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd] relative">
          <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl">
            Least Priority
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <h3 className="text-2xl font-bold">$$.$$</h3>
              <p className="text-xs text-green-500">+$$.$$% from last period</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100">
              <Users size={24} className="text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Traffic & User Trends</h3>
            <TrendingUp size={18} className="text-orange-600" />
          </div>
          
          <div className="h-[250px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="flex flex-col items-center text-gray-500">
              <BarChart size={48} />
              <p className="mt-2">Traffic & User Chart Placeholder</p>
              <p className="text-xs">(Will be populated with actual data later)</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order & Scan Statistics</h3>
            <BarChart size={18} className="text-orange-600" />
          </div>
          
          <div className="h-[250px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="flex flex-col items-center text-gray-500">
              <BarChart size={48} />
              <p className="mt-2">Order & Scan Chart Placeholder</p>
              <p className="text-xs">(Will be populated with actual data later)</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics; 