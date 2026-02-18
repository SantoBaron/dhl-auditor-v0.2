let mounted = false;

export async function mountStatusBar({ repoTariffs, repoInvoices, repoAuditRuns, force = false } = {}) {
  if (mounted && !force) return;
  mounted = true;

  const [t, i, a] = await Promise.all([
    repoTariffs.count(),
    repoInvoices.count(),
    repoAuditRuns.count()
  ]);

  document.getElementById('tariffCount').textContent = String(t);
  document.getElementById('invoiceCount').textContent = String(i);
  document.getElementById('auditCount').textContent = String(a);
}

export function setLastAction(text) {
  document.getElementById('lastAction').textContent = text || '—';
}
