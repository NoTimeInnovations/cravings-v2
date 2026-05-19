"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live rider coordinates from the heartbeat hub, polled every 3 s.
 *
 * Stop conditions:
 *  - orderId is empty
 *  - `paused` flag flips true (caller passes terminal status here)
 *  - 4 consecutive 404s in a row (rider went offline) — we keep the last
 *    known sample, just stop hammering the endpoint
 *  - document is hidden (cuts read traffic ~30–50% in practice)
 *
 * Returns the freshest sample we've seen this session — falls back to the
 * caller's `seed` (typically `delivery_boys.current_lat/lng` from the
 * existing Hasura query) so the map dot is never blank during first paint.
 */
export interface LiveAgentSample {
  lat: number;
  lng: number;
  tsMs: number;
  ageSec: number;
  source: "live" | "seed";
}

export function useLiveAgentLocation(args: {
  orderId: string | null | undefined;
  paused?: boolean;
  seed?: { lat: number; lng: number; updatedAtMs?: number } | null;
  intervalMs?: number;
}): LiveAgentSample | null {
  const { orderId, paused = false, seed = null, intervalMs = 3000 } = args;
  const [sample, setSample] = useState<LiveAgentSample | null>(() =>
    seed
      ? {
          lat: seed.lat,
          lng: seed.lng,
          tsMs: seed.updatedAtMs ?? Date.now(),
          ageSec: seed.updatedAtMs
            ? Math.max(0, Math.floor((Date.now() - seed.updatedAtMs) / 1000))
            : 0,
          source: "seed",
        }
      : null,
  );

  const consecutive404s = useRef(0);
  const seedRef = useRef(seed);
  seedRef.current = seed;

  useEffect(() => {
    if (!orderId || paused) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(
          `/api/agents/order/${encodeURIComponent(orderId)}`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (res.status === 404) {
          consecutive404s.current++;
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          lat: number;
          lng: number;
          tsMs: number;
          ageSec: number;
        };
        consecutive404s.current = 0;
        setSample({
          lat: data.lat,
          lng: data.lng,
          tsMs: data.tsMs,
          ageSec: data.ageSec,
          source: "live",
        });
      } catch {
        /* network blip — just wait for next tick */
      }
    };

    void tick();
    const id = setInterval(() => {
      // Give up polling once the rider has clearly gone dark; we keep the
      // last sample so the dot stays on the map, just stop hammering.
      if (consecutive404s.current >= 4) return;
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId, paused, intervalMs]);

  // Whenever the caller's seed updates and we don't yet have a live sample,
  // surface the fresher seed so the map dot stays accurate during first paint.
  useEffect(() => {
    if (!seed) return;
    setSample((prev) => {
      if (prev?.source === "live") return prev; // never downgrade
      return {
        lat: seed.lat,
        lng: seed.lng,
        tsMs: seed.updatedAtMs ?? Date.now(),
        ageSec: seed.updatedAtMs
          ? Math.max(0, Math.floor((Date.now() - seed.updatedAtMs) / 1000))
          : 0,
        source: "seed",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.lat, seed?.lng, seed?.updatedAtMs]);

  // Tick ageSec locally each second so the "X s ago" label stays smooth even
  // when no new sample arrives.
  useEffect(() => {
    if (!sample) return;
    const t = setInterval(() => {
      setSample((s) =>
        s
          ? { ...s, ageSec: Math.max(0, Math.floor((Date.now() - s.tsMs) / 1000)) }
          : s,
      );
    }, 1000);
    return () => clearInterval(t);
  }, [sample?.tsMs]);

  return sample;
}
