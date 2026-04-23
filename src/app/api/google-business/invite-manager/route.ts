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
      process.env.GOOGLE_BUSINESS_CLIENT_ID,
      process.env.GOOGLE_BUSINESS_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth });

    // Normalize to `locations/{id}` — v1 Business Information returns names in this form.
    // Accept bare id, `locations/{id}`, or legacy `accounts/{x}/locations/{id}`.
    let normalizedLocation = locationId;
    const match = locationId.match(/locations\/([^/]+)/);
    if (match) {
      normalizedLocation = `locations/${match[1]}`;
    } else if (/^[A-Za-z0-9_-]+$/.test(locationId)) {
      normalizedLocation = `locations/${locationId}`;
    } else {
      return NextResponse.json({ error: 'Invalid Location ID format.' }, { status: 400 });
    }

    const masterEmail = process.env.GOOGLE_BUSINESS_MASTER_EMAIL;
    if (!masterEmail) {
      return NextResponse.json({ error: 'GOOGLE_BUSINESS_MASTER_EMAIL not configured' }, { status: 500 });
    }

    console.log(`Inviting ${masterEmail} to manage ${normalizedLocation}`);

    const res = await accountManagement.locations.admins.create({
      parent: normalizedLocation,
      requestBody: {
        admin: masterEmail,
        role: 'MANAGER'
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
