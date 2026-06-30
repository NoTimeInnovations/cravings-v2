"use server";

import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { extractGoogleBusinessDataByPlaceId } from "@/app/actions/extractGoogleBusinessData";
import { buildWebsiteConfigFromGoogle } from "@/app/actions/buildWebsiteConfigFromGoogle";
import { generateBrilaContentFromGoogle } from "@/app/actions/generateBrilaContent";
import type { WebsiteConfig } from "@/types/website";

/**
 * The "Get data from Google" pipeline used by the admin Website editor.
 *
 * This is the same slice that runs during /signup-from-google
 * (quickSignupFromGoogle), but without creating a partner: pick a place →
 * Place Details → host the photos on S3 → optional AI copy → assemble a full
 * website_config. The caller (admin Website tab) persists the result on the
 * existing partner.
 */

export interface GoogleWebsiteImportResult {
  website_config: WebsiteConfig;
  /** Sanitized digits-only phone from the Google listing (no +/country code). */
  phone: string | null;
  /** Human-readable formatted address (for partners.location). */
  location: string;
  state: string | null;
  district: string | null;
  country: string | null;
  place_id: string;
  geo_location: { type: "Point"; coordinates: [number, number] } | null;
  /** WhatsApp defaults to the phone, same as signup. */
  whatsapp_numbers: { number: string; area: string }[];
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

export async function fetchWebsiteDataFromGoogle(
  placeId: string,
  sessionToken?: string,
): Promise<GoogleWebsiteImportResult> {
  if (!placeId?.trim()) {
    throw new Error("Please pick a business from the dropdown");
  }

  const data = await extractGoogleBusinessDataByPlaceId(placeId, sessionToken);

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const localityHint =
    data.district || data.state || data.country || "this neighbourhood";
  const primaryTypeHint = (
    data.types.find(
      (t) =>
        !["point_of_interest", "establishment", "food", "store"].includes(t),
    ) || "restaurant"
  )
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Google photo URLs embed our API key, so we host them on S3. The raw bytes
  // also feed Gemini for photo captions, so fetch once and fan out to both.
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
    // AI copy is best-effort — buildWebsiteConfigFromGoogle handles a null result.
    generateBrilaContentFromGoogle({
      name: data.name,
      primaryType: primaryTypeHint,
      locality: localityHint,
      reviews: data.reviews,
      photos: validBuffers.map(({ buf }) => ({
        data: buf.toString("base64"),
        mimeType: "image/jpeg",
      })),
    }).catch((e) => {
      console.error("generateBrilaContentFromGoogle failed:", e);
      return null;
    }),
  ]);

  const s3Photos: string[] = s3Uploads
    .map((u) => (u.status === "fulfilled" ? u.value : ""))
    .filter(Boolean);

  const website_config = buildWebsiteConfigFromGoogle(
    data,
    s3Photos,
    brilaContent,
  );

  return {
    website_config,
    phone: data.phone,
    location: data.formattedAddress || "",
    state: data.state,
    district: data.district,
    country: data.country,
    place_id: data.placeId,
    geo_location:
      data.lat != null && data.lng != null
        ? { type: "Point", coordinates: [data.lng, data.lat] }
        : null,
    whatsapp_numbers: data.phone
      ? [{ number: data.phone, area: "default" }]
      : [],
  };
}
