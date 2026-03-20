"use client";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Order } from "@/store/orderStore";
import { getAuthCookie, getTempUserIdCookie } from "../auth/actions";
import { OrderStatusHistoryTypes } from "@/lib/statusHistory";
import { Offer } from "@/store/offerStore_hasura";
import { HotelData } from "../hotels/[...id]/page";
import TEST_PARTNERS from "@/utils/testPartnerAccounts";

const BASE_URL = "https://notification-server-khaki.vercel.app";

async function sendWhatsAppOrderNotification(order: Order, status: string, storeName?: string) {
  try {
    const phone = order.phone || order.user?.phone;
    if (!phone) return;

    const orderItems = order.items
      .map((item) => `${item.name} x ${item.quantity}`)
      .join(", ");

    const displayId = order.display_id || order.order_number || order.id.slice(0, 8);
    const store = storeName || order.partner?.store_name || "";

    let text = "";
    if (status === "accepted") {
      text = `✅ *Order Accepted!*\n\nHi! Your order *#${displayId}*${store ? ` from *${store}*` : ""} has been accepted.\n\n🍽️ *Items:* ${orderItems}\n💰 *Total:* ${order.partner?.currency ?? "₹"}${order.totalPrice}\n\nYour food is being prepared. Thank you for ordering! 🧑‍🍳`;
    } else if (status === "cancelled") {
      text = `❌ *Order Cancelled*\n\nHi, your order *#${displayId}*${store ? ` from *${store}*` : ""} has been cancelled.\n\n🍽️ *Items:* ${orderItems}\n💰 *Total:* ${order.partner?.currency ?? "₹"}${order.totalPrice}\n\nIf you have any questions, please contact the store directly.`;
    } else {
      text = `🍽️ *Order Update*\n\nYour order *#${displayId}*${store ? ` from *${store}*` : ""} status has been updated to: *${status}*`;
    }

    await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text }),
    });
  } catch (error) {
    console.error("WhatsApp notification failed:", error);
  }
}

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
      priority: "high" as const,
      notification: {
        icon: "ic_stat_logo",
        channelId: data?.channel_id || "cravings_channel_1",
        sound: soundAndroid || "custom_sound",
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          sound: soundIOS || "custom_sound.caf",
          contentAvailable: true,
        },
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
    const token = window?.localStorage.getItem("fcmToken");
    const user = await getAuthCookie();
    const tempUser = await getTempUserIdCookie();

    if (!token || (!user && !tempUser)) {
      return;
    }

    // Skip if same token was already saved for this user
    const savedToken = window?.localStorage.getItem("savedFcmToken");
    const savedUserId = window?.localStorage.getItem("savedTokenUserId");
    const currentUserId = user?.id || tempUser;
    if (!currentUserId) return;
    if (savedToken === token && savedUserId === currentUserId) {
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
          user_id: currentUserId,
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
      window?.localStorage.setItem("savedFcmToken", token);
      window?.localStorage.setItem("savedTokenUserId", currentUserId);
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
    try {
      const partnerId = order.partnerId;

      const { device_tokens } = await fetchFromHasura(
        `
        query GetPartnerDeviceTokens($partnerId: String!) {
          device_tokens(
            where: { user_id: { _eq: $partnerId } },
            order_by: { created_at: desc },
            limit: 3
          ) {
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
      ) || [];

      console.log("Tokens found : ", tokens)

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
          url: "https://menuthere.com",
          channel_id: "cravings_channel_1",
          sound: "custom_sound.caf",
          order_id: order.id,
        }
      );

      console.log("Order notification payload : ", message)

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
    } catch (error) {
      console.error("Error sending order notification:", error);
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

      const { followers, partners } = await fetchFromHasura(
        `
        query GetPartnerFollowers($partnerId: uuid!) {
          followers(where: {partner_id: {_eq: $partnerId}}) {
            user_id
          }
          partners(where: {id: {_eq: $partnerId}}) {
            username
          }
        }
      `,
        {
          partnerId,
        }
      );

      const partnerUsername = partners?.[0]?.username;

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
        `Check out the new offer: ${offer.menu.name} for just ${(offer?.partner as HotelData)?.currency ?? "₹"
        }${offer.offer_price}. Valid until ${new Date(
          offer?.end_time
        ).toLocaleDateString()}`,
        tokens,
        {
          url: `https://menuthere.com/${partnerUsername || partnerId}`,
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
  async sendOrderStatusNotification(order: Order, status: string, storeName?: string) {
    try {
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
      ) || [];

      if (tokens.length === 0) {
        return;
      }

      // Fetch store name if not available on the order (admin subscriptions don't include partner data)
      let storeName = order.partner?.store_name;
      if (!storeName && order.partnerId) {
        const { partners_by_pk } = await fetchFromHasura(
          `query GetPartnerName($partnerId: uuid!) {
            partners_by_pk(id: $partnerId) { store_name }
          }`,
          { partnerId: order.partnerId }
        );
        storeName = partners_by_pk?.store_name;
      }

      const message = getMessage(
        `Order ${status} `,
        `Your order has been ${status}${storeName ? ` by ${storeName}` : ""}`,
        tokens,
        {
          url: `https://menuthere.com/order/${order.id}`,
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

      // Send WhatsApp notification for accepted/cancelled orders
      if (status === "accepted" || status === "cancelled") {
        sendWhatsAppOrderNotification(order, status, storeName);
      }
    } catch (error) {
      console.error("Error sending order status notification:", error);
    }
  }
}

class DeliveryBoyNotification {
  async sendAssignmentNotification(
    deliveryBoyId: string,
    orderId: string,
    orderDisplayId: string,
    deliveryAddress: string
  ) {
    try {
      // Fetch delivery boy's device tokens from device_tokens table
      const { device_tokens } = await fetchFromHasura(
        `
        query GetDeliveryBoyDeviceTokens($deliveryBoyId: String!) {
          device_tokens(where: {user_id: {_eq: $deliveryBoyId}}) {
            device_token
          }
        }
      `,
        { deliveryBoyId }
      );

      const tokens = device_tokens?.map(
        (token: { device_token: string }) => token.device_token
      ) || [];

      if (tokens.length === 0) {
        console.log("No device tokens found for delivery boy:", deliveryBoyId);
        return;
      }

      const message = getMessage(
        "New Delivery Assignment",
        `Order #${orderDisplayId} - ${deliveryAddress}`,
        tokens,
        {
          order_id: orderId,
          type: "delivery_assignment",
          channel_id: "cravings_channel_1",
          sound: "custom_sound",
        }
      );

      const response = await fetch(`${BASE_URL}/api/notifications/send`, {
        method: "POST",
        body: JSON.stringify({ message }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to send delivery boy notification");
      }
    } catch (error) {
      console.error("Error sending delivery boy notification:", error);
    }
  }
}

export const Notification = {
  partner: new PartnerNotification(),
  user: new UserNotification(),
  deliveryBoy: new DeliveryBoyNotification(),
  token: new Token(),
};
