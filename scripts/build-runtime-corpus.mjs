#!/usr/bin/env node

/**
 * Compile machine-extracted OCR and provisional dictionary candidates into
 * the lazy runtime corpus consumed by lib/corpus/load.ts.
 *
 * This compiler deliberately creates a separate card for every OCR token.
 * An automated dictionary match cannot establish the meaning used in a comic,
 * so sharing cards across occurrences would falsely claim that their senses
 * are identical. Human review may later merge occurrences that genuinely use
 * the same written form and contextual sense.
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
 * The six hand-reviewed comics are represented in the manifest but remain
 * authoritative through lib/corpus/reviewed.ts; no generated bundle replaces
 * them. All other cards remain explicitly `needs-review`.
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCHEMA_VERSION = 1;
const COMPILER_REVISION = "runtime-corpus-v2";
const DEFAULT_EXPECTED_COUNT = 258;
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULTS = {
  sourcePath: path.join(PROJECT_ROOT, "data/source/es-xkcd.json"),
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
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION) {
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
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION) {
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
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION) {
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
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION) {
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
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION) {
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
    const schedulable = token.manualAnswerEn !== null || glossary.answerEn !== null;
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
      schedulable,
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

  // Region/word indexes drive the clickable discovery UI and therefore include
  // unresolved cards. The comic and manifest indexes drive the scheduler and
  // include only cards with an explicit usable answer.
  const cardIds = cards.filter((card) => card.schedulable).map((card) => card.id);
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
    schemaVersion: SCHEMA_VERSION,
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
    reviewStatus: "needs-review",
    provenance: {
      method: "apple-vision-ocr-and-provisional-dictionary",
      contextualSensesReviewed: false,
    },
  };
}

function validateRuntimeCard(card, label) {
  if (!isRecord(card)) fail(`${label} must be an object`);
  requireString(card.id, `${label}.id`);
  if (card.kind !== "word") fail(`${label}.kind must be word`);
  requireString(card.promptEs, `${label}.promptEs`);
  requireString(card.answerEn, `${label}.answerEn`);
  if (card.noteEn !== "") fail(`${label}.noteEn must stay compact`);
  if (!Array.isArray(card.tags)) fail(`${label}.tags must be an array`);
  if (card.reviewStatus !== "needs-review") {
    fail(`${label}.reviewStatus must be needs-review`);
  }
  if (typeof card.schedulable !== "boolean") {
    fail(`${label}.schedulable must be a boolean`);
  }
  if (!card.schedulable && card.answerEn !== "Meaning needs review") {
    fail(`${label} has an unresolved answer but is not marked as such`);
  }
  if (card.schedulable && card.answerEn === "Meaning needs review") {
    fail(`${label} cannot schedule an unresolved answer`);
  }
  if (card.provenance?.contextualSenseReviewed !== false) {
    fail(`${label} must not claim contextual review`);
  }
}

function equalStringSets(first, second) {
  return (
    new Set(first).size === new Set(second).size &&
    first.every((value) => second.includes(value))
  );
}

function validateGeneratedBundle(bundle, entry) {
  if (!isRecord(bundle) || bundle.schemaVersion !== SCHEMA_VERSION) {
    fail(`${entry.id} bundle has an unsupported schema`);
  }
  if (bundle.revision !== entry.revision) {
    fail(`${entry.id} bundle revision does not match its manifest entry`);
  }
  if (bundle.reviewStatus !== "needs-review") {
    fail(`${entry.id} bundle reviewStatus must be needs-review`);
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
    validateRuntimeCard(card, `${entry.id}.cards[${index}]`);
    if (cards.has(card.id)) fail(`${entry.id} has duplicate card ID ${card.id}`);
    cards.set(card.id, card);
  }
  for (const cardId of entry.cardIds) {
    const card = cards.get(cardId);
    if (!card) fail(`${entry.id} bundle is missing scheduled card ${cardId}`);
    if (!card.schedulable) {
      fail(`${entry.id} indexes unresolved card ${cardId} for scheduling`);
    }
  }
  const schedulableCardIds = bundle.cards
    .filter((card) => card.schedulable)
    .map((card) => card.id);
  if (!equalStringSets(schedulableCardIds, entry.cardIds)) {
    fail(`${entry.id} scheduler index does not match its schedulable cards`);
  }
  if (bundle.comic.reviewStatus !== "needs-review") {
    fail(`${entry.id} comic reviewStatus must be needs-review`);
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
    if (region.translationEn !== "" || region.noteEn !== "") {
      fail(`${entry.id} generated regions must not reveal sentence translations`);
    }
    if (!Array.isArray(region.applications) || region.applications.length !== 0) {
      fail(`${entry.id} generated regions must not invent card applications`);
    }
    validateBounds(region.bounds, `${entry.id} region ${regionIndex}.bounds`);
    for (const [wordIndex, word] of region.words.entries()) {
      occurrenceCount += 1;
      if (!isRecord(word)) fail(`${entry.id} word ${wordIndex} is invalid`);
      if (occurrenceIds.has(word.id)) {
        fail(`${entry.id} has duplicate word occurrence ID ${word.id}`);
      }
      occurrenceIds.add(word.id);
      requireString(word.text, `${entry.id} word ${wordIndex}.text`);
      if (!hasLatinLetter(word.text)) {
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
      if (!Array.isArray(word.cardIds) || word.cardIds.length !== 1) {
        fail(`${entry.id} generated word ${word.id} needs one first word card`);
      }
      const firstCard = cards.get(word.cardIds[0]);
      if (!firstCard || firstCard.kind !== "word") {
        fail(`${entry.id} word ${word.id} does not link a word card first`);
      }
      if (firstCard.promptEs !== normalized) {
        fail(`${entry.id} word ${word.id} and card prompt do not match`);
      }
    }
    if (!equalStringSets(region.cardIds, region.words.map((word) => word.cardIds[0]))) {
      fail(`${entry.id} region ${region.id} card index is inconsistent`);
    }
  }
  if (occurrenceCount !== bundle.cards.length) {
    fail(`${entry.id} must have one provisional card per OCR word occurrence`);
  }
  return { occurrenceCount, schedulableCardCount: schedulableCardIds.length };
}

function validateManifestShape(manifest, expectedCount) {
  if (!isRecord(manifest) || manifest.schemaVersion !== SCHEMA_VERSION) {
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
    if (entry.reviewStatus !== "reviewed" && entry.reviewStatus !== "needs-review") {
      fail(`${id}.reviewStatus is invalid`);
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
  const generatedSchedulerIds = manifest.comics
    .filter((entry) => entry.reviewStatus === "needs-review")
    .flatMap((entry) => entry.cardIds);
  if (new Set(generatedSchedulerIds).size !== generatedSchedulerIds.length) {
    fail("generated scheduler indexes contain a duplicate card ID");
  }
  if (!equalStringSets([...catalogIds], generatedSchedulerIds)) {
    fail("runtime card catalog does not match generated scheduler indexes");
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
  const revision = "reviewed-v1";
  const entries = content.COMICS.map((comic) => ({
    id: comic.id,
    loadKey: comic.id,
    revision,
    xkcdNumber: comic.xkcdNumber,
    publishedAt: comic.publishedAt,
    title: comic.title,
    titleEs: comic.titleEs,
    imageSrc: comic.image.src,
    cardIds: comic.cardIds,
    reviewed: true,
  }));
  const comicById = new Map(content.COMICS.map((comic) => [comic.id, comic]));
  return {
    REVIEWED_CORPUS_MANIFEST: {
      schemaVersion: SCHEMA_VERSION,
      revision,
      comics: entries,
    },
    loadReviewedComic(id) {
      const comic = comicById.get(id);
      if (!comic) return null;
      const cardIds = new Set(comic.cardIds);
      return {
        schemaVersion: SCHEMA_VERSION,
        revision,
        comic,
        cards: content.CARDS.filter((card) => cardIds.has(card.id)),
      };
    },
  };
}

async function validateOutput(outputDir, expectedCount) {
  const manifest = validateManifestShape(
    await readJSON(path.join(outputDir, "manifest.json")),
    expectedCount,
  );
  const { REVIEWED_CORPUS_MANIFEST, loadReviewedComic } = await reviewedCorpus();
  const reviewedIds = new Set(REVIEWED_CORPUS_MANIFEST.comics.map((comic) => comic.id));
  const globalGeneratedCardIds = new Set();
  const catalogById = new Map(
    manifest.cardCatalog.map((card) => [card.id, card]),
  );
  let generatedComicCount = 0;
  let generatedCardCount = 0;
  let schedulableGeneratedCardCount = 0;

  for (const entry of manifest.comics) {
    if (reviewedIds.has(entry.id)) {
      const reviewed = loadReviewedComic(entry.id);
      if (!reviewed || entry.reviewStatus !== "reviewed") {
        fail(`${entry.id} does not resolve to its reviewed seed`);
      }
      if (!equalStringSets(reviewed.comic.cardIds, entry.cardIds)) {
        fail(`${entry.id} reviewed manifest card index is inconsistent`);
      }
      continue;
    }

    generatedComicCount += 1;
    const filePath = path.join(outputDir, "comics", `${entry.loadKey}.json`);
    const bundle = await readJSON(filePath);
    const { occurrenceCount, schedulableCardCount } = validateGeneratedBundle(
      bundle,
      entry,
    );
    generatedCardCount += occurrenceCount;
    schedulableGeneratedCardCount += schedulableCardCount;
    for (const card of bundle.cards) {
      if (globalGeneratedCardIds.has(card.id)) {
        fail(`generated card ID is not globally unique: ${card.id}`);
      }
      globalGeneratedCardIds.add(card.id);
      if (card.schedulable) {
        const catalogCard = catalogById.get(card.id);
        if (!catalogCard || JSON.stringify(catalogCard) !== JSON.stringify(card)) {
          fail(`runtime card catalog copy does not match bundle card ${card.id}`);
        }
      }
    }
  }

  if (generatedComicCount !== expectedCount - reviewedIds.size) {
    fail(
      `expected ${expectedCount - reviewedIds.size} generated bundles, found ${generatedComicCount}`,
    );
  }
  process.stdout.write(
    `Validated ${manifest.comics.length} runtime comics (${reviewedIds.size} reviewed, ${generatedComicCount} generated), ${generatedCardCount} clickable generated cards, and ${schedulableGeneratedCardCount} schedulable generated cards in ${outputDir}.\n`,
  );
  return {
    manifest,
    generatedComicCount,
    generatedCardCount,
    schedulableGeneratedCardCount,
  };
}

async function build(options) {
  const [rawSource, rawOCRIndex, rawGlossary, rawOverrides, reviewed] =
    await Promise.all([
    readJSON(options.sourcePath),
    readJSON(path.join(options.ocrDir, "corpus-index.json")),
    readJSON(options.glossaryPath),
    readJSON(options.overridesPath),
    reviewedCorpus(),
    ]);
  const source = validateSourceManifest(rawSource, options.expectedCount);
  const ocrIndexById = validateOCRIndex(rawOCRIndex);
  const glossaryBySurface = validateGlossary(rawGlossary);
  const overridesByComicId = validateOverrides(rawOverrides);
  const reviewedEntryById = new Map(
    reviewed.REVIEWED_CORPUS_MANIFEST.comics.map((entry) => [entry.id, entry]),
  );
  const sourceIds = new Set(source.comics.map((comic) => comic.id));
  for (const reviewedId of reviewedEntryById.keys()) {
    if (!sourceIds.has(reviewedId)) {
      fail(`reviewed comic ${reviewedId} is absent from the source manifest`);
    }
  }
  for (const overrideId of overridesByComicId.keys()) {
    if (!sourceIds.has(overrideId)) {
      fail(`OCR override comic ${overrideId} is absent from the source manifest`);
    }
    if (reviewedEntryById.has(overrideId)) {
      fail(`OCR override comic ${overrideId} is already a reviewed seed`);
    }
  }

  const inputsForRevision = [
    COMPILER_REVISION,
    stableJSON(rawSource),
    stableJSON(rawOCRIndex),
    stableJSON(rawGlossary),
    stableJSON(rawOverrides),
  ];
  const ocrById = new Map();
  for (const sourceComic of source.comics) {
    if (reviewedEntryById.has(sourceComic.id)) continue;
    const indexEntry = ocrIndexById.get(sourceComic.id);
    if (!indexEntry) fail(`missing OCR index entry for ${sourceComic.id}`);
    const ocrPath = path.join(options.ocrDir, indexEntry.file);
    const rawOCR = await readJSON(ocrPath);
    const ocr = validateOCRComic(rawOCR, sourceComic.id);
    ocrById.set(sourceComic.id, ocr);
    inputsForRevision.push(stableJSON(rawOCR));
  }
  const revision = `generated-${hash(inputsForRevision.join("\0")).slice(0, 16)}`;

  const manifestEntries = [];
  const bundles = [];
  for (const sourceComic of source.comics) {
    const reviewedEntry = reviewedEntryById.get(sourceComic.id);
    if (reviewedEntry) {
      manifestEntries.push({
        ...reviewedEntry,
        reviewStatus: "reviewed",
        provenance: { method: "hand-reviewed-seed" },
      });
      continue;
    }
    const bundle = buildGeneratedBundle(
      sourceComic,
      ocrById.get(sourceComic.id),
      glossaryBySurface,
      overridesByComicId.get(sourceComic.id),
      revision,
    );
    const entry = generatedManifestEntry(sourceComic, bundle, revision);
    bundles.push({ entry, bundle });
    manifestEntries.push(entry);
  }

  const cardCatalog = bundles.flatMap(({ bundle }) =>
    bundle.cards.filter((card) => card.schedulable),
  );
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    revision,
    reviewStatus: "mixed",
    counts: {
      comics: manifestEntries.length,
      reviewedComics: reviewedEntryById.size,
      needsReviewComics: manifestEntries.length - reviewedEntryById.size,
      generatedCards: bundles.reduce(
        (sum, item) => sum + item.bundle.cards.length,
        0,
      ),
      schedulableGeneratedCards: cardCatalog.length,
    },
    provenance: {
      sourceArchiveUrl: source.source?.archiveUrl,
      ocrEngine: "apple-vision",
      glossaryGeneratedBy: rawGlossary.generatedBy,
      compilerRevision: COMPILER_REVISION,
      contextualSensesReviewed: false,
    },
    cardCatalog,
    comics: manifestEntries,
  };
  validateManifestShape(manifest, options.expectedCount);

  const comicsDirectory = path.join(options.outputDir, "comics");
  await fs.mkdir(comicsDirectory, { recursive: true });
  for (const { entry, bundle } of bundles) {
    validateGeneratedBundle(bundle, entry);
    await atomicWriteJSON(
      path.join(comicsDirectory, `${entry.loadKey}.json`),
      bundle,
    );
  }
  await atomicWriteJSON(path.join(options.outputDir, "manifest.json"), manifest);
  await validateOutput(options.outputDir, options.expectedCount);
}

export {
  build,
  buildGeneratedBundle,
  normalizeSurface,
  validateGeneratedBundle,
  validateManifestShape,
  validateOutput,
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
