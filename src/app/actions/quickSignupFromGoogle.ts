"use server";

import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import { generateUniqueUsername } from "@/app/actions/checkUsername";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { extractGoogleBusinessDataByPlaceId } from "@/app/actions/extractGoogleBusinessData";
import { buildWebsiteConfigFromGoogle } from "@/app/actions/buildWebsiteConfigFromGoogle";
import { generateBrilaContentFromGoogle } from "@/app/actions/generateBrilaContent";
import { sampleMenus } from "@/data/sampleMenus";
import countryMetaData from "@/data/countryMetaData.json";

export interface ExtractedMenuItem {
  name: string;
  price: number;
  description?: string;
  category: string;
  variants?: { name: string; price: number }[];
}

const COUNTRY_META = countryMetaData as Record<
  string,
  { code: string; currency: string; symbol: string }
>;

interface QuickSignupInput {
  placeId: string;
  sessionToken?: string;
  email: string;
  /**
   * Optional. When omitted (e.g. after email OTP verification or Google
   * OAuth), the account is created with the default password "123456" so the
   * partners.password column stays populated; the user can change it later.
   */
  password?: string;
  /**
   * Optional pre-extracted menu items from the user's uploaded photos. The
   * client runs Gemini via `/api/ai/generate` (same path as /get-started)
   * and passes the JSON results here so we use the real menu instead of the
   * generic sample menu.
   */
  extractedItems?: ExtractedMenuItem[];
  /**
   * Optional logo uploaded during signup (base64 data URL). When present it
   * becomes the store_banner (the V3 hero logo) instead of the Google photo,
   * and its size + background tile are saved to storefront_settings.bannerLogo
   * (same model as Settings → Branding / get-started).
   */
  logo?: string;
  logoScale?: number;
  logoBgColor?: string;
}

export interface QuickSignupResult {
  success: boolean;
  username: string;
  partnerId: string;
  redirectUrl: string;
}

function pickSampleMenu(types: string[]) {
  const t = types.join(" ").toLowerCase();
  if (t.includes("bakery") || t.includes("cafe") || t.includes("dessert")) {
    return sampleMenus.find((s) => s.id === "cake-house") || sampleMenus[0];
  }
  if (t.includes("middle_eastern") || t.includes("arabic")) {
    return (
      sampleMenus.find((s) => s.id === "arabic-restaurant") || sampleMenus[0]
    );
  }
  return sampleMenus.find((s) => s.id === "south-indian") || sampleMenus[0];
}

