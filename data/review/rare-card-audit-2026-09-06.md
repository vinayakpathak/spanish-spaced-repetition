# Rare-card curriculum audit

Date: 2026-09-06. Scope: the 258-comic runtime corpus at `4c986fe368ed3a4bb62816d820329486067295f1`, revision `runtime-83f207c27ab2a174`.

## Conclusion

The `bien` problem is systemic: the curriculum sometimes creates a new memory for a different example of the same word meaning or language rule. Other cards explain a visible joke or repeat ordinary word meanings without adding a durable lesson. There are also a few older, overly broad cards whose assignments overlap newer, narrower cards.

**Rarity is a review signal, not a deletion rule.** Most rare vocabulary still deserves a contextual word card, and many rare idioms, grammatical rules and external references are legitimate. The right objective is one shared identity per reusable learning target—not making every card artificially frequent.

This is an audit and proposal set. No curriculum, application links, scheduler, persisted study history, or published site was changed. Only this report and its companion audit data were added.

## Census and coverage

Frequency means **distinct comics containing an exact card ID**, not the number of printed occurrences, openings, or definition files. All 258 manifest card sets were independently checked against actual runtime word links; there were no discrepancies or unreachable catalog cards.

| Kind | All cards | In 1 comic | In 2 comics | Rare total |
| --- | ---: | ---: | ---: | ---: |
| Word | 5,231 | 3,829 | 664 | 4,493 |
| Grammar | 347 | 166 | 60 | 226 |
| Phrase/expression | 635 | 525 | 71 | 596 |
| Concept/context | 252 | 245 | 7 | 252 |
| **Total** | **6,465** | **4,765** | **802** | **5,567** |

Thus **86.1%** of all cards occur in at most two comics. That figure is not the percentage of bad cards.

For words:

- **3,176 rare word cards have no other card for the same written form.** Retain their coverage: a one-off word still needs a meaning card. Different inflections or accents must not be merged merely because they belong to the same dictionary entry.
- **1,317 rare word cards have same-written-form peers.** These are the main word-consolidation pool. Across all frequencies, 424 written forms have multiple IDs, involving 1,709 cards.
- The most fragmented forms include `a` (122 IDs), `de` (113), `en` (55), `se` (55), `por` (49), and `que` (45). These numbers are warning signs, not proposed targets for a one-card-per-spelling collapse.

For higher-level cards, the 1,074 rare-card verdicts are:

| Verdict | Grammar | Phrase | Concept | Total |
| --- | ---: | ---: | ---: | ---: |
| Retain target | 146 | 484 | 164 | 794 |
| Consolidation candidate | 55 | 41 | 3 | 99 |
| Rewrite teaching | 16 | 27 | 32 | 75 |
| Removal candidate | 4 | 42 | 53 | 99 |
| Resolve contextual uncertainty | 5 | 2 | 0 | 7 |

These are per-card primary verdicts, not projected numbers of deleted IDs. A consolidation can retain an existing ID, involve a frequent card, or require rewriting the survivor. Multiple findings can belong to one family.

The word review proposes **119 consolidation families: 89 high-confidence and 30 conditional**. They involve 302 distinct word IDs, including 222 rare ones. There are also 46 correction/context-review findings, often concerning mixed frequent baselines. These numbers are not additive: some cards appear in both a consolidation proposal and a correction finding.

Across all kinds, the ledger contains 176 proposal families: 119 word families and 57 higher-level families. One higher-level proposal decomposes a bundled lesson into existing independent rules rather than merging everything into one card.

### What was actually reviewed

- Every rare ID was inventoried and assigned a review disposition.
- All **347 grammar, 635 phrase, and 252 concept** teaching definitions were read, including questions, answers, explanations, and available examples. Frequent peers were included so a rare duplicate could be matched to an established target.
- All 424 multi-ID word families were comparatively screened. The 28 largest families—predominantly function words—received dedicated reviews: all 234 teaching definitions in 20 families were read, while the eight largest families had all 491 glosses screened and all 92 proposed members' full teaching and contextual evidence examined. The remaining definitions in those eight families were not all read in full. Proposed lexical-word consolidations were also checked against teaching and actual contextual excerpts.
- Context inspection was targeted, not a claim to have linguistically rechecked every one of the 14,768 printed word occurrences. Concept review examined runtime Spanish for 76 cases; phrase review directly checked applications for 114 rare IDs; grammar consolidation families include examined application excerpts.
- The 3,176 unique-form rare words were retained by the mandatory word-coverage rule, **not certified by an independent translation review**. A retain verdict means no demonstrated reason to remove that target in this granularity audit, not that every gloss or link is perfect.
- This did not include raster-image/OCR verification, a complete native-speaker edit, or external fact-checking of every scientific/historical concept. Specific correctness problems discovered during the audit are flagged below.

