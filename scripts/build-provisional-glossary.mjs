#!/usr/bin/env node

/**
 * Build conservative Spanish vocabulary candidates from version-1 corpus OCR.
 *
 * This stage proposes reusable lexical records; it never asserts that a word's
 * contextual sense in a newly OCRed comic has been reviewed. Existing word
 * card copy is reused only for an exact surface with one unsuffixed reviewed
 * card. All other answers are dictionary candidates that remain needs-review.
 */

import { createHash } from "node:crypto";
import {
  readFile,
  readdir,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SCHEMA_VERSION = 1;
const DEFAULT_DICTIONARY_PATH = "/tmp/tira-corpus-dictionary/es-en.data";
const DEFAULT_FREQUENCY_PATH = "/tmp/tira-corpus-dictionary/frequency.csv";
const DEFAULT_CONTENT_PATH = resolve(process.cwd(), "lib/content.ts");
const DEFAULT_OUTPUT_PATH = resolve(
  process.cwd(),
  "data/generated/provisional-glossary.json",
);
const MAX_GLOSS_LENGTH = 140;
const MAX_GLOSS_CANDIDATES = 12;
const LOW_OCR_MINIMUM = 0.7;
const LOW_OCR_MEAN = 0.82;

const USAGE = `Usage: node scripts/build-provisional-glossary.mjs --ocr-dir PATH [options]

Options:
  --ocr-dir PATH          Directory containing version-1 OCR JSON documents
  --dictionary PATH       Spanish-English dictionary data
                          (default: /tmp/tira-corpus-dictionary/es-en.data)
  --frequency PATH        Spanish frequency/inflection CSV
                          (default: /tmp/tira-corpus-dictionary/frequency.csv)
  --content PATH          TypeScript module exporting reviewed CARDS
                          (default: lib/content.ts)
  --output PATH           Generated glossary JSON path
                          (default: data/generated/provisional-glossary.json)
  --fail-on-unknowns      Write the report, then exit nonzero if any surface has
                          neither a reviewed card nor a dictionary candidate
  -h, --help              Show this help`;

function parseArguments(argv) {
  const options = {
    ocrDirectory: null,
    dictionaryPath: DEFAULT_DICTIONARY_PATH,
    frequencyPath: DEFAULT_FREQUENCY_PATH,
    contentPath: DEFAULT_CONTENT_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    failOnUnknowns: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      console.log(USAGE);
      process.exit(0);
    }
    if (argument === "--fail-on-unknowns") {
      options.failOnUnknowns = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path\n\n${USAGE}`);
    index += 1;

    if (argument === "--ocr-dir") options.ocrDirectory = resolve(value);
    else if (argument === "--dictionary") {
      options.dictionaryPath = resolve(value);
    } else if (argument === "--frequency") {
      options.frequencyPath = resolve(value);
    } else if (argument === "--content") {
      options.contentPath = resolve(value);
    } else if (argument === "--output") {
      options.outputPath = resolve(value);
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${USAGE}`);
    }
  }

  if (!options.ocrDirectory) {
    throw new Error(`--ocr-dir is required\n\n${USAGE}`);
  }
  return options;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function round(value, places = 6) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeSpanish(value) {
  return value
    .normalize("NFC")
    .toLowerCase()
    // Unicode lowercasing can introduce combining marks (İ → i + dot).
    // Recompose where Unicode defines a composed form while preserving marks
    // that have no composed equivalent so the OCR occurrence is never lost.
    .normalize("NFC")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/’/g, "'")
    .trim();
}

