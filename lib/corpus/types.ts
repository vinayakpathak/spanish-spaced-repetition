import type {
  Comic,
  LearningCard,
  LearningContentReviewStatus,
} from "../content";

/**
 * Runtime JSON format version. Increment this only for a breaking corpus
 * schema change; content-only updates belong in `revision`.
 */
export const CORPUS_SCHEMA_VERSION = 3 as const;

/** The intended size of the generated Spanish xkcd corpus. */
export const TARGET_CORPUS_COMIC_COUNT = 258 as const;

/**
 * A comic's position in the informational comic/learning-target graph. These
 * analytics fields never replace or alias the exact `cardIds` used by SRS.
 */
export interface ComicImportance {
  /** Damped recursive centrality in [0, 1]; all comic scores sum to 1. */
  score: number;
  /** One-based ordinal position; deterministic comic-ID order breaks ties. */
  rank: number;
  /** Rank percentile in [0, 1], where the top comic is 1. */
  percentile: number;
  /** Number of distinct analytics targets connected to this comic. */
  cardCount: number;
  /** Connected targets that are also connected to at least one other comic. */
  sharedCardCount: number;
}

/** Reproducibility metadata for the corpus-wide bipartite centrality run. */
export interface ComicImportanceModel {
  algorithm: "damped-bipartite-centrality-v1";
  normalization: "comic-sum-1";
  identityPolicy: "stable-card-id-v1";
  edgePolicy: "one-per-comic-per-target";
  cardScope: "schedulable-only";
  includesSchedulableOnly: true;
  reviewStatus: "ai-authored-internal-qa" | "human-verified" | "mixed";
  provisional: boolean;
  contextualSensesReviewed: boolean;
  damping: number;
  tolerance: number;
  maxIterations: number;
  iterations: number;
  converged: boolean;
  nodeCount: number;
  comicNodeCount: number;
  cardNodeCount: number;
  edgeCount: number;
}

/**
 * The scheduler needs only an ID and card IDs. The remaining fields let the
 * UI identify an unloaded comic without downloading its full word geometry.
 */
export interface CorpusManifestEntry {
  id: string;
  loadKey: string;
  revision: string;
  xkcdNumber: number;
  publishedAt: string;
  title: string;
  titleEs: string;
  imageSrc: string;
  cardIds: readonly string[];
  /** Analytics-only canonical targets; never use these IDs for SRS state. */
  importanceTargetIds: readonly string[];
  importance: ComicImportance;
  /** Editorial confidence; internal QA is not a claim of human verification. */
  reviewStatus: LearningContentReviewStatus;
  /** Internal-only marker for an exact checked-in seed fallback. Never serialized. */
  seedFallback?: true;
}

export interface CorpusManifest {
  schemaVersion: typeof CORPUS_SCHEMA_VERSION;
  revision: string;
  importanceModel: ComicImportanceModel;
  comics: readonly CorpusManifestEntry[];
  /** Compact copy for every generated exact card so history survives lazy loads. */
  cardCatalog: readonly LearningCard[];
}

/**
 * Each generated JSON file is self-contained so opening a comic also makes
 * every card it references available to the sidebar and card library.
 */
export interface CorpusComicBundle {
  schemaVersion: typeof CORPUS_SCHEMA_VERSION;
  revision: string;
  reviewStatus: LearningContentReviewStatus;
  comic: Comic;
  cards: readonly LearningCard[];
}
