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
  assert.match(html, />Rankings</i);
  assert.match(html, /Tap any marked Spanish word in the picture/i);
  assert.match(html, /word meaning, reusable expression, grammar, and necessary context cards/i);
  assert.match(html, /Spanish edition/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("comic importance is visible as a normalized badge and accessible ranking dialog", async () => {
  const [page, styles, readme] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /formatImportanceScore\(currentManifestEntry\.importance\.score\)/);
  assert.match(page, /currentManifestEntry\.importance\.rank/);
  assert.match(page, /corpusManifest\.comics\.length/);
  assert.match(page, /first\.importance\.rank - second\.importance\.rank/);
  assert.match(page, /aria-labelledby="rankings-title"/);
  assert.match(page, /aria-describedby="rankings-description"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /setShowRankings\(false\)/);
  assert.match(page, /comic\.importance\.cardCount/);
  assert.match(page, /comic\.importance\.sharedCardCount/);
  assert.match(page, /PageRank-style recursive importance/);
  assert.match(page, /damped two-way comic–target centrality/);
  assert.match(page, /15% baseline\/reset/);
  assert.match(page, /zero-target comics from vanishing/);
  assert.match(page, /comic scores below sum to 100%/);
  assert.match(page, /className="rankings-list-region"[\s\S]*role="region"/);
  assert.match(page, /tabIndex=\{0\}/);
  assert.match(page, /aria-label="Comic importance rankings; scroll to view all comics"/);
  assert.match(page, /Connected targets/);
  assert.match(page, /normalized Spanish prompt and English answer match/);
  assert.match(page, /Higher-level targets use exact card IDs/);
  assert.match(page, /cross-comic targets/);
  assert.match(page, /importanceModel\.cardNodeCount\.toLocaleString\("en"\)/);
  assert.match(page, /unresolved preview cards are excluded/i);
  assert.match(page, /never merges SRS card IDs or progress/i);
  assert.match(styles, /\.importance-badge\s*\{/);
  assert.match(styles, /\.importance-badge\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(styles, /\.rankings-drawer\s*\{/);
  assert.match(styles, /\.rankings-list li\.is-current/);
  assert.match(styles, /\.rankings-list-region:focus-visible/);
  assert.match(styles, /@media \(max-width:\s*480px\)/);
  assert.match(styles, /\.ranking-comic strong\s*\{\s*overflow:\s*visible;\s*white-space:\s*normal/);
  assert.doesNotMatch(page + readme, /standard PageRank/i);
  assert.match(readme, /PageRank-style recursive importance/);
  assert.match(readme, /damped two-way comic–target centrality/);
  assert.match(readme, /15% baseline\/reset prevents disconnected components and zero-target comics from vanishing/);
  assert.match(readme, /all 258 comic scores sum to 100%/);
  assert.match(readme, /normalized Spanish prompt and English answer match/);
  assert.match(readme, /higher-level grammar, expression, and concept cards use exact IDs/);
  assert.match(readme, /never merges SRS card IDs or progress/);
  assert.match(readme, /9,466 unresolved clickable previews are excluded entirely/);
});

test("the curriculum stays Spanish-first and starter artifacts are gone", async () => {
  const [page, layout, content, progressStore, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/content.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/progress-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /selectNextComic/);
  assert.match(page, /recordCardHelp/);
  assert.match(page, /Word opened · no cards selected/);
  assert.match(page, /selectedWord\.cardIds/);
  assert.match(page, /createBrowserProgressStore/);
  assert.match(progressStore, /tira:srs:v3/);
  assert.match(progressStore, /tira:ui:v3/);
  assert.match(progressStore, /indexedDB/i);
  assert.doesNotMatch(page, /localStorage\.setItem/);
  assert.doesNotMatch(page + progressStore, /tira:(?:srs|ui):v2/);
  assert.match(layout, /Tira — learn Spanish, one comic at a time/);
  assert.match(content, /interface WordOccurrence/);
  assert.match(content, /interface CardApplication/);
  assert.match(content, /applications:\s*readonly CardApplication\[\]/);
  assert.match(content, /promptEs:\s*"no tener nada que ver con…"/);
  assert.match(content, /labelEs:\s*"¿VIENES A LA CAMA\?"/);
  assert.match(content, /translationEn:\s*"Are you coming to bed\?"/);
  assert.match(content, /https:\/\/es\.xkcd\.com\/strips\//);
  assert.doesNotMatch(content, /This card tracks the meaning of this exact surface form/i);
  assert.doesNotMatch(content, /promptEn:|answerEs:|noteEs:|labelEn:|translationEs:/);
  assert.match(page, /GENERAL EXAMPLE/);
  assert.match(page, /IN THIS COMIC/);
  assert.doesNotMatch(page, /selectedRegion\.translationEn/);
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
