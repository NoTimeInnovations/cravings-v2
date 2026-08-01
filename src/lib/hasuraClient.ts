import { GraphQLClient } from "graphql-request";

export const client = new GraphQLClient(
  process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT as string,
  {
    headers: {
      "x-hasura-admin-secret": process.env
        .NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET as string,
    },
  }
);
// const client = new GraphQLClient(process.env.HASURA_GRAPHQL_ENDPOINT as string, {
//   headers: {
//     'x-hasura-admin-secret': process.env.HASURA_GRAPHQL_ADMIN_SECRET as string,
//   },
// });

// HASURA_GRAPHQL_ENDPOINT=https://curious-ferret-93.hasura.app/v1/graphql
// HASURA_GRAPHQL_ADMIN_SECRET=grK3WUtZW9mXGtYtjEqU44QfmFkWOMga9qQoa1uBvR03n7DXLkTodHH9cWDcN6cn

export interface FetchFromHasuraOptions {
  /**
   * Don't console.error when the request fails. The promise still REJECTS —
   * this only suppresses the log line, never the error itself.
   *
   * For calls where a failure is an expected, handled outcome rather than a
   * fault. The motivating case: the WhatsApp flow engine claims each inbound
   * message id by inserting a row, and relies on a unique-index violation to
   * detect "already processed" (src/lib/whatsappFlow/engine.ts). The violation
   * IS the idempotency guard working, but it was logged as an error on every
   * Meta webhook redelivery — an alarm that fires when everything is fine
   * teaches people to ignore alarms.
   *
   * Do NOT use this to hide failures you have not actually handled.
   */
  quiet?: boolean;
}

export function fetchFromHasura(
  query: string,
  variables?: Record<string, unknown>,
  options?: FetchFromHasuraOptions
): Promise<any> {
  return client
    .request(query, variables)
    .then((result) => {
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("Hasura response: ", result);
      }
      return result;
    })
    .catch((error: any) => {
      if (!options?.quiet) {
        console.error("Error from Hasura: ", error);
      }
      throw error;
    });
}
