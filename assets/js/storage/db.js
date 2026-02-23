const DB_NAME = 'dhl_auditor_v02';
const DB_VERSION = 1;

export async function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = req.result;

      // Stores versionados y con índices útiles
      // tariffs: tarifas normalizadas v1 (Fase 2)
      if (!db.objectStoreNames.contains('tariffs')) {
        const s = db.createObjectStore('tariffs', { keyPath: 'id' });
        s.createIndex('by_period', ['periodFrom', 'periodTo'], { unique: false });
        s.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      // invoices: facturas normalizadas v1 (Fase 3)
      if (!db.objectStoreNames.contains('invoices')) {
        const s = db.createObjectStore('invoices', { keyPath: 'id' });
        s.createIndex('by_invoiceNumber', 'invoiceNumber', { unique: false });
        s.createIndex('by_period', ['periodFrom', 'periodTo'], { unique: false });
        s.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      // auditRuns: resultados de auditoría (Fase 4)
      if (!db.objectStoreNames.contains('auditRuns')) {
        const s = db.createObjectStore('auditRuns', { keyPath: 'id' });
        s.createIndex('by_invoiceId', 'invoiceId', { unique: false });
        s.createIndex('by_tariffId', 'tariffId', { unique: false });
        s.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      // meta/settings (pequeño, pero en IDB)
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    if (req.readyState === 'done') {
      resolve(req.result);
      return;
    }

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);

    let out;
    try {
      out = fn(store);
    } catch (e) {
      reject(e);
      return;
    }

    t.oncomplete = async () => resolve(out instanceof IDBRequest ? await promisifyRequest(out) : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function resetDb() {
  // Cerrar conexiones abiertas: se reabre luego por openDb()
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Delete blocked: cierra otras pestañas abiertas'));
  });
  // Re-crear
  await openDb();
}
