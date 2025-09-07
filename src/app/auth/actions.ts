"use server";

import { cookies } from "next/headers";
import { encryptText, decryptText } from "@/lib/encrtption";
import { fetchFromHasura } from "@/lib/hasuraClient";

export const getAuthCookie = async () => {
  const cookie = (await cookies()).get("new_auth_token")?.value;
  return cookie
    ? (decryptText(cookie) as {
        id: string;
        role: string;
        feature_flags: string;
        status: string;
      })
    : null;
};

export const setAuthCookie = async (data: {
  id: string;
  role: string;
  feature_flags: string;
  status: string;
}) => {
  const encrypted = encryptText(data);
  (await cookies()).set("new_auth_token", encrypted, {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });

  await removeTempUserIdCookie();
};

export const removeAuthCookie = async () => {
  console.log("Removing auth cookie");

  (await cookies()).delete("new_auth_token");
};

export const updateAuthCookie = async (
  updates: Partial<{
    id: string;
    role: string;
    feature_flags: string;
    status: string;
  }>
) => {
  const currentCookie = await getAuthCookie();

  if (!currentCookie) {
    throw new Error("No auth cookie found to update");
  }

  const updatedData = {
    ...currentCookie,
    ...updates,
  };

  await setAuthCookie(updatedData);
  return updatedData;
};

export const setLocationCookie = async (lat: number, lng: number) => {
  const locationData = { lat, lng };
  const stringified = JSON.stringify(locationData);

  (await cookies()).set("location", stringified, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  const authCookie = await getAuthCookie();
  const isUser = authCookie?.role === "user";

  const location = {
    type: "Point",
    coordinates: [lng, lat],
  };

  if (isUser) {
    await fetchFromHasura(
      `
      mutation UpdateUserLocation($location: geography!) {
        update_users_by_pk(pk_columns: {id: "${authCookie.id}"}, _set: {location: $location}) {
          id
        }
      }
    `,
      {
        location: location,
      }
    );
  } else if (authCookie === null) {
    const tempUserId = await getTempUserIdCookie();

    if (tempUserId) {
      await saveTempUserLocation(tempUserId, location);
    }
  }
};

const saveTempUserLocation = async (id: string, location: any) => {
  try {
    await fetchFromHasura(
      `
    mutation createTempUserLocation($id: String!, $location: geography!) {
      insert_temp_user_loc_one(
        object: {id: $id, location: $location, created_at: "now()"},
        on_conflict: {
          constraint: temp_user_loc_pkey,
          update_columns: [location, created_at] 
        }
      ) {
        id
      }
    }
  `,
      {
        id,
        location,
      }
    );
  } catch (error) {
    console.error("Error saving temp user location:", error);
  }
};

const removeTempUserLocation = async (id: string) => {
  try {
    await fetchFromHasura(
      `
    mutation deleteTempUserLocation($id: String!) {
      delete_temp_user_loc_by_pk(id: $id) {
        id
      }
    }
  `,
      {
        id,
      }
    );
  } catch (error) {
    console.error("Error removing temp user location:", error);
  }
};

export const getLocationCookie = async () => {
  const cookie = (await cookies()).get("location")?.value;
  return cookie ? (JSON.parse(cookie) as { lat: number; lng: number }) : null;
};

export const removeLocationCookie = async () => {
  (await cookies()).delete("location");
};

export const setQrScanCookie = async (qrId: string) => {
  (await cookies()).set(`block_scan_${qrId}`, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
  });
};

export const getQrScanCookie = async (qrId: string) => {
  const cookie = (await cookies()).get(`block_scan_${qrId}`)?.value;
  return cookie === "true";
};

export const removeQrScanCookie = async (qrId: string) => {
  (await cookies()).delete(`block_scan_${qrId}`);
};

export const setTempUserIdCookie = async (tempUserId: string) => {
  (await cookies()).set("temp_user_id", tempUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
};

export const getTempUserIdCookie = async () => {
  const cookie = (await cookies()).get("temp_user_id")?.value;
  return cookie || null;
};

export const removeTempUserIdCookie = async () => {
  const tempUserId = await getTempUserIdCookie();
  if (tempUserId) await removeTempUserLocation(tempUserId);
  (await cookies()).delete("temp_user_id");
};

export const clearAllCookies = async () => {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  for (const cookie of allCookies) {
    cookieStore.delete(cookie.name);
  }
};
