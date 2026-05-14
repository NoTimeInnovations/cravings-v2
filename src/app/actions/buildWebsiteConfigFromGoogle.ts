import {
  WebsiteConfig,
  mergeWebsiteConfig,
} from "@/types/website";
import type { GoogleBusinessData } from "@/app/actions/extractGoogleBusinessData";
import type { BrilaContentRaw } from "@/app/actions/generateBrilaContent";

const NOISE_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "food",
  "store",
]);

function capitalizeType(t: string): string {
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pickPrimaryType(types: string[]): string {
  const filtered = types.filter((t) => !NOISE_TYPES.has(t));
  return capitalizeType(filtered[0] || types[0] || "Restaurant");
}

/**
 * Map a Google Place Details payload + S3-hosted photo URLs into a fully
 * populated WebsiteConfig. We don't put raw Google photo URLs into the config
 * because those embed our API key — callers must upload to S3 first and pass
 * the resulting URLs in `s3Photos`.
 */
export function buildWebsiteConfigFromGoogle(
  data: GoogleBusinessData,
  s3Photos: string[],
  brila: BrilaContentRaw | null,
): WebsiteConfig {
  const aiDescription = brila?.hero_subheadline?.trim() || "";
  const aiHeadline = brila?.hero_headline?.trim() || "";

  // Map AI quotes back to real reviewer profiles by index.
  const authorFor = (idx: number) => {
    const review = data.reviews[idx];
    if (!review)
      return { name: "Guest", photo_url: "" };
    return {
      name: review.authorName || "Guest",
      photo_url: review.profilePhotoUrl || "",
    };
  };
  const primaryType = pickPrimaryType(data.types);
  const cleanName = data.name;

  const tags: { text: string; accent: boolean }[] = [];
  if (data.rating) {
    tags.push({
      text: `★ ${data.rating.toFixed(1)} on Google`,
      accent: true,
    });
  }
  data.types
    .filter((t) => !NOISE_TYPES.has(t))
    .slice(0, 5)
    .forEach((t, i) =>
      tags.push({ text: capitalizeType(t), accent: i % 2 === 1 }),
    );

  const hoursRows = data.weekdayHours.map((line) => {
    const [day, ...rest] = line.split(": ");
    return { label: day, value: rest.join(": ") };
  });

  // Try to surface today's hours in the hero meta, fall back to first row.
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon-first index
  const heroHoursValue =
    hoursRows[todayIdx]?.value || hoursRows[0]?.value || "";

  // Pick a story image: try to use a photo that isn't already in the hero collage.
  const storyImage = s3Photos[4] || s3Photos[s3Photos.length - 1] || "";

  const locality =
    data.district || data.state || data.country || "your neighbourhood";

  return mergeWebsiteConfig({
    enabled: true,
    layout: "brila",
    hero: {
      enabled: true,
      eyebrow: "Restaurant",
      headline: aiHeadline || cleanName,
      headline_accent: "",
      subheadline:
        aiDescription || `${primaryType} in ${locality}`,
      cta_text: "Order online",
      cta_link: "",
      collage_images: [
        s3Photos[0] || "",
        s3Photos[1] || "",
        s3Photos[2] || "",
        s3Photos[3] || "",
      ],
      collage_labels: ["", "", "", ""],
      hours_label: "Hours",
      hours_value: heroHoursValue,
      address_label: "Address",
      address_value: data.formattedAddress,
    },
    marquee: {
      enabled: tags.length > 0,
      tags,
    },
    story: {
      enabled: true,
      eyebrow: "Our story",
      title: "Welcome to",
      title_accent: cleanName,
      paragraphs: [
        `${cleanName} brings ${primaryType.toLowerCase()} to ${locality}. Order online or stop by — we'd love to feed you.`,
      ],
      image_url: storyImage,
      image_label: "",
    },
    reviews: {
      enabled: data.reviews.length > 0,
      eyebrow: "Loved",
      title: "What guests are saying",
      title_accent: "",
      rating: data.rating || 0,
      total_ratings: data.totalRatings || 0,
      source_label: "Google reviews",
      items: data.reviews.map((r) => ({
        author_name: r.authorName,
        author_url: r.authorUrl || "",
        profile_photo_url: r.profilePhotoUrl || "",
        rating: r.rating,
        relative_time: r.relativeTime,
        text: r.text,
      })),
    },
    menu: {
      enabled: true,
      eyebrow: "Menu",
      title: "Order online",
      title_accent: "",
      category_ids: [],
      item_ids_by_category: {},
      note: "",
      cta_text: "See full menu",
    },
    visit: {
      enabled: true,
      eyebrow: "Visit",
      title: "Find us",
      title_accent: "",
      address_lines: data.formattedAddress,
      address_note: "",
      hours:
        hoursRows.length > 0
          ? hoursRows
          : [
              { label: "Mon – Tue", value: "" },
              { label: "Wed – Thu", value: "" },
              { label: "Fri – Sat", value: "" },
              { label: "Sunday", value: "" },
            ],
      getting_here: "",
      contact_phone: data.phone || "",
      contact_email: "",
      map_image_url: "",
      map_link: `https://www.google.com/maps/place/?q=place_id:${data.placeId}`,
    },
    footer: {
      enabled: true,
      policies: [],
      copyright: `© ${new Date().getFullYear()} ${cleanName}`,
    },
    why_choose_us: {
      enabled: !!brila && brila.why_choose_us.length > 0,
      eyebrow: "Highlights",
      title: "What sets us apart",
      subtitle: "",
      items:
        brila?.why_choose_us.map((it) => ({
          title: it.title,
          description: it.description,
          quote: it.quote,
          author: authorFor(it.author_review_index),
        })) || [],
    },
    gallery: {
      enabled: !!brila && s3Photos.length > 0,
      eyebrow: "Gallery",
      title: "A look inside",
      subtitle: "",
      items: s3Photos.map((url, i) => ({
        image_url: url,
        caption: brila?.photo_captions?.[i] || "",
      })),
    },
    most_ordered: {
      enabled: !!brila && brila.most_ordered.length > 0,
      eyebrow: "Favourites",
      title: "Crowd favourites",
      subtitle: "The dishes guests come back for.",
      items:
        brila?.most_ordered.map((it) => ({
          name: it.name,
          quote: it.quote,
          author: authorFor(it.author_review_index),
        })) || [],
    },
    more_favorites: {
      enabled: !!brila && brila.more_favorites.length > 0,
      eyebrow: "Also loved",
      title: "Worth ordering",
      subtitle: "Other plates regulars keep going back to.",
      items:
        brila?.more_favorites.map((it) => ({
          name: it.name,
          quote: it.quote,
          author: authorFor(it.author_review_index),
        })) || [],
    },
    special_touches: {
      enabled: !!brila && brila.special_touches.length > 0,
      eyebrow: "The extras",
      title: "Little things we do",
      subtitle: `Small details that make every visit to ${cleanName} count.`,
      items: brila?.special_touches || [],
    },
    tips: {
      enabled: !!brila && brila.tips.length > 0,
      eyebrow: "Good to know",
      title: "Insider tips",
      subtitle: "Things regulars wish they'd known on their first visit.",
      items: brila?.tips || [],
    },
  });
}