function normalizeOcrToken(value, context) {
  const normalized = normalizeSpanish(value);
  if (
    !/^(?:[\p{L}\p{N}]\p{M}*)+(?:[-'](?:[\p{L}\p{N}]\p{M}*)+)*$/u.test(
      normalized,
    )
  ) {
    throw new Error(
      `Invalid OCR token ${JSON.stringify(value)} in ${context}; ` +
        "version-1 OCR tokens must contain letters/numbers with only internal hyphens or apostrophes",
    );
  }
  return normalized;
}

async function findJsonFiles(directory) {
  const files = [];

  async function visit(currentDirectory) {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    entries.sort((left, right) => compareText(left.name, right.name));
    for (const entry of entries) {
      const path = resolve(currentDirectory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
    }
  }

  await visit(directory);
  if (!files.length) throw new Error(`No JSON files found in ${directory}`);
  return files;
}

function assertFiniteNumber(value, context) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected a finite number at ${context}`);
  }
}

function validateBounds(bounds, context) {
  if (!bounds || typeof bounds !== "object") {
    throw new Error(`Missing bounds at ${context}`);
  }
  for (const key of ["x", "y", "width", "height"]) {
    assertFiniteNumber(bounds[key], `${context}.${key}`);
  }
}

function validateOcrDocument(document, filePath) {
  if (!document || typeof document !== "object") {
    throw new Error(`OCR document is not an object: ${filePath}`);
  }
  if (document.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported OCR schemaVersion in ${filePath}: ` +
        `${document.schemaVersion}; expected ${SCHEMA_VERSION}`,
    );
  }
  if (typeof document.comicId !== "string" || !document.comicId.trim()) {
    throw new Error(`Missing comicId in ${filePath}`);
  }
  if (!Array.isArray(document.lines)) {
    throw new Error(`Missing lines array in ${filePath}`);
  }
  if (
    !document.image ||
    !Number.isInteger(document.image.widthPx) ||
    document.image.widthPx <= 0 ||
    !Number.isInteger(document.image.heightPx) ||
    document.image.heightPx <= 0
  ) {
    throw new Error(`Invalid image dimensions in ${filePath}`);
  }

  for (const [lineIndex, line] of document.lines.entries()) {
    const lineContext = `${filePath}.lines[${lineIndex}]`;
    if (!Array.isArray(line.tokens)) {
      throw new Error(`Missing tokens array at ${lineContext}`);
    }
    assertFiniteNumber(line.confidence, `${lineContext}.confidence`);
    validateBounds(line.bounds, `${lineContext}.bounds`);

    for (const [tokenIndex, token] of line.tokens.entries()) {
      const tokenContext = `${lineContext}.tokens[${tokenIndex}]`;
      if (typeof token.text !== "string" || !token.text) {
        throw new Error(`Missing token text at ${tokenContext}`);
      }
      assertFiniteNumber(token.confidence, `${tokenContext}.confidence`);
      if (token.confidence < 0 || token.confidence > 1) {
        throw new Error(`OCR confidence outside 0-1 at ${tokenContext}`);
      }
      validateBounds(token.bounds, `${tokenContext}.bounds`);
      normalizeOcrToken(token.text, tokenContext);
    }
  }
}

async function loadOcrCorpus(directory) {
  const files = await findJsonFiles(directory);
  const documents = [];
  const fileHashes = [];
  const comicIds = new Set();

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    let document;
    try {
      document = JSON.parse(source);
    } catch (error) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    validateOcrDocument(document, filePath);
    if (comicIds.has(document.comicId)) {
      throw new Error(`Duplicate OCR comicId: ${document.comicId}`);
    }
    comicIds.add(document.comicId);
    documents.push(document);
    fileHashes.push({
      path: relative(directory, filePath).replaceAll("\\", "/"),
      sha256: sha256(source),
    });
  }

  documents.sort((left, right) => compareText(left.comicId, right.comicId));
  fileHashes.sort((left, right) => compareText(left.path, right.path));
  const aggregateHash = sha256(
    fileHashes.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(""),
  );
  return { documents, fileHashes, aggregateHash };
}

function gatherSurfaceOccurrences(documents) {
  const bySurface = new Map();
  let totalOccurrences = 0;

  for (const document of documents) {
    for (const [lineIndex, line] of document.lines.entries()) {
      for (const [tokenIndex, token] of line.tokens.entries()) {
        totalOccurrences += 1;
        const normalized = normalizeOcrToken(
          token.text,
          `${document.comicId}.lines[${lineIndex}].tokens[${tokenIndex}]`,
        );
        const aggregate = bySurface.get(normalized) ?? {
          surface: normalized,
          observedForms: new Set(),
          comicIds: new Set(),
          confidences: [],
          occurrenceCount: 0,
        };
        aggregate.observedForms.add(token.text.normalize("NFC"));
        aggregate.comicIds.add(document.comicId);
        aggregate.confidences.push(token.confidence);
        aggregate.occurrenceCount += 1;
        bySurface.set(normalized, aggregate);
      }
    }
  }

  return {
    totalOccurrences,
    surfaces: [...bySurface.values()].sort((left, right) =>
      compareText(left.surface, right.surface),
    ),
  };
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error(`Unclosed quote in CSV line: ${line}`);
  fields.push(field);
  return fields;
}

