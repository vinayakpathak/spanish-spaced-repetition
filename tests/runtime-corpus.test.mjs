import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build as viteBuild } from "vite";
import { rankComicsByCardGraph } from "../lib/comic-importance.ts";
import { CARDS, COMICS } from "../lib/content.ts";
import {
  IMPORTANCE_TARGET_CARD_SCOPE,
  IMPORTANCE_TARGET_EDGE_POLICY,
  IMPORTANCE_TARGET_IDENTITY_POLICY,
  IMPORTANCE_TARGET_REVIEW_STATUS,
  importanceTargetIdsForCards,
  isImportanceTargetId,
} from "../lib/importance-target.ts";

const projectURL = new URL("../", import.meta.url);

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, projectURL), "utf8"));
}

function sameSet(first, second) {
  return (
    new Set(first).size === new Set(second).size &&
    first.every((value) => second.includes(value))
  );
}

async function loadRuntimeManifestParser() {
  const result = await viteBuild({
    root: new URL("../", import.meta.url).pathname,
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      ssr: "lib/corpus/manifest.ts",
      rollupOptions: { output: { format: "es" } },
    },
  });
  const outputs = Array.isArray(result)
    ? result.flatMap((item) => item.output ?? [])
    : result.output;
  const entry = outputs.find((item) => item.type === "chunk" && item.isEntry);
  assert.ok(entry, "Vite emitted the runtime manifest parser entry");
  return import(
    `data:text/javascript;base64,${Buffer.from(entry.code).toString("base64")}`
  );
}

test("the lazy corpus covers all 258 archive entries and preserves source anomalies", async () => {
  const [source, rawManifest] = await Promise.all([
    json("data/source/es-xkcd.json"),
    json("public/corpus/manifest.json"),
  ]);
  const manifest = rawManifest;

  assert.equal(source.comics.length, 258);
  assert.equal(manifest.comics.length, 258);
  assert.deepEqual(
    new Set(manifest.comics.map((comic) => comic.id)),
    new Set(source.comics.map((comic) => comic.id)),
  );
  assert.equal(new Set(manifest.comics.map((comic) => comic.id)).size, 258);
  assert.equal(new Set(manifest.comics.map((comic) => comic.loadKey)).size, 258);
  assert.equal(
    new Set(manifest.comics.map((comic) => comic.xkcdNumber)).size,
    254,
    "four duplicate original-number groups in the Spanish archive remain valid",
  );
  assert.equal(
    manifest.comics.filter((comic) => comic.reviewStatus === "reviewed").length,
    6,
  );
  assert.equal(
    manifest.comics.filter((comic) => comic.reviewStatus === "needs-review")
      .length,
    252,
  );
});

test("all 258 manifest comics carry deterministic normalized graph importance", async () => {
  const manifest = await json("public/corpus/manifest.json");
  const graph = manifest.comics.map(({ id, importanceTargetIds }) => ({
    id,
    cardIds: importanceTargetIds,
  }));
  const expected = rankComicsByCardGraph(graph);
  const reordered = rankComicsByCardGraph(
    [...graph]
      .reverse()
      .map(({ id, cardIds }) => ({ id, cardIds: [...cardIds].reverse() })),
  );

  assert.deepEqual(reordered, expected, "ranking is independent of input order");
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(expected.comics.length, 258);
  assert.equal(expected.comics[0].comicId, "tech-support");
  assert.equal(expected.comics[0].rank, 1);

  const storedById = new Map(
    manifest.comics.map((comic) => [comic.id, comic.importance]),
  );
  for (const { comicId, ...importance } of expected.comics) {
    assert.deepEqual(storedById.get(comicId), importance, comicId);
    assert.ok(Number.isFinite(importance.score));
    assert.ok(importance.score >= 0 && importance.score <= 1);
    assert.ok(importance.percentile >= 0 && importance.percentile <= 1);
    assert.equal(Number.isSafeInteger(importance.cardCount), true);
    assert.equal(Number.isSafeInteger(importance.sharedCardCount), true);
  }

  assert.equal(
    new Set(expected.comics.map((comic) => comic.rank)).size,
    manifest.comics.length,
  );
  assert.deepEqual(
    expected.comics.map((comic) => comic.rank),
    Array.from({ length: manifest.comics.length }, (_, index) => index + 1),
  );
  assert.ok(
    Math.abs(
      expected.comics.reduce((sum, comic) => sum + comic.score, 0) - 1,
    ) < 1e-12,
  );
  assert.deepEqual(manifest.importanceModel, {
    algorithm: expected.algorithm,
    normalization: expected.normalization,
    identityPolicy: IMPORTANCE_TARGET_IDENTITY_POLICY,
    edgePolicy: IMPORTANCE_TARGET_EDGE_POLICY,
    cardScope: IMPORTANCE_TARGET_CARD_SCOPE,
    includesSchedulableOnly: true,
    reviewStatus: IMPORTANCE_TARGET_REVIEW_STATUS,
    provisional: true,
    contextualSensesReviewed: false,
    damping: expected.damping,
    tolerance: expected.tolerance,
    maxIterations: expected.maxIterations,
    iterations: expected.iterations,
    converged: expected.converged,
    nodeCount: expected.nodeCount,
    comicNodeCount: expected.comicNodeCount,
    cardNodeCount: expected.cardNodeCount,
    edgeCount: expected.edgeCount,
  });
  assert.equal(expected.cardNodeCount, 1_234);
  assert.equal(expected.edgeCount, 4_354);
  assert.equal(expected.iterations, 17);
});

