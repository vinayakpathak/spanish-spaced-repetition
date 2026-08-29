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

test("difficult word forms teach the construction while simple words stay compact", () => {
  const taughtWordCards = CARDS.filter(
    (card) => card.kind === "word" && card.noteEn,
  );
  const joiner = CARD_BY_ID.get("word-a--join-complement");
  const simpleNoun = CARD_BY_ID.get("word-cama");

  assert.equal(taughtWordCards.length, 30);
  assert.equal(
    joiner?.answerEn,
    "links unirse to the person or group being joined",
  );
  assert.match(joiner?.noteEn ?? "", /takes a before the person, group/i);
  assert.deepEqual(joiner?.example, {
    es: "Quiero unirme a este grupo.",
    en: "I want to join this group.",
  });
  assert.equal(simpleNoun?.answerEn, "bed");
  assert.equal(simpleNoun?.noteEn, "");
  assert.equal(simpleNoun?.example, undefined);
  for (const card of CARDS.filter((candidate) => candidate.kind === "word")) {
    assert.doesNotMatch(
      card.noteEn,
      /this card tracks|this exact surface form|comic context/i,
    );
  }
});

test("reusable cards are attached to every and only participating word", () => {
  const regions = COMICS.flatMap((comic) => comic.regions);
  const firstBubble = regions.find((region) => region.id === "coming-to-bed");
  const stillDown = regions.find((region) => region.id === "still-down");
  const secret = regions.find((region) => region.id === "shibboleet-dream");
  const experiences = regions.find(
    (region) => region.id === "experiences-incorrectly",
  );
  const takingPhotos = regions.find(
    (region) => region.id === "photos-instead-of-view",
  );
  const computerTrouble = regions.find(
    (region) => region.id === "computer-trouble",
  );
  const sanitizing = regions.find((region) => region.id === "sanitize-inputs");
  const engineer = regions.find((region) => region.id === "reach-engineer");
  const payingAttention = regions.find(
    (region) => region.id === "pay-more-attention",
  );
  assert.ok(
    firstBubble &&
      stillDown &&
      secret &&
      experiences &&
      takingPhotos &&
      computerTrouble &&
      sanitizing &&
      engineer &&
      payingAttention,
  );

  const linkedWords = (region, cardId) =>
    region.words
      .filter((word) => word.cardIds.includes(cardId))
      .map((word) => word.normalized);

  assert.deepEqual(
    linkedWords(firstBubble, "grammar-present-immediate-plan"),
    ["vienes"],
  );
  assert.deepEqual(
    linkedWords(stillDown, "phrase-no-tener-nada-que-ver"),
    ["no", "tiene", "nada", "que", "ver"],
  );
  assert.deepEqual(
    linkedWords(secret, "grammar-se-lo-pronouns"),
    ["se", "lo"],
  );
  assert.deepEqual(
    linkedWords(experiences, "grammar-importar-indirect-object"),
    ["te", "importa"],
  );
  assert.deepEqual(
    linkedWords(takingPhotos, "phrase-hacerle-una-foto"),
    ["haga", "fotos"],
  );
  assert.deepEqual(
    linkedWords(experiences, "grammar-evaluative-subjunctive"),
    ["insoportable", "es", "que", "diga"],
  );
  assert.deepEqual(
    linkedWords(computerTrouble, "phrase-tener-problemas"),
    ["teniendo", "problemas"],
  );
  assert.deepEqual(
    linkedWords(sanitizing, "concept-input-sanitization"),
    ["sanear", "inserción", "bases", "datos"],
  );
  assert.deepEqual(
    linkedWords(engineer, "grammar-deberia-expectation"),
    ["debería", "ir"],
  );
  assert.deepEqual(
    linkedWords(payingAttention, "phrase-prestar-atencion"),
    ["prestar", "atención"],
  );
  assert.deepEqual(
    linkedWords(takingPhotos, "grammar-por-que-vs-porque"),
    ["por", "qué"],
  );
  assert.deepEqual(
    linkedWords(takingPhotos, "question-words"),
    ["qué"],
  );
  assert.deepEqual(
    linkedWords(engineer, "grammar-formal-address"),
    ["ve", "usted", "puede"],
  );
  assert.deepEqual(
    linkedWords(engineer, "grammar-formal-command"),
    ["perdone"],
  );

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

  const everyWord = regions.flatMap((region) => region.words);
  const linkedCount = (cardId) =>
    everyWord.filter((word) => word.cardIds.includes(cardId)).length;
  assert.equal(linkedCount("question-words"), 8);
  assert.equal(linkedCount("grammar-por-que-vs-porque"), 4);
  assert.equal(linkedCount("grammar-formal-address"), 6);
});

