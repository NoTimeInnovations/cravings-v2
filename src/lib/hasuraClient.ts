import { GraphQLClient } from "graphql-request";

const isServer = typeof window === "undefined";

const serverClient = isServer
  ? new GraphQLClient(process.env.HASURA_GRAPHQL_ENDPOINT!, {
      headers: {
        "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
      },
    })
  : null;

export const client = serverClient;

export async function fetchFromHasura(
  query: string,
  variables?: Record<string, unknown>
): Promise<any> {
  if (isServer && serverClient) {
    try {
      const result = await serverClient.request(query, variables);
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("Hasura response: ", result);
      }
      return result;
    } catch (error: any) {
      console.error("Error from Hasura: ", error);
      throw error;
    }
  }

  try {
    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();

    if (json.errors) {
      console.error("Error from Hasura proxy: ", json.errors);
      throw new Error(json.errors[0]?.message || "GraphQL error");
    }

    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log("Hasura response: ", json.data);
    }

    return json.data;
  } catch (error: any) {
    console.error("Error from Hasura: ", error);
    throw error;
  }
}