function addFrequencyCandidate(bySurface, surface, candidate) {
  const normalizedSurface = normalizeSpanish(surface);
  if (!normalizedSurface) return;
  const candidates = bySurface.get(normalizedSurface) ?? [];
  const existing = candidates.find(
    (value) => value.lemma === candidate.lemma && value.pos === candidate.pos,
  );
  if (existing) {
    existing.surfaceCount = Math.max(existing.surfaceCount, candidate.surfaceCount);
    existing.lemmaCount = Math.max(existing.lemmaCount, candidate.lemmaCount);
    existing.flags = [...new Set([...existing.flags, ...candidate.flags])].sort(
      compareText,
    );
  } else {
    candidates.push(candidate);
  }
  bySurface.set(normalizedSurface, candidates);
}

function parseFrequencyCsv(source) {
  const lines = source.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines.shift() ?? "");
  const expectedHeader = ["count", "spanish", "pos", "flags", "usage"];
  if (header.join("\0") !== expectedHeader.join("\0")) {
    throw new Error(`Unexpected frequency.csv header: ${header.join(",")}`);
  }

  const bySurface = new Map();
  for (const [offset, line] of lines.entries()) {
    const fields = parseCsvLine(line);
    if (fields.length !== expectedHeader.length) {
      throw new Error(
        `Expected ${expectedHeader.length} CSV fields on line ${offset + 2}; ` +
          `found ${fields.length}`,
      );
    }
    const [countValue, lemmaValue, pos, flagValue, usage] = fields;
    const lemmaCount = Number(countValue);
    if (!Number.isInteger(lemmaCount) || lemmaCount < 0) {
      throw new Error(`Invalid frequency count on line ${offset + 2}`);
    }
    const lemma = normalizeSpanish(lemmaValue);
    const flags = flagValue ? flagValue.split("|").filter(Boolean).sort(compareText) : [];
    const baseCandidate = { lemma, pos, lemmaCount, surfaceCount: lemmaCount, flags };

    let sawLemma = false;
    if (usage) {
      for (const usageEntry of usage.split("|")) {
        const match = usageEntry.match(/^(\d+):(.*)$/);
        if (!match) {
          throw new Error(
            `Invalid frequency usage on line ${offset + 2}: ${usageEntry}`,
          );
        }
        const surfaceCount = Number(match[1]);
        const surface = normalizeSpanish(match[2]);
        if (surface === lemma) sawLemma = true;
        addFrequencyCandidate(bySurface, surface, {
          ...baseCandidate,
          surfaceCount,
          flags: [...flags],
        });
      }
    }
    if (!sawLemma) {
      addFrequencyCandidate(bySurface, lemma, { ...baseCandidate, flags: [...flags] });
    }
  }

  for (const candidates of bySurface.values()) {
    candidates.sort(
      (left, right) =>
        right.surfaceCount - left.surfaceCount ||
        right.lemmaCount - left.lemmaCount ||
        compareText(left.lemma, right.lemma) ||
        compareText(left.pos, right.pos),
    );
  }
  return bySurface;
}

function conciseGlossCandidates(rawGloss) {
  let value = rawGloss
    .normalize("NFC")
    .replace(/\[from [^\]]+\]$/i, "")
    .replace(/^\([^)]{1,60}\)\s*/, "")
    .trim();

  const explanatoryParenthesis = value.search(/\s+\(/);
  if (explanatoryParenthesis > 0) {
    value = value.slice(0, explanatoryParenthesis).trim();
  }

  return value
    .split(/\s*;\s*/)
    .map((candidate) => candidate.replace(/^"|"$/g, "").trim())
    .filter(
      (candidate) =>
        candidate.length > 0 && candidate.length <= MAX_GLOSS_LENGTH,
    );
}

