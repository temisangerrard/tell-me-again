# Tell Me Again

A weekly family-stories app: sit down with the people who remember, record one good question at a time, play Ludo, Ayo or Whot together, and keep the stories.

Early prototype. Everything personal stays on the device (family details, recordings, wins). Live rooms hold only display names and game moves, and are erased after a day of quiet.

## What's in here

- `index.html`, `questions.js`, `sw.js`, `manifest.json`: the app. Plain HTML, CSS and JavaScript, no build step.
- `engines.js`: the Ludo, Ayo and Whot rules, shared by the browser and the server so every move is checked server-side.
- `src/`: a Cloudflare Worker (`worker.js`) and a Durable Object per room (`room.js`) for live play between phones.
- `test/`: rule-engine tests and a WebSocket integration test.
- `wrangler.jsonc`: Cloudflare configuration.

## Run it

```bash
npm install -g wrangler   # or use npx
npx wrangler dev          # http://localhost:8787, live rooms included
```

Test fixtures (`?data=worst`, `?data=empty`, ...) only work on localhost.

## Test

```bash
npm install                              # development-only UI test dependency
npm test                                 # game engines and UI regressions
BASE=http://localhost:8787 node test/room.test.mjs   # live rooms over WebSockets (add FULL=1 for full games)
```

## Deploy

```bash
npx wrangler deploy
```

## Notes

- Questions are written by hand. Nothing in the app makes up anyone's history.
- Faces and other art are not used; type is Bricolage Grotesque and Barlow Condensed (SIL Open Font License).
- No licence has been chosen yet, so all rights are reserved until one is added.

## Rules for anyone working on this (human or agent)

- No build step. Keep `index.html` (inline CSS and JS) plus `questions.js`, `engines.js`, `sw.js`, `manifest.json`. Don't add a framework or bundler.
- Never use the word "motto" in the UI (the field is "A saying your family lives by"). Write "onchain" if it ever comes up, not "on-chain".
- Don't localise the app: no `.ng`, no single-ethnicity art or copy. Heritage is optional and neutral.
- Copy: if a string isn't needed, delete it. No taglines, helper text or captions that restate a label, defend a choice or calm a worry. Keep only a real consequence at the moment of choosing, a scope or compatibility fact, what an empty state means and what to do next, and units on bare values. If a screen needs explaining, fix the layout. Cut whole clauses, don't reword them. Target: Linear's site, Apple Notes.
- Anti-slop: human copy, no illustrated faces, flat cards. White is the default theme; warm and night are options. Accent colours must pass contrast (`onAccent()`).
- **No audio is stored on our servers.** Audio is sent for transcription and discarded; recordings and text live on the user's device. Cloud storage is a future *paid* feature, not a default.
- Anything that sends audio or data off the device needs explicit consent first (`grantConsent` / `withdrawConsent`, notice in `privacySheet`). Bump `PRIVACY_V` when the notice changes.
- Controller: Settley Studio, run by Temisan Agbajoh. This is a separate product from Settley: don't send its email from `settley.co`.
- Bump the cache name in `sw.js` on every change that ships. Dev fixtures (`?data=`) only work on localhost.
- Run `node test/engines.test.mjs` and `BASE=http://localhost:8787 node test/room.test.mjs` (with `npx wrangler dev`) before shipping. Room creation is limited to 20 per minute per IP, so wait between test runs.
- Deploy with `npx wrangler deploy` from this folder only. Ask before buying anything.

## Tasks still to do

Roughly in priority order.

**Privacy and consent (do before real use)**
- [ ] Consent prompt for the person being recorded in a voice sitting ("You're being recorded", they can refuse). Today the host just taps record.
- [ ] Under-16 confirmation before recording.
- [ ] Reading-aloud consent fallback for guests who can't use the screen.
- [ ] Draft a record of processing, a DPIA (voice, older people) and a breach procedure. Needs the owner's review; not legal advice.
- [ ] Sign and file Cloudflare's data processing addendum; confirm Workers AI retention wording is still accurate.
- [ ] Confirm the legal status of Settley Studio (company or trading name) and update the notice wording and contact address.

**Accounts**
- [ ] Email-code sign-in, then passkey. The screens exist (`authScreen` in `index.html`) and call `/api/auth/start` and `/api/auth/verify`, which are stubs in `src/worker.js` that answer 503 "Accounts open soon" and store nothing. Build the real endpoints (code generation, expiry, rate limits, sessions, passkeys). Needs a sending domain for this product (not `settley.co`). The passkey button is disabled until then.
- [ ] Host identity for sittings and any paid features.

**Voice sitting**
- [ ] Relay for networks that block direct calls (Cloudflare Realtime TURN key). Today it only uses public STUN and can fail on strict networks.
- [ ] Group calls (currently one to one).
- [ ] Reconnect handling and keeping the call alive when the phone locks.
- [ ] Test on real iPhone and Android devices.
- [ ] Optional: "Start a call" buttons that open WhatsApp or FaceTime to invite someone (links only; those calls can't be recorded).

**Transcription**
- [ ] Tests for the automatic-transcribe toggle and its failure path.
- [ ] A `test/transcribe.test.mjs` for `/api/transcribe` validation and limits.
- [ ] Offer more languages and a language hint per recording.

**Make tab**
- [ ] Real magazine, storybook and short-film generation from the recordings and transcripts (today these are previews).
- [ ] Export as PDF / video.

**Paid tier (later)**
- [ ] Encrypted cloud backup and sync of audio and transcripts (R2, EU jurisdiction), shared family library, longer exports. Payments via Stripe or Paddle.

**Product and launch**
- [ ] Pick and attach a domain (nothing bought; `again.family` was the favourite).
- [ ] Optional real photo avatars.
- [ ] Licence.

## Landing and state cleanup (2026-11-03)

- [x] Explain recording, optional transcripts, and the publication roadmap on the landing page with interactive examples. Fictional stories and publication concepts are labelled.
- [x] Group Family controls into profile, activity, preferences, and information sections; clear stale online display names when a profile name is cleared.
- [x] Treat Ayo winner seat zero as a completed game; restore results when returning to a finished board without counting another win.
- [x] Add UI regression tests for landing startup, profile name clearing, and Ayo result restoration. `jsdom` is development-only; the shipped app still has no build step.
