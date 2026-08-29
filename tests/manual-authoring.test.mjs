import assert from "node:assert/strict";
import test from "node:test";
import { CARDS } from "../lib/content.ts";
import {
  ManualAuthoringError,
  RUNTIME_REVIEW_STATUS,
  buildGeometryRegistry,
  compileManualAuthoringCorpus,
  searchableCardIndex,
  validateManualAuthoringCorpus,
} from "../scripts/lib/manual-authoring.mjs";

const QA = Object.freeze({
  imageTextTranscribed: true,
  contextualMeaningsChecked: true,
  cardReuseAndSenseSplitsChecked: true,
  higherLevelTargetsChecked: true,
  applicationLinksChecked: true,
  beginnerExplanationsChecked: true,
  wholeSentenceTranslationAidsAbsent: true,
});

function sourceComic(id, number) {
  return {
    id,
    number,
    title: `Título ${number}`,
    publishedAt: "2006-01-01",
    imageUrl: `https://es.xkcd.com/images/${number}_example.png`,
    width: 400,
    height: 200,
    titleText: `Texto alternativo ${number}.`,
    source: {
      originalPageUrl: `https://xkcd.com/${number}/`,
      translationPageUrl: `https://es.xkcd.com/strips/example-${number}/`,
      translationImageUrl: `https://es.xkcd.com/images/${number}_example.png`,
    },
  };
}

function geometry(comicId, offset = 0) {
  return buildGeometryRegistry(
    {
      // Deliberately wrong OCR strings demonstrate that only geometry enters
      // the authored bundle.
      lines: [
        {
          id: `${comicId}:ocr-line-1`,
          text: "LIN",
          bounds: { x: 10 + offset, y: 10, width: 15, height: 5 },
        },
        {
          id: `${comicId}:ocr-line-2`,
          text: "OCR-ERROR",
          bounds: { x: 10 + offset, y: 16, width: 25, height: 5 },
        },
      ],
      tokens: [
        {
          id: `${comicId}:ocr-token-1`,
          text: "LIN",
          boxes: [{ x: 10 + offset, y: 10, width: 8, height: 5 }],
        },
        {
          id: `${comicId}:ocr-token-2`,
          text: "OCR-ERROR",
          boxes: [{ x: 10 + offset, y: 16, width: 25, height: 5 }],
        },
      ],
    },
    undefined,
  );
}

function ownedCards() {
  return [
    {
      id: "word-llueve",
      kind: "word",
      promptEs: "llueve",
      answerEn: "it rains / it is raining",
      noteEn: "",
      tags: ["word", "weather", "A1"],
    },
    {
      id: "grammar-si-real-condition",
      kind: "grammar",
      promptEs: "si + presente → resultado",
      questionEn: "How do you say what will happen if a real possibility occurs?",
      answerEn: "Use si with an ordinary present-time verb form, then state the result.",
      noteEn:
        "Si introduces the condition. Spanish normally keeps the verb after si in its present form for a real future possibility; the result can use a future form.",
      example: {
        es: "Si hace frío, llevaré un abrigo.",
        en: "If it is cold, I will take a coat.",
      },
      tags: ["grammar", "conditions", "B1"],
    },
  ];
}

