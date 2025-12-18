"use client";
import * as React from "react";
import { ThemeProvider } from "@/providers/theme-provider";

export function CaptainThemeWrapper({ children }: { children: React.ReactNode }) {
    React.useEffect(() => {
        return () => {
            // Cleanup dark mode when leaving captain
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
