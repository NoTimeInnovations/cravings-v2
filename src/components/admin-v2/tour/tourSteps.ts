export interface TourStep {
  selector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const DESKTOP_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="hamburger-menu"]',
    title: "Toggle Navigation",
    description:
      "Click here to show or hide the sidebar navigation. Access all your dashboard features from the sidebar.",
    position: "bottom",
  },
  {
    selector: '[data-tour="sidebar"]',
    title: "Main Navigation",
    description:
      "Access all features from here: Menu management, Orders, Analytics, Settings, and more. Each section is just a click away.",
    position: "right",
  },
  {
    selector: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    description:
      "Your most-used features at your fingertips. Quickly view your menu, manage orders, edit items, and access QR codes.",
    position: "bottom",
  },
  {
    selector: '[data-tour="tutorials"]',
    title: "Video Tutorials",
    description:
      "Watch helpful video guides to learn how to use Menuthere effectively. Toggle between English and Malayalam tutorials.",
    position: "top",
  },
  {
    selector: '[data-tour="dark-mode"]',
    title: "Theme Switcher",
    description:
      "Switch between light and dark mode for comfortable viewing anytime.",
    position: "bottom",
  },
  {
    selector: '[data-tour="notifications"]',
    title: "Order Notifications",
    description:
      "Get real-time notifications when you receive new orders from customers.",
    position: "bottom",
  },
  {
    selector: '[data-tour="account-switcher"]',
    title: "Account Management",
    description:
      "Switch between multiple restaurant accounts or logout from here. Manage all your businesses in one place.",
    position: "bottom",
  },
];

export const MOBILE_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="hamburger-menu"]',
    title: "Navigation Menu",
    description:
      "Tap here to open the navigation menu and access all dashboard features like Menu, Orders, Analytics, and Settings.",
    position: "bottom",
  },
  {
    selector: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    description:
      "Tap these shortcuts to quickly access your most-used features: view menu, manage orders, edit menu, and more.",
    position: "top",
  },
  {
    selector: '[data-tour="tutorials"]',
    title: "Video Tutorials",
    description:
      "Watch helpful guides to learn how to use Menuthere. Switch between English and Malayalam tutorials.",
    position: "top",
  },
  {
    selector: '[data-tour="dark-mode"]',
    title: "Theme & Settings",
    description:
      "Switch between light and dark themes for comfortable viewing anytime.",
    position: "bottom",
  },
  {
    selector: '[data-tour="account-switcher"]',
    title: "Account Menu",
    description:
      "Switch between restaurant accounts or logout. Get notifications for new orders here too.",
    position: "bottom",
  },
];
