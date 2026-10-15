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
const lesson = await read("../data/review/como-ser-lesson-2026-09-07.json");
const policy = await read("../data/authoring/card-reuse-policy.json");
const cardId = "grammar-como-ser-description";
const target = manifest.comics.find(({ id }) => id === "es-xkcd-google-plus");
const oldComic = { ...target, cardIds: target.cardIds.filter((id) => id !== cardId) };
const now = 1_800_000_000_000;

test("cómo es has a simple expression-meaning front while keeping its existing identity", () => {
  const card = manifest.cardCatalog.find(({ id }) => id === cardId);
  assert.equal(card.kind, "phrase");
  assert.equal(card.questionEn, "What does “¿Cómo es?” mean?");
  assert.equal(card.promptEs, "¿cómo es?");
  assert.equal(card.answerEn, "What is it like?");
  assert.match(card.noteEn, /separate word for English “it”/);
  assert.match(card.noteEn, /es for one person or thing and son for more than one/);
  assert.doesNotMatch(card.noteEn, /interrogative|copula|subject|ellipsis|linking uses|even without|Google|Facebook/i);
  assert.deepEqual(card.example, { es: "¿Cómo es tu casa? Es pequeña.", en: "What is your house like? It is small." });
  for (const [key, value] of Object.entries({ ...lesson.card, ...lesson.presentationUpdate.patch })) assert.deepEqual(card[key], value);
  assert.deepEqual(policy.reviews.find((review) => review.cardId === cardId), lesson.reuseReview);
  assert.deepEqual(validateCardReusePolicy(manifest.cardCatalog, policy), []);
  assert.equal(manifest.counts.cards, lesson.beforeCounts.cards + 1);
  assert.notEqual(manifest.revision, lesson.sourceManifestRevision);
});

test("the description lesson links exactly CÓMO and ES, not Y or unrelated uses", async () => {
  assert.deepEqual(manifest.comics.filter(({ cardIds }) => cardIds.includes(cardId)).map(({ id }) => id), [target.id]);
  const { comic, cards } = await read(`../public/corpus/comics/${target.loadKey}.json`);
  const region = comic.regions.find(({ id }) => id === "es-xkcd-google-plus:how-is-it");
  const participants = region.words.filter(({ cardIds }) => cardIds.includes(cardId));
  assert.deepEqual(participants.map(({ text }) => text), ["CÓMO", "ES"]);
  assert.deepEqual(participants.map(({ cardIds }) => cardIds[0]), ["word-cómo", "word-es"]);
  assert.deepEqual(region.words.find(({ text }) => text === "Y").cardIds, ["word-y"]);
  const apps = comic.regions.flatMap(({ applications }) => applications).filter((app) => app.cardId === cardId);
  assert.deepEqual(apps, lesson.applications.map(({ application }) => application));
  assert.deepEqual(apps[0].participantWordIds, participants.map(({ id }) => id));
  assert.equal(apps[0].exampleEs, "CÓMO ES");
  assert.ok(cards.some(({ id }) => id === cardId));
  assert.ok(!target.cardIds.includes(apps[0].id), "the occurrence note is not a scheduled card");
});

test("an active comic gets one fresh lesson exposure without inheriting word-card help", () => {
  let before = startComic(createSrsState(), oldComic, now);
  before = recordCardOpen(before, "word-cómo", now + 10);
  before = recordCardOpen(before, "word-es", now + 20);
  const restored = reconcileSrsState(hydrateSrsState(serializeSrsState(before), now + 100), manifest.comics, now + 100);
  assert.deepEqual(restored.cards[cardId].exposures, [{
    sessionId: before.activeSession.sessionId, comicId: target.id,
    displayedAtMs: now + 100, openedAtMs: [], completedAtMs: null,
  }]);
  assert.equal(scoreCardPriority(restored, cardId, now + 100).openCount, 0);
  for (const id of oldComic.cardIds) assert.deepEqual(restored.cards[id], before.cards[id], id);
  assert.deepEqual(restored.activeSession.openedCardIds, before.activeSession.openedCardIds);
  assert.equal(restored.activeSession.startedAtMs, now);
  const applicationId = lesson.applications[0].application.id;
  assert.equal(restored.cards[applicationId], undefined);
  assert.deepEqual(recordCardOpen(restored, applicationId, now + 200), restored);
  assert.deepEqual(reconcileSrsState(restored, manifest.comics, now + 200), restored);
  const resumed = selectNextComic(manifest.comics, restored, now + 200);
  assert.equal(resumed.reason, "resume");
  assert.deepEqual(resumed.state, restored);
  const opened = recordCardOpen(restored, cardId, now + 300);
  assert.deepEqual(opened.cards[cardId].exposures[0].openedAtMs, [now + 300]);
  for (const id of oldComic.cardIds) assert.deepEqual(opened.cards[id], before.cards[id], id);
});

test("adding the lesson never repeats a finished comic or fabricates earlier evidence", () => {
  const before = completeComic(startComic(createSrsState(), oldComic, now), now + 20);
  const restored = reconcileSrsState(before, manifest.comics, now + 100);
  assert.equal(restored.cards[cardId], undefined);
  assert.equal(restored.activeSession, null);
  assert.deepEqual(restored.comics, before.comics);
  assert.notEqual(selectNextComic(manifest.comics, restored, now + 200).comic?.id, target.id);
});

test("relabeling the same lesson as an expression preserves existing reviews", () => {
  assert.equal(cardId, lesson.card.id);
  const before = recordCardOpen(startComic(createSrsState(), target, now), lesson.card.id, now + 20);
  const restored = reconcileSrsState(hydrateSrsState(serializeSrsState(before), now + 100), manifest.comics, now + 100);
  assert.deepEqual(restored, before);
  assert.equal(scoreCardPriority(restored, cardId, now + 100).openCount, 1);
});
