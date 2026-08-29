import assert from "node:assert/strict";
import test from "node:test";
import {
  completeComic,
  createSrsState,
  getCardHistory,
  getCardProgress,
  getRecentlyOpenedCardIds,
  hydrateSrsState,
  rankComics,
  reconcileSrsState,
  recordCardOpen,
  scoreCardPriority,
  selectNextComic,
  serializeSrsState,
  startComic,
} from "../lib/srs.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 29, 12);

const comic = (id, cardIds, importance = 0) => ({
  id,
  cardIds,
  importance: { score: importance },
});

function expose(state, targetComic, displayedAtMs, openedAtMs = []) {
  let next = startComic(state, targetComic, displayedAtMs);
  for (const openedAt of openedAtMs) {
    next = recordCardOpen(next, targetComic.cardIds[0], openedAt);
  }
  return completeComic(next, Math.max(displayedAtMs, ...openedAtMs));
}

function repeatOutcomes(outcomes) {
  const targetComic = comic("lesson", ["target"]);
  let state = createSrsState();
  outcomes.forEach((opened, index) => {
    const at = NOW - (outcomes.length - 1 - index) * DAY;
    state = expose(state, targetComic, at, opened ? [at] : []);
  });
  return state;
}

test("a comic display creates one pending exposure per distinct exact card", () => {
  const target = comic("mapped", ["word", "phrase", "phrase", "grammar"]);
  const state = startComic(createSrsState(), target, NOW);

  assert.deepEqual(state.activeSession?.cardIds, ["word", "phrase", "grammar"]);
  assert.deepEqual(state.activeSession?.openedCardIds, []);
  assert.equal(getCardHistory(state, "phrase").exposures.length, 1);
  assert.deepEqual(getCardHistory(state, "phrase").exposures[0], {
    sessionId: 1,
    comicId: "mapped",
    displayedAtMs: NOW,
    openedAtMs: [],
    completedAtMs: null,
  });
  assert.equal(scoreCardPriority(state, "phrase", NOW).priorityIndex, 0.35);
});

test("selecting a word alone records no card open", () => {
  const state = startComic(createSrsState(), comic("one", ["word"]), NOW);

  // Word selection is UI-only; no card-open API is called.
  assert.deepEqual(getCardHistory(state, "word").exposures[0].openedAtMs, []);
  assert.deepEqual(getRecentlyOpenedCardIds(state, NOW), []);
});

test("every reopen timestamp is retained but one exposure is one binary lapse", () => {
  const target = comic("one", ["word", "other"]);
  let state = startComic(createSrsState(), target, NOW);
  state = recordCardOpen(state, "word", NOW + 1_000);
  state = recordCardOpen(state, "word", NOW + 2_000);
  state = recordCardOpen(state, "not-in-this-comic", NOW + 3_000);

  assert.deepEqual(getCardHistory(state, "word").exposures[0].openedAtMs, [
    NOW + 1_000,
    NOW + 2_000,
  ]);
  assert.deepEqual(state.activeSession?.openedCardIds, ["word"]);
  assert.equal(getCardHistory(state, "other").exposures[0].openedAtMs.length, 0);
  const score = scoreCardPriority(state, "word", NOW + 2_000);
  assert.equal(score.openCount, 2);
  assert.equal(score.recentOpenWeight, 1);
  assert.equal(score.helpNeedIndex, 0.675);
  assert.equal(score.priorityIndex, 0.675);
  assert.equal(score.status, "learning");
});

test("pending opens are difficulty evidence while pending unopened displays are not success", () => {
  const target = comic("one", ["opened", "pending"]);
  let state = startComic(createSrsState(), target, NOW);
  state = recordCardOpen(state, "opened", NOW);

  assert.equal(scoreCardPriority(state, "opened", NOW).priorityIndex, 0.675);
  assert.equal(scoreCardPriority(state, "pending", NOW).priorityIndex, 0.35);
  assert.equal(scoreCardPriority(state, "pending", NOW).completedDisplayCount, 0);
});

test("completion turns each unopened pending exposure into a success", () => {
  const target = comic("one", ["opened", "understood"]);
  let state = startComic(createSrsState(), target, NOW);
  state = recordCardOpen(state, "opened", NOW);
  state = completeComic(state, NOW);

  assert.equal(state.activeSession, null);
  assert.equal(getCardHistory(state, "opened").exposures[0].completedAtMs, NOW);
  assert.equal(getCardProgress(state, "opened", NOW).status, "learning");
  assert.ok(
    Math.abs(getCardProgress(state, "understood", NOW).priorityIndex - 0.175) <
      1e-12,
  );
  assert.equal(getCardProgress(state, "understood", NOW).status, "mastered");
  assert.equal(state.comics.one.completions, 1);
});