function artifact(id, number, ownsCards) {
  const regionId = `${id}:bubble-1`;
  return {
    schemaVersion: 1,
    id,
    editorialStatus: "ai-authored",
    humanVerified: false,
    semanticQa: { ...QA },
    titleEn: `English title ${number}`,
    titleEs: `Título ${number}`,
    titleText: {
      es: `Texto alternativo ${number}.`,
      en: `Alternative text ${number}.`,
    },
    cardDefinitions: ownsCards ? ownedCards() : [],
    regions: [
      {
        id: regionId,
        labelEs: "SI LLUEVE",
        // One authored bubble deliberately spans two OCR line rectangles.
        geometryRefs: [
          { source: "ocr-line", id: `${id}:ocr-line-1` },
          { source: "ocr-line", id: `${id}:ocr-line-2` },
        ],
        words: [
          {
            id: `${regionId}:word-1`,
            text: "SI",
            normalized: "si",
            geometryRefs: [
              { source: "ocr-token", id: `${id}:ocr-token-1` },
            ],
            cardIds: ["word-si", "grammar-si-real-condition"],
          },
          {
            id: `${regionId}:word-2`,
            text: "LLUEVE",
            normalized: "llueve",
            geometryRefs: [
              { source: "ocr-token", id: `${id}:ocr-token-2` },
            ],
            cardIds: ["word-llueve", "grammar-si-real-condition"],
          },
        ],
        applications: [
          {
            id: `${regionId}:application-condition-1`,
            cardId: "grammar-si-real-condition",
            participantWordIds: [
              `${regionId}:word-1`,
              `${regionId}:word-2`,
            ],
            exampleEs: "SI LLUEVE",
            explanationEn:
              "Si introduces the condition, and llueve keeps an ordinary present-time form.",
          },
        ],
      },
    ],
  };
}

function validInputs() {
  const first = artifact("comic-one", 101, true);
  const second = artifact("comic-two", 102, false);
  return {
    artifacts: [first, second],
    seedCards: CARDS,
    sourceComics: [sourceComic("comic-one", 101), sourceComic("comic-two", 102)],
    geometryByComicId: new Map([
      ["comic-one", geometry("comic-one")],
      ["comic-two", geometry("comic-two", 20)],
    ]),
  };
}

test("manual authoring compiles corrected text and multi-line geometry into lazy bundles", () => {
  const inputs = validInputs();
  assert.deepEqual(
    validateManualAuthoringCorpus(inputs),
    [],
    "the individually authored semantic source is structurally complete",
  );

  const compiled = compileManualAuthoringCorpus(inputs);
  assert.equal(compiled.comics.length, 2);
  assert.equal(compiled.bundles.length, 2);
  assert.equal(compiled.reviewStatus, RUNTIME_REVIEW_STATUS);
  assert.equal(compiled.editorialStatus, "ai-authored");
  assert.equal(compiled.qualityStatus, "internal-qa");
  assert.equal(compiled.humanVerified, false);

  const first = compiled.bundles[0].bundle;
  assert.equal(first.comic.regions[0].labelEs, "SI LLUEVE");
  assert.deepEqual(
    first.comic.regions[0].words.map((word) => word.text),
    ["SI", "LLUEVE"],
    "OCR strings do not become authored text",
  );
  assert.deepEqual(first.comic.regions[0].bounds, {
    x: 10,
    y: 10,
    width: 25,
    height: 11,
  });
  assert.equal(first.comic.regions[0].translationEn, "");
  assert.equal(first.comic.regions[0].noteEn, "");
  assert.equal(first.provenance.semanticContentGenerated, false);
  assert.equal(first.provenance.geometryOnlyFromOcr, true);
  assert.equal(first.cards.every((card) => card.schedulable), true);
  assert.equal(
    first.cards.every((card) => card.reviewStatus === RUNTIME_REVIEW_STATUS),
    true,
  );
  assert.equal(
    compiled.cardCatalog.filter((card) => card.id === "word-llueve").length,
    1,
    "a reused global card is deduplicated in the catalog",
  );
  assert.equal(
    compiled.bundles[1].bundle.cards.find((card) => card.id === "word-llueve")
      ?.provenance.ownerComicId,
    "comic-one",
    "later comics resolve the one owning definition",
  );
});

test("seed cards are directly searchable and reusable without redefinition", () => {
  const inputs = validInputs();
  const matches = searchableCardIndex(inputs.seedCards, inputs.artifacts).filter(
    (card) => card.id === "word-si" || card.id === "word-llueve",
  );
  assert.deepEqual(
    matches.map(({ id, owner }) => ({ id, owner })),
    [
      { id: "word-llueve", owner: "comic-one" },
      { id: "word-si", owner: "seed-curriculum" },
    ],
  );
});

