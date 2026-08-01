#!/usr/bin/env node
/**
 * WhatsApp Catalogue readiness probe — READ ONLY.
 *
 * Answers the one question that gates the whole catalogue feature: can this
 * partner's Embedded Signup token actually create and connect a catalogue?
 *
 * Run it before and after changing the Embedded Signup configuration, so
 * "did the scope change work" is a command instead of an argument. It creates
 * nothing and writes nothing — every call is a GET.
 *
 *   node scripts/whatsapp-catalog-probe.mjs oreodemo
 *
 * Needs HASURA_GRAPHQL_ENDPOINT_HASURA + HASURA_GRAPHQL_ADMIN_SECRET in the
 * environment (both are in .env.local).
 */

const username = process.argv[2];
if (!username) {
  console.error("usage: node scripts/whatsapp-catalog-probe.mjs <partner-username>");
  process.exit(1);
}

const EP = process.env.HASURA_GRAPHQL_ENDPOINT_HASURA;
const SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const V = process.env.WHATSAPP_API_VERSION || "v21.0";

if (!EP || !SECRET) {
  console.error("Missing HASURA_GRAPHQL_ENDPOINT_HASURA / HASURA_GRAPHQL_ADMIN_SECRET");
  process.exit(1);
}

// Catalogue scopes a partner token would need to manage a catalogue ITSELF.
// Measured: Embedded Signup never grants these — it issues a SYSTEM_USER token
// carrying only WhatsApp scopes, and adding the Catalog API use case to the app
// does not change it (the use case governs what the APP may request; ES governs
// what THIS token carries). So their absence is reported as expected, not as a
// blocker to go fix. Catalogue writes go through META_CATALOG_SYSTEM_TOKEN.
const PARTNER_CATALOG_SCOPES = ["catalog_management", "business_management"];

