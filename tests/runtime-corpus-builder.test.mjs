import assert from "node:assert/strict";
import test from "node:test";
import {
  assembleRuntimeCorpus,
  buildGeneratedBundle,
  normalizeAuthoredBundle,
  validateManifestShape,
  validateRuntimeBundle,
} from "../scripts/build-runtime-corpus.mjs";

const INTERNAL_QA_STATUS = "ai-authored-internal-qa";

function sourceComic(id, number) {
  return {
    id,
    number,
    publishedAt: "2026-01-01",
    title: `Source ${id}`,
    titleText: "",
    width: 100,
    height: 80,
    pageUrl: `https://es.example/${id}`,
    imageUrl: `https://es.example/images/${id}.png`,
    source: {
      originalPageUrl: `https://xkcd.com/${number}/`,
      translationPageUrl: `https://es.example/${id}`,
      translationImageUrl: `https://es.example/images/${id}.png`,
    },
  };
}

function semanticCard(id = "word-compartida", answerEn = "shared") {
  return {
    id,
    kind: "word",
    promptEs: "compartida",
    answerEn,
    noteEn: "",
    tags: ["word"],
  };
}

function comic(id, number, title, cardId = "word-compartida") {
  return {
    id,
    xkcdNumber: number,
    publishedAt: "2026-01-01",
    title,
    titleEs: title,
    image: {
      src: `/comics/${id}.png`,
      width: 100,
      height: 80,
      aspectRatio: 1.25,
      altEn: title,
    },
    source: {
      creator: "Randall Munroe",
      publisher: "xkcd",
      translationCredit: "Translator",
      licenseName: "CC BY-NC 2.5",
      licenseLabel: "CC BY-NC 2.5",
      licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/",
      attributionRequired: true,
      commercialUseAllowed: false,
      originalPageUrl: `https://xkcd.com/${number}/`,
      originalImageUrl: `https://imgs.xkcd.com/comics/${id}.png`,
      translationPageUrl: `https://es.example/${id}`,
      translationImageUrl: `https://es.example/images/${id}.png`,
    },
    titleText: { es: "", en: "" },
    regions: [
      {
        id: `${id}:region`,
        labelEs: "COMPARTIDA",
        translationEn: "Shared",
        noteEn: "",
        bounds: { x: 10, y: 10, width: 40, height: 20 },
        words: [
          {
            id: `${id}:word`,
            text: "COMPARTIDA",
            normalized: "compartida",
            bounds: [{ x: 12, y: 12, width: 20, height: 8 }],
            cardIds: [cardId],
          },
        ],
        applications: [],
        cardIds: [cardId],
      },
    ],
    cardIds: [cardId],
  };
}

function authoredBundle(id, number, answerEn = "shared") {
  const card = semanticCard("word-compartida", answerEn);
  return {
    schemaVersion: 2,
    revision: "authored-input",
    reviewStatus: INTERNAL_QA_STATUS,
    editorialStatus: "ai-authored-pending-human-review",
    qualityStatus: "internal-qa-complete",
    humanVerified: false,
    semanticQa: { status: "complete" },
    provenance: {
      method: "ai-authored-pending-human-review",
      qualityStatus: "internal-qa-complete",
      humanVerified: false,
    },
    comic: {
      ...comic(id, number, `Authored ${id}`),
      editorialStatus: "ai-authored-pending-human-review",
      qualityStatus: "internal-qa-complete",
      humanVerified: false,
    },
    cards: [
      {
        ...card,
        reviewStatus: INTERNAL_QA_STATUS,
        schedulable: true,
        provenance: {
          method: "ai-authored-pending-human-review",
          qualityStatus: "internal-qa-complete",
          humanVerified: false,
          ownerComicId: "seed-curriculum",
          contextualSenseAuthored: true,
        },
      },
    ],
  };
}

function generatedBundle(source) {
  const ocr = {
    schemaVersion: 1,
    id: source.id,
    lines: [
      {
        id: `${source.id}:line`,
        text: "FALTA",
        bounds: { x: 10, y: 10, width: 30, height: 12 },
        confidence: 0.9,
        tokenIds: [`${source.id}:token`],
      },
    ],
    tokens: [
      {
        id: `${source.id}:token`,
        lineId: `${source.id}:line`,
        text: "FALTA",
        boxes: [{ x: 12, y: 12, width: 15, height: 7 }],
        confidence: 0.9,
      },
    ],
    review: {
      status: "needs_review",
      meanTokenConfidence: 0.9,
      lowConfidenceTokenCount: 0,
    },
    ocr: { engine: "apple-vision" },
  };
  return buildGeneratedBundle(
    source,
    ocr,
    new Map([
      [
        "falta",
        {
          id: "glossary-falta",
          answerEn: "missing",
          reviewStatus: "needs-review",
          contextualSenseReviewed: false,
        },
      ],
    ]),
    null,
    "generated-fixture",
  );
}