function parseDictionary(source) {
  const byLemma = new Map();
  const blocks = source.split(/^_____\s*$/m);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const headwordLine = lines.find((line) => line.trim());
    if (!headwordLine || /^\s/.test(headwordLine)) continue;
    const rawHeadword = headwordLine.trim().normalize("NFC");
    // OCR surfaces are lower-cased for sharing, but a dictionary's capitalized
    // headword is often a proper name or a letter name, not the ordinary
    // lower-case word. Refusing this fallback is safer than attaching a false
    // gloss (for example, dictionary "A" must not define Spanish preposition a).
    if (rawHeadword !== rawHeadword.toLowerCase()) continue;
    const lemma = normalizeSpanish(rawHeadword);
    const aggregate = byLemma.get(lemma) ?? {
      rawGlossCount: 0,
      candidates: [],
      droppedLongGlossCount: 0,
    };

    for (const line of lines) {
      const match = line.match(/^\s+gloss:\s*(.+)$/);
      if (!match) continue;
      aggregate.rawGlossCount += 1;
      const candidates = conciseGlossCandidates(match[1]);
      if (!candidates.length && match[1].trim().length > MAX_GLOSS_LENGTH) {
        aggregate.droppedLongGlossCount += 1;
      }
      aggregate.candidates.push(...candidates);
    }

    aggregate.candidates = [...new Set(aggregate.candidates)].sort(compareText);
    byLemma.set(lemma, aggregate);
  }
  return byLemma;
}

async function loadReviewedWordCards(contentPath, contentHash) {
  let cardsModule;
  try {
    cardsModule = await import(
      `${pathToFileURL(contentPath).href}?glossary=${contentHash.slice(0, 16)}`
    );
  } catch (error) {
    throw new Error(
      `Could not import reviewed CARDS from ${contentPath}: ${error.message}`,
    );
  }
  if (!Array.isArray(cardsModule.CARDS)) {
    throw new Error(`${contentPath} does not export a CARDS array`);
  }

  const bySurface = new Map();
  let wordCardCount = 0;
  for (const card of cardsModule.CARDS) {
    if (card?.kind !== "word") continue;
    wordCardCount += 1;
    if (
      typeof card.id !== "string" ||
      typeof card.promptEs !== "string" ||
      typeof card.answerEn !== "string" ||
      !card.answerEn.trim()
    ) {
      throw new Error(`Malformed reviewed word card: ${JSON.stringify(card?.id)}`);
    }
    const surface = normalizeSpanish(card.promptEs);
    const cards = bySurface.get(surface) ?? [];
    cards.push({
      id: card.id,
      promptEs: card.promptEs.normalize("NFC"),
      answerEn: card.answerEn.trim(),
    });
    bySurface.set(surface, cards);
  }
  for (const cards of bySurface.values()) {
    cards.sort((left, right) => compareText(left.id, right.id));
  }
  return { bySurface, wordCardCount };
}

function reusableReviewedCard(surface, reviewedCards) {
  if (reviewedCards.length !== 1) return null;
  const [card] = reviewedCards;
  return card.id === `word-${surface}` ? card : null;
}

function uniqueLemmas(frequencyCandidates) {
  return [...new Set(frequencyCandidates.map((candidate) => candidate.lemma))];
}

function dictionaryCandidatesForLemmas(lemmas, dictionary) {
  const candidates = [];
  let rawGlossCount = 0;
  let droppedLongGlossCount = 0;
  const matchedLemmas = [];

  for (const lemma of lemmas) {
    const entry = dictionary.get(lemma);
    if (!entry) continue;
    matchedLemmas.push(lemma);
    rawGlossCount += entry.rawGlossCount;
    droppedLongGlossCount += entry.droppedLongGlossCount;
    candidates.push(...entry.candidates);
  }

  return {
    candidates: [...new Set(candidates)].sort(compareText),
    matchedLemmas,
    rawGlossCount,
    droppedLongGlossCount,
  };
}

