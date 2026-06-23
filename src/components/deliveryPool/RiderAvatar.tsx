"use client";

/** Rider profile photo (presigned) with an initials fallback. */
export default function RiderAvatar({
  url,
  name,
  size = 32,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name || "R").toString().trim()[0]?.toUpperCase() || "R";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-semibold overflow-hidden"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name || "rider"} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
