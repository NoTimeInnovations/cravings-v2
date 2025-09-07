import { getAuthCookie, getTempUserIdCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "./hasuraClient";

export async function addToRecent(partnerId: string) {
  try {
    const cookies = await getAuthCookie();
    const tempUserId = await getTempUserIdCookie();
    const id = cookies?.id || tempUserId;

    if (!id) {
      console.error("User not logged in or user ID is missing.");
      return;
    }

    await fetchFromHasura(
      `
        mutation InsertRecent($userId: String!, $partnerId: uuid!) {
          insert_followers_one(
            object: { 
              user_id: $userId, 
              partner_id: $partnerId, 
              created_at: "now()"
            },
            on_conflict: {
              constraint: followers_user_id_partner_id_key,
              update_columns: [created_at]
            }
          ) {
            id
            created_at
          }
        }`,
      {
        userId:id,
        partnerId: partnerId,
      }
    );


  } catch {
    console.error("Error adding to recent");
  }
}
