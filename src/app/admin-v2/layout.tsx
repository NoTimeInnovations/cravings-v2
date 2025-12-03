import React from "react";
import { AdminThemeWrapper } from "@/components/admin-v2/AdminThemeWrapper";

export default function AdminV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminThemeWrapper>{children}</AdminThemeWrapper>;
}
