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

    // 3. Format to Google Food Menu Structure (v4 Schema)
    // Ref: Use 'labels' instead of 'title'.
    const categoriesMap: Record<string, any[]> = {};

    // Helper to Capitalize First Letter of Each Word and Remove Underscores
    const formatCategoryName = (str: string) => {
        // Replace underscores with spaces
        const withSpaces = str.replace(/_/g, ' ');
        // Capitalize words
        return withSpaces.replace(/\b\w/g, char => char.toUpperCase());
    };

    menuItems.forEach((item: any) => {
      let catName = item.category?.name || 'General';
      catName = formatCategoryName(catName); // Clean up category name

      if (!categoriesMap[catName]) {
        categoriesMap[catName] = [];
      }
      
      // LOGIC: If item has variants, create separate items for each variant.
      // Otherwise, use the base item.
      
      const itemsToPush: any[] = [];
      
      if (item.variants && item.variants.length > 0) {
          // Explode variants into separate items
          item.variants.forEach((variant: any) => {
             itemsToPush.push({
                 name: `${item.name} (${variant.name})`, // e.g. "Pizza (Small)"
                 description: item.description, // Same description
                 price: Number(variant.price),
                 image_url: item.image_url // Same image
             });
          });
      } else {
          // No variants, use base item
          itemsToPush.push({
              name: item.name,
              description: item.description,
              price: item.price,
              image_url: item.image_url
          });
      }

      // Add all generated items to the map
      itemsToPush.forEach(finalItem => {
          categoriesMap[catName].push({
            labels: [
                { 
                    displayName: finalItem.name,
                    description: finalItem.description || undefined,
                    languageCode: "en" 
                }
            ],
            attributes: {
                price: {
                    currencyCode: 'INR', 
                    units: Math.floor(finalItem.price).toString(), 
                    nanos: (finalItem.price % 1) * 1000000000
                },
                // Photos disabled temporarily
            }
          });
      });
      
    });

    // Construct the Google Payload
    const googleMenuPayload = {
      menus: [
        {
          labels: [{ displayName: "Main Menu", languageCode: "en" }],
          sections: Object.keys(categoriesMap).map(catName => ({
            labels: [{ displayName: catName, languageCode: "en" }],
            items: categoriesMap[catName]
          }))
        }
      ]
    };

    console.log('---------------------------------------------------');
    console.log(`Pushing Menu to Google Location: ${locationId}`);
    // console.log('Payload Preview:', JSON.stringify(googleMenuPayload, null, 2));
    console.log('---------------------------------------------------');

    // REAL API CALL
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    // The Food Menus API is part of the v4 API family
    // Endpoint: https://mybusiness.googleapis.com/v4/{parent}/foodMenus
    // Parent must be: accounts/{accountId}/locations/{locationId}
    
    // 1. Get Account ID first
    const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth });
    const accountsRes = await accountManagement.accounts.list();
    
    // Debug: Log all accounts to see what we have
    console.log("Available Accounts for Menu Push:", JSON.stringify(accountsRes.data.accounts, null, 2));

    // STRATEGY CHANGE: 
    // Reverting to LOCATION_GROUP priority now that API is enabled.
    // For locations inside a group, we MUST use the Location Group ID as the parent.
    const account = accountsRes.data.accounts?.sort((a, b) => {
        // Priority: LOCATION_GROUP (0) > ORGANIZATION (1) > PERSONAL (2)
        const priority = { 'LOCATION_GROUP': 0, 'ORGANIZATION': 1, 'PERSONAL': 2 };
        return (priority[a.type as keyof typeof priority] ?? 3) - (priority[b.type as keyof typeof priority] ?? 3);
    })[0];
    
    const targetAccount = account || accountsRes.data.accounts?.[0];
    
    if (!targetAccount || !targetAccount.name) {
       return NextResponse.json({ error: 'No Google Business accounts found' }, { status: 404 });
    }

    const accountName = targetAccount.name; // e.g. "accounts/12345"
    
    // Check if locationId starts with "locations/"
    let cleanLocationId = locationId;
    if (cleanLocationId.startsWith('locations/')) {
        cleanLocationId = cleanLocationId.replace('locations/', '');
    }

    // Construct full parent path
    // Format: accounts/{accountId}/locations/{locationId}
    const parentPath = `${accountName}/locations/${cleanLocationId}`;

    try {
        console.log(`Attempting PATCH to .../foodMenus (Plural)`);
        const res = await auth.request({
            url: `https://mybusiness.googleapis.com/v4/${parentPath}/foodMenus`, 
            method: 'PATCH',
            data: googleMenuPayload
        });
        console.log("Google API Response:", res.data);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Menu pushed successfully',
            itemCount: menuItems.length,
            googleResponse: res.data
        });
    } catch (apiError: any) {
        // Fallback: Try Singular "foodMenu" if Plural fails with 404
        if (apiError.response?.status === 404) {
             console.log(`Plural failed (404). Attempting PATCH to .../foodMenu (Singular)`);
             try {
                const res = await auth.request({
                    url: `https://mybusiness.googleapis.com/v4/${parentPath}/foodMenu`, 
                    method: 'PATCH',
                    data: googleMenuPayload
                });
                console.log("Google API Response (Singular):", res.data);
                return NextResponse.json({ 
                    success: true, 
                    message: 'Menu pushed successfully (Singular endpoint)',
                    itemCount: menuItems.length,
                    googleResponse: res.data
                });
             } catch (retryError: any) {
                 console.error("Singular also failed:", retryError.response ? retryError.response.data : retryError);
                 throw new Error(retryError.message || "Both Plural and Singular endpoints failed");
             }
        }
        
        console.error("Google API Request Failed:", apiError.response ? apiError.response.data : apiError);
        throw new Error(apiError.message || "Google API Request Failed");
    }

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
        variants
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
