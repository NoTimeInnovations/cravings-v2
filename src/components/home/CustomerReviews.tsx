"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LocaleProvider";

type Review = {
  name: string;
  location: string;
  initials: string;
  body: string[];
};

// Module scope cannot call a hook, so each entry carries the dictionary KEYS
// for its copy and the component resolves them at render.
const REVIEWS = [
  {
    id: "reviewOne",
    nameKey: "reviewOneAuthorName",
    locationKey: "reviewOneAuthorLocation",
    initialsKey: "reviewOneAuthorInitials",
    bodyKeys: [
      "reviewOneParagraphOne",
      "reviewOneParagraphTwo",
      "reviewOneParagraphThree",
    ],
  },
  {
    id: "reviewTwo",
    nameKey: "reviewTwoAuthorName",
    locationKey: "reviewTwoAuthorLocation",
    initialsKey: "reviewTwoAuthorInitials",
    bodyKeys: [
      "reviewTwoParagraphOne",
      "reviewTwoParagraphTwo",
      "reviewTwoParagraphThree",
      "reviewTwoParagraphFour",
    ],
  },
] as const;

function ReviewCard({ review }: { review: Review }) {
  const { t } = useT();
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
          {expanded ? t.landing.reviewCollapseButton : t.landing.reviewExpandButton}
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
  const { t } = useT();

  return (
    <div
      data-section="reviews"
      className="mt-10 lg:mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-start"
    >
      {REVIEWS.map((review) => (
        <ReviewCard
          key={review.id}
          review={{
            name: t.landing[review.nameKey],
            location: t.landing[review.locationKey],
            initials: t.landing[review.initialsKey],
            body: review.bodyKeys.map((bodyKey) => t.landing[bodyKey]),
          }}
        />
      ))}
    </div>
  );
}
