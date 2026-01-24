'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"

function PostHogPageview() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (pathname && typeof window !== 'undefined') {
            // Exclude specific paths from pageview tracking  
            const excludedPaths = ['/superadmin', '/qrScan', '/admin', '/bill', '/kot', '/admin-v2'];

            // Check if pathname starts with any excluded path  
            const isExcluded = excludedPaths.some(path => pathname.startsWith(path));

            if (isExcluded) {
                return;
            }

            // Only capture on menuthere.com
            if (!window.location.hostname.includes('menuthere.com')) {
                return;
            }

            let url = window.origin + pathname;
            if (searchParams && searchParams.toString()) {
                url = url + `?${searchParams.toString()}`;
            }

            posthog.capture('$pageview', {
                '$current_url': url,
            });
        }
    }, [pathname, searchParams]);

    return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Only initialize PostHog on menuthere.com
        if (typeof window !== 'undefined' && window.location.hostname.includes('menuthere.com')) {
            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
                person_profiles: 'identified_only',
                capture_pageview: false,
                defaults: '2025-11-30',
            })
        }
    }, [])

    return (
        <PHProvider client={posthog}>
            <Suspense fallback={null}>
                <PostHogPageview />
            </Suspense>
            {children}
        </PHProvider>
    )
}
