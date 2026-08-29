import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { COMICS } from "../lib/content.ts";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const openingBrace = source.indexOf("{", start);
  assert.notEqual(openingBrace, -1, `${name} has a body`);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }
  assert.fail(`${name} has a closing brace`);
}

test("direct word clicks only choose a word; exact card clicks schedule review", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const openWordBody = functionBody(page, "openWord");
  const learnCardBody = functionBody(page, "learnCard");

  assert.match(openWordBody, /setSelectedWordId\(wordId\)/);
  assert.doesNotMatch(openWordBody, /recordCardHelp/);
  assert.match(page, /onClick=\{\(\) => openWord\(region, word\.id\)\}/);

  assert.match(learnCardBody, /recordCardHelp\(srs, cardId\)/);
  assert.match(page, /onClick=\{\(\) => learnCard\(card\.id\)\}/);
  assert.doesNotMatch(learnCardBody, /selectedWord\.cardIds\[0\]/);
});

test("the initial comic server-renders every printed word as an accessible image overlay", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  const expectedWords = COMICS[0].regions.flatMap((region) => region.words);
  const buttonTags = [...html.matchAll(/<button\b[^>]*data-word-id="([^"]+)"[^>]*>/g)];
  const overlayTags = [
    ...html.matchAll(/<(?:button|span)\b[^>]*data-word-id="([^"]+)"[^>]*>/g),
  ];
  const expectedById = new Map(expectedWords.map((word) => [word.id, word]));

  assert.deepEqual(
    new Set(buttonTags.map((match) => match[1])),
    new Set(expectedWords.map((word) => word.id)),
  );
  assert.equal(buttonTags.length, expectedWords.length);
  assert.equal(
    overlayTags.length,
    expectedWords.reduce((count, word) => count + word.bounds.length, 0),
  );
  for (const match of buttonTags) {
    const tag = match[0];
    const word = expectedById.get(match[1]);
    assert.ok(word, `${match[1]} belongs to the displayed comic`);
    assert.match(tag, /class="[^"]*word-hotspot/);
    assert.match(tag, /type="button"/);
    assert.match(tag, /data-word-fragment="1"/);
    assert.match(tag, /lang="es"/);
    assert.match(tag, /aria-pressed="false"/);
    assert.ok(
      tag.includes(
        `aria-label="Open cards for Spanish word: ${word.text}. Opening adds no cards."`,
      ),
      `${word.id} names the printed Spanish word and explains the no-scheduling action`,
    );
    assert.match(tag, /style="[^"]*left:[^;]+%;top:[^;]+%;width:[^;]+%;height:[^;]+%/);
  }
  for (const match of overlayTags) {
    assert.ok(expectedById.has(match[1]), `${match[1]} is a known printed word`);
    assert.match(match[0], /class="[^"]*word-hotspot/);
    assert.match(match[0], /style="[^"]*left:[^;]+%;top:[^;]+%;width:[^;]+%;height:[^;]+%/);
    if (match[0].startsWith("<span")) {
      assert.match(match[0], /class="[^"]*is-continuation/);
      assert.match(match[0], /data-word-fragment="(?:[2-9]|[1-9][0-9]+)"/);
      assert.match(match[0], /aria-hidden="true"/);
    }
  }
});

test("word overlays are driven by occurrence bounds and retain the card-list relationship", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /const hotspotClass = `word-hotspot/);
  assert.match(page, /data-word-id=\{word\.id\}/);
  assert.match(page, /word\.bounds\.map/);
  assert.match(page, /left:\s*`\$\{bounds\.x\}%`/);
  assert.match(page, /top:\s*`\$\{bounds\.y\}%`/);
  assert.match(page, /width:\s*`\$\{bounds\.width\}%`/);
  assert.match(page, /height:\s*`\$\{bounds\.height\}%`/);
  assert.match(page, /Cards related to[\s\S]*selectedWord\.text/);
  assert.match(page, /selectedWord\.cardIds/);
});
