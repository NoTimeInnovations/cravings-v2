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

// Welcome: "hi" -> a caption + a tappable "Order Now" link button carrying the
// fresh 30-min order link (instead of a raw link in the text).
function welcomeFlow(): DefaultFlowDef {
  return {
    name: "Welcome",
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", position: { x: 140, y: 220 }, data: { matchType: "exact", keywords: ["hi"] } },
        {
          id: "msg",
          type: "link_button",
          position: { x: 440, y: 160 },
          data: {
            text:
              "Hi 👋 Welcome to *{{store_name}}*!\n\n" +
              "🛒 Tap *Order Now* below to place your order.\n" +
              "_The link is valid for 30 minutes._ ⏱️\n" +
              "Send *hi* again anytime for a fresh link.",
            buttonText: "Order Now",
            url: "{{order_link}}",
          },
        },
      ],
      edges: [{ id: "e", source: "trigger", target: "msg", sourceHandle: null, targetHandle: null }],
    },
    triggers: [{ matchType: "exact", keywords: ["hi"], nodeId: "trigger", priority: TRIGGER_PRIORITY.exact }],
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
    // ── Welcome: "hi" -> caption + Order Now link button (30-min link) ──
    welcomeFlow(),

    // ── Order status updates ──
    orderFlow(
      "Order placed",
      "placed",
      "🧾 *Order Received!*\n\n" +
        "Hi {{customer_name}}, thanks for ordering from *{{store_name}}*! 🎉\n\n" +
        "🆔 Order: *{{order_id}}*\n" +
        "🛍️ *Items:*\n{{items}}\n\n" +
        "💰 Total: *{{total}}*\n\n" +
        "We'll keep you updated here. 🙌",
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
    orderFlow(
      "Order dispatched",
      "dispatched",
      "🚀 *Order Dispatched!*\n\n" +
        "Hi {{customer_name}}, your order *{{order_id}}* is on the way! 🛵💨\n\n" +
        "It'll reach you shortly. 📍",
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
      "🎉 You earned *{{points}} points*!\n\n" +
        "👛 Your balance is now *{{points_balance}} pts*.\n" +
        "Redeem them on your next order! ✨",
    ),
  ];
}
