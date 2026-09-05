-- Protect financial totals even if a future API path misses application validation.
-- NOT VALID avoids blocking deployment on legacy rows while still enforcing new writes.
ALTER TABLE fee_structures
  ADD CONSTRAINT fee_structures_amount_nonnegative CHECK (amount >= 0) NOT VALID;

ALTER TABLE fee_invoices
  ADD CONSTRAINT fee_invoices_total_due_nonnegative CHECK (total_due >= 0) NOT VALID,
  ADD CONSTRAINT fee_invoices_discount_nonnegative CHECK (discount >= 0) NOT VALID;

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0) NOT VALID;

ALTER TABLE assessments
  ADD CONSTRAINT assessments_max_score_positive CHECK (max_score > 0) NOT VALID,
  ADD CONSTRAINT assessments_weight_valid CHECK (weight > 0 AND weight <= 100) NOT VALID;

CREATE INDEX payments_invoice_status_idx ON payments (invoice_id, status);
