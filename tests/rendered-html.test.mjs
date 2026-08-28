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
  assert.match(html, /<title>Tira — español, viñeta a viñeta<\/title>/i);
  assert.match(html, /Primero,/i);
  assert.match(html, /El deber llama/i);
  assert.match(html, /Ya entendí la tira/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("starter preview artifacts are gone", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /selectNextComic/);
  assert.match(page, /recordCardHelp/);
  assert.match(layout, /Tira — español, viñeta a viñeta/);
  assert.doesNotMatch(page + layout + packageJson, /_sites-preview|react-loading-skeleton|codex-preview/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/og.png", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/comics/duty-calls.png", import.meta.url)));
  await assert.doesNotReject(access(new URL("../.openai/hosting.json", import.meta.url)));
});
