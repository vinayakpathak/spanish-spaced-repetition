import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import test from "node:test";
import { cardTitle, cardTitleLanguage } from "../lib/card-presentation.ts";
import { hiddenPatternInstructionFields } from "../scripts/lib/learner-copy.mjs";
import { SEED_CURRICULUM_REVISION } from "../lib/seed-corrections.js";

const read = async (path) => JSON.parse(await fs.readFile(new URL(path, import.meta.url), "utf8"));

test("nonword titles never expose internal Spanish instructions, even for incomplete drafts", () => {
  const promptEs = "tener que + verbo en forma de diccionario";
  for (const kind of ["grammar", "phrase", "concept"]) {
    const card = { kind, promptEs, questionEn: "How do you say someone has to do something?" };
    assert.equal(cardTitle(card), card.questionEn);
    assert.equal(cardTitleLanguage(card), "en");
    assert.notEqual(cardTitle({ ...card, questionEn: undefined }), promptEs);
    assert.notEqual(cardTitle({ ...card, questionEn: "  " }), promptEs);
  }
  assert.equal(cardTitle({ kind: "word", promptEs: "bien" }), "bien");
  assert.equal(cardTitleLanguage({ kind: "word" }), "es");
});

test("the copy guard rejects hidden notation legends but allows material being taught", () => {
  assert.deepEqual(hiddenPatternInstructionFields({ kind: "grammar", noteEn: "The plus sign means followed by." }), ["noteEn"]);
  assert.deepEqual(hiddenPatternInstructionFields({ kind: "concept", noteEn: "In the prompt, the dots separate the ideas." }), ["noteEn"]);
  assert.deepEqual(hiddenPatternInstructionFields({ kind: "concept", noteEn: "Reverse Polish notation places the operation after the numbers." }), []);
  assert.deepEqual(hiddenPatternInstructionFields({ kind: "word", noteEn: "Hay means there is or there are." }), []);
});

test("all published lessons have English fronts and no hidden-pattern instructions", async () => {
  const manifest = await read("../public/corpus/manifest.json");
  for (const card of manifest.cardCatalog) {
    if (card.kind !== "word") {
      assert.ok(card.questionEn?.trim(), card.id);
      assert.equal(cardTitle(card), card.questionEn, card.id);
      assert.equal(cardTitleLanguage(card), "en", card.id);
    }
    assert.deepEqual(hiddenPatternInstructionFields(card), [], card.id);
  }
  const obligation = manifest.cardCatalog.find((card) => card.id === "grammar-tener-que-infinitive");
  assert.match(obligation.noteEn, /tengo que means 'I have to,?'/i);
  assert.match(obligation.noteEn, /hablar means 'to speak,?'/i);
  assert.deepEqual(obligation.example, { es: "Tengo que salir temprano.", en: "I have to leave early." });
});

test("qué explains its meanings with translations, not untaught rules or vague labels", async () => {
  const manifest = await read("../public/corpus/manifest.json");
  const card = manifest.cardCatalog.find(({ id }) => id === "word-qué--interrogative");
  assert.equal(card.answerEn, "what; which");
  assert.equal(card.noteEn, "Qué means “what” in ¿Qué quieres? (“What do you want?”) and “which” in ¿Qué libro quieres? (“Which book do you want?”). You can also use it to say what you do not know: No sé qué elegir means “I do not know what to choose.”");
  assert.doesNotMatch(card.noteEn, /linking uses|even without|written accent|noun|interrogative/i);
  assert.deepEqual(card.example, { es: "No sé qué ruta elegir.", en: "I do not know which route to choose." });
  const entries = manifest.comics.filter(({ cardIds }) => cardIds.includes(card.id));
  assert.equal(entries.length, 56);
  for (const entry of entries) {
    const bundle = await read(`../public/corpus/comics/${entry.loadKey}.json`);
    assert.equal(bundle.cards.find(({ id }) => id === card.id).noteEn, card.noteEn);
  }
});

