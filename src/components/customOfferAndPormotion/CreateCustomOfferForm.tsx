"use client";
import { useAuthStore } from "@/store/authStore";
// import { MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { useMenuStore } from "@/store/menuStore_hasura";
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
// import { Checkbox } from "../ui/checkbox";
// import { OfferGroup } from "@/store/offerStore_hasura";
import { formatDate } from "@/lib/formatDate";
import { OfferGroup, useOfferStore } from "@/store/offerStore_hasura";
import { useRouter } from "next/navigation";
import { MultipleImageUploader } from "./MultipleImageUploader";
// import { get } from "http";

export function CreateCustomOfferForm() {
  const { items } = useMenuStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [newOffer, setNewOffer] = useState({
    menuItemId: "",
    newPrice: "",
    itemsAvailable: "",
    fromTime: "",
    toTime: "",
    offerType: "all", // This refers to the display targeting (All, Delivery, Dine-in)
  });

  /* --- Commented out state for Single and Group offers ---
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [newOfferGroup, setNewOfferGroup] = useState({
    name: "",
    categoryId: "",
    description: "",
    percentage: "",
    menuItemIds: [] as string[],
  });
  const [slectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isOfferTypeGroup, setIsOfferGroup] = useState(false);
  const [groupType, setGroupType] = useState<
    "category" | "all" | "select" | undefined
  >(undefined);
  const [itemSearch, setItemSearch] = useState("");
  */

  // Forcing the form into "Custom Offer" mode by default.
  const [isCustomOffer, setIsCustomOffer] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Custom menu item state
  const [customMenuItem, setCustomMenuItem] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    image_urls: imageUrls, 
  });

  const { userData } = useAuthStore();

  // Create refs for the form fields
  const priceInputRef = useRef<HTMLInputElement>(null);
  const itemsInputRef = useRef<HTMLInputElement>(null);
  const fromTimeInputRef = useRef<HTMLInputElement>(null);
  const toTimeInputRef = useRef<HTMLInputElement>(null);

  const notificationTitleRef = useRef<HTMLInputElement>(null);
  const notificationBodyRef = useRef<HTMLInputElement>(null);

  /* --- Commented out refs for Group offers ---
  const offerGroupDiscountRef = useRef<HTMLInputElement>(null);
  const offerGroupNameRef = useRef<HTMLInputElement>(null);
  const offerGroupDescriptionRef = useRef<HTMLInputElement>(null);
  */

  useEffect(() => {
    setCustomMenuItem((prev) => ({
      ...prev,
      image_url: imageUrls[0] || "",
      image_urls: imageUrls,
    }));
  }, [imageUrls]);

  useEffect(() => {
    setNewOffer((newOffer) => ({
      ...newOffer,
      fromTime: new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16),
      toTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
    }));
  }, []);

  const [notificationMessage, setNotificationMessage] = useState<{
    title?: string;
    body?: string;
  } | null>(null);

  const { addOffer } = useOfferStore();

  const router = useRouter();

  const onCancel = () => {
    router.push("/create-offer-promotion");
  };

  const onSubmit = async (
    offer: {
      menu_id?: string;
      offer_price?: number;
      items_available?: number;
      start_time: string;
      end_time: string;
      image_urls?: string[];
      offer_group?: OfferGroup;
      variant?: {
        name: string;
        price: number;
      };
    },
    notificationMessage: {
      title: string;
      body: string;
    }
  ) => {
    await addOffer(offer, notificationMessage);
    onCancel();
  };

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

  // This function now only validates custom item offers
