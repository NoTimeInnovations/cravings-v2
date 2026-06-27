-- No-op rollback: re-adding NOT NULL would fail once custom-item rows (menu_id
-- null) exist, and could break live POS bills. Intentionally left as a no-op.
SELECT 1;
