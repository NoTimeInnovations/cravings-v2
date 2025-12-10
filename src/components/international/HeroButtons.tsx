"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function HeroButtons() {
    const router = useRouter();

    return (
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <Button
                onClick={() => router.push("/get-started")}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 rounded-full text-lg shadow-lg hover:shadow-xl transition-all"
            >
                Get free Menu
            </Button>

            <Button
                variant="outline"
                onClick={() => window.open("https://www.cravings.live/hotels/LE-GRAND-CAFE/20f7e974-f19e-4c11-b6b7-4385f61f27bf", "_blank")}
                className="border-orange-600 text-orange-600 px-8 py-6 rounded-full text-lg hover:bg-orange-50"
            >
                View Demo
            </Button>
        </div>
    );
}
