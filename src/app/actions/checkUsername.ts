"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

const getPartnerByUsernameQuery = `
  query GetPartnerByUsername($username: String!) {
    partners(where: {username: {_eq: $username}}, limit: 1) {
      id
    }
  }
`;

const getPartnersByUsernamePrefixQuery = `
  query GetPartnersByUsernamePrefix($prefix: String!) {
    partners(where: {username: {_ilike: $prefix}}) {
      username
    }
  }
`;

export async function checkUsernameAvailable(username: string) {
  try {
    const result = await fetchFromHasura(getPartnerByUsernameQuery, { username });
    return { isAvailable: result.partners.length === 0 };
  } catch (error) {
    console.error("Error checking username availability:", error);
    throw new Error("Failed to check username availability");
  }
}

/**
 * Converts a store name into a valid username.
 * Rules: lowercase, only a-z, 0-9, underscore. Min 3 chars.
 */
function storeNameToUsername(storeName: string): string {
  return storeName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Generates a unique username from a store name.
 * If the base username is taken, appends incrementing numbers.
 */
export async function generateUniqueUsername(storeName: string): Promise<string> {
  const base = storeNameToUsername(storeName);
  if (!base || base.length < 3) {
    return "";
  }

  // Check if the base username is available
  const { isAvailable } = await checkUsernameAvailable(base);
  if (isAvailable) return base;

  // Find all usernames that start with this base
  const result = await fetchFromHasura(getPartnersByUsernamePrefixQuery, {
    prefix: `${base}%`,
  });

  const existingUsernames = new Set(
    (result.partners || []).map((p: { username: string }) => p.username)
  );

  // Find the next available number suffix
  let counter = 1;
  while (existingUsernames.has(`${base}${counter}`)) {
    counter++;
  }

  return `${base}${counter}`;
}
