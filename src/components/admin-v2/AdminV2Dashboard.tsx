"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  format,
  subDays,
  startOfMonth,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, IndianRupee, ShoppingBag, Truck, TrendingUp, Download } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Partner, useAuthStore } from "@/store/authStore";
import { downloadOrderReport } from "@/utils/downloadOrderReport";

const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

export function AdminV2Dashboard() {
  const { userData } = useAuthStore();
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  });
  const [activeTab, setActiveTab] = useState<"today" | "month" | "custom">("today");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const TODAY_ORDERS_QUERY = (today: string) => `
    query TodayOrders {
      orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          sum { total_price }
          count
        }
      }
      delivery_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, type: {_eq: "delivery"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate { count }
      }
      cash_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_eq: "cash"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      upi_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_eq: "upi"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      card_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_eq: "card"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      null_payment_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_is_null: true}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      daily_sales: orders_aggregate(
        where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}
        order_by: {created_at: asc}
      ) {
        nodes { total_price, created_at }
      }
      top_items: order_items(where: {order: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}) {
        menu { name, price, category { name } }
        quantity
      }
    }
  `;

  const MONTHLY_ORDERS_QUERY = (startOfMonthDate: string, today: string) => `
    query MonthlyOrders {
      orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          sum { total_price }
          count
        }
      }
      delivery_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, type: {_eq: "delivery"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate { count }
      }
      cash_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_eq: "cash"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      upi_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_eq: "upi"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      card_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_eq: "card"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      null_payment_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_is_null: true}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      daily_sales: orders_aggregate(
        where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}
        order_by: {created_at: asc}
      ) {
        nodes { total_price, created_at }
      }
      top_items: order_items(where: {order: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}) {
        menu { name, price, category { name } }
        quantity
      }
    }
  `;

  const CUSTOM_DATE_ORDERS_QUERY = `
    query CustomDateOrders($startDate: timestamptz!, $endDate: timestamptz!) {
      orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          sum { total_price }
          count
        }
      }
      delivery_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, type: {_eq: "delivery"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate { count }
      }
      cash_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_eq: "cash"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      upi_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_eq: "upi"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      card_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_eq: "card"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      null_payment_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_is_null: true}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum { total_price }
        }
      }
      daily_sales: orders_aggregate(
        where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}
        order_by: {created_at: asc}
      ) {
        nodes { total_price, created_at }
      }
      top_items: order_items(where: {order: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}) {
        menu { name, price, category { name } }
        quantity
      }
    }
  `;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let result;
      const today = formatDate(new Date());
      const startOfMonthDate = formatDate(startOfMonth(new Date()));

      switch (activeTab) {
        case "today":
          result = await fetchFromHasura(TODAY_ORDERS_QUERY(today));
          break;
        case "month":
          result = await fetchFromHasura(MONTHLY_ORDERS_QUERY(startOfMonthDate, today));
          break;
        case "custom":
          result = await fetchFromHasura(CUSTOM_DATE_ORDERS_QUERY, {
            startDate: format(dateRange.startDate, "yyyy-MM-dd'T'00:00:00'Z'"),
            endDate: format(dateRange.endDate, "yyyy-MM-dd'T'23:59:59'Z'"),
          });
          break;
      }
      setReportData(result);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange.startDate, dateRange.endDate, userData?.id]);

  useEffect(() => {
    if (userData) {
      fetchData();
    }
  }, [fetchData, userData]);

  const handleDateRangeUpdate = useCallback((range: { startDate: Date; endDate: Date }) => {
    setDateRange({ startDate: range.startDate, endDate: range.endDate });
  }, []);

  const prepareChartData = () => {
    if (!reportData?.daily_sales?.nodes) return [];
    // Group by date if needed, or just map if already aggregated (though query returns individual orders, so we might need to aggregate locally if the query doesn't do it)
    // The original query returns individual orders in 'nodes'. We should aggregate them by date or hour depending on the view.
    // For simplicity, let's just map them for now, but ideally we should group.

    // Simple aggregation by date
    const grouped = reportData.daily_sales.nodes.reduce((acc: any, order: any) => {
      const date = format(new Date(order.created_at), "MMM dd");
      acc[date] = (acc[date] || 0) + order.total_price;
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, sales]) => ({
      date,
      sales,
    }));
  };

  const prepareTopItemsData = () => {
    if (!reportData?.top_items) return [];
    const itemMap = new Map<string, { quantity: number; category: string; revenue: number }>();
    reportData.top_items.forEach((item: any) => {
      const itemName = item.menu.name;
      const categoryName = item.menu.category.name;
      const existing = itemMap.get(itemName) || { quantity: 0, category: categoryName, revenue: 0 };
      itemMap.set(itemName, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.menu.price * item.quantity,
      });
    });
    return Array.from(itemMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const chartData = prepareChartData();
  const topItems = prepareTopItemsData();
  const totalEarnings = reportData?.orders_aggregate?.aggregate?.sum?.total_price || 0;
  const totalOrders = reportData?.orders_aggregate?.aggregate?.count || 0;
  const totalDeliveries = reportData?.delivery_orders?.aggregate?.count || 0;
  const avgOrderValue = totalOrders ? totalEarnings / totalOrders : 0;

  const allOrdersIn = `
    query AllOrders($startDate: timestamptz!, $endDate: timestamptz!, $userId: uuid!) {
      orders(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: $userId}}, order_by: {created_at: desc}) {
        id
        created_at
        total_price
        table_number
        delivery_address
        extra_charges
        display_id
        status
        table_name
        type
        payment_method
        order_items {
          id
          quantity
          menu {
            name
            price
          }
        }
      }
    }
  `;

  const prepareAllOrdersData = async () => {
    try {
      let start;
      let end;

      if (activeTab === "today") {
        start = format(startOfDay(new Date()), "yyyy-MM-dd'T'00:00:00'Z'");
        end = format(endOfDay(new Date()), "yyyy-MM-dd'T'23:59:59'Z'");
      } else if (activeTab === "month") {
        start = format(startOfMonth(new Date()), "yyyy-MM-dd'T'00:00:00'Z'");
        end = format(new Date(), "yyyy-MM-dd'T'23:59:59'Z'");
      } else {
        start = format(dateRange.startDate, "yyyy-MM-dd'T'00:00:00'Z'");
        end = format(dateRange.endDate, "yyyy-MM-dd'T'23:59:59'Z'");
      }

      const { orders } = await fetchFromHasura(allOrdersIn, {
        startDate: start,
        endDate: end,
        userId: userData?.id,
      });
      return orders;
    } catch (err) {
      console.error("Error preparing all orders data:", err);
      return [];
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        {activeTab === "custom" && (
          <DateRangePicker
            initialDateFrom={dateRange.startDate}
            initialDateTo={dateRange.endDate}
            onUpdate={handleDateRangeUpdate}
          />
        )}
        <div className="w-full sm:w-auto">
          <Button
            onClick={async () => {
              setIsDownloading(true);
              const allOrders = await prepareAllOrdersData();
              await downloadOrderReport(reportData, topItems, activeTab, dateRange, userData as Partner, allOrders);
              setIsDownloading(false);
            }}
            disabled={loading || isDownloading}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download Report"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'today' ? 'For today' : activeTab === 'month' ? 'This month' : 'Selected period'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Completed orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Delivery orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{avgOrderValue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Payment Analysis</CardTitle>
            <CardDescription>
              Breakdown of orders by payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  label: "Cash",
                  count: reportData?.cash_orders?.aggregate?.count || 0,
                  amount: reportData?.cash_orders?.aggregate?.sum?.total_price || 0,
                  color: "bg-green-500"
                },
                {
                  label: "UPI",
                  count: reportData?.upi_orders?.aggregate?.count || 0,
                  amount: reportData?.upi_orders?.aggregate?.sum?.total_price || 0,
                  color: "bg-blue-500"
                },
                {
                  label: "Card",
                  count: reportData?.card_orders?.aggregate?.count || 0,
                  amount: reportData?.card_orders?.aggregate?.sum?.total_price || 0,
                  color: "bg-purple-500"
                },
                {
                  label: "Not Selected",
                  count: reportData?.null_payment_orders?.aggregate?.count || 0,
                  amount: reportData?.null_payment_orders?.aggregate?.sum?.total_price || 0,
                  color: "bg-gray-500"
                }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${item.color}`} />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.count} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{item.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalEarnings > 0 ? ((item.amount / totalEarnings) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>
              Most popular items for this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {topItems.map((item: any, index: number) => (
                <div key={index} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.category}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    {item.quantity} sold
                  </div>
                </div>
              ))}
              {topItems.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'black' }}
              />
              <Bar
                dataKey="sales"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div >
  );
}
