# Accounts

Written 2026-11-04. Small on purpose: an account is an email address you can sign in with. A family still lives on the device.

## How it works

- `POST /api/auth/start {email, mode}` emails a 6-digit code (10 minutes, one use, five wrong tries, 30 seconds between sends). The code is stored only as a hash. The reply is the same whether or not an account exists.
- `POST /api/auth/verify {email, code, mode}` checks it and sets `tma_s`: an HttpOnly, Secure, SameSite=Lax cookie that lasts 30 days. `mode: "up"` creates the account, `"in"` needs one.
- `GET /api/me`, `POST /api/auth/logout`, `POST /api/account/delete`.
- One Durable Object per email (named by a hash of it) holds the pending code, the account and its sessions (`src/account.js`, logic in `src/account-core.js`, routes in `src/auth.js`).
- Limits per address and per IP. Cross-origin POSTs are refused. No links in the email.
- App: Family > Account (create or sign in, sign out, delete). The sign-in screen already existed.
- Optional tester list: set `ALLOW_EMAILS` (comma separated) and only those addresses can sign up.

Until the mail binding exists, every auth call answers "Accounts open soon" and nothing is stored. Deploying this code is safe.

## Switched on

Domain: tellagain.app (bought 2026-11-04, on Cloudflare). Email Sending was enabled with `npx wrangler email sending enable tellagain.app`, which added the DNS records (SPF, DKIM, DMARC, bounce MX). `wrangler.jsonc` has the `EMAIL` send_email binding, `MAIL_DOMAIN`, and a custom-domain route so the Worker also answers at https://tellagain.app. Mail comes from `hello@tellagain.app`. Sending to any address needs Workers Paid.

Local testing without email: `npx wrangler dev --var MAIL_DRY:log` prints the code to the terminal. It only works on localhost.

## Next

- Sync the small things (people, relationships, avatars, lore) to the account so a new phone can bring the family back. Recordings stay on the device unless paid storage exists.
- Accounts are the prerequisite for paid photo storage (docs/plans/question-bank-and-book.md).
- Add passkeys after email codes are solid.
