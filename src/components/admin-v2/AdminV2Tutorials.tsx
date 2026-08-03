"use client";

import { useEffect, useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { fetchFromHasura } from "@/lib/hasuraClient";

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

// Which language the partner last watched in. A viewer preference, not partner
// config — it belongs to the device, not the store row.
const LANGUAGE_STORAGE_KEY = "adminV2TutorialsLanguage";

export function AdminV2Tutorials() {
  const [languages, setLanguages] = useState<TutorialLanguage[]>([]);
  const [activeLanguageId, setActiveLanguageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    localStorage.setItem(LANGUAGE_STORAGE_KEY, id);
  };

  const activeLanguage =
    languages.find((l) => l.id === activeLanguageId) ?? languages[0];
  const videos = activeLanguage?.videos ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Short walkthroughs of the dashboard. Pick your language below.
      </p>

      {languages.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => selectLanguage(lang.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                lang.id === activeLanguage?.id
                  ? "border-orange-600 bg-orange-100 text-orange-700 dark:border-orange-400 dark:bg-orange-900/20 dark:text-orange-400"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <PlayCircle className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No tutorials yet</p>
            <p className="text-sm text-muted-foreground">
              We&apos;re recording them — check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              {/* youtube-nocookie: the standard embed drops tracking cookies on
                  load, which we can't get consent for on behalf of EU/UAE
                  partners. */}
              <div className="relative aspect-video w-full bg-muted">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium leading-snug">
                  {video.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
