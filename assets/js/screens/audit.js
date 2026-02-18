import { clear, el } from '../utils/dom.js';
import { repoTariffs, repoInvoices, repoAuditRuns } from '../storage/repo.js';
import { toast } from '../ui/toast.js';
import { mountStatusBar, setLastAction } from '../ui/status.js';
import { newAuditRunPlaceholder } from '../models/auditRun.js';

const SETTINGS_KEY = 'dhlAuditor:thresholdEur';

export async function screenAudit(root) {
  clear(root);

  const [tariffs, invoices, audits] = await Promise.all([
    repoTariffs.list(),
    repoInvoices.list(),
    repoAuditRuns.list()
  ]);

  const threshold = Number(localStorage.getItem(SETTINGS_KEY) || '0');

  const ui = el(`
    <div>
      <div class="card">
        <h2>Dashboard / Auditoría</h2>
        <p>Fase 1: pantalla preparada. En Fase 4 conectamos motor (expectedBase) y generamos KPIs + tablas.</p>

        <div class="row" style="margin-top:10px">
          <div class="col">
            <p style="margin:0 0 6px; color:var(--muted)">Factura</p>
            <select class="btn" style="width:100%" id="selInvoice">
              ${invoices.map(i => `<option value="${i.id}">${escapeHtml(i.invoiceNumber)}</option>`).join('')}
            </select>
          </div>

          <div class="col">
            <p style="margin:0 0 6px; color:var(--muted)">Tarifa</p>
            <select class="btn" style="width:100%" id="selTariff">
              ${tariffs.map(t => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join('')}
            </select>
          </div>

          <div class="col">
            <p style="margin:0 0 6px; color:var(--muted)">Umbral reclamable (€)</p>
            <input class="btn" style="width:100%" id="inpThreshold" type="number" step="0.01" value="${threshold}">
          </div>
        </div>

        <div class="row" style="margin-top:12px">
          <button class="btn primary" id="btnRun">Ejecutar auditoría (placeholder)</button>
          <button class="btn ghost" id="btnClearAudits">Vaciar auditorías</button>
        </div>

        <p style="margin-top:12px; color:var(--muted)">
          Nota: ahora solo guardamos un “auditRun placeholder”. En Fase 4: cálculo expectedBase por zona/peso desde TariffNormalized v1.
        </p>
      </div>

      <div class="card">
        <h2>Auditorías guardadas</h2>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Factura</th>
              <th>Tarifa</th>
              <th>Umbral</th>
              <th>Schema</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="auditRows"></tbody>
        </table>
      </div>
    </div>
  `);

  root.appendChild(ui);

  const tbody = ui.querySelector('#auditRows');
  if (!audits.length) {
    tbody.appendChild(el(`<tr><td colspan="6" style="color:var(--muted)">Sin auditorías aún.</td></tr>`));
  } else {
    const invMap = new Map(invoices.map(i => [i.id, i]));
    const tarMap = new Map(tariffs.map(t => [t.id, t]));
    for (const a of audits) {
      const inv = invMap.get(a.invoiceId);
      const tar = tarMap.get(a.tariffId);
      const tr = el(`
        <tr>
          <td style="font-family:var(--mono)">${escapeHtml(a.id)}</td>
          <td>${escapeHtml(inv?.invoiceNumber || a.invoiceId)}</td>
          <td>${escapeHtml(tar?.label || a.tariffId)}</td>
          <td>${escapeHtml(String(a.thresholdEur ?? 0))}</td>
          <td><span class="badge ok">v${a.schemaVersion}</span></td>
          <td style="text-align:right"><button class="btn danger ghost" data-del="${a.id}">Eliminar</button></td>
        </tr>
      `);
      tbody.appendChild(tr);
    }
  }

  ui.querySelector('#btnRun').addEventListener('click', async () => {
    if (!tariffs.length || !invoices.length) {
      toast('Falta información', 'Crea al menos 1 tarifa y 1 factura (placeholder) en Fase 1.', 'warn');
      return;
    }
    const invoiceId = ui.querySelector('#selInvoice').value;
    const tariffId = ui.querySelector('#selTariff').value;
    const th = Number(ui.querySelector('#inpThreshold').value || '0');
    localStorage.setItem(SETTINGS_KEY, String(th));

    const run = newAuditRunPlaceholder({ invoiceId, tariffId, thresholdEur: th });
    await repoAuditRuns.add(run);

    toast('Auditoría guardada', `Run ${run.id}`, 'ok');
    setLastAction(`AuditRun creado: ${run.id}`);
    await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
    await screenAudit(root);
  });

  ui.querySelector('#btnClearAudits').addEventListener('click', async () => {
    await repoAuditRuns.clear();
    toast('Auditorías borradas', 'Store auditRuns vaciado', 'warn');
    setLastAction('Auditorías vaciadas');
    await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
    await screenAudit(root);
  });

  ui.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await repoAuditRuns.del(btn.dataset.del);
      toast('AuditRun eliminado', btn.dataset.del, 'warn');
      setLastAction(`AuditRun eliminado: ${btn.dataset.del}`);
      await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
      await screenAudit(root);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
