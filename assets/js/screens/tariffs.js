import { clear, el } from '../utils/dom.js';
import { isoDate } from '../utils/format.js';
import { repoTariffs } from '../storage/repo.js';
import { newTariffPlaceholder } from '../models/tariff.js';
import { toast } from '../ui/toast.js';
import { mountStatusBar, setLastAction } from '../ui/status.js';

export async function screenTariffs(root) {
  clear(root);

  const list = await repoTariffs.list();

  const ui = el(`
    <div>
      <div class="card">
        <h2>Tarifas</h2>
        <p>Fase 1: CRUD básico en IndexedDB. En Fase 2 importaremos el JSON bruto y lo normalizaremos.</p>
        <div class="row" style="margin-top:10px">
          <button class="btn primary" id="btnAddTariff">+ Crear tarifa (placeholder)</button>
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
    tbody.appendChild(el(`<tr><td colspan="5" style="color:var(--muted)">Sin tarifas aún.</td></tr>`));
  } else {
    for (const t of list) {
      const tr = el(`
        <tr>
          <td>${escapeHtml(t.label || '(sin label)')}</td>
          <td><span class="badge">${escapeHtml(t.periodFrom)} → ${escapeHtml(t.periodTo)}</span></td>
          <td><span class="badge ok">v${t.schemaVersion}</span></td>
          <td>${escapeHtml(isoDate(t.createdAt))}</td>
          <td style="text-align:right">
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
    await mountStatusBar({ repoTariffs, repoInvoices: (await import('../storage/repo.js')).repoInvoices, repoAuditRuns: (await import('../storage/repo.js')).repoAuditRuns, force: true });
    await screenTariffs(root);
  });

  ui.querySelector('#btnClearTariffs').addEventListener('click', async () => {
    await repoTariffs.clear();
    toast('Tarifas borradas', 'Store tariffs vaciado', 'warn');
    setLastAction('Tarifas vaciadas');
    await mountStatusBar({ repoTariffs, repoInvoices: (await import('../storage/repo.js')).repoInvoices, repoAuditRuns: (await import('../storage/repo.js')).repoAuditRuns, force: true });
    await screenTariffs(root);
  });

  ui.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await repoTariffs.del(btn.dataset.del);
      toast('Tarifa eliminada', btn.dataset.del, 'warn');
      setLastAction(`Tarifa eliminada: ${btn.dataset.del}`);
      await mountStatusBar({ repoTariffs, repoInvoices: (await import('../storage/repo.js')).repoInvoices, repoAuditRuns: (await import('../storage/repo.js')).repoAuditRuns, force: true });
      await screenTariffs(root);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
