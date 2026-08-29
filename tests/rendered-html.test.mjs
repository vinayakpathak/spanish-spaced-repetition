import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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

test("server-renders the Tira learning experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="en"/i);
  assert.match(html, /<title>Tira — learn Spanish, one comic at a time<\/title>/i);
  assert.match(html, /First,/i);
  assert.match(html, /El deber llama/i);
  assert.match(html, /I understand this comic/i);
  assert.match(html, /Tap any marked Spanish word in the picture/i);
  assert.match(html, /meaning, expression, grammar, and idea cards/i);
  assert.match(html, /Spanish edition/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("the curriculum stays Spanish-first and starter artifacts are gone", async () => {
  const [page, layout, content, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/content.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /selectNextComic/);
  assert.match(page, /recordCardHelp/);
  assert.match(page, /Word opened · no cards selected/);
  assert.match(page, /selectedWord\.cardIds/);
  assert.match(layout, /Tira — learn Spanish, one comic at a time/);
  assert.match(content, /interface WordOccurrence/);
  assert.match(content, /promptEs:\s*"¿Vienes a la cama\?"/);
  assert.match(content, /translationEn:\s*"Are you coming to bed\?"/);
  assert.match(content, /https:\/\/es\.xkcd\.com\/strips\//);
  assert.doesNotMatch(content, /promptEn:|answerEs:|noteEs:|labelEn:|translationEs:/);
  assert.doesNotMatch(page + layout + packageJson, /_sites-preview|react-loading-skeleton|codex-preview/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/og-en.png", import.meta.url)));
  await Promise.all(
    [
      "duty-calls-es.png",
      "python-es.png",
      "exploits-of-a-mom-es.png",
      "correlation-es.png",
      "tech-support-es.png",
      "photos-es.png",
    ].map((asset) =>
      access(new URL(`../public/comics/${asset}`, import.meta.url)),
    ),
  );
  await assert.doesNotReject(access(new URL("../.openai/hosting.json", import.meta.url)));
});
