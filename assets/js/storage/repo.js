import { tx } from './db.js';

function nowIso() { return new Date().toISOString(); }

function createRepo(storeName) {
  return {
    async list() {
      return tx(storeName, 'readonly', (s) => s.getAll());
    },
    async get(id) {
      return tx(storeName, 'readonly', (s) => s.get(id));
    },
    async put(entity) {
      const e = { ...entity };
      e.updatedAt = nowIso();
      return tx(storeName, 'readwrite', (s) => s.put(e));
    },
    async add(entity) {
      const e = { ...entity };
      e.createdAt = e.createdAt || nowIso();
      e.updatedAt = e.updatedAt || e.createdAt;
      return tx(storeName, 'readwrite', (s) => s.add(e));
    },
    async del(id) {
      return tx(storeName, 'readwrite', (s) => s.delete(id));
    },
    async count() {
      return tx(storeName, 'readonly', (s) => s.count());
    },
    async clear() {
      return tx(storeName, 'readwrite', (s) => s.clear());
    }
  };
}

export const repoTariffs = createRepo('tariffs');
export const repoInvoices = createRepo('invoices');
export const repoAuditRuns = createRepo('auditRuns');

export const repoMeta = createRepo('meta');
