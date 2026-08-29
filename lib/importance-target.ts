import type { LearningCard } from "./content";

export const IMPORTANCE_TARGET_IDENTITY_POLICY =
  "provisional-word-signature-v1" as const;
export const IMPORTANCE_TARGET_EDGE_POLICY =
  "one-per-comic-per-target" as const;
export const IMPORTANCE_TARGET_CARD_SCOPE = "schedulable-only" as const;
export const IMPORTANCE_TARGET_REVIEW_STATUS =
  "provisional-context-unreviewed" as const;

/**
 * Normalize only the analytics signature. This never changes a LearningCard
 * ID and must never be used to reconcile or schedule SRS state.
 */
export function normalizeImportanceSignaturePart(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("es")
    .normalize("NFC");
}

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
  if (value.startsWith("card:")) {
    return isCanonicalEncoded(value.slice("card:".length));
  }
  if (!value.startsWith("word:")) return false;
  const parts = value.slice("word:".length).split("|");
  return parts.length === 2 && parts.every(isCanonicalEncoded);
}

/**
 * Return a reversible, namespace-separated graph target ID. Word targets are
 * provisional prompt/answer signatures; higher-level targets retain their
 * exact stable card identity inside a separate encoded namespace.
 */
export function importanceTargetIdForCard(
  card: Pick<LearningCard, "id" | "kind" | "promptEs" | "answerEn">,
): string {
  if (card.kind === "word") {
    const prompt = normalizeImportanceSignaturePart(card.promptEs);
    const answer = normalizeImportanceSignaturePart(card.answerEn);
    return `word:${encoded(prompt)}|${encoded(answer)}`;
  }
  if (["grammar", "phrase", "concept"].includes(card.kind)) {
    return `card:${encoded(card.id)}`;
  }
  throw new TypeError(`Unsupported learning-card kind: ${String(card.kind)}`);
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
