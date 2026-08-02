import Script from "next/script";

// Hardcoded Meta (Facebook) Pixel for the Visu Kitchen storefront ONLY.
// Mounted from HotelMenuPage_v2 solely when the rendered partner is Visu Kitchen
// (partner id 834b40b7-8f2d-4f4d-ae03-ca5955b23299), so it fires on every
// storefront entry route (/visukitchen, /qrScan/…, /hotels/…). This is a
// deliberate one-off hardcode, not the general per-partner analytics path
// (that's the GTM container field + PartnerGtm).
const PIXEL_ID = "1611201910436605";

export function VisuKitchenPixel() {
  return (
    <>
      {/* afterInteractive: load soon after hydration for accurate PageView
          timing without blocking first paint. fbq's own guard (f.fbq check)
          prevents double-initialisation if this ever mounts twice. */}
      <Script id="fb-pixel-visukitchen" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
