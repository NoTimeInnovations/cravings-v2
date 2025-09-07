import { create } from "zustand";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  partnerMutation,
  partnerQuery,
  updatePartnerBannerMutation,
} from "@/api/auth";
import { toast } from "sonner";
import { processImage } from "@/lib/processImage";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { GoogleGenerativeAI, Schema } from "@google/generative-ai";
import { Partner } from "./authStore";
import { createJSONStorage, persist } from "zustand/middleware";
import { useCategoryStore } from "./categoryStore_hasura";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

interface MenuItem {
  is_price_as_per_size: boolean | undefined;
  name: string;
  price: number;
  description: string;
  category: string;
  image?: string;
  variants?: { name: string; price: number }[];
}

interface SuperAdminPartnerState {
  // Partner creation
  loading: boolean;
  error: string | null;
  createPartner: (
    email: string,
    password: string,
    hotelName: string,
    area: string,
    location: string,
    phone: string,
    upiId: string,
    country: string,
    state: string
  ) => Promise<Partner>;

  // Menu extraction
  isExtractingMenu: boolean;
  extractionError: string | null;
  extractedMenuItems: MenuItem[];
  menuImageFiles: File[] | null;
  extractMenuFromImages: (
    files: File[],
    retryCount?: number
  ) => Promise<MenuItem[]>;
  retryMenuExtraction: () => Promise<MenuItem[]>;
  clearExtractedMenu: () => void;

  // Image generation
  isGeneratingImages: boolean;
  generationError: string | null;
  generatedImages: Record<string, string>;
  generateMenuImages: (
    menuItems: MenuItem[]
  ) => Promise<Record<string, string>>;

  // Banner upload
  uploadBanner: (
    partnerId: string,
    file: File,
    previewUrl: string
  ) => Promise<string | null>;

  // Menu upload
  uploadMenu: (partnerId: string) => Promise<number>;

  // Menu Item Management (NEW)
  updateMenuItem: (index: number, updatedItem: MenuItem) => void;
  deleteMenuItem: (index: number) => void;

  clearAll: () => void;
  isMenuUploaded: boolean;
  setIsMenuUploaded: (status: boolean) => void;
}

