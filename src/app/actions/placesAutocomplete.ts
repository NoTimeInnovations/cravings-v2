"use server";

// Server-proxied Google Places Autocomplete (legacy API) that shares a session
// token with the server-side Place Details fetch (extractGoogleBusinessDataByPlaceId).
//
// Why proxy instead of the browser JS SDK: a billable Autocomplete *session*
// requires the same `sessiontoken` on the autocomplete requests AND the final
// Place Details request. The JS SDK's AutocompleteSessionToken is opaque and
// can't be forwarded to our server-side details call, and the legacy REST
// endpoint isn't CORS-enabled for the browser — so we proxy here. The client
// generates one UUID per session, uses it for these autocomplete calls, then
// passes the SAME UUID to the details fetch. Result: all the keystroke
// autocomplete requests are billed as one session instead of per request.

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
}

export async function placesAutocomplete(
  input: string,
  sessionToken: string,
  opts?: { country?: string },
): Promise<PlacePrediction[]> {
  const q = input?.trim();
  if (!q) return [];

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
    );
    url.searchParams.set("input", q);
    url.searchParams.set("types", "establishment");
    url.searchParams.set("key", apiKey);
    // The session token ties these requests to the eventual Place Details call.
    if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);
    if (opts?.country) url.searchParams.set("components", `country:${opts.country}`);

    const res = await fetch(url.toString());
    const json = (await res.json()) as {
      status?: string;
      predictions?: Array<{
        place_id: string;
        description: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }>;
    };
    if (json.status !== "OK" || !Array.isArray(json.predictions)) return [];

    return json.predictions.map((p) => ({
      place_id: p.place_id,
      description: p.description,
      structured_formatting: {
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text || "",
      },
    }));
  } catch {
    return [];
  }
}
