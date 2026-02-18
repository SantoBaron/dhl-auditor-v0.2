const backdrop = document.getElementById('modalBackdrop');
const titleEl = document.getElementById('modalTitle');
const bodyEl = document.getElementById('modalBody');
const footerEl = document.getElementById('modalFooter');
const closeBtn = document.getElementById('modalClose');

// Estado inicial: oculto sí o sí (no dependemos de [hidden])
backdrop.style.display = 'none';

function stop(e) {
  e.preventDefault();
  e.stopPropagation();
}

closeBtn.addEventListener('click', (e) => {
  stop(e);
  closeModal();
});

backdrop.addEventListener('click', (e) => {
  // cerrar solo si clicas el fondo (no dentro del modal)
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
    btn.addEventListener('click', (e) => {
      stop(e);
      b.onClick?.();
    });
    footerEl.appendChild(btn);
  }

  backdrop.style.display = 'flex';
}

export function closeModal() {
  backdrop.style.display = 'none';
  titleEl.textContent = 'Modal';
  bodyEl.innerHTML = '';
  footerEl.innerHTML = '';
}
