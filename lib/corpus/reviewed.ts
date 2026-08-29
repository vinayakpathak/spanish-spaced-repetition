import {
  CARDS,
  CARD_BY_ID,
  COMICS,
  COMIC_BY_ID,
  type Comic,
  type LearningCard,
} from "../content";
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

function manifestEntry(comic: Comic): CorpusManifestEntry {
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
    reviewStatus: "reviewed",
    reviewed: true,
  };
}

export const REVIEWED_CORPUS_MANIFEST: CorpusManifest = {
  schemaVersion: CORPUS_SCHEMA_VERSION,
  revision: REVIEWED_REVISION,
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
