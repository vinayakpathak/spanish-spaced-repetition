import type { Comic, LearningCard } from "../content";
import { loadReviewedComic } from "./reviewed";
import {
  CORPUS_SCHEMA_VERSION,
  type CorpusComicBundle,
  type CorpusManifestEntry,
} from "./types";

const bundleCache = new Map<string, Promise<CorpusComicBundle>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isComic(value: unknown): value is Comic {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.xkcdNumber === "number" &&
    typeof value.title === "string" &&
    typeof value.titleEs === "string" &&
    isRecord(value.image) &&
    typeof value.image.src === "string" &&
    Array.isArray(value.regions) &&
    Array.isArray(value.cardIds) &&
    value.cardIds.every((cardId) => typeof cardId === "string")
  );
}

function isLearningCard(value: unknown): value is LearningCard {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    ["word", "phrase", "grammar", "concept"].includes(String(value.kind)) &&
    typeof value.promptEs === "string" &&
    typeof value.answerEn === "string" &&
    typeof value.noteEn === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  );
}

function sameStringSet(first: readonly string[], second: readonly string[]) {
  return (
    new Set(first).size === new Set(second).size &&
    first.every((value) => second.includes(value))
  );
}

export function parseComicBundle(
  value: unknown,
  entry: CorpusManifestEntry,
): CorpusComicBundle {
  if (!isRecord(value) || value.schemaVersion !== CORPUS_SCHEMA_VERSION) {
    throw new Error(`Unsupported corpus bundle for ${entry.id}.`);
  }
  if (
    typeof value.revision !== "string" ||
    !isComic(value.comic) ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isLearningCard)
  ) {
    throw new Error(`Invalid corpus bundle for ${entry.id}.`);
  }
  if (value.revision !== entry.revision) {
    throw new Error(`Corpus bundle revision does not match ${entry.id}.`);
  }
  if (value.comic.id !== entry.id) {
    throw new Error(`Corpus bundle ID does not match manifest entry ${entry.id}.`);
  }
  if (!sameStringSet(value.comic.cardIds, entry.cardIds)) {
    throw new Error(`Corpus bundle card index does not match ${entry.id}.`);
  }

  const cards = value.cards as LearningCard[];
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  if (cardsById.size !== cards.length) {
    throw new Error(`Corpus bundle contains duplicate card IDs for ${entry.id}.`);
  }
  for (const cardId of entry.cardIds) {
    const card = cardsById.get(cardId);
    if (!card) {
      throw new Error(`Corpus bundle is missing ${cardId} for ${entry.id}.`);
    }
    if (card.schedulable === false) {
      throw new Error(`Corpus bundle schedules preview-only ${cardId} for ${entry.id}.`);
    }
  }

  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    revision: value.revision,
    comic: value.comic,
    cards,
  };
}

export function comicBundleUrl(entry: CorpusManifestEntry): string {
  const revision = encodeURIComponent(entry.revision);
  return `/corpus/comics/${encodeURIComponent(entry.loadKey)}.json?v=${revision}`;
}

/** Load one full comic and its cards, caching successful in-flight requests. */
export function loadComicBundle(
  entry: CorpusManifestEntry,
): Promise<CorpusComicBundle> {
  const reviewed = loadReviewedComic(entry.id);
  if (reviewed) return Promise.resolve(reviewed);

  const cacheKey = `${entry.loadKey}@${entry.revision}`;
  const cached = bundleCache.get(cacheKey);
  if (cached) return cached;

  const request = fetch(comicBundleUrl(entry), { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Comic ${entry.id} returned ${response.status}.`);
      }
      return response.json() as Promise<unknown>;
    })
    .then((value) => parseComicBundle(value, entry));

  bundleCache.set(cacheKey, request);
  void request.catch(() => bundleCache.delete(cacheKey));
  return request;
}
