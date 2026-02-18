"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState, useRef, createContext, useContext } from "react";

// Lightweight context that provides posthog instance (or null while loading)
const PostHogContext = createContext<any>(null);
export const usePostHog = () => useContext(PostHogContext);

function PostHogPageview({ posthog }: { posthog: any }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (
      pathname &&
      posthog &&
      typeof window !== "undefined" &&
      window.location.hostname.includes("menuthere.com")
    ) {
      const excludedPaths = [
        "/superadmin",
        "/qrScan",
        "/admin",
        "/bill",
        "/kot",
        "/admin-v2",
      ];

      const isExcluded = excludedPaths.some((path) =>
        pathname.startsWith(path),
      );

      if (isExcluded) {
        return;
      }

      if (!window.location.hostname.includes("menuthere.com")) {
        return;
      }

      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }

      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthog, setPosthog] = useState<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (typeof window === "undefined") return;

    // Delay PostHog initialization to avoid blocking main thread on initial load
    const timer = setTimeout(() => {
      import("posthog-js").then((mod) => {
        const ph = mod.default;

        if (window.location.hostname.includes("menuthere.com")) {
          ph.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
            api_host:
              process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
            person_profiles: "identified_only",
            capture_pageview: false,
            autocapture: false,
          });
        } else {
          if (
            ph.has_opted_out_capturing &&
            !ph.has_opted_out_capturing()
          ) {
            ph.opt_out_capturing();
          }
        }

        setPosthog(ph);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <PostHogContext.Provider value={posthog}>
      {posthog && (
        <Suspense fallback={null}>
          <PostHogPageview posthog={posthog} />
        </Suspense>
      )}
      {children}
    </PostHogContext.Provider>
  );
}