test("bulk placeholders and false review claims are rejected", () => {
  const inputs = validInputs();
  inputs.artifacts[0].cardDefinitions[0] = {
    ...inputs.artifacts[0].cardDefinitions[0],
    id: "word-auto-comic-one-00001-deadbeef",
    answerEn: "Meaning needs review",
    reviewStatus: "reviewed",
    tags: ["machine extracted", "needs review"],
  };
  inputs.artifacts[0].regions[0].words[1].cardIds[0] =
    "word-auto-comic-one-00001-deadbeef";
  const errors = validateManualAuthoringCorpus(inputs);
  assert.ok(errors.some((error) => /stable target-specific ID/.test(error)));
  assert.ok(errors.some((error) => /bulk-draft placeholder/.test(error)));
  assert.ok(errors.some((error) => /unsupported field reviewStatus/.test(error)));
});

test("ordinary Spanish todo is not mistaken for an authoring marker", () => {
  const inputs = validInputs();
  inputs.artifacts[0].titleText.es = "Y todo el montaje queda estable.";
  inputs.artifacts[0].titleText.en = "And the entire setup remains stable.";
  inputs.sourceComics[0].titleText = "Y todo el montaje queda estable.";
  assert.deepEqual(validateManualAuthoringCorpus(inputs), []);

  inputs.artifacts[0].titleText.es = "[TODO] Add the source title text.";
  inputs.sourceComics[0].titleText = "[TODO] Add the source title text.";
  assert.ok(
    validateManualAuthoringCorpus(inputs).some((error) =>
      /bulk-draft placeholder/.test(error),
    ),
    "an explicit bracketed TODO remains invalid",
  );
});

test("every manually transcribed token needs a matching contextual word card first", () => {
  const missingOccurrence = validInputs();
  missingOccurrence.artifacts[0].regions[0].words.pop();
  assert.ok(
    validateManualAuthoringCorpus(missingOccurrence).some((error) =>
      /word occurrences for 2 printed tokens/.test(error),
    ),
  );

  const grammarFirst = validInputs();
  grammarFirst.artifacts[0].regions[0].words[0].cardIds = [
    "grammar-si-real-condition",
    "word-si",
  ];
  const errors = validateManualAuthoringCorpus(grammarFirst);
  assert.ok(errors.some((error) => /does not put a word-meaning card first/.test(error)));
  assert.ok(errors.some((error) => /links a second word-meaning card/.test(error)));
});

test("explicit exclusions preserve numbers, equations, and non-Spanish text without cards", () => {
  const inputs = validInputs();
  const region = inputs.artifacts[0].regions[0];
  region.labelEs = "SI 4 m/s^2 LLUEVE MR. MUNROE";
  region.applications[0].exampleEs = "SI 4 m/s^2 LLUEVE";
  region.excludedUnits = [
    {
      id: "comic-one:bubble-1:excluded-measurement",
      text: "4 m/s^2",
      reason: "measurement",
      rationale: "This is a numerical physics measurement, not a Spanish lexical word.",
      explicitBounds: [{ x: 40, y: 10, width: 15, height: 5 }],
      geometryRationale: "The synthetic fixture has no OCR geometry for this measurement.",
    },
    {
      id: "comic-one:bubble-1:excluded-english-name",
      text: "MR. MUNROE",
      reason: "non-spanish-text",
      rationale: "This standalone English chalkboard label is not Spanish curriculum text.",
      explicitBounds: [{ x: 56, y: 10, width: 20, height: 5 }],
      geometryRationale: "The synthetic fixture has no OCR geometry for this English label.",
    },
  ];
  assert.deepEqual(
    validateManualAuthoringCorpus(inputs),
    [],
    "an exact application fragment may span an explicitly excluded visible unit",
  );
  const compiled = compileManualAuthoringCorpus(inputs);
  const outputRegion = compiled.bundles[0].bundle.comic.regions[0];
  assert.equal(outputRegion.words.length, 2);
  assert.deepEqual(
    outputRegion.excludedUnits.map(({ text, reason }) => ({ text, reason })),
    [
      { text: "4 m/s^2", reason: "measurement" },
      { text: "MR. MUNROE", reason: "non-spanish-text" },
    ],
  );

  const unexplained = validInputs();
  unexplained.artifacts[0].regions[0].labelEs = "SI LLUEVE 40";
  assert.ok(
    validateManualAuthoringCorpus(unexplained).some((error) =>
      /word occurrences for 3 printed tokens/.test(error),
    ),
    "unlisted visible numerals cannot silently disappear from the authored audit",
  );
});

