# Individual comic authoring

`data/authoring/comics/<comic-id>.json` is the semantic source of truth for an
individually authored lesson. There is exactly one file per comic. The files
are written and checked comic by comic; they are not output from OCR,
dictionary lookup, translation, or card-generation code.

The compiler in `scripts/compile-authored-comic.mjs` is deliberately only an
assembler and validator. It copies authored semantic fields, resolves existing
rectangles, checks links, and writes self-contained lazy bundles to a staging
directory. It has no code that can invent a transcription, translation,
English gloss, card, or application.

## Status vocabulary

These lessons are authored by an AI agent and receive internal semantic QA.
They are not verified by a human or a native Spanish speaker. Every source file
therefore says:

```json
{
  "editorialStatus": "ai-authored",
  "humanVerified": false
}
```

Successful compilation adds `qualityStatus: "internal-qa"` and the runtime
status `ai-authored-internal-qa`. Product copy should render this as
**AI-authored · internal QA** and, where space permits, **Not human verified**.
Do not label this tier “reviewed,” “human-reviewed,” or “verified.”

## Source format (version 1)

The full root shape is:

```json
{
  "schemaVersion": 1,
  "id": "es-xkcd-example",
  "editorialStatus": "ai-authored",
  "humanVerified": false,
  "semanticQa": {
    "imageTextTranscribed": true,
    "contextualMeaningsChecked": true,
    "cardReuseAndSenseSplitsChecked": true,
    "higherLevelTargetsChecked": true,
    "applicationLinksChecked": true,
    "beginnerExplanationsChecked": true,
    "wholeSentenceTranslationAidsAbsent": true
  },
  "titleEn": "Authored English title",
  "titleEs": "Exact Spanish archive title",
  "titleText": {
    "es": "Exact Spanish title text from the archive.",
    "en": "An authored English translation of the title text.",
    "noteEn": "Optional title-text context, not a bubble translation."
  },
  "cardDefinitions": [],
  "regions": []
}
```

All seven semantic-QA checks must be true before compilation. They mean the
agent actually compared the image and lesson, not merely that the JSON has the
right shape.

### Regions and printed words

An authored region is a bubble, caption, sign, or other coherent printed-text
unit. It may span any number of OCR lines. It intentionally has no English
bubble/sentence translation field.

```json
{
  "id": "es-xkcd-example:bubble-1",
  "labelEs": "UN MOMENTO",
  "geometryRefs": [
    { "source": "ocr-line", "id": "es-xkcd-example:ocr-line-0001" },
    { "source": "ocr-line", "id": "es-xkcd-example:ocr-line-0002" }
  ],
  "words": [
    {
      "id": "es-xkcd-example:bubble-1:word-1",
      "text": "UN",
      "normalized": "un",
      "geometryRefs": [
        { "source": "ocr-token", "id": "es-xkcd-example:ocr-token-00001" }
      ],
      "cardIds": ["word-un"]
    },
    {
      "id": "es-xkcd-example:bubble-1:word-2",
      "text": "MOMENTO",
      "normalized": "momento",
      "geometryRefs": [
        { "source": "ocr-token", "id": "es-xkcd-example:ocr-token-00002" }
      ],
      "cardIds": ["word-momento"]
    }
  ],
  "applications": []
}
```

`labelEs` and `words` are manual transcriptions. The compiler verifies that
the word records cover those printed tokens exactly and in order. It does not
compare them to OCR text. This is intentional: an OCR token that says `LIN`
can provide the rectangle for a manually transcribed `UN` without importing
the OCR error into the curriculum.

Allowed geometry references are:

- regions: `ocr-line` or `override-line`;
- words: `ocr-token` or `override-token`.

OCR contributes only the referenced percentage rectangles. Its recognized
text, confidence, provisional dictionary answer, and generated card ID are
discarded. A word may cite multiple tokens for visibly split glyphs. A region
may cite multiple lines to form a bubble/panel-level unit.

If existing checked geometry cannot represent a printed unit, replace
`geometryRefs` with `explicitBounds` and a specific rationale of at least 20
characters:

```json
{
  "explicitBounds": [
    { "x": 10.1, "y": 20.2, "width": 8.3, "height": 3.4 }
  ],
  "geometryRationale": "Vision fused these two printed words into one box."
}
```

The fallback is for geometry only. It is not permission to skip the visual
transcription or semantic pass.

### Stable card definitions and ownership

`cardDefinitions` contains every new shared card first introduced by this
comic. A card ID has exactly one owner:

- the existing six-comic `CARDS` registry owns all seed IDs;
- otherwise, the first authored comic that introduces a target owns its one
  definition;
- later comics reference that stable ID in `word.cardIds` and do not duplicate
  its definition.

Definitions use the core `LearningCard` fields only. Status and provenance are
compiler-owned metadata, so authors cannot accidentally claim human review.

