import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { CARD_IDENTITY_REVISION } from "../lib/card-identity-migrations.generated.js";
import {
  completeComic,
  createSrsState,
  getCardHistory,
  getRecentlyOpenedCardIds,
  hydrateSrsState,
  migrateCardIdentities,
  reconcileSrsState,
  recordCardOpen,
  scoreCardPriority,
  selectNextComic,
  serializeSrsState,
  startComic,
} from "../lib/srs.ts";

const NOW = Date.UTC(2026, 8, 6, 12);
const CANONICAL = "word-bien--well";
const RETIRED = [
  "word-bien--so-far-so-good",
  "word-bien--working-properly",
  "word-bien--well-played",
];
const comic = (id, cardId = CANONICAL) => ({ id, cardIds: [cardId] });

test("authored bien consolidation preserves all histories and is idempotent", () => {
  let before = createSrsState();
  const ids = [...RETIRED, CANONICAL, "word-bien--discourse"];
  ids.forEach((id, index) => {
    const at = NOW + index * 100;
    before = startComic(before, comic(`comic-${index}`, id), at);
    before = recordCardOpen(before, id, at + 10);
    before = recordCardOpen(before, id, at + 10); // Equal timestamps are events too.
    before = recordCardOpen(before, id, at + 20);
    before = completeComic(before, at + 30);
  });
  const serializedBefore = serializeSrsState(before);
  const after = hydrateSrsState(serializedBefore, NOW + 1_000);
  assert.deepEqual(
    getCardHistory(after, CANONICAL).exposures,
    [...RETIRED, CANONICAL].flatMap((id) => before.cards[id].exposures),
  );
  assert.ok(RETIRED.every((id) => !(id in after.cards)));
  assert.deepEqual(after.cards["word-bien--discourse"], before.cards["word-bien--discourse"]);
  assert.deepEqual(after.comics, before.comics);
  assert.equal(after.nextSessionId, before.nextSessionId);
  assert.equal(after.lastCompletedComicId, before.lastCompletedComicId);
  assert.deepEqual(hydrateSrsState(serializeSrsState(after), NOW + 2_000), after);
  assert.equal(serializeSrsState(before), serializedBefore, "migration is immutable");
  const score = scoreCardPriority(after, CANONICAL, NOW + 1_000);
  assert.equal(score.displayCount, 4);
  assert.equal(score.openCount, 12);
  assert.equal(score.completedDisplayCount, 4);
});

for (const oldId of RETIRED) {
  test(`an opened ${oldId} resumes as the shared card without another exposure`, () => {
    let before = startComic(createSrsState(), comic("active", oldId), NOW);
    before = recordCardOpen(before, oldId, NOW + 10);
    before = recordCardOpen(before, oldId, NOW + 20);
    const target = comic("active");
    const restored = reconcileSrsState(
      hydrateSrsState(serializeSrsState(before), NOW + 100), [target], NOW + 100,
    );
    const resumed = selectNextComic([target], restored, NOW + 200);
    assert.equal(resumed.reason, "resume");
    assert.deepEqual(resumed.state.activeSession, {
      ...before.activeSession, cardIds: [CANONICAL], openedCardIds: [CANONICAL],
    });
    assert.deepEqual(resumed.state.cards[CANONICAL], before.cards[oldId]);
    assert.deepEqual(resumed.state.comics, before.comics);
    assert.deepEqual(reconcileSrsState(restored, [target], NOW + 300), restored);
    assert.deepEqual(recordCardOpen(restored, oldId, NOW + 300), restored);
    const opened = recordCardOpen(restored, CANONICAL, NOW + 300);
    assert.deepEqual(opened.cards[CANONICAL].exposures[0].openedAtMs, [
      NOW + 10, NOW + 20, NOW + 300,
    ]);
    const finished = completeComic(opened, NOW + 400);
    assert.equal(scoreCardPriority(opened, CANONICAL, NOW + 300).recentOpenWeight, 1);
    assert.equal(scoreCardPriority(finished, CANONICAL, NOW + 400).completedDisplayCount, 1);
    assert.equal(selectNextComic([target], finished, NOW + 500).reason, "complete");
  });
}

