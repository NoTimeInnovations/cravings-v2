import { getMenu } from "@/api/menu";
import { getAuthCookie } from "@/app/auth/actions";
import ItemAvailabilityManage from "@/components/admin/ItemAvailabilityManage";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React from "react";

const fetchAllMenu = async () => {
  try {
    const cookies = await getAuthCookie();

    if (cookies) {
      return await fetchFromHasura(getMenu, {
        partner_id: cookies.id,
      });
    }

    return null;
  } catch (err) {
    console.log(err);
  }
};

const page = async () => {
  const menu = fetchAllMenu();
  return (
    <div>
      <ItemAvailabilityManage menu={menu} />
    </div>
  );
};

export default page;
