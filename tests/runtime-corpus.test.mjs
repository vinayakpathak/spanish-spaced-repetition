import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build as viteBuild } from "vite";
import { rankComicsByCardGraph } from "../lib/comic-importance.ts";
import { COMICS } from "../lib/content.ts";
import {
  IMPORTANCE_TARGET_CARD_SCOPE,
  IMPORTANCE_TARGET_EDGE_POLICY,
  IMPORTANCE_TARGET_IDENTITY_POLICY,
  IMPORTANCE_TARGET_REVIEW_STATUS,
  importanceTargetIdsForCards,
  isImportanceTargetId,
} from "../lib/importance-target.ts";

const projectURL = new URL("../", import.meta.url);
const INTERNAL_QA_STATUS = "ai-authored-internal-qa";
const EXPECTED_SEED_FALLBACK_IDS = [
  "duty-calls",
  "exploits-of-a-mom",
  "photos",
  "python",
];
const AUTHORING_ONLY_FIELDS = [
  "editorialStatus",
  "qualityStatus",
  "humanVerified",
  "semanticQa",
];

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, projectURL), "utf8"));
}

function sameSet(first, second) {
  return (
    new Set(first).size === new Set(second).size &&
    new Set(second).size === new Set(first).size &&
    first.every((value) => second.includes(value))
  );
}

function sorted(values) {
  return [...values].sort();
}

function assertValidBounds(bounds, label) {
  assert.equal(typeof bounds, "object", `${label} is an object`);
  for (const key of ["x", "y", "width", "height"]) {
    assert.equal(Number.isFinite(bounds[key]), true, `${label}.${key} is finite`);
    assert.ok(
      bounds[key] >= 0 && bounds[key] <= 100,
      `${label}.${key} is a percentage`,
    );
  }
  assert.ok(bounds.width > 0, `${label} has positive width`);
  assert.ok(bounds.height > 0, `${label} has positive height`);
  assert.ok(
    bounds.x + bounds.width <= 100.0001,
    `${label} stays inside the image`,
  );
  assert.ok(
    bounds.y + bounds.height <= 100.0001,
    `${label} stays inside the image`,
  );
}

let publishedCorpusPromise;
async function publishedCorpus() {
  publishedCorpusPromise ??= (async () => {
    const manifest = await json("public/corpus/manifest.json");
    const bundles = await Promise.all(
      manifest.comics.map(async (entry) => [
        entry.id,
        await json(`public/corpus/comics/${entry.loadKey}.json`),
      ]),
    );
    return { manifest, bundlesById: new Map(bundles) };
  })();
  return publishedCorpusPromise;
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

test("the schema-v3 runtime covers all 258 archive entries with only internal-QA content", async () => {
  const [source, { manifest }] = await Promise.all([
    json("data/source/es-xkcd.json"),
    publishedCorpus(),
  ]);
  const sourceById = new Map(source.comics.map((comic) => [comic.id, comic]));

  assert.equal(source.comics.length, 258);
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.reviewStatus, INTERNAL_QA_STATUS);
  assert.equal(manifest.provenance.contextualSensesReviewed, true);
  assert.deepEqual(manifest.counts, {
    comics: 258,
    authoredComics: 254,
    reviewedSeedComics: 4,
    needsReviewComics: 0,
    cards: 6_465,
    schedulableCards: 6_465,
    wordOccurrences: 14_768,
  });
  assert.equal(manifest.comics.length, 258);
  assert.deepEqual(
    new Set(manifest.comics.map((comic) => comic.id)),
    new Set(source.comics.map((comic) => comic.id)),
  );
  assert.equal(new Set(manifest.comics.map((comic) => comic.id)).size, 258);
  assert.equal(new Set(manifest.comics.map((comic) => comic.loadKey)).size, 258);
  assert.equal(
    new Set(manifest.comics.map((comic) => comic.xkcdNumber)).size,
    258,
    "the runtime keeps the source archive's distinct translation numbers",
  );

  for (const entry of manifest.comics) {
    const sourceComic = sourceById.get(entry.id);
    assert.ok(sourceComic, entry.id);
    assert.equal(entry.xkcdNumber, sourceComic.number, entry.id);
    assert.equal(entry.publishedAt, sourceComic.publishedAt, entry.id);
    assert.equal(entry.titleEs, sourceComic.title, entry.id);
    assert.equal(entry.reviewStatus, INTERNAL_QA_STATUS, entry.id);
    assert.equal(entry.provenance.contextualSensesReviewed, true, entry.id);
    assert.ok(
      ["individually-authored", "reviewed-seed"].includes(
        entry.provenance.sourceKind,
      ),
      entry.id,
    );
    if (entry.provenance.sourceKind === "individually-authored") {
      assert.equal(entry.imageSrc, sourceComic.imageUrl, entry.id);
    }
  }

  assert.deepEqual(
    sorted(
      manifest.comics
        .filter((comic) => comic.provenance.sourceKind === "reviewed-seed")
        .map((comic) => comic.id),
    ),
    EXPECTED_SEED_FALLBACK_IDS,
  );
  assert.equal(
    manifest.comics.filter(
      (comic) => comic.provenance.sourceKind === "individually-authored",
    ).length,
    254,
  );

  const serialized = JSON.stringify(manifest);
  assert.equal(serialized.includes("needs-review"), false);
  assert.equal(serialized.includes("word-auto-"), false);
  for (const field of AUTHORING_ONLY_FIELDS) {
    assert.equal(serialized.includes(`"${field}"`), false, field);
  }
});