const validateCustomItemOffer = () => {
  // Custom offer validation
  if (!customMenuItem.name.trim()) {
    toast.error("Please enter item name");
    return false;
  }

  // --- MODIFIED PRICE VALIDATION ---

  const hasOriginalPrice = customMenuItem.price && String(customMenuItem.price).trim() !== '';
  const hasNewPrice = newOffer.newPrice && String(newOffer.newPrice).trim() !== '';

  let originalPrice = NaN;
  let offerPrice = NaN;

  // 1. Validate Original Price if it exists
  if (hasOriginalPrice) {
    originalPrice = parseFloat(customMenuItem.price);
    if (isNaN(originalPrice)) {
      toast.error("Please enter a valid original price");
      return false;
    }
    if (originalPrice <= 0) {
      toast.error("Original price must be greater than 0");
      return false;
    }
  }

  // 2. Validate New Price if it exists
  if (hasNewPrice) {
    offerPrice = parseFloat(newOffer.newPrice);
    if (isNaN(offerPrice)) {
      toast.error("Please enter a valid new price");
      return false;
    }
    // It's good practice to ensure the offer price is also positive
    if (offerPrice <= 0) {
        toast.error("Offer price must be greater than 0");
        return false;
    }
  }

  // 3. Compare prices only if BOTH were provided and are valid numbers
  if (hasOriginalPrice && hasNewPrice) {
    if (offerPrice >= originalPrice) {
      toast.error("Offer price must be less than original price");
      return false;
    }
  }

  // --- END OF MODIFIED PRICE VALIDATION ---

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

  /* --- Commented out: Validation logic for Group offers ---
  const validateGroupItemOffer = () => {
    // ...
  };
  */

  /* --- Commented out: Helper functions for single/group offers ---
  const getAllItems = () => {
    return items || [];
  };

  const getFilteredItems = () => {
    // ...
  };

  const getItemsByCategory = (categoryId: string) => {
    // ...
  };
  */

  const getNotificationTitle = () => {
    /* --- Commented out: Logic for Group offers ---
    if (isOfferTypeGroup) {
      return `🎉 ${newOfferGroup.name} - Exclusive Offer at ${
        (userData as HotelData)?.store_name || "Our Store"
      }!`;
    } else {
    */
    // Adjusted to use customMenuItem state for the new item's name
    return `🔥 ${
      customMenuItem.name || "Special Item"
    } - Limited-Time Deal at ${
      (userData as HotelData)?.store_name || "Our Store"
    }!`;
    /*
    }
    */
  };

  const getNotificationBody = () => {
    /* --- Commented out: Logic for Group offers ---
    if (isOfferTypeGroup) {
      // ...
    } else {
    */
    // Adjusted to use customMenuItem state for the original price
    const originalPrice = parseFloat(customMenuItem.price) || 0;

    return `Check out the new offer: ${customMenuItem.name} - Now just ${
      (userData as HotelData)?.currency ?? "₹"
    }${newOffer.newPrice} (was ${
      (userData as HotelData)?.currency ?? "₹"
    }${originalPrice.toFixed(2)}). Valid until ${formatDate(newOffer.toTime)}.`;
    /*
    }
    */
  };

  // Helper function to get or create custom category
  const getOrCreateCustomCategory = async (): Promise<string> => {
    // First, check if custom category already exists
    const customCategory = categories.find(
      (cat) => cat.name.toLowerCase() === "custom"
    );

    if (customCategory) {
      return customCategory.id;
    }

    // If not found, create it
    const { fetchFromHasura } = await import("@/lib/hasuraClient");
    const { addCategory } = await import("@/api/category");

    const categoryData = {
      name: "custom",
      partner_id: userData?.id,
      is_active: false, // Hidden category
      priority: 999, // Low priority
    };

    const result = await fetchFromHasura(addCategory, {
      category: [categoryData],
    });

    return result.insert_category.returning[0].id;
  };

  // Helper function to create custom menu item
  const createCustomMenuItem = async (menuItemData: any) => {
    const { fetchFromHasura } = await import("@/lib/hasuraClient");
    const { addMenu } = await import("@/api/menu");

    const result = await fetchFromHasura(addMenu, {
      menu: [menuItemData],
    });

    return result.insert_menu.returning[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simplified validation logic for only custom offers
    if (!validateCustomItemOffer()) {
      setIsSubmitting(false);
      return;
    }
    /* --- Commented out: Original validation logic for multiple offer types ---
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
    */

    const notificationMessage = {
      title:
        notificationTitleRef.current?.value || getNotificationTitle() || "",
      body: notificationBodyRef.current?.value || getNotificationBody() || "",
    };

    // Comprehensive logging of all form data
    console.log("=== CREATE CUSTOM OFFER FORM DATA ===");
    console.log("Custom Menu Item:", customMenuItem);
    console.log("New Offer Details:", newOffer);
    console.log("Notification Message:", notificationMessage);

    try {
      // The main logic is now only for custom offer creation.
      if (isCustomOffer) {
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
            image_urls: customMenuItem.image_urls || [],
            // The offer_type here refers to display settings (all, delivery, dine_in)
            offer_type: newOffer.offerType,
          };

          await onSubmit(offerData, notificationMessage);
        }
        /* --- Commented out: Logic for Single and Group offers ---
      } else if (!isOfferTypeGroup) {
        // ... logic for single item offer
      } else {
        // ... logic for group offer
      }
      */
      }
    } catch (error) {
      toast.error("Failed to create offer");
      console.error(error);
    }

    setIsSubmitting(false);
  };

  /* --- Commented out: Unneeded useEffects for other offer types ---
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
  */

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg p-6 py-10 mb-8">
      <h2 className="text-2xl font-bold mb-4">Create Offer</h2>
      <div ref={formContainerRef}>
        <form
          id="create-offer-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* --- Commented out: Offer Type selection dropdown is no longer needed --- */}
          {/*
          <div className="space-y-2">
            <Label htmlFor="offerType">Offer Type</Label>
            <Select
              value={isCustomOffer ? "custom" : (isOfferTypeGroup ? "group" : "single")}
              onValueChange={(value) => {
                setIsOfferGroup(value === "group");
                setIsCustomOffer(value === "custom");
                
                if (value === "single") {
                  // ... reset logic
                } else if (value === "custom") {
                  // ... reset logic
                } else {
                  // ... reset logic
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
          */}

          {/* <div className="space-y-2">
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
                <SelectItem value="all">
                  All (Hotels, Offers, QR Scan)
                </SelectItem>
                <SelectItem value="delivery">
                  Delivery Only (Hotels, Offers)
                </SelectItem>
                <SelectItem value="dine_in">Dine-In Only (QR Scan)</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* Custom Menu Item Form */}
          {isCustomOffer && (
            <>
              {/* <div className="space-y-4 p-4 border rounded-lg bg-blue-50"> */}
              <div className="space-y-4">
                {/* <h3 className="text-lg font-semibold text-blue-800">
                  Create New Menu Item for Offer
                </h3> */}

                <div className="space-y-2">
                  <Label htmlFor="customItemName">Item Name *</Label>
                  <Input
                    id="customItemName"
                    type="text"
                    placeholder="Enter item name"
                    value={customMenuItem.name}
                    onChange={(e) =>
                      setCustomMenuItem({
                        ...customMenuItem,
                        name: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setCustomMenuItem({
                        ...customMenuItem,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customItemPrice">Original Price </Label>
                  <Input
                    id="customItemPrice"
                    type="number"
                    placeholder="Enter original price"
                    value={customMenuItem.price}
                    onChange={(e) =>
                      setCustomMenuItem({
                        ...customMenuItem,
                        price: e.target.value,
                      })
                    }
                    
                  />
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="customItemImage">Image URL (Optional)</Label>
                  <Input
                    id="customItemImage"
                    type="url"
                    placeholder="Enter image URL"
                    value={customMenuItem.image_url}
                    onChange={(e) =>
                      setCustomMenuItem({
                        ...customMenuItem,
                        image_url: e.target.value,
                      })
                    }
                  />
                </div> */}
              </div>
              {/* Offer details fields are now part of the custom offer flow */}
              <div className="space-y-2">
                <Label htmlFor="newPrice">Offer Price in ₹</Label>
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
            </>
          )}

          {/* --- Commented out: Offer Group form section --- */}
          {/*
          {isOfferTypeGroup && (
            <>
              // ... group offer UI
            </>
          )}
          */}

          {/* --- Commented out: Single Item Offer form section --- */}
          {/*
          {!isOfferTypeGroup && !isCustomOffer && (
            <div>
              // ... single item offer UI
            </div>
          )}
          */}

          <div className="space-y-2">
            <Label htmlFor="fromTime">From Time *</Label>
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
            <Label htmlFor="toTime">To Time *</Label>
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

          {/* <div className="border-t-2 border-black/10 pt-4">
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
          </div> */}

          <div>
            <Label className="block mt-2">Upload Images (Optional)</Label>
            <MultipleImageUploader setImageUrls={setImageUrls} />
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
