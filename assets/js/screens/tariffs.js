import { clear, el } from '../utils/dom.js';
import { isoDate } from '../utils/format.js';
import { repoTariffs, repoInvoices, repoAuditRuns } from '../storage/repo.js';
import { newTariffPlaceholder } from '../models/tariff.js';
import { normalizeTariffJson } from '../models/tariffNormalizer.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { mountStatusBar, setLastAction } from '../ui/status.js';

export async function screenTariffs(root) {
  clear(root);

  const list = await repoTariffs.list();

  const ui = el(`
    <div>
      <div class="card">
        <h2>Tarifas</h2>
        <p>Importa JSON de tarifas y previsualiza su normalización antes de guardarlo.</p>
        <div class="row" style="margin-top:10px">
          <button class="btn primary" id="btnAddTariff">+ Crear tarifa (placeholder)</button>
          <label class="btn" style="display:inline-flex; align-items:center; cursor:pointer">
            Cargar JSON de tarifa
            <input id="inpTariffJson" type="file" accept="application/json" style="display:none" />
          </label>
          <button class="btn ghost" id="btnClearTariffs">Vaciar tarifas</button>
        </div>
      </div>

      <div class="card">
        <h2>Listado</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Periodo</th>
              <th>Origen</th>
              <th>Filas</th>
              <th>Schema</th>
              <th>Creada</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tariffRows"></tbody>
        </table>
      </div>
    </div>
  `);

  root.appendChild(ui);

  const tbody = ui.querySelector('#tariffRows');
  if (!list.length) {
    tbody.appendChild(el(`<tr><td colspan="7" style="color:var(--muted)">Sin tarifas aún.</td></tr>`));
  } else {
    for (const t of list) {
      const tr = el(`
        <tr>
          <td>${escapeHtml(t.label || '(sin label)')}</td>
          <td><span class="badge">${escapeHtml(t.periodFrom)} → ${escapeHtml(t.periodTo)}</span></td>
          <td>${escapeHtml(t?.source?.type || 'n/a')}</td>
          <td>${escapeHtml(String(t?.normalized?.rowCount ?? 0))}</td>
          <td><span class="badge ok">v${t.schemaVersion}</span></td>
          <td>${escapeHtml(isoDate(t.createdAt))}</td>
          <td style="text-align:right">
            <button class="btn ghost" data-view="${t.id}">Ver / Estimar</button>
            <button class="btn danger ghost" data-del="${t.id}">Eliminar</button>
          </td>
        </tr>
      `);
      tbody.appendChild(tr);
    }
  }

  ui.querySelector('#btnAddTariff').addEventListener('click', async () => {
    const t = newTariffPlaceholder({ label: `Tarifa ${new Date().toLocaleString('es-ES')}` });
    await repoTariffs.add(t);
    toast('Tarifa creada', t.label, 'ok');
    setLastAction(`Tarifa creada: ${t.id}`);
    await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
    await screenTariffs(root);
  });

  ui.querySelector('#inpTariffJson').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const text = await f.text();
      const raw = JSON.parse(text);
      const tariff = normalizeTariffJson(raw, { fileName: f.name });
      const previewRows = tariff.normalized.rows.slice(0, 8);
      const warnings = collectWarnings(tariff);

      openModal({
        title: 'Previsualización de tarifa',
        body: previewBody({ tariff, previewRows, warnings, fileName: f.name }),
        footerButtons: [
          { label: 'Cancelar', className: 'btn ghost', onClick: closeModal },
          {
            label: 'Confirmar importación',
            className: 'btn primary',
            onClick: async () => {
              await repoTariffs.add(tariff);
              closeModal();
              toast('Tarifa importada', `${tariff.label} · ${tariff.normalized.rowCount} filas`, 'ok');
              setLastAction(`Tarifa JSON importada: ${f.name}`);
              await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
              await screenTariffs(root);
            }
          }
        ]
      });
    } catch (err) {
      console.error(err);
      toast('Error importando tarifa', err?.message || String(err), 'bad');
    } finally {
      e.target.value = '';
    }
  });

  ui.querySelector('#btnClearTariffs').addEventListener('click', async () => {
    await repoTariffs.clear();
    toast('Tarifas borradas', 'Store tariffs vaciado', 'warn');
    setLastAction('Tarifas vaciadas');
    await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
    await screenTariffs(root);
  });

  ui.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tariff = await repoTariffs.get(btn.dataset.view);
      if (!tariff?.normalized?.rows?.length) {
        toast('Sin datos normalizados', 'Esta tarifa no tiene filas para estimar', 'warn');
        return;
      }
      openEstimatorModal(tariff);
    });
  });

  ui.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await repoTariffs.del(btn.dataset.del);
      toast('Tarifa eliminada', btn.dataset.del, 'warn');
      setLastAction(`Tarifa eliminada: ${btn.dataset.del}`);
      await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
      await screenTariffs(root);
    });
  });
}

