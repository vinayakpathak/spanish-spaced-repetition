# Project instructions

## Product and language

- Tira teaches Spanish to English speakers with Spanish-language xkcd comics.
- Keep the application UI and explanations in English. Keep comic text and Spanish learning prompts in Spanish.
- A learner records a help/open event only by opening that specific card. Merely selecting a word or reading a sentence must not record a card opening.

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

#### Required shape for reusable language cards

Apply this full teaching structure to both `grammar` and `phrase` cards. Do not give expression cards a lower standard merely because their stored kind is `phrase`.

1. **Front (`questionEn`)** — Ask one natural English question that states what the learner is trying to express or understand. Assume the learner knows no Spanish grammar terminology. Do not use raw notation such as `volver a + infinitivo` as the front.
2. **Short answer (`answerEn`)** — Give the usable rule or meaning in one or two plain sentences. For a productive construction, tell the learner what pieces to combine rather than only supplying an English translation.
3. **Explanation (`noteEn`)** — Explain why the construction works, which part changes, which part stays unchanged, and any important contrast or usage limit. Keep it reusable across comics.
4. **General example (`example`)** — Invent one short Spanish example that isolates this lesson, then provide its natural English translation. It must not be copied from a comic or depend on comic characters or events.
5. **Occurrence application (`CardApplication`)** — Separately store the smallest relevant Spanish fragment from the current comic and explain only how this shared lesson applies there. Do not translate or paraphrase the containing sentence or bubble.

Treat the learner as a complete beginner:

- Prefer ordinary descriptions such as “the verb's dictionary form” before introducing a label such as “infinitive.”
- Whenever a term such as *infinitive*, *subjunctive*, *preterite*, *imperfect*, *participle*, *conditional*, *pronoun*, *subject*, *object*, or *conjugate* is unavoidable, define it on that card and show a concrete Spanish form change.
- Never use a grammar term as its own explanation. For example, “use the subjunctive” is incomplete unless the card also explains why that form appears here and shows how an ordinary verb form changes.
- Explain notation in words. A learner should understand every `+`, arrow, slash, abbreviation, and placeholder used in the Spanish pattern after reading the card.
- Keep one card focused on one decision or reusable pattern. If the explanation needs two unrelated rules, split the card.
- Keep the answer short enough to recall; put teaching detail in the explanation rather than compressing it into dense jargon on the answer line.

For example, a `volver a + infinitivo` card should not stop at “to do something again” and “marks repetition.” Use this shape instead:

- Question: “How do you say that someone does something again?”
- Answer: “Use a form of `volver`, then `a`, then the action verb in its dictionary form.”
- Explanation: Define the dictionary form as the unchanged form ending in `-ar`, `-er`, or `-ir`; explain that only `volver` changes for the person and time.
- General example: `Marta vuelve a llamar.` — “Marta calls again.”
- Comic application: show only a relevant fragment such as `vuelve a ser` and explain how it instantiates the shared pattern; do not reveal the full bubble's meaning.

Straightforward word cards are the exception to this full shape: keep `cama → bed` compact. Add the full explanation/example treatment only when a word's contextual meaning hides grammar, morphology, idiomatic use, or a surprising difference from English.

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

## Continuous scheduling

- Scheduling is timestamp-based, not organized around simulated study days or daily due queues.
- Starting a successfully loaded comic creates one pending exposure for every distinct exact card ID in that comic. Resuming the same active comic must not create another exposure.
- Selecting a word or viewing its candidate-card list records no learning event. Expanding a specific card records that exact card's open timestamp.
- Machine-generated and unresolved cards participate fully in exposure history, priority scoring, comic selection, and importance scoring. Never exclude a card because its content still needs review. Mark it clearly as **Review needed** everywhere it appears, and do not imply that its Spanish token, English gloss, or contextual sense has been verified.
- Preserve every display and open timestamp. Repeated openings may remain in the audit history, but one comic exposure is one binary help outcome for priority scoring.
- An unopened exposure becomes successful only when the learner finishes the comic. Never infer success from an abandoned or merely restored session; an answer opened before abandonment remains valid difficulty evidence.
- Compute card priority continuously from recency-weighted help evidence, estimated memory stability, and forgetting risk. Keep formula constants named, documented, bounded, and covered by deterministic fixed-clock tests.
- Rank every genuinely new comic selection from the sum of its distinct exact-card priorities plus its normalized corpus importance score. Analytics target IDs used by comic importance must never replace or alias exact SRS card IDs.
- Normalize the two axes before combining them and expose the score breakdown in the UI. Permanently exclude every completed comic from later selection; completion is a read tombstone, not a one-step cooldown. When no unread comic remains, return and display an explicit collection-complete state instead of repeating a comic.
- Inject the current timestamp into pure scheduler functions; do not call the clock internally.
- Restore only native current-schema snapshots explicitly marked as complete timestamp history. Do not convert or import simulated-day histories, bounded legacy priors, or their associated opened-region UI state. Obsolete localStorage keys may be removed on a best-effort basis, but they must never overwrite or fall back into a fresh continuous-scheduler state.
