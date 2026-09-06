# Tira

Tira is a Spanish-learning prototype for English speakers that turns translated xkcd comics into contextual spaced-repetition sessions. You read the Spanish strip first, reveal English help only where you need it, and let the scheduler choose the next strip from the cards that matter most.

## Learning model

- Every authored Spanish word is a direct click target. Choosing a word is only navigation: it records no learning event or card timestamp.
- The sidebar then shows that word's meaning card plus any reusable expression, grammar, or necessary context cards connected to that exact occurrence.
- Reusable grammar and expression cards use plain-English questions, beginner explanations, and generic bilingual examples. A separate display-only “In this comic” note explains the current occurrence; the shared card itself remains reusable across strips.
- Loading a comic starts a pending timestamped exposure for every unique, exact stable card connected to that strip. Opening one specific card records the answer-opening timestamp for that exact card. Reopening it may preserve additional timestamps, but still counts as one help outcome for that comic exposure.
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

For each unread comic, the scheduler averages `P` over all of its unique exact stable card IDs. If `N` is the number of distinct cards, that average is the comic's priority density (`D`):

```text
D(comic) = Σ P(card) / N(comic)
```

An empty comic has density zero. The unread comic with the largest `D` is selected; comic ID is only a deterministic tie-breaker. Dividing by `N` means a longer comic does not win merely because it contains more cards: selection rewards the concentration of high-priority cards instead. This calculation runs for every Next action, not once per calendar day. Card priorities can recur through other unread comics that share those cards, but a read comic itself never returns. Corpus importance/PageRank is not part of scheduling—not even as a tie-breaker—and analytics never mutate or merge SRS history.

### Persistence and research basis

The stable authored curriculum starts with a clean timestamp history instead of aliasing provisional `word-auto-*` evidence to new contextual card IDs. Only native schema-v5 snapshots marked as complete timestamp history are restored from IndexedDB. Schema-v4 generated-runtime snapshots, schema-v3 localStorage records, and previously imported bounded histories are rejected. When an old learning history is discarded, its opened-region UI state is discarded with it so no part of the old session leaks into the fresh start. Current schema-v5 progress survives ordinary reloads.

Reviewed corrections within that authored curriculum preserve existing evidence. The retired `word-bien--so-far-so-good`, `word-bien--working-properly`, and `word-bien--well-played` IDs now become `word-bien--well` before reconciliation. Their four source comics are distinct, so joining the histories retains every display and open timestamp with one help outcome per comic exposure. The active session keeps its original timestamps and open status, and completed comics stay read. This correction does not import older scheduler schemas or merge other meanings of `bien`.

The model is a deliberately explainable adaptation rather than an implementation of any one published scheduler. Its exponential retrievability curve and history features follow [Half-Life Regression for language learning](https://aclanthology.org/P16-1174/); its use of item difficulty plus the amount, timing, and outcome of practice follows the [DASH personalized-review model](https://doi.org/10.1177/0956797613504302); and its separate stability, difficulty, and retrievability signals follow the [official FSRS algorithm description](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm).

## Comic importance

Every comic also has an informational corpus-wide score computed as **PageRank-style recursive importance**, or damped two-way comic–target centrality. This analysis is visible in the Rankings view but does not influence scheduling. One node set contains comics, the other contains connected learning targets, and an edge means that a comic uses that target. Comics raise the targets they link to, and targets raise every comic that links to them. On each iteration, 85% of influence follows these links while a 15% baseline/reset prevents disconnected components and zero-target comics from vanishing. Iteration continues until the change is below `1e-12` or 1,000 iterations have run.

The published centrality is normalized across the comic partition, so all 258 comic scores sum to 100%. Rank uses descending score with comic ID as the deterministic tie-breaker. Every graph target is the exact stable card ID used by the curriculum. Shared reusable cards therefore connect comics, while sense-specific or occurrence-specific cards stay separate. The graph is analytics-only: it never changes SRS card IDs or progress.

## Content and review status

The runtime contains all 258 entries currently listed in the Spanish xkcd archive. Individually authored artifacts are preferred for 254 entries; four checked-in seed lessons provide the remaining fallback content. The old OCR and conservative-glossary pipeline remains available as historical ingestion tooling, but none of its `word-auto-*` cards is on the published semantic path.

The catalog contains 6,466 shared cards and 14,768 printed word occurrences. The word `bien` occurs 23 times across 20 comics and has seven contextual meaning cards; its ordinary “well; properly” card is shared by four comics. In *Dibujar estrellas*, the time qualification belongs to `de momento`; the `bien` card keeps its reusable meaning and a separate occurrence note explains its use.

All published lessons and cards carry the truthful status `ai-authored-internal-qa`. Each authored comic received source, inventory, contextual-sense, reusable-copy, application-link, and geometry checks. This is not a claim of human expert verification. The `human-verified` tier is reserved for future expert review, and corrections are welcome. Repeated forms share a stable card only when their contextual meanings match; polysemous forms split by sense, while accents and conjugations remain distinct. The browser downloads a compact stable-card catalog first and then fetches one self-contained comic bundle at a time.

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

# Assemble lazy browser bundles, preferring individually authored artifacts.
node scripts/build-runtime-corpus.mjs

# Inspect shared spellings, meanings, and distinct-comic usage.
npm run corpus:audit-word-reuse -- --surface bien

# Reject new pairs with identical teaching content under different IDs.
npm run corpus:audit-word-reuse -- --check
```

The word-reuse audit is read-only. Matching spellings are candidates for semantic review, never automatic merges. Its exact-content check also runs in `npm test`; the narrowly documented baseline in `data/review/word-card-reuse-baseline.json` acknowledges the pre-existing `word-intento` / `word-intento--try` pair for a separate review. Additional duplicate pairs or IDs fail the check. Use `--json` for the complete candidate report.

`data/source` preserves archive URLs, source anomalies, translation credit, and license metadata. `data/authoring/comics` is the semantic source of truth; `data/generated` keeps the earlier OCR evidence visible for provenance and fallback ingestion. Browser files are written to `public/corpus`; their lightweight manifest and stable-card catalog load first, then a single comic bundle is fetched when selected.
