import { REVIEWED_CORPUS_MANIFEST } from "./reviewed";
import type { LearningCard } from "../content";
import { isImportanceTargetId } from "../importance-target";
import {
  CORPUS_SCHEMA_VERSION,
  type ComicImportance,
  type ComicImportanceModel,
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

function uniqueStringArray(
  value: unknown,
  isValid: (item: unknown) => item is string = (
    item: unknown,
  ): item is string => typeof item === "string",
): string[] | null {
  if (!Array.isArray(value) || value.some((item) => !isValid(item))) {
    return null;
  }
  const strings = value as string[];
  return new Set(strings).size === strings.length ? [...strings] : null;
}

function finiteNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function compareIds(left: string, right: string): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  const sharedLength = Math.min(leftCharacters.length, rightCharacters.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference =
      (leftCharacters[index].codePointAt(0) ?? 0) -
      (rightCharacters[index].codePointAt(0) ?? 0);
    if (difference !== 0) return difference;
  }
  return leftCharacters.length - rightCharacters.length;
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value))
  );
}

function parseImportance(value: unknown): ComicImportance | null {
  if (
    !isRecord(value) ||
    !finiteNumberInRange(value.score, 0, 1) ||
    !nonnegativeInteger(value.rank) ||
    value.rank < 1 ||
    !finiteNumberInRange(value.percentile, 0, 1) ||
    !nonnegativeInteger(value.cardCount) ||
    !nonnegativeInteger(value.sharedCardCount) ||
    value.sharedCardCount > value.cardCount
  ) {
    return null;
  }
  return {
    score: value.score,
    rank: value.rank,
    percentile: value.percentile,
    cardCount: value.cardCount,
    sharedCardCount: value.sharedCardCount,
  };
}

function parseImportanceModel(value: unknown): ComicImportanceModel | null {
  if (
    !isRecord(value) ||
    value.algorithm !== "damped-bipartite-centrality-v1" ||
    value.normalization !== "comic-sum-1" ||
    value.identityPolicy !== "provisional-word-signature-v1" ||
    value.edgePolicy !== "one-per-comic-per-target" ||
    value.cardScope !== "schedulable-only" ||
    value.includesSchedulableOnly !== true ||
    value.reviewStatus !== "provisional-context-unreviewed" ||
    value.provisional !== true ||
    value.contextualSensesReviewed !== false ||
    !finiteNumberInRange(value.damping, 0, 1) ||
    value.damping === 1 ||
    typeof value.tolerance !== "number" ||
    !Number.isFinite(value.tolerance) ||
    value.tolerance <= 0 ||
    !nonnegativeInteger(value.maxIterations) ||
    value.maxIterations < 1 ||
    !nonnegativeInteger(value.iterations) ||
    value.iterations > value.maxIterations ||
    value.converged !== true ||
    !nonnegativeInteger(value.nodeCount) ||
    !nonnegativeInteger(value.comicNodeCount) ||
    !nonnegativeInteger(value.cardNodeCount) ||
    !nonnegativeInteger(value.edgeCount) ||
    value.nodeCount !== value.comicNodeCount + value.cardNodeCount
  ) {
    return null;
  }
  return {
    algorithm: value.algorithm,
    normalization: value.normalization,
    identityPolicy: value.identityPolicy,
    edgePolicy: value.edgePolicy,
    cardScope: value.cardScope,
    includesSchedulableOnly: value.includesSchedulableOnly,
    reviewStatus: value.reviewStatus,
    provisional: value.provisional,
    contextualSensesReviewed: value.contextualSensesReviewed,
    damping: value.damping,
    tolerance: value.tolerance,
    maxIterations: value.maxIterations,
    iterations: value.iterations,
    converged: value.converged,
    nodeCount: value.nodeCount,
    comicNodeCount: value.comicNodeCount,
    cardNodeCount: value.cardNodeCount,
    edgeCount: value.edgeCount,
  };
}

