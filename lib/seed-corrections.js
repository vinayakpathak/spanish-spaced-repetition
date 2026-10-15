import corrections from "../data/authoring/seed-corrections.json" with { type: "json" };

// Bump with seed teaching/link changes: lazy bundle requests use force-cache.
export const SEED_CURRICULUM_REVISION = "reviewed-v4-20260907";

// Explicit, reviewed source edits for the older programmatic seed lessons.
// These are exact occurrence IDs and authored copy, never inferred word senses.
export function correctedSeedCards(cards) {
  const updates = new Map(corrections.cards.map((card) => [card.id, card]));
  const retired = new Set(corrections.retiredCardIds);
  const result = cards.filter((card) => !retired.has(card.id)).map((card) => {
    const replacement = updates.get(card.id);
    updates.delete(card.id);
    return replacement ?? card;
  });
  return [...result, ...updates.values()];
}

export function correctedSeedComic(comic) {
  const regions = comic.regions.map((region) => {
    const words = region.words.map((word) => ({
      ...word,
      cardIds: corrections.wordCardIds[word.id] ?? word.cardIds,
    }));
    return {
      ...region,
      words,
      applications: corrections.regionApplications[region.id] ?? region.applications,
      cardIds: [...new Set(words.flatMap((word) => word.cardIds))],
    };
  });
  return { ...comic, regions, cardIds: [...new Set(regions.flatMap((region) => region.cardIds))] };
}
