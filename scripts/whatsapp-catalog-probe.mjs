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

// Permissions the catalogue work needs beyond what messaging already has.
const REQUIRED = ["catalog_management", "business_management"];

const graph = async (path) => {
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`);
  return res.json().catch(() => ({}));
};

const fail = (label, err) =>
  console.log(`  ✗ ${label}\n      ${err.type || "error"} (#${err.code}) ${String(err.message || "").slice(0, 160)}`);

const main = async () => {
  const gql = `{ whatsapp_business_integrations(
      where:{ partner:{ username:{ _eq:"${username}" } } }
    ){ waba_id phone_number_id display_phone access_token } }`;

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
  console.log(`  waba=${integ.waba_id}  phone=${integ.phone_number_id}  ${integ.display_phone || ""}\n`);

  // 1. Scopes actually granted on the stored token.
  const perms = await graph(`me/permissions?access_token=${token}`);
  if (perms.error) return fail("token scopes", perms.error);
  const granted = (perms.data || []).filter((p) => p.status === "granted").map((p) => p.permission);
  console.log("1. token scopes");
  console.log("      granted:", granted.join(", ") || "(none)");
  const missing = REQUIRED.filter((r) => !granted.includes(r));
  console.log(missing.length ? `      ✗ MISSING: ${missing.join(", ")}` : "      ✓ all required scopes present");

  // 2. Which business owns the WABA, and of what type. An SMB portfolio (what
  //    coexistence onboarding creates) is refused by the catalogue endpoints
  //    regardless of scopes, so this is a separate gate from (1).
  const waba = await graph(
    `${integ.waba_id}?fields=id,name,owner_business_info,on_behalf_of_business_info&access_token=${token}`,
  );
  console.log("\n2. owning business");
  if (waba.error) fail("waba lookup", waba.error);
  else {
    const owner = waba.owner_business_info || {};
    const obo = waba.on_behalf_of_business_info || {};
    console.log(`      owner: ${owner.name || "?"} (${owner.id || "?"})  type=${obo.type || "?"}`);
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

  // 4. Can the WABA hold a connected catalogue at all? This is the call that
  //    returns "(#10) cannot be performed on SMB business type" for coexistence
  //    partners — the blocker that adding scopes does NOT fix.
  console.log("\n4. WABA ↔ catalogue connection");
  const conn = await graph(`${integ.waba_id}/product_catalogs?access_token=${token}`);
  if (conn.error) fail("waba product_catalogs", conn.error);
  else console.log("      ✓ connected:", JSON.stringify(conn.data || []).slice(0, 200));

  console.log(
    "\nVERDICT:",
    missing.length
      ? "BLOCKED — token is missing scopes; fix the Embedded Signup config and reconnect."
      : conn.error
        ? "BLOCKED — scopes are fine but the WABA's business type refuses catalogues."
        : "READY — provisioning can proceed.",
    "\n",
  );
};

main().catch((e) => {
  console.error("probe failed:", e.message);
  process.exit(1);
});
