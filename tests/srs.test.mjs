import assert from "node:assert/strict";
import test from "node:test";
import {
  completeComic,
  createSrsState,
  getCardProgress,
  hydrateSrsState,
  recordCardHelp,
  selectNextComic,
  startComic,
} from "../lib/srs.ts";

const comicA = { id: "a", cardIds: ["one", "two", "shared"] };
const comicB = { id: "b", cardIds: ["shared", "three"] };
const comicC = { id: "c", cardIds: ["one", "two", "three", "shared"] };

test("asking for help creates a one-day learning review and is idempotent", () => {
  let state = startComic(createSrsState(), comicA);
  state = recordCardHelp(state, "one");
  const once = state;
  state = recordCardHelp(state, "one");
  assert.deepEqual(state, once);
  assert.equal(getCardProgress(state, "one").status, "learning");
  assert.equal(getCardProgress(state, "one").dueDay, 2);
  assert.equal(state.history.filter((event) => event.cardId === "one").length, 1);
});

test("finishing graduates untouched new cards and preserves clicked learning cards", () => {
  let state = startComic(createSrsState(), comicA);
  state = recordCardHelp(state, "one");
  state = completeComic(state);
  assert.equal(getCardProgress(state, "one").status, "learning");
  assert.equal(getCardProgress(state, "one").dueDay, 2);
  assert.equal(getCardProgress(state, "two").status, "mastered");
  assert.equal(getCardProgress(state, "two").dueDay, 15);
  assert.equal(getCardProgress(state, "shared").status, "mastered");
  assert.equal(state.comics.a.completions, 1);
  assert.equal(state.activeSession, null);
});

test("same-day help wins over a later independent success", () => {
  let state = startComic(createSrsState(), comicA);
  state = recordCardHelp(state, "shared");
  state = completeComic(state);
  state = startComic(state, comicB);
  state = completeComic(state);
  assert.equal(getCardProgress(state, "shared").status, "learning");
  assert.equal(getCardProgress(state, "shared").dueDay, 2);
  assert.equal(state.history.filter((event) => event.cardId === "shared").length, 1);
});

test("later same-day help fully replaces an earlier independent success", () => {
  let state = startComic(createSrsState(), comicA);
  state = completeComic(state);
  state = startComic(state, comicB);
  state = recordCardHelp(state, "shared");

  const progress = getCardProgress(state, "shared");
  assert.equal(progress.status, "learning");
  assert.equal(progress.dueDay, 2);
  assert.equal(progress.encounters, 1);
  assert.equal(progress.lapses, 0);
  assert.equal(progress.ease, 2.3);
  assert.deepEqual(
    state.history.filter((event) => event.cardId === "shared").map((event) => event.event),
    ["help"],
  );
});

test("selection maximizes distinct due-card overlap before tie-breakers", () => {
  let state = startComic(createSrsState(), comicC);
  state = recordCardHelp(state, "one");
  state = recordCardHelp(state, "two");
  state = recordCardHelp(state, "three");
  state = completeComic(state);
  const selected = selectNextComic([comicA, comicB, comicC], state);
  assert.equal(selected.advancedDays, 1);
  assert.equal(selected.comic.id, "c");
  assert.deepEqual(new Set(selected.overlapCardIds), new Set(["one", "two", "three"]));
});

test("selection prefers unviewed curriculum material before simulating time", () => {
  let state = startComic(createSrsState(), comicA);
  state = completeComic(state);
  const selected = selectNextComic([comicA, comicB], state);
  assert.equal(selected.comic.id, "b");
  assert.equal(selected.reason, "new");
  assert.equal(selected.advancedDays, 0);
});

test("orphan due cards cannot block unseen curriculum selection", () => {
  const state = createSrsState();
  state.cards.orphan = {
    status: "learning",
    intervalDays: 1,
    ease: 2.3,
    dueDay: 1,
    successStreak: 0,
    lapses: 0,
    encounters: 1,
    lastReviewedDay: 1,
    lastHelpDay: 1,
  };
  const selected = selectNextComic([comicA, comicB], state);
  assert.equal(selected.comic.id, "a");
  assert.equal(selected.reason, "new");
  assert.deepEqual(selected.dueCardIds, []);
});

test("restored active sessions are deduplicated and constrained to their comic", () => {
  const state = createSrsState();
  state.activeSession = {
    comicId: "a",
    startedDay: 1,
    eligibleCardIds: ["one", "one", "ghost"],
    clickedCardIds: ["shared", "ghost", "shared"],
  };
  const selected = selectNextComic([comicA, comicB], state);
  assert.deepEqual(selected.state.activeSession?.eligibleCardIds, ["one"]);
  assert.deepEqual(selected.state.activeSession?.clickedCardIds, ["shared"]);
});

test("hydration rejects malformed state without throwing", () => {
  assert.deepEqual(hydrateSrsState("not json"), createSrsState());
  assert.deepEqual(hydrateSrsState({ schemaVersion: 99 }), createSrsState());
});
