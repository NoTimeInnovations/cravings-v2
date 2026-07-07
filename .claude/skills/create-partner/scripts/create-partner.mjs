#!/usr/bin/env node
/**
 * create-partner.mjs — provision a Menuthere partner directly against production
 * Hasura, mirroring the end state of the /signup-from-google flow but driven by
 * explicit inputs (name / email / menu / logo) instead of a Google listing.
 *
 * It replicates onBoardUserSignup + quickSignupFromGoogle:
 *   partner row (with the canonical new-partner defaults from
 *   src/lib/newPartnerDefaults.ts) -> categories -> menu items -> a default
 *   table-1 QR code -> optional branch link + WhatsApp copy.
 *
 * Credentials are read from the project's .env.local (NEXT_PUBLIC_HASURA_* +
 * NEXT_PUBLIC_S3_*). Uses the same prod-v2 endpoint/secret as the app's
 * src/lib/hasuraClient.ts.
 *
 * Usage:
 *   node create-partner.mjs <spec.json> [--dry-run] [--force]
 *
 * --dry-run     resolve username/parent/WhatsApp read-only and print the plan;
 *               performs NO writes and NO logo upload.
 * --force       create even if a partner with the same email already exists.
 *
 * See ../SKILL.md for the spec.json schema.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function die(msg) {
  console.error("ERROR: " + msg);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Repo root + env
// ---------------------------------------------------------------------------
function findRepoRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, "package.json")) &&
      fs.existsSync(path.join(dir, ".env.local"))
    )
      return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(__dirname, "../../../.."); // .../create-partner/scripts -> repo
}
const REPO_ROOT = findRepoRoot(__dirname);

function loadEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    env[m[1]] = val;
  }
  return env;
}
const ENV = { ...loadEnvFile(path.join(REPO_ROOT, ".env.local")), ...process.env };

const HASURA_ENDPOINT =
  ENV.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT ||
  (ENV.HASURA_GRAPHQL_ENDPOINT_HASURA
    ? ENV.HASURA_GRAPHQL_ENDPOINT_HASURA.replace(/\/+$/, "") + "/v1/graphql"
    : null);
const HASURA_SECRET =
  ENV.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET || ENV.HASURA_GRAPHQL_ADMIN_SECRET;

if (!HASURA_ENDPOINT || !HASURA_SECRET)
  die("Missing NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT / _ADMIN_SECRET in .env.local");

// ---------------------------------------------------------------------------
// Data files (kept in sync with the app)
// ---------------------------------------------------------------------------
const plans = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "src/data/plans.json"), "utf8"),
);
const countryMeta = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "src/data/countryMetaData.json"), "utf8"),
);

// Mirrors src/lib/newPartnerDefaults.ts — keep in sync if that file changes.
const NEW_PARTNER_FEATURE_FLAGS =
  "ordering-true,delivery-true,storefront-false,newonboarding-true,whatsappOrdering-true";
const NEW_PARTNER_DELIVERY_RATE = 10;
const NEW_PARTNER_DELIVERY_RULES = {
  delivery_radius: 5,
  delivery_mode: "basic",
  first_km_range: { km: 4, rate: 40 },
  delivery_ranges: [],
  is_fixed_rate: false,
  minimum_order_amount: 0,
  delivery_time_allowed: { from: "00:00", to: "23:59" },
  takeaway_time_allowed: { from: "00:00", to: "23:59" },
  isDeliveryActive: true,
  needDeliveryLocation: true,
};

// ---------------------------------------------------------------------------
// GraphQL (exact strings from src/api/*, src/app/actions/branchWhatsapp.ts)
// ---------------------------------------------------------------------------
const partnerMutation = `
  mutation InsertPartner($object: partners_insert_input!) {
  insert_partners_one(object: $object) {
    id
    username
    store_name
    email
  }
}`;

const addCategory = `
    mutation CategoryCreation($category: [category_insert_input!]!) {
        insert_category(objects: $category) {
            returning { name id }
        }
    }
`;

const addMenu = `
    mutation InsertMenu($menu: [menu_insert_input!]!) {
    insert_menu(objects: $menu) {
        returning { id name }
    }
}`;

const INSERT_QR_CODE = `
  mutation InsertQrCode($object: qr_codes_insert_input!) {
    insert_qr_codes_one(object: $object) { id qr_number table_number partner_id }
  }
`;

// branchWhatsapp.ts
const READ_MAIN_WA = `
query MainWhatsApp($pid: uuid!) {
  whatsapp_business_integrations(where: { partner_id: { _eq: $pid } }) {
    waba_id
    phone_number_id
    access_token
    display_phone
    meta_user_id
    is_primary
    flow_enabled
  }
  whatsapp_flows(where: { partner_id: { _eq: $pid } }) {
    name
    description
    enabled
    graph
    triggers
    escape_keyword
    run_ttl_hours
    once_per_user
    cooldown_hours
  }
  partners_by_pk(id: $pid) {
    whatsapp_numbers
    whatsapp_integration_mode
  }
}`;

// Copies the parent's WhatsApp to the outlet AND links the branch in a single
// request (the `upd` also sets branch_id). Hasura runs multiple root mutation
// fields in one transaction, so this is atomic.
const COPY_TO_OUTLET = `
mutation CopyWhatsAppToOutlet(
  $oid: uuid!
  $bid: uuid!
  $integrations: [whatsapp_business_integrations_insert_input!]!
  $flows: [whatsapp_flows_insert_input!]!
  $nums: jsonb
) {
  del_int: delete_whatsapp_business_integrations(where: { partner_id: { _eq: $oid } }) { affected_rows }
  del_flow: delete_whatsapp_flows(where: { partner_id: { _eq: $oid } }) { affected_rows }
  ins_int: insert_whatsapp_business_integrations(objects: $integrations) { affected_rows }
  ins_flow: insert_whatsapp_flows(objects: $flows) { affected_rows }
  upd: update_partners_by_pk(pk_columns: { id: $oid }, _set: { whatsapp_integration_mode: "own", whatsapp_numbers: $nums, branch_id: $bid }) { id branch_id }
}`;

// branches.ts
const getPartnerBranchInfoQuery = `
query GetPartnerBranchInfo($partner_id: uuid!) {
  partners_by_pk(id: $partner_id) {
    id
    branch_id
    branch { id name parent_partner_id }
  }
}`;
const createBranchMutation = `
mutation CreateBranch($name: String!, $parent_partner_id: uuid!, $tagline: String) {
  insert_branches_one(object: {name: $name, parent_partner_id: $parent_partner_id, tagline: $tagline}) { id name }
}`;
const setPartnerBranchMutation = `
mutation SetPartnerBranch($partner_id: uuid!, $branch_id: uuid) {
  update_partners_by_pk(pk_columns: {id: $partner_id}, _set: {branch_id: $branch_id}) { id branch_id }
}`;

// ---------------------------------------------------------------------------
// Hasura client
// ---------------------------------------------------------------------------
async function gql(query, variables) {
  const res = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Hasura HTTP ${res.status}: ${JSON.stringify(json)}`);
  if (json.errors) throw new Error("Hasura error: " + JSON.stringify(json.errors));
  return json.data;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp(n, lo, hi) {
  n = Number(n);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
function normCat(name) {
  return String(name).toLowerCase().trim().replace(/ /g, "_");
}
function normalizeHex(hex) {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h))
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return "#" + h.toLowerCase();
}
function slugUsername(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
async function uniqueUsername(name) {
  const base = slugUsername(name);
  if (!base || base.length < 3)
    throw new Error(`Cannot derive a valid username (>=3 chars) from "${name}"`);
  const a1 = await gql(
    `query($u:String!){partners(where:{username:{_eq:$u}},limit:1){id}}`,
    { u: base },
  );
  if (a1.partners.length === 0) return base;
  const a2 = await gql(
    `query($p:String!){partners(where:{username:{_ilike:$p}}){username}}`,
    { p: `${base}%` },
  );
  const taken = new Set((a2.partners || []).map((p) => p.username));
  let n = 1;
  while (taken.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}
function buildTrial(country) {
  const isIndia = (country || "").trim().toLowerCase() === "india";
  const planId = isIndia ? "in_trial_100" : "intl_trial_30d";
  const arr = isIndia ? plans.india : plans.international;
  const plan = arr.find((p) => p.id === planId);
  const now = new Date();
  const expiryDate = isIndia
    ? null
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return { plan, status: "active", startDate: now.toISOString(), expiryDate };
}
function buildTheme(brandHex) {
  return JSON.stringify({
    colors: { text: "#000000", bg: "#ffffff", accent: brandHex || "#E9701B" },
    brandColor: brandHex ? `custom:${brandHex}` : "charcoal-noir",
    menuStyle: "v3",
    checkoutStyle: "v2",
  });
}
async function uploadLogo(localPath) {
  if (!fs.existsSync(localPath)) throw new Error("logoPath not found: " + localPath);
  const bucket = ENV.NEXT_PUBLIC_S3_BUCKET;
  const region = ENV.NEXT_PUBLIC_S3_REGION;
  if (!bucket || !region || !ENV.NEXT_PUBLIC_S3_ACCESS_KEY)
    throw new Error("Missing NEXT_PUBLIC_S3_* credentials in .env.local");
  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: ENV.NEXT_PUBLIC_S3_ACCESS_KEY,
      secretAccessKey: ENV.NEXT_PUBLIC_S3_SECRET_KEY,
    },
  });
  const ext = (path.extname(localPath) || ".png").toLowerCase();
  const ctype =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".svg"
          ? "image/svg+xml"
          : "image/jpeg";
  const key = `hotel_banners/onboarding_${Date.now()}${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.readFileSync(localPath),
      ContentType: ctype,
    }),
  );
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
// ---------------------------------------------------------------------------
// Branch resolution + WhatsApp copy
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveParent(term) {
  if (UUID_RE.test(term)) {
    const a = await gql(
      `query($id:uuid!){partners_by_pk(id:$id){id store_name username country currency country_code district state branch_id}}`,
      { id: term },
    );
    if (!a.partners_by_pk) throw new Error("No partner with id " + term);
    return a.partners_by_pk;
  }
  const a = await gql(
    `query($u:String!,$s:String!){partners(where:{_or:[{username:{_eq:$u}},{store_name:{_ilike:$s}}]},limit:10){id store_name username country currency country_code district state branch_id}}`,
    { u: term, s: `%${term}%` },
  );
  const list = a.partners || [];
  if (list.length === 0) throw new Error(`No partner matches parent "${term}"`);
  if (list.length === 1) return list[0];
  const exact = list.filter(
    (p) =>
      p.username === term ||
      (p.store_name || "").toLowerCase() === term.toLowerCase(),
  );
  if (exact.length === 1) return exact[0];
  throw new Error(
    `Multiple partners match "${term}": ` +
      list.map((p) => `${p.store_name} (@${p.username}, ${p.id})`).join(" | ") +
      " — pass an exact username or the partner id.",
  );
}
async function ensureBranch(parent) {
  const info = await gql(getPartnerBranchInfoQuery, { partner_id: parent.id });
  const p = info.partners_by_pk;
  if (p?.branch?.id) return p.branch.id;
  const byParent = await gql(
    `query($pid:uuid!){branches(where:{parent_partner_id:{_eq:$pid}},limit:1){id}}`,
    { pid: parent.id },
  );
  if (byParent.branches?.[0]) {
    const bid = byParent.branches[0].id;
    if (!p?.branch_id)
      await gql(setPartnerBranchMutation, {
        partner_id: parent.id,
        branch_id: bid,
      });
    return bid;
  }
  const created = await gql(createBranchMutation, {
    name: parent.store_name || "Brand",
    parent_partner_id: parent.id,
    tagline: null,
  });
  const bid = created.insert_branches_one.id;
  await gql(setPartnerBranchMutation, { partner_id: parent.id, branch_id: bid });
  return bid;
}
// Links the outlet to the branch and copies the parent's WhatsApp. `waData` is
// the parent's already-read READ_MAIN_WA payload (passed in to avoid a second
// read round-trip). When the parent has no WhatsApp, this still links the branch.
async function linkBranchAndCopyWhatsapp(branchId, outletId, waData) {
  const integrations = waData?.whatsapp_business_integrations || [];
  const flows = waData?.whatsapp_flows || [];
  const nums = waData?.partners_by_pk?.whatsapp_numbers ?? null;
  if (integrations.length === 0) {
    // Nothing to copy — just link the branch (single write).
    await gql(setPartnerBranchMutation, {
      partner_id: outletId,
      branch_id: branchId,
    });
    return {
      copied: false,
      reason: "parent has no WhatsApp integration connected",
      integrations: 0,
      flows: 0,
    };
  }
  const intObjects = integrations.map((w) => ({
    partner_id: outletId,
    waba_id: w.waba_id,
    phone_number_id: w.phone_number_id,
    access_token: w.access_token,
    display_phone: w.display_phone,
    meta_user_id: w.meta_user_id,
    is_primary: w.is_primary,
    flow_enabled: w.flow_enabled,
  }));
  const flowObjects = flows.map((f) => ({
    partner_id: outletId,
    name: f.name,
    description: f.description,
    enabled: f.enabled,
    graph: f.graph,
    triggers: f.triggers,
    escape_keyword: f.escape_keyword,
    run_ttl_hours: f.run_ttl_hours,
    once_per_user: f.once_per_user,
    cooldown_hours: f.cooldown_hours,
  }));
  await gql(COPY_TO_OUTLET, {
    oid: outletId,
    bid: branchId,
    integrations: intObjects,
    flows: flowObjects,
    nums,
  });
  return {
    copied: true,
    integrations: integrations.length,
    flows: flows.length,
    whatsapp_numbers: nums,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const specPath = args.find((a) => !a.startsWith("--"));
  if (!specPath)
    die("usage: node create-partner.mjs <spec.json> [--dry-run] [--force]");

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  } catch (e) {
    die("cannot read/parse spec JSON: " + e.message);
  }

  if (!spec.name) die("spec.name is required");
  if (!spec.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spec.email))
    die("a valid spec.email is required");
  const storeName = spec.storeName || spec.name;
  const categories = Array.isArray(spec.categories) ? spec.categories : [];
  const items = Array.isArray(spec.items) ? spec.items : [];
  if (items.length === 0) die("spec.items must contain at least one menu item");

  // Preflight reads are independent — run them concurrently instead of in
  // series: email de-dupe guard, branch-parent resolve, and username uniqueness.
  const [existing, parent, username] = await Promise.all([
    gql(
      `query($e:String!){partners(where:{email:{_eq:$e}}){id username store_name}}`,
      { e: spec.email },
    ),
    spec.branchParent ? resolveParent(spec.branchParent) : Promise.resolve(null),
    uniqueUsername(storeName),
  ]);
  if (existing.partners.length > 0 && !force)
    die(
      `A partner already exists with email ${spec.email}: ` +
        existing.partners
          .map((p) => `${p.store_name} (@${p.username}, ${p.id})`)
          .join(", ") +
        ". Re-run with --force to create anyway.",
    );

  const country = spec.country || parent?.country || "India";
  const meta = countryMeta[country] || countryMeta["India"];
  const currency = spec.currency || parent?.currency || meta.symbol;
  const countryCode = spec.country_code || parent?.country_code || meta.code;
  const brandHex = normalizeHex(spec.brandColorHex);

  const plan = { endpoint: HASURA_ENDPOINT, username, store_name: storeName,
    email: spec.email, country, currency, country_code: countryCode,
    brand_color: brandHex || "(default: charcoal-noir #2c2c2c)",
    categories: categories.length, items: items.length,
    logo: spec.logoPath || null,
    branch: parent
      ? { parent: `${parent.store_name} (@${parent.username})`, parent_id: parent.id }
      : null };

  if (dryRun) {
    console.log("DRY RUN — no writes will be made.\n");
    console.log(JSON.stringify(plan, null, 2));
    if (parent) {
      const wa = await gql(READ_MAIN_WA, { pid: parent.id });
      const ints = (wa.whatsapp_business_integrations || []).length;
      const fl = (wa.whatsapp_flows || []).length;
      console.log(
        `\nParent WhatsApp: ${ints} integration(s), ${fl} flow(s) would be copied to the new outlet.` +
          (ints === 0
            ? "  WARNING: parent has no WhatsApp connected — nothing to copy."
            : ""),
      );
    }
    return;
  }

  // ---------- WRITES (production) ----------
  // Kick off the slow, independent work up front so it overlaps the DB writes:
  //  - the ~1 MB logo upload to S3
  //  - branch prep (ensure the parent's branch row exists + read its WhatsApp);
  //    both need only the parent, so they run while the partner/menu insert.
  const logoP = spec.logoPath ? uploadLogo(spec.logoPath) : Promise.resolve("");
  const branchPrepP = parent
    ? Promise.all([ensureBranch(parent), gql(READ_MAIN_WA, { pid: parent.id })])
    : Promise.resolve(null);
  // branchPrepP is consumed later (inside branchFinalP), after an intervening
  // await — attach a no-op rejection handler so an early failure can't surface
  // as an unhandled rejection (which crashes Node); the real `await branchPrepP`
  // below still throws and is caught by main().catch.
  branchPrepP.catch(() => {});
  const storefrontSettings = spec.logoPath
    ? JSON.stringify({
        bannerLogo: {
          scale: clamp(spec.logoScale ?? 100, 50, 500),
          bgColor: spec.logoBgColor || "#ffffff",
        },
      })
    : null;
  const storeBanner = await logoP;

  const partnerObject = {
    role: "partner",
    name: spec.name,
    password: spec.password || "123456",
    email: spec.email,
    store_name: storeName,
    phone: spec.phone || "",
    country,
    location: spec.location || "",
    place_id: spec.place_id || "",
    status: "active",
    upi_id: "",
    whatsapp_numbers:
      !parent && spec.phone ? [{ number: spec.phone, area: "default" }] : [],
    district: spec.district || parent?.district || "",
    state: spec.state || parent?.state || "",
    delivery_status: true,
    geo_location: { type: "Point", coordinates: [0, 0] },
    delivery_rate: NEW_PARTNER_DELIVERY_RATE,
    delivery_rules: NEW_PARTNER_DELIVERY_RULES,
    currency,
    country_code: countryCode,
    social_links: "{}",
    store_banner: storeBanner,
    storefront_settings: storefrontSettings,
    is_shop_open: true,
    theme: buildTheme(brandHex),
    referral_code: null,
    username,
    signin_method: "email",
    website_config: null,
    feature_flags: NEW_PARTNER_FEATURE_FLAGS,
    subscription_details: buildTrial(country),
  };

  const ins = await gql(partnerMutation, { object: partnerObject });
  const partnerId = ins.insert_partners_one.id;

  // The remaining writes are independent of one another — run concurrently:
  //  (a) categories -> menu (menu needs the category ids the insert returns)
  //  (b) default table-1 QR code
  //  (c) branch link + WhatsApp copy (branch prep already in flight above)
  const catObjects = categories.map((name, i) => ({
    name: normCat(name),
    partner_id: partnerId,
    priority: i,
    is_active: true,
  }));
  const menuCoreP = (async () => {
    const catMap = {};
    if (catObjects.length) {
      const cr = await gql(addCategory, { category: catObjects });
      for (const c of cr.insert_category.returning) catMap[c.name] = c.id;
    }
    const menuObjects = items
      .map((it, i) => {
        const cn = normCat(it.category || categories[0] || "Menu");
        const categoryId = catMap[cn];
        if (!categoryId) {
          console.error(
            `WARN: no category for item "${it.name}" (category "${it.category}") — skipped`,
          );
          return null;
        }
        return {
          name: it.name,
          category_id: categoryId,
          partner_id: partnerId,
          price: Number(it.price) || 0,
          image_url: "",
          description: it.description || "",
          is_available: true,
          is_veg: !!it.is_veg,
          variants: Array.isArray(it.variants) ? it.variants : [],
          priority: i,
        };
      })
      .filter(Boolean);
    if (menuObjects.length) await gql(addMenu, { menu: menuObjects });
    return menuObjects.length;
  })();

  const qrP = gql(INSERT_QR_CODE, {
    object: {
      partner_id: partnerId,
      table_number: 1,
      qr_number: "1",
      created_at: new Date().toISOString(),
      no_of_scans: 0,
    },
  });

  const branchFinalP = (async () => {
    if (!parent) return null;
    const [branchId, waData] = await branchPrepP;
    const res = await linkBranchAndCopyWhatsapp(branchId, partnerId, waData);
    res.branchId = branchId;
    res.parent = `${parent.store_name} (@${parent.username})`;
    return res;
  })();

  const [itemsCreated, , branchResult] = await Promise.all([
    menuCoreP,
    qrP,
    branchFinalP,
  ]);

  const result = {
    success: true,
    partnerId,
    username,
    storefrontUrl: `https://menuthere.com/${username}`,
    loginUrl: "https://menuthere.com/login",
    email: spec.email,
    password: partnerObject.password,
    categoriesCreated: catObjects.length,
    itemsCreated,
    logo: storeBanner || null,
    brandColor: brandHex || "charcoal-noir(default)",
    branch: branchResult,
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => die(e?.message || String(e)));
