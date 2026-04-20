const EVOLUTION_API_URL = "https://evolution-api.cravings.live";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const INSTANCE_NAME = "Menuthere";

export async function sendWhatsAppMessage(phone: string, text: string) {
  // Clean phone number: remove spaces, dashes, plus sign, ensure country code
  let number = phone.replace(/[\s\-\+\(\)]/g, "");

  // If number starts with 0, assume India (+91)
  if (number.startsWith("0")) {
    number = "91" + number.slice(1);
  }

  // If number is 10 digits (no country code), assume India
  if (number.length === 10) {
    number = "91" + number;
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({ number, text }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WhatsApp send failed:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return false;
  }
}
