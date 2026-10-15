import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import test from "node:test";
import {
  CARD_IDENTITY_REVISION, CARD_IDENTITY_MERGES,
  CARD_IDENTITY_COMIC_ROUTES, RETIRED_CARD_IDS,
} from "../lib/card-identity-migrations.generated.js";
import { SEED_CURRICULUM_REVISION } from "../lib/seed-corrections.js";
import { validateCardReusePolicy } from "../scripts/lib/card-reuse-policy.mjs";
import {
  createSrsState, startComic, recordCardOpen, completeComic,
  hydrateSrsState, serializeSrsState, reconcileSrsState, scoreCardPriority,
} from "../lib/srs.ts";

const read = async (relative) => JSON.parse(await fs.readFile(new URL(relative, import.meta.url), "utf8"));
const manifest = await read("../public/corpus/manifest.json");
const ledger = await read("../data/review/curriculum-fixes-2026-09-07.json");
const policy = await read("../data/authoring/card-reuse-policy.json");
const bundles = await Promise.all(manifest.comics.map((entry) => read(`../public/corpus/comics/${entry.loadKey}.json`)));
const cards = new Map(manifest.cardCatalog.map((card) => [card.id, card]));
const bundleById = new Map(bundles.map((bundle) => [bundle.comic.id, bundle]));

test("reviewed corrections retain every printed word and exact hotspot geometry", () => {
  // Independently compared with the pre-change Git revision, not calculated
  // from the same source being tested. Curriculum edits must not move text.
  const geometry = bundles.map(({ comic }) => ({
    id: comic.id, image: comic.image,
    regions: comic.regions.map((region) => ({
      id: region.id, labelEs: region.labelEs, bounds: region.bounds,
      words: region.words.map(({ id, text, normalized, bounds }) => ({ id, text, normalized, bounds })),
    })),
  })).sort((a, b) => a.id.localeCompare(b.id));
  assert.equal(createHash("sha256").update(JSON.stringify(geometry)).digest("hex"),
    "2de794390214718abbc3084d0da2cbc8edbaf372a9f0627649bbaa2e671520be");
});

test("the approved identity ledger matches migration data and cannot resurrect retired cards", () => {
  assert.equal(CARD_IDENTITY_REVISION, ledger.migration.revision);
  assert.deepEqual(CARD_IDENTITY_MERGES, ledger.migration.merges);
  assert.deepEqual(CARD_IDENTITY_COMIC_ROUTES, ledger.migration.comicRoutes);
  assert.deepEqual(RETIRED_CARD_IDS, ledger.migration.retiredCardIds);
  assert.equal(ledger.counts.wordFamilies, 89);
  assert.equal(ledger.counts.retiredAliases, 177);
  assert.equal(ledger.counts.removedTargets, 72);
  assert.ok(ledger.conflicts.every((conflict) => conflict.resolution));
  const retired = new Set([...RETIRED_CARD_IDS, ...CARD_IDENTITY_MERGES.map(([id]) => id)]);
  for (const id of retired) assert.equal(cards.has(id), false, id);
  for (const [, id] of CARD_IDENTITY_MERGES) assert.ok(cards.has(id), id);
  for (const { comic } of bundles) for (const region of comic.regions) {
    for (const word of region.words) for (const id of word.cardIds) assert.ok(!retired.has(id), word.id);
    for (const app of region.applications) assert.ok(!retired.has(app.cardId), app.id);
  }
  const routeKeys = new Set();
  for (const route of CARD_IDENTITY_COMIC_ROUTES) {
    assert.ok(Number.isSafeInteger(route.introducedRevision));
    assert.ok(route.introducedRevision <= CARD_IDENTITY_REVISION);
    const key = JSON.stringify([route.introducedRevision, route.cardId, route.comicId]);
    assert.ok(!routeKeys.has(key));
    routeKeys.add(key);
    if (route.targetCardId !== null) assert.ok(cards.has(route.targetCardId));
  }
  assert.deepEqual(validateCardReusePolicy(manifest.cardCatalog, policy), []);
  assert.equal(SEED_CURRICULUM_REVISION, "reviewed-v4-20260907");
  for (const entry of manifest.comics.filter((entry) => entry.provenance.sourceKind === "reviewed-seed")) {
    assert.equal(entry.revision, SEED_CURRICULUM_REVISION, "old force-cached seed URLs must not be reused");
  }
});

