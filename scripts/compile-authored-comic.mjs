#!/usr/bin/env node

/**
 * Validate or structurally compile individually authored comic lessons.
 *
 * This tool never creates Spanish text, English copy, card definitions, or
 * links. It only validates authored JSON, resolves existing OCR rectangles,
 * and assembles self-contained lazy bundles in a staging directory.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildGeometryRegistry,
  compileManualAuthoringCorpus,
  searchableCardIndex,
} from "./lib/manual-authoring.mjs";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULTS = Object.freeze({
  authoringDir: path.join(PROJECT_ROOT, "data/authoring/comics"),
  sourcePath: path.join(PROJECT_ROOT, "data/source/es-xkcd.json"),
  ocrDir: path.join(PROJECT_ROOT, "data/generated/ocr"),
  overridesPath: path.join(PROJECT_ROOT, "data/review/ocr-overrides.json"),
});

function usage() {
  return `usage: compile-authored-comic.mjs [options]

options:
  --authoring-dir DIR   one manually authored JSON file per comic
                       (default: data/authoring/comics)
  --source FILE         Spanish archive source manifest
                       (default: data/source/es-xkcd.json)
  --ocr-dir DIR         OCR corpus used only for line/token geometry
                       (default: data/generated/ocr)
  --overrides FILE      explicit checked geometry additions
                       (default: data/review/ocr-overrides.json)
  --output-dir DIR      write a lazy manifest fragment and comic bundles
                       (must not be public/corpus)
  --validate-only       validate all authored files without writing output
  --find-card QUERY     search seed and authored stable-card definitions
  --only ID[,ID...]     compile only named comics after validating all files
  --help                show this help

At least one of --validate-only, --output-dir, or --find-card is required.`;
}

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const options = { ...DEFAULTS, validateOnly: false, only: null };
  const paths = new Map([
    ["--authoring-dir", "authoringDir"],
    ["--source", "sourcePath"],
    ["--ocr-dir", "ocrDir"],
    ["--overrides", "overridesPath"],
    ["--output-dir", "outputDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (paths.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${argument} requires a path`);
      options[paths.get(argument)] = path.resolve(value);
      index += 1;
    } else if (argument === "--find-card") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail("--find-card requires a query");
      options.findCard = value;
      index += 1;
    } else if (argument === "--only") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail("--only requires comic IDs");
      options.only = new Set(value.split(",").map((id) => id.trim()).filter(Boolean));
      index += 1;
    } else if (argument === "--validate-only") {
      options.validateOnly = true;
    } else if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      fail(`unknown argument: ${argument}\n\n${usage()}`);
    }
  }
  if (!options.validateOnly && !options.outputDir && !options.findCard) {
    fail(usage());
  }
  if (options.outputDir) {
    const publicCorpus = path.join(PROJECT_ROOT, "public/corpus");
    const relative = path.relative(publicCorpus, options.outputDir);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
      fail("manual authoring output must remain in a staging directory, not public/corpus");
    }
  }
  return options;
}

async function readJSON(filePath) {
  let source;
  try {
    source = await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`could not read ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`invalid JSON in ${filePath}: ${error.message}`);
  }
}

async function readAuthoringFiles(authoringDir) {
  let entries;
  try {
    entries = await fs.readdir(authoringDir, { withFileTypes: true });
  } catch (error) {
    fail(`could not read authoring directory ${authoringDir}: ${error.message}`);
  }
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(authoringDir, entry.name))
    .sort((first, second) => first.localeCompare(second, "en"));
  if (files.length === 0) fail(`${authoringDir} contains no authored comic JSON files`);
  return Promise.all(
    files.map(async (filePath) => {
      const artifact = await readJSON(filePath);
      if (`${artifact.id}.json` !== path.basename(filePath)) {
        fail(`${filePath} must be named ${artifact.id}.json`);
      }
      return artifact;
    }),
  );
}

async function seedCards() {
  const moduleURL = pathToFileURL(path.join(PROJECT_ROOT, "lib/content.ts")).href;
  const content = await import(moduleURL);
  return content.CARDS;
}

function overridesByComic(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.comics)) {
    fail("OCR overrides have an unsupported schema");
  }
  return new Map(value.comics.map((comic) => [comic.id, comic]));
}

async function geometryForArtifacts(artifacts, ocrDir, overrides) {
  const index = await readJSON(path.join(ocrDir, "corpus-index.json"));
  if (!index || index.schemaVersion !== 1 || !Array.isArray(index.comics)) {
    fail("OCR corpus index has an unsupported schema");
  }
  const indexById = new Map(index.comics.map((entry) => [entry.id, entry]));
  const result = new Map();
  await Promise.all(
    artifacts.map(async (artifact) => {
      const entry = indexById.get(artifact.id);
      if (!entry) fail(`OCR corpus index is missing ${artifact.id}`);
      if (
        typeof entry.file !== "string" ||
        path.isAbsolute(entry.file) ||
        entry.file.split(/[\\/]/).includes("..")
      ) {
        fail(`${artifact.id} has an unsafe OCR file path`);
      }
      const ocrComic = await readJSON(path.join(ocrDir, entry.file));
      if (ocrComic.id !== artifact.id) fail(`${artifact.id} OCR file ID mismatch`);
      result.set(
        artifact.id,
        buildGeometryRegistry(ocrComic, overrides.get(artifact.id)),
      );
    }),
  );
  return result;
}

function stableOutput(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function atomicWriteJSON(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await fs.writeFile(temporaryPath, stableOutput(value));
  await fs.rename(temporaryPath, filePath);
}

async function writeCompiledOutput(compiled, outputDir, only) {
  const selected = only
    ? compiled.bundles.filter(({ id }) => only.has(id))
    : compiled.bundles;
  if (only) {
    const present = new Set(selected.map(({ id }) => id));
    for (const id of only) {
      if (!present.has(id)) fail(`--only requested an absent authored comic: ${id}`);
    }
  }
  const selectedIds = new Set(selected.map(({ id }) => id));
  const selectedCardIds = new Set(
    selected.flatMap(({ bundle }) => bundle.comic.cardIds),
  );
  const fragment = {
    schemaVersion: compiled.schemaVersion,
    revision: compiled.revision,
    reviewStatus: compiled.reviewStatus,
    editorialStatus: compiled.editorialStatus,
    qualityStatus: compiled.qualityStatus,
    humanVerified: compiled.humanVerified,
    comics: compiled.comics.filter((comic) => selectedIds.has(comic.id)),
    cardCatalog: compiled.cardCatalog.filter((card) => selectedCardIds.has(card.id)),
  };
  await Promise.all([
    atomicWriteJSON(path.join(outputDir, "manifest-fragment.json"), fragment),
    ...selected.map(({ id, bundle }) =>
      atomicWriteJSON(path.join(outputDir, "comics", `${id}.json`), bundle),
    ),
  ]);
  return selected.length;
}

async function main(options) {
  const [artifacts, source, cards, rawOverrides] = await Promise.all([
    readAuthoringFiles(options.authoringDir),
    readJSON(options.sourcePath),
    seedCards(),
    readJSON(options.overridesPath),
  ]);
  if (!source || source.schemaVersion !== 1 || !Array.isArray(source.comics)) {
    fail("Spanish archive source manifest has an unsupported schema");
  }

  if (options.findCard) {
    const query = options.findCard.normalize("NFC").toLocaleLowerCase("es");
    const matches = searchableCardIndex(cards, artifacts).filter((card) =>
      [card.id, card.kind, card.promptEs, card.answerEn, card.owner]
        .join("\n")
        .normalize("NFC")
        .toLocaleLowerCase("es")
        .includes(query),
    );
    process.stdout.write(`${stableOutput(matches)}`);
    if (!options.validateOnly && !options.outputDir) return;
  }

  const geometryByComicId = await geometryForArtifacts(
    artifacts,
    options.ocrDir,
    overridesByComic(rawOverrides),
  );
  const compiled = compileManualAuthoringCorpus({
    artifacts,
    seedCards: cards,
    sourceComics: source.comics,
    geometryByComicId,
  });
  process.stdout.write(
    `Validated ${compiled.comics.length} individually AI-authored/internal-QA comic file${compiled.comics.length === 1 ? "" : "s"}, ${compiled.cardCatalog.length} reachable cards, and ${compiled.bundles.reduce((sum, { bundle }) => sum + bundle.comic.regions.flatMap((region) => region.words).length, 0)} printed word occurrences.\n`,
  );
  if (options.outputDir) {
    const count = await writeCompiledOutput(compiled, options.outputDir, options.only);
    process.stdout.write(`Wrote ${count} lazy authored bundle${count === 1 ? "" : "s"} to ${options.outputDir}.\n`);
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(parseArguments(process.argv.slice(2))).catch((error) => {
    process.stderr.write(`compile-authored-comic.mjs: ${error.message}\n`);
    process.exitCode = 1;
  });
}

export { main, parseArguments, readAuthoringFiles, writeCompiledOutput };
