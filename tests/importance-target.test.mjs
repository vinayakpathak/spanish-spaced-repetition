import assert from "node:assert/strict";
import test from "node:test";
import {
  importanceTargetIdForCard,
  importanceTargetIdsForCards,
  isImportanceTargetId,
  normalizeImportanceSignaturePart,
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

test("canonical word signatures normalize case, Unicode, and whitespace", () => {
  const composed = importanceTargetIdForCard(
    card({ promptEs: "  QUÉ\n  TAL ", answerEn: "  HOW\tARE YOU  " }),
  );
  const decomposed = importanceTargetIdForCard(
    card({ promptEs: "que\u0301 tal", answerEn: "how are you" }),
  );

  assert.equal(composed, decomposed);
  assert.equal(normalizeImportanceSignaturePart("  A\n B  "), "a b");
});

test("encoded namespaces remain collision-free and higher cards keep exact IDs", () => {
  assert.notEqual(
    importanceTargetIdForCard(card({ promptEs: "a|b", answerEn: "c" })),
    importanceTargetIdForCard(card({ promptEs: "a", answerEn: "b|c" })),
  );
  assert.equal(
    importanceTargetIdForCard(
      card({ id: "grammar:estar + gerundio", kind: "grammar" }),
    ),
    "card:grammar%3Aestar%20%2B%20gerundio",
  );
  assert.equal(isImportanceTargetId("word:cama|bed"), true);
  assert.equal(isImportanceTargetId("word:a|b|c"), false);
  assert.equal(isImportanceTargetId("card:"), false);
  assert.equal(isImportanceTargetId("card:%zz"), false);
});

test("comic target indexes exclude explicitly unschedulable cards and deduplicate targets", () => {
  assert.deepEqual(
    importanceTargetIdsForCards([
      card({ id: "first", promptEs: "Cama", answerEn: "Bed" }),
      card({ id: "second", promptEs: " cama ", answerEn: " BED " }),
      card({ id: "disabled", schedulable: false }),
      card({ id: "concept-python", kind: "concept" }),
    ]),
    ["card:concept-python", "word:cama|bed"],
  );
});