```json
{
  "id": "grammar-hacer-si-condition",
  "kind": "grammar",
  "promptEs": "si + presente → resultado",
  "questionEn": "How do you talk about what will happen if a real possibility occurs?",
  "answerEn": "Use si with an ordinary present-time verb form, then state the result.",
  "noteEn": "Si introduces the condition. Spanish normally keeps the verb after si in its present form for a real future possibility; the result can use a future form.",
  "example": {
    "es": "Si llueve, iremos en autobús.",
    "en": "If it rains, we will go by bus."
  },
  "tags": ["grammar", "conditions", "B1"]
}
```

Before defining a card, search the seed registry and any earlier authored
files:

```bash
node scripts/compile-authored-comic.mjs --find-card "si + presente"
node scripts/compile-authored-comic.mjs --find-card "word-un"
```

The command reports each match's ID, kind, prompt, answer, and owner. It does
not suggest, merge, or generate semantic content. If the same written word has
a genuinely different contextual sense, define a target-specific stable ID
such as `word-banco--financial-institution`; do not silently reuse or overwrite
an earlier sense.

Every printed word's first `cardIds` entry must be its contextual word card.
Grammar, expression, and concept IDs follow it. A newly owned definition that
is never linked from a printed word is rejected as unreachable.

### Occurrence applications

Every grammar or expression link has exactly one reverse-linked application
for that occurrence. The application names every and only the participating
word IDs, uses the smallest contiguous Spanish fragment that contains them,
and explains how the reusable lesson applies without translating the bubble.

```json
{
  "id": "es-xkcd-example:bubble-2:app-condition-1",
  "cardId": "grammar-hacer-si-condition",
  "participantWordIds": [
    "es-xkcd-example:bubble-2:word-1",
    "es-xkcd-example:bubble-2:word-3"
  ],
  "exampleEs": "si llueve",
  "explanationEn": "Si introduces the condition, and llueve keeps its ordinary present-time form."
}
```

The participants must link the same card after their first word-meaning card.
The validator rejects missing applications, orphan applications, duplicate
participant sets, whole-region examples padded with unrelated words, and
unknown word/card IDs. A contextual word application is allowed only for its
single exact occurrence. Concept cards are linked to their exact participating
words but do not masquerade as reusable language applications.

## Validation and staging compilation

Validate every checked-in authored file:

```bash
node scripts/compile-authored-comic.mjs --validate-only
```

Write self-contained lazy bundles to a non-public staging directory:

```bash
node scripts/compile-authored-comic.mjs \
  --output-dir /tmp/tira-authored-staging
```

The output has a compact `manifest-fragment.json` and one
`comics/<comic-id>.json` bundle per authored comic. Each bundle contains only
that comic, the exact geometry/links, and the global cards it uses. Shared cards
are duplicated as immutable runtime copy in the relevant bundles and
deduplicated by ID in the catalog. This preserves the app's lazy loading model.
The compiler refuses to write into `public/corpus`; publishing is a separate,
explicit migration step.

Validation rejects, among other failures:

- `word-auto-*`, machine/dictionary tags, “Meaning needs review,” and other
  bulk-draft placeholders;
- a missing contextual word card, a non-word first card, or a surface-form
  mismatch;
- untranscribed printed tokens and duplicate word geometry;
- sentence/bubble English translation fields and translation-like application
  copy;
- incomplete beginner-facing grammar/expression cards or comic-derived
  reusable examples;
- duplicate card owners, unknown references, unreachable definitions, and
  application/link asymmetry;
- missing semantic-QA checks or any claim of human verification.

Structural validation cannot decide whether a translation is true, a sense is
correct, a pattern is genuinely reusable, or all visual text was noticed. That
is the reason each comic must receive the individual semantic pass and explicit
QA checklist.

## Runtime migration plan

Publishing should happen only after the authored files and architecture are
accepted:

1. Teach the runtime corpus assembler to prefer an authored bundle for a comic
   ID and use the provisional OCR bundle only when no authored file exists.
2. Expand the runtime status union and UI copy to
   `ai-authored-internal-qa`; relabel the six seed lessons the same way. Reserve
   a future `human-verified` tier for actual expert review.
3. Merge the authored manifest fragment with the archive manifest, then
   recompute informational importance over the resulting stable cards. Keep
   importance separate from SRS selection.
4. Keep the browser manifest/catalog compact and the per-comic files lazy. Do
   not import all authored geometry into the application bundle.
5. Bump the corpus revision and reconcile persisted curriculum IDs. Remove all
   obsolete `word-auto-*` IDs from active scheduling/history; never alias their
   provisional history to a shared authored sense. Retain history only for
   exact stable IDs that still exist, or start the new authored curriculum with
   fresh history as already requested.
6. Validate the fully assembled 258-comic corpus, then run typecheck, lint,
   tests, and a production build before replacing `public/corpus`.

The provisional glossary and OCR-card generator can remain as historical
ingestion tools, but neither is on the semantic path once all 252 authored
files exist.