test("an unopened migrated exposure remains pending until comic completion", () => {
  const before = startComic(createSrsState(), comic("active", RETIRED[0]), NOW);
  const target = comic("active");
  // Reconciliation also handles an in-memory current-schema state directly.
  const after = reconcileSrsState(before, [target], NOW + 100);
  assert.deepEqual(after.activeSession.openedCardIds, []);
  assert.deepEqual(after.cards[CANONICAL], before.cards[RETIRED[0]]);
  assert.equal(after.cards[CANONICAL].exposures[0].completedAtMs, null);
  assert.equal(scoreCardPriority(after, CANONICAL, NOW + 100).recentDisplayWeight, 0);
  const completed = completeComic(after, NOW + 200);
  assert.equal(scoreCardPriority(completed, CANONICAL, NOW + 200).recentDisplayWeight, 1);
});

test("migrated difficulty and completed-comic tombstones survive corpus reconciliation", () => {
  let before = startComic(createSrsState(), comic("removed-comic", RETIRED[1]), NOW);
  before = recordCardOpen(before, RETIRED[1], NOW + 10);
  before = completeComic(before, NOW + 20);
  const after = reconcileSrsState(
    hydrateSrsState(before, NOW + 100), [comic("still-unread")], NOW + 100,
  );
  assert.deepEqual(after.cards[CANONICAL], before.cards[RETIRED[1]]);
  assert.deepEqual(after.comics["removed-comic"], before.comics["removed-comic"]);
  const next = selectNextComic([comic("removed-comic"), comic("still-unread")], after, NOW + 200);
  assert.equal(next.comic.id, "still-unread");
});

test("authored ID corrections never admit obsolete or incomplete snapshots", () => {
  const current = startComic(createSrsState(), comic("old", RETIRED[0]), NOW);
  for (const invalid of [
    { ...current, schemaVersion: 3 },
    { ...current, schemaVersion: 4 },
    { ...current, historyCompleteness: "legacy-bounded" },
    { ...current, historyCompleteness: undefined },
  ]) {
    assert.deepEqual(hydrateSrsState(JSON.stringify(invalid), NOW + 100), createSrsState());
  }
});

test("removing the Drawing Stars joke card drops its saved help without changing language exposures", async () => {
  const removedId = "concept-drawing-five-point-star-failure";
  const [manifest, bundle] = await Promise.all([
    "../public/corpus/manifest.json",
    "../public/corpus/comics/es-xkcd-dibujar-estrellas.json",
  ].map(async (file) => JSON.parse(await fs.readFile(new URL(file, import.meta.url), "utf8"))));
  const target = manifest.comics.find(({ id }) => id === bundle.comic.id);
  assert.ok(!manifest.cardCatalog.some(({ id }) => id === removedId));
  assert.ok(manifest.comics.every(({ cardIds }) => !cardIds.includes(removedId)));
  assert.ok(!JSON.stringify(bundle).includes(removedId), "no candidate, application, or catalog link survives");

  // Reproduce the already-open card from the user's previous curriculum.
  let before = startComic(createSrsState(), {
    ...target, cardIds: [...target.cardIds, removedId],
  }, NOW);
  before = recordCardOpen(before, removedId, NOW + 10);
  before = recordCardOpen(before, CANONICAL, NOW + 20);
  const restored = reconcileSrsState(
    hydrateSrsState(serializeSrsState(before), NOW + 100), manifest.comics, NOW + 100,
  );
  assert.equal(restored.cards[removedId], undefined);
  assert.deepEqual(restored.activeSession.cardIds, target.cardIds);
  assert.deepEqual(restored.activeSession.openedCardIds, [CANONICAL]);
  assert.deepEqual(getRecentlyOpenedCardIds(restored, NOW + 100), [CANONICAL]);
  assert.deepEqual(restored.comics, before.comics);
  for (const id of target.cardIds) {
    assert.deepEqual(restored.cards[id], before.cards[id], id);
  }
  const resumed = selectNextComic(manifest.comics, restored, NOW + 200);
  assert.equal(resumed.reason, "resume");
  assert.deepEqual(resumed.state, restored, "no new display or learning event on resume");
  assert.deepEqual(recordCardOpen(restored, removedId, NOW + 300), restored);
  const completed = completeComic(restored, NOW + 300);
  assert.equal(completed.comics[target.id].completions, 1);
  assert.equal(completed.cards[removedId], undefined);
});

