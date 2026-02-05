import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const partnerId = searchParams.get('partnerId');

  if (!partnerId) {
    return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
  }

  try {
    // 1. Fetch tokens (Fallback to Master Account if partner not connected)
    const MASTER_PARTNER_ID = '20f7e974-f19e-4c11-b6b7-4385f61f27bf'; // Thrisha/MenuThere
    
    let tokens = await getTokensFromHasura(partnerId);
    if (!tokens) {
        console.log(`No tokens for partner ${partnerId}, falling back to Master Account tokens for listing locations.`);
        tokens = await getTokensFromHasura(MASTER_PARTNER_ID);
    }

    if (!tokens) {
      return NextResponse.json({ error: 'No Google connection found (neither Partner nor Master)' }, { status: 404 });
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
    
    // Log all accounts to debug which one is being picked up
    console.log("Accounts Found:", JSON.stringify(accountsRes.data.accounts, null, 2));

    // We prioritize LOCATION_GROUP as that's where multiple locations are usually managed
    // Then ORGANIZATION, then PERSONAL
    const account = accountsRes.data.accounts?.sort((a, b) => {
        const priority = { 'LOCATION_GROUP': 0, 'ORGANIZATION': 1, 'PERSONAL': 2 };
        return (priority[a.type as keyof typeof priority] ?? 3) - (priority[b.type as keyof typeof priority] ?? 3);
    })[0];
    
    // If no account found, maybe use the first one
    const targetAccount = account || accountsRes.data.accounts?.[0];
    
    if (!targetAccount || !targetAccount.name) {
       console.error("No Google Business accounts found for this user.");
       return NextResponse.json({ error: 'No Google Business accounts found' }, { status: 404 });
    }

    const accountName = targetAccount.name;
    console.log("Fetching locations for account:", accountName);

    // 3. List Locations
    // readMask is required. 'formattedAddress' is not a valid field in v1, use 'storefrontAddress'.
    const myBusinessInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });
    const locationsRes = await myBusinessInfo.accounts.locations.list({
      parent: accountName, 
      readMask: 'name,title,storeCode,metadata,storefrontAddress',
    });

    const locations = locationsRes.data.locations || [];
    
    // Map to friendly format (flatten address)
    const formattedLocations = locations.map((loc: any) => ({
        ...loc,
        formattedAddress: loc.storefrontAddress 
            ? `${loc.storefrontAddress.addressLines?.join(', ') || ''}, ${loc.storefrontAddress.locality || ''}, ${loc.storefrontAddress.administrativeArea || ''} ${loc.storefrontAddress.postalCode || ''}`
            : 'No address'
    }));

    return NextResponse.json({
      success: true,
      locations: formattedLocations,
      accountId: accountName
    });

  } catch (error: any) {
    console.error('Google API Error:', error);
    // Log full details for debugging
    if (error.response) {
        console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
    }
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
