# Cravings v2 — Claude Notes

## Hasura DB management

For any task that touches the Hasura database (inspecting schema, running SQL, partner CRUD, onboarding a Petpooja partner, updating usernames), prefer the prebuilt scripts in:

```
C:\Users\thris\Desktop\startup\11 product\Claude Skills\
```

- `skill-registry.json` — index of available skills with arg signatures
- `scripts/list-tables.sh` — list public-schema tables
- `scripts/describe-table.sh <table_name>` — column/type/nullable/default
- `scripts/run-sql.sh "<sql>"` — raw SQL via Hasura `/v2/query`
- `scripts/search-partner.sh <term>` — search partners by name/store/email/username/phone
- `scripts/create-pp-partner.sh <name> <email> <petpooja_restaurant_id>` — inserts partner row + emails Petpooja team
- `scripts/set-username.sh <partner_id> <new_username>` — validates + updates username
- `credentials.env` — Hasura endpoint + admin secret (sourced by every script)

**Workflow:**
1. Check `skill-registry.json` first to see if an existing skill fits.
2. Read the script before running — several have hardcoded defaults (e.g. `create-pp-partner.sh` uses default password `123456`, sends from `servicesnotime@gmail.com`, CCs the Petpooja team).
3. Scripts hardcode `source "/home/abhin/Cloud Skills/credentials.env"` (Linux path). On Windows they need WSL with the env file at that path, or edit the `source` line. Confirm with the user before executing.
4. For destructive SQL (UPDATE/DELETE/DDL), confirm with the user first.
