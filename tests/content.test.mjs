import assert from "node:assert/strict";
import test from "node:test";
import {
  CARDS,
  CARD_BY_ID,
  COMICS,
  validateContent,
} from "../lib/content.ts";

test("every printed Spanish word has its own meaning card first", () => {
  const words = COMICS.flatMap((comic) =>
    comic.regions.flatMap((region) => region.words),
  );
  const normalizedForms = new Set(words.map((word) => word.normalized));

  assert.equal(words.length, 530);
  assert.equal(normalizedForms.size, 307);
  for (const word of words) {
    const meaningCard = CARD_BY_ID.get(word.cardIds[0]);
    assert.ok(word.cardIds[0].startsWith(`word-${word.normalized}`));
    assert.equal(meaningCard?.kind, "word");
    assert.equal(meaningCard?.promptEs, word.normalized);
  }
});

test("higher-level cards are attached to the exact words that introduce them", () => {
  const firstBubble = COMICS[0].regions[0];
  assert.equal(firstBubble.labelEs, "¿VIENES A LA CAMA?");
  assert.deepEqual(
    firstBubble.words.map((word) => word.text),
    ["VIENES", "A", "LA", "CAMA"],
  );
  for (const word of firstBubble.words) {
    assert.ok(word.cardIds.includes("phrase-venir-a-la-cama"));
  }

  const flyingBubble = COMICS[1].regions.find(
    (region) => region.id === "youre-flying",
  );
  assert.ok(flyingBubble);
  const estas = flyingBubble.words.find((word) => word.normalized === "estás");
  const volando = flyingBubble.words.find(
    (word) => word.normalized === "volando",
  );
  assert.ok(estas?.cardIds.includes("grammar-estar-gerundio"));
  assert.ok(volando?.cardIds.includes("grammar-estar-gerundio"));
});

test("all curriculum cards are reachable and content validation is clean", () => {
  const usedCardIds = new Set(
    COMICS.flatMap((comic) =>
      comic.regions.flatMap((region) =>
        region.words.flatMap((word) => word.cardIds),
      ),
    ),
  );

  assert.equal(CARDS.length, 408);
  assert.equal(CARDS.filter((card) => card.kind === "word").length, 342);
  assert.equal(CARDS.filter((card) => card.kind !== "word").length, 66);
  assert.equal(usedCardIds.size, CARDS.length);
  assert.deepEqual(validateContent(), []);
});

test("polysemous function words reveal their meaning in this exact context", () => {
  const everyRegion = COMICS.flatMap((comic) => comic.regions);
  const comingToBed = everyRegion.find((region) => region.id === "coming-to-bed");
  const experiences = everyRegion.find(
    (region) => region.id === "experiences-incorrectly",
  );
  assert.ok(comingToBed);
  assert.ok(experiences);

  const articleLa = comingToBed.words.find((word) => word.normalized === "la");
  const exclamativeQue = experiences.words.find(
    (word, index) =>
      word.normalized === "qué" &&
      experiences.words[index - 1]?.normalized === "imagina",
  );
  assert.ok(articleLa);
  assert.ok(exclamativeQue);
  assert.equal(CARD_BY_ID.get(articleLa.cardIds[0])?.answerEn, "the (feminine singular article)");
  assert.equal(
    CARD_BY_ID.get(exclamativeQue.cardIds[0])?.answerEn,
    "how (to what a degree, as in qué insoportable)",
  );
  assert.ok(!exclamativeQue.cardIds.includes("question-words"));
});

test("every printed word has at least one nonzero clickable box inside its comic image", () => {
  const occurrences = COMICS.flatMap((comic) =>
    comic.regions.flatMap((region) =>
      region.words.map((word) => ({ comic, region, word })),
    ),
  );

  assert.equal(occurrences.length, 530);
  const epsilon = 0.000_001;
  for (const { comic, region, word } of occurrences) {
    assert.ok(
      Array.isArray(word.bounds) && word.bounds.length > 0,
      `${comic.id}/${region.id}/${word.id} has at least one hitbox`,
    );
    for (const bounds of word.bounds) {
      const { x, y, width, height } = bounds;
      const values = [x, y, width, height];
      assert.ok(
        values.every(Number.isFinite),
        `${comic.id}/${region.id}/${word.id} has finite bounds`,
      );
      assert.ok(
        x >= -epsilon && y >= -epsilon,
        `${word.id} starts inside the image`,
      );
      assert.ok(width > 0 && height > 0, `${word.id} has a clickable area`);
      assert.ok(
        x + width <= 100 + epsilon,
        `${word.id} stays inside image width`,
      );
      assert.ok(
        y + height <= 100 + epsilon,
        `${word.id} stays inside image height`,
      );

      const centerX = x + width / 2;
      const centerY = y + height / 2;
      assert.ok(
        centerX >= region.bounds.x - epsilon &&
          centerX <= region.bounds.x + region.bounds.width + epsilon &&
          centerY >= region.bounds.y - epsilon &&
          centerY <= region.bounds.y + region.bounds.height + epsilon,
        `${word.id} is centered in its owning text region`,
      );
    }
  }
});
