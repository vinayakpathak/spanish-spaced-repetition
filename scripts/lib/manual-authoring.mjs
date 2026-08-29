import { createHash } from "node:crypto";

export const AUTHORING_SCHEMA_VERSION = 1;
export const EDITORIAL_STATUS = "ai-authored";
export const QUALITY_STATUS = "internal-qa";
export const RUNTIME_REVIEW_STATUS = "ai-authored-internal-qa";

export const SEMANTIC_QA_CHECKS = Object.freeze([
  "imageTextTranscribed",
  "contextualMeaningsChecked",
  "cardReuseAndSenseSplitsChecked",
  "higherLevelTargetsChecked",
  "applicationLinksChecked",
  "beginnerExplanationsChecked",
  "wholeSentenceTranslationAidsAbsent",
]);

const WORD_TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const CARD_KINDS = new Set(["word", "grammar", "phrase", "concept"]);
const LANGUAGE_CARD_KINDS = new Set(["grammar", "phrase"]);
const APPLICATION_CARD_KINDS = new Set(["word", "grammar", "phrase"]);
const REGION_GEOMETRY_SOURCES = new Set(["ocr-line", "override-line"]);
const WORD_GEOMETRY_SOURCES = new Set(["ocr-token", "override-token"]);
const PLACEHOLDER_PATTERN =
  /\b(?:meaning needs review|needs[ -]review|pending review|placeholder|unresolved|machine[ -](?:generated|extracted)|dictionary candidate|tbd|todo)\b/i;
const WHOLE_SENTENCE_AID_PATTERN =
  /\b(?:the (?:whole |full )?(?:sentence|bubble|region)|this (?:sentence|bubble)|full translation|sentence translation|bubble translation|translates? the (?:whole )?(?:sentence|bubble))\b/i;

const ROOT_KEYS = new Set([
  "schemaVersion",
  "id",
  "editorialStatus",
  "humanVerified",
  "semanticQa",
  "titleEn",
  "titleEs",
  "titleText",
  "cardDefinitions",
  "regions",
]);
const TITLE_TEXT_KEYS = new Set(["es", "en", "noteEn"]);
const CARD_KEYS = new Set([
  "id",
  "kind",
  "promptEs",
  "questionEn",
  "answerEn",
  "noteEn",
  "example",
  "tags",
]);
const EXAMPLE_KEYS = new Set(["es", "en"]);
const REGION_KEYS = new Set([
  "id",
  "labelEs",
  "geometryRefs",
  "explicitBounds",
  "geometryRationale",
  "words",
  "applications",
]);
const WORD_KEYS = new Set([
  "id",
  "text",
  "normalized",
  "geometryRefs",
  "explicitBounds",
  "geometryRationale",
  "cardIds",
]);
const APPLICATION_KEYS = new Set([
  "id",
  "cardId",
  "participantWordIds",
  "exampleEs",
  "explanationEn",
]);
const GEOMETRY_REF_KEYS = new Set(["source", "id"]);
const BOUNDS_KEYS = new Set(["x", "y", "width", "height"]);

