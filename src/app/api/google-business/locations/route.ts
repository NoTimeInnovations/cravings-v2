import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const partnerId = searchParams.get('partnerId');

  if (!partnerId) {
    return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
  }

  try {
    // 1. Fetch tokens from Hasura
    const tokens = await getTokensFromHasura(partnerId);
    if (!tokens) {
      return NextResponse.json({ error: 'Partner not connected to Google' }, { status: 404 });
    }

    // 2. Setup Google Client
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token, // Critical for auto-refresh
    });

    // 3. Skip Accounts List (Quota Blocked) -> Use Hardcoded Account ID
    // Tried: Org ID and Group ID
    // accounts/111617069787035102385
    const accountName = 'accounts/111617069787035102385'; 

    /* 
    const myBusinessAccount = google.mybusinessaccountmanagement({ version: 'v1', auth });
    const accountsRes = await myBusinessAccount.accounts.list();
    const account = accountsRes.data.accounts?.[0]; 
    */

    // 4. List Locations for that Account
    /*
    const myBusinessInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });
    const locationsRes = await myBusinessInfo.accounts.locations.list({
      parent: accountName, 
      readMask: 'name,title,storeCode,metadata,formattedAddress',
    });
    */

    // MOCK DATA (Until API Access is approved)
    console.warn('Using MOCK Google Locations');
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
      accountId: accountName
    });

  } catch (error: any) {
    // If quota fails, fallback to mock automatically for dev
    if (error.message?.includes('Quota exceeded')) {
        return NextResponse.json({
            success: true,
            locations: [
                { name: 'locations/mock-fallback', title: 'Quota Mock Restaurant', formattedAddress: 'Quota Limit Reached St' }
            ],
            accountId: 'accounts/mock'
        });
    }
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
