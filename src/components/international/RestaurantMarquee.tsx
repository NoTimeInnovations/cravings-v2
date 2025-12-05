"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";

interface Restaurant {
    url: string;
    name: string;
    logo: string;
}

export default function RestaurantMarquee() {
    const restaurants: Restaurant[] = [
        { url: "https://www.cravings.live/qrScan/CHICKING-OOTY/6ec40577-e2d5-4a47-80ec-5e63ab9f9677", name: "CHICKING OOTY", logo: "/logos/chicking.png" },
        { url: "https://www.cravings.live/hotels/3305e7f2-7e35-4ddc-8ced-c57e164d9247", name: "80's Malayalees", logo: "/logos/malayalees.jpg" },
        { url: "https://www.cravings.live/hotels/f58ebdef-b59b-435e-a3bf-90e562a456ed", name: "Proyal", logo: "/logos/proyal.png" },
        { url: "https://www.cravings.live/hotels/9e159a20-8c81-4986-b471-3876de315fc7", name: "Malabar Juice N Cafe", logo: "/logos/malabar.jpg" },
        { url: "https://www.cravings.live/hotels/9c23425d-7489-4a00-9a61-809e3e2b96cc", name: "Chillies Restaurant", logo: "/logos/chillies.webp" },
        { url: "https://www.cravings.live/hotels/e977b73a-c286-4572-bd1d-93345e960f7c", name: "CUP OF COFFEE", logo: "/logos/coc.webp" },
        { url: "https://www.cravings.live/hotels/3980e6dd-65ca-4b36-825d-410867d8d67d", name: "Periyar Club", logo: "/logos/periyar.webp" },
        { url: "https://www.cravings.live/hotels/e7cba2a1-4474-4841-84b1-e1538d938fc7", name: "Bites Of Malabar", logo: "/logos/bites.webp" },
        { url: "https://www.cravings.live/hotels/082a004a-a3f7-428d-89e0-f56d30e47ba0", name: "BISTRIO", logo: "/logos/bistrio.webp" }
    ];

    const duplicated = [...restaurants, ...restaurants, ...restaurants];
    const scrollRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        let pos = 0;
        const step = () => {
            if (!scrollRef.current) return;
            pos -= 0.6; // speed
            if (pos <= -1500) pos = 0;
            scrollRef.current.style.transform = `translateX(${pos}px)`;
            animationRef.current = requestAnimationFrame(step);
        };
        animationRef.current = requestAnimationFrame(step);
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, []);

    return (
        <div className="overflow-hidden">
            <div className="flex" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                <div ref={scrollRef} className="flex transition-transform will-change-transform">
                    {duplicated.map((r, i) => (
                        <a href={r.url} key={i} rel="noreferrer" target="_blank" className="mx-3">
                            <div className="bg-white rounded-lg flex items-center justify-center h-28 w-44">
                                <Image src={r.logo} alt={r.name} width={140} height={64} className="object-contain" />
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
