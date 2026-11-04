# AI interviewer and family lore

Status: agreed direction, nothing built yet except step 1. Written 2026-11-04.

## Why

Tester feedback: the app asks a question and then the person being interviewed has to carry it. The interviewer gets almost no help, and a first-time visitor to the Sit tab does not know what to do.

The idea: AI helps people interview their families, so parents, grandparents and siblings tell stories that build up into a shared history (the lore) the family owns.

## Steps, in order

1. **Guided Sit page.** A visible first-story path (add someone, ask a question, hear it back) until the first recording exists. No AI. Shipped first.
2. **Lore.** After each story, pull out people, places, years, foods and sayings into a family wiki on the device. Use it to suggest gaps ("nobody has asked Dad about his first job"), overlaps ("Mum and Gran both mention the 1998 move") and sibling comparisons ("ask your sister the same question"). The book and magazine draw from it.
3. **Live co-pilot.** While the person talks, transcribe in short chunks and offer the next follow-up from what they just said. The interviewer taps it or ignores it.
4. **AI interviewer on its own.** Grandma opens a link; a voice asks, listens and follows up. For relatives far away or when you cannot be there.

Order after step 1 is the owner's call: lore first (makes suggestions feel smart) or the solo AI interviewer first (best demo).

## Rules that stay

- Recordings stay on the device. No audio on our servers.
- Text may go to a model for follow-ups and lore, with a separate consent step and a line in the privacy notice. The server keeps nothing; the lore lives on the phone and rides along with backups.
- Per-person usage caps while testing; model calls cost money.
- No tracking tools without the owner's decision.

## Open questions

- Which model: Workers AI (already in the account, cheap) or another provider.
- Consent wording for sending transcript text.
- Whether the interviewer voice is text-to-speech from the first version or text only.
