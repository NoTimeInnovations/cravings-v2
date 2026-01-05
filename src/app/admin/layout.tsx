import React from "react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="pt-16">{children}</div>;
}
