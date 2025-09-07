"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  FullModal,
  FullModalContent,
  FullModalHeader,
  FullModalTitle,
  FullModalDescription,
  FullModalFooter,
  FullModalBody,
} from "@/components/ui/full_modal";
import { Button } from "@/components/ui/button";
import { usePOSStore } from "@/store/posStore";
import { Loader2, Plus, Minus, X } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getOrderByIdQuery,
  updateOrderMutation,
  updateOrderItemsMutation,
} from "@/api/orders";
import { MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Partner, useAuthStore } from "@/store/authStore";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getQrGroupForTable } from "@/lib/getQrGroupForTable";

interface ExtraCharge {
  id?: string;
  name: string;
  amount: number;
}

export const EditOrderModal = () => {
  const {
    order,
    setOrder,
    editOrderModalOpen: isOpen,
    setEditOrderModalOpen,
  } = usePOSStore();
  const { fetchMenu, items: menuItems } = useMenuStore();
  const { userData } = useAuthStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [items, setItems] = useState<
    Array<{
      id?: string;
      menu_id: string;
      quantity: number;
      menu: {
        name: string;
        price: number;
      };
    }>
  >([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [newItemId, setNewItemId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [showExtraItems, setShowExtraItems] = useState(false);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [newExtraCharge, setNewExtraCharge] = useState<ExtraCharge>({ name: "", amount: 0 });
  const [qrGroup, setQrGroup] = useState<any>(null);
  const [orderNote, setOrderNote] = useState<string>("");

  const currency = (userData as Partner)?.currency || "$";
  const gstPercentage = (userData as Partner)?.gst_percentage || 0;

  const onClose = () => {
    setEditOrderModalOpen(false);
    setItems([]);
    setTotalPrice(0);
    setTableNumber(null);
    setPhone(null);
    setNewItemId("");
    setSearchQuery("");
    setExtraCharges([]);
    setNewExtraCharge({ name: "", amount: 0 });
    setOrderNote("");
  };

  // Handle input focus to detect keyboard
  const handleInputFocus = () => {
    setKeyboardOpen(true);
  };

  const handleInputBlur = () => {
    setKeyboardOpen(false);
  };

  useEffect(() => {
    if (isOpen && order?.id) {
      fetchOrderDetails();
    }
  }, [isOpen, order?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchMenu(order?.partnerId);
    }
  }, [isOpen]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetchFromHasura(getOrderByIdQuery, {
        orderId: order?.id,
      });

      const orderData = response.orders_by_pk;
      if (orderData) {
        setItems(
          orderData.order_items.map((item: any) => ({
            id: item.id,
            menu_id: item.menu.id,
            quantity: item.quantity,
            menu: {
              name: item.menu.name,
              price: item.menu.price,
            },
          }))
        );
        setTotalPrice(orderData.total_price);
        setTableNumber(orderData.table_number);
        setPhone(orderData.phone);
        
        // Load extra charges if they exist
        if (orderData.extra_charges) {
          setExtraCharges(orderData.extra_charges);
        }

        // Load order note if it exists
        if (orderData.notes) {
          setOrderNote(orderData.notes);
        }
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (
    items: Array<{
      id?: string;
      menu_id: string;
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
    
    // Calculate QR group extra charges
    const qrGroupCharges = qrGroup?.extra_charge
      ? getExtraCharge(
          items as any[],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE"
        )
      : 0;
      
    const gstAmount = gstPercentage > 0 ? (subtotal * gstPercentage) / 100 : 0;
    return subtotal + extraChargesTotal + qrGroupCharges + gstAmount;
  };

  // Fetch QR group when table number changes
  const fetchQrGroupForTable = async (tableNum: number | null) => {
    if (tableNum === null) {
      setQrGroup(null);
      return;
    }
    
    try {
      const partnerId = (userData as Partner)?.id;
      if (!partnerId) return;
      
      const qrGroupData = await getQrGroupForTable(partnerId, tableNum);
      setQrGroup(qrGroupData);
    } catch (error) {
      console.error("Error fetching QR group for table:", error);
    }
  };

  const handleTableNumberChange = (newTableNumber: number | null) => {
    setTableNumber(newTableNumber);
    fetchQrGroupForTable(newTableNumber);
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

    const existingItemIndex = items.findIndex(
      (item) => item.menu_id === newItemId
    );

    if (existingItemIndex >= 0) {
      handleQuantityChange(
        existingItemIndex,
        items[existingItemIndex].quantity + 1
      );
    } else {
      const newItem = {
        menu_id: newItemId,
        quantity: 1,
        menu: {
          name: menuItem.name,
          price: menuItem.price,
        },
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      setTotalPrice(calculateTotal(updatedItems));
    }

    setNewItemId("");
    // Scroll to ensure new item is visible
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
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
      // Prevent updating if there are no items
      if (!items || items.length === 0) {
        toast.error("Cannot save order with no items");
        return;
      }

      setUpdating(true);

      // Calculate total with GST if applicable
      const subtotal = items.reduce(
        (sum, item) => sum + item.menu.price * item.quantity,
        0
      );
      const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const gstAmount = gstPercentage > 0 ? (subtotal * gstPercentage) / 100 : 0;
      const finalTotal = subtotal + extraChargesTotal + gstAmount;

      // Update order
      await fetchFromHasura(updateOrderMutation, {
        id: order?.id,
        totalPrice: finalTotal,
        phone: phone || "",
        extraCharges: extraCharges.length > 0 ? extraCharges : null,
        notes: orderNote || null,
      });

      // Update order items
      await fetchFromHasura(updateOrderItemsMutation, {
        orderId: order?.id,
        items: items.map((item) => ({
          order_id: order?.id,
          menu_id: item.menu_id,
          quantity: item.quantity,
        })),
      });

      // Update local state
      if (order) {
        setOrder({
          ...order,
          totalPrice: finalTotal,
          tableNumber: tableNumber || 0,
          phone: phone || "",
          extraCharges: extraCharges,
          items: items.map((item) => ({
            id: item.menu_id,
            name: item.menu.name,
            price: item.menu.price,
            quantity: item.quantity,
            category: {
              name: "",
              id: "",
              priority: 0,
            },
            image_url: "",
            description: "",
            is_top: false,
            is_available: true,
            created_at: new Date().toISOString(),
            priority: 0,
            offers: [{
              offer_price: item.menu.price,
              created_at: new Date().toISOString(),
              end_time: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
              start_time: new Date().toISOString(),
              enquiries: 0,
              items_available: 0,
              id: "",
              menu: {
                id: item.menu_id,
                name: item.menu.name,
                price: item.menu.price,
                category: {
                  name: "",
                  id: "",
                  priority: 0,
                },
                description: "",
                image_url: "",
              }
            }]
          })),
        });
      }

      toast.success("Order updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FullModal open={isOpen} onOpenChange={onClose}>
      <FullModalContent showCloseButton={false}>
        <FullModalHeader>
          <FullModalTitle>Edit Order #{order?.id?.split("-")[0]}</FullModalTitle>
          <FullModalDescription>
            {tableNumber ? `Table ${tableNumber}` : ""}
          </FullModalDescription>
        </FullModalHeader>

        {loading ? (
          <div className="flex justify-center items-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <FullModalBody>
            <div className="space-y-6">
              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {userData?.role !== "user" && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Table Number
                      </label>
                      <Input
                        type="number"
                        value={tableNumber || ""}
                        onChange={(e) =>
                          handleTableNumberChange(Number(e.target.value) || null)
                        }
                        placeholder="Table number"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Phone</label>
                      <Input
                        type="tel"
                        value={phone || ""}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Customer phone"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Total</label>
                  <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-background text-sm">
                    {currency}
                    {totalPrice.toFixed(2)}
                    {gstPercentage > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
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
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newExtraCharge.amount || ""}
                      onChange={(e) => setNewExtraCharge({ ...newExtraCharge, amount: Number(e.target.value) })}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
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
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-medium mb-3">Order Note</h3>
                <textarea
                  placeholder="Add any special instructions or notes for this order..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full p-3 border rounded-md resize-none bg-white text-black"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-black bg-white mt-1">
                  {orderNote.length}/500 characters
                </div>
              </div>

              {/* QR Group Charges */}
              {qrGroup && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">QR Group Charges</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{qrGroup.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {qrGroup.charge_type === "PER_ITEM" ? "Per item charge" : "Fixed charge"}
                        </div>
                      </div>
                      <div className="font-medium">
                        {currency}
                        {getExtraCharge(
                          items as any[],
                          qrGroup.extra_charge,
                          qrGroup.charge_type || "FLAT_FEE"
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add New Item */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Add New Item</h3>
                <div className="space-y-3">
                  <Input
                    ref={searchInputRef}
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
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
                                setKeyboardOpen(false);
                                if (searchInputRef.current) {
                                  searchInputRef.current.blur();
                                }
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
          </FullModalBody>
        )}

        <FullModalFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateOrder} 
            disabled={updating || loading || !items || items.length === 0}
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
        </FullModalFooter>
      </FullModalContent>
    </FullModal>
  );
};