The companion [audit ledger](rare-card-audit-2026-09-06.json) contains every rare ID, comic counts and usage, review basis, rationale, confidence, related proposals, and detailed consolidation evidence. The appendix below summarizes proposals without turning them into executable aliases.

## Fix incorrect teaching before optimizing reuse

### 1. `lo abandona todo` is wrongly called nonstandard

`word-lo--nonstandard-subject-it` claims `lo` is an erroneous subject and tells the learner standard Spanish would omit it. In the actual fragment `LO ABANDONA TODO`, it is an object pronoun associated with `todo`, not the subject. The RAE explicitly recognizes object-pronoun doubling with `todo`, including the analogous example `Lo sé todo`. [RAE/ASALE, DPD, §5.2b](https://www.rae.es/dpd/pronombres%20personales%20%C3%A1tonos).

Recommendation: remove the false warning, reuse the appropriate object-`lo` word target, and explain the local `todo` relationship in an application. Do not preserve an invented error category just because it has its own history.

### 2. `el problema es que` is not standalone discourse `es que`

In *Beauty*, the words in `EL PROBLEMA DE LOS CIENTÍFICOS ES QUE` are linked to `word-es--fixed-es-que` and `word-que--fixed-es-que`. Their explanations treat them as the standalone explanatory expression `es que`. Here they are ordinary linking `es` plus the clause-introducing `que`.

Recommendation: correct the exact word links as part of removing `phrase-el-problema-es-que`; deleting only the extra phrase would leave misleading word help behind.

### 3. Some existing IDs cannot safely be merged wholesale

Examples found from actual contexts:

- `word-tipo` mixes **kind/type** and **guy**. Assign its occurrences to the corresponding existing targets; never alias its whole history to either one.
- `word-ir` mixes literal going with a program working/running and an outing expression.
- `word-estamos` already spans location and progressive-helper uses despite separate authored cards for those uses.
- `word-estaba--state` includes `estaba deseando`, so its name does not reliably identify every occurrence as a state rather than an ongoing action.
- `word-me--allowed-person` includes both a person being allowed to act and `DEJA QUE ME VAYA`, where `me` belongs with `irse`.
- Broad `de`, `del`, `como`, `para`, and some personal-object/recipient cards have similar mixed assignments; the word-family review identifies the affected IDs and contexts.

These need **occurrence reassignment followed by history reconciliation**, not a global spelling alias.

### 4. Resolve source/teaching disagreement instead of inventing a new sense

`phrase-dar-una-asignatura` teaches teaching a course, while its current comic application says the intended meaning is taking a course. This is flagged for source/regional-usage review, not approved for a blind merge or a new invented gloss.

Other local teaching fixes include removing irrelevant glosses from `word-dejé` (its occurrence is leaving the volume low, not stopping an action), `word-mayores` (greatest adventures, not older people), and the program-service use of `word-caerse` (going down, not a physically falling cat).

## The consolidation rule to use

Keep the **word's actual sense or reusable construction** on the shared card. Put the selected person, object, noun choice, sentence trigger, diagram/button setting, and smallest relevant Spanish fragment in `CardApplication` when they explain this occurrence.

Do not create a second scheduled memory merely because:

- `me`, `te`, or `les` identifies a different person;
- the adjective describes an idea rather than a question;
- a known noun is omitted, so English adds “one”;
- the same verb form appears after two different grammar triggers;
- the same instruction is printed in a diagram rather than a button;
- one compiler artifact stores a target as `phrase` and another as `grammar`.

Conversely, preserve genuinely different senses and constructions. Do not pool the noun `sal` (“salt”) with the command `sal` (“leave”), `rica` meaning tasty with wealthy, or past-existence `había` with auxiliary `había` meaning had. Keep different written inflections distinct even when their higher-level grammar/expression card is shared.

## Clear word-level examples

“Comics after” is the union of the members' comic sets, not their sum. These are identity proposals, not already-applied changes.

| Target | Current split | Proposed shared target | Comics after |
| --- | --- | --- | ---: |
| `intento` | Identical “I try; I attempt” teaching under two IDs | One present-tense attempt card | 4 |
| `gusta` | I-like / you-like / they-like | One liking sense; `me/te/les` explained locally | 6 |
| `había` | Two copies of past existence | One “there was/were” card; keep auxiliary had separate | 3 |
| `dónde` | Direct versus embedded question | One accented “where” word card | 6 |
| `partes` | Parts/areas of a table versus of the internet | One parts/areas meaning | 2 |
| `mucho` | Before `mejor` versus before `más` | One comparison-strengthening use | 2 |
| `tengas` | After possibility versus evaluation | One written form/possession meaning; grammar explains the trigger | 2 |
| `interesante` | Interesting versus “an interesting one” | One interesting card; application explains the omitted noun | 3 |
| `quiere` | Formal you / impersonal person / someone wants | One wanting meaning with the person clarified locally | 3 |
| `quería` | Past desire versus intended action | One past wanting/intention sense | 5 |
| `salir` | Come out versus go outside | One literal outward-movement sense | 2 |
| `buena` | Good idea versus good quality | One feminine good-quality card; attractive stays separate | 8 |

The `buena` pair is not itself rare; it was discovered while comparing the rarer senses against all peers. This is why the comparison must include frequent cards, too.

For common function words, consolidation must use **semantic roles**, not just identical English glosses. For example, per-unit `por` need not split for a time unit, and an affected-owner article need not split because the owner is me rather than you. But personal-object `a`, recipient `a`, direction `a`, and unrelated fixed idioms must not all become one vague “to/no separate word” memory.

The word-family appendix includes safe subgroups, tentative boundaries, and mixed cards requiring routing first. Very large generic baselines are deliberately not treated as safe survivors merely because they already exist.

## Clear grammar/expression examples

| Current fragmentation | Recommended target | Comics after |
| --- | --- | ---: |
| Diagram infinitive versus interface infinitive | The recently improved written-action-label lesson | 4 |
| `acabar + -ando/-iendo` under two IDs | One “end up doing” construction | 2 |
| `es + description + dictionary-form activity` under two IDs | One evaluation-of-an-activity construction | 4 |
| Two present-perfect-subjunctive cards | One helper-form-plus-completed-action lesson | 2 |
| `algo de` as a phrase versus grammar | One unspecified-amount construction | 3 |
| `tardar` with/without an explicit duration, across phrase/grammar | One `tardar … en …` construction | 4 |
| `hace mucho` versus a general elapsed-time card | Put `mucho` in the duration slot of the general card | 11 |
| `lo mejor` versus `lo + description` | Reuse the general unnamed-idea construction | 11 |
| `hacerse mayor` versus `hacerse + description` | Reuse the general change construction | 6 |
| `lo siento` versus `lo sentimos` | One apology expression explaining speaker-number variation | 6 |
| Explicit plural group + `les gusta` versus liking an activity | Reuse the activity-liking rule | 3 |

The word cards for `siento` and `sentimos` must **remain separate**: it is the reusable apology expression that is consolidated.

Some broader families need editorial judgment before merging: `sentirse mal` with a describing-word rule must preserve the fact that `mal` does not change to match gender/number; a `quizás` card must retain the choice between ordinary and special verb forms; attached versus preceding object words must not be combined into a front too large to recall. Those are marked medium confidence, not issued as automatic alias instructions.

## Cards that may not deserve a separate schedule

The higher-level review flags **99 removal candidates: 53 concepts, 42 phrases, and 4 grammar cards**. Of these, **67 are high-confidence recommendations and 32 are medium-confidence editorial candidates**.

### Clear plot-summary or duplicated concept cards

- The cooking-leftovers cycle repeats the flowchart's already labeled shopping, pizza, leftovers and delay steps.
- Seat-selection/cockpit explanation retells the visible click-and-result joke.
- General-problem overengineering restates passing salt versus constructing a general condiment system.
- Academia-versus-business, the impostor-timing setup, and the bee-orchid narrative similarly retell what the strip already explains.
- The tautology-club card repeats a definition already taught on `word-tautología`, then narrates the joke.
- `concept-python` repeats the programming-language identity already supplied by `word-python`. This does not imply removing the distinct `import antigravity` reference.

For 32 other concepts, a real missing reference is worth retaining but the teaching should be shortened or redirected away from the plot. The complete removal/rewrite lists are in the ledger.

### Compositional phrases and redundant lessons

Strong examples include `como dijiste`, `como puedes ver`, `el problema es que`, `supongo que`, `por alguna razón`, and the one-off helium-balloon noun phrase. Their cards currently add little beyond the exact word meanings and already-taught syntax.

`grammar-roto-participle` and `grammar-alguno-to-algun-before-masculine-noun` duplicate word-specific morphology that belongs on the relevant word cards. Preserve/strengthen that word teaching before removing the redundant grammar identity.

**Do not interpret the medium-confidence noun-phrase list as “delete every transparent phrase.”** The project explicitly allows conventional collocations. Items such as `agua potable`, `regalo de cumpleaños`, and `recortes de presupuesto` sit on that editorial boundary: keep them only if the card teaches a useful unit or usage choice beyond the components, not generic “noun + de + noun” filler. The first implementation batch should exclude these borderline cases.

## Rare cards that should stay

Examples of justified one-off learning targets include `a duras penas`, `a caballo`, `a pesar de`, and `a menudo`: their meanings/use are not recovered reliably from the component word translations. They should not be removed just because the current 258 strips contain one example.

Distinct reference knowledge such as the Spanish `11-S` abbreviation, a specific film allusion, or Dijkstra's algorithm may genuinely be needed and naturally occur rarely. Retain that missing knowledge without adding a plot synopsis. The proposed September-11 merge illustrates the boundary: reuse the date/reference lesson, rather than separately scheduling the particular generation-gap joke.

The spelling/form constraint also creates an expected vocabulary tail. `bata` as a lab coat and as a form of a flapping verb are legitimately different; singular/plural, accents, commands, and other printed forms should not disappear into a lemma-wide memory.

## Why the current checks did not prevent this

The authoring registry in `scripts/lib/manual-authoring.mjs` enforces one owner per **ID**, reachability, shape and linking rules. A new ID with slightly different copy still passes even when it teaches an existing target. `semanticQa.cardReuseAndSenseSplitsChecked` is a required author assertion, not a semantic comparison engine.

The existing word-reuse audit is useful but intentionally conservative: it groups shared spellings and detects identical teaching text. It currently reports one exact duplicate pair (`word-intento`, `word-intento--try`), already acknowledged in its baseline, and passes. Paraphrased duplicates, noun-specific wrappers, and cross-kind phrase/grammar duplication are not rejected by that exact-text check.

Recommended authoring changes:

1. Before creating an ID, compare the full same-form word family or reusable construction across **all** card kinds and comics. Include usage contexts and existing examples, not just ID search.
2. Require a brief reason for a new sense split: what meaning/decision differs, and why could an application not explain the local difference?
3. Give grammar/expression targets canonical generalized forms and compare those independently of `kind`. Keep their complete beginner-friendly teaching structure.
4. Maintain explicit reviewed merge/reassignment decisions and regression examples. Rarity and large same-form families should trigger review, never automatic collapse.
5. Keep the shared-card/application boundary enforced: no comic title, particular chart position, arbitrary example noun, or selected person's identity in shared teaching unless it is truly part of the target.

## Safe implementation sequence

1. **Correct false teaching and wrong occurrence links first.** Especially the false `lo` warning, ordinary `es que` misclassification, and mixed-sense baselines.
2. **Apply high-confidence consolidation families in coherent batches.** Rewrite the survivor first, relink every and only participating occurrence/application, then retire the old IDs. Preserve ordinary word coverage and word-first ordering.
3. **Remove high-confidence redundant higher-level cards**, preserving any indispensable word-level explanation. Keep medium-confidence collocations and concept-boundary cases for a separate decision.
4. **Migrate history safely.** The existing `bien` migration concatenates histories because those old IDs were in disjoint comics. That assumption fails here: the `gusta` variants overlap in a comic, and both apology cards already occur in *Going West*. Preserve every display/open timestamp, but retain one binary help outcome per canonical card per comic exposure. Do not double-weight it.
5. **Treat splits/reassignments separately from merges.** A mixed `word-tipo` history cannot all become guy or all become type. Use the historical comic/session context where it uniquely determines the correct destination; avoid inventing evidence where it does not.
6. Reconcile removed IDs and active-session summaries without creating a second exposure on resume. Preserve completed-comic tombstones and exact-card scheduling. Do not alias analytics targets into SRS identities.
7. Regenerate/validate the corpus, update counts/docs, and run `npm run typecheck`, `npm run lint`, `npm test`, and the production build after curriculum changes. Add fixed-history tests for same-session merges, open/unopened combinations, split routing, and removal during an active comic.

No final target card count is asserted: candidate families overlap, some survivors need broader teaching, and some apparent duplicates require splitting mixed assignments first. Reducing a count is not a substitute for improving what the learner remembers.

## Audit validation

The companion ledger records the source manifest SHA-256 (`bf8530d6864a7a2278f2eb1139370e6c035a6b2364afaca65ff087c740a1165a`). Validation checks every rare ID exactly once, exact distinct-comic counts, known proposal member/related IDs, independent runtime-link agreement, and an unchanged source manifest. This audit added review artifacts only; application tests/builds were not rerun because no curriculum or application code changed.

<!-- BEGIN GENERATED AUDIT APPENDIX -->

## Appendix: complete proposal index

Each key resolves to exact member IDs, teaching, evidence and caveats in the companion JSON. These are editorial proposals, not executable alias mappings. A count is the union of the currently assigned comic sets, not a promise that every occurrence will remain after contextual correction. An asterisk marks members already sharing a comic, which requires exposure deduplication during any history migration.

### Word consolidation families

119 proposal families; 89 high confidence. Medium-confidence entries remain conditional. Overlapping families are alternatives or need reconciliation, not additive reductions.

| Proposal key | Confidence | Shared target / action | Member IDs → comics |
| --- | --- | --- | ---: |
| `word-intento` | high | Reuse word-intento; compact I try / I attempt. | 2 → 4 |
| `word-partes` | high | One parts / areas card. | 2 → 2 |
| `word-habia-existence` | high | Reuse word-había--existential. | 2 → 3 |
| `word-donde-question` | high | One dónde interrogative card; direct/indirect use in applications. | 2 → 6 |
| `word-gusta` | high | One gusta card: is pleasing; expresses liking. Explain how me/te/le/etc identify who likes it; applications identify the person. | 3 → 6* |
| `word-tengas` | high | One tengas card, with trigger-specific explanations in grammar cards/applications. | 2 → 2 |
| `word-hiciera` | high | One hiciera form-and-meaning card; preserve purpose and whatever-I-did grammar lessons separately. | 2 → 2 |
| `word-podria` | medium | Consider one could / might card explicitly scoped to possibility, only after confirming that the modal distinction is preserved in teaching/applications. | 2 → 5 |
| `word-quiere` | high | One quiere wants / wants to card; local formal or impersonal application. | 3 → 3 |
| `word-frikis-noun` | high | One plural noun card, with informal register explained compactly. | 2 → 2 |
| `word-mucho-comparative` | high | Reuse the comparative-degree card for much / far before a comparison. | 2 → 2 |
| `word-queria` | high | One quería I wanted card; attempted writing is context, not an independent sense. | 2 → 5 |
| `word-quedan-remaining` | high | One remain / are left card; optional recipient application. | 2 → 2 |
| `word-haciendo` | high | One haciendo doing / making card; auxiliary vs by-doing explanations live with the respective grammar/application. | 2 → 5 |
| `word-descubierto` | high | One descubierto discovered card, with compact explanation distinguishing unchanged-after-haber and agreement in descriptions. | 2 → 3 |
| `word-interesante` | high | Reuse interesting; explain the understood noun in the application/omitted-noun grammar card. | 2 → 3 |
| `word-inferiores` | high | One inferiores lower card with the omitted noun explained locally. | 2 → 2 |
| `word-vaya-exclamation` | high | One wow / oh my card. | 2 → 5 |
| `word-algo-question` | high | One unspecified-thing card; en algo details in application. | 2 → 21 |
| `word-cierto-true` | high | One true / correct card. | 2 → 4 |
| `word-salir-out` | high | One salir to go/come out card. | 2 → 2 |
| `word-tierra-earth` | high | Merge into planet-earth and remove land from that shared answer. | 2 → 5 |
| `word-flujo-process` | high | One process/control flow card; code context in its application. | 2 → 3 |
| `word-todos-standalone` | high | One standalone todos all/everyone card with contextual group clarification. | 3 → 4 |
| `word-una-count` | high | Reuse one-quantity; keep the phrase lesson independent. | 3 → 7 |
| `word-no-no-solo` | high | Reuse no; teach no solo…sino… at higher level. | 2 → 138* |
| `word-solo-no-solo` | high | Reuse only / just; keep the paired contrast card. | 2 → 17 |
| `word-si-emphasis` | high | One emphatic sí card, optional que handled in application. | 2 → 3 |
| `word-bonito-evaluation` | high | One nice / lovely / neat evaluation card. | 2 → 4 |
| `word-estan-state` | high | Reuse the broad place/state card with a clearer canonical ID in a planned migration. | 2 → 9 |
| `word-prueba-test` | high | One test card, with the conventional phrase retained separately. | 2 → 2 |
| `word-buena-quality` | high | Reuse good-quality. | 2 → 8 |
| `word-eh-hesitation` | high | One hesitation card. | 2 → 13 |
| `word-normal` | high | One normal / ordinary card. | 2 → 6 |
| `word-esta-person` | high | One está state/location card with the formal addressee explained in its application. | 2 → 31 |
| `word-estar-copular` | high | One estar to be for state/location card. | 2 → 11 |
| `word-hay-existence` | high | One existence/presence hay card, with relative-clause interpretation in the application. | 2 → 23 |
| `word-paginas` | medium | One pages card; contextual application explains manual or web page. | 2 → 3 |
| `word-buena-skilled` | medium | Consider good including competence, while keeping the ser bueno en/para structure separate. | 2 → 6 |
| `word-escritura` | medium | Consider writing / typing as one broad production-of-text sense. | 2 → 2 |
| `word-nunca-ever` | medium | Consider one negative/limiting-context ever use with separately linked grammar explanations. | 2 → 2 |
| `function-a-1` | high | word-a--measurement | 2 → 5 |
| `function-a-2` | high | word-a--connect-target | 2 → 3 |
| `function-a-3` | high | word-a--personal-a | 6 → 39* |
| `function-a-4` | medium | word-a--experiencer | 5 → 8 |
| `function-a-5` | high | word-a--someter-complement | 2 → 2 |
| `function-a-6` | high | word-a--dedicar-target | 2 → 3 |
| `function-a-7` | medium | word-a--fixed-ponerse-a | 2 → 3 |
| `function-de-1` | high | word-de--after-parar | 2 → 2 |
| `function-de-2` | high | word-de--noun-classifier | 5 → 79* |
| `function-de-3` | high | word-de--partitive-group | 4 → 11 |
| `function-de-4` | high | word-de--fixed-antes-de-infinitive | 3 → 10 |
| `function-de-5` | high | word-de--fixed-es-hora-de-infinitive | 2 → 3 |
| `function-de-6` | medium | word-de--from | 2 → 24 |
| `function-en-1` | high | word-en--time-to-action | 2 → 4 |
| `function-en-2` | high | word-en--interest-complement | 2 → 2 |
| `function-en-3` | high | word-en--trust-complement | 2 → 3 |
| `function-en-4` | medium | word-en--into-opening | 3 → 5 |
| `function-en-5` | high | word-en--change-result | 2 → 5 |
| `function-se-1` | high | word-se--passive-unnamed-doer | 2 → 10 |
| `function-se-2` | high | word-se--intransitive-change | 3 → 9 |
| `function-se-3` | high | word-se--completive-reading | 2 → 3 |
| `function-se-4` | medium | word-se--impersonal | 2 → 5 |
| `function-por-1` | high | word-por--per-unit | 2 → 5 |
| `function-por-2` | high | word-por--cause | 2 → 14 |
| `function-por-3` | medium | word-por--communication-medium | 2 → 4 |
| `function-que-1` | high | word-que--clause-link | 7 → 105* |
| `function-para-1` | medium | word-para--applicability-target | 7 → 8 |
| `function-para-2` | medium | word-para--duration | 2 → 3 |
| `function-para-3` | high | word-para--skill-at | 2 → 2 |
| `function-para-4` | medium | word-para--enough-result | 2 → 3 |
| `function-para-5` | high | word-para--intended-recipient | 3 → 11 |
| `function-al-1` | high | word-al--personal-a-contraction | 4 → 11 |
| `function-me-1` | high | one speaker-experiencer me card | 6 → 9* |
| `function-me-2` | medium | word-me--indirect, with general affected-person/recipient teaching | 4 → 28 |
| `function-me-3` | high | one affected-owner me card | 2 → 2 |
| `function-me-4` | medium | word-me--pronominal-marker | 2 → 28 |
| `function-con-1` | high | word-con | 5 → 77* |
| `function-con-2` | high | one con linking related entities | 2 → 3 |
| `function-con-3` | medium | one connection-counterpart con | 2 → 2 |
| `function-del-1` | high | word-del--from-time | 2 → 4 |
| `function-del-2` | medium | word-del--of-the | 4 → 29 |
| `function-del-3` | medium | one classificatory de+el/no-separate-English-word card, or appropriate existing of-the relation | 2 → 3 |
| `function-le-1` | high | one singular experiencer le card | 4 → 6 |
| `function-le-2` | medium | one recipient/affected-person le card | 4 → 7 |
| `function-le-3` | high | one affected-owner/person le card | 2 → 3 |
| `function-le-4` | medium | one affected-entity le card after occurrence review | 3 → 10* |
| `function-la-1` | high | one la article with contextually identified owner | 3 → 3 |
| `function-la-2` | high | word-la--direct-object-feminine | 2 → 15 |
| `function-la-3` | medium | one la with understood feminine singular noun | 2 → 3 |
| `function-te-1` | high | word-te--pronominal-marker | 4 → 13 |
| `function-te-2` | high | word-te--indirect | 2 → 13 |
| `function-te-3` | high | one experiencer te card | 2 → 3 |
| `function-te-4` | medium | one literal-self/affected-self te card | 2 → 2 |
| `function-lo-1` | high | word-lo--object-pronoun | 2 → 42 |
| `function-más-1` | high | word-más--more | 2 → 40 |
| `function-más-2` | medium | one greatest-degree más card | 2 → 9 |
| `function-más-3` | medium | one negative-continuation/repetition más card | 2 → 4 |
| `function-ya-1` | high | word-ya--no-longer | 2 → 3 |
| `function-ya-2` | high | word-ya--already | 2 → 9 |
| `function-ya-3` | medium | one standalone acknowledgement ya card | 2 → 2 |
| `function-el-1` | high | one el before a contextually understood masculine named item/service | 4 → 5* |
| `function-el-2` | high | one el article with contextually identified owner | 2 → 3 |
| `function-el-3` | high | one el with an understood masculine singular noun | 2 → 3 |
| `function-como-1` | high | one role/category-assignment como card | 4 → 10 |
| `function-va-1` | medium | one nonliteral progress/function va card, together with only progress occurrences from word-va--goes-turns-out | 2 → 2 |
| `function-va-2` | medium | one departure/passing se va card | 2 → 2 |
| `function-los-1` | high | one los article with contextually identified owner/wearer | 3 → 4 |
| `function-los-2` | high | one los with an understood masculine/mixed plural noun | 2 → 3 |
| `function-qué-1` | high | word-qué--interrogative | 3 → 56* |
| `function-qué-2` | high | one qué component within qué tal | 2 → 3 |
| `function-qué-3` | medium | one exclamative qué card | 2 → 7 |
| `function-si-1` | high | one emphatic-objection si card | 2 → 2 |
| `function-si-2` | high | one conditional-precaution si component in por si (acaso) | 2 → 4 |
| `function-si-3` | high | word-si | 2 → 45* |
| `function-su-1` | high | one ordinary possessive su card | 7 → 28* |
| `function-es-1` | high | word-es with beginner-friendly present-ser explanation | 5 → 99* |
| `function-línea-1` | high | one communications-connection línea card | 2 → 2 |
| `function-línea-2` | medium | word-línea--drawn-line, if timeline remains separately taught as línea del tiempo | 2 → 2 |

### Grammar, expression and concept families

57 proposal families; 32 high confidence. Medium-confidence entries remain conditional. Overlapping families are alternatives or need reconciliation, not additive reductions.

| Proposal key | Confidence | Shared target / action | Member IDs → comics |
| --- | --- | --- | ---: |
| `grammar-G01` | high | grammar-acabar-gerundio | 2 → 2 |
| `grammar-G02` | high | grammar-es-adjective-infinitive | 2 → 4 |
| `grammar-G03` | high | grammar-hacer-object-adjective | 2 → 3 |
| `grammar-G04` | high | grammar-present-perfect-subjunctive | 2 → 2 |
| `grammar-G05` | high | grammar-aunque-imperfect-subjunctive-counterfactual | 2 → 2 |
| `grammar-G06` | high | grammar-bare-infinitive-diagram-label | 2 → 4 |
| `grammar-G07` | high | grammar-alguno-after-noun-negative | 2 → 2 |
| `grammar-G08` | high | grammar-indefinite-relative-subjunctive | 2 → 7 |
| `grammar-G09` | high | grammar-se-puede-infinitive | 2 → 3 |
| `grammar-G10` | high | grammar-tardar-en-infinitive | 2 → 4 |
| `grammar-G11` | high | grammar-gustar-infinitive | 2 → 3 |
| `grammar-G12` | high | grammar-informal-command | 2 → 16 |
| `grammar-G13` | high | grammar-parar-de-infinitive | 2 → 2 |
| `grammar-G14` | high | grammar-gerund-attached-pronominal-marker | 2 → 5 |
| `grammar-G15` | high | grammar-evaluative-subjunctive | 2 → 4 |
| `grammar-G16` | high | grammar-algo-de-quantity | 2 → 3 |
| `grammar-G17` | high | phrase-llamar-a-alguien | 2 → 2 |
| `grammar-G18` | medium | grammar-bare-infinitive-as-activity | 2 → 2 |
| `grammar-G19` | medium | grammar-deber-conditional-advice | 2 → 7 |
| `grammar-G20` | medium | grammar-esperar-que-subjunctive | 2 → 3 |
| `grammar-G21` | medium | grammar-si-imperfect-subjunctive-conditional-perfect | 2 → 2 |
| `grammar-G22` | medium | grammar-two-object-pronouns-before-finite-verb | 2 → 3 |
| `grammar-G23` | medium | grammar-quedar-remaining-quantity | 2 → 3 |
| `grammar-G24` | medium | grammar-saber-taste-experiencer | 2 → 2 |
| `grammar-G25` | medium | grammar-sentirse-adjective | 2 → 3 |
| `grammar-G26` | medium | phrase-tener-suerte | 2 → 2 |
| `grammar-G27` | medium | grammar-el-la-los-las-que-the-one | 2 → 5 |
| `grammar-G28` | medium | grammar-mas-que-comparison | 3 → 6 |
| `grammar-G29` | medium | grammar-mejor-que | 2 → 5 |
| `grammar-G30` | medium | grammar-subject-si-no-ellipsis | 2 → 3 |
| `grammar-G31` | medium | grammar-pasarse-time-gerund | 2 → 4 |
| `grammar-G32` | medium | grammar-quizas-indicative-possibility | 2 → 4 |
| `phrase-apology-person-variation` | high | phrase-lo-siento | 2 → 6* |
| `phrase-luchar-por-goal` | high | phrase-luchar-por-causa | 2 → 2 |
| `phrase-tratarse-topic` | high | phrase-tratarse-de-tema | 2 → 2 |
| `phrase-hace-elapsed-time` | high | grammar-hace-duration-ago | 2 → 11 |
| `phrase-lo-adjective` | high | grammar-lo-adjective-as-noun | 2 → 11 |
| `phrase-hacerse-state` | high | grammar-hacerse-adjective-change | 2 → 6 |
| `phrase-capaz-ability` | high | phrase-ser-capaz-de-infinitive | 2 → 3 |
| `phrase-someter-target` | medium | phrase-someter-algo-a | 2 → 2 |
| `phrase-por-deictic-place` | high | new generalized por + aquí/ahí/allí card | 2 → 3 |
| `phrase-o-algo-softening` | high | phrase-o-algo | 2 → 3 |
| `phrase-ahorrar-beneficiary` | medium | new generalized ahorrar + resource + beneficiary card | 2 → 2 |
| `phrase-salir-result` | medium | new generalized salir + result (optional beneficiary) card | 2 → 2 |
| `phrase-importar-negation` | high | grammar-importar-indirect-object | 2 → 3 |
| `phrase-en-cuanto-time` | medium | new en cuanto: habitual/factual versus awaited event card | 2 → 2 |
| `phrase-por-communication-channel` | medium | new por + communication channel card | 2 → 2 |
| `phrase-quedarse-state` | high | grammar-quedarse-state | 2 → 6 |
| `phrase-sufficient-amount` | high | grammar-suficiente-para-infinitive | 2 → 2 |
| `phrase-thought-causation` | high | Decompose into separate reusable lessons: reuse the two existing atomic cards | 3 → 3 |
| `phrase-pedir-request` | medium | new generalized pedir algo a alguien card | 2 → 2 |
| `phrase-ponerse-task-start` | medium | grammar-ponerse-a-infinitive broadened to starting a task | 2 → 3 |
| `phrase-ir-current-progress` | medium | new generalized ir describing current progress/position card | 3 → 3 |
| `phrase-igual-que-comparison` | medium | phrase-igual-que broadened to optional al | 2 → 2 |
| `concept-concept-11-s` | high | concept-11-s | 2 → 3 |
| `concept-concept-drake-equation` | high | concept-drake-equation | 2 → 1* |
| `concept-concept-flash-browser-games` | medium | concept-flash-browser-games | 2 → 2 |

### Deep-reviewed word-family policies

The family records in the JSON also name distinctions to retain and mixed IDs that need occurrence routing. A proposal in this table does not mean the entire surface family should become one card.

| Written form | Existing IDs | Rare IDs | Proposed subgroups | Flagged issue groups |
| --- | ---: | ---: | ---: | ---: |
| a | 122 | 106 | 7 | 1 |
| de | 113 | 83 | 6 | 1 |
| en | 55 | 45 | 5 | 1 |
| se | 55 | 49 | 4 | 3 |
| por | 49 | 40 | 3 | 2 |
| que | 45 | 31 | 1 | 0 |
| para | 30 | 25 | 5 | 2 |
| al | 22 | 17 | 1 | 2 |
| me | 20 | 15 | 4 | 3 |
| con | 19 | 17 | 3 | 1 |
| del | 19 | 16 | 3 | 3 |
| le | 17 | 12 | 4 | 3 |
| la | 14 | 10 | 3 | 1 |
| te | 14 | 11 | 4 | 1 |
| lo | 13 | 7 | 1 | 3 |
| más | 13 | 10 | 3 | 1 |
| ya | 13 | 9 | 3 | 1 |
| el | 12 | 10 | 3 | 0 |
| como | 10 | 6 | 1 | 1 |
| va | 10 | 9 | 2 | 1 |
| los | 8 | 5 | 2 | 0 |
| qué | 8 | 4 | 3 | 0 |
| si | 8 | 6 | 3 | 0 |
| su | 8 | 3 | 1 | 0 |
| bien | 7 | 4 | 0 | 2 |
| es | 7 | 2 | 1 | 1 |
| las | 7 | 5 | 0 | 1 |
| línea | 7 | 7 | 2 | 0 |

### Reading the per-card ledger

The `rareCards` array contains exactly one record for every card in one or two comics. `proposalKeys` and `issueKeys` link a card to consolidation and correction findings. `wordSurfaceFamilies` lists all 424 multi-ID spellings, including frequent peers. `reviewBasis` and `confidence` distinguish direct teaching/context review from structural retention and provisional comparative screening. A primary “keep” verdict can coexist with a family-level alternative; read the linked proposal before implementation.