test("analytics targets canonically connect schedulable cards without aliasing SRS IDs", async () => {
  const manifest = await json("public/corpus/manifest.json");
  const reviewedIds = new Set(COMICS.map((comic) => comic.id));
  const reviewedCardsById = new Map(CARDS.map((card) => [card.id, card]));
  const targetFrequency = new Map();

  for (const entry of manifest.comics) {
    let cards;
    if (reviewedIds.has(entry.id)) {
      cards = entry.cardIds.map((cardId) => reviewedCardsById.get(cardId));
      assert.equal(cards.every(Boolean), true, entry.id);
    } else {
      const bundle = await json(`public/corpus/comics/${entry.loadKey}.json`);
      cards = bundle.cards;
    }
    const expectedTargets = importanceTargetIdsForCards(cards);
    assert.deepEqual(entry.importanceTargetIds, expectedTargets, entry.id);
    assert.equal(
      entry.importanceTargetIds.every(isImportanceTargetId),
      true,
      entry.id,
    );
    assert.equal(
      entry.importanceTargetIds.some((targetId) =>
        entry.cardIds.includes(targetId),
      ),
      false,
      `${entry.id} keeps analytics targets out of exact-card SRS indexes`,
    );
    assert.equal(entry.importance.cardCount, entry.importanceTargetIds.length);
    for (const targetId of entry.importanceTargetIds) {
      targetFrequency.set(targetId, (targetFrequency.get(targetId) ?? 0) + 1);
    }
  }

  assert.equal(targetFrequency.size, 1_234);
  assert.equal(
    [...targetFrequency.values()].reduce((sum, count) => sum + count, 0),
    4_354,
  );
  assert.equal(targetFrequency.get("word:en|in%3B%20on"), 145);
  assert.equal(
    [...targetFrequency.values()].filter((comicCount) => comicCount > 1).length,
    375,
  );
});

test("the browser manifest parser accepts the complete corpus, including its Unicode load key", async () => {
  const [rawManifest, parser] = await Promise.all([
    json("public/corpus/manifest.json"),
    loadRuntimeManifestParser(),
  ]);

  const parsed = parser.parseCorpusManifest(rawManifest);
  const merged = parser.mergeReviewedManifest(parsed);
  assert.equal(parsed.comics.length, 258);
  assert.equal(new Set(parsed.comics.map((comic) => comic.xkcdNumber)).size, 254);
  assert.equal(
    parsed.comics.find((comic) => comic.id === "es-xkcd-quince-años")
      ?.loadKey,
    "es-xkcd-quince-años",
  );
  assert.equal(parsed.cardCatalog.length, 5_019);
  for (const reviewed of COMICS) {
    assert.deepEqual(
      merged.comics.find((comic) => comic.id === reviewed.id)?.importance,
      parsed.comics.find((comic) => comic.id === reviewed.id)?.importance,
      `reviewed adapter preserves the full-corpus score for ${reviewed.id}`,
    );
  }

  const mismatchedReviewed = {
    ...parsed,
    comics: parsed.comics.map((comic) =>
      comic.id === COMICS[0].id
        ? { ...comic, cardIds: comic.cardIds.slice(1) }
        : comic,
    ),
  };
  assert.throws(
    () => parser.mergeReviewedManifest(mismatchedReviewed),
    /Remote reviewed curriculum does not match/,
  );

  const wrongOrder = structuredClone(rawManifest);
  const firstRank = wrongOrder.comics[0].importance.rank;
  wrongOrder.comics[0].importance.rank = wrongOrder.comics[1].importance.rank;
  wrongOrder.comics[1].importance.rank = firstRank;
  assert.throws(
    () => parser.parseCorpusManifest(wrongOrder),
    /ranks do not match score order/,
  );
});

