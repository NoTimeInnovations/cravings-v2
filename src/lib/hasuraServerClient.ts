import { GraphQLClient } from "graphql-request";

/**
 * Server-only Hasura client.
 *
 * Unlike `src/lib/hasuraClient.ts` (which ships `NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET`
 * to the browser), this module reads `HASURA_SERVER_ADMIN_SECRET` — a non-public
 * env var that Next.js never inlines into client bundles. It must only be imported
 * from server code ("use server" actions, route handlers). The runtime guard below
 * hard-fails if it is ever evaluated in a browser context.
 *
 * This is the reference data path for the staged migration off the browser-exposed
 * admin secret (see feature_readme/loyalty-points.md → "Security").
 */

if (typeof window !== "undefined") {
  throw new Error(
    "hasuraServerClient must never be imported into client-side code — it would leak the server-only admin secret."
  );
}

const endpoint =
  process.env.HASURA_SERVER_GRAPHQL_ENDPOINT ||
  process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT ||
  "";

const secret =
  process.env.HASURA_SERVER_ADMIN_SECRET ||
  process.env.HASURA_GRAPHQL_ADMIN_SECRET ||
  "";

let _client: GraphQLClient | null = null;

function getClient(): GraphQLClient {
  if (!endpoint) {
    throw new Error(
      "Hasura endpoint not configured (HASURA_SERVER_GRAPHQL_ENDPOINT / NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT)."
    );
  }
  if (!secret) {
    throw new Error("HASURA_SERVER_ADMIN_SECRET is not configured (server-only).");
  }
  if (!_client) {
    _client = new GraphQLClient(endpoint, {
      headers: { "x-hasura-admin-secret": secret },
    });
  }
  return _client;
}

export async function fetchFromHasuraServer(
  query: string,
  variables?: Record<string, unknown>
): Promise<any> {
  return getClient().request(query, variables);
}
