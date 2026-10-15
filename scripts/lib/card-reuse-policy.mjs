const normalize = (value) => value.normalize("NFC").toLocaleLowerCase("es").replace(/\s+/gu, " ").trim();

/** Authoring gate, not an automatic semantic merger or a translation verifier. */
export function validateCardReusePolicy(cards, policy) {
  if (!policy || policy.schemaVersion !== 1 || !Array.isArray(policy.baselineCardIds) ||
      !Array.isArray(policy.retiredCardIds) || !Array.isArray(policy.reviews)) {
    return ["Card reuse policy must contain baselineCardIds, retiredCardIds and reviews."];
  }
  const errors = [];
  const baseline = new Set(policy.baselineCardIds);
  const retired = new Set(policy.retiredCardIds);
  const known = new Set(cards.map((card) => card.id));
  const reviews = new Map();
  for (const review of policy.reviews) {
    if (reviews.has(review.cardId)) errors.push(`Duplicate reuse review for ${review.cardId}.`);
    reviews.set(review.cardId, review);
  }
  for (const card of cards) {
    if (retired.has(card.id)) {
      errors.push(`Retired target ${card.id} must not be reintroduced; reuse its reviewed survivor or document a new distinct target.`);
      continue;
    }
    if (baseline.has(card.id)) continue;
    const peers = cards.filter((peer) => peer.id !== card.id &&
      (card.kind === "word" ? peer.kind === "word" :
        card.kind === "concept" ? peer.kind === "concept" : ["grammar", "phrase"].includes(peer.kind)) &&
      normalize(peer.promptEs) === normalize(card.promptEs));
    // An ordinary first occurrence still requires its contextual word card.
    if (card.kind === "word" && peers.length === 0) continue;
    const review = reviews.get(card.id);
    if (!review || review.decision !== "distinct-target" ||
        typeof review.distinctionEn !== "string" || review.distinctionEn.trim().length < 40 ||
        !Array.isArray(review.searchQueries) || !review.searchQueries.some((query) => typeof query === "string" && query.trim()) ||
        !Array.isArray(review.comparedCardIds)) {
      errors.push(`${card.id} needs a reuse review: search all related targets, list comparedCardIds, and explain why this meaning cannot be handled by an existing card plus an application.`);
      continue;
    }
    for (const id of review.comparedCardIds) {
      if (!known.has(id) || id === card.id) errors.push(`${card.id} has an invalid comparedCardId: ${id}.`);
    }
    for (const peer of peers) {
      if (!review.comparedCardIds.includes(peer.id)) {
        errors.push(`${card.id} must compare the existing same-form/target card ${peer.id}, including targets stored under another language-card kind.`);
      }
    }
  }
  return errors;
}