function parseEntry(
  value: unknown,
  manifestRevision: string,
): CorpusManifestEntry | null {
  if (!isRecord(value)) return null;
  const cardIds = uniqueStringArray(value.cardIds);
  const importanceTargetIds = uniqueStringArray(
    value.importanceTargetIds,
    isImportanceTargetId,
  );
  const importance = parseImportance(value.importance);
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
    !cardIds ||
    !importanceTargetIds ||
    !importance ||
    importance.cardCount !== importanceTargetIds.length ||
    importanceTargetIds.some(
      (targetId, index) => index > 0 && importanceTargetIds[index - 1] >= targetId,
    )
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
    importanceTargetIds,
    importance,
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
  const importanceModel = parseImportanceModel(value.importanceModel);
  if (
    typeof value.revision !== "string" ||
    !Array.isArray(value.comics) ||
    !Array.isArray(value.cardCatalog) ||
    !importanceModel
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
  const ranks = comics.map((comic) => comic.importance.rank);
  if (
    new Set(ranks).size !== comics.length ||
    ranks.some((rank) => rank > comics.length)
  ) {
    throw new Error("Corpus manifest contains invalid importance ranks.");
  }
  const scoreSum = comics.reduce(
    (sum, comic) => sum + comic.importance.score,
    0,
  );
  if (comics.length > 0 && Math.abs(scoreSum - 1) > 1e-9) {
    throw new Error("Corpus comic importance scores are not normalized.");
  }
  const rankedComics = [...comics].sort(
    (left, right) =>
      right.importance.score - left.importance.score ||
      compareIds(left.id, right.id),
  );
  if (
    rankedComics.some(
      (comic, index) => comic.importance.rank !== index + 1,
    )
  ) {
    throw new Error("Corpus importance ranks do not match score order.");
  }
  const targetFrequency = new Map<string, number>();
  for (const comic of comics) {
    for (const targetId of comic.importanceTargetIds) {
      targetFrequency.set(targetId, (targetFrequency.get(targetId) ?? 0) + 1);
    }
  }
  for (const comic of comics) {
    const sharedCardCount = comic.importanceTargetIds.filter(
      (targetId) => (targetFrequency.get(targetId) ?? 0) > 1,
    ).length;
    if (comic.importance.sharedCardCount !== sharedCardCount) {
      throw new Error(
        `Corpus manifest has an invalid shared-card count for ${comic.id}.`,
      );
    }
    const expectedPercentile =
      comics.length === 1
        ? 1
        : (comics.length - comic.importance.rank) / (comics.length - 1);
    if (Math.abs(comic.importance.percentile - expectedPercentile) > 1e-12) {
      throw new Error(
        `Corpus manifest has an invalid importance percentile for ${comic.id}.`,
      );
    }
  }
  const edgeCount = comics.reduce(
    (sum, comic) => sum + comic.importanceTargetIds.length,
    0,
  );
  if (
    importanceModel.comicNodeCount !== comics.length ||
    importanceModel.cardNodeCount !== targetFrequency.size ||
    importanceModel.edgeCount !== edgeCount
  ) {
    throw new Error("Corpus importance model counts do not match its graph.");
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
    importanceModel,
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
  const remoteById = new Map(remote.comics.map((comic) => [comic.id, comic]));
  for (const reviewed of REVIEWED_CORPUS_MANIFEST.comics) {
    const remoteEntry = remoteById.get(reviewed.id);
    if (
      !remoteEntry ||
      remoteEntry.reviewStatus !== "reviewed" ||
      !sameStringSet(remoteEntry.cardIds, reviewed.cardIds) ||
      !sameStringSet(
        remoteEntry.importanceTargetIds,
        reviewed.importanceTargetIds,
      )
    ) {
      throw new Error(
        `Remote reviewed curriculum does not match ${reviewed.id}.`,
      );
    }
  }
  const comics = remote.comics.map((entry) => {
    const reviewed = reviewedById.get(entry.id);
    return reviewed
      ? {
          ...reviewed,
          // Ranking is corpus-wide. Keep the remote 258-comic result even
          // though the checked-in reviewed curriculum wins for content.
          importance: entry.importance,
        }
      : entry;
  });

  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    revision: remote.revision,
    importanceModel: remote.importanceModel,
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