test("whole-sentence aids are structurally absent and application copy stays local", () => {
  const forbiddenField = validInputs();
  forbiddenField.artifacts[0].regions[0].translationEn = "If it rains.";
  assert.ok(
    validateManualAuthoringCorpus(forbiddenField).some((error) =>
      /unsupported field translationEn/.test(error),
    ),
  );

  const translationApplication = validInputs();
  translationApplication.artifacts[0].regions[0].applications[0].explanationEn =
    "The whole sentence translates the bubble for the learner.";
  assert.ok(
    validateManualAuthoringCorpus(translationApplication).some((error) =>
      /whole-sentence translation aid/.test(error),
    ),
  );

  const paddedFragment = validInputs();
  paddedFragment.artifacts[0].regions[0].applications[0].participantWordIds = [
    "comic-one:bubble-1:word-1",
  ];
  assert.ok(
    validateManualAuthoringCorpus(paddedFragment).some((error) =>
      /whole region instead of the smallest relevant fragment/.test(error),
    ),
  );
});

test("card ownership, reachability, and exact application reverse links are enforced", () => {
  const duplicateOwner = validInputs();
  duplicateOwner.artifacts[1].cardDefinitions = [ownedCards()[0]];
  assert.ok(
    validateManualAuthoringCorpus(duplicateOwner).some((error) =>
      /one owner is comic-one/.test(error),
    ),
  );

  const unreachable = validInputs();
  unreachable.artifacts[0].cardDefinitions.push({
    id: "word-nunca-usada",
    kind: "word",
    promptEs: "nunca",
    answerEn: "never",
    noteEn: "",
    tags: ["word"],
  });
  assert.ok(
    validateManualAuthoringCorpus(unreachable).some((error) =>
      /owns unreachable card word-nunca-usada/.test(error),
    ),
  );

  const noApplication = validInputs();
  noApplication.artifacts[0].regions[0].applications = [];
  assert.ok(
    validateManualAuthoringCorpus(noApplication).some((error) =>
      /needs exactly one reverse-linked application/.test(error),
    ),
  );
});

test("explicit geometry needs a rationale and missing geometry cannot compile", () => {
  const noRationale = validInputs();
  const word = noRationale.artifacts[0].regions[0].words[0];
  delete word.geometryRefs;
  word.explicitBounds = [{ x: 10, y: 10, width: 8, height: 5 }];
  assert.ok(
    validateManualAuthoringCorpus(noRationale).some((error) =>
      /geometryRationale must explain/.test(error),
    ),
  );

  const missingGeometry = validInputs();
  missingGeometry.artifacts[0].regions[0].words[0].geometryRefs[0].id =
    "comic-one:ocr-token-does-not-exist";
  assert.throws(
    () => compileManualAuthoringCorpus(missingGeometry),
    (error) =>
      error instanceof ManualAuthoringError &&
      /references missing geometry/.test(error.message),
  );
});

test("semantic QA and human verification claims are mandatory and honest", () => {
  const inputs = validInputs();
  inputs.artifacts[0].semanticQa.contextualMeaningsChecked = false;
  inputs.artifacts[0].humanVerified = true;
  const errors = validateManualAuthoringCorpus(inputs);
  assert.ok(errors.some((error) => /contextualMeaningsChecked must be true/.test(error)));
  assert.ok(errors.some((error) => /humanVerified must be false/.test(error)));
});