test("resuming the active comic never creates a duplicate display", () => {
  const target = comic("one", ["word"], 0.1);
  const selected = selectNextComic([target], createSrsState(), NOW);
  const resumed = selectNextComic([target], selected.state, NOW + 5_000);

  assert.equal(resumed.reason, "resume");
  assert.equal(resumed.state, selected.state);
  assert.equal(getCardHistory(resumed.state, "word").exposures.length, 1);
  assert.equal(resumed.state.comics.one.views, 1);
});

test("priority scoring is deterministic at an injected clock and does not mutate", () => {
  const state = repeatOutcomes([true, false, true]);
  const before = structuredClone(state);
  const first = scoreCardPriority(state, "target", NOW);
  const second = scoreCardPriority(state, "target", NOW);

  assert.deepEqual(first, second);
  assert.deepEqual(state, before);
  assert.ok(first.priorityIndex >= 0 && first.priorityIndex <= 1);
  assert.ok(first.helpNeedIndex >= 0 && first.helpNeedIndex <= 1);
  assert.ok(first.forgettingRiskIndex >= 0 && first.forgettingRiskIndex <= 1);
});

test("frequent recent opens rank above untouched cards and frequent successes", () => {
  const difficult = scoreCardPriority(
    repeatOutcomes([true, true, true, true, true]),
    "target",
    NOW,
  );
  const mastered = scoreCardPriority(
    repeatOutcomes([false, false, false, false, false]),
    "target",
    NOW,
  );
  const untouched = scoreCardPriority(createSrsState(), "target", NOW);

  assert.ok(Math.abs(difficult.priorityIndex - 0.8826656980313434) < 1e-12);
  assert.equal(untouched.priorityIndex, 0.35);
  assert.ok(Math.abs(mastered.priorityIndex - 0.06318000875235352) < 1e-12);
  assert.ok(difficult.priorityIndex > untouched.priorityIndex);
  assert.ok(untouched.priorityIndex > mastered.priorityIndex);
});

test("recent evidence has a fourteen-day half-life", () => {
  const state = repeatOutcomes([true]);
  const recent = scoreCardPriority(state, "target", NOW);
  const later = scoreCardPriority(state, "target", NOW + 14 * DAY);

  assert.equal(recent.recentOpenWeight, 1);
  assert.ok(Math.abs(later.recentOpenWeight - 0.5) < 1e-12);
});

test("a recently mastered card rises again as its forgetting risk grows", () => {
  const state = repeatOutcomes([false, false, false, false]);
  const recent = scoreCardPriority(state, "target", NOW);
  const later = scoreCardPriority(state, "target", NOW + 60 * DAY);

  assert.ok(recent.priorityIndex < 0.1);
  assert.ok(later.forgettingRiskIndex > recent.forgettingRiskIndex);
  assert.ok(later.priorityIndex > 0.9);
});

test("well-spaced successes grow stability more than massed successes", () => {
  const target = comic("lesson", ["target"]);
  let massed = createSrsState();
  let spaced = createSrsState();
  for (let index = 0; index < 4; index += 1) {
    massed = expose(massed, target, NOW + index * 1_000);
    spaced = expose(spaced, target, NOW + index * 7 * DAY);
  }

  const massedScore = scoreCardPriority(massed, "target", NOW + 3_000);
  const spacedScore = scoreCardPriority(spaced, "target", NOW + 21 * DAY);
  assert.ok(spacedScore.stabilityDays > massedScore.stabilityDays);
  assert.ok(massedScore.stabilityDays < 1.01);
});

test("comic ranking uses max-normalized priority and importance at 80/20", () => {
  const state = repeatOutcomes([true, true, true, true, true]);
  const candidates = [
    comic("hard", ["target"], 0),
    comic("important", ["easy"], 1),
  ];
  let withEasy = state;
  const easyComic = comic("easy-source", ["easy"]);
  for (let index = 0; index < 5; index += 1) {
    withEasy = expose(withEasy, easyComic, NOW - (4 - index) * DAY);
  }
  const ranked = rankComics(candidates, withEasy, NOW);

  assert.equal(ranked[0].comic.id, "hard");
  assert.equal(ranked[0].normalizedCardPriority, 1);
  assert.equal(ranked[0].normalizedImportance, 0);
  assert.equal(ranked[0].score, 0.8);
  assert.equal(ranked[1].normalizedImportance, 1);
});

