import {
  BarChart3,
  Bell,
  Bike,
  Boxes,
  CreditCard,
  Gift,
  Globe,
  GraduationCap,
  LayoutGrid,
  Landmark,
  Megaphone,
  MessageSquare,
  PackageSearch,
  Percent,
  Plug,
  QrCode,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
} from "lucide-react";

/**
 * The v3 sidebar.
 *
 * `view` is the string written into `useAdminStore().activeView` and into the
 * `?view=` query param — it is the human-readable TITLE, not `id`. `id` is only
 * a gating key and a React key. Mixing the two silently breaks navigation,
 * because admin-v2's page reads `?view=` back as a title.
 *
 * v3 currently implements only "Dashboard". Everything else deep-links into
 * admin-v2 (`/admin-v2?view=<view>`), which admin-v2's layout is written to
 * respect — see the isV3DeepLink note there.
 */
export type NavItem = {
  /** activeView string. Also the ?view= value. */
  view: string;
  /** Gating key, shared with admin-v2's AdminSidebar. */
  id: string;
  label: string;
  icon: React.ElementType;
  /** Sidebar section header this sits under. `null` = ungrouped, at the top. */
  group: string | null;
};

export const NAV_GROUPS = [
  null,
  "Operations",
  "Catalog",
  "Storefront",
  "Engagement",
  "Account",
] as const;

export const navItems: NavItem[] = [
  { view: "Dashboard", id: "dashboard", label: "Dashboard", icon: LayoutGrid, group: null },
  { view: "Analytics", id: "analytics", label: "Analytics", icon: BarChart3, group: null },

  { view: "Orders", id: "orders", label: "Orders", icon: ShoppingBag, group: "Operations" },
  { view: "POS", id: "pos", label: "POS", icon: CreditCard, group: "Operations" },
  { view: "Captains", id: "captains", label: "Captains", icon: UserCog, group: "Operations" },
  { view: "Delivery Boys", id: "deliveryboys", label: "Delivery Boys", icon: Truck, group: "Operations" },
  { view: "Delivery Pool", id: "delivery-pool", label: "Delivery Pool", icon: Bike, group: "Operations" },

  { view: "Menu", id: "menu", label: "Menu", icon: UtensilsCrossed, group: "Catalog" },
  { view: "Stock Management", id: "stock-management", label: "Stock Management", icon: Boxes, group: "Catalog" },
  { view: "Purchase & Inventory", id: "inventory", label: "Purchase & Inventory", icon: PackageSearch, group: "Catalog" },
  { view: "Offers", id: "offers", label: "Offers", icon: Percent, group: "Catalog" },
  // The design calls this "Discounts". There is no Discounts activeView — it is
  // a Settings section, reached through the sg/ss deep-link params.
  { view: "Settings", id: "discounts", label: "Discounts", icon: Tag, group: "Catalog" },

  { view: "Website", id: "website", label: "Website", icon: Globe, group: "Storefront" },
  { view: "QrCodes", id: "qrcodes", label: "Tables", icon: QrCode, group: "Storefront" },
  { view: "WhatsApp", id: "whatsapp", label: "WhatsApp", icon: MessageSquare, group: "Storefront" },
  { view: "Notices", id: "notices", label: "Notices", icon: Bell, group: "Storefront" },

  { view: "Customers", id: "customers", label: "Customers", icon: Users, group: "Engagement" },
  { view: "Reviews", id: "reviews", label: "Reviews", icon: Star, group: "Engagement" },
  { view: "Loyalty", id: "loyalty", label: "Loyalty", icon: Gift, group: "Engagement" },
  { view: "Notify", id: "notify", label: "Notify", icon: Megaphone, group: "Engagement" },

  { view: "Billing", id: "billing", label: "Billing", icon: CreditCard, group: "Account" },
  { view: "Settlements", id: "settlements", label: "Settlements", icon: Landmark, group: "Account" },
  { view: "Tutorials", id: "tutorials", label: "Tutorials", icon: GraduationCap, group: "Account" },
  { view: "Petpooja Integration", id: "petpooja-integration", label: "Petpooja", icon: Plug, group: "Account" },
  { view: "Delivery Service Integration", id: "delivery-integration", label: "Delivery Service", icon: Bike, group: "Account" },
];

/** Sections v3 owns. Everything else hands off to admin-v2. */
export const V3_OWNED_VIEWS = new Set(["Dashboard"]);

/** Deep-link params for the Settings sub-sections the sidebar/quick actions target. */
export const SETTINGS_DEEP_LINKS: Record<string, string> = {
  discounts: "sg=ordering&ss=discounts",
};
