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
      }
    }
  }
  return permissions;
};
