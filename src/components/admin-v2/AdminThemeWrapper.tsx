"use client";

import * as React from "react";
import { ThemeProvider } from "@/providers/theme-provider";

export function AdminThemeWrapper({ children }: { children: React.ReactNode }) {
    React.useEffect(() => {
        return () => {
            // Cleanup dark mode when leaving admin-v2
            document.documentElement.classList.remove("dark");
            document.documentElement.style.removeProperty("color-scheme");
        };
    }, []);

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
    );
}
