import rateLimit from 'express-rate-limit';

// Rate limiting is disabled under the test runner so the suite's rapid requests aren't
// throttled. In every other environment the limits below apply.
const disabled = () => process.env.NODE_ENV === 'test';

const shared = {
  standardHeaders: 'draft-7', // emit RateLimit-* headers
  legacyHeaders: false,
  skip: disabled,
};

// Broad safety net against runaway abuse of the API as a whole. Generous enough that a busy
// school behind a single NAT IP never trips it in normal use.
export const globalLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 600, // requests per IP per minute
  message: { error: 'Too many requests — please slow down and try again shortly.' },
});

// Brute-force protection for credentials. skipSuccessfulRequests means only FAILED attempts
// count, so legitimate users are never locked out — only repeated bad logins get throttled.
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 15, // failed auth attempts per IP per 15 min
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed attempts. Please wait a few minutes and try again.' },
});
