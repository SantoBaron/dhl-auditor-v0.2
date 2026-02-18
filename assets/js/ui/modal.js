import { qs } from '../utils/dom.js';

const backdrop = document.getElementById('modalBackdrop');
const titleEl = document.getElementById('modalTitle');
const bodyEl = document.getElementById('modalBody');
const footerEl = document.getElementById('modalFooter');

document.getElementById('modalClose').addEventListener('click', () => closeModal());
backdrop.addEventListener('click', (e) => {
  if (e.target === backdrop) closeModal();
});

export function openModal({ title, body, footerButtons = [] }) {
  titleEl.textContent = title || 'Modal';
  bodyEl.innerHTML = body || '';
  footerEl.innerHTML = '';

  for (const b of footerButtons) {
    const btn = document.createElement('button');
    btn.className = b.className || 'btn';
    btn.textContent = b.label || 'OK';
    btn.addEventListener('click', () => b.onClick?.());
    footerEl.appendChild(btn);
  }

  backdrop.hidden = false;
}

export function closeModal() {
  backdrop.hidden = true;
  titleEl.textContent = 'Modal';
  bodyEl.innerHTML = '';
  footerEl.innerHTML = '';
}
