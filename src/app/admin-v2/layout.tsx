import React from "react";
import { AdminThemeWrapper } from "@/components/admin-v2/AdminThemeWrapper";

import { OrderSubscriptionManager } from "@/components/admin-v2/OrderSubscriptionManager";
import { getManagedOutletContext } from "@/app/actions/televerySession";
import { ManagingOutletBanner } from "@/components/televery/ManagingOutletBanner";

export default async function AdminV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Resolved on the SERVER from the httpOnly cookies, so the banner is part of
    // the first paint — an impersonated dashboard is never rendered unmarked,
    // not even for a frame. Returns immediately (no query) for ordinary partners.
    const { managing, outletName } = await getManagedOutletContext();

    return (
        <AdminThemeWrapper>
            <OrderSubscriptionManager />
            {managing ? (
                // The wrapper exists only while managing: it scopes the banner's
                // shell-shrink rule so the normal dashboard tree is untouched.
                <div className="tv-managing-shell">
                    <ManagingOutletBanner outletName={outletName} />
                    {children}
                </div>
            ) : (
                children
            )}
        </AdminThemeWrapper>
    );
}
