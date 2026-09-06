import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { auditWordCardReuse, unexpectedWordCardDuplicates } from "../scripts/lib/word-card-reuse.mjs";

const card = (id, promptEs, answerEn, extra = {}) => ({
  id, kind: "word", promptEs, answerEn, noteEn: "", ...extra,
});
const corpus = (cards) => ({
  cardCatalog: cards,
  comics: [{ id: "one", title: "One", cardIds: cards.map(({ id }) => id) }],
});

test("reuse audit finds identical teaching despite differing metadata and includes drafts", () => {
  const manifest = corpus([
    card("first", "bien", "well", { tags: ["seed"], reviewStatus: "needs-review" }),
    card("second", "bien", "well", { tags: ["sense"], reviewStatus: "human-verified" }),
    card("opener", "bien", "all right"),
    card("unreachable", "bien", "well"),
  ]);
  manifest.comics[0].cardIds = ["first", "second", "opener", "first"];
  manifest.comics.push({ id: "two", title: "Two", cardIds: ["second"] });
  const audit = auditWordCardReuse(manifest);
  assert.deepEqual(audit.exactDuplicates.map((group) => group.map(({ id }) => id)), [["first", "second"]]);
  assert.equal(audit.groups[0].comicCount, 2, "count union of comics, not sum of card counts");
  assert.equal(audit.groups[0].cards.find(({ id }) => id === "first").comicCount, 1);
  assert.equal(audit.groups[0].cards.find(({ id }) => id === "first").reviewStatus, "needs-review");
  assert.equal(audit.groups[0].cards.find(({ id }) => id === "second").comicCount, 2);
});

test("reuse candidates preserve teaching differences, accents and inflected forms", () => {
  const audit = auditWordCardReuse(corpus([
    card("a", "sí", "yes"),
    card("b", "si", "yes"),
    card("c", "Sí", "yes"),
    card("d", "bueno", "good"),
    card("e", "buena", "good"),
    card("f", "sí", "yes", { noteEn: "A distinct lesson.", example: { es: "Sí, voy.", en: "Yes, I am going." } }),
  ]));
  assert.equal(audit.exactDuplicates.length, 0);
  assert.equal(audit.groups.find(({ surface }) => surface === "sí").cards.length, 3);
  assert.equal(audit.groups.find(({ surface }) => surface === "si").cards.length, 1);
});

test("baseline permits only the acknowledged pair, and cannot hide added duplicates", () => {
  const baseline = [{ cardIds: ["a", "b"], reason: "Existing pair under review." }];
  const pair = [card("a", "bien", "well"), card("b", "bien", "well")];
  assert.deepEqual(unexpectedWordCardDuplicates(auditWordCardReuse(corpus(pair)), baseline), []);
  assert.equal(unexpectedWordCardDuplicates(auditWordCardReuse(corpus([
    ...pair, card("c", "bien", "well"),
  ])), baseline).length, 1);
  assert.equal(unexpectedWordCardDuplicates(auditWordCardReuse(corpus([
    card("x", "otra", "another"), card("y", "otra", "another"),
  ])), baseline).length, 1);
  assert.deepEqual(unexpectedWordCardDuplicates(auditWordCardReuse(corpus([pair[0]])), baseline), []);
});

test("published corpus introduces no unreviewed identical word-card pairs", async () => {
  const [manifest, baseline] = await Promise.all([
    "../public/corpus/manifest.json", "../data/review/word-card-reuse-baseline.json",
  ].map(async (file) => JSON.parse(await fs.readFile(new URL(file, import.meta.url), "utf8"))));
  assert.deepEqual(unexpectedWordCardDuplicates(auditWordCardReuse(manifest), baseline), []);
});

test("bien shares its ordinary well sense across four comics with exact occurrence links", async () => {
  const manifest = JSON.parse(await fs.readFile(new URL("../public/corpus/manifest.json", import.meta.url), "utf8"));
  const group = auditWordCardReuse(manifest).groups.find(({ surface }) => surface === "bien");
  assert.equal(group.comicCount, 20);
  assert.equal(group.cards.length, 7);
  const shared = group.cards.find(({ id }) => id === "word-bien--well");
  const expectedIds = [
    "es-xkcd-dia-de-28-horas", "es-xkcd-dibujar-estrellas", "es-xkcd-quince-años", "tech-support",
  ];
  assert.deepEqual(shared.comics.map(({ id }) => id).sort(), expectedIds.sort());
  const retired = ["word-bien--so-far-so-good", "word-bien--well-played", "word-bien--working-properly"];
  assert.ok(retired.every((id) => !manifest.cardCatalog.some((card) => card.id === id)));
  const definition = manifest.cardCatalog.find(({ id }) => id === shared.id);
  assert.equal(definition.answerEn, "well; properly");
  assert.equal(definition.noteEn, "", "a direct word translation stays compact");
  for (const id of expectedIds) {
    const bundle = JSON.parse(await fs.readFile(new URL(`../public/corpus/comics/${id}.json`, import.meta.url), "utf8"));
    const words = bundle.comic.regions.flatMap(({ words }) => words);
    const occurrences = words.filter((word) => word.cardIds.includes(shared.id));
    assert.equal(occurrences.length, 1, id);
    assert.equal(occurrences[0].normalized, "bien");
    assert.equal(occurrences[0].cardIds[0], shared.id);
    assert.ok(words.every((word) => word.cardIds.every((cardId) => !retired.includes(cardId))));
    if (id === "es-xkcd-dia-de-28-horas") {
      assert.ok(occurrences[0].cardIds.includes("phrase-bien-jugado"));
    }
    if (id === "es-xkcd-dibujar-estrellas") {
      const application = bundle.comic.regions.flatMap(({ applications }) => applications)
        .find(({ cardId }) => cardId === shared.id);
      assert.deepEqual(application.participantWordIds, [occurrences[0].id]);
      assert.equal(application.exampleEs, "BIEN");
      assert.ok(!bundle.comic.cardIds.includes(application.id), "application is display-only");
    }
  }
});
