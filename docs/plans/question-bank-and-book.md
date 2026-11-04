# Question bank and the family book

Written 2026-11-04. The bank is human-written and works with no AI. AI (lore, suggestions) sits on top and never replaces it.

## The bank

`questions.js`, 101 questions, 13 chapters. Each question:

| field | meaning |
|---|---|
| `id` | stable, never reused. Older questions get a derived id at load; give one an explicit `id` before editing its wording |
| `c` | chapter |
| `d` | depth: 1 warm-up, 2 people and place, 3 change and hard things, 4 legacy. Sittings ease in |
| `q`, `f`, `tip` | the question, follow-ups for when it goes quiet, one line of coaching for the asker |
| `for` | who is answering, in relation to the asker: grandparent, parent, sibling, partner, child, relative, friend. Omit for anyone |
| `photo` | the picture to have to hand. In the free app it is a prompt; in the paid book it becomes a place to attach the photo |
| `page` | the book page this answer becomes: story, recipe, timeline, tree, saying, portrait, object |
| `sensitive` | check first, offer a skip |

Chapters: names, home, food, fun, work, love, faith, nation, journey, wisdom (asked of elders), plus **us** (between siblings, partners, friends), **parent** (being a parent) and **things** (photographs, objects, cloth, handwriting).

Every person in the family has a relationship to you (`people[].rel`). Question choice uses it (`questionsFor(rel)`), so asking a sister gets "What do you remember about sharing a room with me?" and asking a grandmother does not. An unknown relationship sees everything.

Rules the tests enforce (`test/questions.test.mjs`): unique ids, a real chapter, depth 1 to 4, at least two follow-ups, a tip, a known page type and relations, every chapter and relationship covered at every depth, no em dashes, no "not this, it's that", no banned words.

Next for the bank: grow to about 250 (more for partners, children asking parents, and the teenage years), curated **rounds** (five-question sets such as "First sitting", "Siblings night", "Before the wedding", "The recipes"), and a seasonal set.

## From answers to a book

Chapter order follows the chapters the family chose. A recording with a transcript becomes a page of the type the question names: a story page, a recipe card (food), a timeline spread (big events and journeys), a saying (the pull-quote pages), an object page (things we kept), a family tree built from the people and their relationships. The sample book on the landing page shows each type.

## Free and paid

Free: everything above, plus a book made from the words and recordings (QR codes to the audio), printable to PDF.

Paid (the owner's idea): **photographs**. Upload family pictures, attach them to the question that asked for them, and get the heirloom-and-scrapbook book: photo layouts, polaroid frames, tape and corners, handwritten captions, torn paper, stickers, scanned handwriting and documents on object pages. Possibly a printed copy.

What this needs, in order:
1. **Accounts.** Photos are personal data and must belong to someone who can come back to them. Blocked on user management.
2. **Storage.** Cloudflare R2, private, keyed by family id. Client resizes to about 2000 px, strips location from EXIF, makes a thumbnail. Per-family quota (for example 500 photos or 2 GB) set once pricing is.
3. **Attach UI.** On a question with `photo`, and on any recording, an "Add a photo" slot; caption field; faces tagged to people already in the family (no face recognition, ever).
4. **Layout engine.** Page types x photo slots (0 to 4), tuned in `css/book.css`; print-safe at A4 and a square book.
5. **Print.** A print-on-demand partner API, or PDF export first.

Privacy additions: photos are stored only for paying accounts, deleted on request, never used for anything else, and the privacy notice gets a photo section.

Open: pricing (one-off per book, subscription, or storage tiers), print partner, who may upload (owner only, or any member of the family).