test("degraded corpus hydration never overwrites saved generated progress", async (t) => {
  const [parser, pageSource] = await Promise.all([
    loadRuntimeManifestParser(),
    readFile(new URL("app/page.tsx", projectURL), "utf8"),
  ]);
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => {
    throw new Error("temporary manifest failure");
  };

  const manifestFailure = await parser.loadCorpusManifest();
  assert.equal(manifestFailure.degraded, true);
  assert.equal(manifestFailure.manifest.comics.length, 6);
  assert.equal(parser.canPersistCorpusProgress(manifestFailure), false);

  const successfulManifest = {
    manifest: manifestFailure.manifest,
    degraded: false,
  };
  assert.equal(
    parser.canPersistCorpusProgress(successfulManifest, true),
    false,
    "a selected-bundle failure also suspends persistence",
  );

  const savedProgress = {
    cards: {
      "generated-card": { status: "learning", dueDay: 2 },
    },
  };
  const reducedFallbackState = { cards: {} };
  for (const [load, usedBundleFallback] of [
    [manifestFailure, false],
    [successfulManifest, true],
  ]) {
    let persisted = structuredClone(savedProgress);
    if (parser.canPersistCorpusProgress(load, usedBundleFallback)) {
      persisted = reducedFallbackState;
    }
    assert.deepEqual(persisted, savedProgress);
  }

  assert.match(
    pageSource,
    /if \(!hydrated \|\| !progressStore \|\| !persistenceEnabledRef\.current\) return;/,
    "all later fallback-session commits use the same persistence gate",
  );
});

