"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePOSStore } from "@/store/posStore";
import { Loader2, Plus, Minus, X } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  updateOrderMutation,
  updateOrderItemsMutation,
  getOrderByIdQuery,
} from "@/api/orders";
import { MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Captain, Partner, useAuthStore } from "@/store/authStore";

interface ExtraCharge {
  id?: string;
  name: string;
  amount: number;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: {
    id: string;
    name: string;
    priority: number;
  };
  description?: string;
  image_url?: string;
  is_top?: boolean;
  is_available?: boolean;
  priority?: number;
  offers?: { offer_price: number }[];
}

export const EditCaptainOrderModal = () => {
  const {
    order,
    setOrder,
    editOrderModalOpen: isOpen,
    setEditOrderModalOpen,
    refreshOrdersAfterUpdate,
  } = usePOSStore();
  const { fetchMenu, items: menuItems } = useMenuStore();
  const { userData } = useAuthStore();
  const captainData = userData as Captain;
  const [partnerData, setPartnerData] = useState<Partner | null>(null);
  const [updating, setUpdating] = useState(false);
  const [items, setItems] = useState<
    Array<{
      id: string;
      quantity: number;
      menu: {
        name: string;
        price: number;
        category?: {
          id: string;
          name: string;
          priority: number;
        };
        description?: string;
        image_url?: string;
        is_top?: boolean;
        is_available?: boolean;
        priority?: number;
      };
    }>
  >([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [newExtraCharge, setNewExtraCharge] = useState<ExtraCharge>({ name: "", amount: 0 });
  const [orderNote, setOrderNote] = useState<string>("");

  const currency = partnerData?.currency || "$";
  const gstPercentage = partnerData?.gst_percentage || 0;

  const filteredMenuItems = menuItems
    .filter((item): item is MenuItem & { id: string } => {
      const hasId = item.id !== undefined;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isAvailable = item.is_available !== false;
      return hasId && isAvailable && (searchQuery === "" || matchesSearch);
    });

  const onClose = () => {
    setEditOrderModalOpen(false);
    setOrder(null);
    setItems([]);
    setTotalPrice(0);
    setTableNumber(null);
    setPhone(null);
    setNewItemId(null);
    setSearchQuery("");
    setExtraCharges([]);
    setNewExtraCharge({ name: "", amount: 0 });
    setOrderNote("");
  };

  // Populate form data when order becomes available
  useEffect(() => {
    if (isOpen && order) {
      if (order.items && order.items.length > 0) {
        setItems(
          order.items.map((item: OrderItem) => ({
            id: item.id,
            quantity: item.quantity,
            menu: {
              name: item.name,
              price: item.price,
              category: item.category || { id: "", name: "", priority: 0 },
              description: item.description || "",
              image_url: item.image_url || "",
              is_top: item.is_top || false,
              is_available: item.is_available !== false,
              priority: item.priority || 0,
            },
          }))
        );
      }
      setTotalPrice(order.totalPrice ?? 0);
      setTableNumber(order.tableNumber ?? null);
      setPhone(order.phone ?? null);
      if (order.extraCharges && Array.isArray(order.extraCharges)) {
        setExtraCharges(order.extraCharges);
      } else {
        setExtraCharges([]);
      }
      setOrderNote(order.notes || "");
      if (order.items && order.items.length > 0) {
        const calculatedTotal = calculateTotal(
          order.items.map((item: OrderItem) => ({
            id: item.id,
            quantity: item.quantity,
            menu: {
              name: item.name,
              price: item.price,
            },
          }))
        );
        setTotalPrice(calculatedTotal);
      }
    }
  }, [isOpen, order]);

  // Recalculate total whenever items or extra charges change
  useEffect(() => {
    if (items.length > 0) {
      const newTotal = calculateTotal(items);
      setTotalPrice(newTotal);
    }
  }, [items, extraCharges, gstPercentage]);

  const partnerId = order?.partnerId || captainData?.partner_id;
  useEffect(() => {
    if (isOpen && partnerId) {
      fetchMenu(partnerId, true);
    }
  }, [isOpen, partnerId, fetchMenu]);

  useEffect(() => {
    const fetchPartnerData = async () => {
      if (captainData?.partner_id) {
        try {
          const response = await fetchFromHasura(
            `
            query GetPartnerById($partner_id: uuid!) {
              partners_by_pk(id: $partner_id) {
                id
                currency
                gst_percentage
                store_name
              }
            }
            `,
            {
              partner_id: captainData.partner_id
            }
          );
          if (response.partners_by_pk) {
            setPartnerData(response.partners_by_pk);
          }
        } catch (error) {
          console.error("Error fetching partner data:", error);
          toast.error("Failed to load partner data");
        }
      }
    };
    fetchPartnerData();
  }, [captainData?.partner_id]);

  const calculateTotal = (
    items: Array<{
      id: string;
      quantity: number;
      menu: {
        name: string;
        price: number;
      };
    }>
  ) => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.menu.price * item.quantity,
      0
    );
    const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
    const gstAmount = gstPercentage > 0 ? (subtotal * gstPercentage) / 100 : 0;
    return subtotal + extraChargesTotal + gstAmount;
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedItems = [...items];
    updatedItems[index].quantity = newQuantity;
    setItems(updatedItems);
    setTotalPrice(calculateTotal(updatedItems));
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
    setTotalPrice(calculateTotal(updatedItems));
  };

  const handleAddItem = () => {
    if (!newItemId) return;
    const menuItem = menuItems.find((item) => item.id === newItemId);
    if (!menuItem) return;
    const existingItemIndex = items.findIndex((item) => item.id === newItemId);
    if (existingItemIndex >= 0) {
      handleQuantityChange(
        existingItemIndex,
        items[existingItemIndex].quantity + 1
      );
    } else {
      const newItem = {
        id: newItemId,
        quantity: 1,
        menu: {
          name: menuItem.name,
          price: menuItem.price,
          category: menuItem.category,
          description: menuItem.description,
          image_url: menuItem.image_url,
          is_top: menuItem.is_top,
          is_available: menuItem.is_available,
          priority: menuItem.priority,
        },
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      setTotalPrice(calculateTotal(updatedItems));
    }
    setNewItemId(null);
  };

  const handleAddExtraCharge = () => {
    if (!newExtraCharge.name || newExtraCharge.amount <= 0) {
      toast.error("Please enter a valid charge name and amount");
      return;
    }
    const charge: ExtraCharge = {
      id: Date.now().toString(),
      name: newExtraCharge.name,
      amount: newExtraCharge.amount,
    };
    setExtraCharges([...extraCharges, charge]);
    setNewExtraCharge({ name: "", amount: 0 });
    setTotalPrice(calculateTotal(items));
  };

  const handleRemoveExtraCharge = (index: number) => {
    const updatedCharges = [...extraCharges];
    updatedCharges.splice(index, 1);
    setExtraCharges(updatedCharges);
    setTotalPrice(calculateTotal(items));
  };

  const handleUpdateOrder = async () => {
    try {
      if (!items || items.length === 0) {
        toast.error("Cannot save order with no items");
        return;
      }
      setUpdating(true);
      const subtotal = items.reduce(
        (sum, item) => sum + item.menu.price * item.quantity,
        0
      );
      const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const gstAmount = gstPercentage > 0 ? (subtotal * gstPercentage) / 100 : 0;
      const finalTotal = subtotal + extraChargesTotal + gstAmount;
      await fetchFromHasura(updateOrderMutation, {
        id: order?.id,
        totalPrice: finalTotal,
        phone: phone ?? "",
        tableNumber: tableNumber ?? null,
        extraCharges: extraCharges.length > 0 ? extraCharges : null,
        notes: orderNote || null,
      });
      await fetchFromHasura(updateOrderItemsMutation, {
        orderId: order?.id,
        items: items.map((item) => ({
          order_id: order?.id,
          menu_id: item.id,
          quantity: item.quantity,
        })),
      });
      if (order) {
        setOrder({
          ...order,
          totalPrice: finalTotal,
          tableNumber: tableNumber ?? order.tableNumber ?? null,
          phone: phone ?? "",
          extraCharges: extraCharges,
          items: items.map((item) => ({
            id: item.id,
            name: item.menu.name,
            price: item.menu.price,
            quantity: item.quantity,
            category: item.menu.category || {
              name: "",
              id: "",
              priority: 0,
            },
            image_url: item.menu.image_url || "",
            description: item.menu.description || "",
            is_top: item.menu.is_top || false,
            is_available: item.menu.is_available || true,
            created_at: new Date().toISOString(),
            priority: item.menu.priority || 0,
            offers: [],
          })),
        });
      }
      toast.success("Order updated successfully");
      refreshOrdersAfterUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (isOpen && order?.id) {
      (async () => {
        try {
          const response = await fetchFromHasura(getOrderByIdQuery, { orderId: order.id });
          const orderData = response.orders_by_pk;
          if (orderData) {
            if (orderData.order_items && orderData.order_items.length > 0) {
              setItems(
                orderData.order_items.map((item: any) => ({
                  id: item.menu.id,
                  quantity: item.quantity,
                  menu: {
                    name: item.menu.name,
                    price: item.menu.price,
                    category: item.menu.category || { id: "", name: "", priority: 0 },
                    description: item.menu.description || "",
                    image_url: item.menu.image_url || "",
                    is_top: item.menu.is_top || false,
                    is_available: item.menu.is_available !== false,
                    priority: item.menu.priority || 0,
                  },
                }))
              );
            }
            setTotalPrice(orderData.total_price ?? 0);
            setTableNumber(orderData.table_number ?? null);
            setPhone(orderData.phone ?? null);
            setExtraCharges(orderData.extra_charges && Array.isArray(orderData.extra_charges) ? orderData.extra_charges : []);
            setOrderNote(orderData.notes || "");
          }
        } catch (error) {
          console.error("Error fetching order details:", error);
        }
      })();
    }
  }, [isOpen, order?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[5vh]">
      <div className="bg-white rounded-lg w-full h-[90vh] overflow-hidden flex flex-col mx-4 max-w-none">
        {/* Header */}
        <div className="flex-none p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Edit Order #{order?.id?.split("-")[0]}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {tableNumber !== null && tableNumber !== undefined ? `Table ${tableNumber}` : ""}
              </p>
              {phone && phone.trim() !== "" && (
                <p className="text-sm text-gray-500 mt-1">
                  Customer: {phone}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {updating || !order ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Table Number
                  </label>
                  <Input
                    type="number"
                    value={tableNumber === null || tableNumber === undefined ? "" : tableNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTableNumber(val === "" ? null : Number(val));
                    }}
                    placeholder="Table number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Phone</label>
                  <Input
                    type="tel"
                    value={phone || ""}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Customer phone"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Total</label>
                  <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-background text-sm">
                    {currency}
                    {totalPrice.toFixed(2)}
                    {gstPercentage > 0 && (
                      <span className="text-[0.6rem] text-muted-foreground ml-2">
                        (incl. {gstPercentage}% GST: {currency}
                        {((items.reduce((sum, item) => sum + item.menu.price * item.quantity, 0) * gstPercentage) / 100).toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Extra Charges */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Extra Charges</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Charge name"
                      value={newExtraCharge.name}
                      onChange={(e) => setNewExtraCharge({ ...newExtraCharge, name: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newExtraCharge.amount || ""}
                      onChange={(e) => setNewExtraCharge({ ...newExtraCharge, amount: Number(e.target.value) })}
                    />
                    <Button onClick={handleAddExtraCharge} className="whitespace-nowrap">
                      Add Charge
                    </Button>
                  </div>
                  {extraCharges.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="divide-y">
                        {extraCharges.map((charge, index) => (
                          <div
                            key={charge.id || index}
                            className="p-3 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{charge.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {currency}{charge.amount.toFixed(2)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveExtraCharge(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Order Note */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3"> Order Note</h3>
                <textarea
                  placeholder="Add any special instructions or notes for this order..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full p-3 border rounded-md resize-none bg-white text-black dark:bg-zinc-900 dark:text-white"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-black mt-1">
                  {orderNote.length}/500 characters
                </div>
              </div>
              {/* Add New Item */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Add New Item</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <div className="border rounded-lg max-h-52 overflow-y-auto">
                      {filteredMenuItems.length === 0 ? (
                        <div className="p-3 text-center text-muted-foreground">
                          No items found
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredMenuItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 flex justify-between items-center hover:bg-accent cursor-pointer"
                              onClick={() => {
                                setNewItemId(item.id!);
                                setSearchQuery("");
                              }}
                            >
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {currency}
                                  {item.price.toFixed(2)}
                                </div>
                              </div>
                              <Plus className="h-4 w-4" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {newItemId && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 border rounded-lg p-3">
                        {menuItems.find((item) => item.id === newItemId)?.name} -{" "}
                        {currency}
                        {menuItems
                          .find((item) => item.id === newItemId)
                          ?.price.toFixed(2)}
                      </div>
                      <Button onClick={handleAddItem} className="sm:w-auto w-full">Add to Order</Button>
                    </div>
                  )}
                </div>
              </div>
              {/* Current Items */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Current Items</h3>
                <div className="rounded-lg overflow-hidden border">
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No items in this order
                    </div>
                  ) : (
                    <div className="divide-y">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 flex flex-col sm:flex-row justify-between gap-2"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{item.menu.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {currency}
                              {item.menu.price.toFixed(2)} each
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleQuantityChange(index, item.quantity - 1)
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleQuantityChange(index, item.quantity + 1)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex-none p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateOrder}
              disabled={updating || !order || items.length === 0}
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Order"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};