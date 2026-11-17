// Tiny IndexedDB key-value store. One record per collection; the data set is
// small (a few hundred items), so whole-collection writes are fine.
const DB_NAME = 'orbit-ipad'
const STORE = 'kv'

let dbp: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const r = fn(t.objectStore(STORE))
        t.oncomplete = () => resolve(r.result)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export const dbGet = <T>(key: string): Promise<T | undefined> => tx('readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
export const dbSet = (key: string, value: unknown): Promise<IDBValidKey> => tx('readwrite', (s) => s.put(value, key))
export const dbClear = (): Promise<undefined> => tx('readwrite', (s) => s.clear() as IDBRequest<undefined>)

/** Asks Safari not to evict the data (home-screen apps usually get it). */
export async function requestPersist(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
