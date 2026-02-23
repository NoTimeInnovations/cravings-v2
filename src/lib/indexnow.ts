const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? "6ec15b4cd4ea4a7595a26c3f72db03a2";
const HOST = "menuthere.com";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

/**
 * Submit one or more URLs to Bing (and other IndexNow-compatible engines)
 * for immediate re-crawl.
 */
export async function submitToIndexNow(urls: string | string[]): Promise<void> {
  const urlList = Array.isArray(urls) ? urls : [urls];

  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  if (!res.ok && res.status !== 202) {
    console.error(`IndexNow submission failed: ${res.status} ${res.statusText}`);
  }
}
