import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const MASTER_PARTNER_ID = '20f7e974-f19e-4c11-b6b7-4385f61f27bf';

export async function POST(request: NextRequest) {
  try {
    const { partnerId } = await request.json();

    if (!partnerId) {
      return NextResponse.json({ error: 'Missing partnerId' }, { status: 400 });
    }

    const orgAccount = process.env.GOOGLE_BUSINESS_ORG_ACCOUNT;
    if (!orgAccount) {
      return NextResponse.json({ error: 'GOOGLE_BUSINESS_ORG_ACCOUNT not configured' }, { status: 500 });
    }

    const partnerTokens = await getTokensFromHasura(partnerId);
    if (!partnerTokens) {
      return NextResponse.json({ error: 'Partner not connected to Google' }, { status: 403 });
    }

    const partnerEmail = await fetchEmail(partnerTokens.access_token, partnerTokens.refresh_token);
    if (!partnerEmail) {
      return NextResponse.json({ error: 'Could not resolve partner email from Google' }, { status: 502 });
    }

    const masterTokens = await getTokensFromHasura(MASTER_PARTNER_ID);
    if (!masterTokens) {
      return NextResponse.json({ error: 'Master account not connected to Google' }, { status: 500 });
    }

    const masterAuth = new google.auth.OAuth2(
      process.env.GOOGLE_BUSINESS_CLIENT_ID,
      process.env.GOOGLE_BUSINESS_CLIENT_SECRET
    );
    masterAuth.setCredentials({
      access_token: masterTokens.access_token,
      refresh_token: masterTokens.refresh_token,
    });

    const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth: masterAuth });

    console.log(`Inviting ${partnerEmail} as MANAGER of ${orgAccount}`);

    const res = await accountManagement.accounts.admins.create({
      parent: orgAccount,
      requestBody: {
        admin: partnerEmail,
        role: 'MANAGER'
      }
    });

    return NextResponse.json({
      success: true,
      invitedEmail: partnerEmail,
      invitation: res.data
    });

  } catch (error: any) {
    console.error('Invite Error:', error);
    return NextResponse.json({ error: error.message, details: error.response?.data }, { status: 500 });
  }
}

async function fetchEmail(accessToken: string, refreshToken: string): Promise<string | null> {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_BUSINESS_CLIENT_ID,
    process.env.GOOGLE_BUSINESS_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  try {
    const userinfo = await google.oauth2({ version: 'v2', auth }).userinfo.get();
    return userinfo.data.email || null;
  } catch (e: any) {
    console.error('userinfo fetch failed:', e.message);
    return null;
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