const QA_REV = CARD_IDENTITY_REVISION + 100;

test("removing an active occurrence archives its unopened display without scoring it", () => {
  const before = startComic(createSrsState(), {
    id: "qa-active", cardIds: ["qa-kept", "qa-still-global"],
  }, NOW);
  const corpus = [
    { id: "qa-active", cardIds: ["qa-kept"] },
    { id: "qa-other", cardIds: ["qa-still-global"] },
  ];
  const after = reconcileSrsState(before, corpus, NOW + 10);

  assert.equal(after.cards["qa-still-global"], undefined);
  assert.deepEqual(
    after.archivedCards["qa-still-global"],
    before.cards["qa-still-global"],
  );
  assert.equal(
    scoreCardPriority(after, "qa-still-global", NOW + 10).recentDisplayWeight, 0,
  );
  assert.deepEqual(after.activeSession.cardIds, ["qa-kept"]);
  assert.deepEqual(reconcileSrsState(after, corpus, NOW + 20), after);
  assert.deepEqual(hydrateSrsState(serializeSrsState(after), NOW + 30), after);
});

test("hydration archives orphan pending timestamps without inventing success", () => {
  let before = startComic(createSrsState(), {
    id: "qa-orphan", cardIds: ["qa-opened", "qa-unopened"],
  }, NOW);
  before = recordCardOpen(before, "qa-opened", NOW + 10);
  // A current-schema snapshot can have evidence whose active session is absent.
  before = { ...before, activeSession: null };
  const after = hydrateSrsState(serializeSrsState(before), NOW + 20);

  assert.deepEqual(after.archivedCards["qa-opened"], before.cards["qa-opened"]);
  assert.deepEqual(after.archivedCards["qa-unopened"], before.cards["qa-unopened"]);
  assert.equal(after.cards["qa-unopened"], undefined);
  assert.equal(after.cards["qa-opened"].exposures[0].completedAtMs, NOW + 10);
  assert.equal(
    scoreCardPriority(after, "qa-unopened", NOW + 20).recentDisplayWeight, 0,
  );
  assert.equal(scoreCardPriority(after, "qa-opened", NOW + 20).openCount, 1);
  assert.equal(after.nextSessionId, before.nextSessionId);
  assert.deepEqual(hydrateSrsState(serializeSrsState(after), NOW + 30), after);
});

test("abandoning an unavailable comic preserves both pending audit records", () => {
  let before = startComic(createSrsState(), {
    id: "qa-gone", cardIds: ["qa-opened", "qa-unopened"],
  }, NOW);
  before = recordCardOpen(before, "qa-opened", NOW + 10);
  const selected = selectNextComic([
    { id: "qa-next", cardIds: ["qa-next-card"] },
  ], before, NOW + 20);
  const after = selected.state;

  assert.equal(selected.comic.id, "qa-next");
  assert.deepEqual(after.archivedCards["qa-opened"], before.cards["qa-opened"]);
  assert.deepEqual(after.archivedCards["qa-unopened"], before.cards["qa-unopened"]);
  assert.equal(after.cards["qa-unopened"], undefined);
  assert.equal(scoreCardPriority(after, "qa-opened", NOW + 20).openCount, 1);
  assert.equal(after.comics["qa-gone"].completions, 0);
});

