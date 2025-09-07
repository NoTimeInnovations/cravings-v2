"use server";

import puppeteer from "puppeteer";

export async function resolveShortUrl(shortUrl: string): Promise<string> {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(shortUrl, { waitUntil: "networkidle2" });

    const finalUrl = page.url();
    await browser.close();

    return finalUrl;
  } catch (e) {
    console.error("Failed to resolve short URL:", e);
    return shortUrl;
  }
}
