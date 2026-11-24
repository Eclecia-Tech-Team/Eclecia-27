# Todo: registration ID for payments

## Plan
- [x] `Registration.registrationCode` (`REG-XXXXXXXX`, unique, sparse) + `createRegistration` retry helper
- [x] solo / team create / team join issue IDs (free events too); team code kept for joining
- [x] `GET /api/payment/registrations/[code]`, `x-api-key` = `PAYMENT_API_KEY`
- [x] ID shown: event page card, profile events tab, confirmation email, admin table/search/CSV
- [x] backfill script `bun run backfill:reg-codes`
- [x] provider spec `PAYMENT_API.md`, env.example

## Verification
- [x] tsc clean for changed files (only pre-existing missing `jsqr`/`qrcode` deps errors); eslint clean
- [x] throwaway Docker Mongo: backfill, code format/uniqueness, duplicate reg still 11000, API 503/401/404, solo + leader 200 fields, member NOT_PAYER, free NO_FEE, ALREADY_PAID (solo + team)
- [x] email renders payer / member / free variants

## Review
- Team fee = one payment per team (event `fees` returned as-is).
- Payments still marked by admins / CSV script: solo `verified`, team `paymentStatus`.
- Deploy: set `PAYMENT_API_KEY`, then run backfill once.
