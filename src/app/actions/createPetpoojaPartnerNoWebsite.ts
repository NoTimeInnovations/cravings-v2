"use server";

import { generateUniqueUsername } from "@/app/actions/checkUsername";
import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import { updatePartner } from "@/api/partners";

// Create a partner WITHOUT building a Google-sourced website — used when no place
// is picked in the Create Petpooja Partner flow. Reuses onBoardUserSignup so the
// partner still gets all the standard new-partner defaults (v3 storefront + v2
// checkout theme, 30-day trial, feature flags, delivery windows); it just omits
// website_config / geo / banner / place_id. The storefront menu still works.
export async function createPetpoojaPartnerNoWebsite(input: {
  name: string;
  email: string;
  password?: string;
  restaurantId?: string;
  phone?: string;
}): Promise<{ partnerId: string; username: string }> {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim();
  if (!name) throw new Error("Please enter the restaurant name.");
  if (!email) throw new Error("Please enter a valid email.");

  const finalPassword =
    input.password && input.password.length >= 6 ? input.password : "123456";
  const phone = (input.phone || "").trim();

  const username = await generateUniqueUsername(name);
  if (!username) {
    throw new Error("Could not derive a valid username from the restaurant name.");
  }

  // Minimal partner — no website_config / place_id / store_banner. Defaults
  // (feature_flags, subscription, theme, delivery) are applied by onBoardUserSignup.
  const partner: any = {
    name,
    store_name: name,
    email,
    password: finalPassword,
    phone,
    status: "active",
    username,
    signin_method: "email",
    country: "India",
    country_code: "+91",
    currency: "₹",
    upi_id: "",
    social_links: JSON.stringify({}),
    whatsapp_numbers: phone ? [{ number: phone, area: "default" }] : [],
    district: "",
    state: "",
    delivery_status: true,
    geo_location: { type: "Point", coordinates: [0, 0] },
    is_shop_open: true,
    referral_code: null,
  };

  const result = await onBoardUserSignup(
    { partner, categories: {}, menu: { items: {} } },
    { skipAuthCookie: true },
  );
  if (!result?.success || !result.partnerId) {
    throw new Error("Failed to create the partner.");
  }

  if (input.restaurantId) {
    try {
      await updatePartner(result.partnerId, {
        petpooja_restaurant_id: input.restaurantId,
      });
    } catch (e) {
      console.error("Failed to set petpooja id on new partner", e);
    }
  }

  return { partnerId: result.partnerId, username };
}
