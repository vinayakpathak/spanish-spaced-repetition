import assert from "node:assert/strict";
import test from "node:test";
import {
  completeComic,
  createSrsState,
  getCardProgress,
  getLearnedTodayCardIds,
  hydrateSrsState,
  recordCardHelp,
  selectNextComic,
  startComic,
} from "../lib/srs.ts";

const comicA = { id: "a", cardIds: ["one", "two", "shared"] };
const comicB = { id: "b", cardIds: ["shared", "three"] };
const comicC = { id: "c", cardIds: ["one", "two", "three", "shared"] };

// A word hotspot can offer its own vocabulary card plus expression and grammar
// cards. Repeated IDs model one expression being attached to several words.
const wordMappedComic = {
  id: "word-mapped",
  cardIds: [
    "word-vienes",
    "phrase-venir-a-la-cama",
    "grammar-present-for-plan",
    "word-cama",
    "phrase-venir-a-la-cama",
  ],
};
const secondWordMappedComic = {
  id: "word-mapped-two",
  cardIds: ["word-otra", "phrase-venir-a-la-cama"],
};

test("opening a word or phrase without choosing a card records zero learned cards", () => {
  const state = startComic(createSrsState(), wordMappedComic);

  // Opening a hotspot is UI-only state. No SRS API is called until the learner
  // explicitly chooses one of that hotspot's related cards.
  assert.deepEqual(state.activeSession?.clickedCardIds, []);
  assert.deepEqual(getLearnedTodayCardIds(state), []);
  assert.equal(state.history.length, 0);
});

test("choosing one card related to a word records exactly one learned card", () => {
  let state = startComic(createSrsState(), wordMappedComic);
  state = recordCardHelp(state, "word-vienes");

  assert.deepEqual(state.activeSession?.clickedCardIds, ["word-vienes"]);
  assert.deepEqual(getLearnedTodayCardIds(state), ["word-vienes"]);
  assert.deepEqual(
    state.history.map((event) => [event.cardId, event.event]),
    [["word-vienes", "help"]],
  );
});

test("choosing the same related card twice still records one learned card", () => {
  let state = startComic(createSrsState(), wordMappedComic);
  state = recordCardHelp(state, "phrase-venir-a-la-cama");
  state = recordCardHelp(state, "phrase-venir-a-la-cama");

  assert.deepEqual(state.activeSession?.clickedCardIds, ["phrase-venir-a-la-cama"]);
  assert.deepEqual(getLearnedTodayCardIds(state), ["phrase-venir-a-la-cama"]);
  assert.equal(state.history.length, 1);
  assert.equal(getCardProgress(state, "phrase-venir-a-la-cama").encounters, 1);
});

test("choosing two different cards through one word records two learned cards", () => {
  let state = startComic(createSrsState(), wordMappedComic);
  state = recordCardHelp(state, "word-vienes");
  state = recordCardHelp(state, "grammar-present-for-plan");

  assert.deepEqual(
    new Set(state.activeSession?.clickedCardIds),
    new Set(["word-vienes", "grammar-present-for-plan"]),
  );
  assert.deepEqual(
    new Set(getLearnedTodayCardIds(state)),
    new Set(["word-vienes", "grammar-present-for-plan"]),
  );
  assert.equal(state.history.filter((event) => event.event === "help").length, 2);
});

test("finishing masters untouched eligible word cards but not selected related cards", () => {
  let state = startComic(createSrsState(), wordMappedComic);
  state = recordCardHelp(state, "phrase-venir-a-la-cama");
  state = completeComic(state);

  assert.equal(getCardProgress(state, "phrase-venir-a-la-cama").status, "learning");
  assert.equal(getCardProgress(state, "word-vienes").status, "mastered");
  assert.equal(getCardProgress(state, "word-cama").status, "mastered");
  assert.equal(getCardProgress(state, "grammar-present-for-plan").status, "mastered");
  assert.equal(
    state.history.filter(
      (event) =>
        event.cardId === "phrase-venir-a-la-cama" &&
        event.event === "independent-success",
    ).length,
    0,
  );
});

test("cards shared by several words and comics stay deduplicated", () => {
  let state = startComic(createSrsState(), wordMappedComic);
  assert.equal(
    state.activeSession?.eligibleCardIds.filter(
      (id) => id === "phrase-venir-a-la-cama",
    ).length,
    1,
  );

  state = recordCardHelp(state, "phrase-venir-a-la-cama");
  state = completeComic(state);
  state = startComic(state, secondWordMappedComic);
  state = recordCardHelp(state, "phrase-venir-a-la-cama");

  assert.equal(getCardProgress(state, "phrase-venir-a-la-cama").encounters, 1);
  assert.equal(
    state.history.filter(
      (event) =>
        event.cardId === "phrase-venir-a-la-cama" && event.event === "help",
    ).length,
    1,
  );
  assert.equal(
    getLearnedTodayCardIds(state).filter(
      (id) => id === "phrase-venir-a-la-cama",
    ).length,
    1,
  );
});

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

test("the atomic-card curriculum does not resume legacy schema-one sessions", () => {
  const legacy = {
    ...createSrsState(),
    schemaVersion: 1,
    cards: {
      "legacy-bubble-card": {
        ...getCardProgress(createSrsState(), "legacy-bubble-card"),
        status: "learning",
        dueDay: 1,
        lastHelpDay: 1,
      },
    },
    activeSession: {
      comicId: "a",
      startedDay: 1,
      eligibleCardIds: ["legacy-bubble-card"],
      clickedCardIds: ["legacy-bubble-card"],
    },
  };

  assert.deepEqual(hydrateSrsState(legacy), createSrsState());
});