test("a new actual completion survives a second same-session alias merge", () => {
  let state = startComic(createSrsState(), {
    id: "qa-overlap", cardIds: ["qa-old", "qa-target", "qa-third"],
  }, NOW);
  state = recordCardOpen(state, "qa-old", NOW + 10);
  state = recordCardOpen(state, "qa-third", NOW + 20);

  // Earlier curriculum pruning closes opened old observations while target
  // remains pending. All IDs still exist somewhere in the collection.
  state = reconcileSrsState(state, [
    { id: "qa-overlap", cardIds: ["qa-target"] },
    { id: "qa-elsewhere", cardIds: ["qa-old", "qa-third"] },
  ], NOW + 25);
  state = migrateCardIdentities(state, {
    revision: QA_REV,
    merges: [["qa-old", "qa-target"]],
    comicRoutes: [],
    retiredCardIds: [],
  });
  assert.equal(state.cards["qa-target"].exposures[0].completedAtMs, null);
  state = completeComic(state, NOW + 30);
  assert.deepEqual(
    state.cards["qa-target"].exposures[0].completedAtHistoryMs,
    [NOW + 10, NOW + 30],
  );

  const after = migrateCardIdentities(state, {
    revision: QA_REV + 1,
    merges: [["qa-old", "qa-target"], ["qa-third", "qa-target"]],
    comicRoutes: [],
    retiredCardIds: [],
  });
  const exposure = after.cards["qa-target"].exposures[0];
  assert.equal(exposure.completedAtMs, NOW + 30);
  assert.deepEqual(exposure.completedAtHistoryMs, [NOW + 10, NOW + 20, NOW + 30]);
  assert.deepEqual(exposure.openedAtMs, [NOW + 10, NOW + 20]);
  assert.equal(scoreCardPriority(after, "qa-target", NOW + 30).displayCount, 1);
  assert.deepEqual(hydrateSrsState(serializeSrsState(after), NOW + 40), after);
});

test("same-comic fresh evidence under a retained source ID is not routed twice", () => {
  const migration = {
    revision: QA_REV, merges: [], retiredCardIds: [],
    comicRoutes: [{
      cardId: "qa-mixed", comicId: "qa-same",
      targetCardId: null, introducedRevision: QA_REV,
    }],
  };
  let before = startComic({
    ...createSrsState(), cardIdentityRevision: QA_REV - 1,
  }, { id: "qa-same", cardIds: ["qa-mixed"] }, NOW);
  before = recordCardOpen(before, "qa-mixed", NOW + 10);

  const routed = migrateCardIdentities(before, migration);
  assert.equal(routed.cards["qa-mixed"], undefined);
  assert.deepEqual(routed.archivedCards["qa-mixed"], before.cards["qa-mixed"]);
  assert.deepEqual(routed.activeSession.openedCardIds, []);

  // Same active comic, not a new unrouted comic. The corrected meaning
  // deliberately retains the old stable ID for one actual occurrence.
  let fresh = reconcileSrsState(routed, [
    { id: "qa-same", cardIds: ["qa-mixed", "qa-kind"] },
  ], NOW + 20);
  fresh = recordCardOpen(fresh, "qa-mixed", NOW + 30);
  assert.deepEqual(fresh.cards["qa-mixed"].exposures[0].openedAtMs, [NOW + 30]);
  assert.deepEqual(migrateCardIdentities(fresh, migration), fresh);
  assert.deepEqual(hydrateSrsState(serializeSrsState(fresh), NOW + 40), fresh);

  // A later overall release must not rerun the route introduced in QA_REV.
  const later = migrateCardIdentities(fresh, { ...migration, revision: QA_REV + 1 });
  assert.deepEqual(later.cards, fresh.cards);
  assert.deepEqual(later.archivedCards, fresh.archivedCards);
  assert.deepEqual(later.activeSession, fresh.activeSession);
  assert.equal(later.cardIdentityRevision, QA_REV + 1);
  assert.equal(scoreCardPriority(later, "qa-mixed", NOW + 40).openCount, 1);
});

