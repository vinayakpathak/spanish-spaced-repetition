#!/usr/bin/env node

/**
 * Turns temporary Vision OCR output into the checked-in word-coordinate map.
 *
 * 1. Run `ocr-word-bounds.swift` once for each `public/comics/*-es.png` and
 *    save the JSON files in /tmp/spanish-srs-ocr.
 * 2. Run this script. It aligns the OCR stream with the authoritative Spanish
 *    transcript in lib/content.ts and writes lib/word-bounds.generated.ts.
 *
 * The alignment can attach multiple boxes to a word. This matters when the
 * lettering visibly hyphenates a word across two lines (PROBLE- / MA, etc.).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { COMICS } from "../lib/content.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ocrDirectory = process.argv[2] ?? "/tmp/spanish-srs-ocr";
const outputPath = path.join(projectRoot, "lib/word-bounds.generated.js");

const OCR_FILE_BY_COMIC = {
  "duty-calls": "duty-calls-es.json",
  python: "python-es.json",
  "exploits-of-a-mom": "exploits-of-a-mom-es.json",
  correlation: "correlation-es.json",
  "tech-support": "tech-support-es.json",
  photos: "photos-es.json",
};

// Two adjacent balloons in this strip meet around y=43%. The original broad
// reveal regions overlap there, so these OCR-only selection windows separate
// their actual lettering deterministically.
const OCR_SELECTION_OVERRIDES = {
  "lost-records": { x: 73, y: 0, width: 27, height: 43 },
  "sanitize-inputs": { x: 82, y: 42, width: 18, height: 58 },
};

function loose(text) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function mismatchCost(expected, observed) {
  const expectedLoose = loose(expected);
  const observedLoose = loose(observed);
  if (expectedLoose === observedLoose) return 0;
  return (
    (1.2 * levenshtein(expectedLoose, observedLoose)) /
    Math.max(expectedLoose.length, observedLoose.length, 1)
  );
}

function includesCenter(bounds, word) {
  const centerX = word.x + word.width / 2;
  const centerY = word.y + word.height / 2;
  return (
    centerX >= bounds.x &&
    centerX <= bounds.x + bounds.width &&
    centerY >= bounds.y &&
    centerY <= bounds.y + bounds.height
  );
}

function alignWords(expectedWords, observedWords) {
  const memo = new Map();

  function solve(expectedIndex, observedIndex) {
    const key = `${expectedIndex}:${observedIndex}`;
    if (memo.has(key)) return memo.get(key);
    if (expectedIndex === expectedWords.length) {
      const result = {
        cost: (observedWords.length - observedIndex) * 0.7,
        steps: observedWords
          .slice(observedIndex)
          .map((word) => ({ type: "skip", words: [word] })),
      };
      memo.set(key, result);
      return result;
    }
    if (observedIndex === observedWords.length) {
      return { cost: Number.POSITIVE_INFINITY, steps: [] };
    }

    const skippedTail = solve(expectedIndex, observedIndex + 1);
    let best = {
      cost: 0.7 + skippedTail.cost,
      steps: [
        { type: "skip", words: [observedWords[observedIndex]] },
        ...skippedTail.steps,
      ],
    };

    for (
      let fragmentCount = 1;
      fragmentCount <= 3 && observedIndex + fragmentCount <= observedWords.length;
      fragmentCount += 1
    ) {
      const fragments = observedWords.slice(
        observedIndex,
        observedIndex + fragmentCount,
      );
      const joined = fragments.map((word) => word.text).join("");
      const joinedMismatch = mismatchCost(
        expectedWords[expectedIndex].text,
        joined,
      );
      if (
        fragmentCount > 1 &&
        Math.min(
          ...fragments.map((word) =>
            mismatchCost(expectedWords[expectedIndex].text, word.text),
          ),
        ) <= joinedMismatch
      ) {
        continue;
      }
      const tail = solve(expectedIndex + 1, observedIndex + fragmentCount);
      const cost =
        joinedMismatch +
        (fragmentCount - 1) * 0.025 +
        tail.cost;
      if (cost < best.cost) {
        best = {
          cost,
          steps: [
            {
              type: "match",
              expected: expectedWords[expectedIndex],
              words: fragments,
            },
            ...tail.steps,
          ],
        };
      }
    }

    memo.set(key, best);
    return best;
  }

  const result = solve(0, 0);
  const matches = result.steps.filter((step) => step.type === "match");
  if (matches.length !== expectedWords.length) {
    throw new Error(
      `Could not align all words (${matches.length}/${expectedWords.length})`,
    );
  }
  return result;
}

function round(value) {
  return Number(value.toFixed(4));
}

const output = {};
const reports = [];

for (const comic of COMICS) {
  const ocrFile = OCR_FILE_BY_COMIC[comic.id];
  const observed = JSON.parse(
    fs.readFileSync(path.join(ocrDirectory, ocrFile), "utf8"),
  );

  for (const region of comic.regions) {
    const selectionBounds = OCR_SELECTION_OVERRIDES[region.id] ?? region.bounds;
    const regionObserved = observed.filter((word) =>
      includesCenter(selectionBounds, word),
    );
    const alignment = alignWords(region.words, regionObserved);
    const matches = alignment.steps.filter((step) => step.type === "match");
    const skips = alignment.steps.filter((step) => step.type === "skip");

    output[region.id] = matches.map((match) =>
      match.words.map((word) => ({
        x: round(word.x),
        y: round(word.y),
        width: round(word.width),
        height: round(word.height),
      })),
    );

    reports.push({
      comic: comic.id,
      region: region.id,
      expected: region.words.length,
      observed: regionObserved.length,
      fragments: matches.filter((match) => match.words.length > 1).map((match) => ({
        expected: match.expected.text,
        observed: match.words.map((word) => word.text).join(" + "),
      })),
      fuzzy: matches
        .filter(
          (match) =>
            mismatchCost(
              match.expected.text,
              match.words.map((word) => word.text).join(""),
            ) > 0,
        )
        .map((match) => ({
          expected: match.expected.text,
          observed: match.words.map((word) => word.text).join(" + "),
        })),
      skipped: skips.map((skip) => skip.words[0].text),
      cost: round(alignment.cost),
    });
  }
}

const generated = `/**
 * Generated from the local Spanish comic PNGs with Apple Vision OCR.
 * Run scripts/ocr-word-bounds.swift and scripts/build-word-bounds.mjs to
 * regenerate. Coordinates are percentages of the complete image using a
 * top-left origin. Multiple entries represent visible line-wrap fragments of
 * one lexical word.
 */

/**
 * @typedef {{x: number, y: number, width: number, height: number}}
 *   GeneratedPercentBounds
 */
/**
 * @type {Readonly<Record<string,
 *   ReadonlyArray<ReadonlyArray<GeneratedPercentBounds>>>>}
 */
export const WORD_BOUNDS_BY_REGION = ${JSON.stringify(output, null, 2)};
`;

fs.writeFileSync(outputPath, generated);
process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
