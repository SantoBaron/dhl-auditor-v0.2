export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function qs(sel, root = document) {
  const n = root.querySelector(sel);
  if (!n) throw new Error(`No encontrado: ${sel}`);
  return n;
}
