# Lazy corpus contract

The browser first requests `/corpus/manifest.json`. If that file is absent or
invalid, Tira continues with the six reviewed comics from `lib/content.ts`.
Reviewed entries always override generated entries with the same comic ID.

The generated manifest stays compact when transferred (about 273 KB gzipped).
Each comic's `cardIds` is its complete **schedulable** index for the SRS overlap
algorithm. `cardCatalog` contains compact copy for those schedulable generated
cards so the My cards drawer can restore history without fetching every old
comic bundle. Regions, word bounds, preview-only cards, and explanations stay
in per-comic files.

```json
{
  "schemaVersion": 1,
  "revision": "2026-08-29.1",
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
`cards` must define every referenced ID. A bundle may additionally contain
preview-only cards with `schedulable: false`; these remain clickable through a
word occurrence but never enter the comic index, completion grades, or SRS.

```json
{
  "schemaVersion": 1,
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
