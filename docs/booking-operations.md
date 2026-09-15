# Booking protection and rollout

## Behavior

- Guest submissions still create provisional holds. Both public and new owner-created holds expire after 24 hours.
- Admin can keep an existing expiry or extend a hold to 24 hours, 48 hours, or 7 days from the save. An expired hold needs an explicit extension or confirmation; availability is checked again.
- Confirmed bookings and unexpired holds block the entire inclusive date range. Checkout day remains blocked, matching the existing no-same-day-turnover calendar.
- A whole-property closure conflicts with every apartment. Different apartments may share dates.
- Conflict errors show dates and a booking ID; admin offers **View conflicting booking**. If it was created after the admin loaded, reload to see it.
- Name and a valid phone or email are required for apartment reservations. Whole-property closures need no guest. Dates must be real dates, check-out after check-in, and no more than 400 nights (the existing availability engine's horizon). New dates must be on/after today in America/Santo_Domingo and the apartment's opening date. Existing stays can be cancelled or have details corrected after check-in.
- Expiry is evaluated on reads, not dependent on a scheduled cleanup. Public availability reads the registry directly at request time. An open page refreshes at its next hold expiry and when the browser regains focus.
- Public submission limits: 10 attempts per IP per 15 minutes; 3 per supplied contact per hour. Counters are shared in Sanity, identities are hashed, and a hidden website field traps basic bots. On Vercel the IP comes from its overwritten x-forwarded-for header. Other hosts must strip/replace x-real-ip at a trusted reverse proxy; missing IPs share a conservative fallback bucket.
- The browser keeps a request ID across retries of unchanged form details. Booking and receipt creation are atomic. Changed payloads cannot reuse an ID; deleted bookings retain a non-contact receipt to prevent old requests from recreating them.

## One-time rollout

Do not deploy and leave initialization unfinished: writes deliberately fail closed until the registry exists.

1. Run `npm run test:bookings` and `npm run bookings:check`.
2. Configure the email values below and ensure the Sanity dataset is **private**. The existing read token must read the registry; the write token must write bookings, registry, receipts, and rate counters.
3. Retire old deployments/preview URLs and pause other booking writers. Deploy this app and the updated Sanity Studio configuration. Bookings are read-only in Studio; use `/admin` for booking mutations. Direct Sanity API writers bypass these invariants and must not be used.
4. During this brief maintenance window, run `npm run bookings:check -- --apply`. It creates the registry and stamps existing bookings atomically with revision guards. Existing holds without expiry get 24 hours from initialization. It refuses existing overlaps, invalid dates/statuses, and booking drafts/releases. It never replaces an existing registry.
5. Verify a disposable test booking in a staging dataset, conflict rejection, cancellation, expiry, and actual email receipt. Production mutations were not exercised by the automated tests.

The read-only check performed during development found 3 bookings, including 2 legacy holds that need expiry. No live records were changed.

## Owner email

The implementation uses Resend's send-email API. Set server-only values:

- `RESEND_API_KEY`: API key with email sending access.
- `BOOKING_NOTIFY_EMAIL`: Henrik's destination email.
- `BOOKING_EMAIL_FROM`: sender on a verified sending domain.
- `BOOKING_RATE_LIMIT_SECRET`: optional independent secret, at least 32 characters; otherwise ADMIN_SESSION_SECRET is used.

The booking is stored before email is attempted. Delivery failure never rolls back a booking or creates another one. The message is frozen before sending, and a stable provider idempotency key is reused on retry. Admin shows pending/failed alerts with **Retry**. There is no background email retry worker in this change; unresolved failures need admin attention. Resend retains idempotency keys for 24 hours, so verify delivery before manually retrying an ambiguous older failure.

## How overlap protection works

`reservationRegistry` contains compact reservation entries without guest contact data. The service reads that document directly (not through GROQ), checks overlaps, then updates its revision and the booking in one Sanity transaction. If another write wins, the entire transaction fails and is retried against the latest registry. Admin edits/deletes also require the displayed booking revision, preventing stale windows from overwriting newer changes.

The registry is intended for this small property. Monitor its document size and rate-counter growth as traffic/history increases; archive past registry entries and expired rate documents through a reviewed maintenance process if needed. Do not reset the registry independently of bookings.

Reference: [Sanity transactions and query consistency](https://www.sanity.io/docs/content-lake/transactions), [Vercel request headers](https://vercel.com/docs/headers/request-headers), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Checks

`npm run test:bookings` tests atomic competition, cross-unit and closure behavior, date edits, expired holds, duplicate retries, stale updates/deletes, missing setup, date/contact validation, rate-limit concurrency, and email failure/retry without external sends. These use a transactional fake, not a live datastore.
