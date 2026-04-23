import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partnerId, locationId } = body;

    if (!partnerId || !locationId) {
      return NextResponse.json({ error: 'Missing partnerId or locationId' }, { status: 400 });
    }

    const query = `
      mutation LinkLocation($partner_id: uuid!, $location_id: String!) {
        insert_google_business_integrations_one(
          object: { partner_id: $partner_id, location_id: $location_id },
          on_conflict: {
            constraint: google_business_integrations_partner_id_key,
            update_columns: [location_id]
          }
        ) {
          id
          partner_id
          location_id
        }
      }
    `;

    const response = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!
      },
      body: JSON.stringify({ query, variables: { partner_id: partnerId, location_id: locationId } })
    });

    const json = await response.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));

    return NextResponse.json({ success: true, message: 'Location linked successfully', data: json.data?.insert_google_business_integrations_one });

  } catch (error: any) {
    console.error('Link Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
