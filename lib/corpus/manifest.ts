import { REVIEWED_CORPUS_MANIFEST } from "./reviewed";
import type { LearningCard } from "../content";
import {
  CORPUS_SCHEMA_VERSION,
  type CorpusManifest,
  type CorpusManifestEntry,
} from "./types";

export const CORPUS_MANIFEST_URL = "/corpus/manifest.json";

export interface CorpusManifestLoadResult {
  manifest: CorpusManifest;
  /**
   * True when the full generated manifest could not be verified and the
   * checked-in reviewed seed is being used only as a temporary fallback.
   * Progress must not be reconciled and persisted against this smaller list.
   */
  degraded: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }
  return [...new Set(value)];
}

function parseEntry(
  value: unknown,
  manifestRevision: string,
): CorpusManifestEntry | null {
  if (!isRecord(value)) return null;
  const cardIds = stringArray(value.cardIds);
  if (
    typeof value.id !== "string" ||
    typeof value.loadKey !== "string" ||
    !/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(value.loadKey) ||
    typeof value.xkcdNumber !== "number" ||
    !Number.isInteger(value.xkcdNumber) ||
    typeof value.publishedAt !== "string" ||
    typeof value.title !== "string" ||
    typeof value.titleEs !== "string" ||
    typeof value.imageSrc !== "string" ||
    !cardIds
  ) {
    return null;
  }

  return {
    id: value.id,
    loadKey: value.loadKey,
    revision:
      typeof value.revision === "string" ? value.revision : manifestRevision,
    xkcdNumber: value.xkcdNumber,
    publishedAt: value.publishedAt,
    title: value.title,
    titleEs: value.titleEs,
    imageSrc: value.imageSrc,
    cardIds,
    reviewStatus: value.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
  };
}

function parseCatalogCard(value: unknown): LearningCard | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    !["word", "phrase", "grammar", "concept"].includes(String(value.kind)) ||
    typeof value.promptEs !== "string" ||
    typeof value.answerEn !== "string" ||
    typeof value.noteEn !== "string" ||
    !Array.isArray(value.tags) ||
    value.tags.some((tag) => typeof tag !== "string") ||
    value.schedulable !== true ||
    value.reviewStatus !== "needs-review"
  ) {
    return null;
  }
  return value as unknown as LearningCard;
}

export function parseCorpusManifest(value: unknown): CorpusManifest {
  if (!isRecord(value)) throw new Error("Corpus manifest must be an object.");
  if (value.schemaVersion !== CORPUS_SCHEMA_VERSION) {
    throw new Error("Unsupported corpus manifest schema version.");
  }
  if (
    typeof value.revision !== "string" ||
    !Array.isArray(value.comics) ||
    !Array.isArray(value.cardCatalog)
  ) {
    throw new Error("Corpus manifest is missing its revision or comics list.");
  }

  const entries = value.comics.map((entry) =>
    parseEntry(entry, value.revision as string),
  );
  if (entries.some((entry) => entry === null)) {
    throw new Error("Corpus manifest contains an invalid comic entry.");
  }

  const comics = entries as CorpusManifestEntry[];
  if (new Set(comics.map((comic) => comic.id)).size !== comics.length) {
    throw new Error("Corpus manifest contains duplicate comic IDs.");
  }
  if (new Set(comics.map((comic) => comic.loadKey)).size !== comics.length) {
    throw new Error("Corpus manifest contains duplicate comic load keys.");
  }

  const catalog = value.cardCatalog.map(parseCatalogCard);
  if (catalog.some((card) => card === null)) {
    throw new Error("Corpus manifest contains an invalid catalog card.");
  }
  const cardCatalog = catalog as LearningCard[];
  const catalogIds = new Set(cardCatalog.map((card) => card.id));
  if (catalogIds.size !== cardCatalog.length) {
    throw new Error("Corpus manifest contains duplicate catalog card IDs.");
  }
  const generatedSchedulerIds = new Set(
    comics
      .filter((comic) => comic.reviewStatus === "needs-review")
      .flatMap((comic) => [...comic.cardIds]),
  );
  if (
    catalogIds.size !== generatedSchedulerIds.size ||
    [...generatedSchedulerIds].some((cardId) => !catalogIds.has(cardId))
  ) {
    throw new Error("Corpus card catalog does not match generated scheduler IDs.");
  }
  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    revision: value.revision,
    comics,
    cardCatalog,
  };
}

/**
 * Checked-in reviewed comics win over generated versions with the same ID.
 * This preserves their hand-authored word bounds and curriculum while still
 * allowing the generated manifest to control the overall ordering.
 */
export function mergeReviewedManifest(remote: CorpusManifest): CorpusManifest {
  const reviewedById = new Map(
    REVIEWED_CORPUS_MANIFEST.comics.map((comic) => [comic.id, comic]),
  );
  const seen = new Set<string>();
  const comics = remote.comics.map((entry) => {
    const resolved = reviewedById.get(entry.id) ?? entry;
    seen.add(resolved.id);
    return resolved;
  });

  for (const reviewed of REVIEWED_CORPUS_MANIFEST.comics) {
    if (!seen.has(reviewed.id)) comics.push(reviewed);
  }

  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    revision: remote.revision,
    comics,
    cardCatalog: remote.cardCatalog,
  };
}

/** Fetch the generated manifest, falling back to the six reviewed comics. */
export async function loadCorpusManifest(): Promise<CorpusManifestLoadResult> {
  try {
    const response = await fetch(CORPUS_MANIFEST_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Corpus manifest returned ${response.status}.`);
    return {
      manifest: mergeReviewedManifest(parseCorpusManifest(await response.json())),
      degraded: false,
    };
  } catch {
    return {
      manifest: REVIEWED_CORPUS_MANIFEST,
      degraded: true,
    };
  }
}

/**
 * A reduced fallback curriculum is safe to use in memory, but never safe to
 * persist over a complete saved snapshot. A bundle failure is degraded even
 * when the manifest itself loaded successfully.
 */
export function canPersistCorpusProgress(
  manifestLoad: Pick<CorpusManifestLoadResult, "degraded">,
  usedBundleFallback = false,
): boolean {
  return !manifestLoad.degraded && !usedBundleFallback;
}
