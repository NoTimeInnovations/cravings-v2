"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  format,
  subDays,
  startOfMonth,
  startOfDay,
  endOfDay,
} from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Partner, useAuthStore } from "@/store/authStore";
import * as XLSX from "xlsx-js-style";
import { create } from "domain";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

const ITEMS_PER_PAGE = 5;

const OrderReport = () => {
  const { userData } = useAuthStore();
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  });
  const [activeTab, setActiveTab] = useState<"today" | "month" | "custom">(
    "today"
  );
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topItemsCurrentPage, setTopItemsCurrentPage] = useState(1);
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [paymentMethodOrders, setPaymentMethodOrders] = useState<any[]>([]);
  const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const TODAY_ORDERS_QUERY = (today: string) => `
    query TodayOrders {
      orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          sum {
            total_price
          }
          count
        }
      }
      delivery_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, type: {_eq: "delivery"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
        }
      }
      cash_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_eq: "cash"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      upi_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_eq: "upi"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      card_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_eq: "card"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      null_payment_orders: orders_aggregate(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, payment_method: {_is_null: true}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      orders_by_payment: orders(where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}, order_by: {created_at: desc}) {
        id
        display_id
        created_at
        total_price
        payment_method
        table_number
        table_name
        type
        delivery_address
        order_items {
          quantity
          menu {
            name
            price
          }
        }
      }
      top_items: order_items(where: {order: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}) {
        menu {
          name
          price
          category {
            name
          }
        }
        quantity
      }
      daily_sales: orders_aggregate(
        where: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}
        order_by: {created_at: asc}
      ) {
        nodes {
          total_price
          created_at
        }
      }
      category_stats: order_items(
        where: {order: {created_at: {_gte: "${today}T00:00:00Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}
      ) {
        menu {
          category {
            name
          }
          price
        }
        quantity
      }
    }
  `;

  const MONTHLY_ORDERS_QUERY = (startOfMonthDate: string, today: string) => `
    query MonthlyOrders {
      orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          sum {
            total_price
          }
          count
        }
      }
      delivery_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, type: {_eq: "delivery"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
        }
      }
      cash_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_eq: "cash"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      upi_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_eq: "upi"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      card_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_eq: "card"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      null_payment_orders: orders_aggregate(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, payment_method: {_is_null: true}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      orders_by_payment: orders(where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}, order_by: {created_at: desc}) {
        id
        display_id
        created_at
        total_price
        payment_method
        table_number
        table_name
        type
        delivery_address
        order_items {
          quantity
          menu {
            name
            price
          }
        }
      }
      top_items: order_items(where: {order: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}) {
        menu {
          name
          price
          category {
            name
          }
        }
        quantity
      }
      daily_sales: orders_aggregate(
        where: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}
        order_by: {created_at: asc}
      ) {
        nodes {
          total_price
          created_at
        }
      }
      category_stats: order_items(
        where: {order: {created_at: {_gte: "${startOfMonthDate}T00:00:00Z", _lte: "${today}T23:59:59Z"}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}
      ) {
        menu {
          category {
            name
          }
          price
        }
        quantity
      }
    }
  `;

  const CUSTOM_DATE_ORDERS_QUERY = `
    query CustomDateOrders($startDate: timestamptz!, $endDate: timestamptz!) {
      orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          sum {
            total_price
          }
          count
        }
      }
      delivery_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, type: {_eq: "delivery"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
        }
      }
      cash_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_eq: "cash"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      upi_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_eq: "upi"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      card_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_eq: "card"}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      null_payment_orders: orders_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, payment_method: {_is_null: true}, partner_id: {_eq: "${userData?.id}"}}) {
        aggregate {
          count
          sum {
            total_price
          }
        }
      }
      orders_by_payment: orders(where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}, order_by: {created_at: desc}) {
        id
        display_id
        created_at
        total_price
        payment_method
        table_number
        table_name
        type
        delivery_address
        order_items {
          quantity
          menu {
            name
            price
          }
        }
      }
      top_items: order_items(where: {order: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}) {
        menu {
          name
          price
          category {
            name
          }
        }
        quantity
      }
      daily_sales: orders_aggregate(
        where: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}
        order_by: {created_at: asc}
      ) {
        nodes {
          total_price
          created_at
        }
      }
      category_stats: order_items(
        where: {order: {created_at: {_gte: $startDate, _lte: $endDate}, status: {_eq: "completed"}, partner_id: {_eq: "${userData?.id}"}}}
      ) {
        menu {
          category {
            name
          }
          price
        }
        quantity
      }
    }
  `;

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setTopItemsCurrentPage(1);
    setCategoryCurrentPage(1);
    try {
      let result;
      const today = formatDate(new Date());
      const startOfMonthDate = formatDate(startOfMonth(new Date()));

      switch (activeTab) {
        case "today":
          result = await fetchFromHasura(TODAY_ORDERS_QUERY(today));
          break;
        case "month":
          result = await fetchFromHasura(
            MONTHLY_ORDERS_QUERY(startOfMonthDate, today)
          );
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

  useEffect(() => {
    if (reportData?.orders_by_payment) {
      setPaymentMethodOrders(reportData.orders_by_payment);
    }
  }, [reportData]);

  const handleUpdatePaymentMethod = async (orderId: string, paymentMethod: string) => {
    setUpdatingPayment(true);
    try {
      const mutation = `
        mutation UpdateOrderPayment($orderId: uuid!, $paymentMethod: String!) {
          update_orders_by_pk(
            pk_columns: { id: $orderId }
            _set: { payment_method: $paymentMethod }
          ) {
            id
            payment_method
          }
        }
      `;
      
      await fetchFromHasura(mutation, {
        orderId,
        paymentMethod,
      });

      // Refresh data
      await fetchData();
      setSelectedOrderForPayment(null);
    } catch (error) {
      console.error("Error updating payment method:", error);
    } finally {
      setUpdatingPayment(false);
    }
  };

  const groupOrdersByPaymentMethod = () => {
    const grouped: Record<string, any[]> = {
      cash: [],
      upi: [],
      card: [],
      null: [],
    };

    paymentMethodOrders.forEach((order: any) => {
      const method = order.payment_method || "null";
      if (grouped[method]) {
        grouped[method].push(order);
      }
    });

    return grouped;
  };

  const handleDateRangeChange = useCallback(
    (range: { startDate: Date; endDate: Date }) => {
      if (
        range.startDate.getTime() !== dateRange.startDate.getTime() ||
        range.endDate.getTime() !== dateRange.endDate.getTime()
      ) {
        setDateRange(range);
      }
    },
    [dateRange.startDate, dateRange.endDate]
  );

  const prepareChartData = () => {
    if (!reportData?.daily_sales?.nodes) return [];
    return reportData.daily_sales.nodes.map((order: any) => ({
      date: format(new Date(order.created_at), "MMM dd"),
      sales: order.total_price,
    }));
  };

  const prepareTopItemsData = useCallback(() => {
    if (!reportData?.top_items) return [];
    const itemMap = new Map<string, { quantity: number; category: string , revenue: number }>();
    reportData.top_items.forEach((item: any) => {
      const itemName = item.menu.name;
      const categoryName = item.menu.category.name;
      const existing = itemMap.get(itemName) || {
        quantity: 0,
        category: categoryName,
        revenue: 0,
      };
      itemMap.set(itemName, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.menu.price * item.quantity,
      });
    });
    const aggregatedItems = Array.from(itemMap.entries()).map(
      ([name, stats]) => ({
        name,
        quantity: stats.quantity,
        category: stats.category,
        revenue: stats.revenue,
      })
    );
    aggregatedItems.sort((a, b) => b.quantity - a.quantity);
    return aggregatedItems;
  }, [reportData]);

  const prepareCategoryData = useCallback(() => {
    if (!reportData?.category_stats) return [];
    const categoryMap = new Map<
      string,
      { quantity: number; revenue: number }
    >();
    reportData.category_stats.forEach((item: any) => {
      const categoryName = item.menu.category.name;
      const existing = categoryMap.get(categoryName) || {
        quantity: 0,
        revenue: 0,
      };
      categoryMap.set(categoryName, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.menu.price * item.quantity,
      });
    });
    return Array.from(categoryMap.entries()).map(([name, stats]) => ({
      name,
      quantity: stats.quantity,
      revenue: stats.revenue,
    }));
  }, [reportData]);

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

