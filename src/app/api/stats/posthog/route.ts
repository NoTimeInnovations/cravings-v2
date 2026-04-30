import { NextRequest, NextResponse } from "next/server";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const POSTHOG_API_HOST = POSTHOG_HOST.replace("us.i.", "us.").replace(
  "eu.i.",
  "eu."
);
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

export const revalidate = 60;
export const dynamic = "force-dynamic";

type Range = "1d" | "7d" | "30d" | "90d" | "365d";
const RANGE_DAYS: Record<Range, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

function emptyResponse(reason: string) {
  return NextResponse.json({
    enabled: false,
    reason,
    visitors: null,
    visitorsPrev: null,
    visitorsDelta: null,
    sessions: null,
    pageviews: null,
    landingVisitors: null,
    landingPageviews: null,
    landingDelta: null,
    daily: [],
    topReferrers: [],
    topSearches: [],
    topCities: [],
    topCountries: [],
    syncedAt: new Date().toISOString(),
  });
}

async function hogQuery(hogql: string) {
  const r = await fetch(
    `${POSTHOG_API_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
      cache: "no-store",
    }
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PostHog query failed: ${r.status} ${text.slice(0, 200)}`);
  }
  return r.json();
}

export async function GET(req: NextRequest) {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
    return emptyResponse("POSTHOG_PROJECT_ID or POSTHOG_PERSONAL_API_KEY not set");
  }

  const range = (req.nextUrl.searchParams.get("range") ?? "30d") as Range;
  const days = RANGE_DAYS[range] ?? 30;

  try {
    const [
      visitorsCurr,
      visitorsPrev,
      daily,
      referrers,
      searches,
      cities,
      landingCurr,
      landingPrev,
      countries,
    ] = await Promise.all([
        hogQuery(
          `SELECT count(DISTINCT distinct_id) AS visitors,
                  count(DISTINCT $session_id) AS sessions,
                  count() AS pageviews
           FROM events
           WHERE event = '$pageview'
             AND timestamp >= now() - INTERVAL ${days} DAY`
        ),
        hogQuery(
          `SELECT count(DISTINCT distinct_id) AS visitors
           FROM events
           WHERE event = '$pageview'
             AND timestamp >= now() - INTERVAL ${days * 2} DAY
             AND timestamp <  now() - INTERVAL ${days} DAY`
        ),
        hogQuery(
          `SELECT toDate(timestamp) AS d,
                  count(DISTINCT distinct_id) AS visitors,
                  count() AS pageviews
           FROM events
           WHERE event = '$pageview'
             AND timestamp >= now() - INTERVAL ${days} DAY
           GROUP BY d
           ORDER BY d ASC`
        ),
        hogQuery(
          `SELECT properties.$referring_domain AS domain, count() AS c
           FROM events
           WHERE event = '$pageview'
             AND properties.$referring_domain IS NOT NULL
             AND properties.$referring_domain != ''
             AND timestamp >= now() - INTERVAL ${days} DAY
           GROUP BY domain
           ORDER BY c DESC
           LIMIT 10`
        ),
        hogQuery(
          `SELECT properties.q AS query, count() AS c
           FROM events
           WHERE event = 'search'
             AND properties.q IS NOT NULL
             AND properties.q != ''
             AND timestamp >= now() - INTERVAL ${days} DAY
           GROUP BY query
           ORDER BY c DESC
           LIMIT 10`
        ),
        hogQuery(
          `SELECT properties.$geoip_city_name AS city, count(DISTINCT distinct_id) AS c
           FROM events
           WHERE event = '$pageview'
             AND properties.$geoip_city_name IS NOT NULL
             AND properties.$geoip_city_name != ''
             AND timestamp >= now() - INTERVAL ${days} DAY
           GROUP BY city
           ORDER BY c DESC
           LIMIT 10`
        ),
        hogQuery(
          `SELECT count(DISTINCT distinct_id) AS visitors,
                  count() AS pageviews
           FROM events
           WHERE event = '$pageview'
             AND properties.$pathname = '/'
             AND timestamp >= now() - INTERVAL ${days} DAY`
        ),
        hogQuery(
          `SELECT count(DISTINCT distinct_id) AS visitors
           FROM events
           WHERE event = '$pageview'
             AND properties.$pathname = '/'
             AND timestamp >= now() - INTERVAL ${days * 2} DAY
             AND timestamp <  now() - INTERVAL ${days} DAY`
        ),
        hogQuery(
          `SELECT properties.$geoip_country_name AS country,
                  properties.$geoip_country_code AS code,
                  count(DISTINCT distinct_id) AS c
           FROM events
           WHERE event = '$pageview'
             AND properties.$geoip_country_name IS NOT NULL
             AND properties.$geoip_country_name != ''
             AND timestamp >= now() - INTERVAL ${days} DAY
           GROUP BY country, code
           ORDER BY c DESC
           LIMIT 15`
        ),
      ]);

    const visitorsRow = visitorsCurr?.results?.[0] ?? [];
    const prevRow = visitorsPrev?.results?.[0] ?? [];
    const visitors = Number(visitorsRow[0] ?? 0);
    const sessions = Number(visitorsRow[1] ?? 0);
    const pageviews = Number(visitorsRow[2] ?? 0);
    const visitorsPrevCount = Number(prevRow[0] ?? 0);
    const visitorsDelta =
      visitorsPrevCount > 0
        ? Math.round(
            ((visitors - visitorsPrevCount) / visitorsPrevCount) * 1000
          ) / 10
        : null;

    const landingRow = landingCurr?.results?.[0] ?? [];
    const landingPrevRow = landingPrev?.results?.[0] ?? [];
    const landingVisitors = Number(landingRow[0] ?? 0);
    const landingPageviews = Number(landingRow[1] ?? 0);
    const landingPrevCount = Number(landingPrevRow[0] ?? 0);
    const landingDelta =
      landingPrevCount > 0
        ? Math.round(
            ((landingVisitors - landingPrevCount) / landingPrevCount) * 1000
          ) / 10
        : null;

    return NextResponse.json({
      enabled: true,
      visitors,
      visitorsPrev: visitorsPrevCount,
      visitorsDelta,
      sessions,
      pageviews,
      landingVisitors,
      landingPageviews,
      landingDelta,
      daily: (daily?.results ?? []).map((r: any[]) => ({
        d: r[0],
        visitors: Number(r[1] ?? 0),
        pageviews: Number(r[2] ?? 0),
      })),
      topReferrers: (referrers?.results ?? []).map((r: any[]) => ({
        domain: r[0],
        count: Number(r[1] ?? 0),
      })),
      topSearches: (searches?.results ?? []).map((r: any[]) => ({
        query: r[0],
        count: Number(r[1] ?? 0),
      })),
      topCities: (cities?.results ?? []).map((r: any[]) => ({
        city: r[0],
        count: Number(r[1] ?? 0),
      })),
      topCountries: (countries?.results ?? []).map((r: any[]) => ({
        country: r[0],
        code: r[1],
        count: Number(r[2] ?? 0),
      })),
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("PostHog stats failed", e);
    return emptyResponse(e?.message ?? "failed");
  }
}
