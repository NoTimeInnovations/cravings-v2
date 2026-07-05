"use client";

import { useState, useEffect } from "react";
import { MenuItem } from "@/components/bulkMenuUpload/EditItemModal";
import { MenuItem as MenuItemStore } from "@/store/menuStore_hasura";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useMenuStore } from "@/store/menuStore_hasura";
import { getImageSource } from "@/lib/getImageSource";
import axios from "axios";
import { extractMenuFromFiles } from "@/lib/menu/menuExtraction";

interface UseBulkUploadProps {
  onProgress?: (current: number, total: number) => void;
  allowZeroPrice?: boolean;
}

export const sanitizeForImageGen = (text: string): string => {
  return text.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
};

export const useBulkUpload = (props?: UseBulkUploadProps) => {
  const { onProgress, allowZeroPrice = false } = props || {};
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
  const [menuImagePreviews, setMenuImagePreviews] = useState<string[]>([]);

  // Sync previews with files
  useEffect(() => {
      const newPreviews = menuImageFiles.map(file => URL.createObjectURL(file));
      setMenuImagePreviews(newPreviews);
      return () => newPreviews.forEach(url => URL.revokeObjectURL(url));
  }, [menuImageFiles]);

  const validateMenuItem = (item: MenuItem) => {
    if (!item.name || typeof item.name !== "string") {
      throw new Error("Name is required and must be a string");
    }

    // Check price based on allowZeroPrice flag
    const price = Number(item.price);
    if (typeof price !== "number" || isNaN(price)) {
      throw new Error("Price is required and must be a number");
    }

    if (!allowZeroPrice && price <= 0) {
      // Check if previous logic allowed negative prices? The original logic was !item.price which fails for 0.
      // Original: !item.price || typeof Number(item.price) !== "number" || isNaN(Number(item.price))
      // if item.price is 0, !0 is true. So it was failing for 0.
      throw new Error("Price must be greater than 0");
    }

    return {
      ...item,
      price: price,
    };
  };



  useEffect(() => {
    if (userData?.role === "partner") {
      fetchMenu();
    }
  }, [fetchMenu, userData?.role]);

  useEffect(() => {
    const loadItemsFromStorage = () => {
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
    };

    // Load on mount
    loadItemsFromStorage();

    // Listen for custom event to reload items
    const handleBulkMenuItemsUpdated = () => {
      console.log('Reloading bulk menu items from localStorage...');
      loadItemsFromStorage();
    };

    window.addEventListener('bulkMenuItemsUpdated', handleBulkMenuItemsUpdated);

    return () => {
      window.removeEventListener('bulkMenuItemsUpdated', handleBulkMenuItemsUpdated);
    };
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

  const processBatch = async (
    endpoint: string,
    items: MenuItem[],
    successMessage: string,
    onProgress?: (current: number, total: number) => void
  ) => {
    try {
      // Get user's geolocation or use default coordinates
      const lat = "28.6139"; // Default to Delhi, India
      const lng = "77.2090";

      // Extract all item names and sanitize them
      const itemNames = items.map((item) => sanitizeForImageGen(item.name));

      // Use the images-v2 endpoint for batch processing
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/images-v2`,
        {
          lat,
          lng,
          itemNames,
          partnerEmail: userData?.email || "default@partner.com"
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      // Poll for results
      const pollInterval = 2000; // 2 seconds
      const maxPolls = 60; // Max 2 minutes
      let pollCount = 0;

      while (pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pingResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/images-v2/ping`,
          {
            params: { partner: userData?.email || "default@partner.com" }
          }
        );

        const { status, processedNumber } = pingResponse.data;

        // Update progress via callback
        if (onProgress) {
          onProgress(processedNumber || 0, items.length);
        } else {
          toast.info(`Processing: ${processedNumber}/${items.length} items completed`);
        }

        if (status === "completed") {
          // Get the results
          const resultsResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/images-v2/get`,
            {
              params: { partner: userData?.email || "default@partner.com" }
            }
          );

          // Transform results to match expected format
          const results = items.map(item => {
            const itemName = sanitizeForImageGen(item.name);
            const imageUrls = resultsResponse.data[itemName] || [];
            return {
              ...item,
              image: imageUrls[0] || "",
              extra_images: imageUrls
            };
          });

          localStorage.removeItem('imageProcessingState');
          return results;
        } else if (status === "failed") {
          localStorage.removeItem('imageProcessingState');
          throw new Error("Image generation failed");
        }

        pollCount++;
      }

      localStorage.removeItem('imageProcessingState');
      throw new Error("Timeout waiting for image generation");
    } catch (err) {
      console.error(
        `${endpoint} error: ${err instanceof Error ? err.message : "Unknown error"
        }`
      );
      throw err;
    }
  };

  const handleBatchImageGeneration = async (
    endpoint: string,
    successMessage: string,
    onProgress?: (current: number, total: number) => void
  ) => {
    if (!menuItems) return;

    // Save state to localStorage immediately
    localStorage.setItem('imageProcessingState', JSON.stringify({
      status: 'processing',
      itemsToProcess: menuItems,
      itemsProcessed: 0,
      timestamp: Date.now()
    }));

    setLoading(true);
    const totalItems = menuItems.length;

    try {
      toast.info(`Processing ${totalItems} items. This may take a few minutes...`);

      // Process all items at once
      const results = await processBatch(
        endpoint,
        menuItems,
        successMessage,
        onProgress
      );

      setMenuItems(results);
      localStorage?.setItem("bulkMenuItems", JSON.stringify(results));
      localStorage.removeItem('imageProcessingState');

      toast.success(successMessage);
    } catch (err) {
      console.error(
        `Batch processing error: ${err instanceof Error ? err.message : "Unknown error"
        }`
      );
      localStorage.removeItem('imageProcessingState');
      toast.error("Failed to generate images. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Extract menu items from ALL uploaded images/PDFs in one go. PDFs are split
  // into page images and everything is sent to the AI in size-bounded batches
  // (see extractMenuFromFiles) so the request limit is never hit. `retryCount`
  // is kept for the existing call signature but is unused now — retries happen
  // per batch inside the util.
  const handleExtractMenuItemsFromImage = async (_retryCount = 0, extraPrompt = "") => {
    if (!menuImageFiles || menuImageFiles.length === 0) {
      toast.error("Please add at least one menu image or PDF.");
      return [];
    }
    setIsExtractingMenu(true);
    setExtractionError(null);
    const toastId = toast.loading("Preparing your menu pages…");
    try {
      const result = await extractMenuFromFiles(menuImageFiles, {
        model: "gemini-2.5-flash",
        extraContext: extraPrompt,
        onProgress: (p) => {
          if (p.phase === "rendering") {
            toast.loading(
              `Reading your menu… (${p.pagesReady} page${p.pagesReady === 1 ? "" : "s"})`,
              { id: toastId },
            );
          } else {
            toast.loading(
              `Extracting items… (batch ${Math.min(p.batchesDone + 1, p.totalBatches)}/${p.totalBatches})`,
              { id: toastId },
            );
          }
        },
      });

      toast.dismiss(toastId);
      setIsExtractingMenu(false);

      if (result.items.length === 0) {
        const msg =
          result.failedBatches > 0
            ? "Couldn't read your menu. Please try clearer images."
            : "No menu items found in the uploaded pages.";
        setExtractionError(msg);
        toast.error(msg);
        return [];
      }

      const json = JSON.stringify(result.items);
      setExtractedMenuItems(json);
      setJsonInput(json);
      setExtractionError(null);
      handleJsonSubmit(json);

      let summary = `Extracted ${result.items.length} item${result.items.length === 1 ? "" : "s"} from ${result.totalPages} page${result.totalPages === 1 ? "" : "s"}`;
      if (result.failedBatches > 0) {
        summary += ` — ${result.failedBatches} batch${result.failedBatches === 1 ? "" : "es"} failed, some items may be missing`;
      }
      if (result.truncatedPdf) summary += ". A very large PDF was truncated.";
      if (result.unsupportedFiles > 0) {
        summary += `. ${result.unsupportedFiles} unsupported file(s) skipped.`;
      }
      toast.success(summary);
      return result.items;
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Menu extraction error:", error);
      const errorMsg = "Failed to extract menu. Please try again.";
      setIsExtractingMenu(false);
      setExtractionError(errorMsg);
      toast.error(errorMsg);
      return [];
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
      "Full images generated successfully!",
      onProgress
    );
  const handlePartialImageGeneration = () =>
    handleBatchImageGeneration(
      "partialImages",
      "Partial images generated successfully!",
      onProgress
    );
  const handleGenerateAIImages = () =>
    handleBatchImageGeneration(
      "generateAIImages",
      "AI images generated successfully!",
      onProgress
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
