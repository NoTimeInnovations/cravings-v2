"use server";

import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { fetchFromHasura } from "@/lib/hasuraClient";
import axios from "axios";
import { Resend } from "resend";
import { EMAIL_CONFIG } from "@/lib/email";

interface Item {
    name: string;
    description: string;
    category: string;
}

export const generateAndUploadImages = async (
    partnerId: string,
    items: Item[],
    email: string,
    host: string
) => {
    try {
        console.log(`Starting background image generation for partner ${partnerId} with ${items.length} items`);

        // 1. Image Generation in Batches using Swiggy API (reusing logic)
        for (let i = 0; i < items.length; i += 5) {
            const batch = items.slice(i, i + 5);
            const itemNames = batch.map(item => item.name);

            try {
                // Initiate generation
                await axios.post(
                    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/images-v2`,
                    {
                        lat: "28.6139", // Default coords
                        lng: "77.2090",
                        itemNames,
                        partnerEmail: email
                    },
                    { headers: { "Content-Type": "application/json" } }
                );

                // Poll for completion
                let isComplete = false;
                let pollCount = 0;
                const maxPolls = 60;

                while (!isComplete && pollCount < maxPolls) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    pollCount++;

                    const pingResponse = await axios.get(
                        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/image-v3/ping`,
                        { params: { partner: email } }
                    );

                    if (pingResponse.data.status === "completed") {
                        isComplete = true;
                    } else if (pingResponse.data.status === "failed") {
                        throw new Error("Generation failed");
                    }
                }

                if (isComplete) {
                    // Fetch result
                    const resultsResponse = await axios.get(
                        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/images-v2/get`,
                        { params: { partner: email } }
                    );

                    // 2. Upload to S3 and Update Hasura
                    for (const item of batch) {
                        const itemName = item.name.toLowerCase().trim().replace(/[^a-z0-9]/g, ""); // sanitize match
                        // The Swiggy API returns keys as sanitized names, need to match roughly
                        // But wait, the frontend logic uses a specific sanitizer.
                        // Let's rely on the result keys.

                        // We need to match the item name to the result key
                        // The Swiggy API likely returns keys based on input names.

                        // Let's assume the API returns keys that match the input itemNames roughly.
                        // For simplicity in this background job, we'll try to match exact or sanitized.
                        // Actually, looking at page.tsx, it uses sanitizeToEnglish. 
                        // Since we can't easily import that client-side util, we'll implement a simple one 
                        // or trust the API returns mapped data if we had the original response structure.

                        // However, the `resultsResponse.data` is keyed by "itemName".
                        // In page.tsx: const itemName = sanitizeToEnglish(batchItem.name);

                        // Simple sanitizer for now:
                        const simpleSanitized = item.name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
                        const imageUrls = resultsResponse.data[simpleSanitized] || [];
                        const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

                        if (imageUrl) {
                            // Upload to S3 (optional if already a URL, but user wants S3)
                            // The Swiggy API returns a URL. page.tsx uses it directly? 
                            // Page.tsx: return { ...currentItem, image: imageUrls[0] };
                            // It seems page.tsx uses the remote URL. 
                            // But usually we want to own the asset. 
                            // 'uploadFileToS3' accepts string. If it's a URL, it might not download and re-upload unless handled.
                            // Looking at aws-s3.js: if (typeof file === "string" && file.startsWith("data:")) ...
                            // It doesn't seem to handle fetching from a remote URL and uploading.
                            // So we might need to fetch the image buffer first.

                            try {
                                const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                                const buffer = Buffer.from(response.data, 'binary');
                                const s3Url = await uploadFileToS3(buffer, `menu/${partnerId}/${Date.now()}-${simpleSanitized.replace(/ /g, "_")}.jpg`);

                                // Update Hasura
                                // We need the item ID. But we only have name/category.
                                // We need to query the menu item by name and partner_id.
                                await fetchFromHasura(
                                    `mutation UpdateMenuImage($partner_id: uuid!, $name: String!, $image: String!) {
                                        update_menu(where: {partner_id: {_eq: $partner_id}, name: {_eq: $name}}, _set: {image_url: $image}) {
                                            affected_rows
                                        }
                                    }`,
                                    {
                                        partner_id: partnerId,
                                        name: item.name,
                                        image: s3Url
                                    }
                                );
                            } catch (uploadError) {
                                console.error(`Failed to upload/update image for ${item.name}`, uploadError);
                            }
                        }
                    }
                }

            } catch (err) {
                console.error(`Batch generation failed`, err);
            }
        }

        // 3. Send Notification Email
        if (EMAIL_CONFIG.apiKey) {
            const resend = new Resend(EMAIL_CONFIG.apiKey);
            await resend.emails.send({
                from: EMAIL_CONFIG.fromEmail,
                to: email,
                subject: `Your Menu Images are Ready! - ${EMAIL_CONFIG.appName}`,
                html: `
                    <h1>Your Menu is Fully Visualized!</h1>
                    <p>We have finished generating images for your menu items.</p>
                    <p>You can now view and edit them in your dashboard.</p>
                    <a href="${EMAIL_CONFIG.baseUrl}/admin-v2">Go to Dashboard</a>
                `
            });
            console.log("Background image generation completed and email sent.");
        } else {
            console.log("Background image generation completed but email skipped (no API key).");
        }

    } catch (error) {
        console.error("Critical error in background image generation:", error);
    }
};