test("comic importance breaks equal-priority ties deterministically", () => {
  const ranked = rankComics(
    [comic("low", ["a"], 0.1), comic("high", ["b"], 0.9)],
    createSrsState(),
    NOW,
  );
  assert.equal(ranked[0].comic.id, "high");

  const lexical = rankComics(
    [comic("z", ["same"], 1), comic("a", ["same"], 1)],
    createSrsState(),
    NOW,
  );
  assert.deepEqual(lexical.map((entry) => entry.comic.id), ["a", "z"]);
});

test("duplicate exact card IDs contribute once to a comic", () => {
  const [ranked] = rankComics(
    [comic("one", ["shared", "shared", "shared"], 0)],
    createSrsState(),
    NOW,
  );
  assert.equal(ranked.cardPrioritySum, 0.35);
  assert.deepEqual(ranked.cardPriorities.map((entry) => entry.cardId), ["shared"]);
});

test("zero-card comics are finite and can be selected by importance", () => {
  const ranked = rankComics(
    [comic("low", [], 0.1), comic("high", [], 1)],
    createSrsState(),
    NOW,
  );
  assert.equal(ranked[0].comic.id, "high");
  assert.equal(ranked[0].cardPrioritySum, 0);
  assert.equal(ranked[0].normalizedCardPriority, 0);
  assert.ok(ranked.every((entry) => Number.isFinite(entry.score)));
});

test("the just-completed comic is excluded before axis normalization", () => {
  const excluded = comic(
    "excluded",
    Array.from({ length: 10 }, (_, index) => `e${index}`),
    0.1,
  );
  const priorityCandidate = comic("priority", ["p"], 0);
  const importanceCandidate = comic("importance", [], 1);
  const state = { ...createSrsState(), lastCompletedComicId: "excluded" };

  const selected = selectNextComic(
    [excluded, priorityCandidate, importanceCandidate],
    state,
    NOW,
  );
  assert.equal(selected.comic.id, "priority");
  assert.equal(selected.ranking.normalizedCardPriority, 1);
});

test("the only comic remains eligible after it was just completed", () => {
  const only = comic("only", ["word"], 1);
  const state = { ...createSrsState(), lastCompletedComicId: "only" };
  assert.equal(selectNextComic([only], state, NOW).comic.id, "only");
});

test("reconciliation adds new active cards and preserves opened abandoned evidence", () => {
  const oldComic = comic("active", ["kept", "shared"]);
  let state = startComic(createSrsState(), oldComic, NOW);
  state = recordCardOpen(state, "shared", NOW + 10);
  const nextCurriculum = [
    comic("active", ["kept", "introduced"]),
    comic("other", ["shared"]),
  ];

  const reconciled = reconcileSrsState(state, nextCurriculum, NOW + 20);
  assert.deepEqual(reconciled.activeSession?.cardIds, ["kept", "introduced"]);
  assert.equal(
    getCardHistory(reconciled, "introduced").exposures[0].displayedAtMs,
    NOW + 20,
  );
  assert.equal(
    getCardHistory(reconciled, "shared").exposures[0].completedAtMs,
    NOW + 10,
  );
  assert.equal(scoreCardPriority(reconciled, "shared", NOW + 20).status, "learning");
});

test("reconciliation removes exact cards that left the entire curriculum", () => {
  let state = expose(createSrsState(), comic("old", ["kept", "orphan"]), NOW);
  state = reconcileSrsState(state, [comic("new", ["kept"])], NOW + 1);
  assert.deepEqual(Object.keys(state.cards), ["kept"]);
  assert.deepEqual(Object.keys(state.comics), []);
});

test("all timestamped exposure history survives beyond the old 500-event cap", () => {
  const target = comic("one", ["word"]);
  let state = createSrsState();
  for (let index = 0; index < 601; index += 1) {
    state = expose(state, target, NOW + index);
  }
  const restored = hydrateSrsState(serializeSrsState(state), NOW + 1_000);

  assert.equal(getCardHistory(restored, "word").exposures.length, 601);
  assert.equal(getCardProgress(restored, "word", NOW + 1_000).displayCount, 601);
  assert.equal(restored.historyCompleteness, "complete");
});

