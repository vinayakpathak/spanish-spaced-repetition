# Lazy runtime corpus contract

The browser first requests `/corpus/manifest.json`. The schema-v3 manifest is
compact: it contains the complete 258-comic scheduler index, one deduplicated
copy of every stable schedulable card, and informational graph scores. Regions,
applications, and word geometry remain in one lazy file per comic.

`scripts/build-runtime-corpus.mjs` selects content in this order:

1. an individually authored artifact in `data/authoring/comics`;
2. a checked-in seed lesson from `lib/content.ts`;
3. provisional OCR only when neither stable source exists.

The migrated 258-comic build uses 254 authored artifacts and four seed-only
fallbacks, so no provisional OCR card is published. The two seed IDs that also
have authored artifacts (`correlation` and `tech-support`) use their authored
versions. All 258 comics are written as self-contained lazy bundles.

## Status and provenance

Published comics, bundles, entries, and cards currently use
`reviewStatus: "ai-authored-internal-qa"`. This records the completed internal
source, semantic, application, and geometry checks without claiming human
expert verification. `human-verified` is reserved for future expert review;
`needs-review` remains available only for an OCR fallback build.

Cards carry `provenance.contextualSenseReviewed`; comics and bundles carry the
plural `contextualSensesReviewed`. These are `true` for internal-QA content and
`false` for provisional OCR. Runtime JSON must not leak authoring-only workflow
fields such as `editorialStatus`, `qualityStatus`, `humanVerified`, `semanticQa`,
or authoring geometry rationales.

## Manifest

Each comic's `cardIds` is its complete de-duplicated schedulable SRS index.
`cardCatalog` is the de-duplicated union of those stable IDs, so scheduling and
the card library can initialize without fetching every comic. Repeated card IDs
must have byte-equivalent definitions.

The current catalog has 6,465 cards. The three former ordinary `bien` IDs are
consolidated into seed-owned `word-bien--well`, used in four comics; the other
six `bien` senses remain separate. Native complete schema-v5 histories migrate
those reviewed IDs before curriculum reconciliation, including active-session
card/open summaries. This is separate from the analytics namespace below.

`importanceTargetIds` is a separate analytics namespace. Every schedulable
card maps reversibly to `card:${encodeURIComponent(card.id)}`. One comic has at
most one edge to a target. This lets shared stable cards connect comics without
inventing aliases or changing SRS history.

```json
{
  "schemaVersion": 3,
  "revision": "runtime-…",
  "importanceModel": {
    "algorithm": "damped-bipartite-centrality-v1",
    "normalization": "comic-sum-1",
    "identityPolicy": "stable-card-id-v1",
    "edgePolicy": "one-per-comic-per-target",
    "cardScope": "schedulable-only",
    "includesSchedulableOnly": true,
    "reviewStatus": "ai-authored-internal-qa",
    "provisional": false,
    "contextualSensesReviewed": true
  },
  "comics": [
    {
      "id": "es-xkcd-pong",
      "loadKey": "es-xkcd-pong",
      "revision": "runtime-…",
      "xkcdNumber": 117,
      "publishedAt": "2006-06-19",
      "title": "Pong",
      "titleEs": "Pong",
      "imageSrc": "/corpus/images/es-xkcd-pong.png",
      "cardIds": ["word-pong"],
      "importanceTargetIds": ["card:word-pong"],
      "importance": {
        "score": 0.0004,
        "rank": 200,
        "percentile": 0.2257,
        "cardCount": 1,
        "sharedCardCount": 0
      },
      "reviewStatus": "ai-authored-internal-qa"
    }
  ],
  "cardCatalog": [
    {
      "id": "word-pong",
      "kind": "word",
      "promptEs": "pong",
      "answerEn": "Pong",
      "noteEn": "…",
      "tags": ["word"],
      "reviewStatus": "ai-authored-internal-qa",
      "schedulable": true,
      "provenance": { "contextualSenseReviewed": true }
    }
  ]
}
```

The manifest parser checks normalized scores/ranks, graph counts, target syntax,
the full stable-card catalog, and explicit status/provenance. Analytics IDs are
never accepted as scheduler IDs.

## Lazy bundles and seed fallback

Selecting an unloaded entry requests
`/corpus/comics/{loadKey}.json?v={revision}`. A bundle repeats schema, revision,
and status, then provides one complete `Comic` and every referenced
`LearningCard`. `comic.cardIds` must equal the manifest entry's `cardIds`; every
word's first card must be a contextual word card, and every linked ID must be
defined by the bundle.

```json
{
  "schemaVersion": 3,
  "revision": "runtime-…",
  "reviewStatus": "ai-authored-internal-qa",
  "provenance": {
    "method": "ai-authored-internal-qa",
    "contextualSensesReviewed": true
  },
  "comic": {
    "id": "es-xkcd-pong",
    "reviewStatus": "ai-authored-internal-qa",
    "provenance": { "contextualSensesReviewed": true },
    "regions": [],
    "cardIds": ["word-pong"]
  },
  "cards": []
}
```

If the remote manifest is unavailable or invalid, the app uses the six
checked-in seed lessons in memory and disables persistence for that reduced
session. In a valid full manifest, a local seed adapter is used only when its
`loadKey`, `revision`, `cardIds`, and `importanceTargetIds` exactly match the
remote entry. That leaves authored versions free to supersede seed IDs while
preserving an offline fallback for the four seed-only lessons.

Runtime files are fetched dynamically and must not be imported into the
JavaScript application bundle.
