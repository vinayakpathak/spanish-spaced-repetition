import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { validateCardReusePolicy } from "../scripts/lib/card-reuse-policy.mjs";
import {
  createSrsState, startComic, recordCardOpen, completeComic, hydrateSrsState,
  serializeSrsState, reconcileSrsState, scoreCardPriority, selectNextComic,
} from "../lib/srs.ts";

const read = async (path) => JSON.parse(await fs.readFile(new URL(path, import.meta.url), "utf8"));
const manifest = await read("../public/corpus/manifest.json");
const retirement = await read("../data/review/google-plus-card-removal-2026-09-07.json");
const policy = await read("../data/authoring/card-reuse-policy.json");
const target = manifest.comics.find(({ id }) => id === retirement.comicId);
const removedId = retirement.cardId;
const keptId = "word-no";
const now = 1_800_000_000_000;

test("Google+ keeps every language card but cannot offer or resurrect the trivia card", async () => {
  // The later cómo + ser lesson adds one language target, not the retired trivia.
  assert.equal(target.cardIds.length, 30);
  assert.equal(manifest.counts.cards, 6232);
  assert.ok(!manifest.cardCatalog.some(({ id }) => id === removedId));
  assert.ok(manifest.comics.every(({ cardIds }) => !cardIds.includes(removedId)));
  const bundle = await read(`../public/corpus/comics/${target.loadKey}.json`);
  assert.ok(!JSON.stringify(bundle).includes(removedId));
  assert.ok(policy.retiredCardIds.includes(removedId));
  assert.ok(validateCardReusePolicy([...manifest.cardCatalog, retirement.removedCard], policy)
    .some((error) => error.includes(removedId) && /retired/i.test(error)));
  assert.notEqual(manifest.revision, retirement.sourceManifestRevision);
});

for (const opened of [false, true]) {
  test(`removing ${opened ? "opened" : "unopened"} Google+ trivia archives evidence without changing language exposures`, () => {
    let before = startComic(createSrsState(), { ...target, cardIds: [...target.cardIds, removedId] }, now);
    if (opened) {
      before = recordCardOpen(before, removedId, now + 10);
      before = recordCardOpen(before, removedId, now + 15);
    }
    before = recordCardOpen(before, keptId, now + 20);
    const restored = reconcileSrsState(
      hydrateSrsState(serializeSrsState(before), now + 100), manifest.comics, now + 100,
    );
    assert.equal(restored.cards[removedId], undefined);
    assert.deepEqual(restored.archivedCards[removedId], before.cards[removedId]);
    assert.equal(scoreCardPriority(restored, removedId, now + 100).openCount, 0);
    assert.deepEqual(restored.activeSession.cardIds, target.cardIds);
    assert.deepEqual(restored.activeSession.openedCardIds, [keptId]);
    assert.equal(restored.activeSession.startedAtMs, before.activeSession.startedAtMs);
    assert.deepEqual(restored.comics, before.comics);
    for (const id of target.cardIds) assert.deepEqual(restored.cards[id], before.cards[id], id);
    assert.deepEqual(reconcileSrsState(restored, manifest.comics, now + 200), restored);
    assert.deepEqual(hydrateSrsState(serializeSrsState(restored), now + 200), restored);
    assert.deepEqual(recordCardOpen(restored, removedId, now + 200), restored);
    const resumed = selectNextComic(manifest.comics, restored, now + 200);
    assert.equal(resumed.reason, "resume");
    assert.deepEqual(resumed.state, restored);
  });
}

test("removing Google+ trivia preserves completed history and its read tombstone", () => {
  let before = startComic(createSrsState(), { ...target, cardIds: [...target.cardIds, removedId] }, now);
  before = recordCardOpen(before, removedId, now + 10);
  before = completeComic(before, now + 20);
  const restored = reconcileSrsState(
    hydrateSrsState(serializeSrsState(before), now + 100), manifest.comics, now + 100,
  );
  assert.deepEqual(restored.archivedCards[removedId], before.cards[removedId]);
  assert.equal(restored.cards[removedId], undefined);
  assert.deepEqual(restored.comics, before.comics);
  assert.equal(restored.comics[target.id].completions, 1);
  for (const id of target.cardIds) assert.deepEqual(restored.cards[id], before.cards[id], id);
  assert.notEqual(selectNextComic(manifest.comics, restored, now + 200).comic?.id, target.id);
});
