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

    // REAL API (Quota Unlocked!)
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    // 2. Get Account ID (Dynamically)
    // We first need to list accounts to get the correct account ID (e.g., accounts/12345)
    // The "My Business Account Management API" must be enabled.
    const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth });
    const accountsRes = await accountManagement.accounts.list();
    const account = accountsRes.data.accounts?.find(a => a.type === 'ORGANIZATION' || a.type === 'PERSONAL'); // Prefer Organization, fallback to Personal
    
    // If no account found, maybe use the first one
    const targetAccount = account || accountsRes.data.accounts?.[0];
    
    if (!targetAccount || !targetAccount.name) {
       console.error("No Google Business accounts found for this user.");
       return NextResponse.json({ error: 'No Google Business accounts found' }, { status: 404 });
    }

    const accountName = targetAccount.name; // e.g., "accounts/111617069787035102385"

    // 3. List Locations
    const myBusinessInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });
    const locationsRes = await myBusinessInfo.accounts.locations.list({
      parent: accountName, 
      readMask: 'name,title,storeCode,metadata,formattedAddress',
    });

    return NextResponse.json({
      success: true,
      locations: locationsRes.data.locations || [],
      accountId: accountName
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
