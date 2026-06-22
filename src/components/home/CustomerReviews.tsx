"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Review = {
  name: string;
  location: string;
  initials: string;
  body: string[];
};

const REVIEWS: Review[] = [
  {
    name: "Hotel Colombo",
    location: "MG Road, Edappally",
    initials: "HC",
    body: [
      "Honestly, I never thought making an app would be this easy 😅 they handled everything smoothly and made the whole process super simple for us.",
      "And they made it look exactly how I wanted. I was very particular about a few things and wasn't ready to compromise at all — we went through multiple reworks, but they were super patient and calm throughout and got it exactly right.",
      "Very clean work, thank you soo much guys.",
    ],
  },
  {
    name: "Rimaal Mandi & Grills",
    location: "Pune",
    initials: "RM",
    body: [
      "Thanks to the MenuThere team for developing our app. The app helps customers order directly from us and makes delivery management much easier. We also provided third-party delivery options such as Porter, and the team successfully integrated them into the system. Everything has been working smoothly, and they have done a great job.",
      "The main reason we launched this app is because, while platforms like Zomato and Swiggy bring us good business and customer reach, the payout side can sometimes be challenging due to commissions and other costs. Of course, we cannot avoid Zomato and Swiggy, as many customers are used to ordering through them, and we will continue to work with them.",
      "At the same time, this app gives us another channel to connect directly with our customers and serve them better.",
      "Thank you, MenuThere team, for your support and excellent work.",
    ],
  },
];

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const el = textRef.current;
      if (el) setOverflowing(el.scrollHeight > el.clientHeight + 4);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <figure
      className={cn(
        "flex flex-col rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50/40 to-white p-5 md:p-6 shadow-sm transition-[height]",
        expanded ? "h-auto" : "h-[300px]"
      )}
    >
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={textRef}
          className={cn(
            "h-full space-y-3",
            expanded
              ? "overflow-visible"
              : "overflow-hidden",
            !expanded &&
              overflowing &&
              "[-webkit-mask-image:linear-gradient(to_bottom,#000_70%,transparent)] [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]"
          )}
        >
          {review.body.map((paragraph, i) => (
            <p
              key={i}
              className="text-stone-700 text-sm md:text-[15px] leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 self-start text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <figcaption className="mt-6 flex items-center gap-4 border-t border-orange-100/70 pt-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-orange-600 ring-1 ring-orange-100">
          {review.initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-stone-900">
            {review.name}
          </div>
          <div className="text-xs text-stone-500">{review.location}</div>
        </div>
      </figcaption>
    </figure>
  );
}

export default function CustomerReviews() {
  return (
    <div
      data-section="reviews"
      className="mt-10 lg:mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-start"
    >
      {REVIEWS.map((review) => (
        <ReviewCard key={review.name} review={review} />
      ))}
    </div>
  );
}
