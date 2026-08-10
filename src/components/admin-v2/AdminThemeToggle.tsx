"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch for the admin dashboard.
 *
 * Separate from the shared <ModeToggle> on purpose — that one is a three-way
 * dropdown (Light / Dark / System) still used by the captain and Televery
 * navbars, and admin-v2 wants a straight two-state toggle with a visible label.
 * Changing the shared component would have altered those screens too.
 *
 * "System" is deliberately absent: AdminThemeWrapper mounts the provider with
 * enableSystem={false}, so a system option there could set a value the provider
 * never resolves. The dashboard should only ever be what the partner picked.
 *
 * `label` is off by default so the icon-only form fits a crowded toolbar.
 */
export function AdminThemeToggle({
    label = false,
    className,
}: {
    label?: boolean;
    className?: string;
}) {
    const { resolvedTheme, setTheme } = useTheme();
    // next-themes can't know the theme until it has read the DOM, so the first
    // client render must match the server's. Without this the label renders
    // "Light" on the server and "Dark" on the client and React throws a
    // hydration mismatch — the icon-only <ModeToggle> dodges it by expressing
    // the state purely in CSS, which a text label can't do.
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const isDark = mounted && resolvedTheme === "dark";
    const next = isDark ? "light" : "dark";

    return (
        <Button
            variant="ghost"
            size={label ? "sm" : "icon"}
            onClick={() => setTheme(next)}
            // The label names the CURRENT mode; the action is only clear from
            // the accessible name, so spell it out there.
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
            className={cn(label && "gap-2 px-2.5", className)}
        >
            {isDark ? (
                <Moon className="h-[1.1rem] w-[1.1rem] text-gray-600 dark:text-gray-400" />
            ) : (
                <Sun className="h-[1.1rem] w-[1.1rem] text-gray-600 dark:text-gray-400" />
            )}
            {label && (
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {/* Before mount there is no known theme; render the light
                        label to match the provider's defaultTheme="light". */}
                    {isDark ? "Dark" : "Light"}
                </span>
            )}
        </Button>
    );
}
