import { el } from '../utils/dom.js';

export function toast(title, message, kind = 'ok') {
  const root = document.getElementById('toastRoot');
  const node = el(`
    <div class="toast">
      <div class="t">${escapeHtml(title)}</div>
      <div class="m">${escapeHtml(message || '')}</div>
    </div>
  `);
  if (kind === 'bad') node.style.borderColor = 'rgba(239,68,68,.55)';
  if (kind === 'warn') node.style.borderColor = 'rgba(245,158,11,.55)';
  if (kind === 'ok') node.style.borderColor = 'rgba(34,197,94,.55)';

  root.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
