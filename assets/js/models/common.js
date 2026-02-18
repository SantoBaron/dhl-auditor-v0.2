export const SCHEMA = {
  tariff: 1,
  invoice: 1,
  auditRun: 1
};

export function assertSchema(entity, expected) {
  if (!entity || entity.schemaVersion !== expected) {
    throw new Error(`Schema mismatch: esperado v${expected}, recibido v${entity?.schemaVersion}`);
  }
}
