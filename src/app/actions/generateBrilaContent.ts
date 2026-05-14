"use server";

import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type { GoogleReview } from "@/app/actions/extractGoogleBusinessData";

export interface BrilaContentRaw {
  hero_headline: string;
  hero_subheadline: string;
  why_choose_us: Array<{
    title: string;
    description: string;
    quote: string;
    author_review_index: number;
  }>;
  photo_captions: string[];
  most_ordered: Array<{
    name: string;
    quote: string;
    author_review_index: number;
  }>;
  more_favorites: Array<{
    name: string;
    quote: string;
    author_review_index: number;
  }>;
  special_touches: Array<{
    title: string;
    description: string;
  }>;
  tips: Array<{
    emoji: string;
    title: string;
    description: string;
  }>;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    hero_headline: { type: SchemaType.STRING },
    hero_subheadline: { type: SchemaType.STRING },
    why_choose_us: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          quote: { type: SchemaType.STRING },
          author_review_index: { type: SchemaType.INTEGER },
        },
        required: ["title", "description", "quote", "author_review_index"],
      },
    },
    photo_captions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    most_ordered: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quote: { type: SchemaType.STRING },
          author_review_index: { type: SchemaType.INTEGER },
        },
        required: ["name", "quote", "author_review_index"],
      },
    },
    more_favorites: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quote: { type: SchemaType.STRING },
          author_review_index: { type: SchemaType.INTEGER },
        },
        required: ["name", "quote", "author_review_index"],
      },
    },
    special_touches: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["title", "description"],
      },
    },
    tips: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          emoji: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["emoji", "title", "description"],
      },
    },
  },
  required: [
    "hero_headline",
    "hero_subheadline",
    "why_choose_us",
    "photo_captions",
    "most_ordered",
    "more_favorites",
    "special_touches",
    "tips",
  ],
};

export interface BrilaContentInput {
  name: string;
  primaryType: string;
  locality: string;
  reviews: GoogleReview[];
  photos: Array<{ data: string; mimeType: string }>;
}

export async function generateBrilaContentFromGoogle(
  input: BrilaContentInput,
): Promise<BrilaContentRaw | null> {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      "generateBrilaContentFromGoogle: no Gemini key (set GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY)",
    );
    return null;
  }
  if (input.reviews.length === 0) return null;

  const reviewBlock = input.reviews
    .map(
      (r, i) =>
        `[index ${i}] ${r.authorName} (${r.rating}★, ${r.relativeTime || "recent"}):\n${r.text}`,
    )
    .join("\n\n");

  const prompt = `You are generating a public website for "${input.name}", a ${input.primaryType.toLowerCase()} in ${input.locality}.

You have:
1. ${input.reviews.length} Google reviews (below)
2. ${input.photos.length} photos from the business (attached as images, in order)

Generate JSON matching the schema. Rules:

- hero_headline: 4-8 words MAX. Punchy and concrete — name the one thing that makes this place special (signature dish, hallmark technique, or distinct experience). NO commas listing multiple things, NO generic words ("best", "ultimate", "experience"). Title case. Example good: "Yemeni-style mandi, done right". Example bad: "Authentic Kuzhimandi, Flavorful Preparations, Attentive Service, Spacious Family Dining".
- hero_subheadline: 1-2 sentences (max 30 words) expanding the headline with specific details from reviews.
- why_choose_us: 4-6 cards. Each is a distinct theme from reviews (signature dish, preparation style, service quirk, ambience, value). Title = short noun phrase. Description = 2-3 sentences in your own words. Quote = direct excerpt from one review supporting this theme. author_review_index = which review (0-${input.reviews.length - 1}) the quote came from.
- photo_captions: EXACTLY ${input.photos.length} captions, one per attached photo, in the same order. Each caption: 2-5 words, descriptive (e.g. "Chicken Mandi Platter", "Outdoor Seating", "Night Exterior"). Look at the actual image content.
- most_ordered: 4-8 dishes that appear most frequently in reviews. Each: name (exact dish name as reviewers say it), quote (verbatim review snippet mentioning this dish), author_review_index. Skip if reviews don't mention enough dishes.
- more_favorites: 4-8 OTHER dishes/items mentioned in reviews not in most_ordered. Same shape. Can be drinks, sides, condiments. Skip if not enough material.
- special_touches: 3-6 service/experience details extracted from reviews (e.g. "Complimentary chicken soup starter", "Unlimited rice refills"). Title = noun phrase, description = 2-3 sentences. No quotes.
- tips: 3-6 practical tips for a first-time visitor based on what reviewers mention. emoji = a single relevant emoji. title = imperative phrase (max 6 words). description = 1-2 sentences.

If reviews don't support a section, return an empty array for it. Do NOT fabricate.

Reviews:
${reviewBlock}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    });

    const parts: any[] = [prompt];
    for (const photo of input.photos) {
      parts.push({
        inlineData: { data: photo.data, mimeType: photo.mimeType },
      });
    }

    const result = await model.generateContent(parts);
    const text = result.response.text();
    return JSON.parse(text) as BrilaContentRaw;
  } catch (e) {
    console.error("generateBrilaContentFromGoogle failed:", e);
    return null;
  }
}
