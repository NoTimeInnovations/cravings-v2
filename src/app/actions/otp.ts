"use server";

export async function sendOtpAction(phoneNumber: string, storeName: string): Promise<{ success: boolean; message?: string }> {
    try {
        // 1. Validate format: 10 digits
        const cleaned = phoneNumber.replace(/\D/g, "");
        if (cleaned.length !== 10) {
            return { success: false, message: "Please enter a valid 10-digit phone number." };
        }

        // 2. Format payload
        // User requested payload { "user" : "91 + 10 digit"}
        const payload = {
            user: `91${cleaned}`,
            store_name: storeName
        };

        // 3. Call Webhook
        const response = await fetch("https://n8n.cravings.live/webhook/otp-send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error("[sendOtpAction] Webhook failed:", response.status, response.statusText);
            return { success: false, message: "Failed to send OTP. Please try again." };
        }

        const data = await response.json();
        // Assuming backend returns { "success": true } or similar
        if (data.success) {
            return { success: true, message: "OTP sent successfully." };
        } else {
            return { success: false, message: data.message || "Failed to send OTP." };
        }
    } catch (error) {
        console.error("[sendOtpAction] Error:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}

export async function verifyOtpAction(phoneNumber: string, otp: string): Promise<{ success: boolean; message?: string }> {
    try {
        const cleaned = phoneNumber.replace(/\D/g, "");
        if (cleaned.length !== 10) {
            return { success: false, message: "Invalid phone number format." };
        }

        // payload { "user" , "" , "otp" : "" } -> user meant { "user": "...", "otp": "..." }
        const payload = {
            user: `91${cleaned}`,
            otp: otp,
        };

        const response = await fetch("https://n8n.cravings.live/webhook/otp-verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error("[verifyOtpAction] Webhook failed:", response.status, response.statusText);
            return { success: false, message: "Verification failed. Please try again." };
        }

        const data = await response.json();
        console.log(data)
        if (data.success && data.success == true ) {
            return { success: true, message: "OTP Verified." };
        } else {
            return { success: false, message: "Invalid OTP." };
        }
    } catch (error) {
        console.error("[verifyOtpAction] Error:", error);
        return { success: false, message: "Verification failed." };
    }
}
