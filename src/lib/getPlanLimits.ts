export interface PlanLimits {
  max_qr_codes: number;
  theme_customization: boolean;
  custom_banner: boolean;
  branding_removable: boolean;
  variants: boolean;
  ai_image_fetch: boolean;
  custom_username: boolean;
  google_business: string;
  analytics: string;
  download_reports: boolean;
  offers: boolean;
  priority_support: boolean;
}

const FREE_PLAN_IDS = ["in_free", "int_free"];

const FREE_PLAN_LIMITS: PlanLimits = {
  max_qr_codes: 1,
  theme_customization: false,
  custom_banner: true,
  branding_removable: false,
  variants: true,
  ai_image_fetch: true,
  custom_username: true,
  google_business: "once",
  analytics: "basic",
  download_reports: false,
  offers: true,
  priority_support: false,
};

const PAID_PLAN_LIMITS: PlanLimits = {
  max_qr_codes: Infinity,
  theme_customization: true,
  custom_banner: true,
  branding_removable: true,
  variants: true,
  ai_image_fetch: true,
  custom_username: true,
  google_business: "unlimited",
  analytics: "full",
  download_reports: true,
  offers: true,
  priority_support: true,
};

export function isFreePlan(planId: string | undefined | null): boolean {
  if (!planId) return true;
  return FREE_PLAN_IDS.includes(planId);
}

export function getPlanLimits(planId: string | undefined | null): PlanLimits {
  if (isFreePlan(planId)) {
    return FREE_PLAN_LIMITS;
  }
  return PAID_PLAN_LIMITS;
}
