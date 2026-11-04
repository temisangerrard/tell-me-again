# Tell Me Again

A weekly family-stories app: sit down with the people who remember, record one good question at a time, play Ludo, Ayo or Whot together, and keep the stories.

Early prototype. Everything personal stays on the device (family details, recordings, wins). Live rooms hold only display names and game moves, and are erased after a day of quiet.

## What's in here

- `index.html`: a thin shell that loads `css/*.css` and `js/*.js` in order. No build step, no bundler.
- `css/`: one file per area (base, landing, room, make, sit, games, motion...). Order matters; it is the cascade order.
- `js/`: one file per feature (state, onboarding, sit, make, ludo, whot, ayo, call, room...). They are plain scripts sharing one scope, loaded in the order listed in `index.html`. Add a file by adding its `<script src>` tag there; `test/app.mjs` reads that list too.
- `questions.js`, `sw.js`, `manifest.json`: the question bank, service worker and web manifest.
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

- No build step. The app is plain files under `css/` and `js/` loaded by `index.html`. Keep files small and single-purpose; put new code in the file for its feature, or add a new file. Don't add a framework or bundler.
- Never use the word "motto" in the UI (the field is "A saying your family lives by"). Write "onchain" if it ever comes up, not "on-chain".
- Don't localise the app: no `.ng`, no single-ethnicity art or copy. Heritage is optional and neutral.
- Copy: if a string isn't needed, delete it. No taglines, helper text or captions that restate a label, defend a choice or calm a worry. Keep only a real consequence at the moment of choosing, a scope or compatibility fact, what an empty state means and what to do next, and units on bare values. If a screen needs explaining, fix the layout. Cut whole clauses, don't reword them. Target: Linear's site, Apple Notes.
- Anti-slop: human copy, no illustrated faces, flat cards. White is the default theme; warm and night are options. Accent colours must pass contrast (`onAccent()`).
- **No audio is stored on our servers.** Audio is sent for transcription and discarded; recordings and text live on the user's device. Cloud storage is a future *paid* feature, not a default.
- No analytics, A/B-testing or visitor-tracking tools (RoutingCat, Google Analytics and the like) without the owner's decision. The landing page and privacy notice promise no tracking and no cookies; such a tool sets a long-lived visitor cookie and sends visitor data to a third party, so it needs the privacy notice, the landing copy, a consent step and a data processing agreement changed first.
- Solo "Play a bot" is the one online feature that needs no consent step because it sends no personal data: only the neutral name "You", the bot's name and the moves. Keep it that way.
- Anything that sends audio or data off the device needs explicit consent first (`grantConsent` / `withdrawConsent`, notice in `privacySheet`). Bump `PRIVACY_V` when the notice changes.
- Controller: Settley Studio, run by Temisan Agbajoh. This is a separate product from Settley: don't send its email from `settley.co`.
- Dev fixtures (`?data=`) only work on localhost.
- Ask before buying anything or changing outward-facing settings (domains, DNS, billing, repo settings).

## How we work (Claude, Codex and people share this repo)

- `main` is the source of truth and always matches what is deployed. Don't commit to it directly: branch from the latest `main`, open a pull request **into `main`** (never into another feature branch), and merge it there.
- Before starting, `git fetch` and rebase or merge the latest `main`. Before opening a PR, do it again. Resolve conflicts by keeping both sides' intent; never overwrite or revert someone else's work to make a conflict go away.
- Keep changes small and focused, one concern per PR. Files are per feature, so two people rarely touch the same one.
- Tests must pass before a PR: `npm install` once, then `npm test`. For room and call changes also run `npx wrangler dev` and `BASE=http://localhost:8787 node test/room.test.mjs` (add `FULL=1` for full games; room creation is limited to 20 per minute per IP, so wait between runs). `npm run test:browser` needs `npx playwright install chromium`.
- Add or update a test with every behaviour change, and verify UI changes in a real browser at phone width.
- Bump the cache name in `sw.js` on every change that ships.
- Deploy only from an up-to-date `main`, with `npx wrangler deploy` in this folder, after the PR is merged. Say what version went out. Never deploy a branch.
- Keep this file current: tick tasks off in the same PR, and add new rules here, not in chat.

## Tasks still to do

Roughly in priority order.

