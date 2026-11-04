# AI interviewer and family lore

Status: agreed direction, nothing built yet except step 1. Written 2026-11-04.

## Why

Tester feedback: the app asks a question and then the person being interviewed has to carry it. The interviewer gets almost no help, and a first-time visitor to the Sit tab does not know what to do.

The idea: AI helps people interview their families, so parents, grandparents and siblings tell stories that build up into a shared history (the lore) the family owns.

## Decision (owner, 2026-11-04)

No AI interviewer. A person always asks the questions; a person always answers. The AI only helps the asker choose what to ask. This is a relationship-building tool: the point is two people talking, not a machine collecting. The old step "AI interviewer on its own" is dropped.

## Steps, in order

1. **Guided Sit page.** A visible first-story path (add someone, ask a question, keep it) until the first recording exists. No AI. Shipped.
2. **Lore.** After each story, pull out people, places, years, foods and sayings into a family wiki on the device. Use it to suggest what to ask next: gaps ("nobody has asked Dad about his first job"), overlaps ("Mum and Gran both mention the 1998 move"), sibling comparisons ("ask your sister the same question"). The book and magazine draw from it.
3. **Question suggestions while you talk.** In short transcribed chunks, offer the asker a next follow-up from what was just said ("What did the house look like?"). The asker taps it, rewords it or ignores it. The AI never speaks to the interviewee.
4. **Closeness prompts.** Things that grow the relationship, not the archive: "ask something you have never asked", "tell them one thing you learned about them", a short "what I heard" note the asker can send back after a sitting.

## Rules that stay

- Recordings stay on the device. No audio on our servers.
- Text may go to a model for follow-ups and lore, with a separate consent step and a line in the privacy notice. The server keeps nothing; the lore lives on the phone and rides along with backups.
- Per-person usage caps while testing; model calls cost money.
- No tracking tools without the owner's decision.

## Open questions

- Which model: Workers AI (already in the account, cheap) or another provider.
- Consent wording for sending transcript text.
- How suggestions appear while the interviewee is talking without pulling the asker's eyes off them.