test("sentence-shaped and redundant legacy cards are not schedulable", () => {
  const obsoleteIds = [
    "phrase-venir-a-la-cama",
    "phrase-esto-es-importante",
    "concept-programming-code",
    "phrase-registros-estudiantiles",
    "phrase-tener-experiencias",
    "concept-trailing-off-hesitation",
    "concept-support-engineer",
    "phrase-no-se-lo-diga",
    "phrase-why-care",
  ];
  for (const cardId of obsoleteIds) assert.equal(CARD_BY_ID.has(cardId), false);

  assert.equal(
    CARD_BY_ID.get("grammar-se-lo-pronouns")?.promptEs,
    "le/les + lo/la/los/las → se lo/se la/se los/se las",
  );
  assert.equal(
    CARD_BY_ID.get("grammar-importar-indirect-object")?.promptEs,
    "me/te/le importa",
  );
});

test("all grammar and expression cards teach complete beginners", () => {
  const grammarCards = CARDS.filter((card) => card.kind === "grammar");
  const phraseCards = CARDS.filter((card) => card.kind === "phrase");
  const languageCards = [...grammarCards, ...phraseCards];

  assert.equal(grammarCards.length, 25);
  assert.equal(phraseCards.length, 23);
  assert.equal(languageCards.length, 48);
  for (const card of languageCards) {
    assert.ok(card.questionEn?.trim(), `${card.id} has a plain-English question`);
    assert.ok(card.noteEn.trim(), `${card.id} explains how the rule works`);
    assert.ok(card.example?.es.trim(), `${card.id} has a generic Spanish example`);
    assert.ok(card.example?.en.trim(), `${card.id} translates its generic example`);
    assert.doesNotMatch(card.noteEn, /comic examples?:/i);
    assert.doesNotMatch(card.noteEn, /\bcomic\b|this translation/i);
  }

  const normalizedBubbles = new Set(
    COMICS.flatMap((comic) => comic.regions).map((region) =>
      region.labelEs
        .toLocaleLowerCase("es")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim(),
    ),
  );
  for (const card of languageCards) {
    const normalizedExample = card.example.es
      .toLocaleLowerCase("es")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    assert.equal(
      normalizedBubbles.has(normalizedExample),
      false,
      `${card.id} uses an invented example rather than a whole comic bubble`,
    );
  }

  assert.equal(CARD_BY_ID.get("grammar-por-que-vs-porque")?.answerEn,
    "Por qué means “why”; porque means “because.”");
  const repeat = CARD_BY_ID.get("phrase-volver-a-infinitive");
  assert.equal(
    repeat?.questionEn,
    "How do you say that someone does something again?",
  );
  assert.match(repeat?.noteEn ?? "", /dictionary form.*infinitive/is);
  assert.deepEqual(repeat?.example, {
    es: "Marta vuelve a llamar.",
    en: "Marta calls again.",
  });
  assert.match(
    CARD_BY_ID.get("grammar-hypothetical")?.noteEn ?? "",
    /imperfect subjunctive[\s\S]*conditional/i,
  );
  assert.match(
    CARD_BY_ID.get("grammar-se-lo-pronouns")?.noteEn ?? "",
    /se still stands for the recipient/i,
  );
  assert.match(
    CARD_BY_ID.get("grammar-importar-indirect-object")?.noteEn ?? "",
    /the book matters to me/i,
  );
});

