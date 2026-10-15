const HIDDEN_PROMPT = /\b(?:in (?:the|this) (?:Spanish )?prompt|the (?:Spanish )?pattern (?:above|below))\b/iu;
const SYMBOL_INSTRUCTIONS = /\b(?:(?:the|each) plus signs?|plus signs? (?:means?|shows?|marks?)|the slashes?|the arrows?|the three dots|parentheses in the (?:prompt|pattern))\b/iu;

/** Narrow regression guard; this is not an automatic language-quality judge. */
export function hiddenPatternInstructionFields(card) {
  return ["questionEn", "answerEn", "noteEn"].filter((field) => {
    const text = card[field] ?? "";
    return HIDDEN_PROMPT.test(text) ||
      (["grammar", "phrase"].includes(card.kind) && SYMBOL_INSTRUCTIONS.test(text));
  });
}