test("every generated OCR word is directly clickable and schedules only its exact provisional card", async () => {
  const manifest = await json("public/corpus/manifest.json");
  const reviewedIds = new Set(COMICS.map((comic) => comic.id));
  const catalogById = new Map(
    manifest.cardCatalog.map((card) => [card.id, card]),
  );
  const globalGeneratedCardIds = new Set();
  const globalSchedulableCardIds = new Set();
  let generatedComicCount = 0;
  let generatedWordCount = 0;
  let unresolvedCardCount = 0;

  for (const entry of manifest.comics) {
    if (reviewedIds.has(entry.id)) continue;
    generatedComicCount += 1;
    const rawBundle = await json(`public/corpus/comics/${entry.loadKey}.json`);
    const bundle = rawBundle;

    assert.equal(rawBundle.reviewStatus, "needs-review");
    assert.equal(rawBundle.comic.reviewStatus, "needs-review");
    assert.ok(bundle.comic.regions.length >= 1);
    assert.ok(sameSet(bundle.comic.cardIds, entry.cardIds));

    const cardsById = new Map(bundle.cards.map((card) => [card.id, card]));
    const schedulableIds = bundle.cards
      .filter((card) => card.schedulable)
      .map((card) => card.id);
    assert.ok(sameSet(schedulableIds, entry.cardIds));
    const words = bundle.comic.regions.flatMap((region) => {
      assert.equal(region.translationEn, "");
      assert.equal(region.noteEn, "");
      assert.deepEqual(region.applications, []);
      assert.ok(
        sameSet(
          region.cardIds,
          region.words.map((word) => word.cardIds[0]),
        ),
      );
      return region.words;
    });

    assert.equal(words.length, bundle.cards.length);
    generatedWordCount += words.length;
    for (const word of words) {
      assert.equal(
        [...word.text].some(
          (character) =>
            /\p{Letter}/u.test(character) &&
            /\p{Script=Latin}/u.test(character),
        ),
        true,
        `${entry.id}/${word.id} contains a Latin-script letter`,
      );
      assert.ok(word.bounds.length >= 1, `${entry.id}/${word.id} has geometry`);
      assert.equal(word.cardIds.length, 1);
      const card = cardsById.get(word.cardIds[0]);
      assert.equal(card?.kind, "word");
      assert.equal(card?.promptEs, word.normalized);
      assert.equal(card.reviewStatus, "needs-review");
      assert.equal(card.provenance.contextualSenseReviewed, false);
      assert.equal(typeof card.schedulable, "boolean");
      if (card.schedulable) {
        assert.notEqual(card.answerEn, "Meaning needs review");
        assert.ok(entry.cardIds.includes(card.id));
        assert.deepEqual(catalogById.get(card.id), card);
        globalSchedulableCardIds.add(card.id);
      } else {
        unresolvedCardCount += 1;
        assert.equal(card.answerEn, "Meaning needs review");
        assert.equal(entry.cardIds.includes(card.id), false);
        assert.equal(bundle.comic.cardIds.includes(card.id), false);
      }
      assert.equal(globalGeneratedCardIds.has(card.id), false, card.id);
      globalGeneratedCardIds.add(card.id);
    }
  }

  assert.equal(generatedComicCount, 252);
  assert.equal(generatedWordCount, 14_485);
  assert.equal(globalSchedulableCardIds.size, 5_019);
  assert.equal(unresolvedCardCount, 9_466);
  assert.equal(globalGeneratedCardIds.size, generatedWordCount);
  assert.equal(manifest.counts.generatedCards, generatedWordCount);
  assert.equal(
    manifest.counts.schedulableGeneratedCards,
    globalSchedulableCardIds.size,
  );

  const catalogIds = manifest.cardCatalog.map((card) => card.id);
  assert.equal(manifest.cardCatalog.length, 5_019);
  assert.equal(new Set(catalogIds).size, catalogIds.length);
  assert.ok(sameSet(catalogIds, [...globalSchedulableCardIds]));
  for (const card of manifest.cardCatalog) {
    assert.equal(card.kind, "word");
    assert.equal(card.reviewStatus, "needs-review");
    assert.equal(card.schedulable, true);
    assert.equal(card.provenance.contextualSenseReviewed, false);
    assert.notEqual(card.answerEn, "Meaning needs review");
  }
});

test("manual overrides recover the only two visibly textual zero-OCR comics", async () => {
  const manifest = await json("public/corpus/manifest.json");
  const expected = new Map([
    ["es-xkcd-agitador-wikipedista", [["cita", "citation"], ["requerida", "required"]]],
    ["es-xkcd-perder-el-control", [["juego", "game"], ["sexual", "sexual"]]],
  ]);

  for (const [comicId, expectedCards] of expected) {
    const entry = manifest.comics.find((comic) => comic.id === comicId);
    const bundle = await json(`public/corpus/comics/${entry.loadKey}.json`);
    assert.deepEqual(
      bundle.cards.map((card) => [card.promptEs, card.answerEn]),
      expectedCards,
    );
    assert.equal(bundle.cards.every((card) => card.schedulable), true);
    assert.equal(
      bundle.cards.every(
        (card) => card.provenance.method === "manual-ocr-override",
      ),
      true,
    );
    assert.equal(entry.cardIds.length, 2);
  }

  const wordless = manifest.comics.find(
    (comic) => comic.id === "es-xkcd-ser-querido",
  );
  const wordlessBundle = await json(
    `public/corpus/comics/${wordless.loadKey}.json`,
  );
  assert.deepEqual(wordless.cardIds, []);
  assert.deepEqual(wordlessBundle.cards, []);
  assert.deepEqual(wordlessBundle.comic.regions[0].words, []);
});

test("reviewed seed comics remain authoritative in the 258-comic manifest", async () => {
  const manifest = await json("public/corpus/manifest.json");
  const byId = new Map(manifest.comics.map((comic) => [comic.id, comic]));

  for (const comic of COMICS) {
    const runtime = byId.get(comic.id);
    assert.ok(runtime, comic.id);
    assert.equal(runtime.reviewStatus, "reviewed");
    assert.equal(runtime.revision, "reviewed-v1");
    assert.equal(runtime.imageSrc, comic.image.src);
    assert.deepEqual(runtime.cardIds, comic.cardIds);
  }
});
