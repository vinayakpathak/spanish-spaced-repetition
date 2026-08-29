#!/usr/bin/env node

/**
 * Build a deterministic manifest from the public xkcd en español archive.
 *
 * The source site is deliberately treated as immutable input: this script only
 * writes the JSON path passed with --output (data/source/es-xkcd.json by
 * default). It does not download the comic images themselves.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ARCHIVE_URL = "https://es.xkcd.com/archive/";
const EXPECTED_COMIC_COUNT = 258;
const DEFAULT_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const USER_AGENT =
  "Tira curriculum source importer/1.0 (+personal language-learning project)";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIRECTORY = resolve(SCRIPT_DIRECTORY, "..");
const DEFAULT_OUTPUT_PATH = resolve(
  PROJECT_DIRECTORY,
  "data/source/es-xkcd.json",
);

/**
 * Keep identifiers already used by the hand-authored six-comic curriculum.
 * New source records use a namespaced Spanish-page slug instead.
 */
const EXISTING_COMICS = new Map([
  [
    327,
    {
      id: "exploits-of-a-mom",
      pageUrl: "https://es.xkcd.com/strips/exploits-de-una-madre/",
      imageUrl: "https://es.xkcd.com/images/exploits_of_a_mom.png",
    },
  ],
  [
    353,
    {
      id: "python",
      pageUrl: "https://es.xkcd.com/strips/python/",
      imageUrl: "https://es.xkcd.com/images/python.png",
    },
  ],
  [
    386,
    {
      id: "duty-calls",
      pageUrl: "https://es.xkcd.com/strips/el-deber-llama/",
      imageUrl: "https://es.xkcd.com/images/duty_calls.png",
    },
  ],
  [
    552,
    {
      id: "correlation",
      pageUrl: "https://es.xkcd.com/strips/correlacion/",
      imageUrl: "https://es.xkcd.com/images/correlation.png",
    },
  ],
  [
    806,
    {
      id: "tech-support",
      pageUrl: "https://es.xkcd.com/strips/soporte-tecnico/",
      imageUrl: "https://es.xkcd.com/images/tech_support.png",
    },
  ],
  [
    1314,
    {
      id: "photos",
      pageUrl: "https://es.xkcd.com/strips/fotos/",
      imageUrl: "https://es.xkcd.com/images/photos.png",
    },
  ],
]);

function parseArguments(argv) {
  const options = {
    outputPath: DEFAULT_OUTPUT_PATH,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--output") {
      const output = argv[index + 1];
      if (!output) throw new Error("--output requires a path");
      options.outputPath = resolve(process.cwd(), output);
      index += 1;
    } else if (argument === "--concurrency") {
      const concurrency = Number(argv[index + 1]);
      if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) {
        throw new Error("--concurrency must be an integer from 1 through 12");
      }
      options.concurrency = concurrency;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      console.log(`Usage: node scripts/import-es-xkcd.mjs [options]

Options:
  --output PATH       Manifest path (default: data/source/es-xkcd.json)
  --concurrency N     Concurrent requests, 1-12 (default: 4)
  -h, --help          Show this help`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function decodeHtml(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
  };

  return value
    .replace(/&#(\d+);/g, (_, codePoint) =>
      String.fromCodePoint(Number(codePoint)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&([a-z]+);/gi, (entity, name) =>
      Object.hasOwn(namedEntities, name) ? namedEntities[name] : entity,
    );
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, "")).trim();
}

function stripSlug(pageUrl) {
  const pathnameParts = new URL(pageUrl).pathname.split("/").filter(Boolean);
  const slug = pathnameParts.at(-1);
  if (!slug) throw new Error(`Cannot derive strip slug from ${pageUrl}`);
  return decodeURIComponent(slug);
}

function parseArchive(html) {
  const entries = [];
  const entryPattern =
    /<div\s+class="archive-entry">\s*<a\s+href="([^"]+)">([\s\S]*?)<\/a>\s*<time\s+datetime="([^"]+)">([\s\S]*?)<\/time>\s*<\/div>/g;

  for (const match of html.matchAll(entryPattern)) {
    const pageUrl = new URL(decodeHtml(match[1]), ARCHIVE_URL).href;
    entries.push({
      pageUrl,
      archiveTitle: textContent(match[2]),
      publishedAt: textContent(match[4]),
      publishedAtWithOffset: decodeHtml(match[3]),
    });
  }

  if (entries.length !== EXPECTED_COMIC_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_COMIC_COUNT} archive entries, found ${entries.length}`,
    );
  }

  assertUnique(entries, (entry) => entry.pageUrl, "archive page URL");
  return entries;
}

function attribute(fragment, name, context) {
  const match = fragment.match(new RegExp(`${name}="([^"]*)"`, "i"));
  if (!match) throw new Error(`Missing ${name} attribute in ${context}`);
  return decodeHtml(match[1]);
}

