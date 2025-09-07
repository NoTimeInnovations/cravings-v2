import { useAuthStore } from "@/store/authStore";
import { MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Button } from "../ui/button";
import { useCategoryStore } from "@/store/categoryStore_hasura";
import { getAuthCookie } from "@/app/auth/actions";
import { Checkbox } from "../ui/checkbox";
import { OfferGroup } from "@/store/offerStore_hasura";
import { formatDate } from "@/lib/formatDate";
import { get } from "http";

interface CreateOfferFormProps {
  onSubmit: (
    offer: {
      menu_id?: string;
      offer_price?: number;
      items_available?: number;
      start_time: string;
      end_time: string;
      offer_type?: string;
      offerGroup?: OfferGroup;
      variant?: {
        name: string;
        price: number;
      };
    },
    notificationMessage: {
      title: string;
      body: string;
    }
  ) => Promise<void>;
  onCancel: () => void;
}

export function CreateOfferForm({ onSubmit, onCancel }: CreateOfferFormProps) {
  const { items } = useMenuStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [newOffer, setNewOffer] = useState({
    menuItemId: "",
    newPrice: "",
    itemsAvailable: "",
    fromTime: "",
    toTime: "",
    offerType: "all", // Add offer_type field
  });
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [newOfferGroup, setNewOfferGroup] = useState({
    name: "",
    categoryId: "",
    description: "",
    percentage: "",
    menuItemIds: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [slectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isOfferTypeGroup, setIsOfferGroup] = useState(false);
  const [isCustomOffer, setIsCustomOffer] = useState(false);
  const [groupType, setGroupType] = useState<
    "category" | "all" | "select" | undefined
  >(undefined);
  const [itemSearch, setItemSearch] = useState(""); // Add search state
  
  // Custom menu item state
  const [customMenuItem, setCustomMenuItem] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
  });

  const { userData } = useAuthStore();

  // Create refs for the form fields
  const priceInputRef = useRef<HTMLInputElement>(null);
  const itemsInputRef = useRef<HTMLInputElement>(null);
  const fromTimeInputRef = useRef<HTMLInputElement>(null);
  const toTimeInputRef = useRef<HTMLInputElement>(null);

  const notificationTitleRef = useRef<HTMLInputElement>(null);
  const notificationBodyRef = useRef<HTMLInputElement>(null);

  const offerGroupDiscountRef = useRef<HTMLInputElement>(null);
  const offerGroupNameRef = useRef<HTMLInputElement>(null);
  const offerGroupDescriptionRef = useRef<HTMLInputElement>(null);

  const [notificationMessage, setNotificationMessage] = useState<{
    title?: string;
    body?: string;
  } | null>(null);

  const scrollToView = (el: HTMLElement) => {
    if (formContainerRef.current && el) {
      setTimeout(() => {
        // Scroll the element into view with some offset from the top
        const yOffset = -100;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }, 300);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setKeyboardOpen(true);
    scrollToView(e.target);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      // Only set keyboard as closed if no inputs are focused
      if (
        document.activeElement !== priceInputRef.current &&
        document.activeElement !== itemsInputRef.current &&
        document.activeElement !== fromTimeInputRef.current &&
        document.activeElement !== toTimeInputRef.current
      ) {
        setKeyboardOpen(false);
      }
    }, 100);
  };

  // Add listener for visual viewport resize (keyboard opening/closing)
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;

        // If visual viewport is significantly smaller than window height, keyboard is probably open
        if (windowHeight - currentHeight > 150) {
          setKeyboardOpen(true);
        } else {
          setKeyboardOpen(false);
        }
      }
    };

    // Add the event listener
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }

    // Clean up
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  useEffect(() => {
    const fetchAllCategories = async () => {
      const cookies = await getAuthCookie();
      if (cookies) await fetchCategories(cookies?.id);
    };

    fetchAllCategories();
  }, []);

  const validateFromToTime = () => {
    if (
      new Date(newOffer.fromTime) <
      new Date(new Date().getTime() - 1000 * 60 * 15)
    ) {
      toast.error("From time cannot be in the past");
      return false;
    }

    if (
      new Date(newOffer.toTime) <
      new Date(new Date().getTime() + 1000 * 60 * 15)
    ) {
      toast.error("To time cannot be in the past");
      return false;
    }

    if (new Date(newOffer.fromTime) > new Date(newOffer.toTime)) {
      toast.error("From time cannot be greater than to time");
      return false;
    }

    if (new Date(newOffer.toTime) < new Date(newOffer.fromTime)) {
      toast.error("To time cannot be less than from time");
      return false;
    }

    if (
      new Date(newOffer.toTime).getTime() -
        new Date(newOffer.fromTime).getTime() <
      1000 * 60 * 15
    ) {
      toast.error("Offer duration should be at least 15 minutes");
      return false;
    }

    return true;
  };

  const validateSingleItemOffer = () => {
    // Custom offer validation
    if (isCustomOffer) {
      if (!customMenuItem.name.trim()) {
        toast.error("Please enter item name");
        return false;
      }
      if (!customMenuItem.price || isNaN(parseFloat(customMenuItem.price))) {
        toast.error("Please enter a valid original price");
        return false;
      }
      if (parseFloat(customMenuItem.price) <= 0) {
        toast.error("Original price must be greater than 0");
        return false;
      }
    } else {
      // Regular offer validation
      if (!newOffer.menuItemId) {
        toast.error("Please select a menu item");
        return false;
      }
    }
    
    // Check if selected item has variants and a variant is selected
    const selectedItem = items.find((item) => item.id === newOffer.menuItemId);
    if (selectedItem?.variants && selectedItem.variants.length > 0 && !selectedVariant) {
      toast.error("Please select a variant");
      return false;
    }
    
    if (!newOffer.newPrice || isNaN(parseFloat(newOffer.newPrice))) {
      toast.error("Please enter a valid new price");
      return false;
    }

    // For custom offers, validate that offer price is less than original price
    if (newOffer.offerType === "custom") {
      const originalPrice = parseFloat(customMenuItem.price);
      const offerPrice = parseFloat(newOffer.newPrice);
      
      if (offerPrice >= originalPrice) {
        toast.error("Offer price must be less than original price");
        return false;
      }
    }
    if (!newOffer.itemsAvailable || isNaN(parseInt(newOffer.itemsAvailable))) {
      toast.error("Please enter a valid number of items available");
      return false;
    }
    if (!newOffer.fromTime) {
      toast.error("Please select a from time");
      return false;
    }
    if (!newOffer.toTime) {
      toast.error("Please select a to time");
      return false;
    }

    if (!validateFromToTime()) {
      return false;
    }

    return true;
  };

  const validateGroupItemOffer = () => {
    if (!newOfferGroup.name.trim()) {
      toast.error("Please enter a name for the offer group");
      return false;
    }
    if (!newOfferGroup.percentage || isNaN(parseFloat(newOfferGroup.percentage))) {
      toast.error("Please enter a valid discount percentage for the offer group");
      return false;
    }

    const percentage = parseFloat(newOfferGroup.percentage);
    if (percentage <= 0 || percentage > 100) {
      toast.error("Discount percentage must be between 1 and 100");
      return false;
    }

    if (!newOfferGroup.categoryId && groupType === "category") {
      toast.error("Please select a category for the offer group");
      return false;
    }

    if (newOfferGroup.menuItemIds.length === 0) {
      toast.error("Please select at least one menu item for the offer group");
      return false;
    }

    if (!newOffer.fromTime) {
      toast.error("Please select a from time");
      return false;
    }
    if (!newOffer.toTime) {
      toast.error("Please select a to time");
      return false;
    }

    if (!validateFromToTime()) {
      return false;
    }

    return true;
  };

  // Helper function to get all items (including those without images)
  const getAllItems = () => {
    return items || [];
  };

  // Helper function to get filtered items based on search
  const getFilteredItems = () => {
    const allItems = getAllItems();
    if (!itemSearch.trim()) return allItems;
    
    return allItems.filter(item => 
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.category?.name.toLowerCase().includes(itemSearch.toLowerCase())
    );
  };

  // Helper function to get items by category
  const getItemsByCategory = (categoryId: string) => {
    return getAllItems().filter((item) => item.category?.id === categoryId);
  };

  const getNotificationTitle = () => {
    if (isOfferTypeGroup) {
      return `🎉 ${newOfferGroup.name} - Exclusive Offer at ${
        (userData as HotelData)?.store_name || "Our Store"
      }!`;
    } else {
      const selectedItem = items.find(
        (item) => item.id === newOffer.menuItemId
      );
      const variantText = selectedVariant ? ` (${selectedVariant})` : "";
      return `🔥 ${
        selectedItem?.name || "Special Item"
      }${variantText} - Limited-Time Deal at ${
        (userData as HotelData)?.store_name || "Our Store"
      }!`;
    }
  };

  const getNotificationBody = () => {
    if (isOfferTypeGroup) {
      if (groupType === "all") {
        return `🎉 Exciting news! Get ${
          newOfferGroup.percentage
        }% off on everything with offer "${newOfferGroup.name}"!  
💰 Price: ${(userData as HotelData)?.currency ?? "₹"}${
          newOfferGroup.percentage
        }% off  
⏰ Hurry! Offer ends ${formatDate(newOffer.toTime)}`;
      } else if (groupType === "category") {
        return `🛍️ Special deal! Enjoy ${
          newOfferGroup.percentage
        }% off on all ${
          categories.find((c) => c.id === newOfferGroup.categoryId)?.name ||
          "selected category"
        } items with offer "${newOfferGroup.name}"!  
✨ ${(userData as HotelData)?.currency ?? "₹"}${
          newOfferGroup.percentage
        }% savings  
📅 Limited time only - until ${formatDate(newOffer.toTime)}`;
      } else if (groupType === "select") {
        return `🔥 Exclusive offer! ${
          newOfferGroup.percentage
        }% discount on specially selected items with "${newOfferGroup.name}"!  
💎 Handpicked deals at ${(userData as HotelData)?.currency ?? "₹"}${
          newOfferGroup.percentage
        }% off  
⌛ Don't miss out - valid till ${formatDate(newOffer.toTime)}`;
      }
    } else {
      const selectedItem = items.find(
        (item) => item.id === newOffer.menuItemId
      );
      const variantText = selectedVariant ? ` (${selectedVariant})` : "";
      
      // Get the original price from the selected variant
      let originalPrice = selectedItem?.price || 0;
      if (selectedVariant && slectedItem?.variants) {
        const variant = slectedItem.variants.find(v => v.name === selectedVariant);
        originalPrice = variant ? variant.price : originalPrice;
      }
      
      return `Check out the new offer: ${selectedItem?.name}${variantText} - Now just ${
        (userData as HotelData)?.currency ?? "₹"
      }${newOffer.newPrice} (was ${(userData as HotelData)?.currency ?? "₹"}${originalPrice.toFixed(2)}). Valid until ${formatDate(newOffer.toTime)}.`;
    }
  };

  // Helper function to get or create custom category
  const getOrCreateCustomCategory = async (): Promise<string> => {
    // First, check if custom category already exists
    const customCategory = categories.find(cat => cat.name.toLowerCase() === 'custom');
    
    if (customCategory) {
      return customCategory.id;
    }

    // If not found, create it
    const { fetchFromHasura } = await import('@/lib/hasuraClient');
    const { addCategory } = await import('@/api/category');
    
    const categoryData = {
      name: 'custom',
      partner_id: userData?.id,
      is_active: false, // Hidden category
      priority: 999, // Low priority
    };

    const result = await fetchFromHasura(addCategory, {
      category: [categoryData]
    });

    return result.insert_category.returning[0].id;
  };

  // Helper function to create custom menu item
  const createCustomMenuItem = async (menuItemData: any) => {
    const { fetchFromHasura } = await import('@/lib/hasuraClient');
    const { addMenu } = await import('@/api/menu');

    const result = await fetchFromHasura(addMenu, {
      menu: [menuItemData]
    });

    return result.insert_menu.returning[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    if (!isOfferTypeGroup) {
      if (!validateSingleItemOffer()) {
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!validateGroupItemOffer()) {
        setIsSubmitting(false);
        return;
      }
    }
  
    const notificationMessage = {
      title: notificationTitleRef.current?.value || getNotificationTitle() || "",
      body: notificationBodyRef.current?.value || getNotificationBody() || "",
    };

    // Comprehensive logging of all form data
    console.log("=== CREATE OFFER FORM DATA ===");
    console.log("Form State:", {
      newOffer,
      selectedVariant,
      slectedItem,
      isOfferTypeGroup,
      newOfferGroup,
      groupType
    });
    console.log("Selected Item Details:", {
      id: slectedItem?.id,
      name: slectedItem?.name,
      price: slectedItem?.price,
      variants: slectedItem?.variants,
      hasVariants: slectedItem?.variants && slectedItem.variants.length > 0
    });
    console.log("Variant Selection:", {
      selectedVariant,
      variantExists: selectedVariant ? "YES" : "NO"
    });
    console.log("Price Information:", {
      newPrice: newOffer.newPrice,
      originalPrice: slectedItem?.price,
      variantPrice: selectedVariant && slectedItem?.variants ? 
        slectedItem.variants.find(v => v.name === selectedVariant)?.price : "N/A"
    });
    console.log("Notification Message:", notificationMessage);
  
    try {
      // Handle custom offer creation
      if (newOffer.offerType === "custom" && !isOfferTypeGroup) {
        // First, create the custom menu item
        const customMenuItemData = {
          name: customMenuItem.name,
          description: customMenuItem.description,
          price: parseFloat(customMenuItem.price),
          image_url: customMenuItem.image_url || "",
          partner_id: userData?.id,
          category_id: await getOrCreateCustomCategory(),
          is_available: true,
          is_top: false,
          is_price_as_per_size: false,
          deletion_status: 0,
        };

        const createdMenuItem = await createCustomMenuItem(customMenuItemData);
        
        if (createdMenuItem) {
          // Then create the offer for the new menu item
          const offerData = {
            menu_id: createdMenuItem.id,
            offer_price: Math.round(parseFloat(newOffer.newPrice)),
            items_available: parseInt(newOffer.itemsAvailable),
            start_time: newOffer.fromTime,
            end_time: newOffer.toTime,
            offer_type: newOffer.offerType,
          };
          
          await onSubmit(offerData, notificationMessage);
        }
      } else if (!isOfferTypeGroup) {
        const offerData = {
          menu_id: newOffer.menuItemId,
          offer_price: Math.round(parseFloat(newOffer.newPrice)),
          items_available: parseInt(newOffer.itemsAvailable),
          start_time: newOffer.fromTime,
          end_time: newOffer.toTime,
          offer_type: newOffer.offerType,
          variant: selectedVariant && slectedItem?.variants ? 
            slectedItem.variants.find(v => v.name === selectedVariant) : undefined,
        };
        
        await onSubmit(
          offerData,
          notificationMessage
        );
      } else {
        // For group/category offers, create an offer for each selected item/variant
        const percentage = parseFloat(newOfferGroup.percentage);
        
        for (const selectedId of newOfferGroup.menuItemIds) {
          // Check if this is a variant ID (contains '|')
          if (selectedId.includes('|')) {
            // This is a variant ID - format: itemId|variantName
            const [itemId, variantName] = selectedId.split('|');
            const item = items.find(item => item.id === itemId);
            const variant = item?.variants?.find(v => v.name === variantName);
            
            if (item && variant) {
              // Use the menu item's available quantity if present, otherwise fallback to 1
              const items_available = item.stocks && item.stocks[0] && typeof item.stocks[0].stock_quantity === 'number'
                ? item.stocks[0].stock_quantity
                : 1;
              // Calculate offer price based on variant price
              const offer_price = Math.round(variant.price * (1 - percentage / 100));
              
              await onSubmit(
                {
                  menu_id: item.id,
                  offer_price,
                  items_available,
                  start_time: newOffer.fromTime,
                  end_time: newOffer.toTime,
                  offer_type: newOffer.offerType,
                  variant: {
                    name: variant.name,
                    price: variant.price,
                  },
                },
                notificationMessage
              );
            }
          } else {
            // This is a regular item ID
            const item = items.find(item => item.id === selectedId);
            if (item) {
              // Use the menu item's available quantity if present, otherwise fallback to 1
              const items_available = item.stocks && item.stocks[0] && typeof item.stocks[0].stock_quantity === 'number'
                ? item.stocks[0].stock_quantity
                : 1;
              // Calculate offer price as a float with two decimals
              const offer_price = Math.round(item.price * (1 - percentage / 100));
              
              await onSubmit(
                {
                  menu_id: item.id,
                  offer_price,
                  items_available,
                  start_time: newOffer.fromTime,
                  end_time: newOffer.toTime,
                  offer_type: newOffer.offerType,
                },
                notificationMessage
              );
            }
          }
        }
      }
    } catch (error) {
      toast.error("Failed to create offer");
      console.error(error);
    }
  
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isOfferTypeGroup) {
      console.log("Selected items for offer group:", newOfferGroup.menuItemIds);
      console.log("Group type:", groupType);
      console.log("Selected category:", newOfferGroup.categoryId);
    }
  }, [groupType, isOfferTypeGroup, newOfferGroup.menuItemIds, newOfferGroup.categoryId]);

  // Clear search when switching offer types
  useEffect(() => {
    setItemSearch("");
  }, [isOfferTypeGroup, groupType]);

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Create New Offer</h2>
      <div ref={formContainerRef}>
        <form
          id="create-offer-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="offerType">Offer Type</Label>
            <Select
              value={isCustomOffer ? "custom" : (isOfferTypeGroup ? "group" : "single")}
              onValueChange={(value) => {
                setIsOfferGroup(value === "group");
                setIsCustomOffer(value === "custom");
                
                if (value === "single") {
                  setNewOffer({
                    ...newOffer,
                    menuItemId: "",
                    newPrice: "",
                    itemsAvailable: "",
                    fromTime: "",
                    toTime: "",
                    offerType: "all",
                  });
                  setSelectedItem(null);
                  setSelectedVariant("");
                } else if (value === "custom") {
                  // Reset custom offer state
                  setNewOffer({
                    ...newOffer,
                    menuItemId: "",
                    newPrice: "",
                    itemsAvailable: "",
                    fromTime: "",
                    toTime: "",
                    offerType: "all",
                  });
                  setCustomMenuItem({
                    name: "",
                    description: "",
                    price: "",
                    image_url: "",
                  });
                  setSelectedItem(null);
                  setSelectedVariant("");
                } else {
                  // Reset group offer state
                  setNewOfferGroup({
                    name: "",
                    categoryId: "",
                    description: "",
                    percentage: "",
                    menuItemIds: [],
                  });
                  setGroupType(undefined);
                }
              }}
            >
              <SelectTrigger id="offerType">
                <SelectValue placeholder="Select offer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Item Offer</SelectItem>
                <SelectItem value="group">Offer Group</SelectItem>
                <SelectItem value="custom">Custom Offer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offerTypeFilter">Offer Display Type</Label>
            <Select
              value={newOffer.offerType}
              onValueChange={(value) => {
                setNewOffer({ ...newOffer, offerType: value });
              }}
            >
              <SelectTrigger id="offerTypeFilter">
                <SelectValue placeholder="Select where to display offer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Hotels, Offers, QR Scan)</SelectItem>
                <SelectItem value="delivery">Delivery Only (Hotels, Offers)</SelectItem>
                <SelectItem value="dine_in">Dine-In Only (QR Scan)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Menu Item Form */}
          {isCustomOffer && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-800">Create New Menu Item</h3>
              
              <div className="space-y-2">
                <Label htmlFor="customItemName">Item Name *</Label>
                <Input
                  id="customItemName"
                  type="text"
                  placeholder="Enter item name"
                  value={customMenuItem.name}
                  onChange={(e) => setCustomMenuItem({...customMenuItem, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customItemDescription">Description</Label>
                <Input
                  id="customItemDescription"
                  type="text"
                  placeholder="Enter item description"
                  value={customMenuItem.description}
                  onChange={(e) => setCustomMenuItem({...customMenuItem, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customItemPrice">Original Price *</Label>
                <Input
                  id="customItemPrice"
                  type="number"
                  placeholder="Enter original price"
                  value={customMenuItem.price}
                  onChange={(e) => setCustomMenuItem({...customMenuItem, price: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customItemImage">Image URL (Optional)</Label>
                <Input
                  id="customItemImage"
                  type="url"
                  placeholder="Enter image URL"
                  value={customMenuItem.image_url}
                  onChange={(e) => setCustomMenuItem({...customMenuItem, image_url: e.target.value})}
                />
              </div>
            </div>
          )}

          {isOfferTypeGroup && (
            <>
              <div className="space-y-2">
                <Label htmlFor="groupType">Group by</Label>
                <Select
                  value={groupType as string}
                  onValueChange={(value) => {
                    setGroupType(value as "category" | "all" | "select");
                    if (value === "all") {
                      const allItems = getAllItems();
                      setNewOfferGroup({
                        ...newOfferGroup,
                        categoryId: "",
                        menuItemIds: allItems
                          .map((item) => item.id)
                          .filter((id): id is string => id !== undefined),
                      });
                    } else if (value === "category") {
                      setNewOfferGroup({
                        ...newOfferGroup,
                        categoryId: "",
                        menuItemIds: [],
                      });
                    } else {
                      setNewOfferGroup({
                        ...newOfferGroup,
                        categoryId: "",
                        menuItemIds: [],
                      });
                    }
                  }}
                >
                  <SelectTrigger id="groupType">
                    <SelectValue placeholder="Select group type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="category">Select Category</SelectItem>
                    <SelectItem value="select">Select Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {groupType === "category" && (
                <div>
                  <Label htmlFor="category">Select Category</Label>
                  <Select
                    value={newOfferGroup.categoryId}
                    onValueChange={(value) => {
                      const categoryItems = getItemsByCategory(value);
                      setNewOfferGroup({
                        ...newOfferGroup,
                        categoryId: value,
                        menuItemIds: categoryItems
                          .map((item) => item.id)
                          .filter((id): id is string => id !== undefined),
                      });
                    }}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({getItemsByCategory(category.id).length} items)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {newOfferGroup.categoryId && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 mb-2">
                        Items in this category ({getItemsByCategory(newOfferGroup.categoryId).length}):
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {getItemsByCategory(newOfferGroup.categoryId).map((item) => (
                          <div key={item.id} className="truncate">
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {groupType === "all" && (
                <div className="text-gray-500 text-sm">
                  All items in the menu will be included in this offer group.
                  {`(${getAllItems().length})`} items found.
                  <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-40 overflow-y-auto">
                    <ul className="grid grid-cols-2 gap-2 text-xs">
                      {getAllItems().map((item) => (
                        <li key={item.id} className="truncate">{item.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {groupType === "select" && (
                <div className="space-y-2">
                  <Label>Select Menu Items</Label>
                  
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                    <div className="sticky top-0 bg-white pb-2 mb-2 border-b">
                      <Input
                        placeholder="Search items..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full"
                        onKeyDown={(e) => {
                          // Prevent dropdown navigation when typing in search
                          e.stopPropagation();
                        }}
                        onFocus={(e) => {
                          // Prevent dropdown from closing when search input is focused
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          // Prevent dropdown from closing when clicking search input
                          e.stopPropagation();
                        }}
                      />
                    </div>
                    <div className="space-y-2 grid grid-cols-1 gap-2">
                      {getFilteredItems().map((item) => {
                        const hasVariants = item.variants && item.variants.length > 0;
                        const isItemSelected = newOfferGroup.menuItemIds.includes(item.id as string);
                        const selectedVariants = newOfferGroup.menuItemIds.filter(id => 
                          id.startsWith(`${item.id}|`)
                        );
                        const allVariantsSelected = hasVariants && 
                          selectedVariants.length === (item.variants?.length || 0);

                        return (
                          <div key={item.id} className="space-y-1">
                            {/* Main item checkbox */}
                            <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                              <Checkbox
                                id={`item-${item.id}`}
                                checked={isItemSelected || allVariantsSelected}
                                onCheckedChange={(checked) => {
                                  if (checked && item.id) {
                                    if (hasVariants) {
                                      // If item has variants, select all variants
                                      const variantIds = item.variants?.map(v => `${item.id}|${v.name}`) || [];
                                      setNewOfferGroup({
                                        ...newOfferGroup,
                                        menuItemIds: [
                                          ...newOfferGroup.menuItemIds.filter(id => 
                                            !id.startsWith(`${item.id}|`) && id !== item.id
                                          ),
                                          ...variantIds,
                                        ],
                                      });
                                    } else {
                                      // If item has no variants, select the item itself
                                      setNewOfferGroup({
                                        ...newOfferGroup,
                                        menuItemIds: [
                                          ...newOfferGroup.menuItemIds,
                                          item.id,
                                        ],
                                      });
                                    }
                                  } else {
                                    // Remove item and all its variants
                                    setNewOfferGroup({
                                      ...newOfferGroup,
                                      menuItemIds: newOfferGroup.menuItemIds.filter(
                                        (id) => id !== item.id && !id.startsWith(`${item.id}|`)
                                      ),
                                    });
                                  }
                                }}
                              />
                              <Label
                                className="text-sm cursor-pointer flex-1"
                                htmlFor={`item-${item.id}`}
                              >
                                {item.name} - {hasVariants ? 
                                  `₹${item.variants?.sort((a, b) => (a.price || 0) - (b.price || 0))[0]?.price?.toFixed(2) || "0.00"} (${item.variants?.length || 0} variants)` : 
                                  `₹${item.price?.toFixed(2) || "0.00"}`
                                }
                              </Label>
                            </div>

                            {/* Variants dropdown for items with variants */}
                            {hasVariants && (
                              <div className="ml-6 space-y-1">
                                {item.variants?.map((variant) => {
                                  const variantId = `${item.id}|${variant.name}`;
                                  const isVariantSelected = newOfferGroup.menuItemIds.includes(variantId);
                                  
                                  return (
                                    <div
                                      key={variantId}
                                      className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded"
                                    >
                                      <Checkbox
                                        id={`variant-${variantId}`}
                                        checked={isVariantSelected}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setNewOfferGroup({
                                              ...newOfferGroup,
                                              menuItemIds: [
                                                ...newOfferGroup.menuItemIds,
                                                variantId,
                                              ],
                                            });
                                          } else {
                                            setNewOfferGroup({
                                              ...newOfferGroup,
                                              menuItemIds: newOfferGroup.menuItemIds.filter(
                                                (id) => id !== variantId
                                              ),
                                            });
                                          }
                                        }}
                                      />
                                      <Label
                                        className="text-xs cursor-pointer flex-1"
                                        htmlFor={`variant-${variantId}`}
                                      >
                                        {variant.name} - ₹{variant.price?.toFixed(2) || "0.00"}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {getFilteredItems().length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No items found matching "{itemSearch}"
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {newOfferGroup.menuItemIds.length} items selected
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="offerGroupDiscount">
                  Offer discount percentage (1-100)
                </Label>
                <Input
                  ref={offerGroupDiscountRef}
                  id="offerGroupDiscount"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Enter offer discount percentage"
                  value={newOfferGroup.percentage}
                  onChange={(e) =>
                    setNewOfferGroup({
                      ...newOfferGroup,
                      percentage: e.target.value,
                    })
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offerGroupName">Offer Title</Label>
                <Input
                  ref={offerGroupNameRef}
                  id="offerGroupName"
                  placeholder="Enter offer title"
                  value={newOfferGroup.name}
                  onChange={(e) =>
                    setNewOfferGroup({ ...newOfferGroup, name: e.target.value })
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offerGroupDetails">Offer Details</Label>
                <Input
                  ref={offerGroupDescriptionRef}
                  id="offerGroupDetails"
                  placeholder="Enter offer details"
                  value={newOfferGroup.description}
                  onChange={(e) =>
                    setNewOfferGroup({
                      ...newOfferGroup,
                      description: e.target.value,
                    })
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </>
          )}

          {!isOfferTypeGroup && !isCustomOffer && (
            <div>
              <div className="space-y-2">
                <Label htmlFor="menuItem">Select Menu Item</Label>
                <Select
                  value={newOffer.menuItemId}
                  onValueChange={(value) => {
                    setNewOffer({ ...newOffer, menuItemId: value });
                    const selectedItem = items.find(
                      (item) => item.id === value
                    );
                    setSelectedItem(selectedItem || null);
                    // Reset variant selection when item changes
                    setSelectedVariant("");
                    // Force close keyboard if open
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                >
                  <SelectTrigger id="menuItem">
                    <SelectValue placeholder="Search and select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search items..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="mb-2"
                        onKeyDown={(e) => {
                          // Prevent dropdown navigation when typing in search
                          e.stopPropagation();
                        }}
                        onFocus={(e) => {
                          // Prevent dropdown from closing when search input is focused
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          // Prevent dropdown from closing when clicking search input
                          e.stopPropagation();
                        }}
                      />
                    </div>
                    {getFilteredItems().map((item) => (
                      <SelectItem key={item.id} value={item.id as string}>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-gray-500">
                            {item.category?.name} - {item.variants && item.variants.length > 0 ? 
                              `${item.variants.length} variants` : 
                              `₹${item.price?.toFixed(2) || "0.00"}`
                            }
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {getFilteredItems().length === 0 && (
                      <div className="px-2 py-1 text-sm text-gray-500">
                        No items found matching "{itemSearch}"
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Show original price for items without variants */}
              {slectedItem && (!slectedItem.variants || slectedItem.variants.length === 0) && (
                <div className="space-y-2">
                  <Label>Original Price</Label>
                  <div className="p-3 bg-gray-50 rounded border text-sm">
                    <p className="font-medium">₹{slectedItem.price?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              )}

              {/* Variant Selection - Show only if selected item has variants */}
              {slectedItem?.variants && slectedItem.variants.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="variant">Select Variant</Label>
                  <Select
                    value={selectedVariant}
                    onValueChange={(value) => {
                      setSelectedVariant(value);
                      // Update the new price to match the selected variant's price
                      const variant = slectedItem.variants?.find(v => v.name === value);
                      if (variant) {
                        setNewOffer({ ...newOffer, newPrice: variant.price.toString() });
                      }
                    }}
                  >
                    <SelectTrigger id="variant">
                      <SelectValue placeholder="Select a variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {slectedItem.variants.map((variant) => (
                        <SelectItem key={variant.name} value={variant.name}>
                          {variant.name} - ₹{variant.price?.toFixed(2) || "0.00"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show old price when variant is selected */}
              {selectedVariant && slectedItem?.variants && (
                <div className="space-y-2">
                  <Label>Original Price</Label>
                  <div className="p-3 bg-gray-50 rounded border text-sm">
                    <p className="font-medium">
                      ₹{(() => {
                        const variant = slectedItem.variants.find(v => v.name === selectedVariant);
                        // Always show the variant price as original price when a variant is selected
                        if (variant && variant.price !== undefined && variant.price !== null) {
                          return variant.price.toFixed(2);
                        }
                        return "0.00";
                      })()}
                    </p>
                    <p className="text-gray-600">for {selectedVariant} variant</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPrice">
                  {newOffer.offerType === "custom" ? "Offer Price in ₹" : "New Price in ₹"}
                </Label>
                <Input
                  ref={priceInputRef}
                  id="newPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter new price"
                  value={newOffer.newPrice}
                  onChange={(e) =>
                    setNewOffer({ ...newOffer, newPrice: e.target.value })
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemsAvailable">
                  Number of Items Available
                </Label>
                <Input
                  ref={itemsInputRef}
                  id="itemsAvailable"
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={newOffer.itemsAvailable}
                  onChange={(e) =>
                    setNewOffer({ ...newOffer, itemsAvailable: e.target.value })
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fromTime">From Time</Label>
            <Input
              ref={fromTimeInputRef}
              id="fromTime"
              type="datetime-local"
              value={newOffer.fromTime}
              onChange={(e) =>
                setNewOffer({ ...newOffer, fromTime: e.target.value })
              }
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toTime">To Time</Label>
            <Input
              ref={toTimeInputRef}
              id="toTime"
              type="datetime-local"
              value={newOffer.toTime}
              onChange={(e) =>
                setNewOffer({ ...newOffer, toTime: e.target.value })
              }
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>

          <div className="border-t-2 border-black/10 pt-4">
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <h1 className="font-medium mb-4 text-base">
                    Notification Settings
                  </h1>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notificationTitle">Title</Label>
                    <Input
                      ref={notificationTitleRef}
                      id="notificationTitle"
                      placeholder={getNotificationTitle()}
                      value={notificationMessage?.title || ""}
                      onChange={(e) =>
                        setNotificationMessage({
                          ...notificationMessage,
                          title: e.target.value,
                        })
                      }
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notificationBody">Description</Label>
                    <Input
                      ref={notificationBodyRef}
                      id="notificationBody"
                      placeholder={getNotificationBody()}
                      value={notificationMessage?.body || ""}
                      onChange={(e) =>
                        setNotificationMessage({
                          ...notificationMessage,
                          body: e.target.value,
                        })
                      }
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onCancel} type="button">
              Cancel
            </Button>
            <Button
              disabled={isSubmitting}
              type="submit"
              form="create-offer-form"
              className="bg-orange-600"
            >
              {isSubmitting ? "Creating..." : "Create Offer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}