test("all 258 manifest comics carry deterministic graph importance over stable card IDs", async () => {
  const { manifest } = await publishedCorpus();
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
  assert.equal(expected.comics.length, 258);
  assert.equal(expected.comics[0].comicId, "es-xkcd-quince-años");
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
    provisional: false,
    contextualSensesReviewed: true,
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
  assert.equal(expected.cardNodeCount, 6_465);
  assert.equal(expected.edgeCount, 14_908);
});

test("every lazy bundle keeps exact-card scheduling, word geometry, and authored provenance", async () => {
  const { manifest, bundlesById } = await publishedCorpus();
  const catalogById = new Map(
    manifest.cardCatalog.map((card) => [card.id, card]),
  );
  const globalCardDefinitions = new Map();
  const reachedCardIds = new Set();
  const targetFrequency = new Map();
  let wordOccurrenceCount = 0;

  assert.equal(bundlesById.size, 258, "all lazy bundle files exist");
  assert.equal(catalogById.size, 6_465, "the runtime catalog is deduplicated");

  for (const entry of manifest.comics) {
    const bundle = bundlesById.get(entry.id);
    assert.ok(bundle, entry.id);
    assert.equal(bundle.schemaVersion, 3, entry.id);
    assert.equal(bundle.revision, entry.revision, entry.id);
    assert.equal(bundle.reviewStatus, INTERNAL_QA_STATUS, entry.id);
    assert.equal(bundle.comic.id, entry.id, entry.id);
    assert.equal(bundle.comic.reviewStatus, INTERNAL_QA_STATUS, entry.id);
    assert.equal(bundle.provenance.contextualSensesReviewed, true, entry.id);
    assert.equal(
      bundle.comic.provenance.contextualSensesReviewed,
      true,
      entry.id,
    );
    assert.ok(bundle.comic.regions.length >= 1, entry.id);
    assert.ok(sameSet(bundle.comic.cardIds, entry.cardIds), entry.id);

    const cardsById = new Map(bundle.cards.map((card) => [card.id, card]));
    assert.equal(cardsById.size, bundle.cards.length, `${entry.id} card IDs`);
    assert.ok(sameSet([...cardsById.keys()], entry.cardIds), entry.id);
    assert.deepEqual(
      entry.importanceTargetIds,
      importanceTargetIdsForCards(bundle.cards),
      entry.id,
    );
    assert.equal(
      entry.importanceTargetIds.every(isImportanceTargetId),
      true,
      entry.id,
    );
    assert.deepEqual(
      entry.importanceTargetIds,
      sorted(
        entry.cardIds.map((cardId) => `card:${encodeURIComponent(cardId)}`),
      ),
      `${entry.id} analytics uses namespaced stable IDs`,
    );
    assert.equal(
      entry.importanceTargetIds.some((targetId) =>
        entry.cardIds.includes(targetId),
      ),
      false,
      `${entry.id} keeps analytics targets out of exact-card SRS indexes`,
    );
    for (const targetId of entry.importanceTargetIds) {
      targetFrequency.set(targetId, (targetFrequency.get(targetId) ?? 0) + 1);
    }

    const comicReachableIds = new Set();
    for (const region of bundle.comic.regions) {
      assertValidBounds(region.bounds, `${entry.id}/${region.id}`);
      const wordsById = new Map(region.words.map((word) => [word.id, word]));
      assert.equal(
        wordsById.size,
        region.words.length,
        `${entry.id}/${region.id} word IDs`,
      );
      const regionReachableIds = new Set();

      for (const word of region.words) {
        wordOccurrenceCount += 1;
        assert.ok(word.bounds.length >= 1, `${entry.id}/${word.id} has geometry`);
        word.bounds.forEach((bounds, index) =>
          assertValidBounds(bounds, `${entry.id}/${word.id}.bounds[${index}]`),
        );
        assert.ok(word.cardIds.length >= 1, `${entry.id}/${word.id} is clickable`);
        const contextualWordCard = cardsById.get(word.cardIds[0]);
        assert.equal(contextualWordCard?.kind, "word", `${entry.id}/${word.id}`);
        assert.equal(
          contextualWordCard?.promptEs,
          word.normalized,
          `${entry.id}/${word.id} starts with its contextual word card`,
        );
        for (const cardId of word.cardIds) {
          assert.ok(cardsById.has(cardId), `${entry.id}/${word.id}/${cardId}`);
          regionReachableIds.add(cardId);
          comicReachableIds.add(cardId);
        }
      }

      for (const application of region.applications) {
        assert.ok(
          cardsById.has(application.cardId),
          `${entry.id}/${application.id}`,
        );
        assert.ok(application.participantWordIds.length >= 1, application.id);
        for (const wordId of application.participantWordIds) {
          const participant = wordsById.get(wordId);
          assert.ok(participant, `${entry.id}/${application.id}/${wordId}`);
          assert.ok(
            participant.cardIds.includes(application.cardId),
            `${entry.id}/${application.id} links only through participating words`,
          );
        }
      }
      assert.ok(
        sameSet(region.cardIds, [...regionReachableIds]),
        `${entry.id}/${region.id} region index`,
      );
    }
    assert.ok(
      sameSet(bundle.comic.cardIds, [...comicReachableIds]),
      `${entry.id} comic index reaches every scheduled card`,
    );

    for (const card of bundle.cards) {
      assert.equal(card.reviewStatus, INTERNAL_QA_STATUS, card.id);
      assert.equal(card.schedulable, true, card.id);
      assert.equal(card.provenance.contextualSenseReviewed, true, card.id);
      assert.deepEqual(catalogById.get(card.id), card, card.id);
      const existing = globalCardDefinitions.get(card.id);
      if (existing) assert.deepEqual(card, existing, card.id);
      else globalCardDefinitions.set(card.id, card);
      reachedCardIds.add(card.id);
    }

    const serialized = JSON.stringify(bundle);
    assert.equal(serialized.includes("needs-review"), false, entry.id);
    assert.equal(serialized.includes("word-auto-"), false, entry.id);
    for (const field of AUTHORING_ONLY_FIELDS) {
      assert.equal(
        serialized.includes(`"${field}"`),
        false,
        `${entry.id}/${field}`,
      );
    }
  }

  assert.equal(wordOccurrenceCount, 14_768);
  assert.equal(targetFrequency.size, 6_465);
  assert.equal(
    [...targetFrequency.values()].reduce((sum, count) => sum + count, 0),
    14_908,
  );
  assert.equal(
    [...targetFrequency.values()].filter((comicCount) => comicCount > 1).length,
    1_700,
    "stable shared cards connect the corpus graph",
  );
  assert.deepEqual(reachedCardIds, new Set(catalogById.keys()));
});

