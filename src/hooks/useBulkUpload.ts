"use client";

import { useState, useEffect } from "react";
import { MenuItem } from "@/components/bulkMenuUpload/EditItemModal";
import { MenuItem as MenuItemStore } from "@/store/menuStore_hasura";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useMenuStore } from "@/store/menuStore_hasura";
import { getImageSource } from "@/lib/getImageSource";
import axios from "axios";
import { GoogleGenerativeAI, Schema } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export const useBulkUpload = () => {
  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { userData } = useAuthStore();
  const {
    addItem,
    items: menu,
    fetchMenu,
    fetchCategorieImages,
  } = useMenuStore();
  const [editingItem, setEditingItem] = useState<{
    index: number;
    item: MenuItem;
  } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [extractedMenuItems, setExtractedMenuItems] = useState<string>("");
  const [isExtractingMenu, setIsExtractingMenu] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [menuImageFiles, setMenuImageFiles] = useState<File[]>([]);
  const [menuImagePreviews , setMenuImagePreviews] = useState<string[]>([]);

  const validateMenuItem = (item: MenuItem) => {
    if (!item.name || typeof item.name !== "string") {
      throw new Error("Name is required and must be a string");
    }
    if (
      !item.price ||
      typeof Number(item.price) !== "number" ||
      isNaN(Number(item.price))
    ) {
      throw new Error("Price is required and must be a number");
    }

    return {
      ...item,
      price: Number(item.price),
    };
  };

  useEffect(() => {
    if (userData?.role === "partner") {
      fetchMenu();
    }
  }, [fetchMenu, userData?.role]);

  useEffect(() => {
    const savedItems = localStorage?.getItem("bulkMenuItems");
    const savedJsonInput = localStorage?.getItem("jsonInput");
    if (savedJsonInput) {
      setJsonInput(savedJsonInput);
    }
    if (savedItems) {
      const items = JSON.parse(savedItems);
      const updatedItems = items.map((item: MenuItem) => ({
        ...item,
        isAdded: menu.some(
          (menuItem) =>
            menuItem.name === item.name &&
            menuItem.price === item.price &&
            menuItem.description === item.description
        ),
      }));
      setMenuItems(updatedItems);
    }
  }, [menu]);

  // const delay = (ms: number) =>
  //   new Promise((resolve) => setTimeout(resolve, ms));

  const handleJsonSubmit = async (jsonMenu?: string) => {
    try {
      const parsedItems = JSON.parse(jsonMenu || jsonInput);
      localStorage?.setItem("jsonInput", jsonMenu || jsonInput);
      const items = Array.isArray(parsedItems) ? parsedItems : [parsedItems];

      items.forEach(validateMenuItem);

      const initialItems = items.map((item) => ({
        ...validateMenuItem(item),
        image: item.image || "",
        isSelected: false,
        isAdded: false,
        category: {
          name: item.category,
          id: item.category,
          priority: 0,
        },
        variants: item.variants || [],
      }));

      setMenuItems(initialItems);
      localStorage?.setItem("bulkMenuItems", JSON.stringify(initialItems));

      toast.success("All items processed successfully!");
    } catch (error) {
      console.error("Error processing JSON:", error);
      toast.error(
        error instanceof Error ? error.message : "Invalid JSON format"
      );
    }
  };

  const handleClear = () => {
    setMenuItems([]);
    setJsonInput("");
    localStorage?.removeItem("bulkMenuItems");
    localStorage?.removeItem("jsonInput");
  };

  const handleHotelSelect = async (hotelId: string) => {
    await fetchMenu(hotelId);
  };

  const handleAddToMenu = async (
    item: MenuItem,
    index: number,
    hotelId?: string
  ) => {
    if (!item.category) {
      toast.error("Please select a category first");
      return;
    }

    setIsUploading((prev) => ({ ...prev, [index]: true }));
    try {
      const convertImageToLocalBlob = async (url: string) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      };

      let image_url = item.image;

      if (image_url.length > 0) {
        image_url = await convertImageToLocalBlob(item.image);
      }

      const newItem = {
        name: item.name,
        price: item.price,
        image_url: image_url,
        image_source: getImageSource(item.image),
        description: item.description,
        category: item.category,
        variants: item.variants || [],
        is_price_as_per_size: item.is_price_as_per_size || false,
      } as Omit<MenuItemStore, "id">;

      await addItem(newItem);

      const updatedItems = [...menuItems];
      updatedItems[index] = { ...updatedItems[index], isAdded: true };
      setMenuItems(updatedItems);
      localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
      fetchMenu(hotelId);
      toast.success("Item added to menu successfully!");
    } catch (error) {
      console.error("Error adding item to menu:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add item to menu"
      );
    } finally {
      setIsUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleDelete = (index: number) => {
    const updatedItems = menuItems.filter((_, i) => i !== index);
    setMenuItems(updatedItems);
    localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    const updatedItems = menuItems.map((item) => ({
      ...item,
      isSelected: newSelectAll,
    }));
    setMenuItems(updatedItems);
    localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
  };

  const handleSelectItem = (index: number) => {
    if (!menuItems[index].category) {
      toast.error("Please select a category first");
      return;
    }
    const updatedItems = [...menuItems];
    updatedItems[index] = {
      ...updatedItems[index],
      isSelected: !updatedItems[index].isSelected,
    };
    setMenuItems(updatedItems);
    localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
  };

  const handleUploadSelected = async (hotelId?: string) => {
    if (!hotelId && userData?.role === "superadmin") {
      toast.error("Please select a hotel first");
      return;
    }

    const selectedItems = menuItems.filter(
      (item) => item.isSelected && !item.isAdded
    );

    if (selectedItems.length === 0) {
      toast.error("Please select items to upload");
      return;
    }

    const itemsWithoutCategory = selectedItems.filter((item) => !item.category);
    if (itemsWithoutCategory.length > 0) {
      toast.error("All selected items must have a category");
      return;
    }

    setIsBulkUploading(true);
    try {
      for (const item of selectedItems) {
        const index = menuItems.indexOf(item);
        await handleAddToMenu(item, index, hotelId);
      }

      toast.success("All selected items uploaded successfully!");
    } catch (error) {
      console.error("Error uploading items:", error);
      toast.error("Failed to upload some items");
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleEdit = (index: number, item: MenuItem) => {
    console.log("item", item);
    setEditingItem({ index, item });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (editingItem) {
      try {
        const validatedItem = validateMenuItem(editingItem.item);
        const updatedItems = [...menuItems];

        if (!validatedItem.image) {
          // const urls = await getMenuItemImage(
          //   validatedItem.category,
          //   validatedItem.name
          // );
          const urls: string[] = [];
          if (urls && urls.length > 0) {
            validatedItem.image = urls[0];
          }
        }

        updatedItems[editingItem.index] = validatedItem;
        setMenuItems(updatedItems);
        localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
        setEditingItem(null);
        setIsEditModalOpen(false);
      } catch (err) {
        console.error("Error saving edit:", err);
        toast.error(err instanceof Error ? err.message : "Invalid item data");
      }
    }
  };

  const handleMenuItemClick = async (
    item: MenuItem,
    index: number,
    hotelId?: string
  ) => {
    if (!hotelId && userData?.role === "superadmin") {
      toast.error("Please select a hotel first");
      return;
    }
    await handleAddToMenu(item, index, hotelId);
  };

  const handleCategoryChange = async (
    index: number,
    category: { name: string; id: string; priority: number }
  ) => {
    const updatedItems = [...menuItems];
    updatedItems[index] = {
      ...updatedItems[index],
      category,
      image: "/loading-image.gif",
    };

    setMenuItems(updatedItems);

    try {
      const urls = (await fetchCategorieImages(category.name)).map(
        (img) => img.image_url
      );
      if (urls && urls.length > 0) {
        updatedItems[index].image = urls[0];
        setMenuItems([...updatedItems]);
        localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
      }
    } catch (error) {
      console.error("Error fetching image:", error);
      toast.error("Failed to fetch image for the new category");
    }
  };

  const handleImageClick = async (index: number, newImage?: string) => {
    if (newImage) {
      const updatedItems = [...menuItems];
      updatedItems[index] = {
        ...updatedItems[index],
        image: newImage,
      };
      setMenuItems(updatedItems);
      localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
    }
  };

  const BATCH_SIZE = 2;

  const processBatch = async (
    endpoint: string,
    items: MenuItem[],
    successMessage: string
  ) => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/image-gen/${endpoint}`,
        items.map((item) => ({
          ...item,
          name : item.name
        })),
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      throw new Error(`Invalid response from ${endpoint} server`);
    } catch (err) {
      console.error(
        `${endpoint} error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      throw err;
    }
  };

  const handleBatchImageGeneration = async (
    endpoint: string,
    successMessage: string
  ) => {
    if (!menuItems) return;

    setLoading(true);
    const totalItems = menuItems.length;
    let updatedItems = [...menuItems];
    let processedCount = 0;

    try {
      // Process in batches
      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batch = menuItems.slice(i, i + BATCH_SIZE);

        toast.info(
          `Processing items ${i + 1}-${Math.min(
            i + BATCH_SIZE,
            totalItems
          )} of ${totalItems}...`
        );

        const batchResults = await processBatch(
          endpoint,
          batch,
          successMessage
        );
        updatedItems = updatedItems.map((item, index) =>
          index >= i && index < i + BATCH_SIZE ? batchResults[index - i] : item
        );

        processedCount += batch.length;
        setMenuItems([...updatedItems]);
        localStorage?.setItem("bulkMenuItems", JSON.stringify(updatedItems));
      }

      toast.success(successMessage);
    } catch (err) {
      console.error(
        `Batch processing error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      toast.error(
        `Failed to generate images. Processed ${processedCount} of ${totalItems} items.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExtractMenuItemsFromImage = async (retryCount = 0) => {
    try {
      toast.loading(
        retryCount > 0
          ? `Retrying menu extraction (attempt ${
              retryCount + 1
            }/${MAX_RETRIES})...`
          : "Extracting menu items..."
      );

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "number" },
                description: { type: "string" },
                category: { type: "string" },
                variants: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      price: { type: "number" },
                    },
                    required: ["name", "price"],
                  },
                },
              },
              required: ["name", "price", "description", "category"],
            },
          } as Schema,
        },
      });

      const prompt = `Extract each distinct dish as a separate item from the provided images. 
A 'variant' applies *only* to different sizes (e.g., Quarter, Half, Full, Small, Large, Regular) or quantities of the *same specific menu item*. 
If a menu item does not have these explicit size/quantity options, it should *not* have a 'variants' field. 
For example, 'Fresh Lime' and 'Mint Lime' are separate items, not variants of a general 'Lime Juice'.

For each item, provide:
- name: The name of the dish.
- price: The minimum price if variants exist, otherwise the item's price. Price must be a number, greater than zero. Use 1 if no price is found.
- description: A descriptive sentence for each item, maximum 10 words. Elaborate on the item's name and its category, highlighting key attributes like freshness, flavor, or main ingredients. For example:
    - For 'Watermelon' under 'Fresh Juice': "A refreshing juice made from ripe, sweet watermelon, perfectly hydrating and a great choice on a hot day."
    - For 'Carrot' under 'Pure Juice': "Experience the pure, wholesome goodness of freshly extracted carrot juice, packed with vitamins and natural sweetness."
    - For 'Fresh Lime' under 'Lime Juice': "Enjoy a classic, zesty Fresh Lime juice, perfectly balanced and incredibly invigorating, a timeless favorite."
- category: The main heading under which the item is listed.
- variants: (Optional) An array of objects, each with 'name' and 'price', if the item has different sizes/portions. Variants must be arranged in ascending order of price. Variants should not contain item names or descriptions, only sizes/quantities. If no variants exist, this field should be omitted.
- invalid variants example : Variants:
Grilled veg overloaded fries
₹150
Scrambled egg overloaded fries
₹180
Pulled Chicken overloaded fries
₹240
Pulled Mixed loaded fries
₹300
- valid variants example : Variants:
Variants:
2 pieces Combo
₹169
4 pieces Combo
₹399
8 pieces Combo
₹799
-take the largest text above the items as the category name if the variants is aaslo items`;

      const imageParts = await Promise.all(
        menuImageFiles.map(async (file) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(file);
          });
          return { inlineData: { data: base64, mimeType: file.type } };
        })
      );

      const result = await model.generateContent([prompt, ...imageParts]);
      const parsedMenu = result.response.text();

      setExtractedMenuItems(parsedMenu);
      setJsonInput(parsedMenu);
      setIsExtractingMenu(false);
      setExtractionError(null);
      toast.dismiss();
      toast.success(`Extracted ${parsedMenu.length} menu items`);
      handleJsonSubmit(parsedMenu);
      return parsedMenu;
    } catch (error) {
      toast.dismiss();

      console.error("Menu extraction error:", error);

      if (retryCount < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (retryCount + 1))
        );
        return handleExtractMenuItemsFromImage(retryCount + 1);
      }

      const errorMsg =
        "Failed to extract menu after multiple attempts. Please try again.";

      setIsExtractingMenu(false);
      setExtractionError(errorMsg);

      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

   const handleMenuImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const filesArray = Array.from(e.target.files);
        setMenuImageFiles(filesArray);
        const previews = filesArray.map((file) => URL.createObjectURL(file));
        setMenuImagePreviews(previews);
      }
    };

  // Updated handlers
  const handleGenerateImages = () =>
    handleBatchImageGeneration(
      "fullImages",
      "Full images generated successfully!"
    );
  const handlePartialImageGeneration = () =>
    handleBatchImageGeneration(
      "partialImages",
      "Partial images generated successfully!"
    );
  const handleGenerateAIImages = () =>
    handleBatchImageGeneration(
      "generateAIImages",
      "AI images generated successfully!"
    );

  return {
    loading,
    setLoading,
    jsonInput,
    setJsonInput,
    menuItems,
    selectAll,
    editingItem,
    setEditingItem,
    isEditModalOpen,
    setIsEditModalOpen,
    isUploading,
    isBulkUploading,
    handleJsonSubmit,
    handleClear,
    handleAddToMenu: handleMenuItemClick,
    handleDelete,
    handleSelectAll,
    handleSelectItem,
    handleUploadSelected,
    handleEdit,
    handleSaveEdit,
    handleImageClick,
    handleHotelSelect,
    handleCategoryChange,
    handleGenerateImages,
    handlePartialImageGeneration,
    handleGenerateAIImages,
    handleExtractMenuItemsFromImage,
    isExtractingMenu,
    setIsExtractingMenu,
    extractedMenuItems,
    setExtractedMenuItems,
    extractionError,
    setExtractionError,
    menuImageFiles,
    setMenuImageFiles,
    menuImagePreviews,
    handleMenuImagesChange,
  };
};
