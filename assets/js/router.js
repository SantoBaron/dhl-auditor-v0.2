export function navigate(hash) {
  if (location.hash !== hash) location.hash = hash;
  // si ya estamos en esa hash, disparar manualmente
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function initRouter({ onRoute }) {
  // Click en tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });

  window.addEventListener('hashchange', async () => {
    const hash = location.hash || '#/tariffs';
    await onRoute(hash);
  });

  // Primer render
  const initial = location.hash || '#/tariffs';
  onRoute(initial);
}
