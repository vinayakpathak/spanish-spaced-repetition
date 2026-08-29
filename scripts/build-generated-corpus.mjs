#!/usr/bin/env node

/**
 * Build a reviewable OCR corpus from a source manifest.
 *
 * This is an ingestion step, not curriculum generation: it copies/downloads
 * source images, runs Spanish Apple Vision OCR, and writes only observed
 * Spanish text plus geometry and confidence signals. It never invents a
 * translation, gloss, grammar lesson, or flashcard.
 *
 * Source manifest (version 1):
 *
 * {
 *   "schemaVersion": 1,
 *   "comics": [
 *     {
 *       "id": "xkcd-es-1",
 *       "number": 1,
 *       "title": "Barrel - Part 1",
 *       "pageUrl": "https://es.xkcd.com/strips/barrel-part-1/",
 *       "imageUrl": "https://es.xkcd.com/.../comic.png",
 *       "originalPageUrl": "https://xkcd.com/1/"
 *     }
 *   ]
 * }
 *
 * `imagePath` may replace `imageUrl`; relative paths resolve beside the
 * manifest. The aliases `xkcdNumber`, `spanishUrl`, `translationUrl`,
 * `spanishImageUrl`, and an `image: {url|path}` object are also accepted. The
 * archive importer's nested source fields (`source.originalPageUrl`,
 * `source.translationCredit`, and `source.license.url`) are normalized too.
 *
 * Typical full build (the default cache is outside the repository):
 *
 *   node scripts/build-generated-corpus.mjs \
 *     --manifest data/xkcd-es-manifest.json \
 *     --output-dir data/generated-corpus
 *
 * Reproducible smoke test without touching checked-in data:
 *
 *   node scripts/build-generated-corpus.mjs \
 *     --manifest data/xkcd-es-manifest.json \
 *     --output-dir /tmp/tira-corpus-smoke \
 *     --cache-dir /tmp/tira-corpus-cache \
 *     --limit 3
 *
 * Other useful options:
 *   --only ID[,ID...]          build only named manifest entries
 *   --refresh-images           refetch/re-copy source images
 *   --refresh-ocr              rerun Vision even when its cache is valid
 *   --download-concurrency N   concurrent remote downloads (default: 4)
 *   --low-confidence N         review threshold from 0 to 1 (default: .75)
 *   --validate-only            validate an existing --output-dir
 *
 * Output is deterministic for the same manifest, image bytes, Vision version,
 * and flags: no timestamps or machine-local paths are emitted. One JSON file
 * is written per comic under `comics/`, plus `corpus-index.json`. Every OCR
 * result starts as `needs_review`. A provisional detected-text envelope is
 * emitted as the sole region; if Vision finds no tokens, a full-image region
 * is emitted instead. That region is a safe authoring fallback, not a claim
 * that it is a correctly segmented speech bubble.
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const DEFAULT_CACHE_DIR = "/tmp/tira-spanish-corpus-cache";
const DEFAULT_LOW_CONFIDENCE = 0.75;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const swiftScript = path.join(projectRoot, "scripts", "ocr-corpus.swift");

function fail(message) {
  throw new Error(message);
}

function usage() {
  return `usage: build-generated-corpus.mjs --manifest MANIFEST --output-dir DIR [options]
       build-generated-corpus.mjs --output-dir DIR --validate-only

options:
  --cache-dir DIR               image and raw Vision cache (default: ${DEFAULT_CACHE_DIR})
  --limit N                     process only the first N selected comics
  --only ID[,ID...]             process only named comic IDs
  --refresh-images              refetch or recopy source images
  --refresh-ocr                 rerun Apple Vision OCR
  --download-concurrency N      simultaneous downloads (default: 4)
  --low-confidence N            review threshold in [0, 1] (default: .75)
  --validate-only               validate existing generated files
  --help                        show this help`;
}

function parseArguments(argv) {
  const options = {
    cacheDir: process.env.TIRA_CORPUS_CACHE_DIR || DEFAULT_CACHE_DIR,
    downloadConcurrency: 4,
    lowConfidence: DEFAULT_LOW_CONFIDENCE,
    refreshImages: false,
    refreshOCR: false,
    validateOnly: false,
  };
  const valueOptions = new Map([
    ["--manifest", "manifestPath"],
    ["--output-dir", "outputDir"],
    ["--cache-dir", "cacheDir"],
    ["--limit", "limit"],
    ["--only", "only"],
    ["--download-concurrency", "downloadConcurrency"],
    ["--low-confidence", "lowConfidence"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (valueOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${argument} requires a value`);
      options[valueOptions.get(argument)] = value;
      index += 1;
    } else if (argument === "--refresh-images") {
      options.refreshImages = true;
    } else if (argument === "--refresh-ocr") {
      options.refreshOCR = true;
    } else if (argument === "--validate-only") {
      options.validateOnly = true;
    } else if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      fail(`unknown argument: ${argument}\n\n${usage()}`);
    }
  }

  if (!options.outputDir) fail(`--output-dir is required\n\n${usage()}`);
  if (!options.validateOnly && !options.manifestPath) {
    fail(`--manifest is required\n\n${usage()}`);
  }
  if (options.limit !== undefined) {
    options.limit = Number(options.limit);
    if (!Number.isSafeInteger(options.limit) || options.limit < 1) {
      fail("--limit must be a positive integer");
    }
  }
  options.downloadConcurrency = Number(options.downloadConcurrency);
  if (
    !Number.isSafeInteger(options.downloadConcurrency) ||
    options.downloadConcurrency < 1 ||
    options.downloadConcurrency > 32
  ) {
    fail("--download-concurrency must be an integer from 1 through 32");
  }
  options.lowConfidence = Number(options.lowConfidence);
  if (!Number.isFinite(options.lowConfidence) || options.lowConfidence < 0 || options.lowConfidence > 1) {
    fail("--low-confidence must be a number from 0 through 1");
  }
  options.only = options.only
    ? new Set(options.only.split(",").map((id) => id.trim()).filter(Boolean))
    : null;

  options.outputDir = path.resolve(options.outputDir);
  options.cacheDir = path.resolve(options.cacheDir);
  if (options.manifestPath) options.manifestPath = path.resolve(options.manifestPath);
  return options;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") fail(`${label} must be a non-empty string`);
  return value.trim();
}

function optionalString(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, label);
}

function requireHttpURL(value, label) {
  const string = requireString(value, label);
  let parsed;
  try {
    parsed = new URL(string);
  } catch {
    fail(`${label} must be an absolute URL: ${string}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    fail(`${label} must use http or https: ${string}`);
  }
  return parsed.href;
}

function normalizeManifest(raw, manifestPath) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("manifest root must be an object");
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    fail(`manifest schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (!Array.isArray(raw.comics) || raw.comics.length === 0) {
    fail("manifest.comics must be a non-empty array");
  }

  const manifestDirectory = path.dirname(manifestPath);
  const manifestSource = raw.source && typeof raw.source === "object" && !Array.isArray(raw.source)
    ? raw.source
    : {};
  const ids = new Set();
  const comics = raw.comics.map((entry, order) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`manifest.comics[${order}] must be an object`);
    }
    const id = requireString(entry.id, `manifest.comics[${order}].id`);
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(id)) {
      fail(`comic id may contain only Unicode letters, numbers, dot, underscore, and hyphen: ${id}`);
    }
    if (ids.has(id)) fail(`duplicate comic id: ${id}`);
    ids.add(id);

    const numberValue = entry.number ?? entry.xkcdNumber;
    const number = numberValue === undefined || numberValue === null ? undefined : Number(numberValue);
    if (number !== undefined && (!Number.isSafeInteger(number) || number < 1)) {
      fail(`${id}.number must be a positive integer`);
    }

    const title = requireString(entry.title, `${id}.title`);
    const pageUrl = requireHttpURL(
      entry.pageUrl ?? entry.spanishUrl ?? entry.translationUrl,
      `${id}.pageUrl`,
    );
    const imageUrlValue = entry.imageUrl ?? entry.spanishImageUrl ?? entry.image?.url;
    const imagePathValue = entry.imagePath ?? entry.image?.path;
    if (!imageUrlValue && !imagePathValue) {
      fail(`${id} must provide imageUrl or imagePath`);
    }
    const imageUrl = imageUrlValue ? requireHttpURL(imageUrlValue, `${id}.imageUrl`) : undefined;
    const imagePath = imagePathValue
      ? path.resolve(manifestDirectory, requireString(imagePathValue, `${id}.imagePath`))
      : undefined;
    const originalPageUrlValue = entry.originalPageUrl ?? entry.originalUrl ?? entry.source?.originalPageUrl;
    const originalPageUrl = originalPageUrlValue
      ? requireHttpURL(originalPageUrlValue, `${id}.originalPageUrl`)
      : undefined;
    const expectedSha256 = optionalString(entry.imageSha256 ?? entry.image?.sha256, `${id}.imageSha256`);
    if (expectedSha256 && !/^[a-fA-F0-9]{64}$/.test(expectedSha256)) {
      fail(`${id}.imageSha256 must be a 64-character hexadecimal SHA-256`);
    }
    const widthValue = entry.width ?? entry.image?.width;
    const heightValue = entry.height ?? entry.image?.height;
    const expectedWidthPx = widthValue === undefined ? undefined : Number(widthValue);
    const expectedHeightPx = heightValue === undefined ? undefined : Number(heightValue);
    if (expectedWidthPx !== undefined && (!Number.isSafeInteger(expectedWidthPx) || expectedWidthPx < 1)) {
      fail(`${id}.width must be a positive integer`);
    }
    if (expectedHeightPx !== undefined && (!Number.isSafeInteger(expectedHeightPx) || expectedHeightPx < 1)) {
      fail(`${id}.height must be a positive integer`);
    }
    const expectedMediaType = optionalString(entry.mediaType, `${id}.mediaType`);
    if (
      expectedMediaType &&
      !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(expectedMediaType)
    ) {
      fail(`${id}.mediaType is not supported: ${expectedMediaType}`);
    }

    const entrySource = entry.source && typeof entry.source === "object" && !Array.isArray(entry.source)
      ? entry.source
      : {};
    const sourceLicenseUrl =
      entrySource.licenseUrl ??
      entrySource.license?.url ??
      manifestSource.licenseUrl ??
      manifestSource.license?.url;
    const source = {
      publisher: optionalString(entrySource.publisher ?? manifestSource.publisher, `${id}.source.publisher`),
      edition: optionalString(
        entrySource.edition ?? manifestSource.edition ?? manifestSource.name,
        `${id}.source.edition`,
      ),
      translator: optionalString(
        entrySource.translator ?? entrySource.translationCredit ?? manifestSource.translationCredit,
        `${id}.source.translator`,
      ),
      licenseUrl: sourceLicenseUrl
        ? requireHttpURL(sourceLicenseUrl, `${id}.source.licenseUrl`)
        : undefined,
    };

    return {
      id,
      fileStem: fileStemForComicId(id),
      order,
      number,
      title,
      pageUrl,
      imageUrl,
      imagePath,
      originalPageUrl,
      expectedSha256: expectedSha256?.toLowerCase(),
      expectedWidthPx,
      expectedHeightPx,
      expectedMediaType,
      source: Object.values(source).some((value) => value !== undefined) ? source : undefined,
    };
  });

  return { comics };
}

async function readJSON(filePath) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`could not read ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`invalid JSON in ${filePath}: ${error.message}`);
  }
}

function stableJSONString(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function atomicWriteJSON(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await fs.writeFile(temporaryPath, stableJSONString(value));
  await fs.rename(temporaryPath, filePath);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function fileStemForComicId(id) {
  if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) return id;
  const asciiSlug = id
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "comic";
  return `${asciiSlug}-${sha256(Buffer.from(id, "utf8")).slice(0, 10)}`;
}

function detectImage(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { extension: "png", mediaType: "image/png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", mediaType: "image/jpeg" };
  }
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return { extension: "gif", mediaType: "image/gif" };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: "webp", mediaType: "image/webp" };
  }
  fail("source bytes are not a supported PNG, JPEG, GIF, or WebP image");
}

async function download(url, comicId) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Tira corpus builder/1.0 (noncommercial OCR cache)" },
        redirect: "follow",
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) throw new Error("empty response");
      return buffer;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }
  fail(`could not download ${comicId} from ${url}: ${lastError.message}`);
}

async function cachedRemoteImage(comic, imagesDirectory, refresh) {
  const metadataPath = path.join(imagesDirectory, `${comic.fileStem}.source.json`);
  if (!refresh) {
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
      if (
        metadata.schemaVersion === SCHEMA_VERSION &&
        metadata.locator === comic.imageUrl &&
        typeof metadata.fileName === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(metadata.fileName)
      ) {
        const imagePath = path.join(imagesDirectory, metadata.fileName);
        const buffer = await fs.readFile(imagePath);
        const digest = sha256(buffer);
        const format = detectImage(buffer);
        if (digest === metadata.sha256 && format.mediaType === metadata.mediaType) {
          return { imagePath, buffer, sha256: digest, ...format };
        }
      }
    } catch {
      // A partial or stale cache is a miss. It is never trusted silently.
    }
  }

  const buffer = await download(comic.imageUrl, comic.id);
  const digest = sha256(buffer);
  const format = detectImage(buffer);
  const fileName = `${comic.fileStem}-${digest.slice(0, 16)}.${format.extension}`;
  const imagePath = path.join(imagesDirectory, fileName);
  await fs.writeFile(imagePath, buffer);
  await atomicWriteJSON(metadataPath, {
    schemaVersion: SCHEMA_VERSION,
    locator: comic.imageUrl,
    fileName,
    sha256: digest,
    mediaType: format.mediaType,
    bytes: buffer.length,
  });
  return { imagePath, buffer, sha256: digest, ...format };
}

async function cachedLocalImage(comic, imagesDirectory, refresh) {
  let sourceBuffer;
  try {
    sourceBuffer = await fs.readFile(comic.imagePath);
  } catch (error) {
    fail(`could not read ${comic.id} imagePath ${comic.imagePath}: ${error.message}`);
  }
  const digest = sha256(sourceBuffer);
  const format = detectImage(sourceBuffer);
  const fileName = `${comic.fileStem}-${digest.slice(0, 16)}.${format.extension}`;
  const imagePath = path.join(imagesDirectory, fileName);
  if (refresh) {
    await fs.writeFile(imagePath, sourceBuffer);
  } else {
    try {
      const cached = await fs.readFile(imagePath);
      if (sha256(cached) !== digest) await fs.writeFile(imagePath, sourceBuffer);
    } catch {
      await fs.writeFile(imagePath, sourceBuffer);
    }
  }
  await atomicWriteJSON(path.join(imagesDirectory, `${comic.fileStem}.source.json`), {
    schemaVersion: SCHEMA_VERSION,
    locator: `manifest-relative:${path.relative(path.dirname(comic.imagePath), comic.imagePath) || path.basename(comic.imagePath)}`,
    fileName,
    sha256: digest,
    mediaType: format.mediaType,
    bytes: sourceBuffer.length,
  });
  return { imagePath, buffer: sourceBuffer, sha256: digest, ...format };
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

async function cacheImages(comics, options) {
  const imagesDirectory = path.join(options.cacheDir, "images");
  await fs.mkdir(imagesDirectory, { recursive: true });
  return mapConcurrent(comics, options.downloadConcurrency, async (comic, index) => {
    const cached = comic.imagePath
      ? await cachedLocalImage(comic, imagesDirectory, options.refreshImages)
      : await cachedRemoteImage(comic, imagesDirectory, options.refreshImages);
    if (comic.expectedSha256 && cached.sha256 !== comic.expectedSha256) {
      fail(`${comic.id} image SHA-256 mismatch: expected ${comic.expectedSha256}, got ${cached.sha256}`);
    }
    if (comic.expectedMediaType && cached.mediaType !== comic.expectedMediaType) {
      fail(`${comic.id} image media type mismatch: expected ${comic.expectedMediaType}, got ${cached.mediaType}`);
    }
    process.stderr.write(`[${index + 1}/${comics.length}] image ${comic.id} ${cached.sha256.slice(0, 12)}\n`);
    return {
      ...comic,
      cachedImagePath: cached.imagePath,
      imageSha256: cached.sha256,
      imageBytes: cached.buffer.length,
      imageMediaType: cached.mediaType,
    };
  });
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateRawBounds(bounds, label) {
  if (!bounds || typeof bounds !== "object") fail(`${label} must be an object`);
  for (const key of ["x", "y", "width", "height"]) {
    if (!isFiniteNumber(bounds[key])) fail(`${label}.${key} must be finite`);
  }
}

function validateRawOCR(raw, comic) {
  if (!raw || typeof raw !== "object" || raw.schemaVersion !== SCHEMA_VERSION) {
    fail(`${comic.id} raw OCR has an unsupported schema`);
  }
  if (raw.comicId !== comic.id) fail(`${comic.id} raw OCR comicId mismatch`);
  if (!Number.isSafeInteger(raw.image?.widthPx) || raw.image.widthPx < 1) fail(`${comic.id} invalid image width`);
  if (!Number.isSafeInteger(raw.image?.heightPx) || raw.image.heightPx < 1) fail(`${comic.id} invalid image height`);
  if (comic.expectedWidthPx !== undefined && raw.image.widthPx !== comic.expectedWidthPx) {
    fail(`${comic.id} image width mismatch: manifest ${comic.expectedWidthPx}, decoded ${raw.image.widthPx}`);
  }
  if (comic.expectedHeightPx !== undefined && raw.image.heightPx !== comic.expectedHeightPx) {
    fail(`${comic.id} image height mismatch: manifest ${comic.expectedHeightPx}, decoded ${raw.image.heightPx}`);
  }
  if (raw.engine?.name !== "apple-vision") fail(`${comic.id} raw OCR engine must be apple-vision`);
  if (!Array.isArray(raw.engine?.recognitionLanguages) || raw.engine.recognitionLanguages[0] !== "es-ES") {
    fail(`${comic.id} raw OCR must use es-ES`);
  }
  if (!Array.isArray(raw.lines)) fail(`${comic.id} raw OCR lines must be an array`);
  for (const [lineIndex, line] of raw.lines.entries()) {
    if (!Number.isSafeInteger(line.sourceOrder) || line.sourceOrder < 0) fail(`${comic.id} line ${lineIndex} sourceOrder invalid`);
    if (typeof line.text !== "string") fail(`${comic.id} line ${lineIndex} text invalid`);
    if (!isFiniteNumber(line.confidence) || line.confidence < 0 || line.confidence > 1) {
      fail(`${comic.id} line ${lineIndex} confidence invalid`);
    }
    validateRawBounds(line.bounds, `${comic.id} line ${lineIndex} bounds`);
    if (!Array.isArray(line.tokens)) fail(`${comic.id} line ${lineIndex} tokens invalid`);
    for (const [tokenIndex, token] of line.tokens.entries()) {
      if (typeof token.text !== "string" || token.text.trim() === "") fail(`${comic.id} empty token ${lineIndex}:${tokenIndex}`);
      if (!isFiniteNumber(token.confidence) || token.confidence < 0 || token.confidence > 1) {
        fail(`${comic.id} token ${lineIndex}:${tokenIndex} confidence invalid`);
      }
      if (!Number.isSafeInteger(token.sourceRangeLocation) || token.sourceRangeLocation < 0) {
        fail(`${comic.id} token ${lineIndex}:${tokenIndex} source range invalid`);
      }
      validateRawBounds(token.bounds, `${comic.id} token ${lineIndex}:${tokenIndex} bounds`);
    }
  }
}

async function ensureRawOCR(comics, options) {
  const rawDirectory = path.join(options.cacheDir, "vision-v1");
  await fs.mkdir(rawDirectory, { recursive: true });
  const jobs = [];

  for (const comic of comics) {
    const outputPath = path.join(rawDirectory, `${comic.fileStem}-${comic.imageSha256}.json`);
    let usable = false;
    if (!options.refreshOCR) {
      try {
        const raw = JSON.parse(await fs.readFile(outputPath, "utf8"));
        validateRawOCR(raw, comic);
        usable = true;
      } catch {
        usable = false;
      }
    }
    if (!usable) {
      jobs.push({ comicId: comic.id, imagePath: comic.cachedImagePath, outputPath });
    }
    comic.rawOCRPath = outputPath;
  }

  if (jobs.length === 0) {
    process.stderr.write("Vision OCR cache is complete.\n");
    return;
  }

  const jobsPath = path.join(options.cacheDir, `.ocr-jobs-${process.pid}.json`);
  await atomicWriteJSON(jobsPath, {
    schemaVersion: SCHEMA_VERSION,
    recognitionLanguage: "es-ES",
    minimumTextHeight: 0.003,
    jobs,
  });
  try {
    await new Promise((resolve, reject) => {
      const child = spawn("swift", [swiftScript, "--jobs", jobsPath, "--force"], {
        cwd: projectRoot,
        stdio: ["ignore", "inherit", "inherit"],
      });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) resolve();
        else reject(new Error(`Apple Vision worker exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
      });
    });
  } finally {
    await fs.rm(jobsPath, { force: true });
  }
}

function round(value) {
  return Number(value.toFixed(4));
}

function normalizeBounds(rawBounds) {
  const x = Math.max(0, Math.min(100, rawBounds.x));
  const y = Math.max(0, Math.min(100, rawBounds.y));
  const width = Math.max(0, Math.min(100 - x, rawBounds.width));
  const height = Math.max(0, Math.min(100 - y, rawBounds.height));
  return { x: round(x), y: round(y), width: round(width), height: round(height) };
}

function unionBounds(boundsList, padding = 0) {
  if (boundsList.length === 0) return { x: 0, y: 0, width: 100, height: 100 };
  const minX = Math.max(0, Math.min(...boundsList.map((bounds) => bounds.x)) - padding);
  const minY = Math.max(0, Math.min(...boundsList.map((bounds) => bounds.y)) - padding);
  const maxX = Math.min(100, Math.max(...boundsList.map((bounds) => bounds.x + bounds.width)) + padding);
  const maxY = Math.min(100, Math.max(...boundsList.map((bounds) => bounds.y + bounds.height)) + padding);
  return { x: round(minX), y: round(minY), width: round(maxX - minX), height: round(maxY - minY) };
}

function mean(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compareRawLines(left, right) {
  const leftBounds = normalizeBounds(left.bounds);
  const rightBounds = normalizeBounds(right.bounds);
  return (
    leftBounds.y - rightBounds.y ||
    leftBounds.x - rightBounds.x ||
    left.sourceOrder - right.sourceOrder ||
    left.text.localeCompare(right.text, "es")
  );
}

function buildGeneratedComic(comic, raw, lowConfidenceThreshold) {
  validateRawOCR(raw, comic);
  const sortedRawLines = [...raw.lines].sort(compareRawLines);
  const lines = [];
  const tokens = [];

  for (const [lineOrder, rawLine] of sortedRawLines.entries()) {
    const lineId = `${comic.id}:ocr-line-${String(lineOrder + 1).padStart(4, "0")}`;
    const lineTokenIds = [];
    const sortedTokens = [...rawLine.tokens].sort(
      (left, right) => left.sourceRangeLocation - right.sourceRangeLocation,
    );
    for (const rawToken of sortedTokens) {
      const tokenId = `${comic.id}:ocr-token-${String(tokens.length + 1).padStart(5, "0")}`;
      lineTokenIds.push(tokenId);
      tokens.push({
        id: tokenId,
        order: tokens.length,
        lineId,
        text: rawToken.text,
        confidence: round(rawToken.confidence),
        boxes: [normalizeBounds(rawToken.bounds)],
      });
    }
    lines.push({
      id: lineId,
      order: lineOrder,
      text: rawLine.text,
      confidence: round(rawLine.confidence),
      bounds: normalizeBounds(rawLine.bounds),
      tokenIds: lineTokenIds,
    });
  }

  const confidences = tokens.map((token) => token.confidence);
  const lowConfidenceTokenCount = confidences.filter((value) => value < lowConfidenceThreshold).length;
  const regionKind = tokens.length === 0 ? "full-image" : "detected-text-group";
  const regionBounds = tokens.length === 0
    ? { x: 0, y: 0, width: 100, height: 100 }
    : unionBounds(tokens.flatMap((token) => token.boxes), 1.5);
  const reasons = ["machine_ocr_unreviewed"];
  if (tokens.length === 0) reasons.push("no_tokens_detected", "full_image_region_fallback");
  else reasons.push("provisional_region_grouping");
  if (lowConfidenceTokenCount > 0) reasons.push("low_confidence_tokens");

  const source = {
    pageUrl: comic.pageUrl,
    ...(comic.imageUrl ? { imageUrl: comic.imageUrl } : {}),
    ...(comic.originalPageUrl ? { originalPageUrl: comic.originalPageUrl } : {}),
    ...(comic.source?.publisher ? { publisher: comic.source.publisher } : {}),
    ...(comic.source?.edition ? { edition: comic.source.edition } : {}),
    ...(comic.source?.translator ? { translator: comic.source.translator } : {}),
    ...(comic.source?.licenseUrl ? { licenseUrl: comic.source.licenseUrl } : {}),
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    id: comic.id,
    manifestOrder: comic.order,
    ...(comic.number !== undefined ? { number: comic.number } : {}),
    title: comic.title,
    source,
    image: {
      sha256: comic.imageSha256,
      mediaType: comic.imageMediaType,
      bytes: comic.imageBytes,
      widthPx: raw.image.widthPx,
      heightPx: raw.image.heightPx,
    },
    ocr: {
      engine: "apple-vision",
      recognitionLevel: "accurate",
      recognitionLanguages: ["es-ES"],
      usesLanguageCorrection: true,
      minimumTextHeight: round(raw.engine.minimumTextHeight),
      readingOrder: "geometric-top-to-bottom-then-left-to-right",
    },
    lines,
    tokens,
    regions: [
      {
        id: `${comic.id}:ocr-region-0001`,
        order: 0,
        kind: regionKind,
        provisional: true,
        bounds: regionBounds,
        lineIds: lines.map((line) => line.id),
        tokenIds: tokens.map((token) => token.id),
        confidence: round(mean(confidences)),
      },
    ],
    review: {
      status: "needs_review",
      reasons,
      lowConfidenceThreshold: round(lowConfidenceThreshold),
      meanTokenConfidence: round(mean(confidences)),
      minimumTokenConfidence: round(confidences.length === 0 ? 0 : Math.min(...confidences)),
      lowConfidenceTokenCount,
    },
  };
}

function validatePercentBounds(bounds, label, allowZeroSize = false) {
  if (!bounds || typeof bounds !== "object") fail(`${label} must be an object`);
  for (const key of ["x", "y", "width", "height"]) {
    if (!isFiniteNumber(bounds[key])) fail(`${label}.${key} must be finite`);
    if (bounds[key] < 0 || bounds[key] > 100) fail(`${label}.${key} must be between 0 and 100`);
  }
  if (!allowZeroSize && (bounds.width <= 0 || bounds.height <= 0)) fail(`${label} must have positive size`);
  if (bounds.x + bounds.width > 100.0001 || bounds.y + bounds.height > 100.0001) {
    fail(`${label} extends outside the image`);
  }
}

function validateGeneratedComic(comic) {
  if (!comic || typeof comic !== "object" || comic.schemaVersion !== SCHEMA_VERSION) fail("generated comic schema invalid");
  const id = requireString(comic.id, "generated comic id");
  requireString(comic.title, `${id}.title`);
  if (!Array.isArray(comic.lines) || !Array.isArray(comic.tokens) || !Array.isArray(comic.regions)) {
    fail(`${id} lines, tokens, and regions must be arrays`);
  }
  if (comic.regions.length !== 1) fail(`${id} must contain exactly one provisional fallback region`);
  if (comic.review?.status !== "needs_review") fail(`${id} uncurated OCR must be needs_review`);
  if (comic.ocr?.engine !== "apple-vision" || comic.ocr?.recognitionLanguages?.[0] !== "es-ES") {
    fail(`${id} OCR provenance invalid`);
  }

  const lineIds = new Set();
  comic.lines.forEach((line, order) => {
    if (line.order !== order) fail(`${id} line order is not contiguous at ${order}`);
    if (lineIds.has(line.id)) fail(`${id} duplicate line id ${line.id}`);
    lineIds.add(line.id);
    requireString(line.text, `${id} line ${order} text`);
    validatePercentBounds(line.bounds, `${id} line ${order} bounds`);
    if (!Array.isArray(line.tokenIds)) fail(`${id} line ${order} tokenIds invalid`);
  });

  const tokenIds = new Set();
  comic.tokens.forEach((token, order) => {
    if (token.order !== order) fail(`${id} token order is not contiguous at ${order}`);
    if (tokenIds.has(token.id)) fail(`${id} duplicate token id ${token.id}`);
    tokenIds.add(token.id);
    if (!lineIds.has(token.lineId)) fail(`${id} token ${token.id} references an unknown line`);
    requireString(token.text, `${id} token ${order} text`);
    if (!isFiniteNumber(token.confidence) || token.confidence < 0 || token.confidence > 1) {
      fail(`${id} token ${token.id} confidence invalid`);
    }
    if (!Array.isArray(token.boxes) || token.boxes.length === 0) fail(`${id} token ${token.id} needs a box`);
    token.boxes.forEach((bounds, boxIndex) => validatePercentBounds(bounds, `${id} token ${token.id} box ${boxIndex}`));
  });

  for (const line of comic.lines) {
    for (const tokenId of line.tokenIds) {
      if (!tokenIds.has(tokenId)) fail(`${id} line ${line.id} references unknown token ${tokenId}`);
    }
  }
  const region = comic.regions[0];
  if (region.order !== 0 || region.provisional !== true) fail(`${id} region must be provisional order zero`);
  if (region.kind !== "full-image" && region.kind !== "detected-text-group") fail(`${id} region kind invalid`);
  if (comic.tokens.length === 0 && region.kind !== "full-image") fail(`${id} tokenless result must use full-image region`);
  if (comic.tokens.length > 0 && region.kind !== "detected-text-group") fail(`${id} detected text must use text-group region`);
  validatePercentBounds(region.bounds, `${id} region bounds`);
  if (region.tokenIds.length !== comic.tokens.length || region.lineIds.length !== comic.lines.length) {
    fail(`${id} fallback region must reference every line and token`);
  }
  if (new Set(region.tokenIds).size !== tokenIds.size || region.tokenIds.some((tokenId) => !tokenIds.has(tokenId))) {
    fail(`${id} fallback region token index is inconsistent`);
  }
  if (new Set(region.lineIds).size !== lineIds.size || region.lineIds.some((lineId) => !lineIds.has(lineId))) {
    fail(`${id} fallback region line index is inconsistent`);
  }
  if (!/^[a-f0-9]{64}$/.test(comic.image?.sha256 ?? "")) fail(`${id} image SHA-256 invalid`);
  return comic;
}

async function validateOutput(outputDir) {
  const indexPath = path.join(outputDir, "corpus-index.json");
  const index = await readJSON(indexPath);
  if (index.schemaVersion !== SCHEMA_VERSION || !Array.isArray(index.comics)) {
    fail(`${indexPath} has an unsupported schema`);
  }
  const seen = new Set();
  let tokenCount = 0;
  for (const entry of index.comics) {
    const id = requireString(entry.id, "index comic id");
    if (seen.has(id)) fail(`duplicate index comic id: ${id}`);
    seen.add(id);
    const relativeFile = requireString(entry.file, `${id}.file`);
    if (path.isAbsolute(relativeFile) || relativeFile.split(/[\\/]/).includes("..")) {
      fail(`${id}.file must remain within the output directory`);
    }
    const comic = validateGeneratedComic(await readJSON(path.join(outputDir, relativeFile)));
    if (comic.id !== id) fail(`${id} index/file id mismatch`);
    if (entry.tokenCount !== comic.tokens.length || entry.regionCount !== comic.regions.length) {
      fail(`${id} index counts do not match its file`);
    }
    tokenCount += comic.tokens.length;
  }
  if (index.counts?.comics !== index.comics.length || index.counts?.tokens !== tokenCount) {
    fail("corpus-index.json aggregate counts are inconsistent");
  }
  process.stdout.write(`Validated ${index.comics.length} comics and ${tokenCount} OCR tokens in ${outputDir}.\n`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.validateOnly) {
    await validateOutput(options.outputDir);
    return;
  }

  const rawManifest = await readJSON(options.manifestPath);
  const manifest = normalizeManifest(rawManifest, options.manifestPath);
  let selected = manifest.comics;
  if (options.only) {
    selected = selected.filter((comic) => options.only.has(comic.id));
    const missing = [...options.only].filter((id) => !selected.some((comic) => comic.id === id));
    if (missing.length > 0) fail(`--only IDs not found in manifest: ${missing.join(", ")}`);
  }
  if (options.limit) selected = selected.slice(0, options.limit);
  if (selected.length === 0) fail("no comics selected");

  await fs.mkdir(options.cacheDir, { recursive: true });
  const cachedComics = await cacheImages(selected, options);
  await ensureRawOCR(cachedComics, options);

  const comicsDirectory = path.join(options.outputDir, "comics");
  await fs.mkdir(comicsDirectory, { recursive: true });
  const indexEntries = [];
  let totalTokens = 0;
  let lowConfidenceTokens = 0;

  for (const comic of cachedComics) {
    const raw = await readJSON(comic.rawOCRPath);
    const generated = validateGeneratedComic(
      buildGeneratedComic(comic, raw, options.lowConfidence),
    );
    const fileName = `${comic.fileStem}.json`;
    await atomicWriteJSON(path.join(comicsDirectory, fileName), generated);
    totalTokens += generated.tokens.length;
    lowConfidenceTokens += generated.review.lowConfidenceTokenCount;
    indexEntries.push({
      id: generated.id,
      manifestOrder: generated.manifestOrder,
      ...(generated.number !== undefined ? { number: generated.number } : {}),
      title: generated.title,
      file: `comics/${fileName}`,
      imageSha256: generated.image.sha256,
      tokenCount: generated.tokens.length,
      regionCount: generated.regions.length,
      meanTokenConfidence: generated.review.meanTokenConfidence,
      reviewStatus: generated.review.status,
    });
  }

  const index = {
    schemaVersion: SCHEMA_VERSION,
    sourceManifestFile: path.basename(options.manifestPath),
    sourceManifestComicCount: manifest.comics.length,
    selectedComicCount: selected.length,
    selectionIsPartial: selected.length !== manifest.comics.length,
    lowConfidenceThreshold: round(options.lowConfidence),
    counts: {
      comics: indexEntries.length,
      tokens: totalTokens,
      lowConfidenceTokens,
      needsReview: indexEntries.filter((entry) => entry.reviewStatus === "needs_review").length,
    },
    comics: indexEntries,
  };
  await atomicWriteJSON(path.join(options.outputDir, "corpus-index.json"), index);
  await validateOutput(options.outputDir);
}

main().catch((error) => {
  process.stderr.write(`build-generated-corpus.mjs: ${error.message}\n`);
  process.exitCode = 1;
});
