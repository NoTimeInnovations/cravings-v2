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

export function fetchFromHasura(
  query: string,
  variables?: Record<string, unknown>
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
      console.error("Error from Hasura: ", error);
      throw error;
    });
}