**Privacy and consent (do before real use)**
- [x] The connected person must allow recording before capture starts; either participant can stop it. Consent travels through the actual WebRTC peer data channel.
- [x] Age/guardian confirmation before in-person and remote recording.
- [ ] Reading-aloud consent fallback for guests who can't use the screen.
- [ ] Draft a record of processing, a DPIA (voice, older people) and a breach procedure. Needs the owner's review; not legal advice.
- [ ] Sign and file Cloudflare's data processing addendum; confirm Workers AI retention wording is still accurate.
- [ ] Confirm the legal status of Settley Studio (company or trading name) and update the notice wording and contact address.

**Accounts**
- [ ] Email-code sign-in, then passkey. The screens exist (`authScreen` in `index.html`) and call `/api/auth/start` and `/api/auth/verify`, which are stubs in `src/worker.js` that answer 503 "Accounts open soon" and store nothing. Build the real endpoints (code generation, expiry, rate limits, sessions, passkeys). Needs a sending domain for this product (not `settley.co`). The passkey button is disabled until then.
- [ ] Host identity for sittings and any paid features.

**Voice sitting**
- [ ] Switch on the call relay. The code is done (`/api/ice` in `src/worker.js`, `getIce` in `js/call.js`) and falls back to STUN. To enable: in the Cloudflare dashboard create a Realtime TURN key (Realtime > TURN), then run `npx wrangler secret put TURN_KEY_API_TOKEN` (`TURN_KEY_ID` is already in `wrangler.jsonc`). `/api/ice` then answers `relay: true`.
- [ ] Group calls (currently one to one). The call is a floating widget (`callDock`, `voiceSitting`) that persists across tabs; the host steers questions from Sit.
- [x] Save captured audio on hangup, peer-channel closure, call failure or a sustained disconnection; show recording state on both phones.
- [ ] Reconnect handling and keeping the call alive when the phone locks (requires real-device testing).
- [ ] Test on real iPhone and Android devices. Known: in-app browsers (X, Instagram, Facebook) cannot use the microphone; the app detects them (`inAppBrowser` in `js/call.js`) and says to open the link in Safari or Chrome.
- [ ] Optional: "Start a call" buttons that open WhatsApp or FaceTime to invite someone (links only; those calls can't be recorded).

**Transcription**
- [ ] Tests for the automatic-transcribe toggle and its failure path.
- [ ] A `test/transcribe.test.mjs` for `/api/transcribe` validation and limits.
- [ ] Offer more languages and a language hint per recording.

**Game feel**
- [x] Each tab is its own player in a room (`roomPid`, `claimRoom` in `js/online.js`), so two tabs on one device are two people.
- [x] Soft sound and a buzz on your turn, a fanfare on a win, emoji reactions between phones, Play again, and a Sound on/off toggle (`js/feel.js`).
- [x] Ludo dice tumble and tokens hop square by square, local and online (`js/ludo-motion.js`).
- [x] Online Whot (deal, play, pick, rule chip) and online Ayo (seed-by-seed sowing replay, capture) motion: `js/card-motion.js`, `js/online-game.js`.
- [x] Win moment (confetti and a winner pop, `js/win.js`) in all three games, local and online.
- [x] Your-turn nudge (`js/nudge.js`): a backgrounded page flashes its tab title and, with the Alerts toggle on, sends a notification; coming back pulses the stage.
- [ ] Real Web Push so a phone that has the app in the background or closed is told it's their turn. Needs a service-worker `push` handler, VAPID keys, a stored subscription per member in the room, and the Worker sending the push on a turn change. iPhone only supports this for an installed (Add to Home Screen) app.
- [ ] Motion for local pass-the-phone Whot (the gate hides the table between turns).
- [ ] Make the "Ask while you play" question card a real beat between turns, with the host able to record the answers.

- [x] Bots (`bot()` in each engine in `engines.js`, run by the room in `src/room.js`): Add a bot in a room lobby, or Play a bot in one tap from the Play tab. Bots only use their own hand and public state, and every move goes through the same `act()` as a person's.
- [x] Joining a running game with a bot: a spectator can take the bot's seat (`takeover` in `src/room.js`, bar in `js/room.js`); with only people playing they're told they'll be dealt in next round.
- [x] Microphone errors say whether the browser remembered a No (won't ask again) or the prompt was dismissed, with steps for this phone (`micSteps`, `micMessage` in `js/call.js`), and include the error name so a report is easy to read.
- [ ] Bot difficulty levels, and bots in the local pass-the-phone games.
- [x] Sit tab as a family dashboard (`js/sit-home.js`): Next up (who most needs a story, with a question for a topic they haven't covered), the family ordered by need with a topic-coverage ring, a page per person (topics covered, their recordings, year born, remove), activity feed and library.
- [ ] Relationship per person (grandmother, cousin) for grouping and question choice; search and pinning for large families; live status when someone is in a room; attribute older recordings that have no speaker.

- [x] Sound design (`js/sounds.js`, `js/feel.js`): synthesised, no files. Dice rattle and knock, wooden token hops, card slide, clay seed drops, bell chimes for your turn and wins; routed through a compressor, limiter and soft clip; unlocks on the first touch; a Sound setting in Family. Levels were measured by rendering each sound offline (`buildChain` + `buildSounds` on an `OfflineAudioContext`): singles peak 0.5 to 0.8, worst-case overlaps stay under 0.9.
- [ ] iPhone's silent switch mutes web audio. Fixing that means switching the page's audio session to playback, which would also interrupt the user's music, so decide before doing it. Optional: a soft background ambience, and different sound themes.

- [x] Brand: an icon family drawn from one script (`tools/icons/build.py`): an open book of stories with a ring of family dots in the app's five colours joined by one line. Emblem, mark (colour, light, mono), app icon, maskable, favicon, PNG sizes and the four tab icons share it. Regenerate with `python3 tools/icons/build.py` (needs `rsvg-convert`).
- [x] A sample family book on the landing page (`js/book.js`, `css/book.css`): a made-up family's twelve-page book that turns on wide screens (spreads) and phones (single pages). **Every book rule is scoped under `.leaves`/`.bookblk`**: unscoped class names clashed with the app's own four times while building it, and `test/book.test.mjs` fails if one slips in.
- [x] The landing cast is 3D: soft clay-style characters (Grandma, Dad, Aunty, Mum, a child, and Pebble the bot) modelled procedurally and rendered by Blender, no downloaded or AI-generated models. Regenerate with `Blender -b --python tools/blender/characters.py -- --out /tmp/chars --frames 30 --w 560 --h 560` then `python3 tools/blender/pack.py /tmp/chars`; this writes `art/characters/*.webp` (a transparent looping animation and a still for reduced motion, about 250 KB each). Edit the cast in the `CAST` table in `characters.py`.
- [x] Landing page as a scroll: colour blocks (`js/landing.js`, `css/landing2.css`) for Sit, Play, Make, Far away, Family and Private, a question marquee, a cast of animated characters, and Ludo, Ayo and Whot playing live (Ayo and Whot run the real engines, bot against bot; silent, and only while on screen).
- [ ] Landing: real screenshots or short recordings in place of the illustrated Make artefacts once the storybook and film exist; translate the landing; measure whether it converts (needs a consent-respecting, privacy-preserving way to count).

**Make tab**
- [x] Magazine from selected, reviewed transcripts, with cover and contents; standalone HTML download and browser Print / Save PDF.
- [ ] Storybook and short-film generation; video export.

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

## Preservation work list

- [x] Full local backup: family details, audio bytes, transcripts, games won and preferences in one versioned JSON file.
- [x] Restore from the welcome page or Family, with validation, replacement confirmation and a single IndexedDB recording transaction. Transcription permission is reset on restore.
- [x] Recording permission and age/guardian confirmation; explicit refusal, remote stop and saving on hangup/interruption.
- [x] Magazine story selection, review confirmation, standalone download and Print / Save PDF.
- [ ] Pick the lasting product and email-sending domains.
- [ ] Organiser email OTP and sessions on Cloudflare, then optional passkeys.
- [ ] Opt-in cloud backup and shared libraries.

Backups contain unencrypted family audio/text. Imports are limited to 128 MB (exported audio roughly 89 MB because JSON uses base64); larger archives can save recordings individually. No backup or magazine content is uploaded. A phone/browser being killed can still lose an unfinished recording; background calls, TURN relay and real iPhone/Android testing remain outstanding.

Browser regression journeys (synthetic fixtures only):

```bash
npx playwright install chromium
# Start npx wrangler dev in another terminal, then:
npm run test:browser
```

PDF export uses the browser's print dialog. The standalone magazine file also opens offline and can be printed later.
