import assert from "node:assert/strict";
import test from "node:test";
import {
  createBrowserProgressStore,
  createProgressStore,
  LEGACY_SRS_STORAGE_KEY,
  LEGACY_UI_STORAGE_KEY,
  sanitizeOpenedByComic,
} from "../lib/progress-store.ts";

function createLegacyStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function createBackend(initialValue) {
  let value = initialValue;
  const writes = [];
  let clearCount = 0;
  return {
    writes,
    get clearCount() {
      return clearCount;
    },
    async read() {
      return value;
    },
    async write(next) {
      writes.push(next);
      value = structuredClone(next);
    },
    async clear() {
      clearCount += 1;
      value = undefined;
    },
  };
}

test("opened comic state is sanitized before it reaches persistence", () => {
  assert.deepEqual(
    sanitizeOpenedByComic({
      alpha: ["one", "one", 2, null, "two"],
      beta: "not an array",
      gamma: [],
    }),
    { alpha: ["one", "two"], gamma: [] },
  );
  assert.deepEqual(sanitizeOpenedByComic(null), {});
});

test("the browser store can be constructed safely during server rendering", async () => {
  assert.equal(typeof globalThis.window, "undefined");
  const loaded = await createBrowserProgressStore().load();
  assert.equal(loaded.source, "empty");
  assert.match(loaded.warning, /last only until this tab closes/i);
});

test("legacy localStorage progress migrates to IndexedDB exactly once", async () => {
  const serializedSrs = JSON.stringify({ schemaVersion: 3, studyDay: 7 });
  const legacy = createLegacyStorage({
    [LEGACY_SRS_STORAGE_KEY]: serializedSrs,
    [LEGACY_UI_STORAGE_KEY]: JSON.stringify({
      openedByComic: { alpha: ["region-1", "region-1"] },
    }),
  });
  const backend = createBackend(undefined);
  const store = createProgressStore(backend, legacy);

  const loaded = await store.load();

  assert.equal(loaded.serializedSrs, serializedSrs);
  assert.deepEqual(loaded.openedByComic, { alpha: ["region-1"] });
  assert.equal(loaded.source, "indexeddb");
  assert.equal(loaded.warning, null);
  assert.equal(backend.writes.length, 1);
  assert.equal(backend.writes[0].schemaVersion, 1);
  assert.equal(legacy.values.has(LEGACY_SRS_STORAGE_KEY), false);
  assert.equal(legacy.values.has(LEGACY_UI_STORAGE_KEY), false);

  const reloaded = await store.load();
  assert.equal(reloaded.source, "indexeddb");
  assert.equal(backend.writes.length, 1);
});

test("an IndexedDB snapshot wins over stale legacy keys", async () => {
  const backend = createBackend({
    schemaVersion: 1,
    serializedSrs: "new-state",
    openedByComic: { current: ["r1"] },
  });
  const legacy = createLegacyStorage({
    [LEGACY_SRS_STORAGE_KEY]: "old-state",
    [LEGACY_UI_STORAGE_KEY]: JSON.stringify({
      openedByComic: { old: ["r2"] },
    }),
  });

  const loaded = await createProgressStore(backend, legacy).load();

  assert.equal(loaded.serializedSrs, "new-state");
  assert.deepEqual(loaded.openedByComic, { current: ["r1"] });
  assert.equal(loaded.source, "indexeddb");
  assert.equal(legacy.values.size, 0);
});

test("legacy progress remains readable when IndexedDB is unavailable", async () => {
  const legacy = createLegacyStorage({
    [LEGACY_SRS_STORAGE_KEY]: "recoverable-state",
  });
  const backend = {
    async read() {
      throw new Error("blocked");
    },
    async write() {
      throw new Error("blocked");
    },
    async clear() {
      throw new Error("blocked");
    },
  };

  const loaded = await createProgressStore(backend, legacy).load();

  assert.equal(loaded.serializedSrs, "recoverable-state");
  assert.equal(loaded.source, "local-storage");
  assert.match(loaded.warning, /last only until this tab closes/i);
  assert.equal(legacy.values.has(LEGACY_SRS_STORAGE_KEY), true);
});

test("rapid saves are serialized and coalesced to the latest snapshot", async () => {
  let releaseFirstWrite;
  const firstWriteStarted = Promise.withResolvers();
  const firstWriteRelease = new Promise((resolve) => {
    releaseFirstWrite = resolve;
  });
  const writes = [];
  const backend = {
    async read() {
      return undefined;
    },
    async write(snapshot) {
      writes.push(snapshot.serializedSrs);
      if (writes.length === 1) {
        firstWriteStarted.resolve();
        await firstWriteRelease;
      }
    },
    async clear() {},
  };
  const store = createProgressStore(backend);

  const first = store.save({ serializedSrs: "first", openedByComic: {} });
  await firstWriteStarted.promise;
  const second = store.save({ serializedSrs: "second", openedByComic: {} });
  const third = store.save({ serializedSrs: "third", openedByComic: {} });
  releaseFirstWrite();

  await Promise.all([first, second, third, store.flush()]);
  assert.deepEqual(writes, ["first", "third"]);
});

test("write failures reject so the UI can warn without stopping the session", async () => {
  const store = createProgressStore({
    async read() {
      return undefined;
    },
    async write() {
      throw new Error("quota or permission failure");
    },
    async clear() {},
  });

  await assert.rejects(
    store.save({ serializedSrs: "state", openedByComic: {} }),
    /quota or permission failure/,
  );
  await assert.doesNotReject(store.flush());
});

test("reset waits for queued writes and clears IndexedDB and legacy keys", async () => {
  const backend = createBackend(undefined);
  const legacy = createLegacyStorage({
    [LEGACY_SRS_STORAGE_KEY]: "old-state",
    [LEGACY_UI_STORAGE_KEY]: "{}",
  });
  const store = createProgressStore(backend, legacy);

  await store.save({
    serializedSrs: "new-state",
    openedByComic: { comic: ["region"] },
  });
  await store.clear();

  assert.equal(backend.clearCount, 1);
  assert.equal(legacy.values.size, 0);
  const loaded = await store.load();
  assert.equal(loaded.source, "empty");
  assert.equal(loaded.serializedSrs, null);
  assert.deepEqual(loaded.openedByComic, {});
});

test("reset reports a legacy cleanup failure instead of claiming success", async () => {
  const backend = createBackend(undefined);
  const store = createProgressStore(backend, {
    getItem() {
      return null;
    },
    removeItem() {
      throw new Error("storage blocked");
    },
  });

  await assert.rejects(store.clear(), /could not be cleared/i);
  assert.equal(backend.clearCount, 1);
});
