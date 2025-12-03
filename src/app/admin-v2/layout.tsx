import React from "react";
import { AdminThemeWrapper } from "@/components/admin-v2/AdminThemeWrapper";

import { OrderSubscriptionManager } from "@/components/admin-v2/OrderSubscriptionManager";

export default function AdminV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminThemeWrapper>
            <OrderSubscriptionManager />
            {children}
        </AdminThemeWrapper>
    );
}
