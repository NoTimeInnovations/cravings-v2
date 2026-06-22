export type FeatureFlags = {
  ordering: {
    access: boolean;
    enabled: boolean;
  };
  delivery: {
    access: boolean;
    enabled: boolean;
  };
  multiwhatsapp: {
    access: boolean;
    enabled: boolean;
  };
  pos: {
    access: boolean;
    enabled: boolean;
  };
  stockmanagement: {
    access: boolean;
    enabled: boolean;
  };
  captainordering: {
    access: boolean;
    enabled: boolean;
  };
  purchasemanagement: {
    access: boolean;
    enabled: boolean;
  };
  whatsappnotifications: {
    access: boolean;
    enabled: boolean;
  };
  newonboarding: {
    access: boolean;
    enabled: boolean;
  };
  storefront: {
    access: boolean;
    enabled: boolean;
  };
  growjet_delivery: {
    access: boolean;
    enabled: boolean;
  };
  /**
   * Routes order dispatch through delivery-agents-server (provider-agnostic
   * hub; Adloggs is the first/only plugin shipped). Fires on the `accepted`
   * status transition. Independent of `growjet_delivery`, which is locked to
   * one Petpooja-coupled partner and triggers on `food_ready`.
   */
  delivery_agent: {
    access: boolean;
    enabled: boolean;
  };
  /**
   * Gates the "Manage WhatsApp Templates" admin-v2 surface. Partners with
   * this flag can author and submit WhatsApp message templates to Meta
   * directly from the dashboard. Required for our Tech Provider App Review
   * since the second demo video shows template creation from inside our app.
   */
  whatsappOrdering: {
    access: boolean;
    enabled: boolean;
  };
  /**
   * Routes order dispatch through porter-bridge (the temporary Porter
   * customer-app wrapper at https://deliverybridge.menuthere.com). Fires on
   * the `accepted` status transition alongside `delivery_agent`. Use this
   * when a partner has onboarded a personal Porter consumer account and we
   * want to dispatch a Porter 2-wheeler from their account.
   *
   * Account binding: the partner's `phone` column is matched against the
   * porter-bridge `accounts.mobile` field at dispatch time. Each partner
   * onboards by visiting deliverybridge.menuthere.com/accounts once and
   * completing OTP login from their phone.
   */
  porter_bridge: {
    access: boolean;
    enabled: boolean;
  };
  /**
   * Routes order dispatch through the Menuthere Delivery Pool (independent rider
   * network). Fires on `accepted` like porter_bridge; hands the order to the
   * pool's order-service. See src/app/actions/deliveryPoolDispatch.ts.
   */
  delivery_pool: {
    access: boolean;
    enabled: boolean;
  };
  /**
   * Allows customers to place scheduled (prebooked) orders for a future date
   * and time. Partners configure allowed windows, lead time, and max days
   * ahead in the admin-v2 Prebooking settings tab (`prebooking_settings`).
   */
  prebooking: {
    access: boolean;
    enabled: boolean;
  };
  /**
   * Partner-scoped loyalty points. Customers earn a configurable % of each
   * completed order's total as points (1 point = ₹1 by default) and redeem them
   * against future orders at the same partner only. Earn rate, caps and minimums
   * live in the admin-v2 Loyalty settings (`partners.loyalty_settings`); the
   * balance/ledger is a signed, tamper-evident server-side store. `enabled` gates
   * earning, redemption UI, and the admin loyalty surfaces.
   */
  loyalty_points: {
    access: boolean;
    enabled: boolean;
  };
};

export const revertFeatureToString = (features: FeatureFlags): string => {
  const parts: string[] = [];

  if (features.ordering.access) {
    parts.push(`ordering-${features.ordering.enabled}`);
  }

  if (features.delivery.access) {
    parts.push(`delivery-${features.delivery.enabled}`);
  }

  if (features.multiwhatsapp.access) {
    parts.push(`multiwhatsapp-${features.multiwhatsapp.enabled}`);
  }

  if (features.pos.access) {
    parts.push(`pos-${features.pos.enabled}`);
  }

  if (features.stockmanagement.access) {
    parts.push(`stockmanagement-${features.stockmanagement.enabled}`);
  }

  if (features.captainordering.access) {
    parts.push(`captainordering-${features.captainordering.enabled}`);
  }

  if (features.purchasemanagement.access) {
    parts.push(`purchasemanagement-${features.purchasemanagement.enabled}`);
  }

  if (features.whatsappnotifications.access) {
    parts.push(`whatsappnotifications-${features.whatsappnotifications.enabled}`);
  }

  if (features.newonboarding.access) {
    parts.push(`newonboarding-${features.newonboarding.enabled}`);
  }

  if (features.storefront.access) {
    parts.push(`storefront-${features.storefront.enabled}`);
  }

  if (features.growjet_delivery.access) {
    parts.push(`growjet_delivery-${features.growjet_delivery.enabled}`);
  }

  if (features.delivery_agent.access) {
    parts.push(`delivery_agent-${features.delivery_agent.enabled}`);
  }

  if (features.whatsappOrdering.access) {
    parts.push(`whatsappOrdering-${features.whatsappOrdering.enabled}`);
  }

  if (features.porter_bridge.access) {
    parts.push(`porter_bridge-${features.porter_bridge.enabled}`);
  }

  if (features.prebooking.access) {
    parts.push(`prebooking-${features.prebooking.enabled}`);
  }

  if (features.loyalty_points.access) {
    parts.push(`loyalty_points-${features.loyalty_points.enabled}`);
  }

  return parts.join(",");
};

