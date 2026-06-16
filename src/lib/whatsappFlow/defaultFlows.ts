import type { FlowGraph, TriggerDef } from "@/lib/whatsappFlow/types";
import { TRIGGER_PRIORITY } from "@/lib/whatsappFlow/types";

// The built-in flow set provisioned for a partner when WhatsApp ordering is
// enabled. Each is a single trigger -> send_text. WhatsApp markup: *bold*,
// _italic_. Messages use {{variables}} the engine injects:
//   message flows:  store_name, username, order_link, currency
//   order flows:    store_name, order_id, order_status, customer_name, items,
//                   total, order_type, currency

export interface DefaultFlowDef {
  name: string;
  graph: FlowGraph;
  triggers: TriggerDef[];
}

// Welcome: "hi" -> a caption + a tappable "Order Now" link button carrying a
// fresh order link that also silently logs the customer in (instead of a raw
// link in the text).
// Welcome is a SINGLE quick-reply message. WhatsApp doesn't allow a URL button
// and quick-reply buttons in the same message, so both actions are quick
// replies: "Order Now" always, and "Reorder" only for returning customers.
// A condition on {{reorder_link}} (empty = first-timer) picks which button set
// to send. Tapping a button sends its label as text, which the matching
// exact-trigger flow (Order link / Reorder) picks up and answers with the
// actual auto-login link.
const WELCOME_TEXT =
  "Hi 👋 Welcome to *{{store_name}}*!\n\n🛒 Tap *Order Now* to place your order.";
const WELCOME_TEXT_RETURNING =
  "Hi 👋 Welcome back to *{{store_name}}*!\n\n🛒 Tap *Order Now* for the full menu, or *Reorder* to repeat your last order.";

function welcomeFlow(): DefaultFlowDef {
  return {
    name: "Welcome",
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", position: { x: 140, y: 220 }, data: { matchType: "exact", keywords: ["hi"] } },
        {
          id: "cond",
          type: "condition",
          position: { x: 440, y: 220 },
          data: {
            rules: [{ var: "reorder_link", op: "isEmpty", handle: "empty" }],
            defaultHandle: "has",
          },
        },
        // First-time customer: just "Order Now".
        {
          id: "welcome_new",
          type: "buttons",
          position: { x: 760, y: 320 },
          data: { text: WELCOME_TEXT, items: [{ id: "order_now", label: "Order Now" }] },
        },
        // Returning customer: "Order Now" + "Reorder".
        {
          id: "welcome_returning",
          type: "buttons",
          position: { x: 760, y: 120 },
          data: {
            text: WELCOME_TEXT_RETURNING,
            items: [
              { id: "order_now", label: "Order Now" },
              { id: "reorder", label: "Reorder" },
            ],
          },
        },
      ],
      edges: [
        { id: "e", source: "trigger", target: "cond", sourceHandle: null, targetHandle: null },
        { id: "e_empty", source: "cond", target: "welcome_new", sourceHandle: "empty", targetHandle: null },
        { id: "e_has", source: "cond", target: "welcome_returning", sourceHandle: "has", targetHandle: null },
      ],
    },
    triggers: [{ matchType: "exact", keywords: ["hi"], nodeId: "trigger", priority: TRIGGER_PRIORITY.exact }],
  };
}

// Order link: triggered when the customer taps the "Order Now" quick-reply
// (which sends the text "Order Now") or types it. Replies with the auto-login
// order link that opens the menu already signed in.
function orderNowFlow(): DefaultFlowDef {
  return {
    name: "Order link",
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", position: { x: 140, y: 220 }, data: { matchType: "exact", keywords: ["order now"] } },
        {
          id: "link",
          type: "link_button",
          position: { x: 440, y: 160 },
          data: {
            text:
              "🛒 Tap *Order Now* below to open the menu — you'll be signed in automatically.\n" +
              "_The link is valid for 10 minutes._ ⏱️",
            buttonText: "Order Now",
            url: "{{order_link}}",
          },
        },
      ],
      edges: [{ id: "e", source: "trigger", target: "link", sourceHandle: null, targetHandle: null }],
    },
    triggers: [{ matchType: "exact", keywords: ["order now"], nodeId: "trigger", priority: TRIGGER_PRIORITY.exact }],
  };
}

// Reorder: triggered when the customer taps the "Reorder" quick-reply (which
// sends the text "Reorder") or types it. Sends a one-tap auto-login link that
// reloads their last order straight into checkout. {{reorder_link}} is filled
// by the engine only when a previous order exists, so the condition falls back
// to a friendly message for first-time customers.
function reorderFlow(): DefaultFlowDef {
  return {
    name: "Reorder",
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", position: { x: 140, y: 220 }, data: { matchType: "exact", keywords: ["reorder"] } },
        {
          id: "cond",
          type: "condition",
          position: { x: 440, y: 220 },
          data: {
            rules: [{ var: "reorder_link", op: "isEmpty", handle: "empty" }],
            defaultHandle: "has",
          },
        },
        {
          id: "link",
          type: "link_button",
          position: { x: 740, y: 140 },
          data: {
            text: "🔁 Here's your last order — review and place it in one tap.",
            buttonText: "Reorder",
            url: "{{reorder_link}}",
          },
        },
        {
          id: "none",
          type: "send_text",
          position: { x: 740, y: 320 },
          data: {
            text:
              "You don't have a previous order here yet 🙂\n" +
              "Send *hi* and tap *Order Now* to place your first one.",
          },
        },
      ],
      edges: [
        { id: "e", source: "trigger", target: "cond", sourceHandle: null, targetHandle: null },
        { id: "e_has", source: "cond", target: "link", sourceHandle: "has", targetHandle: null },
        { id: "e_empty", source: "cond", target: "none", sourceHandle: "empty", targetHandle: null },
      ],
    },
    triggers: [{ matchType: "exact", keywords: ["reorder"], nodeId: "trigger", priority: TRIGGER_PRIORITY.exact }],
  };
}

