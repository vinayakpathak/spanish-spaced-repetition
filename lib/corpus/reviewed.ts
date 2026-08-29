import {
  CARDS,
  CARD_BY_ID,
  COMICS,
  COMIC_BY_ID,
  type Comic,
  type LearningCard,
} from "../content";
import { rankComicsByCardGraph } from "../comic-importance";
import {
  IMPORTANCE_TARGET_CARD_SCOPE,
  IMPORTANCE_TARGET_EDGE_POLICY,
  IMPORTANCE_TARGET_IDENTITY_POLICY,
  IMPORTANCE_TARGET_REVIEW_STATUS,
  importanceTargetIdsForCards,
} from "../importance-target";
import {
  CORPUS_SCHEMA_VERSION,
  type CorpusComicBundle,
  type CorpusManifest,
  type CorpusManifestEntry,
} from "./types";

const REVIEWED_REVISION = "reviewed-v1";

export const REVIEWED_COMICS: readonly Comic[] = COMICS;
export const REVIEWED_CARDS: readonly LearningCard[] = CARDS;
export const REVIEWED_COMIC_BY_ID = COMIC_BY_ID;
export const REVIEWED_CARD_BY_ID = CARD_BY_ID;

const REVIEWED_IMPORTANCE_TARGET_IDS_BY_ID = new Map(
  REVIEWED_COMICS.map((comic) => {
    const cardIds = new Set(comic.cardIds);
    return [
      comic.id,
      importanceTargetIdsForCards(
        REVIEWED_CARDS.filter((card) => cardIds.has(card.id)),
      ),
    ];
  }),
);
const REVIEWED_IMPORTANCE_RESULT = rankComicsByCardGraph(
  REVIEWED_COMICS.map(({ id }) => ({
    id,
    cardIds: REVIEWED_IMPORTANCE_TARGET_IDS_BY_ID.get(id) ?? [],
  })),
);
const REVIEWED_IMPORTANCE_BY_ID = new Map(
  REVIEWED_IMPORTANCE_RESULT.comics.map(({ comicId, ...importance }) => [
    comicId,
    importance,
  ]),
);

function manifestEntry(comic: Comic): CorpusManifestEntry {
  const importance = REVIEWED_IMPORTANCE_BY_ID.get(comic.id);
  if (!importance) throw new Error(`Missing reviewed importance for ${comic.id}.`);
  const importanceTargetIds = REVIEWED_IMPORTANCE_TARGET_IDS_BY_ID.get(comic.id);
  if (!importanceTargetIds) {
    throw new Error(`Missing reviewed importance targets for ${comic.id}.`);
  }
  return {
    id: comic.id,
    loadKey: comic.id,
    revision: REVIEWED_REVISION,
    xkcdNumber: comic.xkcdNumber,
    publishedAt: comic.publishedAt,
    title: comic.title,
    titleEs: comic.titleEs,
    imageSrc: comic.image.src,
    cardIds: comic.cardIds,
    importanceTargetIds,
    importance,
    reviewStatus: "reviewed",
    reviewed: true,
  };
}

export const REVIEWED_CORPUS_MANIFEST: CorpusManifest = {
  schemaVersion: CORPUS_SCHEMA_VERSION,
  revision: REVIEWED_REVISION,
  importanceModel: {
    algorithm: REVIEWED_IMPORTANCE_RESULT.algorithm,
    normalization: REVIEWED_IMPORTANCE_RESULT.normalization,
    identityPolicy: IMPORTANCE_TARGET_IDENTITY_POLICY,
    edgePolicy: IMPORTANCE_TARGET_EDGE_POLICY,
    cardScope: IMPORTANCE_TARGET_CARD_SCOPE,
    includesSchedulableOnly: true,
    reviewStatus: IMPORTANCE_TARGET_REVIEW_STATUS,
    provisional: true,
    contextualSensesReviewed: false,
    damping: REVIEWED_IMPORTANCE_RESULT.damping,
    tolerance: REVIEWED_IMPORTANCE_RESULT.tolerance,
    maxIterations: REVIEWED_IMPORTANCE_RESULT.maxIterations,
    iterations: REVIEWED_IMPORTANCE_RESULT.iterations,
    converged: REVIEWED_IMPORTANCE_RESULT.converged,
    nodeCount: REVIEWED_IMPORTANCE_RESULT.nodeCount,
    comicNodeCount: REVIEWED_IMPORTANCE_RESULT.comicNodeCount,
    cardNodeCount: REVIEWED_IMPORTANCE_RESULT.cardNodeCount,
    edgeCount: REVIEWED_IMPORTANCE_RESULT.edgeCount,
  },
  comics: REVIEWED_COMICS.map(manifestEntry),
  // Reviewed cards are already initialized synchronously from lib/content.ts.
  cardCatalog: [],
};

export function loadReviewedComic(id: string): CorpusComicBundle | null {
  const comic = REVIEWED_COMIC_BY_ID.get(id);
  if (!comic) return null;

  const referenced = new Set<string>(comic.cardIds);
  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    revision: REVIEWED_REVISION,
    comic,
    cards: REVIEWED_CARDS.filter((card) => referenced.has(card.id)),
  };
}
