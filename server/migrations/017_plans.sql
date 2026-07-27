-- Subscription plans + feature flags per tenant. `plan` picks a bundle of features (defined
-- in config/plans.js); `feature_overrides` lets the platform owner flip an individual feature
-- on/off for one school regardless of its plan. Effective features = plan defaults merged
-- with overrides.
--
-- Grandfathering: every school that already exists becomes 'premium' so nothing they use
-- today disappears. New schools default to 'standard'.
ALTER TABLE schools ADD COLUMN plan TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE schools ADD COLUMN feature_overrides JSONB NOT NULL DEFAULT '{}';

UPDATE schools SET plan = 'premium';
