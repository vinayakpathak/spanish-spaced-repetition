# Tira

Tira is a Spanish-learning prototype that turns each XKCD comic into a contextual spaced-repetition session. You see the original strip first, ask for help only where you need it, and let the scheduler choose the next strip from the cards that matter most.

## Learning model

- A comic contains clickable regions; each region reveals a translation and points to reusable word, phrase, grammar, or concept cards.
- Choosing an individual card means “I needed help with this.” Only that card enters learning and becomes due after one simulated day.
- Finishing a comic means “I understand the whole strip.” Eligible cards not opened are graded as independent successes. New cards graduate with a 14-day interval.
- A help grade always wins over an implicit success on the same study day.
- The next comic maximizes distinct overlap with due cards, then urgency. When nothing is due, unseen curriculum comes next. Once all material has been seen, the demo advances its clock to the earliest due review.
- Progress, the active comic, and opened regions are stored locally on the device and survive reloads.

The simplified schedule is intentionally transparent: help → 1 day; first independent recall → 3 days; later successes grow by the card’s ease factor; unseen material understood without help → 14 days.

## Content

The seed curriculum contains six locally cached, manually annotated comics, 27 clickable regions, and 51 reusable cards. Content integrity is validated when `lib/content.ts` loads.

Original comics are by Randall Munroe and used under [CC BY-NC 2.5](https://creativecommons.org/licenses/by-nc/2.5/). Spanish translations and learning notes are unofficial adaptations created for this noncommercial prototype. Each lesson links back to its source comic and license.

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