test("comic applications stay separate from shared language cards", () => {
  const regions = COMICS.flatMap((comic) => comic.regions);
  const applications = regions.flatMap((region) => region.applications);

  assert.equal(
    applications.filter(
      (application) => CARD_BY_ID.get(application.cardId)?.kind === "word",
    ).length,
    26,
  );
  assert.equal(
    applications.filter(
      (application) => CARD_BY_ID.get(application.cardId)?.kind === "grammar",
    ).length,
    55,
  );
  assert.equal(
    applications.filter(
      (application) => CARD_BY_ID.get(application.cardId)?.kind === "phrase",
    ).length,
    27,
  );

  for (const region of regions) {
    for (const application of region.applications) {
      const card = CARD_BY_ID.get(application.cardId);
      assert.ok(
        card?.kind === "word" ||
          card?.kind === "grammar" ||
          card?.kind === "phrase",
      );
      assert.equal(
        CARD_BY_ID.has(application.id),
        false,
        "comic applications are display-only, not scheduled cards",
      );
      assert.equal(
        COMICS.some((comic) => comic.cardIds.includes(application.id)),
        false,
        "application identities never enter scheduler indexes",
      );
      assert.ok(application.exampleEs.trim());
      assert.ok(application.explanationEn.trim());
      assert.ok(application.participantWordIds.length > 0);
      for (const wordId of application.participantWordIds) {
        const word = region.words.find((candidate) => candidate.id === wordId);
        assert.ok(word, `${application.id} references a word in its region`);
        if (card.kind === "word") {
          assert.equal(application.participantWordIds.length, 1);
          assert.equal(word.cardIds[0], application.cardId);
        } else {
          assert.ok(word.cardIds.slice(1).includes(application.cardId));
        }
      }
    }

    for (const word of region.words) {
      for (const cardId of word.cardIds.slice(1)) {
        const kind = CARD_BY_ID.get(cardId)?.kind;
        if (kind !== "grammar" && kind !== "phrase") continue;
        assert.equal(
          region.applications.filter(
            (application) =>
              application.cardId === cardId &&
              application.participantWordIds.includes(word.id),
          ).length,
          1,
          `${region.id}/${word.id}/${cardId} has one local explanation`,
        );
      }
    }
  }

  const flying = regions.find((region) => region.id === "youre-flying");
  const trouble = regions.find((region) => region.id === "computer-trouble");
  assert.ok(flying && trouble);
  const flyingApp = flying.applications.find(
    (application) => application.cardId === "grammar-estar-gerundio",
  );
  const troubleApp = trouble.applications.find(
    (application) => application.cardId === "grammar-estar-gerundio",
  );
  assert.ok(flyingApp && troubleApp);
  assert.equal(
    CARD_BY_ID.get(flyingApp.cardId),
    CARD_BY_ID.get(troubleApp.cardId),
    "both comics schedule the same shared card",
  );
  assert.notEqual(flyingApp.exampleEs, troubleApp.exampleEs);
  assert.notEqual(flyingApp.explanationEn, troubleApp.explanationEn);

  const flyingParticipant = flying.words.find((word) => word.normalized === "estás");
  const adjacentQuestion = flying.words.find((word) => word.normalized === "cómo");
  assert.ok(flyingParticipant && adjacentQuestion);
  assert.ok(flyingApp.participantWordIds.includes(flyingParticipant.id));
  assert.ok(!flyingApp.participantWordIds.includes(adjacentQuestion.id));

  const joinUs = regions.find(
    (region) => region.id === "dynamic-typing-join-us",
  );
  assert.ok(joinUs);
  const joinA = joinUs.words.find(
    (word) => word.cardIds[0] === "word-a--join-complement",
  );
  assert.ok(joinA);
  const joinApplication = joinUs.applications.find(
    (application) =>
      application.cardId === "word-a--join-complement" &&
      application.participantWordIds.includes(joinA.id),
  );
  assert.equal(joinApplication?.exampleEs.toLocaleLowerCase("es"), "únete a nosotros");
  assert.match(joinApplication?.explanationEn ?? "", /join us/i);
  assert.deepEqual(joinApplication?.participantWordIds, [joinA.id]);

  const personalAApplications = applications.filter(
    (application) => application.cardId === "word-a--personal-a",
  );
  assert.equal(personalAApplications.length, 2);
  assert.equal(
    CARD_BY_ID.get(personalAApplications[0].cardId),
    CARD_BY_ID.get(personalAApplications[1].cardId),
  );
  assert.notEqual(
    personalAApplications[0].exampleEs,
    personalAApplications[1].exampleEs,
  );

  const repeatApplications = applications.filter(
    (application) => application.cardId === "phrase-volver-a-infinitive",
  );
  assert.equal(repeatApplications.length, 2);
  assert.equal(
    CARD_BY_ID.get(repeatApplications[0].cardId),
    CARD_BY_ID.get(repeatApplications[1].cardId),
    "each occurrence schedules the same reusable expression card",
  );
  assert.notEqual(
    repeatApplications[0].exampleEs,
    repeatApplications[1].exampleEs,
  );

  const applicationText = (application) =>
    `${application?.exampleEs ?? ""} ${application?.explanationEn ?? ""}`;
  const poderApplication = applications.find(
    (application) => application.cardId === "grammar-poder-ellipsis",
  );
  const immediatePlanApplication = applications.find(
    (application) => application.cardId === "grammar-present-immediate-plan",
  );
  const futureApplication = applications.find(
    (application) => application.cardId === "grammar-ir-a-infinitive",
  );
  const shortHowApplication = applications.find(
    (application) =>
      application.cardId === "question-words" &&
      application.exampleEs.toLocaleLowerCase("es") === "cómo",
  );
  const formalRequestApplication = applications.find(
    (application) =>
      application.cardId === "grammar-formal-address" &&
      application.exampleEs.toLocaleLowerCase("es") === "puede",
  );
  assert.ok(
    poderApplication &&
      immediatePlanApplication &&
      futureApplication &&
      shortHowApplication &&
      formalRequestApplication,
  );
  assert.doesNotMatch(applicationText(poderApplication), /bed|cama/i);
  assert.doesNotMatch(applicationText(immediatePlanApplication), /bed|cama/i);
  assert.doesNotMatch(applicationText(futureApplication), /pay more attention/i);
  assert.doesNotMatch(applicationText(shortHowApplication), /flying|volando/i);
  assert.doesNotMatch(
    applicationText(formalRequestApplication),
    /pasármela|put her on/i,
  );
});

test("all curriculum cards are reachable and content validation is clean", () => {
  const usedCardIds = new Set(
    COMICS.flatMap((comic) =>
      comic.regions.flatMap((region) =>
        region.words.flatMap((word) => word.cardIds),
      ),
    ),
  );

  assert.equal(CARDS.length, 403);
  assert.equal(CARDS.filter((card) => card.kind === "word").length, 342);
  assert.equal(CARDS.filter((card) => card.kind !== "word").length, 61);
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
  assert.ok(exclamativeQue.cardIds.includes("question-words"));
  assert.ok(!exclamativeQue.cardIds.includes("grammar-por-que-vs-porque"));
  const exclamativeApplication = experiences.applications.find(
    (application) =>
      application.cardId === "question-words" &&
      application.participantWordIds.includes(exclamativeQue.id),
  );
  assert.equal(exclamativeApplication?.exampleEs, "qué insoportable");
  assert.match(exclamativeApplication?.explanationEn ?? "", /how unbearable/i);
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
