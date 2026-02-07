import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { partnerId, locationId } = await request.json();

    if (!partnerId || !locationId) {
      return NextResponse.json({ error: 'Missing partnerId or locationId' }, { status: 400 });
    }

    // 1. Get Partner Tokens
    const tokens = await getTokensFromHasura(partnerId);
    if (!tokens) {
      return NextResponse.json({ error: 'Partner not connected to Google' }, { status: 403 });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    // 2. Resolve Account ID (Partner's Account)
    const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth });

    // We need the Account Name that owns the location.
    // Usually it's the parent in the locationId? 
    // Location ID format: accounts/{accountId}/locations/{id}
    // If the frontend sends the full resource name "accounts/123/locations/456", we can parse it.

    let parentPath = locationId;
    if (!locationId.includes('accounts/')) {
      // If we only got the ID, we need to find the account.
      // Let's assume the frontend sends the full resource name from the locations list.
      return NextResponse.json({ error: 'Invalid Location ID format. Expected full resource name.' }, { status: 400 });
    }

    // 3. Send Invite
    // Invite Cravings Master Account (Thrisha/MenuThere)
    // Resource Name: accounts/111617069787035102385
    const CRAVINGS_ACCOUNT = 'accounts/111617069787035102385';

    console.log(`Inviting ${CRAVINGS_ACCOUNT} to manage ${locationId}`);

    const res = await accountManagement.locations.admins.create({
      parent: locationId,
      requestBody: {
        admin: CRAVINGS_ACCOUNT,
        role: 'MANAGER' // or ADMIN
      }
    });

    return NextResponse.json({
      success: true,
      invitation: res.data
    });

  } catch (error: any) {
    console.error('Invite Error:', error);
    return NextResponse.json({ error: error.message, details: error.response?.data }, { status: 500 });
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
