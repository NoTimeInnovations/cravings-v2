import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const partnerId = searchParams.get('partnerId');

  if (!partnerId) {
    return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
  }

  try {
    // 1. Fetch tokens from Hasura (Just to verify connection exists)
    const tokens = await getTokensFromHasura(partnerId);
    if (!tokens) {
      return NextResponse.json({ error: 'Partner not connected to Google' }, { status: 404 });
    }

    /*
    // REAL API (Blocked by Quota: Requests per minute = 0)
    // We will uncomment this once Google approves the quota.
    
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const accountName = 'accounts/111617069787035102385'; 
    const myBusinessInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });
    const locationsRes = await myBusinessInfo.accounts.locations.list({
      parent: accountName, 
      readMask: 'name,title,storeCode,metadata,formattedAddress',
    });
    */

    // MOCK DATA (Enabled for Dev)
    console.warn('Using MOCK Google Locations (Quota Blocked)');
    const mockLocations = [
      {
        name: 'locations/mock-location-1',
        title: 'Cravings Demo Restaurant',
        storeCode: 'STORE_001',
        formattedAddress: '123 Cravings St, Food City',
        metadata: { mapsUri: 'https://maps.google.com/?cid=123' }
      },
      {
        name: 'locations/mock-location-2',
        title: 'Spicy Bites (Mock)',
        storeCode: 'STORE_002',
        formattedAddress: '456 Flavor Ave, Tasty Town',
        metadata: { mapsUri: 'https://maps.google.com/?cid=456' }
      }
    ];

    return NextResponse.json({
      success: true,
      locations: mockLocations,
      accountId: 'accounts/111617069787035102385' 
    });

  } catch (error: any) {
    console.error('Google API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getTokensFromHasura(partnerId: string) {
  const query = `
    query GetGoogleTokens($partner_id: uuid!) {
      google_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
        access_token
        refresh_token
      }
    }
  `;

  const response = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!
    },
    body: JSON.stringify({ query, variables: { partner_id: partnerId } })
  });

  const json = await response.json();
  return json.data?.google_business_integrations?.[0];
}
