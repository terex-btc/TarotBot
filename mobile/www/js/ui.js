// ══ UI-примітиви: шари (екрани, шторки), тости, хелпери ═════════════════════
import { setBackButton, haptic } from './platform.js';

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Шари поверх табів ────────────────────────────────────────────────────────
const stack = [];
const layersRoot = () => document.getElementById('layers');

function mount(layer, onClose) {
  layersRoot().appendChild(layer);
  stack.push({ layer, onClose });
  layer.addEventListener('click', e => {
    const closer = e.target.closest('[data-close]');
    if (closer && layer.contains(closer)) { haptic('light'); closeLayer(layer); }
  });
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('in')));
  syncBack();
  return layer;
}

function syncBack() {
  const top = stack[stack.length - 1];
  setBackButton(top && !top.layer.dataset.noback ? () => closeLayer(top.layer) : null);
}

export function closeLayer(layer, { silent = false } = {}) {
  const i = stack.findIndex(s => s.layer === layer);
  if (i === -1) return;
  const [{ onClose }] = stack.splice(i, 1);
  layer.classList.remove('in');
  layer.classList.add('out');
  setTimeout(() => layer.remove(), 380);
  syncBack();
  if (!silent) onClose?.();
}

export function closeTop() {
  const top = stack[stack.length - 1];
  if (top) closeLayer(top.layer);
}

export function closeAllLayers() {
  [...stack].reverse().forEach(s => closeLayer(s.layer, { silent: true }));
}

// Екран, що виїжджає справа (деталі карти, розклад, налаштування)
export function pushScreen(html, { title = '', onClose, cls = '', right = '' } = {}) {
  const layer = el(`<section class="layer push ${cls}">
    <header class="push-head">
      <button class="icon-btn" data-close aria-label="Back">${BACK_ICON}</button>
      <div class="push-title">${title}</div>
      <div class="push-right">${right}</div>
    </header>
    <div class="push-body scroll">${html}</div>
  </section>`);
  return mount(layer, onClose);
}

// Шторка знизу (карта дня, гороскоп, місяць)
export function openSheet(html, { onClose, cls = '', tall = true } = {}) {
  const layer = el(`<section class="layer sheet-layer ${cls}">
    <div class="sheet-backdrop" data-close></div>
    <div class="sheet ${tall ? 'tall' : ''}">
      <div class="sheet-grip"><span></span></div>
      ${html}
    </div>
  </section>`);
  enableDragToClose(layer);
  return mount(layer, onClose);
}

// Повноекранний шар без шапки (онбординг, paywall)
export function openFull(html, { onClose, cls = '', noBack = false } = {}) {
  const layer = el(`<section class="layer full ${cls}">${html}</section>`);
  if (noBack) layer.dataset.noback = '1';
  return mount(layer, onClose);
}

function enableDragToClose(layer) {
  const sheet = layer.querySelector('.sheet');
  let startY = null, dy = 0, scroller = null;
  sheet.addEventListener('pointerdown', e => {
    scroller = e.target.closest('.scroll');
    const fromGrip = e.target.closest('.sheet-grip');
    if (!fromGrip && scroller && scroller.scrollTop > 0) return;
    if (!fromGrip && e.target.closest('button, input, textarea, a')) return;
    startY = e.clientY; dy = 0;
  });
  window.addEventListener('pointermove', e => {
    if (startY === null) return;
    dy = Math.max(0, e.clientY - startY);
    if (dy > 6) { sheet.style.transition = 'none'; sheet.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  const end = () => {
    if (startY === null) return;
    startY = null;
    sheet.style.transition = '';
    if (dy > 120) { sheet.style.transform = ''; closeLayer(layer); }
    else sheet.style.transform = '';
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

// ── Тост ─────────────────────────────────────────────────────────────────────
let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

export const spinner = (text = '') => `<div class="loading-line"><span class="dots"><i></i><i></i><i></i></span>${text ? `<span>${esc(text)}</span>` : ''}</div>`;

// Друкує текст поступово (для відповідей AI)
export async function typeText(node, text, { speed = 12 } = {}) {
  node.textContent = '';
  const words = String(text).split(/(\s+)/);
  for (const w of words) {
    node.textContent += w;
    if (w.trim()) await delay(speed + Math.random() * speed);
  }
}

const BACK_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