test("common targets are shared without collapsing different senses or written forms", () => {
  for (const [prompt, id, count] of [
    ["gusta", "word-gusta--i-like", 6],
    ["dónde", "word-dónde--direct-question", 6],
    ["intento", "word-intento", 4],
  ]) {
    assert.deepEqual(manifest.cardCatalog.filter((card) => card.promptEs === prompt).map((card) => card.id), [id]);
    assert.equal(manifest.comics.filter((comic) => comic.cardIds.includes(id)).length, count);
  }
  assert.equal(manifest.cardCatalog.filter((card) => card.kind === "word" && card.promptEs === "bien").length, 7);
  for (const id of ["word-ir--go", "word-ir--work-run", "word-ir--social-outing",
    "word-tipo--guy", "word-tipo--kind", "word-tipo--typeface"]) assert.ok(cards.has(id), id);
  assert.ok(manifest.cardCatalog.some((card) => card.kind === "word" && card.promptEs === "gustan"));
  assert.ok(manifest.cardCatalog.some((card) => card.kind === "word" && card.promptEs === "donde"));
});

test("misleading object and recipient teaching is corrected on exact occurrences", () => {
  const nerd = bundleById.get("es-xkcd-caza-de-nerds").comic;
  const region = nerd.regions.find((region) => region.id.endsWith(":problem-effect"));
  const lo = region.words.find((word) => word.id.endsWith(":w07"));
  assert.equal(lo.cardIds[0], "word-lo--object-pronoun");
  const application = region.applications.find((app) => app.cardId === lo.cardIds[0] && app.participantWordIds.includes(lo.id));
  assert.deepEqual(application.participantWordIds, [lo.id]);
  assert.match(application.explanationEn, /ordinary object/);
  assert.match(application.explanationEn, /not an error/);
  const photos = bundleById.get("photos").comic.regions.find((region) => region.id === "experiences-incorrectly");
  for (const number of [2, 46]) {
    const word = photos.words.find((word) => word.id === `experiences-incorrectly-word-${number}`);
    assert.equal(word.cardIds[0], "word-te--experiencer");
    assert.ok(photos.applications.some((app) => app.cardId === word.cardIds[0] && app.participantWordIds.includes(word.id)));
  }
  assert.ok(photos.words.some((word) => word.cardIds[0] === "word-te--indirect"), "a real recipient still keeps its distinct card");
});

test("ambiguous old Photos evidence is archived and corrected cards learn from fresh help only", () => {
  const now = 1_800_000_000_000;
  const comic = manifest.comics.find((comic) => comic.id === "photos");
  let before = startComic({ ...createSrsState(), cardIdentityRevision: 0 },
    { id: "photos", cardIds: ["word-te--indirect"] }, now);
  before = recordCardOpen(before, "word-te--indirect", now + 10);
  let after = reconcileSrsState(hydrateSrsState(serializeSrsState(before), now + 20), manifest.comics, now + 20);
  assert.deepEqual(after.archivedCards["word-te--indirect"], before.cards["word-te--indirect"]);
  assert.equal(scoreCardPriority(after, "word-te--indirect", now + 20).openCount, 0);
  assert.equal(scoreCardPriority(after, "word-te--experiencer", now + 20).openCount, 0);
  assert.deepEqual(after.activeSession.cardIds, comic.cardIds);
  after = recordCardOpen(after, "word-te--experiencer", now + 30);
  assert.equal(scoreCardPriority(after, "word-te--experiencer", now + 30).openCount, 1);
  assert.deepEqual(hydrateSrsState(serializeSrsState(after), now + 40), after);
  const complete = completeComic(after, now + 50);
  assert.equal(complete.comics.photos.completions, 1);
});
