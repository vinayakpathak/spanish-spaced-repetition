import assert from "node:assert/strict";
import test from "node:test";
import { validateCardReusePolicy } from "../scripts/lib/card-reuse-policy.mjs";

const word = (id, promptEs = "gusta") => ({ id, kind: "word", promptEs });
const policy = (extra = {}) => ({ schemaVersion: 1, baselineCardIds: ["old"], retiredCardIds: [], reviews: [], ...extra });
const review = (cardId, comparedCardIds) => ({ cardId, decision: "distinct-target", comparedCardIds,
  searchQueries: ["related Spanish target"], distinctionEn: "This names a genuinely different contextual meaning, not just a new example or person." });

test("new same-form word senses require an explicit comparison and distinction", () => {
  const cards = [word("old"), word("new")];
  assert.equal(validateCardReusePolicy(cards, policy()).length, 1);
  assert.deepEqual(validateCardReusePolicy(cards, policy({ reviews: [review("new", ["old"])] })), []);
  assert.equal(validateCardReusePolicy(cards, policy({ reviews: [review("new", [])] })).length, 1);
});

test("new printed forms retain word coverage without spelling-wide aliases", () => {
  assert.deepEqual(validateCardReusePolicy([word("old", "si"), word("accent", "sí"), word("inflected", "gustan")], policy()), []);
});

test("language target comparisons cross grammar/phrase storage kinds", () => {
  const cards = [{ id: "old", kind: "grammar", promptEs: "algo de + nombre" },
    { id: "new", kind: "phrase", promptEs: "algo de + nombre" }];
  assert.equal(validateCardReusePolicy(cards, policy({ reviews: [review("new", [])] })).length, 1);
  assert.deepEqual(validateCardReusePolicy(cards, policy({ reviews: [review("new", ["old"])] })), []);
});

test("new higher-level targets require a search even without literal prompt matches", () => {
  assert.equal(validateCardReusePolicy([{ id: "new", kind: "grammar", promptEs: "otra regla" }], policy()).length, 1);
});

test("a baseline never permits resurrecting an explicitly retired identity", () => {
  assert.equal(validateCardReusePolicy([word("old")], policy({ retiredCardIds: ["old"] })).length, 1);
});

test("new concept definitions compare existing same-target concepts", () => {
  const cards = [{ id: "old", kind: "concept", promptEs: "tipado dinámico" },
    { id: "new", kind: "concept", promptEs: "tipado dinámico" }];
  assert.equal(validateCardReusePolicy(cards, policy({ reviews: [review("new", [])] })).length, 1);
  assert.deepEqual(validateCardReusePolicy(cards, policy({ reviews: [review("new", ["old"])] })), []);
});
