import { NextRequest, NextResponse } from "next/server";

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT!;
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, variables } = body;

    if (!query) {
      return NextResponse.json(
        { errors: [{ message: "Missing query" }] },
        { status: 400 }
      );
    }

    const res = await fetch(HASURA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return NextResponse.json(
      { errors: [{ message: "Internal proxy error" }] },
      { status: 500 }
    );
  }
}
