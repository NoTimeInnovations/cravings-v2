import React from "react";
import { AdminThemeWrapper } from "@/components/admin-v2/AdminThemeWrapper";

import { OrderSubscriptionManager } from "@/components/admin-v2/OrderSubscriptionManager";
import { getManagedOutletContext } from "@/app/actions/televerySession";
import { getSuperadminManagedContext } from "@/app/actions/superadminSession";
import { ManagingOutletBanner } from "@/components/televery/ManagingOutletBanner";

export default async function AdminV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Resolved on the SERVER from the httpOnly cookies, so the banner is part of
    // the first paint — an impersonated dashboard is never rendered unmarked,
    // not even for a frame. Returns immediately (no query) for ordinary partners.
    // Both swap kinds are checked, because either can be the live one. They are
    // mutually exclusive in practice — each marker requires the session it was
    // minted alongside — but the superadmin one is read first so that if a device
    // somehow carried both, the more powerful return path is the one offered.
    const [sa, tv] = await Promise.all([
        getSuperadminManagedContext(),
        getManagedOutletContext(),
    ]);
    const managing = sa.managing || tv.managing;
    const outletName = sa.managing ? sa.partnerName : tv.outletName;
    const mode: "televery" | "superadmin" = sa.managing ? "superadmin" : "televery";

    return (
        <AdminThemeWrapper>
            <OrderSubscriptionManager />
            {managing ? (
                // The wrapper exists only while managing: it scopes the banner's
                // shell-shrink rule so the normal dashboard tree is untouched.
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
