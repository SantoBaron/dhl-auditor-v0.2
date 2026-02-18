import { qs } from '../utils/dom.js';

const backdrop = document.getElementById('modalBackdrop');
const titleEl = document.getElementById('modalTitle');
const bodyEl = document.getElementById('modalBody');
const footerEl = document.getElementById('modalFooter');

// Estado inicial: forzar oculto sí o sí
backdrop.style.display = 'none';

document.getElementById('modalClose').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeModal();
});

backdrop.addEventListener('click', (e) => {
  // Cerrar solo si clicas el fondo (no dentro del modal)
  if (e.target === backdrop) closeModal();
});

export function openModal({ title, body, footerButtons = [] }) {
  titleEl.textContent = title || 'Modal';
  bodyEl.innerHTML = body || '';
  footerEl.innerHTML = '';
