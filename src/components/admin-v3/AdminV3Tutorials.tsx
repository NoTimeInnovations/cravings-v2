"use client";

import * as React from "react";
import { Info, Loader2, MessageCircle, Play, Search, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { V3Card } from "./ui/primitives";

/* -------------------------------------------------------------------- data */

interface TutorialVideo {
  id: string;
  title: string;
  youtube_id: string;
}

interface TutorialLanguage {
  id: string;
  name: string;
  videos: TutorialVideo[];
}

/** Identical to admin-v2's query — same tables, same filters, same ordering. */
const getTutorialsQuery = `
  query GetTutorials {
    tutorial_languages(
      where: { is_active: { _eq: true } }
      order_by: { priority: asc }
    ) {
      id
      name
      videos(
        where: { is_active: { _eq: true } }
        order_by: { priority: asc }
      ) {
        id
        title
        youtube_id
      }
    }
  }
`;

// Same storage key as admin-v2 on purpose: a partner who picked Malayalam in the
// old dashboard should not have to pick it again in the new one.
const LANGUAGE_STORAGE_KEY = "adminV2TutorialsLanguage";

const SUPPORT_WA_NUMBER = "917012944024";
const SUPPORT_URL = `https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(
  "Hi, I need help with the dashboard.",
)}`;

/* ------------------------------------------------------------------ screen */

export function AdminV3Tutorials() {
  const [languages, setLanguages] = React.useState<TutorialLanguage[]>([]);
  const [activeLanguageId, setActiveLanguageId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [playingId, setPlayingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchFromHasura(getTutorialsQuery);
        const rows: TutorialLanguage[] = res?.tutorial_languages ?? [];
        if (cancelled) return;

        setLanguages(rows);

        // Restore the remembered language, but only if it still exists/is active
        // — a removed language must not leave the screen stuck on nothing.
        const remembered =
          typeof window !== "undefined"
            ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
            : null;
        const restored = rows.find((l) => l.id === remembered);
        setActiveLanguageId(restored?.id ?? rows[0]?.id ?? null);
      } catch {
        // fetchFromHasura already logs the underlying error.
        if (!cancelled) toast.error("Could not load tutorials");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectLanguage = (id: string) => {
    setActiveLanguageId(id);
    // Switching language swaps the whole grid out; leaving a player mounted
    // would keep audio running from a video that is no longer on screen.
    setPlayingId(null);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, id);
    } catch {
      // Private mode / blocked storage — the choice just won't persist.
    }
  };

  const activeLanguage =
    languages.find((l) => l.id === activeLanguageId) ?? languages[0];
  const videos = React.useMemo(() => activeLanguage?.videos ?? [], [activeLanguage]);

  const needle = query.trim().toLowerCase();
  const filtered = React.useMemo(
    () => (needle ? videos.filter((v) => v.title.toLowerCase().includes(needle)) : videos),
    [videos, needle],
  );

  // "More X walkthroughs are being recorded" — only claimed when it is true,
  // i.e. some other language genuinely carries more videos than this one.
  const fullestLanguage = React.useMemo(
    () =>
      languages.reduce<TutorialLanguage | null>(
        (best, l) => (!best || l.videos.length > best.videos.length ? l : best),
        null,
      ),
    [languages],
  );
  const isPartial =
    !!activeLanguage &&
    !!fullestLanguage &&
    fullestLanguage.id !== activeLanguage.id &&
    fullestLanguage.videos.length > videos.length;

  const countLabel = needle
    ? `${filtered.length} of ${videos.length} ${videos.length === 1 ? "tutorial" : "tutorials"}`
    : `${videos.length} ${videos.length === 1 ? "tutorial" : "tutorials"}`;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-400 dark:text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* ------------------------------------------------------------ toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 gap-y-2.5 px-3.5 lg:px-0">
        {languages.length > 1 && (
          <div className="inline-flex gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-800 dark:bg-zinc-800/60">
            {languages.map((lang) => {
              const active = lang.id === activeLanguage?.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => selectLanguage(lang.id)}
                  aria-pressed={active}
                  className={cn(
                    "h-[30px] rounded-md border px-3 text-[12.5px] leading-none transition-colors",
                    active
                      ? "border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      : "border-transparent bg-transparent font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  {lang.name}
                </button>
              );
            })}
          </div>
        )}

        <label className="flex h-9 min-w-0 max-w-[300px] flex-[1_1_200px] items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
          <Search className="h-[15px] w-[15px] shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.8} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tutorials"
            aria-label="Search tutorials"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </label>

        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">{countLabel}</span>

        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
        >
          <MessageCircle className="h-[15px] w-[15px] shrink-0 text-green-700 dark:text-green-500" strokeWidth={1.8} />
          Ask support
        </a>
      </div>

      {/* --------------------------------------------------------------- grid */}
      {filtered.length === 0 ? (
        <V3Card className="px-4 py-14 text-center">
          <Play className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" strokeWidth={1.6} />
          <p className="mt-3 text-[14.5px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {needle ? "No tutorials match that search" : "No tutorials yet"}
          </p>
          <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            {needle
              ? "Try a different word, or clear the search."
              : "We're recording them — check back soon."}
          </p>
        </V3Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              playing={playingId === video.id}
              onPlay={() => setPlayingId(video.id)}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------ partial notice */}
      {isPartial && fullestLanguage && activeLanguage && (
        <V3Card className="flex gap-[9px] px-4 py-3.5">
          <Info className="mt-[1px] h-[15px] w-[15px] shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.8} />
          <span className="text-xs leading-[1.55] text-zinc-500 dark:text-zinc-400">
            More {activeLanguage.name} walkthroughs are being recorded. Switch to{" "}
            {fullestLanguage.name} to see all of them.
          </span>
        </V3Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- video card */

function VideoCard({
  video,
  playing,
  onPlay,
}: {
  video: TutorialVideo;
  playing: boolean;
  onPlay: () => void;
}) {
  const [thumbFailed, setThumbFailed] = React.useState(false);

  return (
    <V3Card className="flex flex-col overflow-hidden">
      <div className="relative flex aspect-video items-center justify-center border-b border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
        {playing ? (
          // youtube-nocookie: the standard embed drops tracking cookies on load,
          // which we can't get consent for on behalf of EU/UAE partners. The
          // iframe is only mounted after an explicit click, so nothing loads
          // from YouTube until the partner asks for it.
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Play ${video.title}`}
            className="group absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-50"
          >
            {!thumbFailed && (
              // Poster only — no YouTube script, no cookies.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                onError={() => setThumbFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <span className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full bg-zinc-900 pl-[3px] text-zinc-50 shadow-[0_1px_4px_rgba(9,9,11,.35)] transition-transform group-hover:scale-105 dark:bg-zinc-50 dark:text-zinc-900">
              <Play className="h-[18px] w-[18px] fill-current" strokeWidth={0} />
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-[9px] px-3.5 py-[13px]">
        <div className="text-[13.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          {video.title}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 gap-y-2">
          <a
            href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-8 shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <SquareArrowOutUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.8} />
            YouTube
          </a>
        </div>
      </div>
    </V3Card>
  );
}
