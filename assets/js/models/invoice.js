import { SCHEMA } from './common.js';
import { uuid } from '../utils/uuid.js';

export function newInvoicePlaceholder({ invoiceNumber = 'INV-PLACEHOLDER', periodFrom, periodTo } = {}) {
  return {
    id: uuid(),
    schemaVersion: SCHEMA.invoice,
    invoiceNumber,
    accountId: null,
    carrier: 'DHL',
    currency: 'EUR',
    periodFrom: periodFrom || '2026-01-01',
    periodTo: periodTo || '2026-01-31',

    // Fase 3 rellenará con envíos normalizados por AWB y líneas extras
    // shipments: [{awb, shipDate, originIso2, destIso2, weightKg, billedBaseEur, billedTotalEur, extras:[...]}]
    shipments: [],
    totals: {
      billedTotalEur: 0,
      billedBaseEur: 0,
      extrasEur: 0,
      shipmentCount: 0
    },

    source: {
      type: 'placeholder',
      fileName: null,
      columnMapping: null
    },

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