export const getFeatures = (perm: string | null) => {
  const permissions: FeatureFlags = {
    ordering: {
      access: false,
      enabled: false,
    },
    delivery: {
      access: false,
      enabled: false,
    },
    multiwhatsapp: {
      access: false,
      enabled: false,
    },
    pos: {
      access: false,
      enabled: false,
    },
    stockmanagement: {
      access: false,
      enabled: false,
    },
    captainordering: {
      access: false,
      enabled: false,
    },
    purchasemanagement: {
      access: false,
      enabled: false,
    },
    whatsappnotifications: {
      access: false,
      enabled: false,
    },
    newonboarding: {
      access: false,
      enabled: false,
    },
    storefront: {
      access: false,
      enabled: false,
    },
    growjet_delivery: {
      access: false,
      enabled: false,
    },
    delivery_agent: {
      access: false,
      enabled: false,
    },
    whatsappOrdering: {
      access: false,
      enabled: false,
    },
    porter_bridge: {
      access: false,
      enabled: false,
    },
    delivery_pool: {
      access: false,
      enabled: false,
    },
    prebooking: {
      access: false,
      enabled: false,
    },
    loyalty_points: {
      access: false,
      enabled: false,
    },
  };

  if (!perm) {
    return permissions;
  }

  if (perm && perm.length > 0) {
    const parts = perm.split(",");

    for (const part of parts) {
      const [key, value] = part.split("-");

      if (key === "ordering") {
        permissions.ordering.access = true;
        permissions.ordering.enabled = value === "true";
      } else if (key === "delivery") {
        permissions.delivery.access = true;
        permissions.delivery.enabled = value === "true";
      } else if (key === "multiwhatsapp") {
        permissions.multiwhatsapp.access = true;
        permissions.multiwhatsapp.enabled = value === "true";
      } else if (key === "pos") {
        permissions.pos.access = true;
        permissions.pos.enabled = value === "true";
      } else if (key === "stockmanagement") {
        permissions.stockmanagement.access = true;
        permissions.stockmanagement.enabled = value === "true";
      } else if (key === "captainordering") {
        permissions.captainordering.access = true;
        permissions.captainordering.enabled = value === "true";
      } else if (key === "purchasemanagement") {
        permissions.purchasemanagement.access = true;
        permissions.purchasemanagement.enabled = value === "true";
      } else if (key === "whatsappnotifications") {
        permissions.whatsappnotifications.access = true;
        permissions.whatsappnotifications.enabled = value === "true";
      } else if (key === "newonboarding") {
        permissions.newonboarding.access = true;
        permissions.newonboarding.enabled = value === "true";
      } else if (key === "storefront") {
        permissions.storefront.access = true;
        permissions.storefront.enabled = value === "true";
      } else if (key === "growjet_delivery") {
        permissions.growjet_delivery.access = true;
        permissions.growjet_delivery.enabled = value === "true";
      } else if (key === "delivery_agent") {
        permissions.delivery_agent.access = true;
        permissions.delivery_agent.enabled = value === "true";
      } else if (key === "whatsappOrdering") {
        permissions.whatsappOrdering.access = true;
        permissions.whatsappOrdering.enabled = value === "true";
      } else if (key === "porter_bridge") {
        permissions.porter_bridge.access = true;
        permissions.porter_bridge.enabled = value === "true";
      } else if (key === "delivery_pool") {
        permissions.delivery_pool.access = true;
        permissions.delivery_pool.enabled = value === "true";
      } else if (key === "prebooking") {
        permissions.prebooking.access = true;
        permissions.prebooking.enabled = value === "true";
      } else if (key === "loyalty_points") {
        permissions.loyalty_points.access = true;
        permissions.loyalty_points.enabled = value === "true";
      }
    }
  }
  return permissions;
};
