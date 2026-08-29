# Tira

Tira is a Spanish-learning prototype for English speakers that turns each translated xkcd comic into a contextual spaced-repetition session. You read the Spanish strip first, reveal English help only where you need it, and let the scheduler choose the next strip from the cards that matter most.

## Learning model

- Every printed Spanish word in the comic image is a direct click target. Choosing a word is only navigation: it records zero learned cards.
- The sidebar then shows that word's meaning card plus any reusable expression, grammar, or necessary context cards connected to that exact occurrence.
- All 48 reusable grammar and expression cards use plain-English questions, beginner explanations, and generic bilingual examples. A separate display-only “In this comic” note explains the current occurrence; the shared card itself remains reusable across strips.
- Choosing one of those individual cards means “I needed help with this.” Only that exact card enters learning, increments “learned today,” and becomes due after one simulated day.
- Finishing a comic means “I understand the whole strip.” Eligible cards not chosen for help are graded as independent successes. New cards graduate with a 14-day interval.
- A help grade always wins over an implicit success on the same study day.
- The next comic maximizes distinct overlap with due cards, then urgency. When nothing is due, unseen curriculum comes next. Once all material has been seen, the demo advances its clock to the earliest due review.
- Progress, the active comic, and opened regions are stored locally on the device and survive reloads.

The simplified schedule is intentionally transparent: help → 1 day; first independent recall → 3 days; later successes grow by the card’s ease factor; unseen material understood without help → 14 days.

## Content

The seed curriculum contains six locally cached, manually annotated Spanish comics: 27 bubbles, 530 ordered word occurrences, 342 context-aware word-meaning cards, and 61 higher-level cards, including 25 grammar lessons and 23 reusable expressions. Those higher-level cards are limited to reusable grammar, common idioms, lexicalized collocations, and concepts genuinely needed to understand a joke; ordinary sentence translations are neither shown as learning aids nor scheduled as cards. Repeated exact forms share a card when their meanings match; polysemous forms split by sense, while accents and conjugations remain distinct. Straightforward word cards stay compact, while the 30 structurally difficult forms include a beginner explanation and a reusable bilingual example. Comic-specific word, grammar, and expression applications are stored separately from shared cards, and content integrity is validated when `lib/content.ts` loads.

Original comics are by Randall Munroe. Spanish translations are by Gabriel Rodríguez Alberich at [xkcd en español](https://es.xkcd.com/), the unofficial Spanish edition linked from xkcd's own About page. Both editions publish the work under [CC BY-NC 2.5](https://creativecommons.org/licenses/by-nc/2.5/). Tira's hotspots and English learning notes are additional unofficial adaptations for this noncommercial prototype. Each lesson links to the Spanish translation, the original comic, and the license.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm test
npm run lint
npm run typecheck
```

The main product surface is in `app/page.tsx`, the scheduler is in `lib/srs.ts`, and curated curriculum data is in `lib/content.ts`.