const graph = async (path) => {
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`);
  return res.json().catch(() => ({}));
};

const fail = (label, err) =>
  console.log(`  ✗ ${label}\n      ${err.type || "error"} (#${err.code}) ${String(err.message || "").slice(0, 160)}`);

const main = async () => {
  const gql = `{ whatsapp_business_integrations(
      where:{ partner:{ username:{ _eq:"${username}" } } }
    ){ waba_id phone_number_id display_phone access_token updated_at } }`;

  const hres = await fetch(`${EP}/v1/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hasura-admin-secret": SECRET },
    body: JSON.stringify({ query: gql }),
  }).then((r) => r.json());

  const integ = hres?.data?.whatsapp_business_integrations?.[0];
  if (!integ) {
    console.log(`No WhatsApp integration for "${username}".`);
    process.exit(1);
  }

  const token = integ.access_token;
  console.log(`\nWhatsApp Catalogue probe — ${username}`);
  console.log(`  waba=${integ.waba_id}  phone=${integ.phone_number_id}  ${integ.display_phone || ""}`);

  // How old the STORED token is. Changing the Embedded Signup configuration does
  // nothing to a token that was already issued — the partner has to reconnect
  // before any of the gates below can change. Without this line an unchanged
  // result reads as "the scope fix failed" when it actually means "we are still
  // reading the same token as last time".
  const ageMs = integ.updated_at ? Date.now() - new Date(integ.updated_at).getTime() : null;
  if (ageMs != null) {
    const h = Math.floor(ageMs / 3_600_000);
    const m = Math.floor((ageMs % 3_600_000) / 60_000);
    const stale = ageMs > 30 * 60_000;
    console.log(
      `  token stored ${h}h ${m}m ago${stale ? "  ← predates any recent reconnect" : "  ← fresh"}`,
    );
  }
  console.log();

  // 1. Scopes actually granted on the stored token.
  const perms = await graph(`me/permissions?access_token=${token}`);
  if (perms.error) return fail("token scopes", perms.error);
  const granted = (perms.data || []).filter((p) => p.status === "granted").map((p) => p.permission);
  console.log("1. token scopes (informational)");
  console.log("      granted:", granted.join(", ") || "(none)");
  const missing = PARTNER_CATALOG_SCOPES.filter((r) => !granted.includes(r));
  console.log(
    missing.length
      ? `      – no ${missing.join(" / ")} — expected; ES cannot grant these. Catalogue\n        writes use META_CATALOG_SYSTEM_TOKEN instead, so this is not a blocker.`
      : "      ! unexpectedly HAS catalogue scopes — worth re-checking the assumption above",
  );

  // 2. Coexistence — decides whether the WABA<->catalogue link can be made by
  //    API or must be made by hand. It does NOT decide whether the feature is
  //    available; oreodemo is coexistence and is connected and working.
  //
  //    is_on_biz_app means the number is also live in the WhatsApp Business app
  //    on a handset. For those, {waba}/product_catalogs returns (#10) to reads
  //    AND writes — even while a catalogue is connected. WhatsApp Manager writes
  //    the association by another path, so the UI works where the API cannot.
  //
  //    Measured, same app, same day:
  //      oreodemo          is_on_biz_app=true  -> (#10), connected via UI anyway
  //      flaminhotchicken  is_on_biz_app=false -> {"data":[]}
  //
  //    Consequence: for coexistence the connection is UNREADABLE. Never infer
  //    "not connected" from gate 4 — store it yourself when a human does it.
  const phone = await graph(
    `${integ.phone_number_id}?fields=display_phone_number,is_on_biz_app,platform_type&access_token=${token}`,
  );
  console.log("\n2. coexistence (the real gate)");
  if (phone.error) fail("phone lookup", phone.error);
  else {
    const coex = phone.is_on_biz_app;
    console.log(`      platform=${phone.platform_type || "?"}  is_on_biz_app=${coex}`);
    console.log(
      coex
        ? "      ! COEXISTENCE — link must be made BY HAND in WhatsApp Manager, and is\n        unreadable afterwards. Not a blocker: oreodemo is connected this way."
        : "      ✓ not on the Business app — API link path should be available",
    );
  }

  // Which business owns the WABA. Not the blocker, but it decides WHERE the
  // catalogue has to live: a real partner's WABA sits on THEIR portfolio while
  // our catalogue sits on ours, so the link is cross-business.
  const waba = await graph(
    `${integ.waba_id}?fields=id,name,owner_business_info,on_behalf_of_business_info&access_token=${token}`,
  );
  console.log("\n2b. owning business");
  if (waba.error) fail("waba lookup", waba.error);
  else {
    const owner = waba.owner_business_info || {};
    const obo = waba.on_behalf_of_business_info || {};
    console.log(`      owner: ${owner.name || "?"} (${owner.id || "?"})  type=${obo.type || "?"}`);
    if (owner.id && process.env.META_BUSINESS_ID && owner.id !== process.env.META_BUSINESS_ID)
      console.log(`      ⚠ differs from META_BUSINESS_ID (${process.env.META_BUSINESS_ID}) — cross-business link needed`);
  }

  const bizId = waba?.owner_business_info?.id;

  // 3. Can we see catalogues on that business? Needs business_management.
  console.log("\n3. list catalogues on the business");
  if (!bizId) console.log("      skipped — no business id");
  else {
    const cats = await graph(`${bizId}/owned_product_catalogs?access_token=${token}`);
    if (cats.error) fail("owned_product_catalogs", cats.error);
    else console.log(`      ✓ ${(cats.data || []).length} catalogue(s):`,
      (cats.data || []).map((c) => `${c.name}(${c.id})`).join(", ") || "(none yet)");
  }

  // 4. What the API can see of the connection. For coexistence this is (#10)
  //    whether or not a catalogue is actually connected, so an error here means
  //    "cannot tell", NOT "not connected". Check WhatsApp Manager to know.
  console.log("\n4. WABA ↔ catalogue connection (as seen by the API)");
  const conn = await graph(`${integ.waba_id}/product_catalogs?access_token=${token}`);
  if (conn.error) fail("waba product_catalogs", conn.error);
  else console.log("      ✓ connected:", JSON.stringify(conn.data || []).slice(0, 200));

  const ownerId = waba?.owner_business_info?.id;
  const crossBusiness = ownerId && process.env.META_BUSINESS_ID && ownerId !== process.env.META_BUSINESS_ID;

  const manualLink =
    "MANUAL LINK — coexistence. Create + fill the catalogue by API, then finish by hand:\n" +
    "         1. Business Settings > Data sources > Catalogs > <catalogue> > People >\n" +
    "            Add People > yourself > Full control   (skip this and step 2 fails with\n" +
    "            \"Manage catalogue permission required\")\n" +
    "         2. WhatsApp Manager > Account tools > Catalogue > Connect a catalogue\n" +
    "         Gate 4 stays (#10) afterwards — that is expected, not a failure.";

  // Coexistence decides HOW the link is made; cross-business is a separate
  // warning that applies either way. Keep them independent — an earlier revision
  // chained them and reported a non-coexistence partner as coexistent.
  const verdict = phone?.is_on_biz_app
    ? manualLink
    : conn.error
      ? "BLOCKED — catalogue edge refused for a reason other than coexistence; read\n         the error at (4), it is new."
      : "READY — API link path available. Provisioning can proceed.";

  console.log(
    "\nVERDICT:",
    verdict +
      (crossBusiness
        ? "\n\n         ⚠ This WABA is on the partner's own portfolio, not ours, so their Manager\n         may not even list our catalogue. That topology is UNPROVEN — test before\n         promising this partner anything."
        : ""),
    "\n",
  );
};

main().catch((e) => {
  console.error("probe failed:", e.message);
  process.exit(1);
});
