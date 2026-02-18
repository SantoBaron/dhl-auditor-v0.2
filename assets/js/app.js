import { initRouter, navigate } from './router.js';
import { openDb, resetDb } from './storage/db.js';
import { repoTariffs, repoInvoices, repoAuditRuns } from './storage/repo.js';
import { mountStatusBar, setLastAction } from './ui/status.js';
import { toast } from './ui/toast.js';
import { openModal, closeModal } from './ui/modal.js';
import { screenTariffs } from './screens/tariffs.js';
import { screenInvoices } from './screens/invoices.js';
import { screenAudit } from './screens/audit.js';
import { screenBackup } from './screens/backup.js';

const root = document.getElementById('appRoot');

const routes = {
  '#/tariffs': screenTariffs,
  '#/invoices': screenInvoices,
  '#/audit': screenAudit
};

async function bootstrap() {
  // Abrir DB y preparar status
  const db = await openDb();
  mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns });

  document.getElementById('dbStatus').textContent = `OK (schema v${db.version})`;
  setLastAction('App iniciada');

  // Tabs
  initRouter({
    onRoute: async (hash) => {
      const fn = routes[hash] || routes['#/tariffs'];
      document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.route === hash);
      });
      await fn(root);
      localStorage.setItem('dhlAuditor:lastRoute', hash);
      setLastAction(`Ruta: ${hash}`);
    }
  });

  // Header actions
  document.getElementById('btnResetDb').addEventListener('click', async () => {
    openModal({
      title: 'Reset DB',
      body: `
        <div class="card" style="margin:0">
          <p><b>Esto borra</b> tarifas, facturas y auditorías en IndexedDB.</p>
          <p style="margin-top:10px;color:var(--muted)">Recomendación: haz backup antes.</p>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', className: 'btn ghost', onClick: closeModal },
        {
          label: 'Borrar',
          className: 'btn danger',
          onClick: async () => {
            await resetDb();
            closeModal();
            toast('DB reseteada', 'IndexedDB recreada correctamente', 'warn');
            await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force: true });
            navigate('#/tariffs');
          }
        }
      ]
    });
  });

  document.getElementById('btnBackup').addEventListener('click', async () => {
    await screenBackup(root);
    navigate('#/tariffs'); // vuelve a tarifas tras cerrar modal si procede
  });

  // Go last route
  const last = localStorage.getItem('dhlAuditor:lastRoute') || '#/tariffs';
  navigate(last);
}

bootstrap().catch(err => {
  console.error(err);
  toast('Error arrancando', err?.message || String(err), 'bad');
  document.getElementById('dbStatus').textContent = 'ERROR';
});
