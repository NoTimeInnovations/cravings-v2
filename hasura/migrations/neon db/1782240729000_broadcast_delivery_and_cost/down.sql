-- Intentionally a NO-OP. Per a hard project rule, no data/columns/tables are
-- ever dropped. Rolling this migration back must not destroy captured delivery
-- or cost data. If you truly need to remove these objects, do it manually and
-- deliberately — never via an automated `migrate --down`.
SELECT 1;
