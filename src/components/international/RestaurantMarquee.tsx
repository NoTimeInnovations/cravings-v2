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
    {
      url: "https://menuthere.com/qrScan/CHICKING-OOTY/6ec40577-e2d5-4a47-80ec-5e63ab9f9677",
      name: "CHICKING OOTY",
      logo: "/logos/chicking.png",
    },
    {
      url: "https://menuthere.com/hotels/3305e7f2-7e35-4ddc-8ced-c57e164d9247",
      name: "80's Malayalees",
      logo: "/logos/malayalees.jpg",
    },
    {
      url: "https://menuthere.com/hotels/f58ebdef-b59b-435e-a3bf-90e562a456ed",
      name: "Proyal",
      logo: "/logos/proyal.png",
    },
    {
      url: "https://menuthere.com/hotels/9e159a20-8c81-4986-b471-3876de315fc7",
      name: "Malabar Juice N Cafe",
      logo: "/logos/malabar.jpg",
    },
    {
      url: "https://menuthere.com/hotels/9c23425d-7489-4a00-9a61-809e3e2b96cc",
      name: "Chillies Restaurant",
      logo: "/logos/chillies.webp",
    },
    {
      url: "https://menuthere.com/hotels/e977b73a-c286-4572-bd1d-93345e960f7c",
      name: "CUP OF COFFEE",
      logo: "/logos/coc.webp",
    },
    {
      url: "https://menuthere.com/hotels/e7cba2a1-4474-4841-84b1-e1538d938fc7",
      name: "Bites Of Malabar",
      logo: "/logos/bites.webp",
    },
    {
      url: "https://menuthere.com/hotels/082a004a-a3f7-428d-89e0-f56d30e47ba0",
      name: "BISTRIO",
      logo: "/logos/bistrio.webp",
    },
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
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="overflow-hidden max-w-[70%] mx-auto my-20 ">
      <p className="text-center text-lg text-stone-500 mb-10 tracking-wide">
        600+ restaurants and cafes are creating digital menus, managing
        orders, and growing their business with Menuthere.
      </p>
      <div
        className="flex"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div
          ref={scrollRef}
          className="flex transition-transform will-change-transform"
        >
          {duplicated.map((r, i) => (
            <a
              href={r.url}
              key={i}
              rel="noreferrer"
              target="_blank"
              className="mx-8"
            >
              <div className="flex items-center justify-center h-24 w-24 bg-white rounded-full p-2 shadow-sm overflow-hidden relative border border-gray-100">
                <Image
                  src={r.logo}
                  alt={r.name}
                  fill
                  className="object-cover hover:scale-110 transition-transform duration-300 grayscale contrast-70 hover:contrast-100 hover:grayscale-0"
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
