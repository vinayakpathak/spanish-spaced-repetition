#!/usr/bin/env node

/**
 * Assemble the lazy runtime corpus consumed by lib/corpus/load.ts.
 *
 * An individually authored artifact is authoritative whenever one exists.
 * The small reviewed seed curriculum is the next fallback, and provisional
 * OCR is used only when neither authored source is available. This keeps the
 * migration reversible without letting machine-extracted cards replace the
 * completed curriculum.
 *
 * Typical full build:
 *
 *   node scripts/build-runtime-corpus.mjs \
 *     --source data/source/es-xkcd.json \
 *     --ocr-dir data/generated/ocr \
 *     --glossary data/generated/provisional-glossary.json \
 *     --overrides data/review/ocr-overrides.json \
 *     --output-dir public/corpus
 *
 * Every selected comic is serialized as its own lazy bundle, including the
 * seed lessons. The manifest carries a deduplicated stable-card catalog for
 * scheduling and a separate analytics target namespace for graph importance.
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rankComicsByCardGraph } from "../lib/comic-importance.ts";
import {
  IMPORTANCE_TARGET_CARD_SCOPE,
  IMPORTANCE_TARGET_EDGE_POLICY,
  IMPORTANCE_TARGET_IDENTITY_POLICY,
  IMPORTANCE_TARGET_REVIEW_STATUS,
  importanceTargetIdsForCards,
  isImportanceTargetId,
} from "../lib/importance-target.ts";
import {
  geometryForArtifacts,
  readAuthoringFiles,
} from "./compile-authored-comic.mjs";
import { compileManualAuthoringCorpus } from "./lib/manual-authoring.mjs";

const INPUT_SCHEMA_VERSION = 1;
const RUNTIME_SCHEMA_VERSION = 3;
const COMPILER_REVISION = "runtime-corpus-v6-authored-migration";
const INTERNAL_QA_STATUS = IMPORTANCE_TARGET_REVIEW_STATUS;
const NEEDS_REVIEW_STATUS = "needs-review";
const DEFAULT_EXPECTED_COUNT = 258;
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULTS = {
  sourcePath: path.join(PROJECT_ROOT, "data/source/es-xkcd.json"),
  authoringDir: path.join(PROJECT_ROOT, "data/authoring/comics"),
  ocrDir: path.join(PROJECT_ROOT, "data/generated/ocr"),
  glossaryPath: path.join(
    PROJECT_ROOT,
    "data/generated/provisional-glossary.json",
  ),
  overridesPath: path.join(PROJECT_ROOT, "data/review/ocr-overrides.json"),
  outputDir: path.join(PROJECT_ROOT, "public/corpus"),
  expectedCount: DEFAULT_EXPECTED_COUNT,
};

const LICENSE = {
  creator: "Randall Munroe",
  publisher: "xkcd",
  translationCredit: "Gabriel Rodríguez Alberich",
  licenseName: "Creative Commons Attribution-NonCommercial 2.5 Generic",
  licenseLabel: "CC BY-NC 2.5",
  licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/",
  attributionRequired: true,
  commercialUseAllowed: false,
};

function fail(message) {
  throw new Error(message);
}

function usage() {
  return `usage: build-runtime-corpus.mjs [options]

options:
  --source FILE            Spanish archive source manifest
                           (default: data/source/es-xkcd.json)
  --authoring-dir DIR      individually authored comic artifacts
                           (default: data/authoring/comics)
  --ocr-dir DIR            OCR corpus containing corpus-index.json
                           (default: data/generated/ocr)
  --glossary FILE          provisional surface-form glossary
                           (default: data/generated/provisional-glossary.json)
  --overrides FILE         manually checked OCR additions
                           (default: data/review/ocr-overrides.json)
  --output-dir DIR         lazy runtime JSON destination
                           (default: public/corpus)
  --expected-count N       require exactly N source comics (default: 258)
  --validate-only          validate an existing --output-dir
  --help                   show this help`;
}

function parseArguments(argv) {
  const options = { ...DEFAULTS, validateOnly: false };
  const paths = new Map([
    ["--source", "sourcePath"],
    ["--authoring-dir", "authoringDir"],
    ["--ocr-dir", "ocrDir"],
    ["--glossary", "glossaryPath"],
    ["--overrides", "overridesPath"],
    ["--output-dir", "outputDir"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (paths.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${argument} requires a value`);
      options[paths.get(argument)] = path.resolve(value);
      index += 1;
    } else if (argument === "--expected-count") {
      const value = Number(argv[index + 1]);
      if (!Number.isSafeInteger(value) || value < 1) {
        fail("--expected-count must be a positive integer");
      }
      options.expectedCount = value;
      index += 1;
    } else if (argument === "--validate-only") {
      options.validateOnly = true;
    } else if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      fail(`unknown argument: ${argument}\n\n${usage()}`);
    }
  }

  return options;
}

async function readJSON(filePath) {
  let source;
  try {
    source = await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`could not read ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`invalid JSON in ${filePath}: ${error.message}`);
  }
}

function stableJSON(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function atomicWriteJSON(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await fs.writeFile(temporaryPath, stableJSON(value));
  await fs.rename(temporaryPath, filePath);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeSurface(value) {
  return value.normalize("NFC").toLocaleLowerCase("es");
}

function hasLatinLetter(value) {
  return [...value].some(
    (character) =>
      /\p{Letter}/u.test(character) && /\p{Script=Latin}/u.test(character),
  );
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function scoreManifestEntries(entries) {
  const fullyReviewed = entries.every(
    (entry) => entry.reviewStatus === INTERNAL_QA_STATUS,
  );
  const result = rankComicsByCardGraph(
    entries.map(({ id, importanceTargetIds }) => ({
      id,
      cardIds: importanceTargetIds,
    })),
  );
  if (!result.converged) {
    fail(
      `comic importance did not converge after ${result.maxIterations} iterations`,
    );
  }
  const importanceByComicId = new Map(
    result.comics.map(({ comicId, ...importance }) => [comicId, importance]),
  );
  const comics = entries.map((entry) => {
    const importance = importanceByComicId.get(entry.id);
    if (!importance) fail(`comic importance is missing ${entry.id}`);
    return { ...entry, importance };
  });
  return {
    comics,
    importanceModel: {
      algorithm: result.algorithm,
      normalization: result.normalization,
      identityPolicy: IMPORTANCE_TARGET_IDENTITY_POLICY,
      edgePolicy: IMPORTANCE_TARGET_EDGE_POLICY,
      cardScope: IMPORTANCE_TARGET_CARD_SCOPE,
      includesSchedulableOnly: true,
      reviewStatus: fullyReviewed ? IMPORTANCE_TARGET_REVIEW_STATUS : "mixed",
      provisional: !fullyReviewed,
      contextualSensesReviewed: fullyReviewed,
      damping: result.damping,
      tolerance: result.tolerance,
      maxIterations: result.maxIterations,
      iterations: result.iterations,
      converged: result.converged,
      nodeCount: result.nodeCount,
      comicNodeCount: result.comicNodeCount,
      cardNodeCount: result.cardNodeCount,
      edgeCount: result.edgeCount,
    },
  };
}

function sameFields(actual, expected, fields) {
  return (
    isRecord(actual) &&
    isRecord(expected) &&
    fields.every((field) => Object.is(actual[field], expected[field]))
  );
}

function validateBounds(bounds, label) {
  if (!isRecord(bounds)) fail(`${label} must be an object`);
  for (const key of ["x", "y", "width", "height"]) {
    if (typeof bounds[key] !== "number" || !Number.isFinite(bounds[key])) {
      fail(`${label}.${key} must be finite`);
    }
    if (bounds[key] < 0 || bounds[key] > 100) {
      fail(`${label}.${key} must be between 0 and 100`);
    }
  }
  if (bounds.width <= 0 || bounds.height <= 0) {
    fail(`${label} must have positive size`);
  }
  if (
    bounds.x + bounds.width > 100.0001 ||
    bounds.y + bounds.height > 100.0001
  ) {
    fail(`${label} extends outside the image`);
  }
}

function validateSourceManifest(value, expectedCount) {
  if (!isRecord(value) || value.schemaVersion !== INPUT_SCHEMA_VERSION) {
    fail("source manifest has an unsupported schema");
  }
  if (!Array.isArray(value.comics) || value.comics.length !== expectedCount) {
    fail(
      `source manifest must contain exactly ${expectedCount} comics (found ${value.comics?.length ?? 0})`,
    );
  }
  const ids = new Set();
  const comics = value.comics.map((comic, index) => {
    if (!isRecord(comic)) fail(`source comic ${index} must be an object`);
    const id = requireString(comic.id, `source comic ${index}.id`);
    if (ids.has(id)) fail(`duplicate source comic ID: ${id}`);
    ids.add(id);
    if (!Number.isSafeInteger(comic.number) || comic.number < 1) {
      fail(`${id}.number must be a positive integer`);
    }
    if (!Number.isSafeInteger(comic.width) || comic.width < 1) {
      fail(`${id}.width must be a positive integer`);
    }
    if (!Number.isSafeInteger(comic.height) || comic.height < 1) {
      fail(`${id}.height must be a positive integer`);
    }
    requireString(comic.title, `${id}.title`);
    requireString(comic.publishedAt, `${id}.publishedAt`);
    requireString(comic.pageUrl, `${id}.pageUrl`);
    requireString(comic.imageUrl, `${id}.imageUrl`);
    if (!isRecord(comic.source)) fail(`${id}.source must be an object`);
    requireString(comic.source.originalPageUrl, `${id}.source.originalPageUrl`);
    requireString(
      comic.source.translationPageUrl,
      `${id}.source.translationPageUrl`,
    );
    requireString(
      comic.source.translationImageUrl,
      `${id}.source.translationImageUrl`,
    );
    return comic;
  });
  return { ...value, comics };
}

function validateOCRIndex(value) {
  if (!isRecord(value) || value.schemaVersion !== INPUT_SCHEMA_VERSION) {
    fail("OCR corpus index has an unsupported schema");
  }
  if (!Array.isArray(value.comics)) fail("OCR corpus index needs comics[]");
  const byId = new Map();
  for (const [index, entry] of value.comics.entries()) {
    if (!isRecord(entry)) fail(`OCR index entry ${index} must be an object`);
    const id = requireString(entry.id, `OCR index entry ${index}.id`);
    if (byId.has(id)) fail(`duplicate OCR index comic ID: ${id}`);
    const file = requireString(entry.file, `${id}.file`);
    if (path.isAbsolute(file) || file.split(/[\\/]/).includes("..")) {
      fail(`${id}.file must remain within the OCR directory`);
    }
    byId.set(id, { ...entry, file });
  }
  return byId;
}

function validateGlossary(value) {
  if (!isRecord(value) || value.schemaVersion !== INPUT_SCHEMA_VERSION) {
    fail("provisional glossary has an unsupported schema");
  }
  if (!Array.isArray(value.records)) fail("provisional glossary needs records[]");
  const bySurface = new Map();
  for (const [index, record] of value.records.entries()) {
    if (!isRecord(record)) fail(`glossary record ${index} must be an object`);
    const surface = normalizeSurface(
      requireString(record.surface, `glossary record ${index}.surface`),
    );
    if (surface !== record.surface) {
      fail(`glossary surface is not NFC/lowercase normalized: ${record.surface}`);
    }
    if (bySurface.has(surface)) fail(`duplicate glossary surface: ${surface}`);
    requireString(record.id, `${surface}.id`);
    if (record.answerEn !== null && typeof record.answerEn !== "string") {
      fail(`${surface}.answerEn must be a string or null`);
    }
    if (typeof record.answerEn === "string" && record.answerEn.trim() === "") {
      fail(`${surface}.answerEn must not be empty`);
    }
    if (
      record.reviewStatus !== "reviewed" &&
      record.reviewStatus !== "needs-review"
    ) {
      fail(`${surface}.reviewStatus is invalid`);
    }
    if (record.contextualSenseReviewed !== false) {
      fail(`${surface}.contextualSenseReviewed must remain false`);
    }
    bySurface.set(surface, record);
  }
  return bySurface;
}

function validateOverrides(value) {
  if (!isRecord(value) || value.schemaVersion !== INPUT_SCHEMA_VERSION) {
    fail("OCR overrides have an unsupported schema");
  }
  if (!Array.isArray(value.comics)) fail("OCR overrides need comics[]");
  const byComicId = new Map();
  for (const [comicIndex, comic] of value.comics.entries()) {
    if (!isRecord(comic)) fail(`override comic ${comicIndex} must be an object`);
    const id = requireString(comic.id, `override comic ${comicIndex}.id`);
    if (byComicId.has(id)) fail(`duplicate override comic ID: ${id}`);
    if (!Array.isArray(comic.lines) || comic.lines.length === 0) {
      fail(`${id} override needs at least one line`);
    }
    const lineIds = new Set();
    const tokenIds = new Set();
    const lines = comic.lines.map((line, lineIndex) => {
      if (!isRecord(line)) fail(`${id} override line ${lineIndex} must be an object`);
      const lineId = requireString(line.id, `${id} override line ${lineIndex}.id`);
      if (lineIds.has(lineId)) fail(`${id} duplicate override line ID ${lineId}`);
      lineIds.add(lineId);
      const text = requireString(line.text, `${id} override line ${lineId}.text`);
      validateBounds(line.bounds, `${id} override line ${lineId}.bounds`);
      if (!Array.isArray(line.tokens) || line.tokens.length === 0) {
        fail(`${id} override line ${lineId} needs tokens[]`);
      }
      const tokens = line.tokens.map((token, tokenIndex) => {
        if (!isRecord(token)) {
          fail(`${id} override token ${lineId}:${tokenIndex} must be an object`);
        }
        const tokenId = requireString(
          token.id,
          `${id} override token ${lineId}:${tokenIndex}.id`,
        );
        if (tokenIds.has(tokenId)) fail(`${id} duplicate override token ID ${tokenId}`);
        tokenIds.add(tokenId);
        const tokenText = requireString(token.text, `${id} override token ${tokenId}.text`);
        if (!hasLatinLetter(tokenText)) {
          fail(`${id} override token ${tokenId} needs a Latin-script letter`);
        }
        const answerEn = requireString(
          token.answerEn,
          `${id} override token ${tokenId}.answerEn`,
        );
        if (!Array.isArray(token.bounds) || token.bounds.length === 0) {
          fail(`${id} override token ${tokenId} needs bounds[]`);
        }
        token.bounds.forEach((bounds, boundsIndex) =>
          validateBounds(
            bounds,
            `${id} override token ${tokenId}.bounds[${boundsIndex}]`,
          ),
        );
        return { ...token, id: tokenId, text: tokenText, answerEn };
      });
      return { ...line, id: lineId, text, tokens };
    });
    byComicId.set(id, {
      ...comic,
      id,
      reason: requireString(comic.reason, `${id}.reason`),
      lines,
    });
  }
  return byComicId;
}

function validateOCRComic(value, expectedId) {
  if (!isRecord(value) || value.schemaVersion !== INPUT_SCHEMA_VERSION) {
    fail(`${expectedId} OCR file has an unsupported schema`);
  }
  if (value.id !== expectedId) fail(`${expectedId} OCR file ID mismatch`);
  if (!Array.isArray(value.lines) || !Array.isArray(value.tokens)) {
    fail(`${expectedId} OCR file needs lines[] and tokens[]`);
  }
  if (value.review?.status !== "needs_review") {
    fail(`${expectedId} generated OCR must remain needs_review`);
  }
  if (value.ocr?.engine !== "apple-vision") {
    fail(`${expectedId} OCR provenance is missing`);
  }

  const lineIds = new Set();
  for (const [index, line] of value.lines.entries()) {
    if (!isRecord(line)) fail(`${expectedId} line ${index} must be an object`);
    const id = requireString(line.id, `${expectedId} line ${index}.id`);
    if (lineIds.has(id)) fail(`${expectedId} has duplicate line ID ${id}`);
    lineIds.add(id);
    requireString(line.text, `${expectedId} line ${index}.text`);
    validateBounds(line.bounds, `${expectedId} line ${index}.bounds`);
    if (!Array.isArray(line.tokenIds)) {
      fail(`${expectedId} line ${index}.tokenIds must be an array`);
    }
  }

  const tokenIds = new Set();
  for (const [index, token] of value.tokens.entries()) {
    if (!isRecord(token)) fail(`${expectedId} token ${index} must be an object`);
    const id = requireString(token.id, `${expectedId} token ${index}.id`);
    if (tokenIds.has(id)) fail(`${expectedId} has duplicate token ID ${id}`);
    tokenIds.add(id);
    requireString(token.text, `${expectedId} token ${index}.text`);
    if (!lineIds.has(token.lineId)) {
      fail(`${expectedId} token ${id} references unknown line ${token.lineId}`);
    }
    if (!Array.isArray(token.boxes) || token.boxes.length === 0) {
      fail(`${expectedId} token ${id} needs at least one box`);
    }
    token.boxes.forEach((bounds, boxIndex) =>
      validateBounds(bounds, `${expectedId} token ${id}.boxes[${boxIndex}]`),
    );
    if (
      typeof token.confidence !== "number" ||
      token.confidence < 0 ||
      token.confidence > 1
    ) {
      fail(`${expectedId} token ${id} confidence is invalid`);
    }
  }

  const referencedTokens = value.lines.flatMap((line) => line.tokenIds);
  if (
    referencedTokens.length !== tokenIds.size ||
    new Set(referencedTokens).size !== tokenIds.size ||
    referencedTokens.some((id) => !tokenIds.has(id))
  ) {
    fail(`${expectedId} line/token index is inconsistent`);
  }
  return value;
}

function inferredOriginalImageURL(sourceComic) {
  const translatedName = path.posix.basename(
    new URL(sourceComic.imageUrl).pathname,
  );
  const originalName = translatedName.replace(/^\d+_/, "");
  return `https://imgs.xkcd.com/comics/${originalName}`;
}

function generatedCardId(comicId, token, tokenOrder) {
  const order = String(tokenOrder + 1).padStart(5, "0");
  const suffix = hash(`${token.id}\0${normalizeSurface(token.text)}`).slice(0, 8);
  return `word-auto-${comicId}-${order}-${suffix}`;
}

function sourceObject(sourceComic) {
  return {
    ...LICENSE,
    originalPageUrl: sourceComic.source.originalPageUrl,
    originalImageUrl: inferredOriginalImageURL(sourceComic),
    translationPageUrl: sourceComic.source.translationPageUrl,
    translationImageUrl: sourceComic.source.translationImageUrl,
  };
}

function buildGeneratedBundle(
  sourceComic,
  ocrComic,
  glossaryBySurface,
  override,
  revision,
) {
  const ocrTokens = ocrComic.tokens.filter((token) => hasLatinLetter(token.text));
  const eligibleOCRTokenIds = new Set(ocrTokens.map((token) => token.id));
  const effectiveLines = ocrComic.lines
    .map((line) => ({
      ...line,
      method: "apple-vision-ocr-line",
      tokenIds: line.tokenIds.filter((tokenId) => eligibleOCRTokenIds.has(tokenId)),
    }))
    .filter((line) => line.tokenIds.length > 0);
  const effectiveTokens = ocrTokens.map((token) => ({
    ...token,
    method: "apple-vision-ocr-and-provisional-dictionary",
    manualAnswerEn: null,
  }));

  for (const overrideLine of override?.lines ?? []) {
    const lineId = `${sourceComic.id}:override-line:${overrideLine.id}`;
    const tokenIds = [];
    for (const overrideToken of overrideLine.tokens) {
      const tokenId = `${sourceComic.id}:override-token:${overrideToken.id}`;
      tokenIds.push(tokenId);
      effectiveTokens.push({
        id: tokenId,
        lineId,
        text: overrideToken.text,
        boxes: overrideToken.bounds,
        confidence: 1,
        method: "manual-ocr-override",
        manualAnswerEn: overrideToken.answerEn,
      });
    }
    effectiveLines.push({
      id: lineId,
      text: overrideLine.text,
      bounds: overrideLine.bounds,
      confidence: 1,
      tokenIds,
      method: "manual-ocr-override",
    });
  }

  const tokensById = new Map(effectiveTokens.map((token) => [token.id, token]));
  const cards = [];
  const wordByTokenId = new Map();

  for (const [tokenOrder, token] of effectiveTokens.entries()) {
    const normalized = normalizeSurface(token.text);
    const glossary = glossaryBySurface.get(normalized);
    if (!glossary && !token.manualAnswerEn) {
      fail(`${sourceComic.id} token “${token.text}” is missing from the glossary`);
    }
    const cardId = generatedCardId(sourceComic.id, token, tokenOrder);
    const answer =
      token.manualAnswerEn ?? glossary?.answerEn?.trim() ?? "Meaning needs review";
    const card = {
      id: cardId,
      kind: "word",
      promptEs: normalized,
      answerEn: answer,
      noteEn: "",
      tags: ["word", "machine extracted", "needs review"],
      reviewStatus: "needs-review",
      // Every clickable word participates in exact-card scheduling. An
      // unresolved answer stays visibly provisional instead of disappearing
      // from the learning history, so the learner can flag it for review.
      schedulable: true,
      provenance: {
        method: token.method,
        sourceTokenId: token.id,
        sourceLineId: token.lineId,
        ocrConfidence: rounded(token.confidence),
        glossaryRecordId: glossary?.id ?? null,
        glossaryReviewStatus: glossary?.reviewStatus ?? null,
        manualOverrideReason: token.manualAnswerEn ? override.reason : null,
        contextualSenseReviewed: false,
      },
    };
    cards.push(card);
    wordByTokenId.set(token.id, {
      id: `${sourceComic.id}:word-${String(tokenOrder + 1).padStart(5, "0")}`,
      text: token.text,
      normalized,
      bounds: token.boxes,
      cardIds: [cardId],
    });
  }

  const regions = effectiveLines.map((line, lineOrder) => {
    const words = line.tokenIds.map((tokenId) => {
      if (!tokensById.has(tokenId) || !wordByTokenId.has(tokenId)) {
        fail(`${sourceComic.id} line ${line.id} references unknown token ${tokenId}`);
      }
      return wordByTokenId.get(tokenId);
    });
    return {
      id: `${sourceComic.id}:region-${String(lineOrder + 1).padStart(4, "0")}`,
      labelEs: line.text,
      translationEn: "",
      noteEn: "",
      bounds: line.bounds,
      words,
      applications: [],
      cardIds: words.map((word) => word.cardIds[0]),
      reviewStatus: "needs-review",
      provenance: {
        method: line.method,
        sourceLineId: line.id,
        ocrConfidence: rounded(line.confidence),
      },
    };
  });

  // A textless comic still needs one region for progress and keyboard
  // navigation. It intentionally has no word card because OCR observed no
  // printed Spanish word.
  if (regions.length === 0) {
    regions.push({
      id: `${sourceComic.id}:region-0001`,
      labelEs: "",
      translationEn: "",
      noteEn: "",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      words: [],
      applications: [],
      cardIds: [],
      reviewStatus: "needs-review",
      provenance: {
        method: "apple-vision-ocr-full-image-fallback",
        sourceLineId: null,
        ocrConfidence: 0,
      },
    });
  }

  // Region, comic, and manifest indexes all contain the same exact generated
  // word-card IDs. Cards without a provisional gloss remain marked
  // `needs-review`, but they still participate in scheduling.
  const cardIds = cards.map((card) => card.id);
  const comic = {
    id: sourceComic.id,
    xkcdNumber: sourceComic.number,
    publishedAt: sourceComic.publishedAt,
    // The Spanish archive does not provide the original English title. Keep
    // the available title verbatim rather than inventing a translation.
    title: sourceComic.title,
    titleEs: sourceComic.title,
    image: {
      src: sourceComic.imageUrl,
      width: sourceComic.width,
      height: sourceComic.height,
      aspectRatio: rounded(sourceComic.width / sourceComic.height),
      altEn: `Spanish-language xkcd comic #${sourceComic.number}: ${sourceComic.title}`,
    },
    source: sourceObject(sourceComic),
    titleText: {
      es: typeof sourceComic.titleText === "string" ? sourceComic.titleText : "",
      en: "English title text pending review.",
    },
    regions,
    cardIds,
    reviewStatus: "needs-review",
    provenance: {
      method: "apple-vision-ocr-and-provisional-dictionary",
      ocrReviewStatus: ocrComic.review.status,
      meanTokenConfidence: ocrComic.review.meanTokenConfidence,
      lowConfidenceTokenCount: ocrComic.review.lowConfidenceTokenCount,
      rawOcrTokenCount: ocrComic.tokens.length,
      filteredNonLatinTokenCount: ocrComic.tokens.length - ocrTokens.length,
      manualOverrideTokenCount: effectiveTokens.length - ocrTokens.length,
      contextualSensesReviewed: false,
      englishTitleAvailable: false,
    },
  };

  return {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    revision,
    reviewStatus: "needs-review",
    provenance: comic.provenance,
    comic,
    cards,
  };
}

function generatedManifestEntry(sourceComic, bundle, revision) {
  return {
    id: sourceComic.id,
    loadKey: sourceComic.id,
    revision,
    xkcdNumber: sourceComic.number,
    publishedAt: sourceComic.publishedAt,
    title: sourceComic.title,
    titleEs: sourceComic.title,
    imageSrc: sourceComic.imageUrl,
    cardIds: bundle.comic.cardIds,
    importanceTargetIds: importanceTargetIdsForCards(bundle.cards),
    reviewStatus: "needs-review",
    provenance: {
      method: "apple-vision-ocr-and-provisional-dictionary",
      contextualSensesReviewed: false,
    },
  };
}

function reviewedCardForRuntime(card) {
  const provenance = card.provenance;
  const definition = { ...card };
  for (const field of [
    "editorialStatus",
    "humanVerified",
    "provenance",
    "qualityStatus",
    "reviewStatus",
    "schedulable",
  ]) {
    delete definition[field];
  }
  return {
    ...definition,
    reviewStatus: INTERNAL_QA_STATUS,
    schedulable: true,
    provenance: {
      method: INTERNAL_QA_STATUS,
      ownerComicId: provenance?.ownerComicId ?? "seed-curriculum",
      contextualSenseReviewed: true,
    },
  };
}

function reviewedComicForRuntime(comic) {
  const content = { ...comic };
  for (const field of [
    "editorialStatus",
    "humanVerified",
    "provenance",
    "qualityStatus",
    "reviewStatus",
    "semanticQa",
  ]) {
    delete content[field];
  }
  return {
    ...content,
    reviewStatus: INTERNAL_QA_STATUS,
    provenance: {
      method: INTERNAL_QA_STATUS,
      contextualSensesReviewed: true,
    },
  };
}

function runtimeBundleRevision(kind, comic, cards) {
  return `runtime-${hash(
    stableJSON({
      compilerRevision: COMPILER_REVISION,
      kind,
      comic,
      cards,
    }),
  ).slice(0, 16)}`;
}

function normalizeReviewedBundle(bundle, kind, fixedRevision = null) {
  if (!isRecord(bundle) || !isRecord(bundle.comic) || !Array.isArray(bundle.cards)) {
    fail(`${kind} bundle is invalid`);
  }
  const comic = reviewedComicForRuntime(bundle.comic);
  const cards = bundle.cards.map(reviewedCardForRuntime);
  const revision = fixedRevision ?? runtimeBundleRevision(kind, comic, cards);
  return {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    revision,
    reviewStatus: INTERNAL_QA_STATUS,
    provenance: {
      method: INTERNAL_QA_STATUS,
      sourceKind: kind,
      contextualSensesReviewed: true,
    },
    comic,
    cards,
  };
}

function seedBundle(seedComic, seedCardCatalog) {
  const cardIds = new Set(seedComic.cardIds);
  const cards = seedCardCatalog.filter((card) => cardIds.has(card.id));
  if (cards.length !== cardIds.size) {
    const present = new Set(cards.map((card) => card.id));
    const missing = [...cardIds].filter((cardId) => !present.has(cardId));
    fail(`${seedComic.id} seed bundle is missing cards: ${missing.join(", ")}`);
  }
  return normalizeReviewedBundle(
    {
      comic: seedComic,
      cards,
    },
    "reviewed-seed",
    "reviewed-v1",
  );
}

function normalizeAuthoredBundle(bundle) {
  return normalizeReviewedBundle(bundle, "individually-authored");
}

function normalizeSeedBundle(seedComic, seedCardCatalog) {
  return seedBundle(seedComic, seedCardCatalog);
}

function reviewedManifestEntry(sourceComic, bundle, sourceKind) {
  return {
    id: sourceComic.id,
    loadKey: sourceComic.id,
    revision: bundle.revision,
    xkcdNumber: bundle.comic.xkcdNumber,
    publishedAt: bundle.comic.publishedAt,
    title: bundle.comic.title,
    titleEs: bundle.comic.titleEs,
    imageSrc: bundle.comic.image.src,
    cardIds: [...bundle.comic.cardIds],
    importanceTargetIds: importanceTargetIdsForCards(bundle.cards),
    reviewStatus: INTERNAL_QA_STATUS,
    provenance: {
      method: INTERNAL_QA_STATUS,
      sourceKind,
      contextualSensesReviewed: true,
    },
  };
}

function cardCatalogForBundles(bundles) {
  const byId = new Map();
  for (const { bundle } of bundles) {
    for (const card of bundle.cards) {
      if (!card.schedulable) continue;
      const existing = byId.get(card.id);
      if (existing && stableJSON(existing) !== stableJSON(card)) {
        fail(`stable card ${card.id} has conflicting runtime definitions`);
      }
      byId.set(card.id, existing ?? card);
    }
  }
  return [...byId.values()].sort((first, second) =>
    first.id.localeCompare(second.id, "en"),
  );
}

function validateRuntimeCard(card, label, expectedStatus = null) {
  if (!isRecord(card)) fail(`${label} must be an object`);
  requireString(card.id, `${label}.id`);
  if (!["word", "grammar", "phrase", "concept"].includes(card.kind)) {
    fail(`${label}.kind is invalid`);
  }
  requireString(card.promptEs, `${label}.promptEs`);
  requireString(card.answerEn, `${label}.answerEn`);
  if (typeof card.noteEn !== "string") fail(`${label}.noteEn must be a string`);
  if (
    !Array.isArray(card.tags) ||
    card.tags.some((tag) => typeof tag !== "string" || tag.trim() === "")
  ) {
    fail(`${label}.tags must contain strings`);
  }
  if (![INTERNAL_QA_STATUS, NEEDS_REVIEW_STATUS].includes(card.reviewStatus)) {
    fail(`${label}.reviewStatus is invalid`);
  }
  if (expectedStatus && card.reviewStatus !== expectedStatus) {
    fail(`${label}.reviewStatus must be ${expectedStatus}`);
  }
  if (typeof card.schedulable !== "boolean") {
    fail(`${label}.schedulable must be a boolean`);
  }
  if (!card.schedulable) {
    fail(`${label} must be schedulable even when its answer needs review`);
  }
  const expectedContextualReview = card.reviewStatus === INTERNAL_QA_STATUS;
  if (
    card.provenance?.contextualSenseReviewed !== expectedContextualReview
  ) {
    fail(
      `${label}.provenance.contextualSenseReviewed must be ${expectedContextualReview}`,
    );
  }
  if (
    card.reviewStatus === INTERNAL_QA_STATUS &&
    card.id.startsWith("word-auto-")
  ) {
    fail(`${label} retains a provisional word-auto ID`);
  }
}

function equalStringSets(first, second) {
  return (
    new Set(first).size === new Set(second).size &&
    first.every((value) => second.includes(value))
  );
}

function validateRuntimeBundle(bundle, entry) {
  if (!isRecord(bundle) || bundle.schemaVersion !== RUNTIME_SCHEMA_VERSION) {
    fail(`${entry.id} bundle has an unsupported schema`);
  }
  if (bundle.revision !== entry.revision) {
    fail(`${entry.id} bundle revision does not match its manifest entry`);
  }
  if (bundle.reviewStatus !== entry.reviewStatus) {
    fail(`${entry.id} bundle reviewStatus does not match its manifest entry`);
  }
  if (!isRecord(bundle.comic) || bundle.comic.id !== entry.id) {
    fail(`${entry.id} bundle comic ID mismatch`);
  }
  if (!Array.isArray(bundle.cards) || !Array.isArray(bundle.comic.cardIds)) {
    fail(`${entry.id} bundle cards/cardIds are invalid`);
  }
  if (!equalStringSets(bundle.comic.cardIds, entry.cardIds)) {
    fail(`${entry.id} bundle card index does not match its manifest entry`);
  }

  const cards = new Map();
  for (const [index, card] of bundle.cards.entries()) {
    validateRuntimeCard(
      card,
      `${entry.id}.cards[${index}]`,
      entry.reviewStatus,
    );
    if (cards.has(card.id)) fail(`${entry.id} has duplicate card ID ${card.id}`);
    cards.set(card.id, card);
  }
  for (const cardId of entry.cardIds) {
    const card = cards.get(cardId);
    if (!card) fail(`${entry.id} bundle is missing scheduled card ${cardId}`);
    if (!card.schedulable) fail(`${entry.id} indexes unschedulable card ${cardId}`);
  }
  const schedulableCardIds = bundle.cards
    .filter((card) => card.schedulable)
    .map((card) => card.id);
  if (!equalStringSets(schedulableCardIds, entry.cardIds)) {
    fail(`${entry.id} scheduler index does not match its schedulable cards`);
  }
  if (bundle.comic.reviewStatus !== entry.reviewStatus) {
    fail(`${entry.id} comic reviewStatus does not match its manifest entry`);
  }
  if (!Array.isArray(bundle.comic.regions) || bundle.comic.regions.length < 1) {
    fail(`${entry.id} needs at least one reveal region`);
  }

  const occurrenceIds = new Set();
  let occurrenceCount = 0;
  for (const [regionIndex, region] of bundle.comic.regions.entries()) {
    if (!isRecord(region) || !Array.isArray(region.words)) {
      fail(`${entry.id} region ${regionIndex} is invalid`);
    }
    if (
      typeof region.translationEn !== "string" ||
      typeof region.noteEn !== "string"
    ) {
      fail(`${entry.id} region ${regionIndex} teaching copy must be strings`);
    }
    if (!Array.isArray(region.applications)) {
      fail(`${entry.id} region ${regionIndex}.applications must be an array`);
    }
    validateBounds(region.bounds, `${entry.id} region ${regionIndex}.bounds`);
    const regionWordIds = new Set(region.words.map((word) => word.id));
    for (const [applicationIndex, application] of region.applications.entries()) {
      if (!isRecord(application)) {
        fail(`${entry.id} application ${regionIndex}:${applicationIndex} is invalid`);
      }
      requireString(
        application.id,
        `${entry.id} application ${regionIndex}:${applicationIndex}.id`,
      );
      if (!cards.has(application.cardId)) {
        fail(`${entry.id} application ${application.id} references an unknown card`);
      }
      if (
        !Array.isArray(application.participantWordIds) ||
        application.participantWordIds.length === 0 ||
        application.participantWordIds.some((wordId) => !regionWordIds.has(wordId))
      ) {
        fail(`${entry.id} application ${application.id} has invalid participants`);
      }
      requireString(application.exampleEs, `${entry.id} application ${application.id}.exampleEs`);
      requireString(
        application.explanationEn,
        `${entry.id} application ${application.id}.explanationEn`,
      );
    }
    for (const [wordIndex, word] of region.words.entries()) {
      occurrenceCount += 1;
      if (!isRecord(word)) fail(`${entry.id} word ${wordIndex} is invalid`);
      if (occurrenceIds.has(word.id)) {
        fail(`${entry.id} has duplicate word occurrence ID ${word.id}`);
      }
      occurrenceIds.add(word.id);
      requireString(word.text, `${entry.id} word ${wordIndex}.text`);
      if (
        entry.reviewStatus === NEEDS_REVIEW_STATUS &&
        !hasLatinLetter(word.text)
      ) {
        fail(`${entry.id} word ${word.id} lacks a Latin-script letter`);
      }
      const normalized = requireString(
        word.normalized,
        `${entry.id} word ${wordIndex}.normalized`,
      );
      if (normalized !== normalizeSurface(word.text)) {
        fail(`${entry.id} word ${word.id} normalization mismatch`);
      }
      if (!Array.isArray(word.bounds) || word.bounds.length < 1) {
        fail(`${entry.id} word ${word.id} needs clickable bounds`);
      }
      word.bounds.forEach((bounds, boundsIndex) =>
        validateBounds(bounds, `${entry.id} word ${word.id}.bounds[${boundsIndex}]`),
      );
      if (!Array.isArray(word.cardIds) || word.cardIds.length < 1) {
        fail(`${entry.id} word ${word.id} needs a first word card`);
      }
      const firstCard = cards.get(word.cardIds[0]);
      if (!firstCard || firstCard.kind !== "word") {
        fail(`${entry.id} word ${word.id} does not link a word card first`);
      }
      if (firstCard.promptEs !== normalized) {
        fail(`${entry.id} word ${word.id} and card prompt do not match`);
      }
      for (const cardId of word.cardIds) {
        if (!cards.has(cardId)) {
          fail(`${entry.id} word ${word.id} references unknown card ${cardId}`);
        }
      }
    }
    if (
      !Array.isArray(region.cardIds) ||
      !equalStringSets(
        region.cardIds,
        region.words.flatMap((word) => word.cardIds),
      )
    ) {
      fail(`${entry.id} region ${region.id} card index is inconsistent`);
    }
  }

  if (entry.reviewStatus === NEEDS_REVIEW_STATUS) {
    for (const region of bundle.comic.regions) {
      if (region.translationEn !== "" || region.noteEn !== "") {
        fail(`${entry.id} generated regions must not reveal sentence translations`);
      }
      if (region.applications.length !== 0) {
        fail(`${entry.id} generated regions must not invent card applications`);
      }
      if (region.words.some((word) => word.cardIds.length !== 1)) {
        fail(`${entry.id} generated words need exactly one provisional card`);
      }
    }
    if (occurrenceCount !== bundle.cards.length) {
      fail(`${entry.id} must have one provisional card per OCR word occurrence`);
    }
  } else {
    if (
      bundle.provenance?.contextualSensesReviewed !== true ||
      bundle.comic.provenance?.contextualSensesReviewed !== true
    ) {
      fail(`${entry.id} reviewed provenance is incomplete`);
    }
    const serialized = stableJSON(bundle);
    for (const forbidden of [
      "editorialStatus",
      "qualityStatus",
      "humanVerified",
      "semanticQa",
    ]) {
      if (serialized.includes(`"${forbidden}"`)) {
        fail(`${entry.id} serializes authoring-only field ${forbidden}`);
      }
    }
  }
  return { occurrenceCount, schedulableCardCount: schedulableCardIds.length };
}

function validateGeneratedBundle(bundle, entry) {
  if (entry.reviewStatus !== NEEDS_REVIEW_STATUS) {
    fail(`${entry.id} is not a generated needs-review entry`);
  }
  return validateRuntimeBundle(bundle, entry);
}

function validateManifestShape(manifest, expectedCount) {
  if (!isRecord(manifest) || manifest.schemaVersion !== RUNTIME_SCHEMA_VERSION) {
    fail("runtime manifest has an unsupported schema");
  }
  requireString(manifest.revision, "runtime manifest.revision");
  if (!Array.isArray(manifest.comics) || manifest.comics.length !== expectedCount) {
    fail(
      `runtime manifest must contain ${expectedCount} comics (found ${manifest.comics?.length ?? 0})`,
    );
  }
  const ids = new Set();
  const loadKeys = new Set();
  for (const [index, entry] of manifest.comics.entries()) {
    if (!isRecord(entry)) fail(`runtime manifest entry ${index} is invalid`);
    const id = requireString(entry.id, `runtime manifest entry ${index}.id`);
    const loadKey = requireString(entry.loadKey, `${id}.loadKey`);
    if (ids.has(id)) fail(`runtime manifest has duplicate comic ID ${id}`);
    if (loadKeys.has(loadKey)) fail(`runtime manifest has duplicate loadKey ${loadKey}`);
    ids.add(id);
    loadKeys.add(loadKey);
    if (!Number.isSafeInteger(entry.xkcdNumber) || entry.xkcdNumber < 1) {
      fail(`${id}.xkcdNumber is invalid`);
    }
    if (!Array.isArray(entry.cardIds)) fail(`${id}.cardIds must be an array`);
    if (new Set(entry.cardIds).size !== entry.cardIds.length) {
      fail(`${id}.cardIds contains duplicates`);
    }
    if (
      !Array.isArray(entry.importanceTargetIds) ||
      entry.importanceTargetIds.some((targetId) => !isImportanceTargetId(targetId))
    ) {
      fail(`${id}.importanceTargetIds is invalid`);
    }
    if (
      new Set(entry.importanceTargetIds).size !==
      entry.importanceTargetIds.length
    ) {
      fail(`${id}.importanceTargetIds contains duplicates`);
    }
    if (
      entry.importanceTargetIds.some(
        (targetId, targetIndex) =>
          targetIndex > 0 &&
          entry.importanceTargetIds[targetIndex - 1] >= targetId,
      )
    ) {
      fail(`${id}.importanceTargetIds must be sorted`);
    }
    if (
      entry.reviewStatus !== INTERNAL_QA_STATUS &&
      entry.reviewStatus !== NEEDS_REVIEW_STATUS
    ) {
      fail(`${id}.reviewStatus is invalid`);
    }
    const expectedTargetsFromCards = entry.cardIds
      .map((cardId) => `card:${encodeURIComponent(cardId)}`)
      .sort((first, second) => first.localeCompare(second, "en"));
    if (!equalStringSets(entry.importanceTargetIds, expectedTargetsFromCards)) {
      fail(`${id}.importanceTargetIds does not match exact scheduled cards`);
    }
  }
  const expectedImportance = scoreManifestEntries(manifest.comics);
  if (
    !sameFields(
      manifest.importanceModel,
      expectedImportance.importanceModel,
      [
        "algorithm",
        "normalization",
        "identityPolicy",
        "edgePolicy",
        "cardScope",
        "includesSchedulableOnly",
        "reviewStatus",
        "provisional",
        "contextualSensesReviewed",
        "damping",
        "tolerance",
        "maxIterations",
        "iterations",
        "converged",
        "nodeCount",
        "comicNodeCount",
        "cardNodeCount",
        "edgeCount",
      ],
    )
  ) {
    fail("runtime manifest importanceModel does not match the comic-card graph");
  }
  const expectedImportanceById = new Map(
    expectedImportance.comics.map((entry) => [entry.id, entry.importance]),
  );
  for (const entry of manifest.comics) {
    if (
      !sameFields(entry.importance, expectedImportanceById.get(entry.id), [
        "score",
        "rank",
        "percentile",
        "cardCount",
        "sharedCardCount",
      ])
    ) {
      fail(`${entry.id}.importance does not match the comic-card graph`);
    }
  }
  if (!Array.isArray(manifest.cardCatalog)) {
    fail("runtime manifest needs cardCatalog[]");
  }
  const catalogIds = new Set();
  for (const [index, card] of manifest.cardCatalog.entries()) {
    validateRuntimeCard(card, `runtime manifest.cardCatalog[${index}]`);
    if (!card.schedulable) {
      fail(`runtime card catalog contains unschedulable card ${card.id}`);
    }
    if (catalogIds.has(card.id)) {
      fail(`runtime card catalog contains duplicate card ${card.id}`);
    }
    catalogIds.add(card.id);
  }
  const schedulerIds = [
    ...new Set(manifest.comics.flatMap((entry) => entry.cardIds)),
  ];
  if (!equalStringSets([...catalogIds], schedulerIds)) {
    fail("runtime card catalog does not match scheduler indexes");
  }
  const fullyReviewed = manifest.comics.every(
    (entry) => entry.reviewStatus === INTERNAL_QA_STATUS,
  );
  const expectedManifestStatus = fullyReviewed ? INTERNAL_QA_STATUS : "mixed";
  if (manifest.reviewStatus !== expectedManifestStatus) {
    fail(`runtime manifest.reviewStatus must be ${expectedManifestStatus}`);
  }
  if (
    manifest.provenance?.contextualSensesReviewed !== fullyReviewed ||
    manifest.importanceModel.provisional === fullyReviewed ||
    manifest.importanceModel.contextualSensesReviewed !== fullyReviewed
  ) {
    fail("runtime manifest review provenance is inconsistent");
  }
  if (fullyReviewed) {
    const serialized = stableJSON(manifest);
    if (serialized.includes("word-auto-") || serialized.includes("needs-review")) {
      fail("reviewed runtime manifest retains provisional identifiers or status");
    }
    for (const forbidden of [
      "editorialStatus",
      "qualityStatus",
      "humanVerified",
    ]) {
      if (serialized.includes(`"${forbidden}"`)) {
        fail(`runtime manifest serializes authoring-only field ${forbidden}`);
      }
    }
  }
  // Duplicate original xkcd numbers are intentionally allowed. The Spanish
  // archive contains four such number groups, while its comic IDs stay unique.
  return manifest;
}

async function reviewedCorpus() {
  const moduleURL = pathToFileURL(
    path.join(PROJECT_ROOT, "lib/content.ts"),
  ).href;
  const content = await import(moduleURL);
  return {
    comics: content.COMICS,
    cards: content.CARDS,
  };
}

function assembleRuntimeCorpus({
  source,
  authoredCompiled,
  reviewed,
  generatedBundlesById = new Map(),
  buildProvenance = {},
}) {
  if (!isRecord(source) || !Array.isArray(source.comics)) {
    fail("runtime assembly needs a validated source manifest");
  }
  if (!isRecord(authoredCompiled) || !Array.isArray(authoredCompiled.bundles)) {
    fail("runtime assembly needs a compiled authored corpus");
  }
  if (!isRecord(reviewed) || !Array.isArray(reviewed.comics) || !Array.isArray(reviewed.cards)) {
    fail("runtime assembly needs the reviewed seed corpus");
  }
  if (!(generatedBundlesById instanceof Map)) {
    fail("generatedBundlesById must be a Map");
  }

  const authoredById = new Map();
  for (const item of authoredCompiled.bundles) {
    if (!isRecord(item) || typeof item.id !== "string") {
      fail("compiled authored bundle entry is invalid");
    }
    if (authoredById.has(item.id)) {
      fail(`compiled authored corpus repeats ${item.id}`);
    }
    authoredById.set(
      item.id,
      normalizeAuthoredBundle(item.bundle),
    );
  }
  const reviewedById = new Map(reviewed.comics.map((comic) => [comic.id, comic]));
  const bundles = [];
  const manifestEntries = [];
  let authoredComicCount = 0;
  let reviewedSeedComicCount = 0;
  let generatedComicCount = 0;

  for (const sourceComic of source.comics) {
    let bundle;
    let entry;
    if (authoredById.has(sourceComic.id)) {
      authoredComicCount += 1;
      bundle = authoredById.get(sourceComic.id);
      entry = reviewedManifestEntry(
        sourceComic,
        bundle,
        "individually-authored",
      );
    } else if (reviewedById.has(sourceComic.id)) {
      reviewedSeedComicCount += 1;
      bundle = normalizeSeedBundle(reviewedById.get(sourceComic.id), reviewed.cards);
      entry = reviewedManifestEntry(sourceComic, bundle, "reviewed-seed");
    } else {
      generatedComicCount += 1;
      bundle = generatedBundlesById.get(sourceComic.id);
      if (!bundle) {
        fail(`${sourceComic.id} has no authored, reviewed-seed, or OCR bundle`);
      }
      entry = generatedManifestEntry(sourceComic, bundle, bundle.revision);
    }
    bundles.push({ entry, bundle });
    manifestEntries.push(entry);
  }

  const sourceIds = new Set(source.comics.map((comic) => comic.id));
  for (const authoredId of authoredById.keys()) {
    if (!sourceIds.has(authoredId)) {
      fail(`authored comic ${authoredId} is absent from the source manifest`);
    }
  }
  const cardCatalog = cardCatalogForBundles(bundles);
  const { comics, importanceModel } = scoreManifestEntries(manifestEntries);
  const fullyReviewed = generatedComicCount === 0;
  const wordOccurrences = bundles.reduce(
    (sum, { bundle }) =>
      sum + bundle.comic.regions.reduce((subtotal, region) => subtotal + region.words.length, 0),
    0,
  );
  const revision = `runtime-${hash(
    stableJSON({
      compilerRevision: COMPILER_REVISION,
      bundles: bundles.map(({ entry, bundle }) => ({
        id: entry.id,
        revision: bundle.revision,
        contentHash: hash(stableJSON(bundle)),
      })),
      catalogCardIds: cardCatalog.map((card) => card.id),
    }),
  ).slice(0, 16)}`;
  const manifest = {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    revision,
    importanceModel,
    reviewStatus: fullyReviewed ? INTERNAL_QA_STATUS : "mixed",
    counts: {
      comics: comics.length,
      authoredComics: authoredComicCount,
      reviewedSeedComics: reviewedSeedComicCount,
      needsReviewComics: generatedComicCount,
      cards: cardCatalog.length,
      schedulableCards: cardCatalog.length,
      wordOccurrences,
    },
    provenance: {
      ...buildProvenance,
      method: fullyReviewed ? INTERNAL_QA_STATUS : "mixed-runtime-assembly",
      reviewStatus: fullyReviewed ? INTERNAL_QA_STATUS : "mixed",
      compilerRevision: COMPILER_REVISION,
      contextualSensesReviewed: fullyReviewed,
    },
    cardCatalog,
    comics,
  };
  return { manifest, bundles };
}

async function validateOutput(outputDir, expectedCount) {
  const manifest = validateManifestShape(
    await readJSON(path.join(outputDir, "manifest.json")),
    expectedCount,
  );
  const catalogById = new Map(
    manifest.cardCatalog.map((card) => [card.id, card]),
  );
  const globalCardsById = new Map();
  let authoredComicCount = 0;
  let reviewedSeedComicCount = 0;
  let generatedComicCount = 0;
  let wordOccurrenceCount = 0;

  for (const entry of manifest.comics) {
    const filePath = path.join(outputDir, "comics", `${entry.loadKey}.json`);
    const bundle = await readJSON(filePath);
    const { occurrenceCount } = validateRuntimeBundle(
      bundle,
      entry,
    );
    if (
      !equalStringSets(
        importanceTargetIdsForCards(bundle.cards),
        entry.importanceTargetIds,
      )
    ) {
      fail(`${entry.id} importance target index is inconsistent`);
    }
    wordOccurrenceCount += occurrenceCount;
    if (entry.reviewStatus === NEEDS_REVIEW_STATUS) {
      generatedComicCount += 1;
    } else if (entry.provenance?.sourceKind === "individually-authored") {
      authoredComicCount += 1;
    } else if (entry.provenance?.sourceKind === "reviewed-seed") {
      reviewedSeedComicCount += 1;
      if (entry.revision !== "reviewed-v1") {
        fail(`${entry.id} reviewed seed revision must remain reviewed-v1`);
      }
    } else {
      fail(`${entry.id} has unknown reviewed source provenance`);
    }
    for (const card of bundle.cards) {
      const existing = globalCardsById.get(card.id);
      if (existing && stableJSON(existing) !== stableJSON(card)) {
        fail(`stable card ${card.id} differs between runtime bundles`);
      }
      globalCardsById.set(card.id, existing ?? card);
      if (card.schedulable) {
        const catalogCard = catalogById.get(card.id);
        if (!catalogCard || JSON.stringify(catalogCard) !== JSON.stringify(card)) {
          fail(`runtime card catalog copy does not match bundle card ${card.id}`);
        }
      }
    }
  }

  if (expectedCount === DEFAULT_EXPECTED_COUNT && generatedComicCount !== 0) {
    fail(`full runtime corpus must not contain OCR fallback bundles`);
  }
  const expectedCounts = {
    comics: manifest.comics.length,
    authoredComics: authoredComicCount,
    reviewedSeedComics: reviewedSeedComicCount,
    needsReviewComics: generatedComicCount,
    cards: manifest.cardCatalog.length,
    schedulableCards: manifest.cardCatalog.length,
    wordOccurrences: wordOccurrenceCount,
  };
  if (stableJSON(manifest.counts) !== stableJSON(expectedCounts)) {
    fail(`runtime manifest counts do not match lazy bundles`);
  }
  process.stdout.write(
    `Validated ${manifest.comics.length} runtime comics (${authoredComicCount} authored, ${reviewedSeedComicCount} reviewed seed, ${generatedComicCount} OCR fallback), ${manifest.cardCatalog.length} stable cards, and ${wordOccurrenceCount} printed word occurrences in ${outputDir}.\n`,
  );
  return {
    manifest,
    authoredComicCount,
    reviewedSeedComicCount,
    generatedComicCount,
    stableCardCount: manifest.cardCatalog.length,
    wordOccurrenceCount,
  };
}

async function build(options) {
  const [
    rawSource,
    rawOCRIndex,
    rawGlossary,
    rawOverrides,
    reviewed,
    artifacts,
  ] =
    await Promise.all([
      readJSON(options.sourcePath),
      readJSON(path.join(options.ocrDir, "corpus-index.json")),
      readJSON(options.glossaryPath),
      readJSON(options.overridesPath),
      reviewedCorpus(),
      readAuthoringFiles(options.authoringDir),
    ]);
  const source = validateSourceManifest(rawSource, options.expectedCount);
  const ocrIndexById = validateOCRIndex(rawOCRIndex);
  const glossaryBySurface = validateGlossary(rawGlossary);
  const overridesByComicId = validateOverrides(rawOverrides);
  const sourceIds = new Set(source.comics.map((comic) => comic.id));
  for (const reviewedId of reviewed.comics.map((comic) => comic.id)) {
    if (!sourceIds.has(reviewedId)) {
      fail(`reviewed comic ${reviewedId} is absent from the source manifest`);
    }
  }
  for (const overrideId of overridesByComicId.keys()) {
    if (!sourceIds.has(overrideId)) {
      fail(`OCR override comic ${overrideId} is absent from the source manifest`);
    }
  }

  const geometryByComicId = await geometryForArtifacts(
    artifacts,
    options.ocrDir,
    overridesByComicId,
  );
  const authoredCompiled = compileManualAuthoringCorpus({
    artifacts,
    seedCards: reviewed.cards,
    sourceComics: source.comics,
    geometryByComicId,
  });
  const authoredIds = new Set(
    authoredCompiled.bundles.map(({ id }) => id),
  );
  const reviewedIds = new Set(reviewed.comics.map((comic) => comic.id));
  const generatedBundlesById = new Map();
  for (const sourceComic of source.comics) {
    if (authoredIds.has(sourceComic.id) || reviewedIds.has(sourceComic.id)) {
      continue;
    }
    const indexEntry = ocrIndexById.get(sourceComic.id);
    if (!indexEntry) fail(`missing OCR index entry for ${sourceComic.id}`);
    const ocrPath = path.join(options.ocrDir, indexEntry.file);
    const rawOCR = await readJSON(ocrPath);
    const ocr = validateOCRComic(rawOCR, sourceComic.id);
    const override = overridesByComicId.get(sourceComic.id);
    const generatedRevision = `generated-${hash(
      stableJSON({
        compilerRevision: COMPILER_REVISION,
        sourceComic,
        ocr,
        glossary: rawGlossary,
        override: override ?? null,
      }),
    ).slice(0, 16)}`;
    generatedBundlesById.set(sourceComic.id, buildGeneratedBundle(
      sourceComic,
      ocr,
      glossaryBySurface,
      override,
      generatedRevision,
    ));
  }

  const { manifest, bundles } = assembleRuntimeCorpus({
    source,
    authoredCompiled,
    reviewed,
    generatedBundlesById,
    buildProvenance: {
      sourceArchiveUrl: source.source?.archiveUrl,
      assemblyPriority: [
        "individually-authored",
        "reviewed-seed",
        "ocr-fallback",
      ],
    },
  });
  if (
    options.expectedCount === DEFAULT_EXPECTED_COUNT &&
    manifest.counts.needsReviewComics !== 0
  ) {
    fail(
      `full runtime corpus is incomplete: ${manifest.counts.needsReviewComics} comic(s) still require OCR fallback`,
    );
  }
  validateManifestShape(manifest, options.expectedCount);

  const comicsDirectory = path.join(options.outputDir, "comics");
  await fs.mkdir(comicsDirectory, { recursive: true });
  for (const { entry, bundle } of bundles) {
    validateRuntimeBundle(bundle, entry);
    await atomicWriteJSON(
      path.join(comicsDirectory, `${entry.loadKey}.json`),
      bundle,
    );
  }
  await atomicWriteJSON(path.join(options.outputDir, "manifest.json"), manifest);
  return validateOutput(options.outputDir, options.expectedCount);
}

export {
  assembleRuntimeCorpus,
  build,
  buildGeneratedBundle,
  normalizeAuthoredBundle,
  normalizeSeedBundle,
  normalizeSurface,
  validateGeneratedBundle,
  validateManifestShape,
  validateOutput,
  validateRuntimeBundle,
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const options = parseArguments(process.argv.slice(2));
  const action = options.validateOnly
    ? validateOutput(options.outputDir, options.expectedCount)
    : build(options);
  action.catch((error) => {
    process.stderr.write(`build-runtime-corpus.mjs: ${error.message}\n`);
    process.exitCode = 1;
  });
}
