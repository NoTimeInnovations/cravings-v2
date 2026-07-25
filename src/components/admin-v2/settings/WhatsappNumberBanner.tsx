"use client";

import { AlertCircle } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { hasValidWhatsappNumbers } from "@/lib/whatsappNumber";

/**
 * Warns when the partner's WhatsApp number is missing or malformed. A valid
 * number is required to book Porter deliveries, and Settings → Delivery blocks
 * saving without one — this surfaces the problem up front (at the top of Store &
 * Ordering settings) instead of only failing when the partner tries to save a
 * delivery change. Renders nothing when a valid number is set.
 */
export function WhatsappNumberBanner() {
  const { userData } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const countryCode = (userData as any)?.country_code || "+91";
  const numbers = (userData as any)?.whatsapp_numbers as
    | { number: string; area: string }[]
    | undefined;

  if (!userData || hasValidWhatsappNumbers(numbers, countryCode)) return null;

  // Open Settings → Store → General and land on the WhatsApp field. The settings
  // router reads `sg`/`ss` to switch sections; General reads `focus=whatsapp` to
  // scroll to and focus the input.
  const goToStoreSettings = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("sg", "store");
    params.set("ss", "general");
    params.set("focus", "whatsapp");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const notSet = !Array.isArray(numbers) || numbers.length === 0;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="font-semibold">
          {notSet ? "Add your WhatsApp number" : "Fix your WhatsApp number"}
        </p>
        <p className="text-amber-700">
          A valid WhatsApp number is required to book Porter deliveries.{" "}
          {notSet
            ? "You haven't set one yet."
            : "The saved number looks invalid — enter digits only, with no country code or spaces."}{" "}
          <button
            type="button"
            onClick={goToStoreSettings}
            className="font-semibold underline underline-offset-2 hover:text-amber-900"
          >
            Set it up in Store settings
          </button>
          .
        </p>
      </div>
    </div>
  );
}
