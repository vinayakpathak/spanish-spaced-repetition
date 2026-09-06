import assert from "node:assert/strict";
import test from "node:test";
import {
  importanceTargetIdForCard,
  importanceTargetIdsForCards,
  isImportanceTargetId,
} from "../lib/importance-target.ts";

function card(overrides = {}) {
  return {
    id: "word-example",
    kind: "word",
    promptEs: "Ejemplo",
    answerEn: "Example",
    noteEn: "",
    tags: [],
    ...overrides,
  };
}

test("every card kind keeps its exact stable ID in a separate analytics namespace", () => {
  assert.notEqual(
    importanceTargetIdForCard(card({ id: "word-first", promptEs: "cama" })),
    importanceTargetIdForCard(card({ id: "word-second", promptEs: "cama" })),
  );
  assert.equal(
    importanceTargetIdForCard(card({ id: "word-cama" })),
    "card:word-cama",
  );
  assert.equal(
    importanceTargetIdForCard(
      card({ id: "grammar:estar + gerundio", kind: "grammar" }),
    ),
    "card:grammar%3Aestar%20%2B%20gerundio",
  );
  assert.equal(isImportanceTargetId("word:cama|bed"), false);
  assert.equal(isImportanceTargetId("card:word-cama"), true);
  assert.equal(isImportanceTargetId("card:"), false);
  assert.equal(isImportanceTargetId("card:%zz"), false);
});

test("comic target indexes exclude explicitly unschedulable cards and deduplicate targets", () => {
  assert.deepEqual(
    importanceTargetIdsForCards([
      card({ id: "first", promptEs: "Cama", answerEn: "Bed" }),
      card({ id: "first", promptEs: " cama ", answerEn: " BED " }),
      card({ id: "second", promptEs: "Cama", answerEn: "Bed" }),
      card({ id: "disabled", schedulable: false }),
      card({ id: "concept-python", kind: "concept" }),
    ]),
    ["card:concept-python", "card:first", "card:second"],
  );
});
