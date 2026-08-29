# Tira

Tira is a Spanish-learning prototype for English speakers that turns translated xkcd comics into contextual spaced-repetition sessions. You read the Spanish strip first, reveal English help only where you need it, and let the scheduler choose the next strip from the cards that matter most.

## Learning model

- Every reviewed word—and every Latin-script word recovered by the draft OCR pipeline—is a direct click target. Choosing a word is only navigation: it records no learning event or card timestamp.
- The sidebar then shows that word's meaning card plus any reusable expression, grammar, or necessary context cards connected to that exact occurrence.
- All 48 reusable grammar and expression cards use plain-English questions, beginner explanations, and generic bilingual examples. A separate display-only “In this comic” note explains the current occurrence; the shared card itself remains reusable across strips.
- Loading a comic starts a pending timestamped exposure for every unique, exact card connected to that strip, including machine-generated cards marked **Review needed**. Opening one specific card records the answer-opening timestamp for that exact card. Reopening it may preserve additional timestamps, but still counts as one help outcome for that comic exposure. Review status never changes scheduling eligibility.
- Finishing a comic means “I understand the whole strip” and turns the pending exposure into a completed one. A card opened at least once is evidence that help was needed; a card left unopened is evidence of independent understanding. An unfinished comic never turns its unopened cards into successes, and resuming it after a reload does not create a duplicate exposure.
- Completed exposures retain their comic-display, completion, and exact-card opening timestamps. The full history is preserved rather than truncated to a recent event window, so every new selection can be evaluated against the learner's complete record.
- There are no simulated days, due dates, or fixed review intervals. After every completed comic, the scheduler recalculates every card's current priority and chooses the next unread comic immediately. A completed comic is permanently marked read and never scheduled again. When all 258 have been read, the session ends; resetting progress is the explicit way to read the collection again.
- Progress, the active pending exposure, and opened regions are stored in IndexedDB on the device and survive reloads without consuming the much smaller localStorage quota.

### Continuous card priority

The scheduler combines two signals. **Help need** (`H`) asks how often the learner has opened a card in recent completed exposures, plus any still-active exposure whose answer has already been opened. A pending unopened exposure remains neutral until the comic is finished. For effective exposure `i`, its evidence weight halves every 14 days:

```text
wᵢ = 2 ^ (−ageDaysᵢ / 14)
F  = Σ wᵢ for exposures where the card was opened
S  = Σ wᵢ for exposures where the card was not opened
H  = (0.35 + F) / (1 + F + S)
```

The `0.35` numerator and one unit of prior evidence give an unseen card a 35% help-need baseline without letting a single observation force the score to zero or one. Frequent recent opens push `H` upward; frequent recent displays without an open push it downward.

**Forgetting risk** (`G`) uses an exponential forgetting curve. A card begins with one day of memory stability. Before a later successful exposure, its predicted retrievability is `R = 2 ^ (−gapDays / stabilityDays)`; success then multiplies stability by `1 + 1.5 × (1 − R)`, capped at 365 days. This gives little long-term benefit to massed repetition and more benefit to a successful recall after a useful delay. An opened exposure is treated as a lapse and changes stability to `max(0.25, min(1, 0.4 × stabilityDays))`. At the instant comics are ranked:

```text
G = 1 − 2 ^ (−elapsedDays / stabilityDays)
P = 1 − (1 − H) × (1 − G)
```

`P` is a bounded priority index, not a calibrated probability. It stays high for cards that repeatedly require help even immediately after exposure, stays low for cards repeatedly understood without help, and rises as any card has time to be forgotten. The constants—14-day evidence half-life, 35% unseen baseline, one-day initial stability, `1.5` success gain, `0.4` lapse multiplier, 0.25-day floor, and 365-day ceiling—are transparent version-one defaults that can later be fitted to the learner's history.

### Choosing the next comic

