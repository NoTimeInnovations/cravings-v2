import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Helper to upload image to Google Business Media API
async function uploadImageToGoogle(imageUrl: string, parentPath: string, auth: any) {
    try {
        console.log(`[Test] Uploading via SourceUrl: ${imageUrl}`);
        
        // Use SourceUrl method (easiest for remote URLs)
        const res = await auth.request({
            url: `https://mybusiness.googleapis.com/v4/${parentPath}/media`,
            method: 'POST',
            data: {
                mediaFormat: 'PHOTO',
                locationAssociation: { category: 'FOOD_AND_DRINK' },
                sourceUrl: imageUrl
            }
        });
        
        const resourceName = res.data.name; 
        if (!resourceName) return { success: false, error: "No resource name returned" };
        
        const mediaKey = resourceName.split('/').pop();
        console.log(`[Test] Success! Key: ${mediaKey}`);
        return { success: true, mediaKey };

    } catch (error: any) {
        console.error("Upload Error:", error.response ? error.response.data : error.message);
        return { 
            success: false, 
            error: error.response ? JSON.stringify(error.response.data) : error.message 
        };
    }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partnerId, locationId, itemName, itemPrice, itemDesc, itemImageUrl } = body;

    if (!partnerId || !locationId) {
      return NextResponse.json({ error: 'Missing partnerId or locationId' }, { status: 400 });
    }

    const tokens = await getTokensFromHasura(partnerId);
    if (!tokens) return NextResponse.json({ error: 'No Google tokens found' }, { status: 403 });

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    // Resolve Account ID
    const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth });
    const accountsRes = await accountManagement.accounts.list();
    const account = accountsRes.data.accounts?.sort((a, b) => {
        const priority = { 'LOCATION_GROUP': 0, 'ORGANIZATION': 1, 'PERSONAL': 2 };
        return (priority[a.type as keyof typeof priority] ?? 3) - (priority[b.type as keyof typeof priority] ?? 3);
    })[0];
    
    if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });
    const accountName = account.name;
    let cleanLocationId = locationId.replace('locations/', '');
    const parentPath = `${accountName}/locations/${cleanLocationId}`;

    // Try Image Upload
    let mediaKey = null;
    let imageUploadResult = null;
    
    if (itemImageUrl) {
        imageUploadResult = await uploadImageToGoogle(itemImageUrl, parentPath, auth);
        if (imageUploadResult.success) {
            mediaKey = imageUploadResult.mediaKey;
        }
    }

    // Construct Payload
    const menuPayload = {
        menus: [{
            labels: [{ displayName: "Test Menu (SourceUrl)", languageCode: "en" }],
            sections: [{
                labels: [{ displayName: "Test Section", languageCode: "en" }],
                items: [{
                    labels: [{ 
                        displayName: itemName || "Test Item", 
                        description: itemDesc || "Test Description",
                        languageCode: "en" 
                    }],
                    attributes: {
                        price: {
                            currencyCode: 'INR',
                            units: Math.floor(Number(itemPrice) || 100).toString(),
                            nanos: 0
                        },
                        ...(mediaKey ? { mediaKeys: [mediaKey] } : {})
                    }
                }]
            }]
        }]
    };

    // Push Menu
    const res = await auth.request({
        url: `https://mybusiness.googleapis.com/v4/${parentPath}/foodMenus`,
        method: 'PATCH',
        data: menuPayload
    });

    return NextResponse.json({
        success: true,
        imageResult: imageUploadResult,
        menuPushResult: res.data
    });

  } catch (error: any) {
    console.error("Test Push Error:", error);
    return NextResponse.json({ 
        error: error.message,
        details: error.response ? error.response.data : null 
    }, { status: 500 });
  }
}

async function getTokensFromHasura(partnerId: string) {
  const query = `query GetGoogleTokens($partner_id: uuid!) {
      google_business_integrations(where: {partner_id: {_eq: $partner_id}}) { access_token refresh_token }
    }`;
  const response = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET! },
    body: JSON.stringify({ query, variables: { partner_id: partnerId } })
  });
  const json = await response.json();
  return json.data?.google_business_integrations?.[0];
}
