import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { partnerId, locationId } = await request.json();

    if (!partnerId || !locationId) {
      return NextResponse.json({ error: 'Missing partnerId or locationId' }, { status: 400 });
    }

    // 1. Fetch Google Tokens (Check connectivity)
    const tokens = await getTokensFromHasura(partnerId);
    if (!tokens) {
      return NextResponse.json({ error: 'Partner not connected to Google' }, { status: 403 });
    }

    // 2. Fetch Menu from Hasura
    const menuItems = await getMenuFromHasura(partnerId);
    if (!menuItems || menuItems.length === 0) {
      return NextResponse.json({ error: 'No active menu items found for this partner' }, { status: 404 });
    }

    // 3. Format to Google Food Menu Structure
    // Group by Category
    const categoriesMap: Record<string, any[]> = {};

    menuItems.forEach((item: any) => {
      const catName = item.category?.name || 'General';
      if (!categoriesMap[catName]) {
        categoriesMap[catName] = [];
      }
      
      categoriesMap[catName].push({
        title: item.name,
        description: item.description || '',
        price: {
            currencyCode: 'INR', // Assuming INR based on context
            units: Math.floor(item.price),
            nanos: (item.price % 1) * 1000000000
        },
        images: item.image_url ? [{ uri: item.image_url }] : []
      });
    });

    // Construct the Google Payload
    const googleMenuPayload = {
      menus: [
        {
          title: "Main Menu",
          sections: Object.keys(categoriesMap).map(catName => ({
            title: catName,
            items: categoriesMap[catName]
          }))
        }
      ]
    };

    console.log('---------------------------------------------------');
    console.log(`[MOCK] Pushing Menu to Google Location: ${locationId}`);
    console.log('Payload Preview:', JSON.stringify(googleMenuPayload, null, 2));
    console.log('---------------------------------------------------');

    // MOCK SUCCESS (Since API is blocked)
    // When API is ready, we will use:
    // const foodService = google.mybusinessfoodmenus(...)
    // await foodService.locations.menus.update(...)

    return NextResponse.json({ 
        success: true, 
        message: 'Menu pushed successfully (MOCK)',
        itemCount: menuItems.length 
    });

  } catch (error: any) {
    console.error('Menu Push Error:', error);
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
  const res = await hasuraRequest(query, { partner_id: partnerId });
  return res.data?.google_business_integrations?.[0];
}

async function getMenuFromHasura(partnerId: string) {
  const query = `
    query GetPartnerMenu($partner_id: uuid!) {
      menu(where: {partner_id: {_eq: $partner_id}, is_available: {_eq: true}}) {
        id
        name
        description
        price
        image_url
        category {
          name
        }
      }
    }
  `;
  const res = await hasuraRequest(query, { partner_id: partnerId });
  return res.data?.menu;
}

async function hasuraRequest(query: string, variables: any) {
  const response = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!
    },
    body: JSON.stringify({ query, variables })
  });
  return await response.json();
}
