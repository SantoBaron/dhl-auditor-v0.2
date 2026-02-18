import { SCHEMA } from './common.js';
import { uuid } from '../utils/uuid.js';

export function newTariffPlaceholder({ label = 'Tarifa (placeholder)', periodFrom, periodTo } = {}) {
  return {
    id: uuid(),
    schemaVersion: SCHEMA.tariff,
    label,
    carrier: 'DHL',
    accountId: null,
    periodFrom: periodFrom || '2026-01-01',
    periodTo: periodTo || '2026-12-31',
    currency: 'EUR',

    // Fase 2 rellenará con matriz normalizada
    // normalized: { export: {weights, zones, matrix}, import: ... , zoneMapping ... }
    normalized: null,

    source: {
      type: 'placeholder',
      fileName: null
    },

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
