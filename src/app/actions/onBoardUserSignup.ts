"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { partnerMutation } from "@/api/auth";
import { addCategory } from "@/api/category";
import { addMenu } from "@/api/menu";
import { setAuthCookie } from "@/app/auth/actions";
import { INSERT_QR_CODE } from "@/api/qrcodes";

interface OnboardingData {
    partner: any;
    categories: Record<string, any>;
    menu: { items: Record<string, any> };
}

export const onBoardUserSignup = async (data: OnboardingData) => {
    try {
        const { partner, categories, menu } = data;

        // 1. Create Partner
        // We assume the partner object structure matches what Hasura expects for partners_insert_input
        // and includes the referral_code and other fields set in get-started/page.tsx

        // Ensure geo_location is properly formatted if it's just [0,0]
        const partnerPayload = {
            ...partner,
            // referral_code is already in partner object from get-started
        };

        const partnerResponse = await fetchFromHasura(partnerMutation, {
            object: partnerPayload
        }) as any; // Type assertion since we don't have full generated types here

        if (!partnerResponse?.insert_partners_one) {
            throw new Error("Failed to create partner account");
        }

        const newPartnerId = partnerResponse.insert_partners_one.id;

        // Set Auth Cookie to log them in immediately
        await setAuthCookie({
            id: newPartnerId,
            role: "partner",
            feature_flags: "",
            status: "active",
        });

        // 1.5 Create Default QR Code (Table 1)
        let firstQrCodeId = null;
        try {
            const qrResponse = await fetchFromHasura(INSERT_QR_CODE, {
                object: {
                    partner_id: newPartnerId,
                    table_number: 1,
                    qr_number: "1", // Assuming string or handled by DB default/type
                    created_at: new Date().toISOString(),
                    no_of_scans: 0
                }
            }) as any;

            if (qrResponse?.insert_qr_codes_one?.id) {
                firstQrCodeId = qrResponse.insert_qr_codes_one.id;
            }
        } catch (qrError) {
            console.error("Failed to create default QR code:", qrError);
            // Non-blocking, continue signup
        }

        // 2. Create Categories
        // We need to map the temporary IDs (or names) to the real IDs created
        const categoryMap: Record<string, string> = {};

        // Convert categories object to array
        const categoriesList = Object.values(categories);

        // Hasura addCategory mutation expects an array of objects
        // We'll create them one by one or in batch. The addCategory API takes an array.
        // We need to map them back so we know which temp ID corresponds to which real ID.
        // Since addCategory returns { name, id }, if names are unique we can map by name.

        const validCategories = categoriesList.map((cat: any) => ({
            name: cat.name.toLowerCase().trim().replace(/ /g, "_"), // matching store logic
            partner_id: newPartnerId,
            priority: cat.priority,
            is_active: true
        }));

        if (validCategories.length > 0) {
            const categoriesResponse = await fetchFromHasura(addCategory, {
                category: validCategories
            }) as any;

            if (categoriesResponse?.insert_category?.returning) {
                categoriesResponse.insert_category.returning.forEach((cat: any) => {
                    // Map the original name (normalized) to the new ID
                    // The get-started page uses the original capitalized name as key in categoriesData
                    // We need to find the original key that corresponds to this created category.
                    // The creation normalizes the name.
                    // Let's create a map based on the normalized name.
                    categoryMap[cat.name] = cat.id;
                });
            }
        }

        // 3. Create Menu Items
        const menuItemsList = Object.values(menu.items);

        const menuPayload = menuItemsList.map((item: any) => {
            // Find the category ID. 
            // item.category is the category OBJECT from get-started.
            // We need to normalize its name to find it in our map.
            const catName = item.category.name.toLowerCase().trim().replace(/ /g, "_");
            const categoryId = categoryMap[catName];

            if (!categoryId) {
                console.warn(`Category ID not found for ${catName}, item: ${item.name}`);
                return null;
            }

            return {
                name: item.name,
                category_id: categoryId,
                image_url: item.image_url || "",
                partner_id: newPartnerId,
                price: item.price || 0,
                description: item.description || "",
                is_available: true,
                is_veg: item.is_veg,
                variants: item.variants || [],
                priority: item.priority || 0
            };
        }).filter(item => item !== null);

        if (menuPayload.length > 0) {
            await fetchFromHasura(addMenu, {
                menu: menuPayload
            });
        }

        // Send Welcome Email
        try {
            const planName = partnerPayload.subscription_details?.plan?.name || "Free Trial";
            const { sendWelcomeEmail } = await import("@/lib/email"); // Dynamic import to avoid issues if lib not present? No, standard import is fine usually.
            
            // Build menu link
            const storeName = partnerPayload.store_name || partnerPayload.name;
            const menuLink = firstQrCodeId 
                ? `https://cravings.live/qrScan/${storeName.replace(/ /g, "-")}/${firstQrCodeId}`
                : undefined;
            
            await sendWelcomeEmail(partnerPayload.email, {
                partnerName: partnerPayload.name,
                planName: planName,
                loginLink: "https://cravings.live/login",
                menuLink: menuLink
            });
        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // Don't block signup success
        }

        // Return success
        return { success: true, partnerId: newPartnerId, firstQrCodeId };

    } catch (error) {
        console.error("onBoardUserSignup Error:", error);
        throw error;
    }
};