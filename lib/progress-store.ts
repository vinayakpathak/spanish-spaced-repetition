export const LEGACY_SRS_STORAGE_KEY = "tira:srs:v3";
export const LEGACY_UI_STORAGE_KEY = "tira:ui:v3";

const DATABASE_NAME = "tira-progress";
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = "snapshots";
const CURRENT_SNAPSHOT_KEY = "current";

export type OpenedByComic = Record<string, string[]>;

export interface ProgressSnapshot {
  serializedSrs: string | null;
  openedByComic: OpenedByComic;
}

export interface ProgressLoadResult extends ProgressSnapshot {
  source: "indexeddb" | "empty";
  warning: string | null;
}

interface StoredProgressSnapshot extends ProgressSnapshot {
  schemaVersion: 1;
}

export interface ProgressBackend {
  read(): Promise<unknown>;
  write(snapshot: StoredProgressSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export interface ObsoleteProgressStorage {
  removeItem(key: string): void;
}

export interface ProgressStore {
  load(): Promise<ProgressLoadResult>;
  save(snapshot: ProgressSnapshot): Promise<void>;
  clear(): Promise<void>;
  flush(): Promise<void>;
}

interface PendingWrite {
  snapshot: StoredProgressSnapshot;
  waiters: Array<{
    resolve: () => void;
    reject: (error: unknown) => void;
  }>;
}

const STORAGE_UNAVAILABLE_WARNING =
  "Progress storage is unavailable. Changes will last only until this tab closes.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeOpenedByComic(value: unknown): OpenedByComic {
  if (!isRecord(value)) return {};

  const openedByComic: OpenedByComic = {};
  for (const [comicId, regionIds] of Object.entries(value)) {
    if (!Array.isArray(regionIds)) continue;
    openedByComic[comicId] = [
      ...new Set(regionIds.filter((id): id is string => typeof id === "string")),
    ];
  }
  return openedByComic;
}

function parseStoredSnapshot(value: unknown): StoredProgressSnapshot | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (value.serializedSrs !== null && typeof value.serializedSrs !== "string") {
    return null;
  }
  return {
    schemaVersion: 1,
    serializedSrs: value.serializedSrs,
    openedByComic: sanitizeOpenedByComic(value.openedByComic),
  };
}

function removeObsoleteSnapshot(
  storage: ObsoleteProgressStorage | null,
): boolean {
  if (!storage) return true;
  try {
    storage.removeItem(LEGACY_SRS_STORAGE_KEY);
    storage.removeItem(LEGACY_UI_STORAGE_KEY);
    return true;
  } catch {
    // A successful IndexedDB write remains authoritative even if privacy
    // settings prevent cleanup of the old, small localStorage records.
    return false;
  }
}

function storedSnapshot(snapshot: ProgressSnapshot): StoredProgressSnapshot {
  return {
    schemaVersion: 1,
    serializedSrs: snapshot.serializedSrs,
    openedByComic: sanitizeOpenedByComic(snapshot.openedByComic),
  };
}