test("the text audit preserves cards, links, and examples except explicit later curriculum changes", async () => {
  const manifest = await read("../public/corpus/manifest.json");
  const audit = await read("../data/review/learner-copy-audit-2026-09-07.json");
  const retirement = await read("../data/review/google-plus-card-removal-2026-09-07.json");
  const addition = await read("../data/review/como-ser-lesson-2026-09-07.json");
  assert.equal(addition.card.id, "grammar-como-ser-description");
  assert.equal(retirement.cardId, "concept-google-plus-facebook-comparison");
  assert.deepEqual(retirement.beforeCounts, audit.beforeCounts);
  assert.deepEqual(addition.beforeCounts, {
    ...audit.beforeCounts, cards: audit.beforeCounts.cards - 1,
    schedulableCards: audit.beforeCounts.schedulableCards - 1,
  });
  assert.deepEqual(manifest.counts, audit.beforeCounts);
  assert.ok(!manifest.cardCatalog.some(({ id }) => id === retirement.cardId));
  // Undo only the recorded removal/addition to check the original copy-only
  // audit. Dedicated lesson tests check the new card's exact links separately.
  const index = manifest.comics.map(({ id, cardIds }) => ({ id, cardIds: cardIds.filter((cardId) => cardId !== addition.card.id) }));
  index.find(({ id }) => id === retirement.comicId).cardIds.splice(retirement.comicCardIndex, 0, retirement.cardId);
  assert.equal(createHash("sha256").update(JSON.stringify(index)).digest("hex"), audit.beforeCardIndexSha256);
  const links = await Promise.all(manifest.comics.map(async (entry) => {
    const { comic } = await read(`../public/corpus/comics/${entry.loadKey}.json`);
    return { id: comic.id, regions: comic.regions.map((region) => ({
      id: region.id, words: region.words.map(({ id, cardIds }) => ({ id, cardIds: cardIds.filter((cardId) => cardId !== addition.card.id) })),
      applications: region.applications.filter(({ cardId }) => cardId !== addition.card.id)
        .map(({ id, cardId, participantWordIds, exampleEs }) => ({ id, cardId, participantWordIds, exampleEs })),
    })) };
  }));
  const words = links.find(({ id }) => id === retirement.comicId).regions.flatMap(({ words }) => words);
  assert.equal(retirement.wordLinks.length, 3);
  for (const { wordId, cardIndex } of retirement.wordLinks) {
    words.find(({ id }) => id === wordId).cardIds.splice(cardIndex, 0, retirement.cardId);
  }
  assert.equal(createHash("sha256").update(JSON.stringify(links)).digest("hex"), audit.beforeLearningLinksSha256);
  const examples = manifest.cardCatalog.filter(({ id }) => id !== addition.card.id).map(({ id, example }) => ({ id, example }));
  examples.splice(retirement.catalogIndex, 0, { id: retirement.cardId, example: retirement.removedCard.example });
  assert.equal(createHash("sha256").update(JSON.stringify(examples)).digest("hex"), audit.beforeExamplesSha256);
  assert.notEqual(manifest.revision, audit.sourceManifestRevision);
  assert.equal(SEED_CURRICULUM_REVISION, "reviewed-v4-20260907");
  assert.equal(audit.counts.conceptQuestionsAdded, 130);
  assert.equal(audit.plans.find((plan) => plan.name === "grammar-plan").reviewedIds.length, 328);
  assert.equal(audit.plans.find((plan) => plan.name === "phrase-plan").reviewedIds.length, 599);
  for (const change of audit.cardChanges) {
    assert.ok(Object.keys(change.patch).every((key) => ["questionEn", "answerEn", "noteEn"].includes(key)));
  }
  for (const change of audit.applicationChanges) assert.deepEqual(Object.keys(change.patch), ["explanationEn"]);
});
