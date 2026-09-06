import type { LearningCard } from "./content";

export const IMPORTANCE_TARGET_IDENTITY_POLICY =
  "stable-card-id-v1" as const;
export const IMPORTANCE_TARGET_EDGE_POLICY =
  "one-per-comic-per-target" as const;
export const IMPORTANCE_TARGET_CARD_SCOPE = "schedulable-only" as const;
export const IMPORTANCE_TARGET_REVIEW_STATUS =
  "ai-authored-internal-qa" as const;

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function isCanonicalEncoded(value: string): boolean {
  if (value.length === 0) return false;
  try {
    return encoded(decodeURIComponent(value)) === value;
  } catch {
    return false;
  }
}

/** Validate the collision-free serialized key without assigning SRS meaning. */
export function isImportanceTargetId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return (
    value.startsWith("card:") &&
    isCanonicalEncoded(value.slice("card:".length))
  );
}

/**
 * Return a reversible analytics target for one exact stable learning card.
 * The `card:` namespace deliberately keeps graph IDs separate from SRS IDs.
 */
export function importanceTargetIdForCard(
  card: Pick<LearningCard, "id">,
): string {
  if (typeof card?.id !== "string" || card.id.length === 0) {
    throw new TypeError("Learning-card ID must be a non-empty string");
  }
  return `card:${encoded(card.id)}`;
}

/** One analytics edge per comic/target, considering schedulable cards only. */
export function importanceTargetIdsForCards(
  cards: readonly LearningCard[],
): string[] {
  return [
    ...new Set(
      cards
        .filter((card) => card.schedulable !== false)
        .map(importanceTargetIdForCard),
    ),
  ].sort();
}
