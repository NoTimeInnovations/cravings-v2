import React from "react";

import { AdminThemeWrapper } from "@/components/admin-v2/AdminThemeWrapper";
import { OrderSubscriptionManager } from "@/components/admin-v2/OrderSubscriptionManager";
import { getManagedOutletContext } from "@/app/actions/televerySession";
import { getSuperadminManagedContext } from "@/app/actions/superadminSession";
import { ManagingOutletBanner } from "@/components/televery/ManagingOutletBanner";

/**
 * Never statically prerendered — same reason as /admin-v2: this layout reads
 * httpOnly cookies to decide whether the dashboard is impersonated, so a static
 * render is not just useless, it is wrong, and Next logs the cookies() throw as
 * a red error on every production build.
 *
 * Access control for this route lives in src/proxy.ts, which is the SINGLE
 * authority on which dashboard a partner gets — see the note in
 * src/app/admin-v2/layout.tsx for why this layout must not second-guess it.
 */
export const dynamic = "force-dynamic";

export default async function AdminV3Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Resolved on the SERVER from the httpOnly cookies, so the banner is part of
    // the first paint — an impersonated dashboard is never rendered unmarked.
    const [sa, tv] = await Promise.all([
        getSuperadminManagedContext(),
        getManagedOutletContext(),
    ]);
    const managing = sa.managing || tv.managing;
    const outletName = sa.managing ? sa.partnerName : tv.outletName;
    const mode: "televery" | "superadmin" = sa.managing ? "superadmin" : "televery";

    return (
        <AdminThemeWrapper>
            {/* The ONLY thing that populates useOrderSubscriptionStore. Without
                it the Live Orders panel is permanently empty and the new-order
                sound / toast / Android bridge stop firing for v3 partners. */}
            <OrderSubscriptionManager />
            {managing ? (
                <div className="tv-managing-shell">
                    <ManagingOutletBanner outletName={outletName} mode={mode} />
                    {children}
                </div>
            ) : (
                children
            )}
        </AdminThemeWrapper>
    );
}
