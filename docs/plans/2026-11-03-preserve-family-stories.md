# Preserve Family Stories Implementation Plan

> Execute sequentially in the current checkout, using test-driven development.

**Goal:** Let a family recover its archive, record with permission, and publish selected transcripts.

**Architecture:** Keep the current static HTML/JavaScript app and Cloudflare room backend. All backup and publication processing stays in the browser. Restore validates the entire versioned file before replacing local records; recording permission is requested from the connected peer over a WebRTC data channel.

**Tech Stack:** Vanilla JavaScript, IndexedDB, WebRTC, MediaRecorder, browser printing, node:test, jsdom, fake-indexeddb (test only).

## Work list

- [x] 1. Complete backup and restore.
  - Write failing tests for audio/transcript round trips, invalid files, duplicate IDs, failed transactions, and consent reset.
  - Implement a versioned JSON backup containing family settings and base64 audio.
  - Add download and restore controls with file preview and explicit replacement confirmation.
  - Validate and limit imports before any writes; roll back settings if the recording transaction fails.
  - Verify in Chromium with actual IndexedDB and downloaded files; commit.
- [x] 2. Recording consent and interruption handling.
  - Write failing tests for the consent gate, refusal/dismissal, and saving a recording on hangup.
  - Require recording permission and age/guardian confirmation for in-person recordings.
  - Request permission from the actual remote peer using a data channel; show recording state to both people and allow either to stop.
  - Save captured audio on hangup or connection failure; warn before leaving during recording and surface persistence failures.
  - Exercise a two-browser call with synthetic microphone input; commit.
- [x] 3. A real family magazine.
  - Write failing tests for selected transcripts, empty selection, and HTML escaping.
  - Add story selection and a locally generated cover, contents, and transcript pages.
  - Offer standalone HTML download and browser Print / Save PDF.
  - Verify a generated PDF visually and confirm source transcripts are preserved; commit.
- [ ] 4. Review and release preparation.
  - Run `npm test`, `BASE=http://localhost:8787 node test/room.test.mjs`, and browser journeys.
  - Update README and service-worker version; exclude plan files from static assets.
  - Push a stacked feature PR against `codex/landing-profile-game-cleanup`, review feedback, and resolve valid findings.

## Later, when shared storage or paid features need identity

- [ ] Choose the lasting product domain and sending domain.
- [ ] Implement organiser email OTP, session expiry/recovery and rate limits on Cloudflare.
- [ ] Add optional passkeys and account-free family invitations.
- [ ] Add explicitly opted-in cloud backup/shared libraries; preserve local export.

## Boundaries

No purchase, email sending, cloud audio storage, or account implementation in this change. TURN relay and real iPhone/Android background-call testing remain explicit follow-ups. The browser's print dialog supplies PDF export; no server or generated historical narrative is involved.
