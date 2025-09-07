ALTER TABLE pos
ALTER COLUMN total_amt TYPE numeric(10,2)
USING total_amt::numeric(10,2);