export const useSuperAdminPartnerStore = create<SuperAdminPartnerState>()(
  persist(
    (set, get) => ({
      // Initial states
      loading: false,
      error: null,
      isExtractingMenu: false,
      extractionError: null,
      extractedMenuItems: [],
      menuImageFiles: null,
      isGeneratingImages: false,
      generationError: null,
      generatedImages: {},
      isMenuUploaded: false,

      setIsMenuUploaded: (status: boolean) => set({ isMenuUploaded: status }),

      clearAll: () => {
        set({
          loading: false,
          error: null,
          isExtractingMenu: false,
          extractionError: null,
          extractedMenuItems: [],
          menuImageFiles: null,
          isGeneratingImages: false,
          generationError: null,
          generatedImages: {},
          isMenuUploaded: false,
        });
      },

      // Partner creation
      createPartner: async (
        email,
        password,
        hotelName,
        area,
        location,
        phone,
        upiId,
        country,
        state
      ) => {
        set({ loading: true, error: null });
        try {
          const existingPartner = await fetchFromHasura(partnerQuery, {
            email,
          });
          if (existingPartner?.partners?.length > 0) {
            throw new Error("A partner account with this email already exists");
          }

          const response = (await fetchFromHasura(partnerMutation, {
            object: {
              email,
              password,
              name: hotelName,
              store_name: hotelName,
              location,
              district: area,
              status: "active",
              upi_id: upiId,
              country,
              state,
              phone,
              description: "",
              role: "partner",
            },
          })) as { insert_partners_one: Partner };

          if (!response?.insert_partners_one) {
            throw new Error("Failed to create partner account");
          }

          set({ loading: false });
          return response.insert_partners_one;
        } catch (error) {
          console.error("Partner creation failed:", error);
          set({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to create partner",
          });
          throw error;
        }
      },

      uploadMenu: async (partnerId: string) => {
        set({ loading: true, error: null });
        try {
          const { extractedMenuItems, generatedImages } = get();

          if (!extractedMenuItems.length) {
            throw new Error("No menu items to upload");
          }

          toast.info("Starting menu upload...");

          // Process items in batches of 20
          const batchSize = 20;
          const totalBatches = Math.ceil(extractedMenuItems.length / batchSize);
          let successfulUploads = 0;

          for (let i = 0; i < extractedMenuItems.length; i += batchSize) {
            const batch = extractedMenuItems.slice(i, i + batchSize);
            toast.info(
              `Uploading batch ${
                Math.floor(i / batchSize) + 1
              }/${totalBatches}...`
            );

            // Process each item in the batch
            const menuItemsToUpload = await Promise.all(
              batch.map(async (item) => {
                try {
                  let s3Url = "";

                  const addCategory = useCategoryStore.getState().addCategory;

                  const category = await addCategory(
                    item.category.trim().toLowerCase(),
                    partnerId
                  );

                  const category_id = category?.id;

                  if (!category_id) throw new Error("Category ID not found");

                  // Use generated image if available
                  if (generatedImages[item.name] || item.image) {
                    const formattedName = item.name
                      .replace(/[^a-zA-Z0-9]/g, "_")
                      .replace(/\s+/g, "_")
                      .replace(/_+/g, "_");
                    const formattedCategory = item.category
                      .replace(/[^a-zA-Z0-9]/g, "_")
                      .replace(/\s+/g, "_")
                      .replace(/_+/g, "_");

                    const processedImage = await processImage(
                      (item.image || generatedImages[item.name]),
                      "generated"
                    );

                    s3Url = await uploadFileToS3(
                      processedImage,
                      `${partnerId}/menu/${formattedName}_${formattedCategory}_${Date.now()}.webp`
                    );
                  }

                  return {
                    name: item.name,
                    category_id: category_id,
                    image_url: s3Url,
                    image_source: "swiggy",
                    partner_id: partnerId,
                    price: item.price,
                    description: item.description || "",
                    variants: item.variants || [],
                    is_price_as_per_size: item.is_price_as_per_size || false,
                  };
                } catch (error) {
                  console.error(`Error processing item ${item.name}:`, error);
                  return null; // Skip this item if there's an error
                }
              })
            );

            // Filter out any failed items
            const validItems = menuItemsToUpload.filter(
              (item) => item !== null
            ) as any[];

            console.log(
              `Batch ${Math.floor(i / batchSize) + 1} valid items:`,
              validItems
            );

            if (validItems.length > 0) {
              // Upload the batch
              await fetchFromHasura(
                `
                mutation InsertMenuBatch($menu: [menu_insert_input!]!) {
                  insert_menu(objects: $menu) {
                    returning {
                      id
                    }
                  }
                }
              `,
                {
                  menu: validItems,
                }
              );

              successfulUploads += validItems.length;
            }
          }

          set({ loading: false });
          toast.success(
            `Successfully uploaded ${successfulUploads} menu items`
          );
          return successfulUploads;
        } catch (error) {
          console.error("Menu upload failed:", error);
          set({
            loading: false,
            error:
              error instanceof Error ? error.message : "Failed to upload menu",
          });
          toast.error("Failed to upload menu");
          throw error;
        }
      },

      // Menu extraction with retries
      extractMenuFromImages: async (files, retryCount = 0) => {
        set({
          isExtractingMenu: true,
          extractionError: null,
          menuImageFiles: files,
        });

        try {
          toast.info(
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
            files.map(async (file) => {
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
          const parsedMenu: MenuItem[] = JSON.parse(result.response.text());

          set({
            extractedMenuItems: parsedMenu,
            isExtractingMenu: false,
            extractionError: null,
          });

          toast.success(`Extracted ${parsedMenu.length} menu items`);
          return parsedMenu;
        } catch (error) {
          console.error("Menu extraction error:", error);

          if (retryCount < MAX_RETRIES - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_DELAY_MS * (retryCount + 1))
            );
            return get().extractMenuFromImages(files, retryCount + 1);
          }

          const errorMsg =
            "Failed to extract menu after multiple attempts. Please try again.";
          set({
            isExtractingMenu: false,
            extractionError: errorMsg,
          });

          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
      },

      retryMenuExtraction: async () => {
        const { menuImageFiles, extractMenuFromImages } = get();
        if (!menuImageFiles) {
          throw new Error("No menu images available for retry");
        }
        return extractMenuFromImages(menuImageFiles);
      },

      clearExtractedMenu: () => {
        set({
          extractedMenuItems: [],
          menuImageFiles: null,
          extractionError: null,
        });
      },

      // Image generation
      generateMenuImages: async (menuItems) => {
        set({ isGeneratingImages: true, generationError: null });
        try {
          toast.info("Generating images for menu items...");

          const batchSize = 2;
          const batches = [];
          for (let i = 0; i < menuItems.length; i += batchSize) {
            const itemsToAdd = menuItems.map((item: MenuItem) => ({
              ...item,
              name: item.name
            }));
            batches.push(itemsToAdd.slice(i, i + batchSize));
          }

          const imageRecord: Record<string, string> = {};

          for (const batch of batches) {
            try {
              const response = await fetch(
                process.env.NEXT_PUBLIC_SERVER_URL + "/api/image-gen/fullImages",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(batch),
                }
              );

              if (!response.ok) {
                throw new Error(
                  `Image generation failed with status ${response.status}`
                );
              }

              const batchImageData = await response.json();

              batchImageData.forEach((item: { name: string; image: string }) => {
                imageRecord[item.name] = item.image;
              });

              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (batchError) {
              console.error(`Error processing batch:`, batchError);
              throw batchError;
            }
          }

          console.log("Generated image record:", imageRecord);

          set((state) => ({
            generatedImages: { ...state.generatedImages, ...imageRecord },
            isGeneratingImages: false,
          }));

          toast.success("Menu item images generated!");
          return imageRecord;
        } catch (error) {
          console.error("Image generation error:", error);
          set({
            isGeneratingImages: false,
            generationError:
              error instanceof Error
                ? error.message
                : "Image generation failed",
          });
          toast.error("Failed to generate menu images");
          throw error;
        }
      },

      // Banner upload
      uploadBanner: async (partnerId, file, previewUrl) => {
        try {
          toast.info("Uploading banner...");
          const processedImage = await processImage(previewUrl, "local");
          const s3Url = await uploadFileToS3(
            processedImage,
            `${partnerId}/banner/banner_${Date.now()}.webp`
          );

          await fetchFromHasura(updatePartnerBannerMutation, {
            id: partnerId,
            store_banner: s3Url,
          });

          toast.success("Banner uploaded successfully!");
          return s3Url;
        } catch (error) {
          console.error("Banner upload error:", error);
          toast.error("Failed to upload banner");
          return null;
        }
      },
      
      // NEW FUNCTIONS FOR MENU ITEM MANAGEMENT
      updateMenuItem: (index: number, updatedItem: MenuItem) => {
        set((state) => {
          const newItems = [...state.extractedMenuItems];
          newItems[index] = updatedItem;
          return { extractedMenuItems: newItems };
        });
        toast.success(`"${updatedItem.name}" has been updated.`);
      },

      deleteMenuItem: (index: number) => {
        const itemToDelete = get().extractedMenuItems[index];
        if (!itemToDelete) return;

        set((state) => {
          const newItems = state.extractedMenuItems.filter((_, i) => i !== index);
          const newGeneratedImages = { ...state.generatedImages };
          // Also remove the corresponding image from the generated images record
          delete newGeneratedImages[itemToDelete.name];
          
          return { 
            extractedMenuItems: newItems,
            generatedImages: newGeneratedImages 
          };
        });
        toast.success(`"${itemToDelete.name}" has been removed.`);
      },
    }),
    {
      name: "super-admin-partner-store", // Changed name to avoid conflicts with old structure
      storage: createJSONStorage(() => localStorage),
    }
  )
);