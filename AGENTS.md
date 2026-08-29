# Project instructions

## Product and language

- Tira teaches Spanish to English speakers with Spanish-language xkcd comics.
- Keep the application UI and explanations in English. Keep comic text and Spanish learning prompts in Spanish.
- A learner schedules a card only by opening that specific card. Merely selecting a word or reading a sentence must not schedule anything.

## Flashcard curriculum

### Contextual word cards

- Every printed Spanish word occurrence must offer a contextual word-meaning card.
- Teach the meaning used in that exact comic context, not an undifferentiated dictionary entry.
- Reuse a word card only when the written form and contextual sense are genuinely the same. Keep different senses separate; preserve accents and inflected forms.
- The contextual word card must be the first card linked to an occurrence.
- Keep an ordinary word with a direct translation compact: the short answer is enough. Do not add filler such as “this card tracks this surface form.”
- When a short gloss hides grammar, morphology, an idiomatic use, or a surprising missing English word, add a reusable, beginner-friendly explanation and an invented bilingual example. Explain the construction in plain language; do not merely rename it with grammar jargon.
- Keep the shared word card independent of any comic. If the learner benefits from seeing why that meaning applies to the selected occurrence, store the short Spanish fragment and its occurrence-specific explanation in a separate `CardApplication`.
- A word `CardApplication` belongs only to the exact selected word occurrence, remains display-only, and schedules the shared word card ID. Never use it to reveal a whole sentence or bubble translation.

### When to create a higher-level card

Create one only when the comic contains at least one of these durable learning targets:

1. A productive grammar construction that the learner can reuse with other vocabulary, such as `estar + gerundio` or `volver a + infinitivo`.
2. A common idiom or fixed expression whose meaning or use is not fully predictable from its individual words, such as `no tener nada que ver`.
3. A conventional collocation or lexicalized multiword unit worth recalling as a unit, such as `prestar atención` or `puesta de sol`.
4. A cultural, technical, or joke-specific concept that is genuinely needed to understand the comic. Keep concept cards distinct from language-pattern cards.

A higher-level language card should satisfy all of these conditions:

- It is useful outside this one sentence.
- It teaches something beyond the literal meanings of the individual words plus ordinary grammar.
- It contains one atomic learning target, not several loosely related lessons.
- Its prompt names the reusable Spanish form. Comic-specific wording never belongs in the shared card.

Do not create a card merely because a sentence, clause, or speech bubble exists. In particular, omit:

- arbitrary whole-sentence translations such as `Esto es importante`;
- compositional phrases that a learner can understand from the word cards and normal syntax;
- one-off noun phrases or sentence fragments with no durable pattern;
- redundant cards that restate an existing word or grammar card;
- cards that bundle multiple independent expressions or rules.

When an exact sentence contains a useful pattern, generalize it. For example, prefer `llamar a alguien + nombre` over `Le llamamos Pequeño Bobby Tablas`.

### Linking cards to words

- Link a higher-level card to every word occurrence that participates in its target structure, so selecting any participating word offers that card.
- Link it only to those participating words. Do not attach it to neighboring words merely because they provide sentence context.
- Reuse the same card across occurrences and comics when the learning target is the same.
- Do not reveal whole-sentence or whole-bubble translations in the learning flow. The learner should infer the sentence from the comic and only the specific cards they choose to open.

### Writing a card

- Use a canonical, generalized Spanish prompt.
- For every reusable grammar or expression card, add a plain-English question that makes sense to a learner with no prior Spanish grammar vocabulary. The question—not unexplained notation—should be the card front.
- Give a concise English answer, followed by a jargon-free explanation of how the rule works. Define any unavoidable grammar term in plain language.
- Give every grammar or expression card a short, invented Spanish example and an English translation. The example must be generic and reusable, not copied from a comic.
- Keep reusable grammar and expression explanations occurrence-independent. Never put “Comic example” text, a strip title, a bubble translation, or another comic-specific detail in those `LearningCard` records. A deliberately joke-specific concept card may explain the joke it represents, but it must not masquerade as a reusable language rule.
- Store the exact Spanish fragment and the explanation of how the rule applies there in a separate `CardApplication` attached to the comic occurrence.
- Link a `CardApplication` to every and only the participating word occurrences. It is display-only: schedule and persist the shared `cardId`, never the application ID.
- In the UI, show contextual application copy only after that shared card is opened, under “In this comic.” Never reveal the entire sentence or bubble translation.
- Give each card a stable, target-specific ID and an occurrence pattern that identifies the exact participating tokens.

Before adding or retaining a higher-level card, ask:

1. Will the learner encounter or reuse this target beyond this sentence?
2. Does it teach more than the component words already teach?
3. Is it one atomic target?
4. Is the prompt generalized rather than copied from the strip?
5. Is it linked to every and only the participating words?
6. Does an existing card already teach it?
7. Can a complete beginner understand the question, explanation, and example without unexplained terminology?
8. Is all comic-specific application copy stored outside the shared card?

If the answer to a relevant question is no, omit or refactor the card.

## Implementation and validation

- Preserve direct per-word image hotspots and exact-card scheduling semantics.
- Keep content indexes deduplicated and validate that all cards are reachable.
- When the curriculum changes, reconcile or version persisted state so removed cards cannot affect scheduling.
- Update content counts and behavior descriptions in tests and documentation.
- Run `npm run typecheck`, `npm run lint`, `npm test`, and a production build after curriculum or interaction changes.