test("skipping two contextual releases applies each eligible route stage once", () => {
  let before = startComic({
    ...createSrsState(), cardIdentityRevision: QA_REV - 1,
  }, { id: "qa-stages", cardIds: ["qa-mixed"] }, NOW);
  before = recordCardOpen(before, "qa-mixed", NOW + 10);
  const migration = {
    revision: QA_REV + 1, merges: [], retiredCardIds: [],
    comicRoutes: [
      {
        cardId: "qa-mixed", comicId: "qa-stages",
        targetCardId: "qa-stage-a", introducedRevision: QA_REV,
      },
      {
        cardId: "qa-stage-a", comicId: "qa-stages",
        targetCardId: "qa-stage-b", introducedRevision: QA_REV + 1,
      },
    ],
  };
  const after = migrateCardIdentities(before, migration);
  assert.equal(after.cards["qa-mixed"], undefined);
  assert.equal(after.cards["qa-stage-a"], undefined);
  assert.deepEqual(after.cards["qa-stage-b"], before.cards["qa-mixed"]);
  assert.deepEqual(after.activeSession.cardIds, ["qa-stage-b"]);
  assert.deepEqual(after.activeSession.openedCardIds, ["qa-stage-b"]);
  assert.deepEqual(migrateCardIdentities(after, migration), after);
});

const TEST_MIGRATION = {
  revision: CARD_IDENTITY_REVISION + 1,
  merges: [["old-like", "shared-like"], ["other-like", "shared-like"]],
  comicRoutes: [],
  retiredCardIds: [],
};

test("same-comic aliases preserve every event but score as one binary outcome", () => {
  const target = { id: "overlap", cardIds: ["old-like", "other-like", "shared-like"] };
  let before = startComic(createSrsState(), target, NOW);
  before = recordCardOpen(before, "old-like", NOW + 10);
  before = recordCardOpen(before, "other-like", NOW + 10);
  before = recordCardOpen(before, "shared-like", NOW + 20);
  before = completeComic(before, NOW + 30);
  // All display times survive even if an older content revision introduced a
  // second exact card after the session had already begun.
  before.cards["other-like"].exposures[0].displayedAtMs = NOW + 1;
  const serialized = serializeSrsState(before);
  const after = migrateCardIdentities(before, TEST_MIGRATION);
  const history = after.cards["shared-like"].exposures;
  assert.equal(history.length, 1);
  assert.deepEqual(history[0].displayedAtHistoryMs, [NOW, NOW, NOW + 1]);
  assert.deepEqual(history[0].openedAtMs, [NOW + 10, NOW + 10, NOW + 20]);
  assert.deepEqual(history[0].completedAtHistoryMs, [NOW + 30, NOW + 30, NOW + 30]);
  assert.equal(history[0].completedAtMs, NOW + 30);
  const score = scoreCardPriority(after, "shared-like", NOW + 30);
  assert.equal(score.displayCount, 1);
  assert.equal(score.openCount, 3);
  assert.equal(score.completedDisplayCount, 1);
  assert.equal(score.lastDisplayedAtMs, NOW + 1);
  assert.equal(score.recentOpenWeight, score.recentDisplayWeight);
  assert.deepEqual(after.archivedCards["old-like"], before.cards["old-like"]);
  assert.deepEqual(after.archivedCards["other-like"], before.cards["other-like"]);
  assert.deepEqual(after.comics, before.comics);
  assert.deepEqual(migrateCardIdentities(after, TEST_MIGRATION), after);
  assert.deepEqual(hydrateSrsState(serializeSrsState(after), NOW + 100), after);
  assert.equal(serializeSrsState(before), serialized);
});

