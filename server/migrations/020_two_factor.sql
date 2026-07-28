-- Opt-in two-factor authentication (TOTP / authenticator app). Per user: a base32 secret
-- (set at setup, kept whether or not 2FA is active so it can be confirmed) and an enabled
-- flag. Login only demands a code when totp_enabled is true, so users who never opt in are
-- completely unaffected.
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT false;
