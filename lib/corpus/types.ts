import type { Comic, LearningCard } from "../content";

/**
 * Runtime JSON format version. Increment this only for a breaking corpus
 * schema change; content-only updates belong in `revision`.
 */
export const CORPUS_SCHEMA_VERSION = 1 as const;

/** The intended size of the generated Spanish xkcd corpus. */
export const TARGET_CORPUS_COMIC_COUNT = 258 as const;

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
  /** Machine-extracted lessons remain visibly provisional until reviewed. */
  reviewStatus: "reviewed" | "needs-review";
  /** Reviewed entries always use the checked-in seed adapter. */
  reviewed?: boolean;
}

export interface CorpusManifest {
  schemaVersion: typeof CORPUS_SCHEMA_VERSION;
  revision: string;
  comics: readonly CorpusManifestEntry[];
  /** Compact copy for schedulable cards so history survives lazy bundle loads. */
  cardCatalog: readonly LearningCard[];
}

/**
 * Each generated JSON file is self-contained so opening a comic also makes
 * every card it references available to the sidebar and card library.
 */
export interface CorpusComicBundle {
  schemaVersion: typeof CORPUS_SCHEMA_VERSION;
  revision: string;
  comic: Comic;
  cards: readonly LearningCard[];
}
