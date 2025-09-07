'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import Analytics from '@/components/superAdmin/Analytics';
import { 
  BarChart as BarChartIcon,
  ArrowLeft,
  Users,
  Building,
  Scan,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
  ArrowDown,
  Calendar,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  PieChart as PieChartIcon,
  TrendingUp,
  LineChart as LineChartIcon
} from 'lucide-react';
import Link from 'next/link';
import { fetchFromHasura } from '@/lib/hasuraClient';
import { getTopQRCodes, getPartnerPerformance, getOrdersByDay } from '@/api/analytics';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, isBefore } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface QRCodeData {
  id: string;
  no_of_scans: number;
  partner_id: string;
  table_number?: number;
  partner: {
    name: string;
    phone: string;
  };
}

interface PartnerData {
  id: string;
  name: string;
  district?: string;
  phone?: string;
  qr_codes_aggregate: {
    aggregate: {
      sum: {
        no_of_scans: number;
      };
    };
  };
  orders_aggregate: {
    aggregate: {
      count: number;
      sum: {
        total_price: number;
      };
    };
  };
}

interface OrderData {
  id?: string;
  created_at: string;
  status: string;
  total_price: number;
}

type SortField = 'name' | 'scans' | 'orders' | 'avgOrderValue';

// Add type for date filter
type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// Chart colors
const CHART_COLORS = {
  orange: '#ff7849',
  green: '#00C49F',
  blue: '#0088FE',
  purple: '#8884d8',
  red: '#FF8042',
  yellow: '#FFBB28',
};

// Create a wide dialog content component that bypasses the width constraints with stable animation
const WideDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-100 ease-out"
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-[900px] max-w-[90vw] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg rounded-lg',
        'overflow-hidden', // Changed from overflow-y-auto to prevent layout shifts
        'transition-opacity duration-200 ease-out',
        className
      )}
      {...props}
    >
      <div className="overflow-y-auto max-h-[90vh]">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
WideDialogContent.displayName = "WideDialogContent";

