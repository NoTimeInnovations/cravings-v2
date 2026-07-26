import TeleveryGuard from "@/components/televery/TeleveryGuard";
import { AdminThemeWrapper } from "@/components/admin-v2/AdminThemeWrapper";

// The marketplace dashboard reuses admin-v2's theme wrapper, not just its look:
// tailwind runs darkMode:["class"] and only the next-themes provider ever puts
// `dark` on <html>. Without it the navbar's theme toggle is a dead control and
// every dark: variant in these screens is unreachable. The wrapper also strips
// `dark` on unmount, so leaving /televery doesn't darken the storefront.
export default function TeleveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeWrapper>
      <TeleveryGuard>{children}</TeleveryGuard>
    </AdminThemeWrapper>
  );
}
