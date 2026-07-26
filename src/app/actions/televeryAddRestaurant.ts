"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { quickSignupFromGoogle } from "@/app/actions/quickSignupFromGoogle";
import { setPartnerBranchMutation } from "@/api/branches";
import { TELEVERY_ROLE } from "@/lib/televery";

const GET_BRANCH_ID = `
query TeleveryBranchId($parent_partner_id: uuid!) {
  branches(where: { parent_partner_id: { _eq: $parent_partner_id } }, limit: 1) {
    id
  }
}`;

export interface TeleveryAddRestaurantResult {
  partnerId: string;
  username: string;
  /** False when the partner was created but attaching it to the brand failed. */
  linked: boolean;
}

/**
 * Create a restaurant from its Google Business listing and attach it to the
 * signed-in marketplace's brand, in one server-side step.
 *
 * Two things this deliberately does:
 *  - `skipAuthCookie: true` — without it, quickSignupFromGoogle overwrites the
 *    caller's session cookie with the NEW partner's, silently logging Televery
 *    out of its own dashboard and into the restaurant it just created.
 *  - resolves the brand from the CALLER'S session rather than an argument, so
 *    this can't be used to graft a partner onto someone else's brand.
 */
export async function televeryAddRestaurant(input: {
  placeId: string;
  sessionToken?: string;
  email: string;
  password?: string;
}): Promise<TeleveryAddRestaurantResult> {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== TELEVERY_ROLE) {
    throw new Error("Not authorised.");
  }

  const branchRes = await fetchFromHasuraServer(GET_BRANCH_ID, {
    parent_partner_id: auth.id,
  });
  const branchId: string | undefined = branchRes?.branches?.[0]?.id;
  if (!branchId) {
    throw new Error("No brand is set up for this account yet.");
  }

  const created = await quickSignupFromGoogle({
    placeId: input.placeId,
    sessionToken: input.sessionToken,
    email: input.email,
    password: input.password,
    skipAuthCookie: true,
  });

  // The partner exists at this point. If the link fails we surface it rather
  // than throwing, so the operator knows the restaurant was created and only
  // the attachment needs retrying (throwing would imply nothing happened).
  let linked = false;
  try {
    await fetchFromHasuraServer(setPartnerBranchMutation, {
      partner_id: created.partnerId,
      branch_id: branchId,
    });
    linked = true;
  } catch (err) {
    console.error("televeryAddRestaurant: created but failed to link", err);
  }

  return { partnerId: created.partnerId, username: created.username, linked };
}