function parseStripPage(html, archiveEntry) {
  const headings = [...html.matchAll(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi)];
  const title = headings.length ? textContent(headings.at(-1)[1]) : "";
  if (!title) throw new Error(`Missing Spanish title on ${archiveEntry.pageUrl}`);

  if (title !== archiveEntry.archiveTitle) {
    throw new Error(
      `Archive/page title mismatch on ${archiveEntry.pageUrl}: ` +
        `${JSON.stringify(archiveEntry.archiveTitle)} != ${JSON.stringify(title)}`,
    );
  }

  const comicFragment = html.match(
    /<div\s+id="comic"[^>]*>([\s\S]*?)<\/div>/i,
  )?.[1];
  if (!comicFragment) {
    throw new Error(`Missing #comic image container on ${archiveEntry.pageUrl}`);
  }

  const originalMatch = html.match(
    /Enlace a la tira original:[\s\S]*?<a\s+href="(https?:\/\/(?:www\.)?xkcd\.com\/(\d+)\/?)"/i,
  );
  if (!originalMatch) {
    throw new Error(`Missing original xkcd link on ${archiveEntry.pageUrl}`);
  }

  const number = Number(originalMatch[2]);
  const originalPageUrl = `https://xkcd.com/${number}/`;
  const imageUrl = new URL(
    attribute(comicFragment, "src", archiveEntry.pageUrl),
    archiveEntry.pageUrl,
  ).href;
  const slug = stripSlug(archiveEntry.pageUrl);
  const existing = EXISTING_COMICS.get(number);

  if (
    existing &&
    (existing.pageUrl !== archiveEntry.pageUrl || existing.imageUrl !== imageUrl)
  ) {
    throw new Error(
      `Existing comic mapping changed for xkcd #${number}: ` +
        `${archiveEntry.pageUrl} / ${imageUrl}`,
    );
  }

  return {
    id: existing?.id ?? `es-xkcd-${slug}`,
    number,
    title,
    publishedAt: archiveEntry.publishedAt,
    pageUrl: archiveEntry.pageUrl,
    imageUrl,
    width: null,
    height: null,
    aspectRatio: null,
    altText: attribute(comicFragment, "alt", archiveEntry.pageUrl),
    titleText: attribute(comicFragment, "title", archiveEntry.pageUrl),
    source: {
      archiveUrl: ARCHIVE_URL,
      archivePublishedAt: archiveEntry.publishedAtWithOffset,
      originalPageUrl,
      originalXkcdNumber: number,
      translationPageUrl: archiveEntry.pageUrl,
      translationImageUrl: imageUrl,
      translationCredit: "Gabriel Rodríguez Alberich",
      license: {
        name: "Creative Commons Attribution-NonCommercial 2.5 Generic",
        label: "CC BY-NC 2.5",
        url: "https://creativecommons.org/licenses/by-nc/2.5/",
      },
    },
  };
}

function readImageDimensions(bytes) {
  const buffer = Buffer.from(bytes);

  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return {
      format: "png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (
    buffer.length >= 10 &&
    (buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
      buffer.subarray(0, 6).toString("ascii") === "GIF89a")
  ) {
    return {
      format: "gif",
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const segmentLength = buffer.readUInt16BE(offset + 2);
      if (segmentLength < 2 || offset + segmentLength + 2 > buffer.length) break;
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return {
          format: "jpeg",
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        };
      }
      offset += segmentLength + 2;
    }
  }

  throw new Error("Unsupported image format or incomplete image header");
}

async function fetchWithRetry(url, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "*/*",
          "User-Agent": USER_AGENT,
          ...options.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, 300 * 2 ** (attempt - 1)),
        );
      }
    }
  }

  throw new Error(`Failed to fetch ${url}: ${lastError?.message ?? lastError}`);
}

async function fetchText(url) {
  const response = await fetchWithRetry(url, {
    headers: { Accept: "text/html,application/xhtml+xml" },
  });
  return response.text();
}

async function fetchDimensions(imageUrl) {
  const response = await fetchWithRetry(imageUrl, {
    headers: {
      Accept: "image/*",
      Range: "bytes=0-65535",
    },
  });
  const dimensions = readImageDimensions(await response.arrayBuffer());
  return {
    ...dimensions,
    mediaType: response.headers.get("content-type")?.split(";", 1)[0] ?? null,
  };
}

