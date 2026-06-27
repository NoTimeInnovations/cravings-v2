-- No-op rollback. This migration is strictly additive (new columns / new table /
-- new indexes), and project policy is to NEVER drop columns, tables, or data on
-- rollback. Reverting is a no-op so a `migrate down` can never destroy captured
-- cost/pricing history.
SELECT 1;
