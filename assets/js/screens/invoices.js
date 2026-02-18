import { clear, el } from '../utils/dom.js';
import { isoDate } from '../utils/format.js';
import { repoInvoices, repoTariffs, repoAuditRuns } from '../storage/repo.js';
import { newInvoicePlaceholder } from '../models/invoice.js';
import { toast } from '../ui/toast.js';
import { mountStatusBar, setLastAction } from '../ui/status.js';

export async function screenInvoices(root) {
  clear(root);

  const list = await repoInvoices.list();

  const ui = el(`
    <div>
      <div class="card">
        <h2>Facturas</h2>
        <p>Fase 1: CRUD básico en IndexedDB. En Fase 3 importaremos CSV bruto, mapearemos columnas y normalizaremos.</p>
        <div class="row" style="margin-top:10px">
          <button class="btn primary" id="btnAddInvoice">+ Crear factura (placeholder)</button>
          <button class="btn ghost" id="btnClearInvoices">Vaciar facturas</button>
        </div>
      </div>

      <div class="card">
        <h2>Listado</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Nº Factura</th>
              <th>Periodo</th>
              <th>Envíos</th>
              <th>Schema</th>
              <th>Creada</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="invoiceRows"></tbody>
        </table>
      </div>
    </div>
  `);

  root.appendChild(ui);

  const tbody = ui.querySelector('#invoiceRows');
  if (!list.length) {
    tbody.appendChild(el(`<tr><td colspan="6" style="color:var(--muted)">Sin facturas aún.</td></tr>`));
  } else {
    for (const inv of list) {
      const tr = el(`
        <tr>
          <td><span class="badge">${escapeHtml(inv.invoiceNumber)}</span></td>
          <td>${escapeHtml(inv.periodFrom)} → ${escapeHtml(inv.periodTo)}</td>
          <td>${escapeHtml(String(inv.totals?.shipmentCount ?? inv.shipments?.length ?? 0))}</td>
          <td><span class="badge ok">v${inv.schemaVersion}</span></td>
          <td>${escapeHtml(isoDate(inv.createdAt))}</td>
          <td style="text-align:right">
            <button class="btn danger ghost" data-del="${inv.id}">Eliminar</button>
          </td>
        </tr>
      `);
      tbody.appendChild(tr);
    }
  }

  ui.querySelector('#btnAddInvoice').addEventListener('click', async () => {
    const inv = newInvoicePlaceholder({ invoiceNumber: `XVQ-PLACEHOLDER-${Date.now()}` });
    await repoInvoices.add(inv);
    toast('Factura creada', inv.invoiceNumber, 'ok');
    setLastAction(`Factura creada: ${inv.id}`);
    await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
    await screenInvoices(root);
  });

  ui.querySelector('#btnClearInvoices').addEventListener('click', async () => {
    await repoInvoices.clear();
    toast('Facturas borradas', 'Store invoices vaciado', 'warn');
    setLastAction('Facturas vaciadas');
    await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
    await screenInvoices(root);
  });

  ui.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await repoInvoices.del(btn.dataset.del);
      toast('Factura eliminada', btn.dataset.del, 'warn');
      setLastAction(`Factura eliminada: ${btn.dataset.del}`);
      await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
      await screenInvoices(root);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
