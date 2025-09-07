"use server";
import { google } from "googleapis";

export const saveSurvey = async (formData) => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.SHEET_CLIENT_EMAIL,
      private_key: process.env.SHEET_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: "1Ue-j0SIBVUM49y8TTMv_7i_K4UoVo4S1Q_LQTn6ZYWg",
      range: "Sheet1!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            formData.district,
            formData.favoriteFoods,
            formData.favoriteHotels,
            JSON.stringify(formData.hotelDetails),
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
  }
};
