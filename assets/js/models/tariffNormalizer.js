import { uuid } from '../utils/uuid.js';
import { SCHEMA } from './common.js';

export function normalizeTariffJson(raw, { fileName = null } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('El JSON de tarifa debe ser un objeto');
  }

  const periodFrom =
    asDate(raw.periodFrom) ||
    asDate(raw.validFrom) ||
    asDate(raw?.period?.from) ||
    asDate(raw?.validity?.from) ||
    '2026-01-01';

  const periodTo =
    asDate(raw.periodTo) ||
    asDate(raw.validTo) ||
    asDate(raw?.period?.to) ||
    asDate(raw?.validity?.to) ||
    '2026-12-31';

  const rows = collectRateRows(raw);

  const normalizedRows = rows.map((r, i) => ({
    id: String(r.id || `row-${i + 1}`),
    service: str(r.service || r.product || r.serviceName || raw.service || raw.product || 'GENERAL'),
    zone: str(r.zone || r.area || r.region || r.countryZone || 'GEN'),
    weightFromKg: num(r.weightFrom ?? r.minWeight ?? r.fromKg ?? r.weight ?? 0),
    weightToKg: num(r.weightTo ?? r.maxWeight ?? r.toKg ?? r.weight ?? r.max ?? r.minWeight ?? 0),
    priceEur: num(r.priceEur ?? r.price ?? r.rate ?? r.amount ?? r.total ?? 0)
  })).filter((r) => Number.isFinite(r.priceEur));

  if (!normalizedRows.length) {
    throw new Error('No se encontraron líneas tarifarias válidas (price/rate/amount) en el JSON');
  }

  const label = str(raw.label || raw.name || raw.tariffName || raw.title || `Tarifa ${periodFrom} → ${periodTo}`);
  const carrier = str(raw.carrier || raw.provider || raw.company || 'DHL');
  const currency = str(raw.currency || raw.ccy || 'EUR').toUpperCase();

  const now = new Date().toISOString();
  return {
    id: uuid(),
    schemaVersion: SCHEMA.tariff,
    label,
    carrier,
    accountId: str(raw.accountId || raw.account || raw.customerAccount || null),
    periodFrom,
    periodTo,
    currency,
    normalized: {
      format: 'agq_tariff_v1',
      rowCount: normalizedRows.length,
      rows: normalizedRows
    },
    source: {
      type: 'json-import',
      fileName,
      importedAt: now
    },
    createdAt: now,
    updatedAt: now
  };
}

function collectRateRows(raw) {
  const direct = [raw.rates, raw.rateRows, raw.rows, raw.items, raw.lines];
  for (const candidate of direct) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (Array.isArray(raw.services)) {
    const acc = [];
    for (const s of raw.services) {
      const part = collectRateRows(s);
      for (const row of part) acc.push({ ...row, service: row.service || s.name || s.service });
    }
    if (acc.length) return acc;
  }

  if (Array.isArray(raw.tariffs)) {
    const acc = [];
    for (const t of raw.tariffs) acc.push(...collectRateRows(t));
    if (acc.length) return acc;
  }

  return [];
}

function asDate(v) {
  if (!v) return null;
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function str(v) {
  if (v == null) return '';
  return String(v).trim();
}

function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (v == null) return NaN;
  const s = String(v).replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
