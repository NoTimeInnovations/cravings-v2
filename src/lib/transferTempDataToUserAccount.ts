"use client";

import { getTempUserIdCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "./hasuraClient";

// =================================================================
// GraphQL Queries and Mutations
// =================================================================

const GET_TEMP_USER_LOCATION_QUERY = `
  query GetTempUserLocation($id: String!) {
    temp_user_loc_by_pk(id: $id) {
      location
    }
  }
`;

const UPDATE_USER_LOCATION_MUTATION = `
  mutation UpdateUserLocation($id: uuid!, $location: geography!) {
    update_users_by_pk(pk_columns: {id: $id}, _set: {location: $location}) {
      id
    }
  }
`;

const GET_FOLLOWERS_QUERY = `
  query GetFollowers($tempUserId: String!, $userId: String!) {
    temp_followers: followers(where: {user_id: {_eq: $tempUserId}}) {
      partner_id
      created_at
    }
    existing_followers: followers(where: {user_id: {_eq: $userId}}) {
      partner_id
    }
  }
`;

const TRANSFER_FOLLOWERS_MUTATION = `
  mutation TransferFollowers(
    $tempUserId: String!,
    $userId: String!,
    $conflictingPartnerIds: [uuid!]!,
    $conflictingUpdates: [followers_updates!]!
  ) {
    # Update existing followers with the original follow date from the temp account
    update_existing_conflicts: update_followers_many(updates: $conflictingUpdates) {
      affected_rows
    }

    # Delete the conflicting followers from the temp account as they are now merged
    delete_temp_conflicts: delete_followers(
      where: {
        user_id: {_eq: $tempUserId},
        partner_id: {_in: $conflictingPartnerIds}
      }
    ) {
      affected_rows
    }

    # Re-assign all non-conflicting followers to the new user account
    update_non_conflicts: update_followers(
      where: {
        user_id: {_eq: $tempUserId},
        partner_id: {_nin: $conflictingPartnerIds}
      },
      _set: {user_id: $userId}
    ) {
      affected_rows
    }
  }
`;

const UPDATE_EXPLORE_VIEWS_MUTATION = `
  mutation UpdateExploreViews($tempUserId: String!, $userId: String!) {
    update_common_offers_viewed_by(
      where: {user_id: {_eq: $tempUserId}}, 
      _set: {user_id: $userId}
    ) {
      affected_rows
    }
  }
`;



// =================================================================
// Helper Functions
// =================================================================


const transferLocation = async (tempUserId: string, userId: string) => {
  const { temp_user_loc } = await fetchFromHasura(GET_TEMP_USER_LOCATION_QUERY, {
    id: tempUserId,
  });

  if (temp_user_loc?.location) {
    await fetchFromHasura(UPDATE_USER_LOCATION_MUTATION, {
      id: userId,
      location: temp_user_loc.location,
    });
    console.log("Successfully transferred user location.");
  }
};


const transferFollowers = async (tempUserId: string, userId: string) => {
  // 1. Fetch followers from both temporary and registered accounts
  const { temp_followers, existing_followers } = await fetchFromHasura(
    GET_FOLLOWERS_QUERY,
    { tempUserId, userId }
  );
  
  if (!temp_followers || temp_followers.length === 0) {
      console.log("No temporary followers to transfer.");
      return;
  }

  // 2. Identify conflicting followers (same partner followed in both accounts)
  const existingFollowerIds = new Set(
    existing_followers.map((f: any) => f.partner_id)
  );

  const conflictingFollowers = temp_followers.filter((tempFollower: any) =>
    existingFollowerIds.has(tempFollower.partner_id)
  );

  const conflictingPartnerIds = conflictingFollowers.map(
    (f: any) => f.partner_id
  );

  // 3. Prepare the mutation payload for updating conflicting records
  const conflictingUpdates = conflictingFollowers.map((follower: any) => ({
    where: {
      user_id: { _eq: userId },
      partner_id: { _eq: follower.partner_id },
    },
    _set: {
      created_at: follower.created_at, // Use the temp user's follow date
    },
  }));

  // 4. Execute the transfer mutation
  await fetchFromHasura(TRANSFER_FOLLOWERS_MUTATION, {
    tempUserId,
    userId,
    conflictingPartnerIds,
    conflictingUpdates,
  });

  console.log("Successfully transferred followers.", {
      conflicts_resolved: conflictingPartnerIds.length,
      new_followers_migrated: temp_followers.length - conflictingPartnerIds.length,
  });
};


const transferExploreViews = async (tempUserId: string, userId: string) => {
  try {
    const { update_common_offers_viewed_by } = await fetchFromHasura(
      UPDATE_EXPLORE_VIEWS_MUTATION,
      {
        tempUserId: tempUserId,
        userId: userId,
      }
    );

    if (update_common_offers_viewed_by?.affected_rows > 0) {
      console.log(
        `Successfully transferred ${update_common_offers_viewed_by.affected_rows} explore views.`
      );
    } else {
      console.log("No explore views to transfer.");
    }
  } catch (error) {
    console.error("Failed to transfer explore views:", error);
  }
};


export const transferTempDataToUserAccount = async (userId: string) => {
  try {
    const tempUserId = await getTempUserIdCookie();

    if (!tempUserId) {
      console.warn("No temporary user ID found. Skipping data transfer.");
      return;
    }
    
    console.log(`Starting data transfer from temp user (${tempUserId}) to new user (${userId})...`);

    await transferLocation(tempUserId, userId);
    await transferFollowers(tempUserId, userId);
    await transferExploreViews(tempUserId, userId);


    console.log("Temporary data transfer completed successfully.");

  } catch (error) {
    console.error("A critical error occurred during the data transfer process:", error);
  }
};