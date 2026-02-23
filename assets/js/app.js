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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function renderFatal(err, context = '') {
  console.error('FATAL', context, err);
  if (!root) return;

  root.innerHTML = `
    <div class="card">
      <h2>Error en runtime</h2>
      <p style="color:var(--muted)">Contexto: <b>${escapeHtml(context || '—')}</b></p>
      <pre style="white-space:pre-wrap; font-family:var(--mono); font-size:12px; color:#ffd2d2; border:1px solid rgba(239,68,68,.35); padding:12px; border-radius:12px; background:rgba(239,68,68,.08)">
${escapeHtml(err?.stack || err?.message || String(err))}
      </pre>
      <p style="color:var(--muted)">Abre F12 → Network y busca algún 404 en <b>assets/js/</b>.</p>
    </div>
  `;
}

function renderPing() {
  // Render mínimo para confirmar que root se ve
  root.innerHTML = `
    <div class="card">
      <h2>Render OK</h2>
      <p style="color:var(--muted)">Hash actual: <span style="font-family:var(--mono)">${escapeHtml(location.hash || '(vacío)')}</span></p>
      <p style="color:var(--muted)">Si ves esto, el problema no es CSS: es un error al cargar/ejecutar pantallas.</p>
    </div>
  `;
}

window.addEventListener('error', (e) => {
  renderFatal(e.error || e.message || e, 'window.error');
});
window.addEventListener('unhandledrejection', (e) => {
  renderFatal(e.reason || e, 'unhandledrejection');
});

async function bootstrap() {
  if (!root) throw new Error('No existe #appRoot en index.html');

  // Ping visual inmediato
  renderPing();

  const db = await openDb();
  await mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns });
  document.getElementById('dbStatus').textContent = `OK (schema v${db.version})`;
  setLastAction('App iniciada');

  initRouter({
    onRoute: async (hash) => {
      try {
        const fn = routes[hash] || routes['#/tariffs'];

        document.querySelectorAll('.tab').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.route === hash);
        });

        await fn(root); // aquí es donde suele romper
        localStorage.setItem('dhlAuditor:lastRoute', hash);
        setLastAction(`Ruta: ${hash}`);
      } catch (e) {
        renderFatal(e, `onRoute(${hash})`);
        toast('Error en pantalla', e?.message || String(e), 'bad');
      }
    }
  });

  // Header actions
  document.getElementById('btnResetDb').addEventListener('click', async () => {
    openModal({
      title: 'Reset DB',
      body: `
        <div class="card" style="margin:0">
          <p><b>Esto borra</b> tarifas, facturas y auditorías en IndexedDB.</p>
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
    try {
      await screenBackup(root);
    } catch (e) {
      renderFatal(e, 'screenBackup');
    }
  });

  // initRouter ya hace el primer render con la hash actual o #/tariffs
}

bootstrap().catch((e) => renderFatal(e, 'bootstrap'));