export function createProgressStore(
  backend: ProgressBackend,
  obsoleteStorage: ObsoleteProgressStorage | null = null,
): ProgressStore {
  let pendingWrite: PendingWrite | null = null;
  let drainPromise: Promise<void> | null = null;

  async function writeLatest(): Promise<void> {
    while (pendingWrite) {
      const current = pendingWrite;
      pendingWrite = null;
      try {
        await backend.write(current.snapshot);
        removeObsoleteSnapshot(obsoleteStorage);
        for (const waiter of current.waiters) waiter.resolve();
      } catch (error) {
        for (const waiter of current.waiters) waiter.reject(error);
      }
    }
  }

  function ensureDrain(): void {
    if (drainPromise) return;
    drainPromise = writeLatest().finally(() => {
      drainPromise = null;
      if (pendingWrite) ensureDrain();
    });
  }

  async function flush(): Promise<void> {
    while (drainPromise || pendingWrite) {
      if (pendingWrite) ensureDrain();
      await drainPromise;
    }
  }

  return {
    async load() {
      // Schema-v3 localStorage records came from the former simulated-day
      // scheduler. They do not contain the timestamps required by the current
      // model, so they are deliberately discarded rather than imported with
      // invented history.
      removeObsoleteSnapshot(obsoleteStorage);
      try {
        const stored = await backend.read();
        if (stored !== undefined && stored !== null) {
          const parsed = parseStoredSnapshot(stored);
          if (parsed) {
            return {
              serializedSrs: parsed.serializedSrs,
              openedByComic: parsed.openedByComic,
              source: "indexeddb" as const,
              warning: null,
            };
          }

          return {
            serializedSrs: null,
            openedByComic: {},
            source: "empty" as const,
            warning:
              "Saved progress could not be read. The current scheduler is starting fresh.",
          };
        }

        return {
          serializedSrs: null,
          openedByComic: {},
          source: "empty" as const,
          warning: null,
        };
      } catch {
        return {
          serializedSrs: null,
          openedByComic: {},
          source: "empty" as const,
          warning: STORAGE_UNAVAILABLE_WARNING,
        };
      }
    },

    save(snapshot) {
      return new Promise<void>((resolve, reject) => {
        if (pendingWrite) {
          pendingWrite.snapshot = storedSnapshot(snapshot);
          pendingWrite.waiters.push({ resolve, reject });
        } else {
          pendingWrite = {
            snapshot: storedSnapshot(snapshot),
            waiters: [{ resolve, reject }],
          };
        }
        ensureDrain();
      });
    },

    async clear() {
      await flush();
      let clearError: unknown = null;
      try {
        await backend.clear();
      } catch (error) {
        clearError = error;
      }
      // Cleanup is best-effort because obsolete keys are never read again.
      // Failure to remove them cannot restore or affect current progress.
      removeObsoleteSnapshot(obsoleteStorage);
      if (clearError) throw clearError;
    },

    flush,
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction was aborted"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

function createIndexedDbBackend(factory: IDBFactory): ProgressBackend {
  let databasePromise: Promise<IDBDatabase> | null = null;

  function openDatabase(): Promise<IDBDatabase> {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
          database.createObjectStore(OBJECT_STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Could not open IndexedDB"));
      request.onblocked = () => reject(new Error("IndexedDB upgrade was blocked"));
    });
    return databasePromise;
  }

  return {
    async read() {
      const database = await openDatabase();
      const transaction = database.transaction(OBJECT_STORE_NAME, "readonly");
      const completion = transactionComplete(transaction);
      const request = transaction
        .objectStore(OBJECT_STORE_NAME)
        .get(CURRENT_SNAPSHOT_KEY);
      const [result] = await Promise.all([requestResult(request), completion]);
      return result;
    },

    async write(snapshot) {
      const database = await openDatabase();
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
      const completion = transactionComplete(transaction);
      transaction
        .objectStore(OBJECT_STORE_NAME)
        .put(snapshot, CURRENT_SNAPSHOT_KEY);
      await completion;
    },

    async clear() {
      const database = await openDatabase();
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
      const completion = transactionComplete(transaction);
      transaction.objectStore(OBJECT_STORE_NAME).clear();
      await completion;
    },
  };
}

export function createBrowserProgressStore(): ProgressStore {
  let obsoleteStorage: Storage | null = null;
  if (typeof window !== "undefined") {
    try {
      obsoleteStorage = window.localStorage;
    } catch {
      // IndexedDB remains usable when localStorage is blocked.
    }
  }

  const factory =
    typeof window !== "undefined" ? window.indexedDB : undefined;
  const backend: ProgressBackend = factory
    ? createIndexedDbBackend(factory)
    : {
        async read() {
          throw new Error("IndexedDB is unavailable");
        },
        async write() {
          throw new Error("IndexedDB is unavailable");
        },
        async clear() {
          throw new Error("IndexedDB is unavailable");
        },
      };

  return createProgressStore(
    backend,
    obsoleteStorage,
  );
}
