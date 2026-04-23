import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  // Parse state early so it's available in both success and error paths
  const state = searchParams.get('state');
  let partnerId: string | null = state;
  let redirectUrl: string | null = null;

  try {
      if (state && (state.startsWith('{') || state.includes('partnerId'))) {
          const parsed = JSON.parse(state);
          partnerId = parsed.partnerId;
          redirectUrl = parsed.redirect;
      }
  } catch (e) {
      partnerId = state;
  }

  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';

  const buildRedirect = (params: Record<string, string>) => {
    if (!redirectUrl) return null;
    const decodedRedirect = decodeURIComponent(redirectUrl);
    const url = new URL(`${protocol}://${host}${decodedRedirect}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  };

  if (!code) {
    const redirectTo = buildRedirect({ google_error: 'No code provided' });
    if (redirectTo) return NextResponse.redirect(redirectTo);
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const redirectUri = `${protocol}://${host}/api/google-business/auth/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    console.log('--- Google OAuth Success ---');
    console.log('Access Token:', tokens.access_token?.substring(0, 15) + '...');
    console.log('Refresh Token:', tokens.refresh_token ? 'Received ✅' : 'Missing ❌');
    console.log('Expiry:', tokens.expiry_date);

    if (partnerId) {
      await saveTokensToHasura({
        partner_id: partnerId,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        token_expiry: tokens.expiry_date!,
        id_token: tokens.id_token
      });
    }

    const redirectTo = buildRedirect({ google_connected: 'true' });
    if (redirectTo) return NextResponse.redirect(redirectTo);

    return NextResponse.json({
      success: true,
      message: 'Google Account Connected!',
      partnerId,
      refresh_token_received: !!tokens.refresh_token
    });

  } catch (error: any) {
    console.error('Google OAuth Error:', error);
    const redirectTo = buildRedirect({ google_error: error.message || 'Unknown error' });
    if (redirectTo) return NextResponse.redirect(redirectTo);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function saveTokensToHasura(data: { 
  partner_id: string, 
  access_token: string, 
  refresh_token: string, 
  token_expiry: number,
  id_token?: string | null 
}) {
  // 1. Check if exists
  const checkQuery = `
    query CheckExisting($partner_id: uuid!) {
      google_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
        id
      }
    }
  `;
  
  const checkRes = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET! },
    body: JSON.stringify({ query: checkQuery, variables: { partner_id: data.partner_id } })
  });
  const checkJson = await checkRes.json();
  const existingId = checkJson.data?.google_business_integrations?.[0]?.id;

  let query = '';
  let variables = {};

  if (existingId) {
    // 2. Update
    query = `
      mutation UpdateGoogleIntegration($id: uuid!, $changes: google_business_integrations_set_input!) {
        update_google_business_integrations_by_pk(pk_columns: {id: $id}, _set: $changes) {
          id
        }
      }
    `;
    variables = {
      id: existingId,
      changes: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expiry: data.token_expiry,
        updated_at: new Date().toISOString()
      }
    };
  } else {
    // 3. Insert
    query = `
      mutation InsertGoogleIntegration($object: google_business_integrations_insert_input!) {
        insert_google_business_integrations_one(object: $object) {
          id
        }
      }
    `;
    variables = {
      object: {
        partner_id: data.partner_id,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expiry: data.token_expiry,
        updated_at: new Date().toISOString()
      }
    };
  }

  const response = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await response.json();
  if (json.errors) {
    console.error('Hasura Error:', JSON.stringify(json.errors, null, 2));
    throw new Error('Failed to save tokens to Hasura');
  }
  
  return json.data;
}