test("the browser parser marks exactly four checked-in seed fallbacks", async () => {
  const [{ manifest: rawManifest }, parser] = await Promise.all([
    publishedCorpus(),
    loadRuntimeManifestParser(),
  ]);

  const parsed = parser.parseCorpusManifest(rawManifest);
  const merged = parser.mergeReviewedManifest(parsed);
  assert.equal(parsed.schemaVersion, 3);
  assert.equal(parsed.comics.length, 258);
  assert.equal(new Set(parsed.comics.map((comic) => comic.xkcdNumber)).size, 258);
  assert.equal(
    parsed.comics.find((comic) => comic.id === "es-xkcd-quince-años")
      ?.loadKey,
    "es-xkcd-quince-años",
  );
  assert.equal(parsed.cardCatalog.length, 6_465);
  assert.deepEqual(
    sorted(
      merged.comics
        .filter((comic) => comic.seedFallback)
        .map((comic) => comic.id),
    ),
    EXPECTED_SEED_FALLBACK_IDS,
  );

  for (const comicId of EXPECTED_SEED_FALLBACK_IDS) {
    assert.deepEqual(
      merged.comics.find((comic) => comic.id === comicId)?.importance,
      parsed.comics.find((comic) => comic.id === comicId)?.importance,
      `seed adapter preserves the full-corpus score for ${comicId}`,
    );
  }
  for (const comicId of ["correlation", "tech-support"]) {
    const runtime = merged.comics.find((comic) => comic.id === comicId);
    assert.equal(runtime?.seedFallback, undefined, comicId);
    assert.equal(runtime?.revision.startsWith("runtime-"), true, comicId);
  }

  const wrongTarget = structuredClone(rawManifest);
  wrongTarget.comics[0].importanceTargetIds[0] = "card:not-its-srs-card";
  assert.throws(
    () => parser.parseCorpusManifest(wrongTarget),
    /invalid comic entry/,
  );

  const truncated = structuredClone(rawManifest);
  truncated.comics.pop();
  truncated.counts.comics -= 1;
  truncated.counts.authoredComics -= 1;
  assert.throws(
    () => parser.parseCorpusManifest(truncated),
    /must contain all 258 comics/,
    "a partial deployment must enter degraded non-persisting mode",
  );

  const wrongCounts = structuredClone(rawManifest);
  wrongCounts.counts.cards -= 1;
  assert.throws(
    () => parser.parseCorpusManifest(wrongCounts),
    /counts do not match its card catalog/,
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

test("degraded corpus hydration never overwrites saved full-corpus progress", async (t) => {
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
      "stable-card": {
        status: "learning",
        dueAt: "2026-08-31T12:00:00.000Z",
      },
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

test("the four seed-only bundles stay exact while authored seed overlaps supersede them", async () => {
  const { manifest, bundlesById } = await publishedCorpus();
  const manifestById = new Map(manifest.comics.map((comic) => [comic.id, comic]));

  for (const comic of COMICS) {
    const entry = manifestById.get(comic.id);
    const bundle = bundlesById.get(comic.id);
    assert.ok(entry, comic.id);
    assert.ok(bundle, comic.id);
    assert.equal(entry.reviewStatus, INTERNAL_QA_STATUS, comic.id);

    if (EXPECTED_SEED_FALLBACK_IDS.includes(comic.id)) {
      assert.equal(entry.revision, "reviewed-v1", comic.id);
      assert.equal(entry.provenance.sourceKind, "reviewed-seed", comic.id);
      assert.deepEqual(entry.cardIds, comic.cardIds, comic.id);
      assert.deepEqual(bundle.comic.cardIds, comic.cardIds, comic.id);
    } else {
      assert.ok(["correlation", "tech-support"].includes(comic.id), comic.id);
      assert.equal(entry.revision.startsWith("runtime-"), true, comic.id);
      assert.equal(
        entry.provenance.sourceKind,
        "individually-authored",
        comic.id,
      );
    }
  }
});