For each unread comic, the scheduler sums `P` over all of its unique exact card IDs, including review-needed drafts. It does not use or merge the provisional analytics target IDs described below. Both the largest card-priority sum and the largest corpus importance score among unread comics are normalized to `1`, then combined:

```text
cardAxis       = comicCardPrioritySum / largestComicCardPrioritySum
importanceAxis = comicImportance / largestComicImportance
selectionScore = 0.80 × cardAxis + 0.20 × importanceAxis
```

Thus 80% of selection follows the learner's live exact-card needs and 20% favors comics that connect important recurring material. This calculation runs for every Next action, not once per calendar day. Card priorities can recur through other unread comics that share those cards, but a read comic itself never returns.

### Persistence migration and research basis

Schema-v3 progress recorded simulated day numbers and retained only a capped review history, so it cannot be converted into exact historical timestamps. Migration preserves its aggregate learning evidence as a bounded legacy prior without inventing dates; complete timestamp history begins with the continuous scheduler. Existing `tira:srs:v3` and `tira:ui:v3` localStorage records are still imported once and removed only after a successful IndexedDB write.

The model is a deliberately explainable adaptation rather than an implementation of any one published scheduler. Its exponential retrievability curve and history features follow [Half-Life Regression for language learning](https://aclanthology.org/P16-1174/); its use of item difficulty plus the amount, timing, and outcome of practice follows the [DASH personalized-review model](https://doi.org/10.1177/0956797613504302); and its separate stability, difficulty, and retrievability signals follow the [official FSRS algorithm description](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm).

## Comic importance

Every comic also has a corpus-wide score computed as **PageRank-style recursive importance**, or damped two-way comic–target centrality. One node set contains comics, the other contains connected learning targets, and an edge means that a comic uses that target. Comics raise the targets they link to, and targets raise every comic that links to them. On each iteration, 85% of influence follows these links while a 15% baseline/reset prevents disconnected components and zero-target comics from vanishing. Iteration continues until the change is below `1e-12` or 1,000 iterations have run.

The published centrality is normalized across the comic partition, so all 258 comic scores sum to 100%. Rank uses descending score with comic ID as the deterministic tie-breaker. For this analytics graph, reviewed and generated word cards—including unresolved review-needed cards—map to one canonical target when their normalized Spanish prompt and English answer match; higher-level grammar, expression, and concept cards use exact IDs. This grouping is analytics-only: it never merges SRS card IDs or progress. Because generated contextual senses have not been reviewed, their relationships and resulting scores remain provisional.

## Content and review status

The corpus contains all 258 entries currently listed in the Spanish xkcd archive. Six are locally cached and manually annotated: 27 bubbles, 530 ordered word occurrences, 342 context-aware word-meaning cards, and 61 higher-level cards, including 25 grammar lessons and 23 reusable expressions. Those reviewed higher-level cards are limited to reusable grammar, common idioms, lexicalized collocations, and concepts genuinely needed to understand a joke; ordinary sentence translations are neither shown as learning aids nor scheduled as cards. Repeated exact forms share a card only when their meanings match; polysemous forms split by sense, while accents and conjugations remain distinct.

The other 252 entries are an explicitly provisional authoring corpus. Apple Vision found 15,486 raw positioned tokens across the archive. After obvious non-Latin OCR noise was removed and four missed visible words were manually restored, the draft exposes 14,485 clickable word occurrences. Of these, 5,019 have a conservative dictionary match and 9,466 still say that their meaning needs review. All 14,485 enter SRS and the importance graph. Every generated comic and card is visibly marked **Review needed**; the label means the Spanish token, English gloss, or contextual sense may be wrong and must not be presented as reviewed fact. Generated grammar, expression, and contextual-sense lessons still require human authoring. Occurrence cards stay separate until a reviewer confirms that two written forms genuinely have the same contextual sense. The app lazily downloads one comic bundle at a time, while a compressed catalog restores scheduling, ranking, and card history.

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