test("schema-four hydration sanitizes malformed and orphan pending exposures", () => {
  const stored = {
    ...createSrsState(),
    cards: {
      opened: {
        exposures: [
          {
            sessionId: 1,
            comicId: "gone",
            displayedAtMs: NOW,
            openedAtMs: [NOW + 2],
            completedAtMs: null,
          },
        ],
      },
      unopened: {
        exposures: [
          {
            sessionId: 1,
            comicId: "gone",
            displayedAtMs: NOW,
            openedAtMs: [],
            completedAtMs: null,
          },
        ],
      },
      malformed: { exposures: [{ sessionId: 0, comicId: "x" }] },
    },
  };
  const restored = hydrateSrsState(stored, NOW + 10);

  assert.equal(getCardHistory(restored, "opened").exposures[0].completedAtMs, NOW + 2);
  assert.equal(restored.cards.unopened, undefined);
  assert.equal(restored.cards.malformed, undefined);
  assert.equal(restored.nextSessionId, 2);
});

test("schema-three migration keeps only bounded aggregate evidence without fake dates", () => {
  const legacy = {
    schemaVersion: 3,
    studyDay: 9,
    cards: {
      aggregateOnly: { encounters: 99, lapses: 7, lastHelpDay: 8 },
    },
    comics: {
      old: {
        views: 4,
        completions: 3,
        lastViewedDay: 9,
        lastCompletedDay: 8,
      },
    },
    recentComicIds: ["old"],
    history: [
      { comicId: "old", cardId: "hard", day: 7, event: "independent-success" },
      { comicId: "old", cardId: "hard", day: 7, event: "help" },
      { comicId: "old", cardId: "known", day: 8, event: "independent-success" },
    ],
    activeSession: null,
  };
  const migrated = hydrateSrsState(legacy, NOW);

  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.historyCompleteness, "legacy-bounded");
  assert.deepEqual(migrated.cards.hard, {
    exposures: [],
    legacyEvidence: { displayCount: 1, openCount: 1 },
  });
  assert.deepEqual(migrated.cards.known.legacyEvidence, {
    displayCount: 1,
    openCount: 0,
  });
  assert.deepEqual(migrated.cards.aggregateOnly.legacyEvidence, {
    displayCount: 99,
    openCount: 8,
  });
  assert.deepEqual(migrated.cards.aggregateOnly.exposures, []);
  assert.equal(migrated.comics.old.lastViewedAtMs, null);
  assert.equal(migrated.comics.old.lastCompletedAtMs, null);
  assert.ok(
    scoreCardPriority(migrated, "hard", NOW).priorityIndex >
      scoreCardPriority(migrated, "known", NOW).priorityIndex,
  );
});

test("a schema-three active session restarts timestamping at migration", () => {
  const legacy = {
    schemaVersion: 3,
    studyDay: 4,
    cards: {},
    comics: {},
    history: [
      { comicId: "active", cardId: "opened", day: 4, event: "help" },
    ],
    activeSession: {
      comicId: "active",
      startedDay: 4,
      eligibleCardIds: ["opened", "pending"],
      clickedCardIds: ["opened"],
    },
  };
  const migrated = hydrateSrsState(legacy, NOW);

  assert.equal(migrated.activeSession?.startedAtMs, NOW);
  assert.deepEqual(migrated.activeSession?.openedCardIds, []);
  assert.equal(migrated.cards.opened.legacyEvidence.openCount, 1);
  assert.deepEqual(migrated.cards.opened.exposures[0].openedAtMs, []);
  assert.equal(migrated.cards.opened.exposures[0].displayedAtMs, NOW);
});

test("recent-open helper uses exact wall-clock timestamps", () => {
  const target = comic("one", ["old", "recent"]);
  let state = startComic(createSrsState(), target, NOW - 2 * DAY);
  state = recordCardOpen(state, "old", NOW - 2 * DAY);
  state = recordCardOpen(state, "recent", NOW - 1_000);
  state = completeComic(state, NOW);

  assert.deepEqual(getRecentlyOpenedCardIds(state, NOW), ["recent"]);
  assert.deepEqual(getRecentlyOpenedCardIds(state, NOW, 3 * DAY), ["old", "recent"]);
});

test("hydration rejects unknown schemas and malformed JSON without throwing", () => {
  assert.deepEqual(hydrateSrsState("not json", NOW), createSrsState());
  assert.deepEqual(
    hydrateSrsState({ schemaVersion: 99 }, NOW),
    createSrsState(),
  );
  assert.throws(() => hydrateSrsState(null, -1), /timestamp/i);
});
