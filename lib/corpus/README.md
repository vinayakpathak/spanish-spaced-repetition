# Lazy corpus contract

The browser first requests `/corpus/manifest.json`. If that file is absent or
invalid, Tira continues with the six reviewed comics from `lib/content.ts`.
Reviewed entries always override generated entries with the same comic ID,
while retaining the generated manifest's full-corpus importance score. The
merge requires exact reviewed `cardIds` and analytics-target parity; a stale or
mismatched manifest is rejected and the app uses its degraded fallback.

Each comic's `cardIds` is its complete **schedulable** index for the SRS overlap
algorithm. Every clickable generated word has one exact ID in that index,
including cards whose English meaning still needs human review. `cardCatalog`
contains compact copy for all generated cards so the My cards drawer can
restore history without fetching every old comic bundle. Regions, word bounds,
and explanations stay in per-comic files.

`importanceTargetIds` is a separate, analytics-only graph index. Every
schedulable word card maps provisionally to a normalized Spanish-prompt and
English-answer signature; grammar, phrase, and concept cards map to their
encoded stable card ID. Targets are deduplicated within each comic. This makes
cross-comic centrality useful before contextual review is complete, but the
signatures must never be used as SRS IDs or as evidence that two contextual
word cards have been reviewed and merged.

```json
{
  "schemaVersion": 2,
  "revision": "2026-08-29.1",
  "importanceModel": {
    "algorithm": "damped-bipartite-centrality-v1",
    "normalization": "comic-sum-1",
    "identityPolicy": "provisional-word-signature-v1",
    "edgePolicy": "one-per-comic-per-target",
    "cardScope": "schedulable-only",
    "includesSchedulableOnly": true,
    "reviewStatus": "provisional-context-unreviewed",
    "provisional": true,
    "contextualSensesReviewed": false,
    "damping": 0.85,
    "tolerance": 1e-12,
    "maxIterations": 1000,
    "iterations": 13,
    "converged": true,
    "nodeCount": 5211,
    "comicNodeCount": 258,
    "cardNodeCount": 4953,
    "edgeCount": 11758
  },
  "comics": [
    {
      "id": "es-xkcd-pong",
      "loadKey": "es-xkcd-pong.2026-08-29.1",
      "revision": "2026-08-29.1",
      "xkcdNumber": 117,
      "publishedAt": "2006-06-19",
      "title": "Pong",
      "titleEs": "Pong",
      "imageSrc": "/corpus/images/es-xkcd-pong.png",
      "cardIds": ["word-pong"],
      "importanceTargetIds": ["word:pong|pong"],
      "importance": {
        "score": 0.0004,
        "rank": 200,
        "percentile": 0.2257,
        "cardCount": 1,
        "sharedCardCount": 0
      },
      "reviewStatus": "needs-review"
    }
  ],
  "cardCatalog": [
    {
      "id": "word-pong",
      "kind": "word",
      "promptEs": "pong",
      "answerEn": "Pong",
      "noteEn": "",
      "tags": ["word", "machine extracted", "needs review"],
      "reviewStatus": "needs-review",
      "schedulable": true
    }
  ]
}
```

Selecting an unloaded entry requests
`/corpus/comics/{loadKey}.json?v={revision}`. The file must be self-contained:
`comic.cardIds` must equal the manifest entry's schedulable `cardIds`, and
`cards` must define every referenced ID. Generated bundles do not have a
preview-only tier: even a card whose `answerEn` is `Meaning needs review` has
`reviewStatus: needs-review`, `schedulable: true`, and participates in exact
display/open history. This does not claim that its contextual sense was
reviewed or invent an English translation.

```json
{
  "schemaVersion": 2,
  "revision": "2026-08-29.1",
  "comic": {
    "id": "es-xkcd-pong",
    "xkcdNumber": 117,
    "publishedAt": "2006-06-19",
    "title": "Pong",
    "titleEs": "Pong",
    "image": {
      "src": "/corpus/images/es-xkcd-pong.png",
      "width": 640,
      "height": 534,
      "aspectRatio": 1.1985,
      "altEn": "Spanish translation of xkcd 117, Pong"
    },
    "source": {
      "creator": "Randall Munroe",
      "publisher": "xkcd",
      "originalPageUrl": "https://xkcd.com/117/",
      "originalImageUrl": "https://imgs.xkcd.com/comics/pong.png",
      "translationPageUrl": "https://es.xkcd.com/strips/pong/",
      "translationImageUrl": "https://es.xkcd.com/images/117_pong.png",
      "translationCredit": "Gabriel Rodríguez Alberich",
      "licenseName": "Creative Commons Attribution-NonCommercial 2.5 Generic",
      "licenseLabel": "CC BY-NC 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-nc/2.5/",
      "attributionRequired": true,
      "commercialUseAllowed": false
    },
    "titleText": { "es": "…", "en": "…" },
    "regions": [],
    "cardIds": ["word-pong"]
  },
  "cards": [
    {
      "id": "word-pong",
      "kind": "word",
      "promptEs": "pong",
      "answerEn": "Pong",
      "noteEn": "",
      "tags": ["word", "machine extracted", "needs review"],
      "reviewStatus": "needs-review",
      "schedulable": true,
      "provenance": { "contextualSenseReviewed": false }
    }
  ]
}
```

Nested objects must use the complete `Comic` and `LearningCard` shapes exported
by `lib/content.ts`. Generated files are fetched
at runtime and must not be imported into the JavaScript bundle.
