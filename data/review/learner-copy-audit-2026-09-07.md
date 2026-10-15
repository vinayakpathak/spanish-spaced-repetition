# Learner-facing copy audit — September 7, 2026

## Outcome

Removed the separate “Spanish pattern”/“Spanish expression” panels and internal
classification badges. Grammar, expression, and concept cards now use English
questions in the learning view, My cards, priority previews, and completion
summaries. Word-card titles remain Spanish. Internal canonical patterns and tags
remain in the data for authoring and identification.

Updated 348 shared cards and 28 occurrence explanations:

| Kind | Cards updated | Purpose |
| --- | ---: | --- |
| Grammar | 95 | Replace hidden-template instructions and formula shorthand with direct English teaching. |
| Expression | 80 | Make explanations independent of the removed pattern panel. |
| Concept | 131 | Add 130 meaningful English questions; remove one hidden-prompt symbol aside. |
| Word | 42 | Remove internal card bookkeeping and clarify affected explanations. |

The occurrence-note changes remove internal linking commentary or shorthand.
They still explain only the selected fragment, not its containing sentence.

For the reported `tener que` lesson, the explanation now defines the verb's
dictionary form with `hablar`, `comer`, and `salir`, and explains `tengo que`
(“I have to”), `tienes que` (“you have to”), and `tiene que` (“he or she has to,”
or formal “you have to”). The existing invented example remains:
`Tengo que salir temprano.` — “I have to leave early.” There is no additional
Spanish-only instruction box to decode.

## Coverage and limits

- Individually read all 328 grammar cards and 599 expression cards. The full
  questions, answers, explanations, and examples were available during review.
  A second read checked the expression changes for teaching lost when the
  pattern panel disappears.
- Individually read the English teaching fields on all 208 concept cards.
  New English questions were checked against their existing answers; this was
  not a new factual audit of the concepts.
- Automatically scanned all 5,097 word cards (11,211 nonempty English fields).
  Manually inspected 97 flagged fields across 88 cards, with fuller records
  consulted for ambiguous cases. Unflagged word fields were not all read
  individually.
- Automatically scanned all 3,902 occurrence explanations and manually read
  103 candidate explanations. Unflagged applications were not all read
  individually.

The confirmed problems were hidden-template legends, formula shorthand,
Spanish placeholders presented as instructions, and internal curriculum
bookkeeping. Actual Spanish words, useful form changes, accents, bilingual
examples, and necessary mathematical notation were retained. This pass did
not re-evaluate the necessity of every concept card or certify every
translation. The existing AI-authored/internal-QA status is unchanged.

## Invariants and prevention

The corpus still has 258 comics, 6,232 shared cards, and 14,768 printed Spanish
word occurrences. This pass changes no card IDs, canonical patterns, printed
words, hotspots, application fragments, participants, or exact-card links.
All existing bilingual examples are unchanged. No scheduling or study-history
migration is introduced by this text-only pass.

Regression tests compare the pre-audit exact-card index, word/application
links, and bilingual examples against the rebuilt runtime. They also check
English fronts, safe English fallbacks, removed UI panels, and a narrow guard
against common hidden-template instructions. The authoring validator requires
English questions for all nonword cards. These checks supplement, rather than
replace, editorial judgment.

The seed copy revision is `reviewed-v3-20260907` so cached seed bundles refresh.
The runtime revision is regenerated from the updated content.

The companion `learner-copy-audit-2026-09-07.json` records each changed field's
previous and replacement copy, review coverage, and pre-audit invariant hashes.

## Validation

Typecheck, lint, the production build, all 132 tests, runtime corpus validation,
and `git diff --check` passed after the final copy changes. The existing local
preview was retained; no publishing or Git push was part of this pass.

## Later follow-up

After this text audit, the user requested removal of the Google+/Facebook
background-trivia card. That separate change reduces the catalog to 6,231 cards
and removes its three word links. The original audit counts and hashes above
remain historical evidence. `google-plus-card-removal-2026-09-07.json` records
the precise follow-up; regression tests account only for this explicit removal
when checking the original text-audit invariants.

The later `como-ser-lesson-2026-09-07.json` records one new reusable description
question lesson and its two participating word links, bringing the catalog back
to 6,232 cards. Tests undo only these explicit follow-up changes when comparing
the original text-audit hashes, and test the new lesson's links independently.
