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
node test/engines.test.mjs                 # rules: Ludo, Ayo, Whot with every house-rule combination
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
