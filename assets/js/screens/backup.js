import { repoTariffs, repoInvoices, repoAuditRuns } from '../storage/repo.js';
import { openModal, closeModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { mountStatusBar, setLastAction } from '../ui/status.js';

export async function screenBackup() {
  const body = `
    <div class="card" style="margin:0">
      <h2 style="margin-top:0">Backup / Restore</h2>
      <p>Exporta/importa la base (tariffs, invoices, auditRuns) como JSON.</p>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" id="btnExport">Exportar JSON</button>
        <label class="btn ghost" style="display:inline-flex; align-items:center; gap:10px; cursor:pointer">
          Importar JSON
          <input id="inpImport" type="file" accept="application/json" style="display:none" />
        </label>
      </div>
      <p style="margin-top:12px; color:var(--muted); font-family:var(--mono); font-size:12px">
        Nota: esto no “migrará” schemas futuros; en Fase 2–4 añadiremos migraciones si cambian modelos.
      </p>
    </div>
  `;

  openModal({
    title: 'Backup',
    body,
    footerButtons: [
      { label: 'Cerrar', className: 'btn ghost', onClick: closeModal }
    ]
  });

  // Wire buttons after modal is open
  const btnExport = document.getElementById('btnExport');
  const inpImport = document.getElementById('inpImport');

  btnExport.addEventListener('click', async () => {
    const payload = await exportAll();
    downloadJson(payload, `dhl_auditor_backup_${new Date().toISOString().slice(0,10)}.json`);
    toast('Backup exportado', 'JSON descargado', 'ok');
    setLastAction('Backup exportado');
  });

  inpImport.addEventListener('change', async () => {
    const f = inpImport.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const payload = JSON.parse(text);
      await importAll(payload);
      toast('Backup importado', `OK: ${f.name}`, 'ok');
      setLastAction(`Backup importado: ${f.name}`);
      await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
      closeModal();
    } catch (e) {
      console.error(e);
      toast('Error importando', e?.message || String(e), 'bad');
    } finally {
      inpImport.value = '';
    }
  });
}

async function exportAll() {
  const [tariffs, invoices, auditRuns] = await Promise.all([
    repoTariffs.list(),
    repoInvoices.list(),
    repoAuditRuns.list()
  ]);

  return {
    meta: {
      app: 'dhl_auditor_v02',
      exportedAt: new Date().toISOString()
    },
    tariffs,
    invoices,
    auditRuns
  };
}

async function importAll(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('JSON inválido');

  // Estrategia simple: merge por id (put) sin borrar lo existente
  const tariffs = Array.isArray(payload.tariffs) ? payload.tariffs : [];
  const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];
  const auditRuns = Array.isArray(payload.auditRuns) ? payload.auditRuns : [];

  for (const t of tariffs) await repoTariffs.put(t);
  for (const i of invoices) await repoInvoices.put(i);
  for (const a of auditRuns) await repoAuditRuns.put(a);
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