function orderFlow(name: string, status: string, text: string): DefaultFlowDef {
  return {
    name,
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", position: { x: 140, y: 220 }, data: { matchType: "order", orderStatus: status } },
        { id: "msg", type: "send_text", position: { x: 440, y: 160 }, data: { text } },
      ],
      edges: [{ id: "e", source: "trigger", target: "msg", sourceHandle: null, targetHandle: null }],
    },
    triggers: [{ matchType: "order", orderStatus: status, nodeId: "trigger", priority: TRIGGER_PRIORITY.order }],
  };
}

// An order-status flow whose single step is a caption + tappable link button
// (cta_url). If the {{url}} resolves empty/invalid the engine degrades it to a
// plain text message, so this is safe for optional links (e.g. tracking).
function orderLinkButtonFlow(
  name: string,
  status: string,
  text: string,
  buttonText: string,
  url: string,
): DefaultFlowDef {
  return {
    name,
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", position: { x: 140, y: 220 }, data: { matchType: "order", orderStatus: status } },
        { id: "msg", type: "link_button", position: { x: 440, y: 160 }, data: { text, buttonText, url } },
      ],
      edges: [{ id: "e", source: "trigger", target: "msg", sourceHandle: null, targetHandle: null }],
    },
    triggers: [{ matchType: "order", orderStatus: status, nodeId: "trigger", priority: TRIGGER_PRIORITY.order }],
  };
}

function loyaltyFlow(name: string, event: string, text: string): DefaultFlowDef {
  return {
    name,
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", position: { x: 140, y: 220 }, data: { matchType: "loyalty", loyaltyEvent: event } },
        { id: "msg", type: "send_text", position: { x: 440, y: 160 }, data: { text } },
      ],
      edges: [{ id: "e", source: "trigger", target: "msg", sourceHandle: null, targetHandle: null }],
    },
    triggers: [{ matchType: "loyalty", loyaltyEvent: event, nodeId: "trigger", priority: TRIGGER_PRIORITY.loyalty }],
  };
}

export function buildDefaultFlows(): DefaultFlowDef[] {
  return [
    // ── Welcome: "hi" -> single quick-reply message (Order Now [+ Reorder]) ──
    welcomeFlow(),

    // ── Order link: "order now" -> auto-login menu link ──
    orderNowFlow(),

    // ── Reorder: "reorder" -> one-tap link to reload the last order ──
    reorderFlow(),

    // ── Order status updates ──
    orderLinkButtonFlow(
      "Order placed",
      "placed",
      "🧾 *Order Received!*\n\n" +
        "Hi {{customer_name}}, thanks for ordering from *{{store_name}}*! 🎉\n\n" +
        "🆔 Order: *{{order_id}}*\n\n" +
        "🛍️ *Items:*\n{{items}}\n\n" +
        "🧾 *Bill:*\n{{bill}}\n\n" +
        "Tap *View Order* below to track it anytime. 🙌",
      "View Order",
      "{{order_url}}",
    ),
    orderFlow(
      "Order accepted",
      "accepted",
      "✅ *Order Accepted!*\n\n" +
        "Hi {{customer_name}}, *{{store_name}}* has accepted your order *{{order_id}}*. 👨‍🍳\n\n" +
        "We're getting started — sit tight! ⏳",
    ),
    orderFlow(
      "Order food ready",
      "food_ready",
      "🍽️ *Your Order is Ready!*\n\n" +
        "Hi {{customer_name}}, your order *{{order_id}}* from *{{store_name}}* is ready! 🔔\n\n" +
        "🛍️ *Items:*\n{{items}}",
    ),
    orderLinkButtonFlow(
      "Order dispatched",
      "dispatched",
      "🚀 *Order Dispatched!*\n\n" +
        "Hi {{customer_name}}, your order *{{order_id}}* from *{{store_name}}* is on the way! 🛵💨" +
        "{{driver_details}}\n\n" +
        "It'll reach you shortly. 📍",
      "Track Order",
      "{{tracking_url}}",
    ),
    orderFlow(
      "Order completed",
      "completed",
      "🎉 *Order Completed!*\n\n" +
        "Thank you for ordering from *{{store_name}}*, {{customer_name}}! 🙏\n\n" +
        "🆔 Order *{{order_id}}* · 💰 *{{total}}*\n\n" +
        "We hope you enjoyed it! ⭐ See you again soon.",
    ),
    orderFlow(
      "Order cancelled",
      "cancelled",
      "❌ *Order Cancelled*\n\n" +
        "Hi {{customer_name}}, your order *{{order_id}}* from *{{store_name}}* has been cancelled.\n\n" +
        "If this wasn't expected, please reach out to us. 🙏",
    ),
  ];
}

// The built-in loyalty flow set, provisioned ONLY for partners with the loyalty
// feature enabled (separate from buildDefaultFlows so a partner without loyalty
// never gets a loyalty flow). Variables injected by the engine:
//   store_name, customer_name, points, points_value, points_balance,
//   balance_value, lifetime_earned, order_id, currency
export function buildLoyaltyFlows(): DefaultFlowDef[] {
  return [
    loyaltyFlow(
      "Loyalty points earned",
      "earned",
      "🎉 You earned *{{points}} loyalty points* for *{{store_name}}*!\n\n" +
        "👛 You have *{{points_balance}} loyalty points* for *{{store_name}}*.\n\n" +
        "Redeem them on your next order! ✨",
    ),
  ];
}
