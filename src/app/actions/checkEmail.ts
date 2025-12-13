"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { partnerQuery } from "@/api/auth";

export async function checkEmailUnique(email: string) {
    try {
        const result = await fetchFromHasura(partnerQuery, { email });
        return { isUnique: result.partners.length === 0 };
    } catch (error) {
        console.error("Error checking email uniqueness:", error);
        throw new Error("Failed to check email uniqueness");
    }
}
