import { fetchFromHasura } from "@/lib/hasuraClient";
import { Order } from "@/store/orderStore";
import { getAuthCookie, getTempUserIdCookie } from "../auth/actions";
import { OrderStatusHistoryTypes } from "@/lib/statusHistory";
import { Offer } from "@/store/offerStore_hasura";
import { HotelData } from "../hotels/[...id]/page";
import TEST_PARTNERS from "@/utils/testPartnerAccounts";

const BASE_URL = "https://notification-server-khaki.vercel.app";

const getMessage = (
  title: string,
  body: string,
  tokens: string[],
  data?: any,
  soundAndroid?: string,
  soundIOS?: string
) => {
  return {
    tokens: tokens,
    notification: {
      title: title || "New Notification",
      body: body || "You have a new message",
    },
    android: {
      notification: {
        icon: "ic_stat_logo",
      },
    },
    apns: {
      payload: {
        aps: {},
      },
    },
    data: data || {},
  };
};

const findPlatform = () => {
  if (window.navigator.userAgent.includes("Android")) {
    return "android";
  }
  if (
    window.navigator.userAgent.includes("iPhone") ||
    window.navigator.userAgent.includes("iPad")
  ) {
    return "ios";
  }
  return "unknown";
};

class Token {
  async save() {
    const tokenId = window?.localStorage.getItem("tokenId");
    if (tokenId) {
      return;
    }

    const token = window?.localStorage.getItem("fcmToken");
    const user = await getAuthCookie();
    const tempUser = await getTempUserIdCookie();

    if (!token || (!user && !tempUser)) {
      return;
    }

    const { insert_device_tokens_one } = await fetchFromHasura(
      `
          mutation InsertOrUpdateDeviceToken($object: device_tokens_insert_input!) {
            insert_device_tokens_one(
              object: $object,
              on_conflict: {
                constraint: device_tokens_user_id_device_token_key,
                update_columns: [platform, updated_at, user_id] 
              }
            ) {
              id
            }
          }
      `,
      {
        object: {
          device_token: token,
          user_id: user?.id || tempUser,
          platform: findPlatform(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      }
    );

    if (insert_device_tokens_one?.id === null) {
      console.error("Failed to save token");
      return;
    } else {
      window?.localStorage.setItem("tokenId", insert_device_tokens_one.id);
    }
  }

  async remove() {
    const tokenId = window?.localStorage.getItem("tokenId");
    if (!tokenId) {
      return;
    }

    const { delete_device_tokens } = await fetchFromHasura(
      `
      mutation DeleteDeviceToken($tokenId: uuid!) {
        delete_device_tokens(where: {id: {_eq: $tokenId}}) {
          affected_rows
        }
      }
    `,
      {
        tokenId,
      }
    );

    if (delete_device_tokens?.affected_rows === 0) {
      console.error("Failed to remove token");
    }
  }
}

class PartnerNotification {
  async sendOrderNotification(order: Order) {
    const partnerId = order.partnerId;

    const { device_tokens } = await fetchFromHasura(
      `
      query GetPartnerDeviceTokens($partnerId: String!) {
        device_tokens(where: {user_id: {_eq: $partnerId}}) {
          device_token
        }
      }
    `,
      {
        partnerId,
      }
    );

    const tokens = device_tokens?.map(
      (token: { device_token: string }) => token.device_token
    );

    if (tokens.length === 0) {
      return;
    }

    const orderItemsDesc = order.items
      .map((item) => `${item.name} x ${item.quantity}`)
      .join(", ");

    const message = getMessage(
      "New Order Of",
      `You have a new order of ${orderItemsDesc}`,
      tokens,
      {
        url: "https://www.cravings.live/admin/orders",
        channel_id: "cravings_channel_1",
        sound: "custom_sound",
        order_id: order.id,
      }
    );

    const response = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: "POST",
      body: JSON.stringify({
        message: message,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to send order notification");
    }
  }

  async sendOfferNotification(
    offer: Offer,
    notificationMessage?: {
      title?: string;
      body?: string;
    }
  ) {
    try {
      const cookies = await getAuthCookie();
      const partnerId = cookies?.id;

      if (partnerId && TEST_PARTNERS.includes(partnerId)) {
        console.log("Skipping notification for test partner:", partnerId);
        return;
      }

      if (!partnerId) {
        console.error("No partner ID found");
        return;
      }

      const { followers } = await fetchFromHasura(
        `
        query GetPartnerFollowers($partnerId: uuid!) {
          followers(where: {partner_id: {_eq: $partnerId}}) {
            user_id
          }
        }
      `,
        {
          partnerId,
        }
      );

      const userIds = followers.map(
        (follower: { user_id: string }) => follower.user_id
      );

      const { device_tokens } = await fetchFromHasura(
        `        query GetUserDeviceTokens($userIds: [String!]!) {
          device_tokens(where: {user_id: {_in: $userIds}}) {
            device_token
          }
        }
      `,
        {
          userIds,
        }
      );

      const tokens = device_tokens?.map(
        (token: { device_token: string }) => token.device_token
      );

      if (tokens.length === 0) {
        console.error("No device tokens found for followers");
        return;
      }

      const message = getMessage(
        notificationMessage?.title ||
          `New Offer: ${offer.menu.name} at ${offer?.partner?.store_name}`,
        notificationMessage?.body ||
          `Check out the new offer: ${offer.menu.name} for just ${
            (offer?.partner as HotelData)?.currency ?? "₹"
          }${offer.offer_price}. Valid until ${new Date(
            offer?.end_time
          ).toLocaleDateString()}`,
        tokens,
        {
          url: `https://www.cravings.live/offers/${offer?.id || ""}`,
          channel_id: "cravings_channel_2",
          sound: "default_sound"
        }
      );

      const response = await fetch(`${BASE_URL}/api/notifications/send`, {
        method: "POST",
        body: JSON.stringify({
          message: message,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to send offer notification");
      }
    } catch (error) {
      console.error("Failed to send offer notification", error);
      return;
    }
  }
}

class UserNotification {
  async sendOrderStatusNotification(order: Order, status: string) {
    const user = order.userId;

    const { device_tokens } = await fetchFromHasura(
      `
      query GetUserDeviceTokens($userId: String!) {
        device_tokens(where: {user_id: {_eq: $userId}}) {
          device_token
        }
      }
    `,
      {
        userId: user,
      }
    );

    const tokens = device_tokens?.map(
      (token: { device_token: string }) => token.device_token
    );

    if (tokens.length === 0) {
      return;
    }

    const message = getMessage(
      `Order ${status} `,
      `Your order has been ${status} by ${order.partner?.store_name}`,
      tokens,
      {
        url: `https://www.cravings.live/order/${order.id}`,
        channel_id: "cravings_channel_2",
        sound: "default_sound",
      }
    );

    const response = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: "POST",
      body: JSON.stringify({
        message: message,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to send order status notification");
    }
  }
}

export const Notification = {
  partner: new PartnerNotification(),
  user: new UserNotification(),
  token: new Token(),
};