function buildRecord(surfaceAggregate, reviewedBySurface, frequency, dictionary) {
  const { surface } = surfaceAggregate;
  const reviewedCandidates = reviewedBySurface.get(surface) ?? [];
  const reviewedCard = reusableReviewedCard(surface, reviewedCandidates);
  const frequencyCandidates = frequency.get(surface) ?? [];
  const lemmaCandidates = uniqueLemmas(frequencyCandidates);
  const lemma = lemmaCandidates.length === 1 ? lemmaCandidates[0] : null;
  const dictionaryResult = dictionaryCandidatesForLemmas(
    lemma ? [lemma] : lemmaCandidates,
    dictionary,
  );
  const flags = new Set(["contextual-sense-unreviewed"]);

  if (reviewedCandidates.length > 1) flags.add("multiple-reviewed-senses");
  else if (reviewedCandidates.length === 1 && !reviewedCard) {
    flags.add("reviewed-card-is-context-specific");
  }
  if (!frequencyCandidates.length) flags.add("frequency-entry-missing");
  if (lemmaCandidates.length > 1) flags.add("multiple-lemma-candidates");
  if (new Set(frequencyCandidates.map((candidate) => candidate.pos)).size > 1) {
    flags.add("multiple-pos-candidates");
  }
  if (frequencyCandidates.some((candidate) => candidate.flags.length)) {
    flags.add("frequency-source-flagged");
  }
  if (!dictionaryResult.candidates.length && !reviewedCard) {
    flags.add("dictionary-gloss-missing");
  }
  if (dictionaryResult.candidates.length > 1 && !reviewedCard) {
    flags.add("multiple-gloss-candidates");
  }
  if (dictionaryResult.candidates.length > MAX_GLOSS_CANDIDATES) {
    flags.add("gloss-candidates-truncated");
  }
  if (dictionaryResult.droppedLongGlossCount) {
    flags.add("long-dictionary-gloss-omitted");
  }
  if (!/\p{L}/u.test(surface)) flags.add("non-letter-token");

  const ocrMean =
    surfaceAggregate.confidences.reduce((sum, value) => sum + value, 0) /
    surfaceAggregate.confidences.length;
  const ocrMinimum = Math.min(...surfaceAggregate.confidences);
  if (ocrMinimum < LOW_OCR_MINIMUM || ocrMean < LOW_OCR_MEAN) {
    flags.add("low-ocr-confidence");
  }

  let answerEn = null;
  let candidateGlosses;
  let mappingConfidence;
  let reviewStatus;
  if (reviewedCard) {
    answerEn = reviewedCard.answerEn;
    candidateGlosses = [reviewedCard.answerEn];
    mappingConfidence = "reviewed-card-copy";
    reviewStatus = "reviewed";
  } else {
    candidateGlosses = dictionaryResult.candidates.slice(0, MAX_GLOSS_CANDIDATES);
    if (lemma && candidateGlosses.length === 1) {
      answerEn = candidateGlosses[0];
      mappingConfidence = "single-dictionary-candidate";
    } else if (candidateGlosses.length) {
      mappingConfidence = "ambiguous-dictionary-candidates";
    } else {
      mappingConfidence = "unknown";
    }
    reviewStatus = "needs-review";
  }

  return {
    id: `provisional-word-${sha256(surface).slice(0, 20)}`,
    surface,
    lemma,
    answerEn,
    candidateGlosses,
    occurrenceCount: surfaceAggregate.occurrenceCount,
    comicCount: surfaceAggregate.comicIds.size,
    reviewStatus,
    contextualSenseReviewed: false,
    confidence: {
      mapping: mappingConfidence,
      ocrMean: round(ocrMean),
      ocrMinimum: round(ocrMinimum),
    },
    ambiguityFlags: [...flags].sort(compareText),
    provenance: {
      observedForms: [...surfaceAggregate.observedForms].sort(compareText),
      comicIds: [...surfaceAggregate.comicIds].sort(compareText),
      reviewedCardId: reviewedCard?.id ?? null,
      reviewedCardIdsConsidered: reviewedCandidates.map((card) => card.id),
      frequencyCandidates: frequencyCandidates.map((candidate) => ({
        lemma: candidate.lemma,
        pos: candidate.pos,
        lemmaCount: candidate.lemmaCount,
        surfaceCount: candidate.surfaceCount,
        flags: candidate.flags,
      })),
      dictionaryLemmasMatched: dictionaryResult.matchedLemmas,
      dictionaryRawGlossCount: dictionaryResult.rawGlossCount,
    },
  };
}