const handleDownloadXLSX = async () => {
    if (!reportData) return;
    setIsDownloading(true);

    const currencySymbol = (userData as Partner)?.currency || "₹";
    const currencyFormat = `${currencySymbol}#,##0.00`;

    const thinBorder = {
      top: { style: "thin", color: { rgb: "FFD3D3D3" } },
      bottom: { style: "thin", color: { rgb: "FFD3D3D3" } },
      left: { style: "thin", color: { rgb: "FFD3D3D3" } },
      right: { style: "thin", color: { rgb: "FFD3D3D3" } },
    };

    const titleStyle = {
      font: { bold: true, sz: 18, color: { rgb: "FF4F81BD" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
    const sectionHeaderStyle = {
      font: { bold: true, sz: 14 },
      fill: { fgColor: { rgb: "FFF2F2F2" } },
    };
    const tableHeaderStyle = {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: { fgColor: { rgb: "FF4F81BD" } },
      border: thinBorder,
      alignment: { horizontal: "center", vertical: "center" },
    };
    const tableCellStyle = { border: thinBorder };
    const summaryKeyStyle = { font: { bold: true } };

    const createCell = (value: any, style: any, type = "s", z?: string) => {
      const isNullOrUndefined = value === null || value === undefined;
      const cell: any = {
        v: isNullOrUndefined ? "N/A" : value,
        s: style,
        t: isNullOrUndefined ? "s" : type,
      };
      if (z && !isNullOrUndefined) {
        cell.z = z;
      }
      return cell;
    };

    const topItemsData = prepareTopItemsData();
    const allOrders = await prepareAllOrdersData();

    const ws_data = [
      [createCell("Order Analytics Report", titleStyle)],
      [],
      [createCell("Summary", sectionHeaderStyle)],
      [
        createCell("Report Period", { ...summaryKeyStyle, ...tableCellStyle }),
        createCell(
          `${format(
            activeTab === "today"
              ? startOfDay(new Date())
              : activeTab === "month"
              ? startOfMonth(new Date())
              : dateRange.startDate,
            "MMM dd, yyyy"
          )} - ${format(
            activeTab === "today" ? endOfDay(new Date()) : dateRange.endDate,
            "MMM dd, yyyy"
          )}`,
          tableCellStyle
        ),
      ],
      [
        createCell("Total Earnings", { ...summaryKeyStyle, ...tableCellStyle }),
        createCell(
          reportData.orders_aggregate?.aggregate?.sum?.total_price,
          tableCellStyle,
          "n",
          currencyFormat
        ),
      ],
      [
        createCell("Orders Completed", {
          ...summaryKeyStyle,
          ...tableCellStyle,
        }),
        createCell(
          reportData.orders_aggregate?.aggregate?.count,
          tableCellStyle,
          "n"
        ),
      ],
      [
        createCell("Deliveries", { ...summaryKeyStyle, ...tableCellStyle }),
        createCell(
          reportData.delivery_orders?.aggregate?.count,
          tableCellStyle,
          "n"
        ),
      ],
      [
        createCell("Average Order Value", {
          ...summaryKeyStyle,
          ...tableCellStyle,
        }),
        createCell(
          reportData.orders_aggregate?.aggregate?.count
            ? reportData.orders_aggregate.aggregate.sum.total_price /
                reportData.orders_aggregate.aggregate.count
            : 0,
          tableCellStyle,
          "n",
          currencyFormat
        ),
      ],
      [],
      [createCell("Payment Method Breakdown", sectionHeaderStyle)],
      [
        createCell("Cash Orders", { ...summaryKeyStyle, ...tableCellStyle }),
        createCell(
          reportData?.cash_orders?.aggregate?.count || 0,
          tableCellStyle,
          "n"
        ),
        createCell(
          reportData?.cash_orders?.aggregate?.sum?.total_price || 0,
          tableCellStyle,
          "n",
          currencyFormat
        ),
      ],
      [
        createCell("UPI Orders", { ...summaryKeyStyle, ...tableCellStyle }),
        createCell(
          reportData?.upi_orders?.aggregate?.count || 0,
          tableCellStyle,
          "n"
        ),
        createCell(
          reportData?.upi_orders?.aggregate?.sum?.total_price || 0,
          tableCellStyle,
          "n",
          currencyFormat
        ),
      ],
      [
        createCell("Card Orders", { ...summaryKeyStyle, ...tableCellStyle }),
        createCell(
          reportData?.card_orders?.aggregate?.count || 0,
          tableCellStyle,
          "n"
        ),
        createCell(
          reportData?.card_orders?.aggregate?.sum?.total_price || 0,
          tableCellStyle,
          "n",
          currencyFormat
        ),
      ],
      [
        createCell("Not Selected Orders", { ...summaryKeyStyle, ...tableCellStyle }),
        createCell(
          reportData?.null_payment_orders?.aggregate?.count || 0,
          tableCellStyle,
          "n"
        ),
        createCell(
          reportData?.null_payment_orders?.aggregate?.sum?.total_price || 0,
          tableCellStyle,
          "n",
          currencyFormat
        ),
      ],
      [],
      [createCell("Top Selling Items", sectionHeaderStyle)],
      [
        createCell("Item Name", tableHeaderStyle),
        createCell("Category", tableHeaderStyle),
        createCell("Quantity Sold", tableHeaderStyle),
        // createCell("Total Revenue", tableHeaderStyle),
      ],
      ...topItemsData.map((item: any) => [
        createCell(item.name, tableCellStyle),
        createCell(item.category, tableCellStyle),
        createCell(item.quantity, tableCellStyle),
        // createCell(item.revenue, tableCellStyle, "n", currencyFormat),
      ]),
      [],
      [createCell("All Orders", sectionHeaderStyle)],
      [
        createCell("Order ID", tableHeaderStyle),
        createCell("Order Display ID", tableHeaderStyle),
        createCell("Created At", tableHeaderStyle),
        createCell("Order Type", tableHeaderStyle),
        createCell("Table/Address", tableHeaderStyle),
        createCell("Items", tableHeaderStyle),
        createCell("Extra Charges", tableHeaderStyle),
        createCell("Payment Method", tableHeaderStyle),
        createCell("Status", tableHeaderStyle),
        createCell("Total Price", tableHeaderStyle)
      ],
      ...allOrders.map((order: any) => {
        const displayId = `${order.display_id} - ${format(
          new Date(order.created_at),
          "MMM dd"
        )}`;
        const createdAt = format(
          new Date(order.created_at),
          "MM/dd/yyyy - hh:mm a"
        );

        let orderType = "Takeaway";
        let location = "N/A";

        if (order.type === "delivery" && order.delivery_address) {
          orderType = "Delivery";
          location = order.delivery_address;
        } else if (order.table_name || order.table_number) {
          orderType = "Dine-in";
          location = `Table: ${order.table_name || order.table_number}`;
        }

        const itemsStr = order.order_items
          .map((item: any) => `${item.menu.name} (Qty: ${item.quantity})`)
          .join(", ");

        const extraChargeStr = order?.extra_charges?.map((charge: any) => {
          return `${charge.name} (${charge.amount})`;
        }).join(", ");

        const paymentMethod = order?.payment_method 
          ? order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)
          : "N/A";

        return [
          createCell(order.id, tableCellStyle),
          createCell(displayId, tableCellStyle),
          createCell(createdAt, tableCellStyle),
          createCell(orderType, tableCellStyle),
          createCell(location, tableCellStyle),
          createCell(itemsStr, tableCellStyle),
          createCell(extraChargeStr || "N/A", tableCellStyle),
          createCell(paymentMethod, tableCellStyle),
          createCell(order.status, tableCellStyle),
          order.status === "completed" ? createCell(order.total_price, tableCellStyle, "n", currencyFormat) : createCell("N/A", tableCellStyle)
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws["!merges"] = [
      XLSX.utils.decode_range("A1:D1"),
      XLSX.utils.decode_range(`A3:D3`),
      XLSX.utils.decode_range(`A10:D10`),
      XLSX.utils.decode_range(`A15:D15`),
      XLSX.utils.decode_range(
        `A${17 + topItemsData.length}:D${17 + topItemsData.length}`
      ),
    ];

    ws["!cols"] = [
      { wch: 38 }, // Order ID
      { wch: 20 }, // Order Display ID
      { wch: 25 }, // Created At
      { wch: 15 }, // Order Type
      { wch: 30 }, // Table/Address
      { wch: 50 }, // Items
      { wch: 20 }, // Extra Charges
      { wch: 15 }, // Payment Method
      { wch: 12 }, // Status
      { wch: 15 }, // Total Price
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order Report");
    XLSX.writeFile(
      wb,
      `Order_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
    );
    setIsDownloading(false);
  };

  const topItemsData = prepareTopItemsData();
  const topItemsTotalPages = Math.ceil(topItemsData.length / ITEMS_PER_PAGE);
  const paginatedTopItems = topItemsData.slice(
    (topItemsCurrentPage - 1) * ITEMS_PER_PAGE,
    topItemsCurrentPage * ITEMS_PER_PAGE
  );

  const categoryData = prepareCategoryData();
  const categoryTotalPages = Math.ceil(categoryData.length / ITEMS_PER_PAGE);
  const paginatedCategoryData = categoryData.slice(
    (categoryCurrentPage - 1) * ITEMS_PER_PAGE,
    categoryCurrentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = (totalPages: number, currentPage: number) => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage > 2) pages.push(1, "...");
      else pages.push(1);

      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }

      if (currentPage < totalPages - 1) pages.push("...", totalPages);
      else pages.push(totalPages);
    }
    return pages.filter((v, i, a) => a.indexOf(v) === i);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Order Analytics Dashboard</h1>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "today" | "month" | "custom")
        }
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="custom">Custom Range</TabsTrigger>
        </TabsList>

        {activeTab === "custom" && (
          <div className="mb-6">
            <DateRangePicker
              onUpdate={handleDateRangeChange}
              initialDateFrom={dateRange.startDate}
              initialDateTo={dateRange.endDate}
              align="start"
            />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Earnings
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {(userData as Partner)?.currency || "₹"}
              </span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold">
                  {(userData as Partner)?.currency || "₹"}
                  {reportData?.orders_aggregate?.aggregate?.sum?.total_price?.toFixed(
                    2
                  ) || "0.00"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Orders Completed
              </CardTitle>
              <span className="text-sm text-muted-foreground">#</span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold">
                  {reportData?.orders_aggregate?.aggregate?.count || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
              <span className="text-sm text-muted-foreground">#</span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold">
                  {reportData?.delivery_orders?.aggregate?.count || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Order Value
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {(userData as Partner)?.currency || "₹"}
              </span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold">
                  {reportData?.orders_aggregate?.aggregate?.count
                    ? `${(userData as Partner)?.currency || "₹"}${Math.round(
                        reportData.orders_aggregate.aggregate.sum.total_price /
                          reportData.orders_aggregate.aggregate.count
                      ).toFixed(2)}`
                    : `${(userData as Partner)?.currency || "₹"}0.00`}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Cash</div>
                  <div className="text-3xl font-bold">
                    {reportData?.cash_orders?.aggregate?.count || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">orders</div>
                  <div className="text-sm font-semibold text-green-600 mt-2">
                    {(userData as Partner)?.currency || "₹"}
                    {(reportData?.cash_orders?.aggregate?.sum?.total_price || 0).toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">UPI</div>
                  <div className="text-3xl font-bold">
                    {reportData?.upi_orders?.aggregate?.count || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">orders</div>
                  <div className="text-sm font-semibold text-green-600 mt-2">
                    {(userData as Partner)?.currency || "₹"}
                    {(reportData?.upi_orders?.aggregate?.sum?.total_price || 0).toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Card</div>
                  <div className="text-3xl font-bold">
                    {reportData?.card_orders?.aggregate?.count || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">orders</div>
                  <div className="text-sm font-semibold text-green-600 mt-2">
                    {(userData as Partner)?.currency || "₹"}
                    {(reportData?.card_orders?.aggregate?.sum?.total_price || 0).toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-orange-50">
                  <div className="text-sm text-muted-foreground mb-1">Not Selected</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {reportData?.null_payment_orders?.aggregate?.count || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">orders</div>
                  <div className="text-sm font-semibold text-orange-600 mt-2">
                    {(userData as Partner)?.currency || "₹"}
                    {(reportData?.null_payment_orders?.aggregate?.sum?.total_price || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Orders by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupOrdersByPaymentMethod()).map(
                  ([method, orders]) => {
                    const displayMethod =
                      method === "null"
                        ? "Not Selected"
                        : method.charAt(0).toUpperCase() + method.slice(1);
                    const isExpanded = expandedPaymentMethod === method;

                    return (
                      <Collapsible
                        key={method}
                        open={isExpanded}
                        onOpenChange={() =>
                          setExpandedPaymentMethod(
                            isExpanded ? null : method
                          )
                        }
                      >
                        <div
                          className={`border rounded-lg ${
                            method === "null" ? "border-orange-300" : ""
                          }`}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-4">
                                <span
                                  className={`font-semibold ${
                                    method === "null"
                                      ? "text-orange-600"
                                      : ""
                                  }`}
                                >
                                  {displayMethod}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  ({orders.length} orders)
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4">
                              {orders.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No orders found
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {orders.map((order: any) => {
                                    const orderType =
                                      order.type === "delivery"
                                        ? "Delivery"
                                        : order.table_name || order.table_number
                                        ? "Dine-in"
                                        : "Takeaway";
                                    const location =
                                      order.type === "delivery"
                                        ? order.delivery_address
                                        : order.table_name ||
                                          order.table_number
                                        ? `Table: ${
                                            order.table_name ||
                                            order.table_number
                                          }`
                                        : "N/A";

                                    return (
                                      <div
                                        key={order.id}
                                        className="border rounded-md p-3 bg-gray-50"
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <div>
                                            <div className="font-semibold">
                                              #{order.display_id}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {format(
                                                new Date(order.created_at),
                                                "MMM dd, yyyy - hh:mm a"
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="font-bold">
                                              {(userData as Partner)?.currency ||
                                                "₹"}
                                              {order.total_price.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {orderType}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-2">
                                          {location}
                                        </div>
                                        <div className="text-sm mb-2">
                                          <span className="font-medium">
                                            Items:{" "}
                                          </span>
                                          {order.order_items
                                            .map(
                                              (item: any) =>
                                                `${item.menu.name} (${item.quantity})`
                                            )
                                            .join(", ")}
                                        </div>
                                        {method === "null" && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="mt-2 w-full"
                                            onClick={() =>
                                              setSelectedOrderForPayment(order)
                                            }
                                          >
                                            Select Payment Method
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <TabsContent value={activeTab} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="sales"
                        name={`Sales (${
                          (userData as Partner)?.currency || "₹"
                        })`}
                        fill="#8884d8"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">
                            Quantity
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTopItems.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.name}
                            </TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right">
                              {item.quantity}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {topItemsTotalPages > 1 && (
                      <Pagination className="mt-4">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setTopItemsCurrentPage((prev) =>
                                  Math.max(prev - 1, 1)
                                );
                              }}
                              className={
                                topItemsCurrentPage === 1
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                          {getPageNumbers(
                            topItemsTotalPages,
                            topItemsCurrentPage
                          ).map((page, index) => (
                            <PaginationItem key={index}>
                              {typeof page === "number" ? (
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setTopItemsCurrentPage(page);
                                  }}
                                  isActive={topItemsCurrentPage === page}
                                >
                                  {page}
                                </PaginationLink>
                              ) : (
                                <span className="px-3 py-1">...</span>
                              )}
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setTopItemsCurrentPage((prev) =>
                                  Math.min(prev + 1, topItemsTotalPages)
                                );
                              }}
                              className={
                                topItemsCurrentPage === topItemsTotalPages
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Category-wise Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareCategoryData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        name={`Revenue (${
                          (userData as Partner)?.currency || "₹"
                        })`}
                        fill="#82ca9d"
                      />
                      <Bar
                        dataKey="quantity"
                        name="Quantity"
                        fill="#ffc658"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category-wise Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">
                            Quantity
                          </TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCategoryData.map(
                          (category: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {category.name}
                              </TableCell>
                              <TableCell className="text-right">
                                {category.quantity}
                              </TableCell>
                              <TableCell className="text-right">
                                {(userData as Partner)?.currency || "₹"}
                                {category.revenue.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                    {categoryTotalPages > 1 && (
                      <Pagination className="mt-4">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCategoryCurrentPage((prev) =>
                                  Math.max(prev - 1, 1)
                                );
                              }}
                              className={
                                categoryCurrentPage === 1
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                          {getPageNumbers(
                            categoryTotalPages,
                            categoryCurrentPage
                          ).map((page, index) => (
                            <PaginationItem key={index}>
                              {typeof page === "number" ? (
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCategoryCurrentPage(page);
                                  }}
                                  isActive={categoryCurrentPage === page}
                                >
                                  {page}
                                </PaginationLink>
                              ) : (
                                <span className="px-3 py-1">...</span>
                              )}
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCategoryCurrentPage((prev) =>
                                  Math.min(prev + 1, categoryTotalPages)
                                );
                              }}
                              className={
                                categoryCurrentPage === categoryTotalPages
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleDownloadXLSX}
          disabled={loading || isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Downloading..." : "Download Report"}
        </Button>
      </div>

      <Dialog
        open={!!selectedOrderForPayment}
        onOpenChange={(open) => !open && setSelectedOrderForPayment(null)}
      >
        <DialogContent className="z-[9999]">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
            <DialogDescription>
              Choose the payment method for Order #{selectedOrderForPayment?.display_id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() =>
                handleUpdatePaymentMethod(selectedOrderForPayment.id, "cash")
              }
              disabled={updatingPayment}
            >
              <span className="text-2xl">💵</span>
              <span>Cash</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() =>
                handleUpdatePaymentMethod(selectedOrderForPayment.id, "upi")
              }
              disabled={updatingPayment}
            >
              <span className="text-2xl">📱</span>
              <span>UPI</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() =>
                handleUpdatePaymentMethod(selectedOrderForPayment.id, "card")
              }
              disabled={updatingPayment}
            >
              <span className="text-2xl">💳</span>
              <span>Card</span>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSelectedOrderForPayment(null)}
              disabled={updatingPayment}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderReport;