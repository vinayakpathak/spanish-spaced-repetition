import type { LearningCard } from "./content";

const FALLBACK_TITLES = {
  grammar: "Grammar lesson",
  phrase: "Reusable expression",
  concept: "Background explanation",
} as const;

/** Spanish words are study targets; internal nonword patterns are not instructions. */
export function cardTitle(card: Pick<LearningCard, "kind" | "promptEs" | "questionEn">): string {
  return card.kind === "word" ? card.promptEs : card.questionEn?.trim() || FALLBACK_TITLES[card.kind];
}

export function cardTitleLanguage(card: Pick<LearningCard, "kind">): "es" | "en" {
  return card.kind === "word" ? "es" : "en";
}