test("merged pending aliases resume without extra exposure or inferred success", () => {
  for (const opened of [false, true]) {
    let before = startComic(createSrsState(), { id: "overlap", cardIds: ["old-like", "shared-like"] }, NOW);
    if (opened) before = recordCardOpen(before, "old-like", NOW + 10);
    const after = migrateCardIdentities(before, TEST_MIGRATION);
    const target = { id: "overlap", cardIds: ["shared-like"] };
    const resumed = selectNextComic([target], after, NOW + 20);
    assert.equal(resumed.reason, "resume");
    assert.deepEqual(resumed.state, after);
    assert.deepEqual(after.activeSession.cardIds, ["shared-like"]);
    assert.deepEqual(after.activeSession.openedCardIds, opened ? ["shared-like"] : []);
    assert.equal(after.cards["shared-like"].exposures.length, 1);
    assert.equal(after.cards["shared-like"].exposures[0].completedAtMs, null);
    assert.equal(scoreCardPriority(after, "shared-like", NOW + 20).recentDisplayWeight > 0, opened);
    const finished = completeComic(after, NOW + 30);
    assert.equal(scoreCardPriority(finished, "shared-like", NOW + 30).displayCount, 1);
    assert.equal(selectNextComic([target], finished, NOW + 40).reason, "complete");
  }
});

test("mixed-card history routes only by known comic context and archives ambiguity", () => {
  const migration = {
    revision: CARD_IDENTITY_REVISION + 1, merges: [], retiredCardIds: [],
    comicRoutes: [
      { cardId: "mixed", comicId: "kind-only", targetCardId: "kind" },
      { cardId: "mixed", comicId: "guy-only", targetCardId: "guy" },
      { cardId: "mixed", comicId: "both", targetCardId: null },
    ],
  };
  let before = createSrsState();
  for (const [index, id] of ["kind-only", "guy-only", "both"].entries()) {
    before = startComic(before, { id, cardIds: ["mixed"] }, NOW + index * 100);
    before = recordCardOpen(before, "mixed", NOW + index * 100 + 10);
    before = completeComic(before, NOW + index * 100 + 20);
  }
  const after = migrateCardIdentities(before, migration);
  assert.equal(after.cards.kind.exposures.length, 1);
  assert.equal(after.cards.guy.exposures.length, 1);
  assert.equal(after.cards.mixed, undefined);
  assert.deepEqual(after.archivedCards.mixed, before.cards.mixed);
  assert.deepEqual(after.comics, before.comics);
  assert.equal(getRecentlyOpenedCardIds(after, NOW + 250).includes("mixed"), false);
  assert.deepEqual(migrateCardIdentities(after, migration), after);
  // "mixed" may still be a valid card for one of the corrected occurrences.
  // Future evidence must not be routed/archived a second time.
  const current = startComic(after, { id: "fresh", cardIds: ["mixed"] }, NOW + 300);
  const withFresh = recordCardOpen(current, "mixed", NOW + 310);
  assert.deepEqual(migrateCardIdentities(withFresh, migration), withFresh);
});

test("retired-card evidence stays auditable without influencing scheduling", () => {
  let before = startComic(createSrsState(), { id: "active", cardIds: ["kept", "retired"] }, NOW);
  before = recordCardOpen(before, "retired", NOW + 10);
  const migration = { revision: CARD_IDENTITY_REVISION + 1, merges: [], comicRoutes: [], retiredCardIds: ["retired"] };
  const after = migrateCardIdentities(before, migration);
  assert.equal(after.cards.retired, undefined);
  assert.deepEqual(after.archivedCards.retired, before.cards.retired);
  assert.deepEqual(after.activeSession.cardIds, ["kept"]);
  assert.deepEqual(after.activeSession.openedCardIds, []);
  assert.equal(scoreCardPriority(after, "retired", NOW + 20).displayCount, 0);
  assert.deepEqual(hydrateSrsState(serializeSrsState(after), NOW + 30), after);
});
