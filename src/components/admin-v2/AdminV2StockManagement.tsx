"use client";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState, useRef, useMemo } from "react";
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
import {
  RefreshCw,
  Check,
  X,
  Search,
  Boxes,
  PackageX,
  PackageCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
// import { Switch } from "@/components/ui/switch"; // TEMP: hidden with the show-count toggle
import { Badge } from "@/components/ui/badge";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAdminStore } from "@/store/adminStore";
import { useMenuStore } from "@/store/menuStore_hasura";

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

  const activeView = useAdminStore((s) => s.activeView);
  const hasLoadedRef = useRef(false);

  // Auto-refresh: load on first mount AND every time the user navigates back to
  // this screen. admin-v2 keeps screens mounted (no unmount on tab switch), so a
  // mount-only effect would leave stale stock until a manual Refresh — re-running
  // whenever this view becomes active keeps the counts live.
  useEffect(() => {
    if (activeView === "Stock Management" && userData?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, userData?.id]);

  const fetchData = async () => {
    // Full skeleton only on the very first load; later refreshes (manual or the
    // on-activate auto-refresh) just spin the Refresh button so the table doesn't
    // flicker out from under the user.
    const initialLoad = !hasLoadedRef.current;
    try {
      if (initialLoad) setLoading(true);
      else setIsUpdating(true);
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
        hasLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setIsUpdating(false);
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

  /* TEMP: Type (STATIC/AUTO) + Show-count controls hidden for now.
     Re-enable these two handlers together with the render helpers and UI below.
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
  */

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
    try {
      setIsUpdating(true);
      const current = menuItems.find((i) => i.id === itemId);
      const currentlyAvailable = current?.is_available !== false;
      // Stock drives availability: any positive stock re-enables a currently-off
      // item, and zeroing the stock always disables the item.
      const reEnable = newQty > 0 && !currentlyAvailable;
      const autoDisable = newQty <= 0;
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
        // Keep the shared menu store (Availability manager, etc.) in step so it
        // doesn't show stale availability until a reload.
        useMenuStore.getState().patchAvailabilityLocal([itemId], reEnable);
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
        // Keep the shared menu store in step for the bulk availability change.
        useMenuStore
          .getState()
          .patchAvailabilityLocal(selectedItems, bulkAction === "AVAILABLE");
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

  const totalCount = menuItems.length;
  const outOfStockCount = useMemo(
    () =>
      menuItems.filter((i) => (i.stocks?.[0]?.stock_quantity ?? 9999) <= 0).length,
    [menuItems]
  );
  const inStockCount = totalCount - outOfStockCount;
  const allFilteredSelected =
    filteredItems.length > 0 && selectedItems.length === filteredItems.length;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-16 w-32 rounded-xl" />
          <Skeleton className="h-16 w-32 rounded-xl" />
          <Skeleton className="h-16 w-32 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-2.5 rounded-xl border bg-white p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="hidden h-9 w-28 rounded-md sm:block" />
              <Skeleton className="hidden h-9 w-24 rounded-md sm:block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Per-item controls, shared between the desktop table and the mobile cards.
  const renderQtyEditor = (
    item: StockMenuItem,
    stock: StockMenuItem["stocks"][0]
  ) => {
    const isEditing = editingItem?.id === stock.id;
    const isOutOfStock = stock.stock_quantity <= 0;
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={isEditing ? editingItem!.currentValue : stock.stock_quantity}
          onChange={(e) =>
            handleQuantityChange(item.id, stock.id, parseInt(e.target.value) || 0)
          }
          className={`h-9 w-24 ${
            isOutOfStock
              ? "border-red-300 bg-red-50 text-red-700 focus-visible:ring-red-400"
              : ""
          }`}
          disabled={isUpdating && !isEditing}
        />
        {isEditing && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={() => saveQuantity(item.id, stock.id)}
              disabled={isUpdating}
              title="Save"
            >
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 border-red-200 bg-red-50 hover:bg-red-100"
              onClick={cancelEdit}
              disabled={isUpdating}
              title="Cancel"
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  /* TEMP: Type + Show-count render helpers hidden for now (re-enable with the handlers above).
  const renderTypeSelect = (
    item: StockMenuItem,
    stock: StockMenuItem["stocks"][0]
  ) => (
    <Select
      value={stock.stock_type}
      onValueChange={(value) =>
        updateStockType(stock.id, value as "STATIC" | "AUTO", item.id)
      }
      disabled={isUpdating}
    >
      <SelectTrigger className="h-9 w-[120px] bg-white">
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="AUTO">Auto</SelectItem>
        <SelectItem value="STATIC">Static</SelectItem>
      </SelectContent>
    </Select>
  );

  const renderShowControl = (
    item: StockMenuItem,
    stock: StockMenuItem["stocks"][0]
  ) => (
    <div className="flex items-center gap-2">
      <Switch
        checked={stock.show_stock}
        onCheckedChange={(checked) => updateShowStock(stock.id, checked, item.id)}
        disabled={isUpdating}
      />
      <span className="text-xs text-muted-foreground">
        {stock.show_stock ? "Shown" : "Hidden"}
      </span>
    </div>
  );
  */

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-5 pb-40 duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-bold sm:text-2xl">Stock Management</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Set stock counts per item. When an item runs out it&apos;s turned off
          automatically; stock resets to 9999 each day.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Boxes className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="mt-1 text-xl font-bold sm:text-2xl">{totalCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <PackageCheck className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">In stock</span>
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-600 sm:text-2xl">
            {inStockCount}
          </p>
        </div>
        <div
          className={`rounded-xl border bg-white p-3 sm:p-4 ${
            outOfStockCount > 0 ? "border-red-200" : ""
          }`}
        >
          <div className="flex items-center gap-1.5 text-red-600">
            <PackageX className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">Out of stock</span>
          </div>
          <p className="mt-1 text-xl font-bold text-red-600 sm:text-2xl">
            {outOfStockCount}
          </p>
        </div>
      </div>

      {/* Search + filter + refresh */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="bg-white pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={filter}
          onValueChange={(value: FilterOption) => setFilter(value)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full bg-white sm:w-[160px]">
            <SlidersHorizontal className="mr-1 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Show all</SelectItem>
            <SelectItem value="outOfStock">Out of stock</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={isUpdating}
          className="bg-white"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {selectedItems.length}
            </span>
            selected
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={bulkAction} onValueChange={(v: any) => setBulkAction(v)}>
              <SelectTrigger className="w-full bg-white sm:w-[200px]">
                <SelectValue placeholder="Bulk action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Mark Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Mark Unavailable</SelectItem>
                {/* TEMP: Type + Show count bulk actions hidden for now
                <SelectItem value="STATIC">Set Type to Static</SelectItem>
                <SelectItem value="AUTO">Set Type to Auto</SelectItem>
                <SelectItem value="SHOW_STOCK">Show Stock</SelectItem>
                <SelectItem value="HIDE_STOCK">Hide Stock</SelectItem>
                */}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkAction}
                disabled={isUpdating}
                className="flex-1 sm:flex-none"
              >
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedItems([])}
                disabled={isUpdating}
                className="flex-1 bg-white sm:flex-none"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-white py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PackageX className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium">No items found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "Try a different search term."
                : filter === "outOfStock"
                ? "Nothing is out of stock right now."
                : "No menu items to manage yet."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[44px] pl-4">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAll}
                      disabled={isUpdating}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Item</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Stock available
                  </TableHead>
                  {/* TEMP: Type + Show count columns hidden for now
                  <TableHead className="font-semibold text-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Show count
                  </TableHead>
                  */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => {
                  const stock = item.stocks?.[0];
                  if (!stock) return null;
                  const isOutOfStock = stock.stock_quantity <= 0;
                  const isSelected = selectedItems.includes(item.id);

                  return (
                    <TableRow
                      key={item.id}
                      data-state={isSelected ? "selected" : undefined}
                      className={
                        isOutOfStock
                          ? "bg-red-50/50 hover:bg-red-50"
                          : "bg-white"
                      }
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          disabled={isUpdating}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {isOutOfStock && (
                            <Badge variant="destructive" className="gap-1">
                              <PackageX className="h-3 w-3" /> Out of stock
                            </Badge>
                          )}
                          {!item.is_available && !isOutOfStock && (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{renderQtyEditor(item, stock)}</TableCell>
                      {/* TEMP: Type + Show count hidden for now
                      <TableCell>{renderTypeSelect(item, stock)}</TableCell>
                      <TableCell>{renderShowControl(item, stock)}</TableCell>
                      */}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {sortedItems.map((item) => {
              const stock = item.stocks?.[0];
              if (!stock) return null;
              const isOutOfStock = stock.stock_quantity <= 0;
              const isSelected = selectedItems.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-white p-4 transition-colors ${
                    isOutOfStock ? "border-red-200" : ""
                  } ${isSelected ? "ring-2 ring-primary/40" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={isSelected}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      disabled={isUpdating}
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{item.name}</span>
                        {isOutOfStock && (
                          <Badge variant="destructive" className="gap-1">
                            <PackageX className="h-3 w-3" /> Out of stock
                          </Badge>
                        )}
                        {!item.is_available && !isOutOfStock && (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Stock available
                        </label>
                        {renderQtyEditor(item, stock)}
                      </div>
                      {/* TEMP: Type + Show count hidden for now
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Type
                          </label>
                          {renderTypeSelect(item, stock)}
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Show count
                          </label>
                          {renderShowControl(item, stock)}
                        </div>
                      </div>
                      */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminV2StockManagement;
