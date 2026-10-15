# Rare-card curriculum corrections — September 7, 2026

Implemented the approved high-confidence pass from `rare-card-audit-2026-09-06.md`.
Rarity is a review signal, not a reason by itself to delete a card or merge
different Spanish forms or meanings. All content remains explicitly
AI-authored/internal-QA, not human-verified.

## Result

| Measure | Before | After |
| --- | ---: | ---: |
| Comics | 258 | 258 |
| Printed word occurrences | 14,768 | 14,768 |
| Exact scheduled cards | 6,465 | 6,232 |
| Word cards | 5,231 | 5,097 |
| Grammar cards | 347 | 328 |
| Expression cards | 635 | 599 |
| Concept cards | 252 | 208 |
| Cards used by only one or two comics | 5,567 | 5,316 |

Every printed word, image, and hotspot coordinate was compared with the
pre-change Git source and is unchanged. A fingerprint regression test protects
that invariant. All cards remain reachable and the indexes are deduplicated.

## Applied decisions

- Consolidated 89 word-card families, using explicit reviewed identities, not
  automatic spelling or English-gloss matching. Contextual differences now
  live in exact word applications where useful.
- Consolidated 30 higher-level families: 29 grammar/expression families and
  the duplicate Drake-equation concept. In total, 177 additional obsolete IDs
  now point to reviewed survivors; the earlier three `bien` aliases remain.
- Removed all 67 high-confidence redundant higher-level targets from the
  audit. Also decomposed the bundled `hacer pensar en` lesson into existing
  atomic targets and removed redundant `sentarse con`. Three now-unused mixed
  word IDs were retired after routing their occurrences to the correct senses.
  Thus 72 targets are retired without a global alias.
- Authored or revised 178 target definitions, including 16 new exact targets
  needed to separate previously mixed meanings. This produces a net reduction
  of 233 cards, not a blanket deletion of rare vocabulary.
- Corrected misleading teaching and exact links, including ordinary object
  `lo` in `lo abandona todo`, recipient `a` in the naming example, experiencer
  `te` versus recipient `te`, impersonal `tratarse de`, and agreement with `se`
  and `poder`. Necessary lessons were preserved before redundant cards were
  removed, including `roto`, shortened `algún`, existence/availability `hay`,
  agreement, and purpose.
- Narrowed 16 retained concept explanations and pruned 39 unrelated word
  links. Technical/reference source checks and their limitations are recorded
  in the JSON ledger's `conceptSources` section.

Examples of reuse after correction:

| Written form | Shared card usage |
| --- | --- |
| `gusta` | One card, six comics; the person liking it belongs in the surrounding construction. |
| `dónde` | One card, six comics; direct and embedded location questions share the meaning. |
| `intento` | One card, four comics; the previous identical-content exception is removed. |
| `bien` | Seven genuinely distinct contextual cards remain; ordinary “well” still spans four comics. |
| `ir` | Movement, leaving, social outings, and a program working remain separate. |
| `tipo` | Kind/type, guy, and typeface remain separate. |

## Study history and cache safety

`lib/card-identity-migrations.generated.js` matches the explicit migration
section of the checked-in JSON ledger. It never uses spelling-wide aliases.
Native complete schema-v5 histories are the only histories restored.

- Safe aliases preserve all timestamps. When two old IDs occur in the same
  comic session, they become one exposure and one binary help outcome, with
  display/completion audit arrays retaining the original events.
- There are 88 per-comic history routes, including 12 ambiguous source/comic
  pairs. An ambiguous old open is archived rather than copied to multiple new
  senses. A corrected card then gathers its own fresh evidence.
- Original migrated records, removed records, and abandoned pending displays
  stay in `archivedCards`, outside priority scoring. An unopened abandoned
  display is never counted as success. Later completion cannot erase earlier
  timestamps when aliases are merged again.
- Contextual routes carry an introduction revision and run once per eligible
  release. Newly learned evidence under a retained source ID is not rerouted;
  ordered batches also handle a learner skipping an intermediate release.
- Resuming does not create another exposure. Completed comics retain their
  read tombstones and remain excluded from future selection.
- The older seed-bundle revision is now `reviewed-v2-20260907`, shared by the
  compiler and browser adapter, so force-cached `reviewed-v1` files cannot hide
  the curriculum update.

## Prevention and remaining review

The compiler now enforces `data/authoring/card-reuse-policy.json`. A new sense
for an existing written word, or any new higher-level target, needs a recorded
search, comparison IDs, and a substantive explanation of its distinct target.
Retired IDs cannot be silently reintroduced. Existing baseline IDs are not a
claim that their translations have all been freshly verified. The separate
identical-content audit now has no exceptions.

Medium-confidence word families and uncertain higher-level consolidations
remain unchanged. The complete deferral ledger is in the JSON report. Notable
boundaries:

- `rango de edad` retains its prior `de` link because its classification was
  not clear enough to force into the reviewed property-source meaning.
- The September 11 concept merge, a Primer-only rewrite, and title-text-only
  urushiol and named-malware rewrites need suitable participating reference
  anchors before their scope can change safely.
- Tolkien's precise blue-glow/orc convention was retained, but the new source
  check did not obtain a primary passage confirming every detail; that gap is
  recorded rather than upgraded to human verification.
- Remaining rare forms are not automatically mistakes. Different inflections,
  uncommon vocabulary, idioms, and genuinely necessary background can remain
  valid targets even in one comic.

## Validation

- Authoring validation: 254 files, 6,161 reachable authored cards, 14,501 words.
- Runtime validation: 258 comics, 6,232 cards, 14,768 words.
- Typecheck, lint, production build, and the complete test suite pass.
- Regression coverage includes exact geometry preservation, identity-ledger
  parity, retirement/reuse gates, ordinary versus distinct senses, exact
  application links, real Photos ambiguity, every migration timestamp edge
  case found in review, and completed-comic exclusion.

The machine-readable ledger is `curriculum-fixes-2026-09-07.json`; it includes
the original manifest SHA-256, full reviewed plans, chosen copy resolutions,
identity routes, factual sources, and deferred judgments.
