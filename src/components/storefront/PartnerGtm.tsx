import Script from "next/script";

// A partner's own Google Tag Manager container, injected on their storefront.
// The value comes from a DB column a partner can set (and, because the Hasura
// admin secret is NEXT_PUBLIC, that any client could in principle write), and it
// is interpolated into an inline <script> — so the strict GTM-id regex below is
// the ONLY thing between the stored value and script injection. Keep it on both
// the admin write AND here; never loosen it or render the value anywhere else.
// Bounded length: real container ids are ~6-9 chars after the dash. The cap
// also stops a DB-writable value (admin secret is public) from being inflated
// into a multi-MB inline script served on every storefront page.
const GTM_RE = /^GTM-[A-Z0-9]{4,12}$/;

export function PartnerGtm({ gtmId }: { gtmId?: string | null }) {
  if (!gtmId || !GTM_RE.test(gtmId)) return null; // graceful no-op when unset/invalid

  return (
    <>
      {/* afterInteractive: load soon after hydration for accurate pageview
          timing without blocking first paint. GTM's own loader guards against
          re-injecting the same container id. */}
      <Script id={`gtm-${gtmId}`} strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
