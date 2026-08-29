import assert from "node:assert/strict";
import test from "node:test";
import {
  COMIC_IMPORTANCE_ALGORITHM,
  DEFAULT_COMIC_IMPORTANCE_DAMPING,
  rankComicsByCardGraph,
} from "../lib/comic-importance.ts";

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("ranks a comic highly when it connects to several widely shared cards", () => {
  const result = rankComicsByCardGraph([
    { id: "central", cardIds: ["shared-a", "shared-b"] },
    { id: "left", cardIds: ["shared-a"] },
    { id: "right", cardIds: ["shared-b"] },
  ]);

  assert.equal(result.comics[0].comicId, "central");
  assert.equal(result.comics[0].cardCount, 2);
  assert.equal(result.comics[0].sharedCardCount, 2);
  assert.ok(result.comics[0].score > result.comics[1].score);
  assert.equal(result.comics[1].score, result.comics[2].score);
  closeTo(
    result.comics.reduce((sum, comic) => sum + comic.score, 0),
    1,
  );
  assert.equal(result.damping, DEFAULT_COMIC_IMPORTANCE_DAMPING);
  assert.equal(result.algorithm, COMIC_IMPORTANCE_ALGORITHM);
  assert.equal(result.normalization, "comic-sum-1");
  assert.equal(result.converged, true);
});

test("normalizes the published centrality across comics", () => {
  const result = rankComicsByCardGraph([
    { id: "only", cardIds: ["only-card"] },
  ]);

  assert.equal(result.nodeCount, 2);
  assert.equal(result.comicNodeCount, 1);
  assert.equal(result.cardNodeCount, 1);
  assert.equal(result.edgeCount, 1);
  closeTo(result.comics[0].score, 1);
  assert.equal(result.comics[0].rank, 1);
  assert.equal(result.comics[0].percentile, 1);
});

test("rewards comics attached to a card shared across many comics", () => {
  const sharedComics = Array.from({ length: 5 }, (_, index) => ({
    id: `shared-${index + 1}`,
    cardIds: ["widely-used-card"],
  }));
  const result = rankComicsByCardGraph([
    ...sharedComics,
    { id: "private", cardIds: ["private-card"] },
  ]);

  const privateComic = result.comics.find(
    (comic) => comic.comicId === "private",
  );
  assert.ok(privateComic);
  for (const sharedComic of result.comics.filter((comic) =>
    comic.comicId.startsWith("shared-"),
  )) {
    assert.ok(sharedComic.score > privateComic.score);
    assert.equal(sharedComic.sharedCardCount, 1);
  }
  closeTo(
    result.comics.reduce((sum, comic) => sum + comic.score, 0),
    1,
  );
});

test("gives zero-card comics a damped baseline score", () => {
  const result = rankComicsByCardGraph([
    { id: "connected", cardIds: ["card"] },
    { id: "visual-only", cardIds: [] },
  ]);

  assert.equal(result.converged, true);
  assert.equal(result.nodeCount, 3);
  assert.equal(result.edgeCount, 1);
  assert.equal(result.comics[1].comicId, "visual-only");
  assert.equal(result.comics[1].cardCount, 0);
  assert.ok(Number.isFinite(result.comics[1].score));
  closeTo(result.comics[1].score, (1 - result.damping) / 2);
  closeTo(
    result.comics.reduce((sum, comic) => sum + comic.score, 0),
    1,
  );
});

test("is independent of input and card-reference order", () => {
  const forward = rankComicsByCardGraph([
    { id: "zeta", cardIds: ["two", "one"] },
    { id: "alpha", cardIds: ["three", "one"] },
    { id: "mu", cardIds: ["two"] },
  ]);
  const reversed = rankComicsByCardGraph([
    { id: "mu", cardIds: ["two"] },
    { id: "alpha", cardIds: ["one", "three"] },
    { id: "zeta", cardIds: ["one", "two"] },
  ]);

  assert.deepEqual(reversed, forward);
});

test("breaks exact score ties by comic ID and exposes ordinal percentiles", () => {
  const result = rankComicsByCardGraph([
    { id: "zeta", cardIds: ["z-card"] },
    { id: "alpha", cardIds: ["a-card"] },
    { id: "mu", cardIds: ["m-card"] },
  ]);

  assert.deepEqual(
    result.comics.map(({ comicId, rank, percentile }) => ({
      comicId,
      rank,
      percentile,
    })),
    [
      { comicId: "alpha", rank: 1, percentile: 1 },
      { comicId: "mu", rank: 2, percentile: 0.5 },
      { comicId: "zeta", rank: 3, percentile: 0 },
    ],
  );
});

test("keeps an all-dangling corpus uniformly ranked", () => {
  const result = rankComicsByCardGraph([
    { id: "zeta", cardIds: [] },
    { id: "alpha", cardIds: [] },
  ]);

  assert.equal(result.converged, true);
  assert.equal(result.iterations, 0);
  assert.deepEqual(
    result.comics.map(({ comicId, score }) => ({ comicId, score })),
    [
      { comicId: "alpha", score: 0.5 },
      { comicId: "zeta", score: 0.5 },
    ],
  );
});

test("returns a converged empty result for an empty corpus", () => {
  const result = rankComicsByCardGraph([]);

  assert.deepEqual(result.comics, []);
  assert.equal(result.converged, true);
  assert.equal(result.iterations, 0);
  assert.equal(result.nodeCount, 0);
  assert.equal(result.comicNodeCount, 0);
  assert.equal(result.cardNodeCount, 0);
});

test("reports a deliberately truncated iteration", () => {
  const result = rankComicsByCardGraph(
    [
      { id: "a", cardIds: ["one", "two"] },
      { id: "b", cardIds: ["one"] },
    ],
    { maxIterations: 1, tolerance: 1e-30 },
  );

  assert.equal(result.iterations, 1);
  assert.equal(result.converged, false);
});

test("honors custom damping, tolerance, and iteration options", () => {
  const result = rankComicsByCardGraph(
    [
      { id: "many", cardIds: ["one", "two"] },
      { id: "few", cardIds: ["one"] },
    ],
    { damping: 0, tolerance: 1e-8, maxIterations: 3 },
  );

  assert.equal(result.damping, 0);
  assert.equal(result.tolerance, 1e-8);
  assert.equal(result.maxIterations, 3);
  assert.equal(result.iterations, 1);
  assert.equal(result.converged, true);
  assert.deepEqual(
    result.comics.map((comic) => comic.score),
    [0.5, 0.5],
  );
});

test("rejects duplicate comic IDs and duplicate card references", () => {
  assert.throws(
    () =>
      rankComicsByCardGraph([
        { id: "same", cardIds: ["one"] },
        { id: "same", cardIds: ["two"] },
      ]),
    /duplicate comic id: same/,
  );
  assert.throws(
    () =>
      rankComicsByCardGraph([{ id: "comic", cardIds: ["one", "one"] }]),
    /duplicate card reference one on comic comic/,
  );
});

test("validates IDs and numeric options", () => {
  assert.throws(
    () => rankComicsByCardGraph([{ id: " ", cardIds: [] }]),
    /non-empty id/,
  );
  assert.throws(
    () => rankComicsByCardGraph([{ id: "a", cardIds: [""] }]),
    /non-empty id/,
  );
  assert.throws(
    () => rankComicsByCardGraph([], { damping: 1 }),
    /damping/,
  );
  assert.throws(
    () => rankComicsByCardGraph([], { tolerance: 0 }),
    /tolerance/,
  );
  assert.throws(
    () => rankComicsByCardGraph([], { maxIterations: 1.5 }),
    /maxIterations/,
  );
});
