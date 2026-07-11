"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Smartphone, Apple } from "lucide-react";

// Rider apps + their store links. Shared by the Delivery Boy Management screen
// and the Delivery Pool panel so both offer the same downloads.
//   • petpooja → own / full-time delivery boys
//   • pool     → delivery pool / part-time / aggregator (Swiggy, Zomato) riders
const DELIVERY_APPS = {
    petpooja: {
        label: "Petpooja Delivery Boy App",
        android:
            "https://drive.google.com/file/d/1inKs5F6b6Ch18N4l22L2Em4hbeo0u8lH/view?usp=sharing",
        ios: "https://apps.apple.com/in/app/menuthere-delivery-app/id6763572900",
    },
    pool: {
        label: "Delivery Pool App",
        android:
            "https://drive.google.com/file/d/1EJdOjkHEytoT0y80tfabwgj0TSob10-K/view?usp=sharing",
        ios: "https://apps.apple.com/in/app/menuthere-go/id6784290207",
    },
} as const;

const openLink = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

/**
 * Renders a "Download <app> ▾" dropdown (Android / iOS) for each requested app.
 * `apps` picks which apps to show; defaults to both.
 */
export default function DeliveryAppDownloads({
    apps = ["petpooja", "pool"],
}: {
    apps?: Array<keyof typeof DELIVERY_APPS>;
}) {
    return (
        <>
            {apps.map((key) => {
                const app = DELIVERY_APPS[key];
                return (
                    <DropdownMenu key={key}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Download {app.label}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openLink(app.android)}>
                                <Smartphone className="mr-2 h-4 w-4" />
                                Android
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openLink(app.ios)}>
                                <Apple className="mr-2 h-4 w-4" />
                                iOS
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}
        </>
    );
}
