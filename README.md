# Tira

Tira is a Spanish-learning prototype for English speakers that turns translated xkcd comics into contextual spaced-repetition sessions. You read the Spanish strip first, reveal English help only where you need it, and let the scheduler choose the next strip from the cards that matter most.

## Learning model

- Every reviewed word—and every Latin-script word recovered by the draft OCR pipeline—is a direct click target. Choosing a word is only navigation: it records zero learned cards.
- The sidebar then shows that word's meaning card plus any reusable expression, grammar, or necessary context cards connected to that exact occurrence.
- All 48 reusable grammar and expression cards use plain-English questions, beginner explanations, and generic bilingual examples. A separate display-only “In this comic” note explains the current occurrence; the shared card itself remains reusable across strips.
- Choosing one of those individual cards means “I needed help with this.” Only that exact card enters learning, increments “learned today,” and becomes due after one simulated day.
- Finishing a comic means “I understand the whole strip.” Eligible cards not chosen for help are graded as independent successes. New cards graduate with a 14-day interval.
- A help grade always wins over an implicit success on the same study day.
- The next comic maximizes distinct overlap with due cards, then urgency. When nothing is due, unseen curriculum comes next. Once all material has been seen, the demo advances its clock to the earliest due review.
- Progress, the active comic, and opened regions are stored in IndexedDB on the device and survive reloads without consuming the much smaller localStorage quota. Existing `tira:srs:v3` and `tira:ui:v3` localStorage records are migrated once, then removed after a successful IndexedDB write.

The simplified schedule is intentionally transparent: help → 1 day; first independent recall → 3 days; later successes grow by the card’s ease factor; unseen material understood without help → 14 days.

## Comic importance

Every comic also has a corpus-wide score computed as **PageRank-style recursive importance**, or damped two-way comic–target centrality. One node set contains comics, the other contains connected learning targets, and an edge means that a comic uses that target. Comics raise the targets they link to, and targets raise every comic that links to them. On each iteration, 85% of influence follows these links while a 15% baseline/reset prevents disconnected components and zero-target comics from vanishing. Iteration continues until the change is below `1e-12` or 1,000 iterations have run.

The published centrality is normalized across the comic partition, so all 258 comic scores sum to 100%. Rank uses descending score with comic ID as the deterministic tie-breaker. For this analytics graph, reviewed and generated schedulable word cards map to one canonical target when their normalized Spanish prompt and English answer match; higher-level grammar, expression, and concept cards use exact IDs. This grouping is analytics-only: it never merges SRS card IDs or progress. The 9,466 unresolved clickable previews are excluded entirely. Because generated contextual senses have not been reviewed, their relationships and resulting scores remain provisional.

## Content and review status

The corpus contains all 258 entries currently listed in the Spanish xkcd archive. Six are locally cached and manually annotated: 27 bubbles, 530 ordered word occurrences, 342 context-aware word-meaning cards, and 61 higher-level cards, including 25 grammar lessons and 23 reusable expressions. Those reviewed higher-level cards are limited to reusable grammar, common idioms, lexicalized collocations, and concepts genuinely needed to understand a joke; ordinary sentence translations are neither shown as learning aids nor scheduled as cards. Repeated exact forms share a card only when their meanings match; polysemous forms split by sense, while accents and conjugations remain distinct.

The other 252 entries are an explicitly provisional authoring corpus. Apple Vision found 15,486 raw positioned tokens across the archive. After obvious non-Latin OCR noise was removed and four missed visible words were manually restored, the draft exposes 14,485 clickable word occurrences. Of these, 5,019 have a conservative dictionary match and can enter SRS; 9,466 unresolved words remain clickable previews but are never scheduled or implicitly mastered. Every generated comic and card is marked **Machine-extracted · needs review** in the product. Generated grammar, expression, and contextual-sense lessons still require human authoring. Occurrence cards stay separate until a reviewer confirms that two written forms genuinely have the same contextual sense. The app lazily downloads one comic bundle at a time, while a roughly 317 KB compressed catalog restores scheduling, ranking, and card history.

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

## Corpus pipeline

The generated data is deterministic and reviewable:

```bash
# Refresh the 258-entry archive manifest.
node scripts/import-es-xkcd.mjs

# Download images, run Spanish OCR, and validate geometry/confidence data.
node scripts/build-generated-corpus.mjs \
  --manifest data/source/es-xkcd.json \
  --output-dir data/generated/ocr

# Build conservative dictionary candidates. Supply local es-en.data and
# frequency.csv inputs; provenance and hashes are recorded in the result.
node scripts/build-provisional-glossary.mjs \
  --ocr-dir /path/to/corpus-cache/vision-v1 \
  --dictionary /path/to/es-en.data \
  --frequency /path/to/frequency.csv

# Compile lazy browser bundles after the OCR and glossary stages.
node scripts/build-runtime-corpus.mjs
```

`data/source` preserves archive URLs, source anomalies, translation credit, and license metadata. `data/generated` keeps OCR confidence and glossary ambiguity visible instead of silently upgrading machine output to reviewed curriculum. Browser files are written to `public/corpus`; their lightweight manifest is loaded first, then a single comic bundle is fetched when selected.
