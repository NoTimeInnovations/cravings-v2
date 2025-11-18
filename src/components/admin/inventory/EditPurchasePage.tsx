"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PartnerPurchase, useInventoryStore } from "@/store/inventoryStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, X, PlusCircle } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getAuthCookie } from "@/app/auth/actions";
import { v4 } from "uuid";

// This interface should match the one in your Create page
interface SelectedPurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

export const EditPurchasePage = () => {
  const {
    selectedPurchase,
    setIsEditPurchasePage,
    updatePurchase, 
  } = useInventoryStore();

  const [purchaseDate, setPurchaseDate] = useState("");
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");

  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);

  const [newItem, setNewItem] = useState<PurchaseItem | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnitPrice, setNewItemUnitPrice] = useState(0);

  const [selectedItems, setSelectedItems] = useState<SelectedPurchaseItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedItemSearch = useDebounce(itemSearchQuery, 500);

  // Pre-populate form with selected purchase data
  useEffect(() => {
    if (selectedPurchase) {
      setPurchaseDate(
        new Date(selectedPurchase.purchase_date).toISOString().split("T")[0]
      );
      setSelectedSupplier(selectedPurchase.supplier);
      setSupplierSearchQuery(selectedPurchase.supplier.name);
      setSupplierAddress(selectedPurchase.supplier.address || "");
      setSupplierPhone(selectedPurchase.supplier.phone || "");

      const initialItems = selectedPurchase.purchase_transactions.map((tx) => ({
        id: tx.purchase_item.id,
        name: tx.purchase_item.name,
        quantity: tx.quantity,
        unitPrice: tx.unit_price,
        totalPrice: tx.quantity * tx.unit_price,
      }));
      setSelectedItems(initialItems);
    }
  }, [selectedPurchase]);

  // Fetch all suppliers for the search dropdown
  useEffect(() => {
    const fetchAllSuppliers = async () => {
      try {
        const cookies = await getAuthCookie();
        if (!cookies?.id) throw new Error("User not authenticated.");

        const data = await fetchFromHasura(
          `
          query GetAllSuppliers($partner_id: uuid!) {
            suppliers(where: {partner_id: {_eq: $partner_id}}, order_by: {name: asc}) {
              id
              name
              address
              phone
            }
          }
          `,
          { partner_id: cookies.id }
        );
        setAllSuppliers(data.suppliers);
      } catch (err) {
        console.error("Error fetching all suppliers:", err);
        setError("Failed to load supplier list.");
      }
    };
    fetchAllSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery) return allSuppliers;
    return allSuppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
    );
  }, [supplierSearchQuery, allSuppliers]);

  // Search for purchase items
  useEffect(() => {
    const searchItems = async () => {
      if (debouncedItemSearch.length < 2) {
        setItems([]);
        setIsItemDropdownOpen(false);
        return;
      }
      try {
        const cookies = await getAuthCookie();
        if (!cookies?.id) throw new Error("User not authenticated.");

        const data = await fetchFromHasura(
          `
          query SearchPurchaseItems($name: String!, $partner_id: uuid!) {
            purchase_items(where: { name: { _ilike: $name }, partner_id: { _eq: $partner_id } }, limit: 5) {
              id
              name
            }
          }
          `,
          { name: `%${debouncedItemSearch}%`, partner_id: cookies.id }
        );
        setItems(data.purchase_items);
        setIsItemDropdownOpen(data.purchase_items.length > 0);
      } catch (err) {
        console.error("Error searching items:", err);
      }
    };
    searchItems();
  }, [debouncedItemSearch]);

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierAddress(supplier.address || "");
    setSupplierPhone(supplier.phone || "");
    setSupplierSearchQuery(supplier.name);
    setIsSupplierDropdownOpen(false);
  };

  const handleSelectItem = (item: PurchaseItem) => {
    setNewItem(item);
    setItemSearchQuery(item.name);
    setIsItemDropdownOpen(false);
    setItems([]);
  };

  const handleAddItemToPurchase = () => {
    if (!newItem && !itemSearchQuery.trim()) {
      setError("Please select or type an item name to add.");
      return;
    }
    if (newItemQuantity <= 0 || newItemUnitPrice < 0) {
      setError("Please enter a valid quantity and unit price.");
      return;
    }
    const itemDetails = newItem
      ? { id: newItem.id, name: newItem.name }
      : { id: v4(), name: itemSearchQuery.trim() };
    if (selectedItems.some((item) => item.name.toLowerCase() === itemDetails.name.toLowerCase())) {
      setError(`Item "${itemDetails.name}" is already in the purchase list.`);
      return;
    }
    const newItemForPurchase: SelectedPurchaseItem = {
      ...itemDetails,
      quantity: newItemQuantity,
      unitPrice: newItemUnitPrice,
      totalPrice: newItemQuantity * newItemUnitPrice,
    };
    setSelectedItems([...selectedItems, newItemForPurchase]);
    setNewItem(null);
    setItemSearchQuery("");
    setNewItemQuantity(1);
    setNewItemUnitPrice(0);
    setError(null);
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
  };

  useEffect(() => {
    const total = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    setGrandTotal(total);
  }, [selectedItems]);

  const handleUpdatePurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPurchase) {
      setError("No purchase selected for update.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const isNewSupplierValid = !selectedSupplier && supplierSearchQuery.trim() && supplierAddress.trim();
    if (!selectedSupplier && !isNewSupplierValid) {
      setError("A supplier must be selected, or a new supplier's name and address must be provided.");
      setIsLoading(false);
      return;
    }
    if (selectedItems.length === 0) {
      setError("At least one purchase item is required.");
      setIsLoading(false);
      return;
    }

    const supplierData = selectedSupplier
      ? selectedSupplier
      : {
          id: v4(),
          name: supplierSearchQuery.trim().toLowerCase().replace(/\s+/g, "_"),
          address: supplierAddress.trim(),
          phone: supplierPhone.trim(),
          isNew: true,
        };

    const finalPurchase = {
      id: selectedPurchase.id,
      purchase_date: purchaseDate,
      supplier: supplierData,
      purchase_items: selectedItems.map(({ id, name, quantity, unitPrice }) => ({
        id,
        name: name.replace(/ /g, "_").toLowerCase().trim(),
        quantity,
        unit_price: unitPrice,
      })),
      total_price: grandTotal,
    } as Partial<PartnerPurchase>;

    console.log(finalPurchase);

    try {
      await updatePurchase(finalPurchase);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to update purchase:", error);
      setError("An unexpected error occurred while saving the purchase.");
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsEditPurchasePage(false)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Edit Purchase
        </h1>
      </div>

      <form onSubmit={handleUpdatePurchase} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
              <div className="space-y-2">
                <Label htmlFor="purchase-date">Purchase Date</Label>
                <Input
                  type="date"
                  id="purchase-date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                />
              </div>

              <div className="relative space-y-2">
                <Label htmlFor="supplier">Supplier Name</Label>
                <Input
                  id="supplier"
                  type="text"
                  placeholder="Type or search supplier..."
                  className="capitalize"
                  value={supplierSearchQuery?.replace(/_/g, " ")}
                  onChange={(e) => {
                    setSupplierSearchQuery(e.target.value);
                    if (selectedSupplier) {
                      setSelectedSupplier(null);
                      setSupplierAddress("");
                      setSupplierPhone("");
                    }
                  }}
                  onFocus={() => setIsSupplierDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setIsSupplierDropdownOpen(false), 150)
                  }
                  autoComplete="off"
                  required
                />
                {isSupplierDropdownOpen && filteredSuppliers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <ul className="py-1">
                      {filteredSuppliers.map((supplier) => (
                        <li
                          key={supplier.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 capitalize"
                          onMouseDown={() => handleSelectSupplier(supplier)}
                        >
                          {supplier.name.replace(/_/g, " ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-address">Supplier Address</Label>
                <Input
                  id="supplier-address"
                  type="text"
                  placeholder="Supplier address"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  disabled={!!selectedSupplier && !selectedSupplier.isNew}
                  required={!selectedSupplier}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Supplier Phone</Label>
                <Input
                  id="supplier-phone"
                  type="text"
                  placeholder="Supplier phone (optional)"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  disabled={!!selectedSupplier && !selectedSupplier.isNew}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left font-medium p-2">Item</th>
                        <th className="text-right font-medium p-2">Qty</th>
                        <th className="text-right font-medium p-2">
                          Unit Price
                        </th>
                        <th className="text-right font-medium p-2">Total</th>
                        <th className="text-right font-medium p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2 capitalize">{item.name.replace(/_/g, " ")}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(item.totalPrice)}
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No items added yet.
                </p>
              )}

              <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                <h3 className="font-medium">Add New Item</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="relative space-y-2 lg:col-span-2">
                    <Label htmlFor="item-search">Item Name</Label>
                    <Input
                      id="item-search"
                      type="text"
                      placeholder="Type or search item..."
                      className="capitalize"
                      value={itemSearchQuery.replace(/_/g, " ")}
                      onChange={(e) => {
                        setItemSearchQuery(e.target.value);
                        setNewItem(null);
                      }}
                      onFocus={() => setIsItemDropdownOpen(items.length > 0)}
                      onBlur={() =>
                        setTimeout(() => setIsItemDropdownOpen(false), 150)
                      }
                      autoComplete="off"
                    />
                    {isItemDropdownOpen && items.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <ul className="py-1">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 capitalize"
                              onMouseDown={() => handleSelectItem(item)}
                            >
                              {item.name.replace(/_/g, " ")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="item-quantity">Quantity</Label>
                    <Input
                      id="item-quantity"
                      type="number"
                      placeholder="1"
                      value={newItemQuantity}
                      onChange={(e) =>
                        setNewItemQuantity(Number(e.target.value))
                      }
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="item-unit-price">Unit Price</Label>
                    <Input
                      id="item-unit-price"
                      type="number"
                      placeholder="0.00"
                      value={newItemUnitPrice}
                      onChange={(e) =>
                        setNewItemUnitPrice(Number(e.target.value))
                      }
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleAddItemToPurchase}
                  className="w-full sm:w-auto"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Item to Purchase
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium">Grand Total</span>
              <span className="text-2xl font-bold tracking-tight">
                {formatCurrency(grandTotal)}
              </span>
            </div>
            {error && (
              <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-orange-500 text-white hover:bg-orange-600"
              disabled={isLoading}
            >
              {isLoading ? "Saving Changes..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
