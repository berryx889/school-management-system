-- Discount rules, an optional due date, and school-wide tax/late-fee policy.
ALTER TABLE fee_invoices ADD COLUMN due_date DATE;
ALTER TABLE fee_invoices ADD COLUMN discount NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE school_settings ADD COLUMN tax_rate NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE school_settings ADD COLUMN late_fee_grace_days INT NOT NULL DEFAULT 0;
ALTER TABLE school_settings ADD COLUMN late_fee_percent NUMERIC NOT NULL DEFAULT 0;
