import { SCHEMA } from './common.js';
import { uuid } from '../utils/uuid.js';

export function newAuditRunPlaceholder({ invoiceId, tariffId, thresholdEur = 0 } = {}) {
  return {
    id: uuid(),
    schemaVersion: SCHEMA.auditRun,
    invoiceId,
    tariffId,
    thresholdEur,

    // Fase 4: resultados
    kpis: null,
    rows: [], // detalle por envío (awb)
    claimables: [], // subset rows con delta > threshold

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
