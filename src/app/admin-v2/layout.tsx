import React from "react";
import { AdminThemeWrapper } from "@/components/admin-v2/AdminThemeWrapper";

import { OrderSubscriptionManager } from "@/components/admin-v2/OrderSubscriptionManager";
import { getManagedOutletContext } from "@/app/actions/televerySession";
import { getSuperadminManagedContext } from "@/app/actions/superadminSession";
import { ManagingOutletBanner } from "@/components/televery/ManagingOutletBanner";

/**
 * Never statically prerendered. This layout reads httpOnly cookies to decide
 * whether the dashboard is being impersonated, so a static render is not just
 * useless — it is wrong, and it was noisy: Next attempted a prerender at build
 * time, cookies() threw DYNAMIC_SERVER_USAGE, and the two context actions logged
 * it as a failure. Every production build showed
 *
 *   getSuperadminManagedContext failed: Error: Dynamic server usage: Route
 *   /admin-v2 couldn't be rendered statically because it used `cookies`
 *
 * in red while succeeding, which trains people to ignore build errors.
 */
export const dynamic = "force-dynamic";

/**
 * WHICH DASHBOARD a partner gets (v2 vs the /admin-v3 redesign) is decided in
 * ONE place: src/proxy.ts. Deliberately not mirrored here.
 *
 * An earlier version of this layout carried its own redirect as a "backstop".
 * That was actively harmful: the middleware reads the version from a short-TTL
 * module cache and this layout would have read it from unstable_cache, and the
 * moment those two disagreed — which is exactly what a superadmin flip causes,
 * since revalidateTag reaches one cache and not the other — the two guards
 * redirected at each other in a loop the browser could not break. The version is
 * a UI preference, not a security boundary, so a single authority is correct.
 */
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