test("runtime assembly prefers authored, then reviewed seed, then OCR fallback", () => {
  const sources = [
    sourceComic("authored", 1),
    sourceComic("seed-only", 2),
    sourceComic("ocr-only", 3),
  ];
  const authoredInput = authoredBundle("authored", 1);
  const authoredSnapshot = structuredClone(authoredInput);
  const seedShadow = comic("authored", 1, "Seed shadow");
  const seedOnly = comic("seed-only", 2, "Seed only");
  const fallback = generatedBundle(sources[2]);
  const { manifest, bundles } = assembleRuntimeCorpus({
    source: { schemaVersion: 1, comics: sources },
    authoredCompiled: {
      bundles: [{ id: "authored", bundle: authoredInput }],
    },
    reviewed: {
      comics: [seedShadow, seedOnly],
      cards: [semanticCard()],
    },
    generatedBundlesById: new Map([
      ["authored", generatedBundle(sources[0])],
      ["seed-only", generatedBundle(sources[1])],
      ["ocr-only", fallback],
    ]),
  });

  assert.deepEqual(authoredInput, authoredSnapshot, "normalization is immutable");
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.reviewStatus, "mixed");
  assert.deepEqual(manifest.counts, {
    comics: 3,
    authoredComics: 1,
    reviewedSeedComics: 1,
    needsReviewComics: 1,
    cards: 2,
    schedulableCards: 2,
    wordOccurrences: 3,
  });
  assert.deepEqual(
    manifest.comics.map((entry) => entry.provenance.sourceKind ?? "ocr-fallback"),
    ["individually-authored", "reviewed-seed", "ocr-fallback"],
  );
  assert.equal(manifest.comics[0].title, "Authored authored");
  assert.equal(manifest.comics[1].revision, "reviewed-v1");
  assert.equal(bundles[1].bundle.revision, "reviewed-v1");
  assert.equal(bundles[2].bundle, fallback);
  assert.equal(manifest.cardCatalog.filter((card) => card.id === "word-compartida").length, 1);
  assert.equal(
    manifest.cardCatalog.some((card) => /^word-auto-ocr-only-/.test(card.id)),
    true,
  );

  validateManifestShape(manifest, 3);
  for (const { entry, bundle } of bundles) {
    validateRuntimeBundle(bundle, entry);
  }
});

test("authored runtime normalization strips editorial fields and hashes effective content", () => {
  const input = authoredBundle("authored", 1);
  const first = normalizeAuthoredBundle(input);
  const repeated = normalizeAuthoredBundle(structuredClone(input));
  const changedCopy = structuredClone(input);
  changedCopy.cards[0].answerEn = "different";
  const changed = normalizeAuthoredBundle(changedCopy);

  assert.deepEqual(repeated, first);
  assert.notEqual(changed.revision, first.revision);
  assert.equal(first.schemaVersion, 3);
  assert.equal(first.reviewStatus, INTERNAL_QA_STATUS);
  assert.equal(first.comic.reviewStatus, INTERNAL_QA_STATUS);
  assert.equal(first.cards[0].reviewStatus, INTERNAL_QA_STATUS);
  assert.equal(first.cards[0].provenance.contextualSenseReviewed, true);
  const serialized = JSON.stringify(first);
  for (const field of [
    "editorialStatus",
    "qualityStatus",
    "humanVerified",
    "semanticQa",
  ]) {
    assert.equal(serialized.includes(field), false, field);
  }
  assert.equal(serialized.includes("needs-review"), false);
  assert.equal(serialized.includes("word-auto-"), false);

  const assemble = (bundle) =>
    assembleRuntimeCorpus({
      source: { schemaVersion: 1, comics: [sourceComic("authored", 1)] },
      authoredCompiled: { bundles: [{ id: "authored", bundle }] },
      reviewed: { comics: [], cards: [] },
    }).manifest.revision;
  assert.equal(assemble(input), assemble(structuredClone(input)));
  assert.notEqual(assemble(input), assemble(changedCopy));
});

test("conflicting definitions cannot share one stable runtime card ID", () => {
  assert.throws(
    () =>
      assembleRuntimeCorpus({
        source: {
          schemaVersion: 1,
          comics: [sourceComic("first", 1), sourceComic("second", 2)],
        },
        authoredCompiled: {
          bundles: [
            { id: "first", bundle: authoredBundle("first", 1, "shared") },
            { id: "second", bundle: authoredBundle("second", 2, "different") },
          ],
        },
        reviewed: { comics: [], cards: [] },
      }),
    /stable card word-compartida has conflicting runtime definitions/,
  );
});
