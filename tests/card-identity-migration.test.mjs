import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  completeComic,
  createSrsState,
  getCardHistory,
  getRecentlyOpenedCardIds,
  hydrateSrsState,
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