export class ManualAuthoringError extends Error {
  constructor(errors) {
    super(`Invalid manual authoring corpus:\n${errors.join("\n")}`);
    this.name = "ManualAuthoringError";
    this.errors = errors;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ownKeys(value) {
  return isRecord(value) ? Object.keys(value) : [];
}

function reportUnknownKeys(value, allowed, label, errors) {
  for (const key of ownKeys(value)) {
    if (!allowed.has(key)) errors.push(`${label} has unsupported field ${key}`);
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizedText(value) {
  return value.normalize("NFC").toLocaleLowerCase("es");
}

export function normalizeAuthoredWord(value) {
  return normalizedText(value);
}

export function tokenizeAuthoredSpanish(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(WORD_TOKEN_PATTERN)].map((match) => ({
    text: match[0],
    normalized: normalizedText(match[0]),
  }));
}

function normalizedTokenSequence(value) {
  return tokenizeAuthoredSpanish(value).map((token) => token.normalized);
}

function sameArray(first, second) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function stableJSON(value) {
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJSON(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function roundBoundsValue(value) {
  return Number(value.toFixed(4));
}

function validateBounds(bounds, label, errors) {
  if (!isRecord(bounds)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  reportUnknownKeys(bounds, BOUNDS_KEYS, label, errors);
  const values = [bounds.x, bounds.y, bounds.width, bounds.height];
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    errors.push(`${label} must contain finite x, y, width, and height numbers`);
    return false;
  }
  if (
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    bounds.x + bounds.width > 100.0001 ||
    bounds.y + bounds.height > 100.0001
  ) {
    errors.push(`${label} must be a positive full-image percentage rectangle`);
    return false;
  }
  return true;
}

function unionBounds(boxes) {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    x: roundBoundsValue(left),
    y: roundBoundsValue(top),
    width: roundBoundsValue(right - left),
    height: roundBoundsValue(bottom - top),
  };
}

function validateSemanticText(value, label, errors, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    errors.push(`${label} must be ${allowEmpty ? "a string" : "a non-empty string"}`);
    return;
  }
  if (PLACEHOLDER_PATTERN.test(value)) {
    errors.push(`${label} contains a bulk-draft placeholder`);
  }
}

function validateCardDefinition(card, label, errors) {
  if (!isRecord(card)) {
    errors.push(`${label} must be an object`);
    return;
  }
  reportUnknownKeys(card, CARD_KEYS, label, errors);
  validateSemanticText(card.id, `${label}.id`, errors);
  if (
    nonEmptyString(card.id) &&
    (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(card.id) ||
      card.id.startsWith("word-auto-") ||
      card.id.includes("generated"))
  ) {
    errors.push(`${label}.id must be a stable target-specific ID, not a generated occurrence ID`);
  }
  if (!CARD_KINDS.has(card.kind)) {
    errors.push(`${label}.kind must be word, grammar, phrase, or concept`);
  } else if (nonEmptyString(card.id)) {
    const expectedPrefix = card.kind === "grammar" ? "grammar-" : `${card.kind}-`;
    const acceptedGrammarAlias = card.kind === "grammar" && card.id === "question-words";
    if (!card.id.startsWith(expectedPrefix) && !acceptedGrammarAlias) {
      errors.push(`${label}.id must start with ${expectedPrefix}`);
    }
  }
  validateSemanticText(card.promptEs, `${label}.promptEs`, errors);
  validateSemanticText(card.answerEn, `${label}.answerEn`, errors);
  validateSemanticText(card.noteEn, `${label}.noteEn`, errors, { allowEmpty: true });
  if (!Array.isArray(card.tags) || card.tags.length === 0) {
    errors.push(`${label}.tags must be a non-empty array`);
  } else {
    card.tags.forEach((tag, index) =>
      validateSemanticText(tag, `${label}.tags[${index}]`, errors),
    );
  }

  if (card.kind === "word") {
    if (card.questionEn !== undefined) {
      errors.push(`${label}.questionEn is reserved for reusable grammar/expression cards`);
    }
    if (Boolean(card.noteEn?.trim()) !== Boolean(card.example)) {
      errors.push(`${label} expanded word cards need both noteEn and an invented bilingual example`);
    }
  }

  if (LANGUAGE_CARD_KINDS.has(card.kind)) {
    validateSemanticText(card.questionEn, `${label}.questionEn`, errors);
    if (!nonEmptyString(card.noteEn)) {
      errors.push(`${label}.noteEn must explain the reusable target for a complete beginner`);
    }
    if (!isRecord(card.example)) {
      errors.push(`${label}.example must be an invented bilingual example`);
    }
  }

  if (card.example !== undefined) {
    if (!isRecord(card.example)) {
      errors.push(`${label}.example must be an object`);
    } else {
      reportUnknownKeys(card.example, EXAMPLE_KEYS, `${label}.example`, errors);
      validateSemanticText(card.example.es, `${label}.example.es`, errors);
      validateSemanticText(card.example.en, `${label}.example.en`, errors);
    }
  }
  if (card.kind !== "concept" && WHOLE_SENTENCE_AID_PATTERN.test(card.noteEn ?? "")) {
    errors.push(`${label}.noteEn embeds comic/sentence-specific translation copy`);
  }
}

function validateGeometryShape(value, allowedSources, label, errors) {
  const hasRefs = value.geometryRefs !== undefined;
  const hasExplicit = value.explicitBounds !== undefined;
  if (hasRefs === hasExplicit) {
    errors.push(`${label} must use exactly one of geometryRefs or explicitBounds`);
    return;
  }
  if (hasRefs) {
    if (!Array.isArray(value.geometryRefs) || value.geometryRefs.length === 0) {
      errors.push(`${label}.geometryRefs must be a non-empty array`);
    } else {
      const seen = new Set();
      for (const [index, ref] of value.geometryRefs.entries()) {
        const refLabel = `${label}.geometryRefs[${index}]`;
        if (!isRecord(ref)) {
          errors.push(`${refLabel} must be an object`);
          continue;
        }
        reportUnknownKeys(ref, GEOMETRY_REF_KEYS, refLabel, errors);
        if (!allowedSources.has(ref.source)) {
          errors.push(`${refLabel}.source is not valid for this authored element`);
        }
        if (!nonEmptyString(ref.id)) errors.push(`${refLabel}.id must be a non-empty string`);
        const key = `${ref.source}:${ref.id}`;
        if (seen.has(key)) errors.push(`${label} repeats geometry reference ${key}`);
        seen.add(key);
      }
    }
    if (value.geometryRationale !== undefined) {
      errors.push(`${label}.geometryRationale is only allowed with explicitBounds`);
    }
  } else {
    if (!Array.isArray(value.explicitBounds) || value.explicitBounds.length === 0) {
      errors.push(`${label}.explicitBounds must be a non-empty array`);
    } else {
      value.explicitBounds.forEach((bounds, index) =>
        validateBounds(bounds, `${label}.explicitBounds[${index}]`, errors),
      );
    }
    if (!nonEmptyString(value.geometryRationale) || value.geometryRationale.trim().length < 20) {
      errors.push(`${label}.geometryRationale must explain why source geometry cannot be reused`);
    }
  }
}

function validateApplicationShape(application, label, errors) {
  if (!isRecord(application)) {
    errors.push(`${label} must be an object`);
    return;
  }
  reportUnknownKeys(application, APPLICATION_KEYS, label, errors);
  validateSemanticText(application.id, `${label}.id`, errors);
  validateSemanticText(application.cardId, `${label}.cardId`, errors);
  validateSemanticText(application.exampleEs, `${label}.exampleEs`, errors);
  validateSemanticText(application.explanationEn, `${label}.explanationEn`, errors);
  if (WHOLE_SENTENCE_AID_PATTERN.test(application.explanationEn ?? "")) {
    errors.push(`${label}.explanationEn is a whole-sentence translation aid`);
  }
  if (
    !Array.isArray(application.participantWordIds) ||
    application.participantWordIds.length === 0 ||
    application.participantWordIds.some((id) => !nonEmptyString(id))
  ) {
    errors.push(`${label}.participantWordIds must name at least one word occurrence`);
  } else if (
    new Set(application.participantWordIds).size !==
    application.participantWordIds.length
  ) {
    errors.push(`${label}.participantWordIds contains duplicates`);
  }
}

function validateArtifactShape(artifact, label, errors) {
  if (!isRecord(artifact)) {
    errors.push(`${label} must be an object`);
    return;
  }
  reportUnknownKeys(artifact, ROOT_KEYS, label, errors);
  if (artifact.schemaVersion !== AUTHORING_SCHEMA_VERSION) {
    errors.push(`${label}.schemaVersion must be ${AUTHORING_SCHEMA_VERSION}`);
  }
  validateSemanticText(artifact.id, `${label}.id`, errors);
  if (artifact.editorialStatus !== EDITORIAL_STATUS) {
    errors.push(`${label}.editorialStatus must be ${EDITORIAL_STATUS}`);
  }
  if (artifact.humanVerified !== false) {
    errors.push(`${label}.humanVerified must be false until an actual human verifies it`);
  }
  if (!isRecord(artifact.semanticQa)) {
    errors.push(`${label}.semanticQa must be an object`);
  } else {
    reportUnknownKeys(
      artifact.semanticQa,
      new Set(SEMANTIC_QA_CHECKS),
      `${label}.semanticQa`,
      errors,
    );
    for (const check of SEMANTIC_QA_CHECKS) {
      if (artifact.semanticQa[check] !== true) {
        errors.push(`${label}.semanticQa.${check} must be true before compilation`);
      }
    }
  }
  validateSemanticText(artifact.titleEn, `${label}.titleEn`, errors);
  validateSemanticText(artifact.titleEs, `${label}.titleEs`, errors);
  if (!isRecord(artifact.titleText)) {
    errors.push(`${label}.titleText must be an object`);
  } else {
    reportUnknownKeys(artifact.titleText, TITLE_TEXT_KEYS, `${label}.titleText`, errors);
    validateSemanticText(artifact.titleText.es, `${label}.titleText.es`, errors, {
      allowEmpty: true,
    });
    validateSemanticText(artifact.titleText.en, `${label}.titleText.en`, errors, {
      allowEmpty: true,
    });
    if (artifact.titleText.noteEn !== undefined) {
      validateSemanticText(artifact.titleText.noteEn, `${label}.titleText.noteEn`, errors);
    }
  }
  if (!Array.isArray(artifact.cardDefinitions)) {
    errors.push(`${label}.cardDefinitions must be an array`);
  } else {
    artifact.cardDefinitions.forEach((card, index) =>
      validateCardDefinition(card, `${label}.cardDefinitions[${index}]`, errors),
    );
  }
  if (!Array.isArray(artifact.regions) || artifact.regions.length === 0) {
    errors.push(`${label}.regions must contain at least one manually authored region`);
    return;
  }
  const regionIds = new Set();
  const wordIds = new Set();
  const applicationIds = new Set();
  for (const [regionIndex, region] of artifact.regions.entries()) {
    const regionLabel = `${label}.regions[${regionIndex}]`;
    if (!isRecord(region)) {
      errors.push(`${regionLabel} must be an object`);
      continue;
    }
    reportUnknownKeys(region, REGION_KEYS, regionLabel, errors);
    validateSemanticText(region.id, `${regionLabel}.id`, errors);
    if (regionIds.has(region.id)) errors.push(`${label} has duplicate region ID ${region.id}`);
    regionIds.add(region.id);
    if (nonEmptyString(region.id) && !region.id.startsWith(`${artifact.id}:`)) {
      errors.push(`${regionLabel}.id must be namespaced by ${artifact.id}:`);
    }
    if (typeof region.labelEs !== "string") {
      errors.push(`${regionLabel}.labelEs must be a string`);
    } else if (PLACEHOLDER_PATTERN.test(region.labelEs)) {
      errors.push(`${regionLabel}.labelEs contains placeholder copy`);
    }
    validateGeometryShape(region, REGION_GEOMETRY_SOURCES, regionLabel, errors);
    if (!Array.isArray(region.words)) {
      errors.push(`${regionLabel}.words must be an array`);
      continue;
    }
    const expectedTokens = tokenizeAuthoredSpanish(region.labelEs);
    if (region.words.length !== expectedTokens.length) {
      errors.push(
        `${regionLabel} has ${region.words.length} word occurrences for ${expectedTokens.length} printed tokens`,
      );
    }
    for (const [wordIndex, word] of region.words.entries()) {
      const wordLabel = `${regionLabel}.words[${wordIndex}]`;
      if (!isRecord(word)) {
        errors.push(`${wordLabel} must be an object`);
        continue;
      }
      reportUnknownKeys(word, WORD_KEYS, wordLabel, errors);
      validateSemanticText(word.id, `${wordLabel}.id`, errors);
      if (wordIds.has(word.id)) errors.push(`${label} has duplicate word ID ${word.id}`);
      wordIds.add(word.id);
      if (nonEmptyString(word.id) && !word.id.startsWith(`${region.id}:`)) {
        errors.push(`${wordLabel}.id must be namespaced by ${region.id}:`);
      }
      validateSemanticText(word.text, `${wordLabel}.text`, errors);
      validateSemanticText(word.normalized, `${wordLabel}.normalized`, errors);
      const expected = expectedTokens[wordIndex];
      if (
        expected &&
        (word.text !== expected.text || word.normalized !== expected.normalized)
      ) {
        errors.push(`${wordLabel} does not match the manually transcribed region text in order`);
      }
      if (nonEmptyString(word.text) && word.normalized !== normalizedText(word.text)) {
        errors.push(`${wordLabel}.normalized must be the NFC lowercase printed form`);
      }
      validateGeometryShape(word, WORD_GEOMETRY_SOURCES, wordLabel, errors);
      if (!Array.isArray(word.cardIds) || word.cardIds.length === 0) {
        errors.push(`${wordLabel}.cardIds must put a contextual word card first`);
      } else {
        if (word.cardIds.some((id) => !nonEmptyString(id))) {
          errors.push(`${wordLabel}.cardIds must contain stable non-empty IDs`);
        }
        if (new Set(word.cardIds).size !== word.cardIds.length) {
          errors.push(`${wordLabel}.cardIds contains duplicates`);
        }
      }
    }
    if (!Array.isArray(region.applications)) {
      errors.push(`${regionLabel}.applications must be an array`);
    } else {
      for (const [applicationIndex, application] of region.applications.entries()) {
        const applicationLabel = `${regionLabel}.applications[${applicationIndex}]`;
        validateApplicationShape(application, applicationLabel, errors);
        if (applicationIds.has(application?.id)) {
          errors.push(`${label} has duplicate application ID ${application.id}`);
        }
        applicationIds.add(application?.id);
        if (
          nonEmptyString(application?.id) &&
          !application.id.startsWith(`${region.id}:`)
        ) {
          errors.push(`${applicationLabel}.id must be namespaced by ${region.id}:`);
        }
      }
    }
  }
}

function cardSignature(card) {
  return stableJSON({
    id: card.id,
    kind: card.kind,
    promptEs: card.promptEs,
    questionEn: card.questionEn,
    answerEn: card.answerEn,
    noteEn: card.noteEn,
    example: card.example,
    tags: card.tags,
  });
}

export function buildCardRegistry(seedCards, artifacts, errors = []) {
  const registry = new Map();
  if (!Array.isArray(seedCards)) {
    errors.push("seedCards must be an array");
    return registry;
  }
  for (const [index, card] of seedCards.entries()) {
    if (!isRecord(card) || !nonEmptyString(card.id) || !CARD_KINDS.has(card.kind)) {
      errors.push(`seedCards[${index}] is not a valid existing card definition`);
      continue;
    }
    if (registry.has(card.id)) {
      errors.push(`seed card registry has duplicate ID ${card.id}`);
      continue;
    }
    registry.set(card.id, {
      card,
      owner: "seed-curriculum",
      signature: cardSignature(card),
    });
  }
  for (const artifact of artifacts) {
    if (!isRecord(artifact) || !Array.isArray(artifact.cardDefinitions)) continue;
    for (const card of artifact.cardDefinitions) {
      if (!isRecord(card) || !nonEmptyString(card.id)) continue;
      const existing = registry.get(card.id);
      if (existing) {
        errors.push(
          `${artifact.id} cannot define ${card.id}; its one owner is ${existing.owner}`,
        );
        continue;
      }
      registry.set(card.id, {
        card,
        owner: artifact.id,
        signature: cardSignature(card),
      });
    }
  }
  return registry;
}

function sourceComicMap(sourceComics, errors) {
  const byId = new Map();
  if (!Array.isArray(sourceComics)) {
    errors.push("sourceComics must be an array");
    return byId;
  }
  for (const [index, comic] of sourceComics.entries()) {
    if (!isRecord(comic) || !nonEmptyString(comic.id)) {
      errors.push(`sourceComics[${index}] is invalid`);
      continue;
    }
    if (byId.has(comic.id)) errors.push(`sourceComics has duplicate ID ${comic.id}`);
    byId.set(comic.id, comic);
  }
  return byId;
}

function normalizedRegionKey(region) {
  return normalizedTokenSequence(region.labelEs).join(" ");
}

function sequenceStartsAt(haystack, needle, start) {
  return needle.every((token, offset) => haystack[start + offset] === token);
}

function validateCardLinks(artifacts, registry, errors) {
  const referenced = new Set();
  const authoredRegionKeys = new Set(
    artifacts.flatMap((artifact) =>
      Array.isArray(artifact.regions)
        ? artifact.regions.map(normalizedRegionKey).filter(Boolean)
        : [],
    ),
  );
  for (const artifact of artifacts) {
    if (!Array.isArray(artifact.regions)) continue;
    for (const region of artifact.regions) {
      if (!isRecord(region) || !Array.isArray(region.words)) continue;
      const wordsById = new Map(region.words.map((word) => [word?.id, word]));
      const linkUseCounts = new Map();
      for (const word of region.words) {
        if (!isRecord(word) || !Array.isArray(word.cardIds)) continue;
        for (const [cardIndex, cardId] of word.cardIds.entries()) {
          const entry = registry.get(cardId);
          if (!entry) {
            errors.push(`${artifact.id}/${word.id} references unknown card ${cardId}`);
            continue;
          }
          referenced.add(cardId);
          if (cardIndex === 0) {
            if (entry.card.kind !== "word") {
              errors.push(`${artifact.id}/${word.id} does not put a word-meaning card first`);
            }
            if (entry.card.promptEs !== word.normalized) {
              errors.push(
                `${artifact.id}/${word.id} first card ${cardId} does not match ${word.normalized}`,
              );
            }
          } else if (entry.card.kind === "word") {
            errors.push(`${artifact.id}/${word.id} links a second word-meaning card ${cardId}`);
          }
          if (LANGUAGE_CARD_KINDS.has(entry.card.kind)) {
            linkUseCounts.set(`${word.id}\0${cardId}`, 0);
          }
        }
      }

      const applicationTuples = new Set();
      for (const application of region.applications ?? []) {
        if (!isRecord(application)) continue;
        const entry = registry.get(application.cardId);
        if (!entry) {
          errors.push(`${artifact.id}/${application.id} references unknown card ${application.cardId}`);
          continue;
        }
        referenced.add(application.cardId);
        if (!APPLICATION_CARD_KINDS.has(entry.card.kind)) {
          errors.push(`${artifact.id}/${application.id} cannot apply ${entry.card.kind} card ${application.cardId}`);
          continue;
        }
        const tuple = `${application.cardId}\0${[...(application.participantWordIds ?? [])]
          .sort()
          .join("\0")}`;
        if (applicationTuples.has(tuple)) {
          errors.push(`${artifact.id}/${application.id} duplicates an existing card/application participant set`);
        }
        applicationTuples.add(tuple);
        const participantIndexes = [];
        for (const wordId of application.participantWordIds ?? []) {
          const word = wordsById.get(wordId);
          if (!word) {
            errors.push(`${artifact.id}/${application.id} references unknown word ${wordId}`);
            continue;
          }
          participantIndexes.push(region.words.indexOf(word));
          const correctlyLinked =
            entry.card.kind === "word"
              ? application.participantWordIds.length === 1 &&
                word.cardIds?.[0] === application.cardId
              : word.cardIds?.slice(1).includes(application.cardId);
          if (!correctlyLinked) {
            errors.push(
              `${artifact.id}/${application.id} is not reverse-linked from participant ${wordId}`,
            );
          }
          if (LANGUAGE_CARD_KINDS.has(entry.card.kind)) {
            const key = `${wordId}\0${application.cardId}`;
            linkUseCounts.set(key, (linkUseCounts.get(key) ?? 0) + 1);
          }
        }
        const exampleTokens = normalizedTokenSequence(application.exampleEs ?? "");
        const regionTokens = region.words.map((word) => word.normalized);
        const possibleStarts = regionTokens
          .map((_, index) => index)
          .filter((index) => sequenceStartsAt(regionTokens, exampleTokens, index));
        const includesParticipants = possibleStarts.some((start) =>
          participantIndexes.every(
            (index) => index >= start && index < start + exampleTokens.length,
          ),
        );
        if (exampleTokens.length === 0 || !includesParticipants) {
          errors.push(
            `${artifact.id}/${application.id} exampleEs must be a contiguous comic fragment containing every participant`,
          );
        }
        if (
          sameArray(exampleTokens, regionTokens) &&
          new Set(application.participantWordIds ?? []).size < region.words.length
        ) {
          errors.push(
            `${artifact.id}/${application.id} uses the whole region instead of the smallest relevant fragment`,
          );
        }
      }

      for (const [key, count] of linkUseCounts) {
        if (count !== 1) {
          const [wordId, cardId] = key.split("\0");
          errors.push(
            `${artifact.id}/${wordId} needs exactly one reverse-linked application for ${cardId} (found ${count})`,
          );
        }
      }
    }
  }

  for (const artifact of artifacts) {
    for (const card of artifact.cardDefinitions ?? []) {
      if (nonEmptyString(card?.id) && !referenced.has(card.id)) {
        errors.push(`${artifact.id} owns unreachable card ${card.id}`);
      }
      if (
        LANGUAGE_CARD_KINDS.has(card?.kind) &&
        authoredRegionKeys.has(normalizedTokenSequence(card.example?.es ?? "").join(" "))
      ) {
        errors.push(`${artifact.id}/${card.id} uses a whole comic region as its reusable example`);
      }
    }
  }
  return referenced;
}

function validateArtifactAgainstSource(artifact, sourceComic, errors) {
  if (!sourceComic) {
    errors.push(`${artifact.id} is absent from the Spanish archive source manifest`);
    return;
  }
  if (artifact.titleEs !== sourceComic.title) {
    errors.push(`${artifact.id}.titleEs must preserve the Spanish archive title exactly`);
  }
  const sourceTitleText = typeof sourceComic.titleText === "string" ? sourceComic.titleText : "";
  if (artifact.titleText?.es !== sourceTitleText) {
    errors.push(`${artifact.id}.titleText.es must preserve the Spanish archive title text exactly`);
  }
  if (sourceTitleText && !nonEmptyString(artifact.titleText?.en)) {
    errors.push(`${artifact.id}.titleText.en must contain the authored English title-text translation`);
  }
}

export function validateManualAuthoringCorpus({
  artifacts,
  seedCards,
  sourceComics,
}) {
  const errors = [];
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return ["artifacts must contain at least one per-comic authoring file"];
  }
  const artifactIds = new Set();
  artifacts.forEach((artifact, index) => {
    const label = `artifacts[${index}]`;
    validateArtifactShape(artifact, label, errors);
    if (artifactIds.has(artifact?.id)) errors.push(`duplicate authored comic ID ${artifact.id}`);
    artifactIds.add(artifact?.id);
  });
  const sourcesById = sourceComicMap(sourceComics, errors);
  for (const artifact of artifacts) {
    if (isRecord(artifact)) validateArtifactAgainstSource(artifact, sourcesById.get(artifact.id), errors);
  }
  const registry = buildCardRegistry(seedCards, artifacts, errors);
  validateCardLinks(artifacts, registry, errors);
  return errors;
}

function geometryKey(ref) {
  return `${ref.source}:${ref.id}`;
}

/**
 * Build geometry lookup data for one comic. OCR text and confidence are
 * intentionally discarded: semantic authoring may use only the rectangles.
 */
export function buildGeometryRegistry(ocrComic, overrideComic) {
  const registry = new Map();
  const add = (source, id, boxes) => {
    const errors = [];
    boxes.forEach((bounds, index) =>
      validateBounds(bounds, `${source}:${id}[${index}]`, errors),
    );
    if (errors.length > 0) throw new ManualAuthoringError(errors);
    const key = `${source}:${id}`;
    if (registry.has(key)) throw new ManualAuthoringError([`duplicate geometry ID ${key}`]);
    registry.set(key, boxes.map((bounds) => ({ ...bounds })));
  };
  for (const line of ocrComic?.lines ?? []) add("ocr-line", line.id, [line.bounds]);
  for (const token of ocrComic?.tokens ?? []) add("ocr-token", token.id, token.boxes);
  for (const line of overrideComic?.lines ?? []) {
    add("override-line", line.id, [line.bounds]);
    for (const token of line.tokens ?? []) add("override-token", token.id, token.bounds);
  }
  return registry;
}

function resolveGeometry(value, registry, label, errors) {
  if (Array.isArray(value.explicitBounds)) {
    return value.explicitBounds.map((bounds) => ({ ...bounds }));
  }
  const boxes = [];
  for (const ref of value.geometryRefs ?? []) {
    const resolved = registry.get(geometryKey(ref));
    if (!resolved) {
      errors.push(`${label} references missing geometry ${geometryKey(ref)}`);
      continue;
    }
    boxes.push(...resolved.map((bounds) => ({ ...bounds })));
  }
  return boxes;
}

function inferredOriginalImageURL(sourceComic) {
  const translatedName = new URL(sourceComic.imageUrl).pathname.split("/").pop();
  return `https://imgs.xkcd.com/comics/${translatedName.replace(/^\d+_/, "")}`;
}

const LICENSE = Object.freeze({
  creator: "Randall Munroe",
  publisher: "xkcd",
  translationCredit: "Gabriel Rodríguez Alberich",
  licenseName: "Creative Commons Attribution-NonCommercial 2.5 Generic",
  licenseLabel: "CC BY-NC 2.5",
  licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/",
  attributionRequired: true,
  commercialUseAllowed: false,
});

function compiledCard(entry) {
  return {
    ...entry.card,
    reviewStatus: RUNTIME_REVIEW_STATUS,
    schedulable: true,
    provenance: {
      method: EDITORIAL_STATUS,
      qualityStatus: QUALITY_STATUS,
      humanVerified: false,
      ownerComicId: entry.owner,
      contextualSenseAuthored: true,
    },
  };
}

function compileArtifact(artifact, sourceComic, registry, geometryRegistry) {
  const errors = [];
  const usedGeometryRefs = new Set();
  const regions = artifact.regions.map((region) => {
    const regionBoxes = resolveGeometry(
      region,
      geometryRegistry,
      `${artifact.id}/${region.id}`,
      errors,
    );
    const words = region.words.map((word) => {
      for (const ref of word.geometryRefs ?? []) {
        const key = geometryKey(ref);
        if (usedGeometryRefs.has(key)) {
          errors.push(`${artifact.id} reuses word geometry ${key} for multiple printed tokens`);
        }
        usedGeometryRefs.add(key);
      }
      const bounds = resolveGeometry(
        word,
        geometryRegistry,
        `${artifact.id}/${word.id}`,
        errors,
      );
      return {
        id: word.id,
        text: word.text,
        normalized: word.normalized,
        bounds,
        cardIds: [...word.cardIds],
      };
    });
    const bounds = regionBoxes.length > 0 ? unionBounds(regionBoxes) : null;
    if (bounds) {
      for (const word of words) {
        for (const wordBounds of word.bounds) {
          const centerX = wordBounds.x + wordBounds.width / 2;
          const centerY = wordBounds.y + wordBounds.height / 2;
          if (
            centerX < bounds.x ||
            centerX > bounds.x + bounds.width ||
            centerY < bounds.y ||
            centerY > bounds.y + bounds.height
          ) {
            errors.push(`${artifact.id}/${word.id} geometry falls outside region ${region.id}`);
          }
        }
      }
    }
    return {
      id: region.id,
      labelEs: region.labelEs,
      // Sentence/bubble translations are structurally unavailable in source.
      translationEn: "",
      noteEn: "",
      bounds,
      words,
      applications: region.applications.map((application) => ({
        id: application.id,
        cardId: application.cardId,
        participantWordIds: [...application.participantWordIds],
        exampleEs: application.exampleEs,
        explanationEn: application.explanationEn,
      })),
      cardIds: [
        ...new Set(words.flatMap((word) => word.cardIds)),
      ],
    };
  });
  if (errors.length > 0) throw new ManualAuthoringError(errors);
  const cardIds = [...new Set(regions.flatMap((region) => region.cardIds))];
  const cards = cardIds.map((cardId) => compiledCard(registry.get(cardId)));
  const revisionInput = {
    artifact,
    cards: cards.map((card) => ({
      id: card.id,
      kind: card.kind,
      promptEs: card.promptEs,
      questionEn: card.questionEn,
      answerEn: card.answerEn,
      noteEn: card.noteEn,
      example: card.example,
      tags: card.tags,
    })),
    regions: regions.map((region) => ({
      id: region.id,
      bounds: region.bounds,
      words: region.words.map((word) => ({ id: word.id, bounds: word.bounds })),
    })),
  };
  const revision = `authored-${hash(stableJSON(revisionInput)).slice(0, 16)}`;
  const comic = {
    id: artifact.id,
    xkcdNumber: sourceComic.number,
    publishedAt: sourceComic.publishedAt,
    title: artifact.titleEn,
    titleEs: artifact.titleEs,
    image: {
      src: sourceComic.imageUrl,
      width: sourceComic.width,
      height: sourceComic.height,
      aspectRatio: roundBoundsValue(sourceComic.width / sourceComic.height),
      altEn: `Spanish-language xkcd comic #${sourceComic.number}: ${artifact.titleEn}`,
    },
    source: {
      ...LICENSE,
      originalPageUrl: sourceComic.source.originalPageUrl,
      originalImageUrl: inferredOriginalImageURL(sourceComic),
      translationPageUrl: sourceComic.source.translationPageUrl,
      translationImageUrl: sourceComic.source.translationImageUrl,
    },
    titleText: { ...artifact.titleText },
    regions,
    cardIds,
    editorialStatus: EDITORIAL_STATUS,
    qualityStatus: QUALITY_STATUS,
    humanVerified: false,
  };
  return {
    schemaVersion: 2,
    revision,
    reviewStatus: RUNTIME_REVIEW_STATUS,
    editorialStatus: EDITORIAL_STATUS,
    qualityStatus: QUALITY_STATUS,
    humanVerified: false,
    semanticQa: { ...artifact.semanticQa },
    provenance: {
      method: EDITORIAL_STATUS,
      qualityStatus: QUALITY_STATUS,
      humanVerified: false,
      geometryOnlyFromOcr: true,
      semanticContentGenerated: false,
    },
    comic,
    cards,
  };
}

/**
 * Compile reviewed-by-the-agent source files into independent lazy bundles.
 * This is a structural assembler only: it copies authored semantic fields and
 * resolves geometry; it never derives words, translations, glosses, or cards.
 */
export function compileManualAuthoringCorpus({
  artifacts,
  seedCards,
  sourceComics,
  geometryByComicId,
}) {
  const validationErrors = validateManualAuthoringCorpus({
    artifacts,
    seedCards,
    sourceComics,
  });
  if (validationErrors.length > 0) throw new ManualAuthoringError(validationErrors);
  const errors = [];
  const registry = buildCardRegistry(seedCards, artifacts, errors);
  const sourcesById = sourceComicMap(sourceComics, errors);
  if (!(geometryByComicId instanceof Map)) {
    errors.push("geometryByComicId must be a Map of geometry registries");
  }
  if (errors.length > 0) throw new ManualAuthoringError(errors);

  const bundles = artifacts.map((artifact) => ({
    id: artifact.id,
    bundle: compileArtifact(
      artifact,
      sourcesById.get(artifact.id),
      registry,
      geometryByComicId.get(artifact.id) ?? new Map(),
    ),
  }));
  const catalogIds = [
    ...new Set(bundles.flatMap(({ bundle }) => bundle.comic.cardIds)),
  ];
  const cardCatalog = catalogIds.map((cardId) => compiledCard(registry.get(cardId)));
  const revision = `authored-set-${hash(
    stableJSON(bundles.map(({ id, bundle }) => ({ id, revision: bundle.revision }))),
  ).slice(0, 16)}`;
  const comics = bundles.map(({ id, bundle }) => ({
    id,
    loadKey: id,
    revision: bundle.revision,
    xkcdNumber: bundle.comic.xkcdNumber,
    publishedAt: bundle.comic.publishedAt,
    title: bundle.comic.title,
    titleEs: bundle.comic.titleEs,
    imageSrc: bundle.comic.image.src,
    cardIds: bundle.comic.cardIds,
    reviewStatus: RUNTIME_REVIEW_STATUS,
    editorialStatus: EDITORIAL_STATUS,
    qualityStatus: QUALITY_STATUS,
    humanVerified: false,
  }));
  return {
    schemaVersion: AUTHORING_SCHEMA_VERSION,
    revision,
    reviewStatus: RUNTIME_REVIEW_STATUS,
    editorialStatus: EDITORIAL_STATUS,
    qualityStatus: QUALITY_STATUS,
    humanVerified: false,
    comics,
    cardCatalog,
    bundles,
  };
}

export function searchableCardIndex(seedCards, artifacts) {
  const errors = [];
  const registry = buildCardRegistry(seedCards, artifacts, errors);
  if (errors.length > 0) throw new ManualAuthoringError(errors);
  return [...registry.values()]
    .map(({ card, owner }) => ({
      id: card.id,
      kind: card.kind,
      promptEs: card.promptEs,
      answerEn: card.answerEn,
      owner,
    }))
    .sort((first, second) => first.id.localeCompare(second.id, "es"));
}
