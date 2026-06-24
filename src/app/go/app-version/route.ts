// Version manifest for the Menuthere Go rider app's in-app update prompt.
// The app fetches this on launch and compares its installed version:
//   installed < minVersion    -> forced update (blocking screen)
//   installed < latestVersion -> optional update (dismissible "Later")
// To trigger an update prompt on a release: bump latestVersion (+ notes); to FORCE
// everyone, also bump minVersion. Keep latestVersion == the published store build.
export async function GET() {
  const config = {
    android: {
      latestVersion: "1.0.0",
      minVersion: "1.0.0",
      storeUrl:
        "https://play.google.com/store/apps/details?id=com.menuthere.menuthere_rider",
      notes: ["Welcome to Menuthere Go."],
    },
    ios: {
      latestVersion: "1.0.0",
      minVersion: "1.0.0",
      // TODO: replace with the real App Store URL once published (apps.apple.com/app/id…)
      storeUrl: "https://apps.apple.com/app/id000000000",
      notes: ["Welcome to Menuthere Go."],
    },
  };
  return Response.json(config, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
