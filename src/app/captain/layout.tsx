import React from "react";
import { CaptainThemeWrapper } from "@/components/captain/CaptainThemeWrapper";

export default function CaptainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <CaptainThemeWrapper>
            {children}
        </CaptainThemeWrapper>
    );
}
