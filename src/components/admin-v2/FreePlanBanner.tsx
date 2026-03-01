"use client";

import { Crown } from "lucide-react";
import Link from "next/link";

interface FreePlanBannerProps {
    message: string;
}

export function FreePlanBanner({ message }: FreePlanBannerProps) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <Crown className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-200">
                {message} <Link href="/pricing" className="font-semibold underline cursor-pointer">Upgrade your plan</Link> to unlock full control.
            </p>
        </div>
    );
}