const AnalyticsDashboard = () => {
  const [qrCodeData, setQrCodeData] = useState<QRCodeData[]>([]);
  const [partnerData, setPartnerData] = useState<PartnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [partnerCurrentPage, setPartnerCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPartners, setTotalPartners] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPartnerPages, setTotalPartnerPages] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [partnerPageSize, setPartnerPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [debouncedPartnerSearchTerm, setDebouncedPartnerSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerOrderData, setPartnerOrderData] = useState<OrderData[]>([]);
  const [partnerOrdersLoading, setPartnerOrdersLoading] = useState(false);
  const [partnerActiveTab, setPartnerActiveTab] = useState<'overview' | 'orders' | 'scans'>('overview');
  const [partnerDateRange, setPartnerDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [partnerDateFilter, setPartnerDateFilter] = useState<DateFilter>('month'); // Add separate date filter state for partner dialog
  const [partnerDatePickerOpen, setPartnerDatePickerOpen] = useState(false);
  
  // Add temporary state for the calendar selection
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>({
    from: partnerDateRange.startDate,
    to: partnerDateRange.endDate
  });
  
  // Ref to track if we need to fetch partner data
  const shouldFetchPartnerData = useRef(false);
  const currentPartnerId = useRef<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce partner search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPartnerSearchTerm(partnerSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [partnerSearchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Reset to first page when partner search term changes
  useEffect(() => {
    setPartnerCurrentPage(1);
  }, [debouncedPartnerSearchTerm]);
  
  // Update total pages when partner data or page size changes
  useEffect(() => {
    if (partnerData && partnerData.length > 0) {
      setTotalPartnerPages(Math.ceil(partnerData.length / partnerPageSize));
      setTotalPartners(partnerData.length);
    }
  }, [partnerData, partnerPageSize]);

  // Update date range based on selected filter
  const updateDateRange = (filter: DateFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start = new Date();
    const end = new Date();
    
    switch (filter) {
      case 'today':
        start = new Date(today);
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        break;
      case 'all':
        start = new Date(2020, 0, 1); // Set a far past date
        break;
      case 'custom':
        // Keep current start and end dates
        return;
    }
    
    setStartDate(start);
    setEndDate(end);
    setDateFilter(filter);
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (datePickerType === 'start') {
      setTempStartDate(date);
      setDatePickerType('end');
    } else {
      setTempEndDate(date);
      setCalendarOpen(false);
      
      // Ensure end date is after start date
      if (tempStartDate && date >= tempStartDate) {
        setStartDate(tempStartDate);
        setEndDate(date);
        setDateFilter('custom');
      } else {
        // If end date is before start date, swap them
        if (tempStartDate) {
          setStartDate(date);
          setEndDate(tempStartDate);
          setDateFilter('custom');
        }
      }
    }
  };
  
  const openDatePicker = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setDatePickerType('start');
    setCalendarOpen(true);
  };

  const fetchQRData = async (page: number, itemsPerPage: number, search: string) => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      const searchPattern = search ? `%${search}%` : '%';
      
      const result = await fetchFromHasura(getTopQRCodes, {
        limit: itemsPerPage,
        offset: offset,
        search: searchPattern
      });
      
      if (result && result.qr_codes) {
        setQrCodeData(result.qr_codes);
        
        // Get total count from aggregate
        if (result.qr_codes_aggregate?.aggregate?.count) {
          const totalCount = result.qr_codes_aggregate.aggregate.count;
          setTotalItems(totalCount);
          setTotalPages(Math.ceil(totalCount / itemsPerPage));
        }
      }
    } catch (error) {
      console.error('Error fetching QR code data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerData = async (search: string) => {
    try {
      setPartnerLoading(true);
      const searchPattern = search ? `%${search}%` : '%';
      
      const result = await fetchFromHasura(getPartnerPerformance, {
        limit: 500, // Fetch a large number to handle client-side pagination
        offset: 0,
        search: searchPattern,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (result && result.partners) {
        setPartnerData(result.partners);
        
        // Get total count from aggregate or use the length of the array
        const totalCount = result.partners_aggregate?.aggregate?.count || result.partners.length;
        setTotalPartners(totalCount);
        setTotalPartnerPages(Math.ceil(totalCount / partnerPageSize));
        
        // Reset to first page when data changes
        setPartnerCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching partner data:', error);
    } finally {
      setPartnerLoading(false);
    }
  };

  useEffect(() => {
    fetchQRData(currentPage, pageSize, debouncedSearchTerm);
  }, [currentPage, pageSize, debouncedSearchTerm]);
  
  useEffect(() => {
    fetchPartnerData(debouncedPartnerSearchTerm);
  }, [debouncedPartnerSearchTerm, startDate, endDate]);

  // Handle page changes
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value, 10);
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };
  
  // Handle partner pagination
  const handlePartnerPreviousPage = () => {
    if (partnerCurrentPage > 1) {
      setPartnerCurrentPage(partnerCurrentPage - 1);
    }
  };

  const handlePartnerNextPage = () => {
    if (partnerCurrentPage < totalPartnerPages) {
      setPartnerCurrentPage(partnerCurrentPage + 1);
    }
  };

  // Handle partner page size change
  const handlePartnerPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value, 10);
    setPartnerPageSize(newPageSize);
    setPartnerCurrentPage(1); // Reset to first page when changing page size
    
    // Update total pages based on the new page size
    setTotalPartnerPages(Math.ceil(totalPartners / newPageSize));
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle partner search input change
  const handlePartnerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPartnerSearchTerm(e.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  // Clear partner search
  const handleClearPartnerSearch = () => {
    setPartnerSearchTerm('');
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchQRData(currentPage, pageSize, debouncedSearchTerm);
  };
  
  // Handle partner refresh button click
  const handlePartnerRefresh = () => {
    fetchPartnerData(debouncedPartnerSearchTerm);
  };
  
  // Handle column sorting - only sets the sort field
  const handleSort = (field: SortField) => {
    setSortField(field);
  };
  
  // Get sort icon for column headers
  const getSortIcon = (field: SortField) => {
    if (sortField === field) {
      return <ArrowDown className="h-4 w-4 text-orange-500" aria-label="Sorted in descending order" />;
    }
    return null;
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      <span className="ml-2 text-gray-600">Loading data...</span>
    </div>
  );

  // Sort and paginate the data based on current sort field (always descending)
  const sortedAndPaginatedPartnerData = React.useMemo(() => {
    if (!partnerData || partnerData.length === 0) return [];
    
    // First sort all data (always descending order)
    const sorted = [...partnerData].sort((a, b) => {
      // Calculate metrics for partner A
      const aOrders = a.orders_aggregate?.aggregate?.count || 0;
      const aRevenue = a.orders_aggregate?.aggregate?.sum?.total_price || 0;
      const aScans = a.qr_codes_aggregate?.aggregate?.sum?.no_of_scans || 0;
      const aAvgOrder = aOrders > 0 ? aRevenue / aOrders : 0;
      
      // Calculate metrics for partner B
      const bOrders = b.orders_aggregate?.aggregate?.count || 0;
      const bRevenue = b.orders_aggregate?.aggregate?.sum?.total_price || 0;
      const bScans = b.qr_codes_aggregate?.aggregate?.sum?.no_of_scans || 0;
      const bAvgOrder = bOrders > 0 ? bRevenue / bOrders : 0;
      
      // Always sort in descending order for all fields
      switch (sortField) {
        case 'name':
          return b.name.localeCompare(a.name); // Descending alphabetical
        case 'scans':
          return bScans - aScans; // Highest scans first
        case 'orders':
          return bOrders - aOrders; // Highest orders first
        case 'avgOrderValue':
          return bAvgOrder - aAvgOrder; // Highest average order first
        default:
          return b.name.localeCompare(a.name); // Default to name descending
      }
    });
    
    // Then apply pagination
    const startIndex = (partnerCurrentPage - 1) * partnerPageSize;
    const endIndex = startIndex + partnerPageSize;
    return sorted.slice(startIndex, endIndex);
  }, [partnerData, sortField, partnerCurrentPage, partnerPageSize]);

  // Memoize the fetchPartnerOrderData function to avoid recreation on each render
  const fetchPartnerOrderData = useCallback(async (partnerId: string) => {
    if (!partnerId) return [];
    
    console.log("Fetching partner order data:", { 
      partnerId,
      startDate: partnerDateRange.startDate.toISOString(),
      endDate: partnerDateRange.endDate.toISOString()
    });
    
    setPartnerOrdersLoading(true);
    try {
      // Create fresh date objects to prevent caching issues
      const queryStartDate = new Date(partnerDateRange.startDate.getTime());
      const queryEndDate = new Date(partnerDateRange.endDate.getTime());
      
      const result = await fetchFromHasura(getOrdersByDay, {
        startDate: queryStartDate.toISOString(),
        endDate: queryEndDate.toISOString(),
        partnerId: partnerId
      });
      
      console.log(`Fetched ${result?.orders?.length || 0} orders for date range:`, {
        filter: partnerDateFilter,
        start: queryStartDate.toISOString(),
        end: queryEndDate.toISOString()
      });
      
      let orders: OrderData[] = [];
      if (result && result.orders) {
        // Force a fresh array to ensure state update
        orders = [...result.orders];
        await new Promise<void>(resolve => {
          setPartnerOrderData(orders);
          setTimeout(resolve, 0); // Ensure state is updated before continuing
        });
      } else {
        // Clear the data if no results
        await new Promise<void>(resolve => {
          setPartnerOrderData([]);
          setTimeout(resolve, 0); // Ensure state is updated before continuing
        });
      }
      return orders;
    } catch (error) {
      console.error('Error fetching partner order data:', error);
      // Clear data on error to ensure we don't show stale data
      await new Promise<void>(resolve => {
        setPartnerOrderData([]);
        setTimeout(resolve, 0); // Ensure state is updated before continuing
      });
      return [] as OrderData[];
    } finally {
      setPartnerOrdersLoading(false);
    }
  }, [partnerDateRange.startDate, partnerDateRange.endDate, partnerDateFilter]);

  // Handle partner date range change
  const handlePartnerDateRangeChange = useCallback((range: { startDate: Date; endDate: Date }) => {
    setPartnerDateRange(range);
    if (currentPartnerId.current) {
      shouldFetchPartnerData.current = true;
    }
  }, []);
  
  // Effect to fetch partner data when necessary
  useEffect(() => {
    // Only fetch data when modal is actually visible
    if (shouldFetchPartnerData.current && currentPartnerId.current && isPartnerModalOpen) {
      // Use a slight delay to ensure the dialog is fully rendered before data loading
      const timer = setTimeout(() => {
        fetchPartnerOrderData(currentPartnerId.current!)
          .finally(() => {
            shouldFetchPartnerData.current = false;
          });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [fetchPartnerOrderData, isPartnerModalOpen]);
  
  // Function to fetch partner metrics with time filter
  const fetchPartnerMetrics = useCallback(async (partnerId: string, forceRefresh = false) => {
    try {
      console.log("Fetching partner metrics with time filter:", { 
        startDate: partnerDateRange.startDate.toISOString(), 
        endDate: partnerDateRange.endDate.toISOString(),
        filter: partnerDateFilter
      });
      
      // Force a refetch of orders with the current date range
      if (partnerId && (forceRefresh || selectedPartner?.id === partnerId)) {
        // Always fetch fresh data when requested
        const orders = await fetchPartnerOrderData(partnerId);
        return orders.length > 0;
      }
    } catch (error) {
      console.error('Error fetching partner metrics:', error);
    }
    return false;
  }, [selectedPartner, partnerDateRange.startDate, partnerDateRange.endDate, partnerDateFilter, fetchPartnerOrderData]);

  // Handle opening partner modal
  const handlePartnerClick = useCallback((partner: PartnerData) => {
    // First set the partner date range to match the main table's date range
    setPartnerDateRange({
      startDate: new Date(startDate.getTime()),
      endDate: new Date(endDate.getTime())
    });
    
    // Also set the partner date filter to match the main date filter
    setPartnerDateFilter(dateFilter);
    
    // Pre-load the partner data before opening the dialog
    currentPartnerId.current = partner.id;
    shouldFetchPartnerData.current = true;
    setPartnerOrdersLoading(true);
    
    // Start data loading process before opening modal
    // Wait a small amount of time to ensure state updates have propagated
    setTimeout(() => {
      fetchPartnerOrderData(partner.id).then(() => {
        // Once data is fetched, set the selected partner
        setSelectedPartner(partner);
        
        // Then open the modal with a stable content size
        setIsPartnerModalOpen(true);
      }).finally(() => {
        setPartnerOrdersLoading(false);
      });
    }, 10);
  }, [startDate, endDate, dateFilter, fetchPartnerOrderData]);

  // Effect to cleanup when modal closes
  useEffect(() => {
    if (!isPartnerModalOpen) {
      currentPartnerId.current = null;
      shouldFetchPartnerData.current = false;
    }
  }, [isPartnerModalOpen]);

  // Prepare chart data for partner orders by day
  const preparePartnerOrderChartData = () => {
    if (!partnerOrderData || partnerOrderData.length === 0) return [];
    
    const dailyData: { [date: string]: { date: string, orders: number, revenue: number } } = {};
    
    partnerOrderData.forEach(order => {
      const orderDate = format(new Date(order.created_at), 'MMM dd');
      
      if (!dailyData[orderDate]) {
        dailyData[orderDate] = { date: orderDate, orders: 0, revenue: 0 };
      }
      
      dailyData[orderDate].orders++;
      dailyData[orderDate].revenue += order.total_price;
    });
    
    return Object.values(dailyData);
  };

  // Prepare chart data for order statuses
  const prepareOrderStatusChartData = () => {
    if (!partnerOrderData || partnerOrderData.length === 0) return [];
    
    const statusCounts: { [status: string]: number } = {
      completed: 0,
      pending: 0,
      cancelled: 0
    };
    
    partnerOrderData.forEach(order => {
      if (order.status in statusCounts) {
        statusCounts[order.status]++;
      }
    });
    
    return [
      { name: 'Completed', value: statusCounts.completed },
      { name: 'Pending', value: statusCounts.pending },
      { name: 'Cancelled', value: statusCounts.cancelled }
    ];
  };

  // Calculate hourly distribution of orders
  const prepareHourlyOrdersData = () => {
    if (!partnerOrderData || partnerOrderData.length === 0) return [];
    
    const hourlyData = Array(24).fill(0).map((_, i) => ({ 
      hour: i, 
      label: `${i}:00`,
      orders: 0 
    }));
    
    partnerOrderData.forEach(order => {
      const orderHour = new Date(order.created_at).getHours();
      hourlyData[orderHour].orders++;
    });
    
    return hourlyData;
  };

  // Date range filter component
  const DateRangeFilter = () => (
    <div className="flex flex-col md:flex-row items-center gap-2 mb-4">
      <div className="text-sm text-gray-500">Filter by:</div>
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={dateFilter === 'today' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => updateDateRange('today')}
        >
          Today
        </Button>
        <Button 
          variant={dateFilter === 'week' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => updateDateRange('week')}
        >
          Last 7 Days
        </Button>
        <Button 
          variant={dateFilter === 'month' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => updateDateRange('month')}
        >
          Last 30 Days
        </Button>
        <Button 
          variant={dateFilter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => updateDateRange('all')}
        >
          All Time
        </Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant={dateFilter === 'custom' ? 'default' : 'outline'} 
              size="sm" 
              onClick={openDatePicker}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {dateFilter === 'custom' 
                ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
                : 'Custom Range'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <div className="p-3">
              <div className="text-center mb-2 font-medium">
                {datePickerType === 'start' ? 'Select Start Date' : 'Select End Date'}
              </div>
              <CalendarComponent
                mode="single"
                selected={datePickerType === 'start' ? tempStartDate : tempEndDate}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  if (datePickerType === 'end' && tempStartDate) {
                    // Disable dates before start date when selecting end date
                    return date < tempStartDate;
                  }
                  return false;
                }}
                initialFocus
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  // Handle partner date range selection
  const handlePartnerDateRangeSelect = useCallback(async (range: DateRange | undefined) => {
    if (range?.from) {
      // Set loading state immediately to show feedback
      setPartnerOrdersLoading(true);
      
      try {
        console.log('Custom date range selected:', range);
        
        // Update the partner date filter state to custom first
        setPartnerDateFilter('custom');
        
        // Set from date to beginning of day
        const startDate = new Date(range.from);
        startDate.setHours(0, 0, 0, 0);
        
        // Set to date to end of day - if no 'to' date is selected, use the from date
        const endDate = range.to ? new Date(range.to) : new Date(range.from);
        endDate.setHours(23, 59, 59, 999);
        
        // Force a completely new date range object to ensure React detects the change
        const newDateRange = {
          startDate: new Date(startDate.getTime()),
          endDate: new Date(endDate.getTime())
        };
        
        console.log("Setting custom date range:", {
          startDate: newDateRange.startDate.toISOString(),
          endDate: newDateRange.endDate.toISOString()
        });
        
        // Update the date range state with the new object
        setPartnerDateRange(newDateRange);
        
        // Close the date picker dialog
        setPartnerDatePickerOpen(false);
        
        // Always refetch data regardless of current filter
        if (currentPartnerId.current) {
          // Wait a small amount of time to ensure state updates have propagated
          await new Promise(resolve => setTimeout(resolve, 10));
          await fetchPartnerOrderData(currentPartnerId.current);
        }
      } catch (err) {
        console.error('Error in handlePartnerDateRangeSelect:', err);
      } finally {
        setPartnerOrdersLoading(false);
      }
    }
  }, [fetchPartnerOrderData]);

  // Handle partner date range selection for specific preset ranges
  const handlePartnerPresetRange = useCallback(async (range: 'today' | 'week' | 'month' | 'all') => {
    console.log(`Changing partner filter to: ${range} (previous: ${partnerDateFilter})`);
    
    // Always set loading state immediately to show feedback
    setPartnerOrdersLoading(true);
    
    try {
      // Update the partner date filter state first
      setPartnerDateFilter(range);
      
      const today = new Date();
      let startDate;
      const endDate = new Date();
      // Set time to end of day
      endDate.setHours(23, 59, 59, 999);
      
      switch (range) {
        case 'today':
          startDate = new Date(today);
          // Set time to beginning of day
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(today.getDate() - 7);
          // Set time to beginning of day
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date();
          startDate.setDate(today.getDate() - 30);
          // Set time to beginning of day
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'all':
          startDate = new Date(2020, 0, 1); // Far past date
          break;
      }
      
      // Force a completely new date range object to ensure React detects the change
      const newDateRange = {
        startDate: new Date(startDate.getTime()),
        endDate: new Date(endDate.getTime())
      };
      
      console.log("Setting new date range:", {
        filter: range,
        startDate: newDateRange.startDate.toISOString(),
        endDate: newDateRange.endDate.toISOString()
      });
      
      // Update date range state with the new object
      setPartnerDateRange(newDateRange);
      
      // Always refetch data regardless of current filter
      if (currentPartnerId.current) {
        // Force a direct refresh of partner data with the new range
        // Wait a small amount of time to ensure state updates have propagated
        await new Promise(resolve => setTimeout(resolve, 10));
        await fetchPartnerOrderData(currentPartnerId.current);
      }
    } catch (err) {
      console.error('Error in handlePartnerPresetRange:', err);
    } finally {
      setPartnerOrdersLoading(false);
    }
  }, [fetchPartnerOrderData]);

  // Partner Modal Component
  const PartnerModal = React.memo(() => {
    if (!selectedPartner) return null;

    // All metrics are calculated from the filtered order data
    // This ensures all metrics respect the time filter
    const totalOrders = partnerOrderData.length;
    const totalRevenue = partnerOrderData.reduce((sum, order) => sum + order.total_price, 0);
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';

    const completedOrders = partnerOrderData.filter(order => order.status === 'completed').length;
    const pendingOrders = partnerOrderData.filter(order => order.status === 'pending').length;
    const cancelledOrders = partnerOrderData.filter(order => order.status === 'cancelled').length;
    
    // Calculate the number of unique dates with orders to estimate number of scans
    const uniqueDatesWithOrders = new Set(
      partnerOrderData.map(order => new Date(order.created_at).toDateString())
    ).size;
    
    // Use the unique dates as an estimate for scans (at least 1 scan per day with orders)
    const totalScans = Math.max(uniqueDatesWithOrders, totalOrders > 0 ? 1 : 0);
    
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : '0';

    const orderStatusData = prepareOrderStatusChartData();
    const ordersByDayData = preparePartnerOrderChartData();
    const hourlyOrdersData = prepareHourlyOrdersData();

    // Use a stable handler for the dialog's onOpenChange
    const handleOpenChange = React.useCallback((open: boolean) => {
      setIsPartnerModalOpen(open);
    }, []);

    // Define responsive but stable dimensions with min/max constraints
    const dialogContentClass = "w-[90vw] md:w-[80vw] lg:w-[900px] h-[80vh] min-h-[600px]";

    // Create a unique key based on the current filter and date range to force re-renders
    const dialogKey = `${partnerDateFilter}-${partnerDateRange.startDate.getTime()}-${partnerDateRange.endDate.getTime()}`;

    return (
      <Dialog 
        open={isPartnerModalOpen} 
        onOpenChange={handleOpenChange}
        key={dialogKey}
      >
        <WideDialogContent className={dialogContentClass}>
          <div className="p-6 h-full" key={`content-${dialogKey}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <DialogTitle className="text-2xl font-bold mb-1">{selectedPartner.name}</DialogTitle>
                <DialogDescription className="text-gray-500 text-sm">
                  Partner Performance Details
                </DialogDescription>
              </div>
              
              <div className="text-right">
                <div className="flex items-center justify-end mb-1 text-gray-600">
                  <Phone className="h-4 w-4 mr-1" />
                  <span>{selectedPartner.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-end text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{selectedPartner.district || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            {/* Date Range Filters */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Filter by:</div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={partnerDateFilter === 'today' ? 'default' : 'outline'} 
                  size="default"
                  onClick={() => handlePartnerPresetRange('today')}
                  className="min-w-[100px]"
                  disabled={partnerOrdersLoading}
                >
                  {partnerDateFilter === 'today' && partnerOrdersLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Today</span>
                    </div>
                  ) : (
                    'Today'
                  )}
                </Button>
                <Button 
                  variant={partnerDateFilter === 'week' ? 'default' : 'outline'} 
                  size="default"
                  onClick={() => handlePartnerPresetRange('week')}
                  className="min-w-[100px]"
                  disabled={partnerOrdersLoading}
                >
                  {partnerDateFilter === 'week' && partnerOrdersLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Last 7 Days</span>
                    </div>
                  ) : (
                    'Last 7 Days'
                  )}
                </Button>
                <Button 
                  variant={partnerDateFilter === 'month' ? 'default' : 'outline'} 
                  size="default"
                  onClick={() => handlePartnerPresetRange('month')}
                  className="min-w-[100px]"
                  disabled={partnerOrdersLoading}
                >
                  {partnerDateFilter === 'month' && partnerOrdersLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Last 30 Days</span>
                    </div>
                  ) : (
                    'Last 30 Days'
                  )}
                </Button>
                <Button 
                  variant={partnerDateFilter === 'all' ? 'default' : 'outline'} 
                  size="default"
                  onClick={() => handlePartnerPresetRange('all')}
                  className="min-w-[100px]"
                  disabled={partnerOrdersLoading}
                >
                  {partnerDateFilter === 'all' && partnerOrdersLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>All Time</span>
                    </div>
                  ) : (
                    'All Time'
                  )}
                </Button>
                <Button 
                  variant={partnerDateFilter === 'custom' ? 'default' : 'outline'} 
                  size="default"
                  onClick={() => setPartnerDatePickerOpen(true)}
                  className="flex items-center min-w-[140px]"
                  disabled={partnerOrdersLoading}
                >
                  {partnerDateFilter === 'custom' && partnerOrdersLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      {partnerDateFilter === 'custom' 
                        ? `${format(partnerDateRange.startDate, 'MMM d')} - ${format(partnerDateRange.endDate, 'MMM d')}`
                        : 'Custom Range'}
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Add a separate Dialog for the date picker */}
            <Dialog open={partnerDatePickerOpen} onOpenChange={(open) => {
              if (open) {
                // When opening, initialize the temp date range with the current date range
                setTempDateRange({
                  from: partnerDateRange.startDate,
                  to: partnerDateRange.endDate
                });
              }
              setPartnerDatePickerOpen(open);
            }}>
              <DialogContent className="p-0 sm:max-w-[425px]">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>Select Date Range</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <CalendarComponent
                    mode="range"
                    defaultMonth={partnerDateRange.startDate}
                    selected={tempDateRange}
                    onSelect={setTempDateRange}
                    numberOfMonths={1}
                    disabled={(date) => isBefore(date, new Date('2000-01-01'))}
                    initialFocus
                  />
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setPartnerDatePickerOpen(false)}
                      className="mr-2"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (currentPartnerId.current && tempDateRange?.from) {
                          handlePartnerDateRangeSelect(tempDateRange);
                        } else {
                          setPartnerDatePickerOpen(false);
                        }
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Key Metrics */}
            <div className="relative grid grid-cols-6 gap-4 mb-6">
              {/* Loading overlay */}
              {partnerOrdersLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md z-10">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-2" />
                    <span className="text-sm text-gray-600">Updating metrics...</span>
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Scans</div>
                <div className="text-3xl font-semibold">{totalScans}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Orders</div>
                <div className="text-3xl font-semibold">{totalOrders}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Avg Order</div>
                <div className="text-3xl font-semibold">₹{avgOrderValue}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Revenue</div>
                <div className="text-3xl font-semibold">₹{totalRevenue.toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Success</div>
                <div className="text-3xl font-semibold">{completionRate}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Cancelled</div>
                <div className="text-3xl font-semibold">{cancelledOrders}</div>
              </div>
            </div>
            
            {/* Completed Orders List */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-4 text-lg">Orders</h3>
              
              {partnerOrdersLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin mr-2" />
                  <span>Loading orders...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left font-medium text-gray-500">Order ID</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">Date & Time</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">Price</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {partnerOrderData.length > 0 ? (
                        partnerOrderData.map((order, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              {order.id && order.id.substring(0, 7)}
                            </td>
                            <td className="py-3 px-4">
                              {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="py-3 px-4">₹{order.total_price.toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            No orders found in the selected time period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </WideDialogContent>
      </Dialog>
    );
  });

  return (
    <main className="px-3 py-5 sm:px-[7.5%] bg-[#FFF7EC] min-h-screen">
      <div className="mb-6">
        <Link href="/superadmin" className="flex items-center text-orange-600 mb-4 hover:underline">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl lg:text-4xl font-bold">App Analytics</h1>
        </div>
      </div>
      
      {/* Include the Analytics component */}
      <Analytics />
      
      {/* Include the partner modal with key that changes when date filter changes */}
      <PartnerModal key={`partner-modal-${partnerDateFilter}-${partnerDateRange.startDate.getTime()}-${partnerDateRange.endDate.getTime()}`} />
      
      {/* Additional Data Tables Section */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Partner Performance</h3>
            <div className="flex items-center">
              {partnerLoading && (
                <div className="flex items-center mr-4">
                  <Loader2 className="h-4 w-4 text-orange-500 animate-spin mr-1" />
                  <span className="text-xs text-gray-500">Refreshing...</span>
                </div>
              )}
              <button 
                onClick={handlePartnerRefresh} 
                className="text-sm text-orange-600 mr-4 hover:underline flex items-center"
                disabled={partnerLoading}
              >
                <Loader2 className={`h-4 w-4 mr-1 ${partnerLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="text-sm text-orange-600 hover:underline">Export CSV</button>
            </div>
          </div>
          
          <DateRangeFilter />
          
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by partner name..."
                value={partnerSearchTerm}
                onChange={handlePartnerSearchChange}
                className="pl-10 pr-10 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {partnerSearchTerm && (
                <button
                  onClick={handleClearPartnerSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                    title="Click to sort by partner name (Z-A)"
                  >
                    <div className="flex items-center justify-start gap-1">
                      <span>Partner</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('scans')}
                    title="Click to sort by highest scan count first"
                  >
                    <div className="flex items-center justify-start gap-1">
                      <span>Total Scans</span>
                      {getSortIcon('scans')}
                    </div>
                  </th>
                  <th 
                    className="py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('orders')}
                    title="Click to sort by highest order count first"
                  >
                    <div className="flex items-center justify-start gap-1">
                      <span>Orders</span>
                      {getSortIcon('orders')}
                    </div>
                  </th>
                  <th 
                    className="py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('avgOrderValue')}
                    title="Click to sort by highest average order value first"
                  >
                    <div className="flex items-center justify-start gap-1">
                      <span>Avg Order Value</span>
                      {getSortIcon('avgOrderValue')}
                    </div>
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {partnerLoading && partnerData.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : partnerData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-center">
                      {debouncedPartnerSearchTerm ? (
                        <div className="flex flex-col items-center py-6">
                          <Search className="h-8 w-8 text-gray-400 mb-2" />
                          <p>No partners found for "<span className="font-medium">{debouncedPartnerSearchTerm}</span>"</p>
                          <button 
                            onClick={handleClearPartnerSearch} 
                            className="mt-2 text-sm text-orange-600 hover:underline"
                          >
                            Clear search
                          </button>
                        </div>
                      ) : (
                        'No partner data available'
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedAndPaginatedPartnerData.map((partner) => {
                    // Calculate average order value
                    const totalOrders = partner.orders_aggregate?.aggregate?.count || 0;
                    const totalRevenue = partner.orders_aggregate?.aggregate?.sum?.total_price || 0;
                    const avgOrderValue = totalOrders > 0 
                      ? (totalRevenue / totalOrders).toFixed(2) 
                      : '0.00';
                    
                    // Get total scans
                    const totalScans = partner.qr_codes_aggregate?.aggregate?.sum?.no_of_scans || 0;
                  
                  return (
                    <tr key={partner.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <Building size={16} />
                          </div>
                          <button
                            onClick={() => handlePartnerClick(partner)}
                            className="text-blue-600 hover:underline text-left"
                          >
                            {partner.name}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{totalScans}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{totalOrders}</td>
                      <td className="py-3 px-4 whitespace-nowrap">₹{avgOrderValue}</td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        totalOrders > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {totalOrders > 0 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {!partnerLoading && partnerData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-4 gap-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(partnerCurrentPage - 1) * partnerPageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(partnerCurrentPage * partnerPageSize, totalPartners)}
                  </span>{' '}
                  of <span className="font-medium">{totalPartners}</span> results
                  {debouncedPartnerSearchTerm && (
                    <span className="ml-1">
                      for "<span className="font-medium">{debouncedPartnerSearchTerm}</span>"
                      <button 
                        onClick={handleClearPartnerSearch} 
                        className="ml-2 text-orange-600 hover:underline"
                      >
                        Clear
                      </button>
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <label htmlFor="partnerPageSize" className="mr-2 text-sm text-gray-600">
                      Show:
                    </label>
                    <select
                      id="partnerPageSize"
                      value={partnerPageSize}
                      onChange={handlePartnerPageSizeChange}
                      className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePartnerPreviousPage}
                      disabled={partnerCurrentPage === 1 || partnerLoading}
                      className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md ${
                        partnerCurrentPage === 1 || partnerLoading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft size={16} className="mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={handlePartnerNextPage}
                      disabled={partnerCurrentPage === totalPartnerPages || partnerLoading}
                      className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md ${
                        partnerCurrentPage === totalPartnerPages || partnerLoading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                      <ChevronRight size={16} className="ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent User Activity</h3>
            <button className="text-sm text-orange-600">Export CSV</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity Type</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="hover:bg-gray-50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <Users size={16} />
                        </div>
                        <span>User {item}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {['Scan', 'Order', 'Profile Update', 'Login', 'Registration'][item % 5]}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item % 2 === 0 ? `Partner ${item}` : '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      $$.$$.$$ | $$:$$
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item % 2 === 0 ? 'iOS' : 'Android'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        
        <Card className="p-4 border-2 border-[#ffba79]/20 bg-[#fffefd]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">QR Code Scan Statistics</h3>
            <div className="flex items-center">
              {loading && (
                <div className="flex items-center mr-4">
                  <Loader2 className="h-4 w-4 text-orange-500 animate-spin mr-1" />
                  <span className="text-xs text-gray-500">Refreshing...</span>
                </div>
              )}
              <button 
                onClick={handleRefresh} 
                className="text-sm text-orange-600 mr-4 hover:underline flex items-center"
                disabled={loading}
              >
                <Loader2 className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="text-sm text-orange-600 hover:underline">Export CSV</button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by partner name..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-10 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR ID</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table Number</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Scans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && qrCodeData.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : qrCodeData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-4 text-center">
                      {debouncedSearchTerm ? (
                        <div className="flex flex-col items-center py-6">
                          <Search className="h-8 w-8 text-gray-400 mb-2" />
                          <p>No QR codes found for "<span className="font-medium">{debouncedSearchTerm}</span>"</p>
                          <button 
                            onClick={handleClearSearch} 
                            className="mt-2 text-sm text-orange-600 hover:underline"
                          >
                            Clear search
                          </button>
                        </div>
                      ) : (
                        'No QR code data available'
                      )}
                    </td>
                  </tr>
                ) : (
                  qrCodeData.map((qr) => (
                    <tr key={qr.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <Building size={16} />
                          </div>
                          <span>{qr.partner.name || 'Unknown Partner'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{qr.id.substring(0, 7)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{qr.table_number || 'N/A'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{qr.no_of_scans}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {!loading && qrCodeData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-4 gap-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{totalItems}</span> results
                  {debouncedSearchTerm && (
                    <span className="ml-1">
                      for "<span className="font-medium">{debouncedSearchTerm}</span>"
                      <button 
                        onClick={handleClearSearch} 
                        className="ml-2 text-orange-600 hover:underline"
                      >
                        Clear
                      </button>
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <label htmlFor="pageSize" className="mr-2 text-sm text-gray-600">
                      Show:
                    </label>
                    <select
                      id="pageSize"
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1 || loading}
                      className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md ${
                        currentPage === 1 || loading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft size={16} className="mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages || loading}
                      className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md ${
                        currentPage === totalPages || loading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                      <ChevronRight size={16} className="ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
};

export default AnalyticsDashboard; 