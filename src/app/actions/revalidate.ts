"use server";

import {
  revalidatePath as nextRevalidatePath,
  revalidateTag as nextRevalidateTag,
} from "next/cache";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { submitToIndexNow } from "@/lib/indexnow";

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getUsernameByIdQuery = `
  query GetUsernameById($id: uuid!) {
    partners(where: { id: { _eq: $id } }) {
      username
    }
  }
`;

export async function revalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
    return { success: true };
  } catch (error) {
    console.error("Revalidation error:", error);
    return { success: false, error };
  }
}

export async function revalidateTag(tag: string) {
  try {
    console.log("Revalidating tag:", tag);
    nextRevalidateTag(tag, {});

    // If the tag is a partner UUID, notify IndexNow so Bing re-crawls the page
    if (IS_UUID.test(tag)) {
      try {
        const data = await fetchFromHasura(getUsernameByIdQuery, { id: tag });
        const username: string | undefined = data?.partners?.[0]?.username;
        if (username) {
          await submitToIndexNow(`https://menuthere.com/${username}`);
        }
      } catch (err) {
        // Non-critical — don't fail the revalidation if IndexNow errors
        console.error("IndexNow submission failed:", err);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Tag revalidation error:", error);
    return { success: false, error };
  }
}