function validateOutput(records, summary) {
  if (!records.length) throw new Error("Generated glossary contains no records");
  const ids = new Set();
  const surfaces = new Set();
  let occurrenceCount = 0;

  for (const [index, record] of records.entries()) {
    if (index && compareText(records[index - 1].surface, record.surface) >= 0) {
      throw new Error(`Glossary records are not strictly surface-sorted at ${index}`);
    }
    if (ids.has(record.id)) throw new Error(`Duplicate glossary id: ${record.id}`);
    if (surfaces.has(record.surface)) {
      throw new Error(`Duplicate glossary surface: ${record.surface}`);
    }
    ids.add(record.id);
    surfaces.add(record.surface);
    occurrenceCount += record.occurrenceCount;

    if (!record.candidateGlosses.length && record.answerEn !== null) {
      throw new Error(`Unknown record has an answer: ${record.surface}`);
    }
    if (record.reviewStatus === "reviewed" && !record.provenance.reviewedCardId) {
      throw new Error(`Reviewed record lacks reviewed-card provenance: ${record.surface}`);
    }
    if (record.contextualSenseReviewed !== false) {
      throw new Error(`Contextual sense was incorrectly marked reviewed: ${record.surface}`);
    }
  }

  if (summary.uniqueSurfaceCount !== records.length) {
    throw new Error("Summary uniqueSurfaceCount does not match records");
  }
  if (summary.occurrenceCount !== occurrenceCount) {
    throw new Error("Summary occurrenceCount does not match records");
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const [ocrCorpus, dictionarySource, frequencySource, contentSource] =
    await Promise.all([
      loadOcrCorpus(options.ocrDirectory),
      readFile(options.dictionaryPath, "utf8"),
      readFile(options.frequencyPath, "utf8"),
      readFile(options.contentPath, "utf8"),
    ]);

  const frequency = parseFrequencyCsv(frequencySource);
  const dictionary = parseDictionary(dictionarySource);
  const contentHash = sha256(contentSource);
  const reviewed = await loadReviewedWordCards(options.contentPath, contentHash);
  const gathered = gatherSurfaceOccurrences(ocrCorpus.documents);
  const records = gathered.surfaces.map((surface) =>
    buildRecord(surface, reviewed.bySurface, frequency, dictionary),
  );

  const unknownSurfaces = records
    .filter((record) => !record.candidateGlosses.length)
    .map((record) => record.surface);
  const summary = {
    ocrDocumentCount: ocrCorpus.documents.length,
    occurrenceCount: gathered.totalOccurrences,
    uniqueSurfaceCount: records.length,
    reviewedRecordCount: records.filter(
      (record) => record.reviewStatus === "reviewed",
    ).length,
    needsReviewRecordCount: records.filter(
      (record) => record.reviewStatus === "needs-review",
    ).length,
    unknownRecordCount: unknownSurfaces.length,
    ambiguousLemmaRecordCount: records.filter((record) =>
      record.ambiguityFlags.includes("multiple-lemma-candidates"),
    ).length,
    lowOcrConfidenceRecordCount: records.filter((record) =>
      record.ambiguityFlags.includes("low-ocr-confidence"),
    ).length,
  };
  validateOutput(records, summary);

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: "scripts/build-provisional-glossary.mjs",
    policy: {
      reviewedMeans:
        "The reusable card copy was already reviewed for one exact, unsuffixed surface mapping.",
      contextualSenseReviewed: false,
      needsReviewMeans:
        "The lemma, gloss, OCR reading, and contextual sense must be checked before publication.",
      unknownHandling:
        "Unknown surfaces retain null lemma/answer fields and are reported; no gloss is invented.",
    },
    sources: {
      ocr: {
        schemaVersion: SCHEMA_VERSION,
        documentCount: ocrCorpus.documents.length,
        aggregateSha256: ocrCorpus.aggregateHash,
        documents: ocrCorpus.fileHashes,
      },
      frequency: {
        fileName: options.frequencyPath.split(/[\\/]/).at(-1),
        sha256: sha256(frequencySource),
      },
      dictionary: {
        fileName: options.dictionaryPath.split(/[\\/]/).at(-1),
        sha256: sha256(dictionarySource),
      },
      reviewedCards: {
        fileName: relative(process.cwd(), options.contentPath).replaceAll("\\", "/"),
        sha256: contentHash,
        wordCardCount: reviewed.wordCardCount,
      },
    },
    summary,
    unknownSurfaces,
    records,
  };

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(
    options.outputPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  console.error(
    `Wrote ${records.length} provisional vocabulary records ` +
      `(${gathered.totalOccurrences} OCR occurrences) to ${options.outputPath}`,
  );
  console.error(
    `Reviewed copy: ${summary.reviewedRecordCount}; needs review: ` +
      `${summary.needsReviewRecordCount}; unknown: ${summary.unknownRecordCount}`,
  );

  if (options.failOnUnknowns && unknownSurfaces.length) {
    console.error(`Unknown surfaces: ${unknownSurfaces.join(", ")}`);
    process.exitCode = 2;
  }
}

try {
  await main();
} catch (error) {
  console.error(`build-provisional-glossary: ${error.message}`);
  process.exitCode = 1;
}
