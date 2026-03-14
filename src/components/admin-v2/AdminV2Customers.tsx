"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore, Partner } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";
import { formatPrice } from "@/lib/constants";

interface CustomerData {
  phone: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
}

const getCustomerOrdersQuery = `
  query GetCustomerOrders($partner_id: uuid!) {
    orders(
      where: { partner_id: { _eq: $partner_id }, status: { _neq: "cancelled" } }
      order_by: { created_at: desc }
    ) {
      phone
      orderedby
      total_price
      created_at
      user_id
      user {
        full_name
        phone
      }
    }
  }
`;

export function AdminV2Customers() {
  const { userData } = useAuthStore();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const partner = userData as Partner;
  const currency = partner?.currency || "₹";

  useEffect(() => {
    if (!userData?.id) return;

    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFromHasura(getCustomerOrdersQuery, {
          partner_id: userData.id,
        });

        const orders = result?.orders || [];
        const customerMap = new Map<string, CustomerData>();

        for (const order of orders) {
          // Use user_id as primary key for unique customers, fall back to phone
          const customerPhone = order.user?.phone || order.phone || "";
          const customerName = order.user?.full_name || "";
          const key = order.user_id || customerPhone || "unknown";
          const existing = customerMap.get(key);

          if (existing) {
            existing.totalOrders += 1;
            existing.totalSpent += order.total_price || 0;
            // Update name if we didn't have one before
            if (!existing.name && customerName) {
              existing.name = customerName;
            }
            // Update phone if we didn't have one before
            if (
              (!existing.phone || existing.phone === "N/A") &&
              customerPhone
            ) {
              existing.phone = customerPhone;
            }
          } else {
            customerMap.set(key, {
              phone: customerPhone || "N/A",
              name: customerName,
              totalOrders: 1,
              totalSpent: order.total_price || 0,
              lastOrderDate: order.created_at,
            });
          }
        }

        const sorted = Array.from(customerMap.values()).sort(
          (a, b) => b.totalOrders - a.totalOrders,
        );
        setCustomers(sorted);
      } catch (error) {
        console.error("Failed to fetch customer data:", error);
        toast.error("Failed to load customer data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [userData?.id]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.phone.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [customers, searchQuery]);

  const handleDownload = async () => {
    if (customers.length === 0) {
      toast.error("No customer data to download");
      return;
    }

    setIsDownloading(true);
    try {
      const headerStyle = {
        font: { bold: true, sz: 12, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4472C4" } },
        alignment: { horizontal: "center" as const },
        border: {
          top: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          bottom: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          left: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          right: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
        },
      };

      const cellStyle = {
        border: {
          top: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          bottom: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          left: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          right: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
        },
      };

      const wsData: any[][] = [
        [
          { v: "Phone", s: headerStyle },
          { v: "Name", s: headerStyle },
          { v: "Total Orders", s: headerStyle },
          { v: `Total Spent (${currency})`, s: headerStyle },
          { v: "Last Order", s: headerStyle },
        ],
        ...customers.map((c) => [
          { v: c.phone, s: cellStyle },
          { v: c.name || "N/A", s: cellStyle },
          { v: c.totalOrders, s: cellStyle },
          {
            v: c.totalSpent,
            s: { ...cellStyle, numFmt: `${currency}#,##0.00` },
          },
          {
            v: new Date(c.lastOrderDate).toLocaleDateString(),
            s: cellStyle,
          },
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 18 },
        { wch: 25 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customers");

      const timestamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(
        wb,
        `Customers_${partner?.store_name || "Report"}_${timestamp}.xlsx`,
      );
      toast.success("Customer data downloaded!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download customer data");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} unique customer
            {customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by phone or name..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isDownloading ? "" : "Download"}
          </Button>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery
              ? "No customers match your search."
              : "No customer data yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Phone</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="hidden md:table-cell">
                  Last Order
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer, i) => (
                <TableRow key={`${customer.phone}-${i}`}>
                  <TableCell className="font-mono text-sm">
                    {customer.phone}
                  </TableCell>
                  <TableCell>{customer.name || "N/A"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {customer.totalOrders}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {currency}
                    {formatPrice(customer.totalSpent, userData?.id)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
