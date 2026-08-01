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

  // 2. Coexistence. THE gate — measured, not guessed: the same
  //    {waba}/product_catalogs call returns (#10) for oreodemo (is_on_biz_app
  //    true) and {"data":[]} for flaminhotchicken (false), same app, same day.
  //
  //    is_on_biz_app means the number is ALSO live in the WhatsApp Business app
  //    on a handset. WhatsApp then owns the catalogue surface itself — it is the
  //    on-device catalogue, edited on the phone — so Meta closes the Cloud API
  //    edge outright. A GET being refused is the proof that no scope fixes it.
  //
  //    Note this is a property of the PHONE NUMBER, not the portfolio. An earlier
  //    version of this probe blamed the business type and sent us hunting for
  //    permissions that were never the problem.
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
        ? "      ✗ COEXISTENCE — catalogue is the phone app's; Cloud API edge is closed"
        : "      ✓ not on the Business app — catalogue edge should be open",
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

  // 4. Can the WABA hold a connected catalogue at all? Returns "(#10) cannot be
  //    performed on SMB business type" for coexistence numbers. Read-only here —
  //    even the GET is refused, which is what rules out a permissions fix.
  console.log("\n4. WABA ↔ catalogue connection");
  const conn = await graph(`${integ.waba_id}/product_catalogs?access_token=${token}`);
  if (conn.error) fail("waba product_catalogs", conn.error);
  else console.log("      ✓ connected:", JSON.stringify(conn.data || []).slice(0, 200));

  const ownerId = waba?.owner_business_info?.id;
  const crossBusiness = ownerId && process.env.META_BUSINESS_ID && ownerId !== process.env.META_BUSINESS_ID;

  console.log(
    "\nVERDICT:",
    phone?.is_on_biz_app
      ? "BLOCKED — coexistence. The number is on the WhatsApp Business app, so its\n         catalogue is the on-device one and the Cloud API edge is shut. No scope,\n         token or App Review changes this; the number must be re-onboarded off\n         the Business app."
      : conn.error
        ? "BLOCKED — catalogue edge refused for a reason other than coexistence; read\n         the error at (4), it is new."
        : crossBusiness
          ? "PARTLY READY — the catalogue edge is open, but this WABA is on the partner's\n         own portfolio while our catalogue is on ours. The cross-business link is\n         UNPROVEN; test it before promising this partner a catalogue."
          : "READY — same portfolio and the edge is open. Provisioning can proceed.",
    "\n",
  );
};

main().catch((e) => {
  console.error("probe failed:", e.message);
  process.exit(1);
});
