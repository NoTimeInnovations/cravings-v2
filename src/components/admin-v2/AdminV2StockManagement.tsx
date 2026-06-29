"use client";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { revalidateTag } from "@/app/actions/revalidate";

type StockMenuItem = {
  name: string;
  id: string;
  is_available: boolean;
  stocks: {
    id: string;
    stock_quantity: number;
    stock_type: "STATIC" | "AUTO";
    show_stock: boolean;
  }[];
};

type FilterOption = "all" | "outOfStock";

// admin-v2 Stock Management — mirrors the standalone /admin/stock-management
// screen (same data model + GraphQL ops) but lives inside the admin-v2 shell and
// is gated on the `stockmanagement` feature flag.
export function AdminV2StockManagement() {
  const { userData } = useAuthStore();
  const [menuItems, setMenuItems] = useState<StockMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    originalValue: number;
    currentValue: number;
  } | null>(null);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<
    "AVAILABLE" | "UNAVAILABLE" | "STATIC" | "AUTO" | "SHOW_STOCK" | "HIDE_STOCK"
  >("AVAILABLE");

  useEffect(() => {
    if (userData?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchFromHasura(
        `query GetMenuWithStocks($partner_id: uuid!) {
          menu(where: {partner_id: {_eq: $partner_id}, deletion_status: {_eq: 0}}) {
            id
            name
            is_available
            stocks {
              id
              stock_quantity
              stock_type
              show_stock
            }
          }
        }`,
        { partner_id: userData?.id }
      );

      const items: StockMenuItem[] = response?.menu || [];

      // Auto-provision a default stock row (9999 / STATIC / hidden) for any item
      // that doesn't have one yet — every read below assumes stocks[0] exists.
      const itemsNeedingStocks = items.filter((item) => item.stocks.length === 0);
      if (itemsNeedingStocks.length > 0) {
        await createMissingStocks(itemsNeedingStocks);
        await fetchData();
      } else {
        setMenuItems(items);
        setSelectedItems([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createMissingStocks = async (items: StockMenuItem[]) => {
    try {
      await fetchFromHasura(
        `mutation CreateStocks($objects: [stocks_insert_input!]!) {
          insert_stocks(objects: $objects) {
            affected_rows
          }
        }`,
        {
          objects: items.map((item) => ({
            menu_id: item.id,
            stock_type: "STATIC",
            stock_quantity: 9999,
            show_stock: false,
          })),
        }
      );
      revalidateTag(userData?.id as string);
    } catch (error) {
      console.error("Error creating stocks:", error);
    }
  };

  const updateStockType = async (
    stockId: string,
    newType: "STATIC" | "AUTO",
    menuItemId: string
  ) => {
    try {
      setIsUpdating(true);
      setMenuItems((prevItems) =>
        prevItems.map((item) =>
          item.id === menuItemId
            ? {
                ...item,
                stocks: item.stocks.map((stock) =>
                  stock.id === stockId ? { ...stock, stock_type: newType } : stock
                ),
              }
            : item
        )
      );
      await fetchFromHasura(
        `mutation UpdateStockType($stockId: uuid!, $stockType: String!) {
          update_stocks_by_pk(pk_columns: {id: $stockId}, _set: {stock_type: $stockType}) {
            id
          }
        }`,
        { stockId, stockType: newType }
      );
      revalidateTag(userData?.id as string);
    } catch (error) {
      console.error("Error updating stock type:", error);
      fetchData();
    } finally {
      setIsUpdating(false);
    }
  };

  const updateShowStock = async (
    stockId: string,
    showStock: boolean,
    menuItemId: string
  ) => {
    try {
      setIsUpdating(true);
      setMenuItems((prevItems) =>
        prevItems.map((item) =>
          item.id === menuItemId
            ? {
                ...item,
                stocks: item.stocks.map((stock) =>
                  stock.id === stockId ? { ...stock, show_stock: showStock } : stock
                ),
              }
            : item
        )
      );
      await fetchFromHasura(
        `mutation UpdateShowStock($stockId: uuid!, $showStock: Boolean!) {
          update_stocks_by_pk(pk_columns: {id: $stockId}, _set: {show_stock: $showStock}) {
            id
          }
        }`,
        { stockId, showStock }
      );
      revalidateTag(userData?.id as string);
    } catch (error) {
      console.error("Error updating show_stock:", error);
      fetchData();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuantityChange = (itemId: string, stockId: string, value: number) => {
    if (!editingItem || editingItem.id !== stockId) {
      const originalValue =
        menuItems.find((item) => item.id === itemId)?.stocks?.[0]?.stock_quantity || 0;
      setEditingItem({ id: stockId, originalValue, currentValue: value });
    } else {
      setEditingItem({ ...editingItem, currentValue: value });
    }
  };

  const cancelEdit = () => setEditingItem(null);

  const saveQuantity = async (itemId: string, stockId: string) => {
    if (!editingItem) return;
    const newQty = editingItem.currentValue;
    const prevStock = editingItem.originalValue ?? 0;
    try {
      setIsUpdating(true);
      const current = menuItems.find((i) => i.id === itemId);
      const currentlyAvailable = current?.is_available !== false;
      // Re-enable ONLY an item that ran out (was <= 0 and currently off) when it's
      // restocked, and auto-disable when the partner zeroes an available item.
      // This mirrors the order-time auto-disable invariant without silently
      // turning items back on that the partner disabled on purpose while in stock.
      const reEnable = newQty > 0 && !currentlyAvailable && prevStock <= 0;
      const autoDisable = newQty <= 0 && currentlyAvailable;
      const nextAvailable = reEnable ? true : autoDisable ? false : current?.is_available ?? true;
      setMenuItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_available: nextAvailable,
                stocks: item.stocks.map((stock) =>
                  stock.id === stockId ? { ...stock, stock_quantity: newQty } : stock
                ),
              }
            : item
        )
      );
      await fetchFromHasura(
        `mutation UpdateStockQuantity($stockId: uuid!, $quantity: numeric!) {
          update_stocks_by_pk(pk_columns: {id: $stockId}, _set: {stock_quantity: $quantity}) {
            id
          }
        }`,
        { stockId, quantity: newQty }
      );
      if (reEnable || autoDisable) {
        await fetchFromHasura(
          `mutation SetMenuItemAvailability($id: uuid!, $isAvailable: Boolean!) {
            update_menu_by_pk(pk_columns: {id: $id}, _set: {is_available: $isAvailable}) { id }
          }`,
          { id: itemId, isAvailable: reEnable }
        );
      }
      revalidateTag(userData?.id as string);
    } catch (error) {
      console.error("Error updating stock quantity:", error);
      fetchData();
    } finally {
      setEditingItem(null);
      setIsUpdating(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item) => item.id));
    }
  };

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) return;
    try {
      setIsUpdating(true);
      setMenuItems((prevItems) =>
        prevItems.map((item) => {
          if (!selectedItems.includes(item.id)) return item;
          if (bulkAction === "AVAILABLE" || bulkAction === "UNAVAILABLE") {
            return { ...item, is_available: bulkAction === "AVAILABLE" };
          }
          if (bulkAction === "STATIC" || bulkAction === "AUTO") {
            return {
              ...item,
              stocks: item.stocks.map((stock) => ({ ...stock, stock_type: bulkAction })),
            };
          }
          if (bulkAction === "SHOW_STOCK" || bulkAction === "HIDE_STOCK") {
            return {
              ...item,
              stocks: item.stocks.map((stock) => ({
                ...stock,
                show_stock: bulkAction === "SHOW_STOCK",
              })),
            };
          }
          return item;
        })
      );

      if (bulkAction === "AVAILABLE" || bulkAction === "UNAVAILABLE") {
        await fetchFromHasura(
          `mutation UpdateMenuAvailability($ids: [uuid!]!, $isAvailable: Boolean!) {
            update_menu(where: {id: {_in: $ids}}, _set: {is_available: $isAvailable}) { affected_rows }
          }`,
          { ids: selectedItems, isAvailable: bulkAction === "AVAILABLE" }
        );
      } else if (bulkAction === "STATIC" || bulkAction === "AUTO") {
        await fetchFromHasura(
          `mutation UpdateBulkStockType($ids: [uuid!]!, $stockType: String!) {
            update_stocks(where: {menu_id: {_in: $ids}}, _set: {stock_type: $stockType}) { affected_rows }
          }`,
          { ids: selectedItems, stockType: bulkAction }
        );
      } else if (bulkAction === "SHOW_STOCK" || bulkAction === "HIDE_STOCK") {
        await fetchFromHasura(
          `mutation UpdateBulkShowStock($ids: [uuid!]!, $showStock: Boolean!) {
            update_stocks(where: {menu_id: {_in: $ids}}, _set: {show_stock: $showStock}) { affected_rows }
          }`,
          { ids: selectedItems, showStock: bulkAction === "SHOW_STOCK" }
        );
      }

      setSelectedItems([]);
      revalidateTag(userData?.id as string);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      fetchData();
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const qty = item.stocks?.[0]?.stock_quantity ?? 9999;
    const matchesStockFilter = filter === "all" || qty <= 0;
    return matchesSearch && matchesStockFilter;
  });

  const sortedItems =
    filter === "all"
      ? [...filteredItems].sort((a, b) => {
          const aOut = (a.stocks?.[0]?.stock_quantity ?? 9999) <= 0;
          const bOut = (b.stocks?.[0]?.stock_quantity ?? 9999) <= 0;
          return aOut === bOut ? 0 : aOut ? -1 : 1;
        })
      : filteredItems;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-40">
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Stock Management</h2>
          <p className="text-muted-foreground">
            Set stock counts per item. When an item runs out it&apos;s turned off
            automatically; stock resets to 9999 each day.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              className="pl-10 w-full sm:w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={filter}
            onValueChange={(value: FilterOption) => setFilter(value)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="outOfStock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isUpdating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex flex-col gap-4 rounded-md bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {selectedItems.length} item(s) selected
            </div>
            <Select value={bulkAction} onValueChange={(v: any) => setBulkAction(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Bulk action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Mark Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Mark Unavailable</SelectItem>
                <SelectItem value="STATIC">Set Type to Static</SelectItem>
                <SelectItem value="AUTO">Set Type to Auto</SelectItem>
                <SelectItem value="SHOW_STOCK">Show Stock</SelectItem>
                <SelectItem value="HIDE_STOCK">Hide Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleBulkAction} disabled={isUpdating}>
              Apply
            </Button>
            <Button variant="outline" onClick={() => setSelectedItems([])} disabled={isUpdating}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    selectedItems.length > 0 &&
                    selectedItems.length === filteredItems.length
                  }
                  onCheckedChange={toggleSelectAll}
                  disabled={isUpdating}
                />
              </TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock Available</TableHead>
              <TableHead>Stock Type</TableHead>
              <TableHead>Show Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => {
              const stock = item.stocks?.[0];
              if (!stock) return null;
              const isOutOfStock = stock.stock_quantity <= 0;
              const isEditing = editingItem?.id === stock.id;
              const isSelected = selectedItems.includes(item.id);

              return (
                <TableRow
                  key={item.id}
                  className={isOutOfStock ? "bg-red-50 hover:bg-red-50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      disabled={isUpdating}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className={isOutOfStock ? "text-red-600" : ""}>{item.name}</span>
                    {!item.is_available && (
                      <span className="ml-2 text-xs text-gray-500">(Unavailable)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={isEditing ? editingItem.currentValue : stock.stock_quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.id, stock.id, parseInt(e.target.value) || 0)
                        }
                        className={`w-24 ${isOutOfStock ? "border-red-300 bg-red-100" : ""}`}
                        disabled={isUpdating && !isEditing}
                      />
                      {isEditing && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveQuantity(item.id, stock.id)}
                            disabled={isUpdating}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isUpdating}>
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={stock.stock_type}
                      onValueChange={(value) =>
                        updateStockType(stock.id, value as "STATIC" | "AUTO", item.id)
                      }
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTO">Auto</SelectItem>
                        <SelectItem value="STATIC">Static</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={stock.show_stock ? "SHOW" : "HIDE"}
                      onValueChange={(value) =>
                        updateShowStock(stock.id, value === "SHOW", item.id)
                      }
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SHOW">Show</SelectItem>
                        <SelectItem value="HIDE">Hide</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default AdminV2StockManagement;