async function fetchPhotoBuffer(photoUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(photoUrl, { redirect: "follow" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error("fetchPhotoBuffer failed:", e);
    return null;
  }
}

async function uploadBufferToS3(
  buf: Buffer,
  slug: string,
  index: number,
): Promise<string> {
  const filename = `banners/google-${slug}-${index}-${Date.now()}.jpg`;
  return uploadFileToS3(buf as any, filename);
}

export async function quickSignupFromGoogle(
  input: QuickSignupInput,
): Promise<QuickSignupResult> {
  const { placeId, sessionToken, email, password, extractedItems, logo, logoScale, logoBgColor } = input;

  if (!placeId?.trim()) {
    throw new Error("Please pick your business from the dropdown");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  // Google-business / OTP signups have no user-chosen password — default to
  // "123456" (same as the Petpooja onboarding default) so partners.password
  // stays populated and support can hand it to the merchant.
  const finalPassword =
    password && password.length >= 6 ? password : "123456";

  const data = await extractGoogleBusinessDataByPlaceId(placeId, sessionToken);

  // Google photo URLs embed our API key, so we can't put them in
  // website_config — we host on S3 and use those URLs. We also need the raw
  // bytes for Gemini vision (photo captions), so fetch once, fan out to both.
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const localityHint =
    data.district || data.state || data.country || "this neighbourhood";
  const primaryTypeHint = (data.types.find(
    (t) =>
      !["point_of_interest", "establishment", "food", "store"].includes(t),
  ) || "restaurant")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const buffers: (Buffer | null)[] = await Promise.all(
    data.photoUrls.map(fetchPhotoBuffer),
  );
  const validBuffers = buffers
    .map((buf, i) => (buf ? { buf, i } : null))
    .filter((x): x is { buf: Buffer; i: number } => x !== null);

  const [s3Uploads, brilaContent] = await Promise.all([
    Promise.allSettled(
      validBuffers.map(({ buf, i }) => uploadBufferToS3(buf, slug, i)),
    ),
    generateBrilaContentFromGoogle({
      name: data.name,
      primaryType: primaryTypeHint,
      locality: localityHint,
      reviews: data.reviews,
      photos: validBuffers.map(({ buf }) => ({
        data: buf.toString("base64"),
        mimeType: "image/jpeg",
      })),
    }),
  ]);

  const s3Photos: string[] = s3Uploads
    .map((u) => (u.status === "fulfilled" ? u.value : ""))
    .filter(Boolean);
  // First entry is Google's "best/most representative" photo — usually exterior
  // or hero shot, much better as a banner than the last (often a food close-up).
  const bannerUrl = s3Photos[0] || "";

  // A user-uploaded logo overrides the Google photo as the V3 hero image, and
  // carries its own size + background tile (storefront_settings.bannerLogo).
  let finalBanner = bannerUrl;
  let storefrontSettings: string | undefined;
  if (logo) {
    try {
      const uploaded = await uploadFileToS3(
        logo,
        `hotel_banners/onboarding_${Date.now()}.png`,
      );
      if (uploaded) {
        finalBanner = uploaded as string;
        storefrontSettings = JSON.stringify({
          bannerLogo: {
            scale: Math.min(500, Math.max(50, Math.round(logoScale ?? 100))),
            bgColor: logoBgColor || "#ffffff",
          },
        });
      }
    } catch (e) {
      console.error("logo upload failed", e);
    }
  }

  const username = await generateUniqueUsername(data.name);
  if (!username) {
    throw new Error(
      "Could not derive a valid username from the business name.",
    );
  }

  const countryName = data.country || "India";
  const meta = COUNTRY_META[countryName] || COUNTRY_META["India"];

  let categoriesData: Record<string, any> = {};
  let menuItems: Record<string, any> = {};

  const extracted = Array.isArray(extractedItems) ? extractedItems : [];
  console.log(
    `[quickSignupFromGoogle] received ${extracted.length} extracted item(s) from client`,
  );

  if (extracted.length > 0) {
    const uniqueCategories = Array.from(
      new Set(
        extracted
          .map((i) => (i.category || "Menu").trim())
          .filter((c): c is string => Boolean(c)),
      ),
    );
    categoriesData = uniqueCategories.reduce(
      (acc, catName, index) => {
        acc[catName] = {
          name: catName,
          priority: index,
          is_active: true,
          id: `temp-cat-${index}`,
        };
        return acc;
      },
      {} as Record<string, any>,
    );
    menuItems = extracted.reduce(
      (acc: Record<string, any>, item, index: number) => {
        const catName = (item.category || "Menu").trim() || "Menu";
        acc[`temp-item-${index}`] = {
          name: item.name,
          price: typeof item.price === "number" ? item.price : 0,
          description: item.description || "",
          is_veg: false,
          image_url: "",
          is_available: true,
          category: { name: catName },
          variants: Array.isArray(item.variants)
            ? item.variants.map((v) => ({ name: v.name, price: v.price }))
            : [],
        };
        return acc;
      },
      {},
    );
  } else {
    // Fallback when no menu was uploaded (or extraction failed): seed a
    // small sample menu so the new partner site isn't empty.
    const sample = pickSampleMenu(data.types);
    const uniqueCategories = Array.from(
      new Set(sample.items.map((i: any) => i.category as string)),
    ).slice(0, 3);
    const allowedCategorySet = new Set(uniqueCategories);
    const filteredSampleItems = sample.items.filter((i: any) =>
      allowedCategorySet.has(i.category),
    );
    categoriesData = uniqueCategories.reduce(
      (acc, catName, index) => {
        acc[catName] = {
          name: catName,
          priority: index,
          is_active: true,
          id: `temp-cat-${index}`,
        };
        return acc;
      },
      {} as Record<string, any>,
    );
    menuItems = filteredSampleItems.reduce(
      (acc: Record<string, any>, item: any, index: number) => {
        acc[`temp-item-${index}`] = {
          name: item.name,
          price: item.price,
          description: item.description,
          is_veg: item.is_veg,
          image_url: item.image,
          is_available: true,
          category: { name: item.category },
          variants: [],
        };
        return acc;
      },
      {},
    );
  }

  const partnerData = {
    role: "partner",
    name: data.name,
    password: finalPassword,
    email,
    store_name: data.name,
    phone: data.phone || "",
    country: countryName,
    location: `https://www.google.com/maps/place/?q=place_id:${data.placeId}`,
    // Persist the Google place_id so the V3 storefront links to the business
    // listing (name/reviews/hours) instead of a bare lat,lng pin.
    place_id: data.placeId,
    status: "active",
    upi_id: "",
    whatsapp_numbers: [],
    district: data.district || "",
    state: data.state || "",
    delivery_status: false,
    geo_location:
      data.lat != null && data.lng != null
        ? { type: "Point", coordinates: [data.lng, data.lat] }
        : { type: "Point", coordinates: [0, 0] },
    delivery_rate: 0,
    delivery_rules: { rules: [] },
    currency: meta.symbol,
    country_code: meta.code,
    social_links: JSON.stringify({}),
    store_banner: finalBanner,
    storefront_settings: storefrontSettings,
    is_shop_open: true,
    theme: JSON.stringify({
      colors: { text: "#1a1a1a", bg: "#ffffff", accent: "#ea580c" },
      menuStyle: "v3",
    }),
    referral_code: null,
    username,
    signin_method: "email",
    website_config: JSON.stringify(
      buildWebsiteConfigFromGoogle(data, s3Photos, brilaContent),
    ),
  };

  const signupResult = await onBoardUserSignup({
    partner: partnerData,
    categories: categoriesData,
    menu: { items: menuItems },
  });

  return {
    success: true,
    username,
    partnerId: signupResult.partnerId,
    // After creation, drop the partner straight on the public site so they
    // can show it off; the /home page surfaces a "Go to dashboard" pill for
    // the logged-in owner.
    redirectUrl: `/${username}/home`,
  };
}
