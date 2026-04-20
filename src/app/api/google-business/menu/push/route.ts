import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Helper to upload image to Google Business Media API and get MediaKey
async function uploadImageToGoogle(imageUrl: string, parentPath: string, auth: any) {
    try {
        console.log(`[Media] Uploading: ${imageUrl}`);
        
        // Proxy URL to convert WebP to JPG on the fly
        // Using wsrv.nl (standard reliable public proxy)
        const jpgUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&output=jpg`;
        
        const res = await auth.request({
            url: `https://mybusiness.googleapis.com/v4/${parentPath}/media`,
            method: 'POST',
            data: {
                mediaFormat: 'PHOTO',
                locationAssociation: { category: 'FOOD_AND_DRINK' },
                sourceUrl: jpgUrl // Use the proxy URL
            }
        });
        
        const resourceName = res.data.name; 
        if (!resourceName) return null;
        
        const mediaKey = resourceName.split('/').pop();
        console.log(`[Media] Uploaded! Key: ${mediaKey}`);
        return mediaKey;

    } catch (error: any) {
        console.error(`[Media] Upload failed for ${imageUrl}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

export async function POST(request: NextRequest) {
  try {
    let { partnerId, locationId } = await request.json(); // Changed const to let

    if (!partnerId || !locationId) {
      return NextResponse.json({ error: 'Missing partnerId or locationId' }, { status: 400 });
    }

    // Resolve 'auto' locationId
    if (locationId === 'auto') {
        const integrationDetails = await getTokensFromHasura(partnerId);
        if (!integrationDetails?.location_id) {
             return NextResponse.json({ error: 'No Google Location linked for this partner. Please link a location first.' }, { status: 400 });
        }
        locationId = integrationDetails.location_id;
        console.log(`Resolved auto locationId to: ${locationId}`);
    }

    // 1. Fetch Google Tokens (Using Master Account Logic)
    const MASTER_PARTNER_ID = '20f7e974-f19e-4c11-b6b7-4385f61f27bf'; // Thrisha/Menuthere
    
    let tokens = await getTokensFromHasura(partnerId);
    
    // ... rest of logic uses finalLocationId instead of locationId

    
    if (!tokens) {
        console.log(`No tokens for partner ${partnerId}, falling back to Master Account tokens.`);
        tokens = await getTokensFromHasura(MASTER_PARTNER_ID);
    }

    if (!tokens) {
      return NextResponse.json({ error: 'No Google connection found (neither Partner nor Master)' }, { status: 403 });
    }

    // 2. Fetch Menu from Hasura
    const menuItems = await getMenuFromHasura(partnerId);
    if (!menuItems || menuItems.length === 0) {
      return NextResponse.json({ error: 'No active menu items found for this partner' }, { status: 404 });
    }

    // REAL API CALL SETUP (Needed early for image uploads)
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    // Get Account ID first (Needed for Image Upload parentPath)
    const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth });
    const accountsRes = await accountManagement.accounts.list();
    
    // Debug: Log all accounts to see what we have
    console.log("Available Accounts for Menu Push:", JSON.stringify(accountsRes.data.accounts, null, 2));

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

    // Construct full parent path for Media Uploads
    // Format: accounts/{accountId}/locations/{locationId}
    const parentPath = `${accountName}/locations/${cleanLocationId}`;


    // 3. Format to Google Food Menu Structure (v4 Schema)
    const categoriesMap: Record<string, any[]> = {};

    // Helper to Capitalize First Letter of Each Word and Remove Underscores
    const formatCategoryName = (str: string) => {
        // Replace underscores with spaces
        const withSpaces = str.replace(/_/g, ' ');
        // Capitalize words
        return withSpaces.replace(/\b\w/g, char => char.toUpperCase());
    };

    // Flatten all items to process first
    const allFinalItems: { catName: string, item: any }[] = [];

    menuItems.forEach((item: any) => {
      let catName = item.category?.name || 'General';
      catName = formatCategoryName(catName);

      const itemsToPush: any[] = [];
      if (item.variants && item.variants.length > 0) {
          item.variants.forEach((variant: any) => {
             itemsToPush.push({
                 name: `${item.name} (${variant.name})`,
                 description: item.description,
                 price: Number(variant.price),
                 image_url: item.image_url 
             });
          });
      } else {
          itemsToPush.push({
              name: item.name,
              description: item.description,
              price: item.price,
              image_url: item.image_url
          });
      }
      
      itemsToPush.forEach(finalItem => {
          allFinalItems.push({ catName, item: finalItem });
      });
    });

    // Upload images in batches to avoid rate limits
    // We only upload if image_url exists
    console.log(`Processing ${allFinalItems.length} items. Starting image uploads...`);
    
    // Concurrency Helper
    const BATCH_SIZE = 5; // Upload 5 images at a time
    let successfulUploads = 0;
    let failedUploads = 0;
    const failedItems: string[] = []; // List of item names where image upload failed

    for (let i = 0; i < allFinalItems.length; i += BATCH_SIZE) {
        const batch = allFinalItems.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (entry) => {
            if (entry.item.image_url) {
                // Upload and attach key
                let key = await uploadImageToGoogle(entry.item.image_url, parentPath, auth);
                
                // Retry Logic: If failed, try one more time
                if (!key) {
                    console.log(`[Retry] Retrying image for ${entry.item.name}...`);
                    key = await uploadImageToGoogle(entry.item.image_url, parentPath, auth);
                }

                if (key) {
                    entry.item.mediaKey = key;
                    successfulUploads++;
                } else {
                    failedUploads++;
                    failedItems.push(entry.item.name);
                    console.warn(`[Warning] Failed to upload image for ${entry.item.name} after retry.`);
                }
            }
        }));
        console.log(`Processed batch ${i} to ${Math.min(i + BATCH_SIZE, allFinalItems.length)}`);
    }

    // Reconstruct categoriesMap
    allFinalItems.forEach(({ catName, item }) => {
      if (!categoriesMap[catName]) categoriesMap[catName] = [];
      
      categoriesMap[catName].push({
        labels: [
            { 
                displayName: item.name,
                description: item.description || undefined,
                languageCode: "en" 
            }
        ],
        attributes: {
            price: {
                currencyCode: 'INR', 
                units: Math.floor(item.price).toString(), 
                nanos: (item.price % 1) * 1000000000
            },
            ...(item.mediaKey ? { mediaKeys: [item.mediaKey] } : {})
        }
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
            uploadedImages: successfulUploads,
            failedImages: failedUploads,
            failedItemsList: failedItems,
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
        location_id
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