function openEstimatorModal(tariff) {
  const rows = tariff.normalized.rows;
  const services = [...new Set(rows.map((r) => r.service).filter(Boolean))].sort();
  const zones = [...new Set(rows.map((r) => r.zone).filter(Boolean))].sort();

  const body = `
    <div class="card" style="margin:0">
      <p><b>${escapeHtml(tariff.label)}</b> · ${escapeHtml(tariff.periodFrom)} → ${escapeHtml(tariff.periodTo)}</p>
      <div class="row">
        <div class="col">
          <label>Servicio</label>
          <select id="estService" class="est-input">
            <option value="">(Todos)</option>
            ${services.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
          </select>
        </div>
        <div class="col">
          <label>Zona</label>
          <select id="estZone" class="est-input">
            <option value="">(Todas)</option>
            ${zones.map((z) => `<option value="${escapeHtml(z)}">${escapeHtml(z)}</option>`).join('')}
          </select>
        </div>
        <div class="col">
          <label>Peso (kg)</label>
          <input id="estWeight" class="est-input" type="number" step="0.001" min="0" value="0.5" />
        </div>
      </div>
      <div id="estResult" class="card" style="margin-top:10px; margin-bottom:0"></div>
    </div>
  `;

  openModal({
    title: 'Tarifa cargada · visor y estimador',
    body,
    footerButtons: [{ label: 'Cerrar', className: 'btn ghost', onClick: closeModal }]
  });

  const selService = document.getElementById('estService');
  const selZone = document.getElementById('estZone');
  const inpWeight = document.getElementById('estWeight');
  const result = document.getElementById('estResult');

  const recalc = () => {
    const service = selService.value;
    const zone = selZone.value;
    const weight = Number(inpWeight.value || 0);

    const filtered = rows.filter((r) => {
      if (service && r.service !== service) return false;
      if (zone && r.zone !== zone) return false;
      return true;
    });

    const exact = filtered.find((r) => weight >= r.weightFromKg && weight <= r.weightToKg);
    const nearest = exact || filtered
      .slice()
      .sort((a, b) => Math.abs(center(a) - weight) - Math.abs(center(b) - weight))[0];

    if (!nearest) {
      result.innerHTML = '<p style="margin:0">No hay filas que coincidan con los filtros.</p>';
      return;
    }

    const mode = exact ? 'Coincidencia exacta por rango' : 'Sin rango exacto, fila más cercana';
    result.innerHTML = `
      <p style="margin:0 0 6px"><b>Precio estimado:</b> <span class="badge ok">${escapeHtml(String(nearest.priceEur))} EUR</span></p>
      <p style="margin:0"><b>${escapeHtml(mode)}</b></p>
      <p style="margin:6px 0 0">Servicio: ${escapeHtml(nearest.service)} · Zona: ${escapeHtml(nearest.zone)} · Rango: ${escapeHtml(String(nearest.weightFromKg))} → ${escapeHtml(String(nearest.weightToKg))} kg</p>
      <p style="margin:6px 0 0; color:var(--muted)">Filas filtradas: ${escapeHtml(String(filtered.length))} / ${escapeHtml(String(rows.length))}</p>
    `;
  };

  selService.addEventListener('change', recalc);
  selZone.addEventListener('change', recalc);
  inpWeight.addEventListener('input', recalc);
  recalc();
}

function previewBody({ tariff, previewRows, warnings, fileName }) {
  const rowsHtml = previewRows.map((r) => `
    <tr>
      <td>${escapeHtml(r.service)}</td>
      <td>${escapeHtml(r.zone)}</td>
      <td>${escapeHtml(String(r.weightFromKg))}</td>
      <td>${escapeHtml(String(r.weightToKg))}</td>
      <td>${escapeHtml(String(r.priceEur))}</td>
    </tr>
  `).join('');

  const warningsHtml = warnings.length
    ? `<ul class="preview-warnings">${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
    : '<p style="color:var(--ok)">Sin advertencias detectadas.</p>';

  return `
    <div class="card" style="margin:0">
      <p><b>Archivo:</b> ${escapeHtml(fileName || '—')}</p>
      <p><b>Label:</b> ${escapeHtml(tariff.label)}</p>
      <p><b>Carrier:</b> ${escapeHtml(tariff.carrier)} · <b>Moneda:</b> ${escapeHtml(tariff.currency)}</p>
      <p><b>Periodo:</b> ${escapeHtml(tariff.periodFrom)} → ${escapeHtml(tariff.periodTo)}</p>
      <p><b>Filas normalizadas:</b> ${escapeHtml(String(tariff.normalized.rowCount))}</p>
      <h3 style="margin:14px 0 8px">Muestra de filas (máx. 8)</h3>
      <div style="overflow:auto; max-height:280px">
        <table class="table preview-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Zona</th>
              <th>Peso desde (kg)</th>
              <th>Peso hasta (kg)</th>
              <th>Precio EUR</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <h3 style="margin:14px 0 8px">Chequeos rápidos</h3>
      ${warningsHtml}
    </div>
  `;
}

function collectWarnings(tariff) {
  const warnings = [];
  const rows = tariff?.normalized?.rows || [];

  if (tariff.currency !== 'EUR') warnings.push(`Moneda detectada ${tariff.currency}. Revisa conversión antes de auditar.`);
  if (!rows.length) warnings.push('No hay filas normalizadas.');

  let invalidWeights = 0;
  let negativePrices = 0;

  for (const r of rows) {
    if (r.weightToKg < r.weightFromKg) invalidWeights += 1;
    if (r.priceEur < 0) negativePrices += 1;
  }

  if (invalidWeights) warnings.push(`Hay ${invalidWeights} fila(s) con weightToKg < weightFromKg.`);
  if (negativePrices) warnings.push(`Hay ${negativePrices} fila(s) con precio negativo.`);

  return warnings;
}

function center(row) {
  return (Number(row.weightFromKg || 0) + Number(row.weightToKg || 0)) / 2;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
