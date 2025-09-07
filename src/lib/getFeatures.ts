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
  }
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

  return parts.join(",");
};

export const getFeatures = (perm: string) => {
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
    }
  };

  if (perm) {
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
      }
    }
  }

  return permissions;
};

