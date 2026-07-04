#!/usr/bin/env node
/**
 * Issue a public-API key for a partner (e.g. hotncool).
 *
 * Usage:
 *   node scripts/issue-partner-api-key.mjs <partner_id> "<name>" [rate_per_min]
 *
 * Prints the full key ONCE (ck_live_...). Only its sha256 hash + prefix are
 * stored, so the key can never be recovered — copy it immediately.
 * Reads the Hasura endpoint + admin secret from .env.local (or process.env).
 */
import crypto from "crypto";
import fs from "fs";

const [, , partnerId, name, ratePerMin] = process.argv;
if (!partnerId || !name) {
  console.error('Usage: node scripts/issue-partner-api-key.mjs <partner_id> "<name>" [rate_per_min]');
  process.exit(1);
}

function readEnv() {
  const env = {};
  try {
    for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall back to process.env only */
  }
  return { ...env, ...process.env };
}

const env = readEnv();
const endpoint =
  env.HASURA_SERVER_GRAPHQL_ENDPOINT || env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT;
const secret =
  env.HASURA_SERVER_ADMIN_SECRET ||
  env.HASURA_GRAPHQL_ADMIN_SECRET ||
  env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET;
if (!endpoint || !secret) {
  console.error("Missing Hasura endpoint / admin secret in env.");
  process.exit(1);
}

const raw = crypto.randomBytes(24).toString("base64url");
const key = `ck_live_${raw}`;
const prefix = key.slice(0, 12);
const hash = crypto.createHash("sha256").update(key).digest("hex");

const query = `mutation IssueKey($o: partner_api_keys_insert_input!) {
  insert_partner_api_keys_one(object: $o) { id key_prefix }
}`;
const variables = {
  o: {
    partner_id: partnerId,
    name,
    key_prefix: prefix,
    key_hash: hash,
    scopes: ["whatsapp"],
    rate_per_min: ratePerMin ? Number(ratePerMin) : 120,
  },
};

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-hasura-admin-secret": secret },
  body: JSON.stringify({ query, variables }),
});
const data = await res.json();
if (data.errors) {
  console.error("Failed to issue key:", JSON.stringify(data.errors, null, 2));
  process.exit(1);
}

console.log("\n✅ API key issued");
console.log("   partner_id:", partnerId);
console.log("   key id:    ", data.data.insert_partner_api_keys_one.id);
console.log("   name:      ", name);
console.log("\n⚠️  Copy this key NOW — it is shown once and stored only as a hash:\n");
console.log("   " + key + "\n");