async function concurrentMap(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}

function assertUnique(values, selector, label) {
  const seen = new Map();
  for (const value of values) {
    const key = selector(value);
    if (seen.has(key)) {
      throw new Error(
        `Duplicate ${label}: ${JSON.stringify(key)} in ` +
          `${JSON.stringify(seen.get(key))} and ${JSON.stringify(value)}`,
      );
    }
    seen.set(key, value);
  }
}

function duplicateNumberSummary(comics) {
  const pagesByNumber = new Map();
  for (const comic of comics) {
    const pages = pagesByNumber.get(comic.number) ?? [];
    pages.push(comic.pageUrl);
    pagesByNumber.set(comic.number, pages);
  }

  return [...pagesByNumber]
    .filter(([, pageUrls]) => pageUrls.length > 1)
    .map(([number, pageUrls]) => ({ number, pageUrls: pageUrls.toSorted() }))
    .toSorted((left, right) => left.number - right.number);
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function validateComics(comics) {
  if (comics.length !== EXPECTED_COMIC_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_COMIC_COUNT} comics, found ${comics.length}`,
    );
  }

  assertUnique(comics, (comic) => comic.id, "comic id");
  assertUnique(comics, (comic) => comic.pageUrl, "Spanish page URL");
  assertUnique(comics, (comic) => comic.imageUrl, "Spanish image URL");

  for (const comic of comics) {
    if (!Number.isInteger(comic.number) || comic.number <= 0) {
      throw new Error(`Invalid xkcd number on ${comic.pageUrl}`);
    }
    if (!(comic.width > 0) || !(comic.height > 0)) {
      throw new Error(`Invalid image dimensions on ${comic.pageUrl}`);
    }
  }

  for (const [number, expected] of EXISTING_COMICS) {
    const match = comics.find(
      (comic) => comic.number === number && comic.pageUrl === expected.pageUrl,
    );
    if (!match || match.id !== expected.id || match.imageUrl !== expected.imageUrl) {
      throw new Error(`Missing preserved curriculum mapping for xkcd #${number}`);
    }
  }
}

async function main() {
  const { outputPath, concurrency } = parseArguments(process.argv.slice(2));
  console.error(`Fetching ${ARCHIVE_URL}`);
  const archiveEntries = parseArchive(await fetchText(ARCHIVE_URL));

  console.error(`Fetching ${archiveEntries.length} Spanish strip pages`);
  const comics = await concurrentMap(
    archiveEntries,
    concurrency,
    async (entry) => parseStripPage(await fetchText(entry.pageUrl), entry),
  );

  console.error(`Reading dimensions from ${comics.length} Spanish images`);
  await concurrentMap(comics, concurrency, async (comic) => {
    const dimensions = await fetchDimensions(comic.imageUrl);
    comic.width = dimensions.width;
    comic.height = dimensions.height;
    comic.aspectRatio = dimensions.width / dimensions.height;
    comic.imageFormat = dimensions.format;
    comic.mediaType = dimensions.mediaType;
  });

  comics.sort(
    (left, right) =>
      left.number - right.number || compareText(left.pageUrl, right.pageUrl),
  );
  validateComics(comics);

  const duplicateOriginalNumbers = duplicateNumberSummary(comics);
  const manifest = {
    schemaVersion: 1,
    source: {
      name: "xkcd en español",
      archiveUrl: ARCHIVE_URL,
      expectedComicCount: EXPECTED_COMIC_COUNT,
      translationCredit: "Gabriel Rodríguez Alberich",
      license: {
        name: "Creative Commons Attribution-NonCommercial 2.5 Generic",
        label: "CC BY-NC 2.5",
        url: "https://creativecommons.org/licenses/by-nc/2.5/",
      },
      notes: [
        "The source publishes Spanish comic dialogue inside raster images; it does not provide Spanish transcripts.",
        "The duplicate original numbers below are present in the source pages and are preserved rather than guessed at by this importer.",
      ],
    },
    integrity: {
      comicCount: comics.length,
      uniqueIds: new Set(comics.map((comic) => comic.id)).size,
      uniquePageUrls: new Set(comics.map((comic) => comic.pageUrl)).size,
      uniqueImageUrls: new Set(comics.map((comic) => comic.imageUrl)).size,
      uniqueOriginalXkcdNumbers: new Set(comics.map((comic) => comic.number)).size,
      duplicateOriginalNumbers,
    },
    comics,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.error(
    `Wrote ${comics.length} comics to ${outputPath} ` +
      `(${duplicateOriginalNumbers.length} duplicate-number groups preserved)`,
  );
}

await main();
