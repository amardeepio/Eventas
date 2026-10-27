const DB_NAME = "eventas";
const DB_VERSION = 1;
const STORE = "kv";
const FALLBACK_PREFIX = "eventas.idb-fallback.";

let database: Promise<IDBDatabase | null> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined" && Boolean(indexedDB);
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);
  if (database) return database;
  database = new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return database;
}

function fallbackGet<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const value = localStorage.getItem(`${FALLBACK_PREFIX}${key}`);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function fallbackSet<T>(key: string, value: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${FALLBACK_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // The caller handles quota failures; never break planning.
  }
}

function fallbackDelete(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
  } catch {
    // Ignore.
  }
}

export async function storageGet<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return fallbackGet<T>(key);
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => resolve(fallbackGet<T>(key));
    } catch {
      resolve(fallbackGet<T>(key));
    }
  });
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    fallbackSet(key, value);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    try {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not save to browser storage."));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Could not save to browser storage."));
    }
  });
}

export async function storageDelete(key: string): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    fallbackDelete(key);
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Test helper: close the cached connection and remove the whole database. */
export async function resetStorageForTests(): Promise<void> {
  const db = await database;
  database = null;
  db?.close();
  const fallbackKeys: string[] = [];
  if (typeof localStorage !== "undefined") {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(FALLBACK_PREFIX) || key?.startsWith("eventas.")) fallbackKeys.push(key);
    }
    for (const key of fallbackKeys) localStorage.removeItem(key);
  }
  if (!hasIndexedDb()) return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
