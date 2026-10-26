// ══ Барабан дати (як в iOS): день · місяць · рік ═════════════════════════════
// Замість сірого системного <input type="date">. Гортається пальцем, коліщатком
// миші та стрілками; кожен крок — легка вібрація. Значення — 'YYYY-MM-DD'.
import { getLang, locale } from './i18n.js';
import { haptic } from './platform.js';

const ITEM = 44;                      // висота рядка — як .dw-item у CSS
const pad2 = n => String(n).padStart(2, '0');
const daysIn = (y, m) => new Date(y, m, 0).getDate();
const parse = s => { const [y, m, d] = String(s || '').split('-').map(Number); return y && m && d ? { y, m, d } : null; };
const fmt = ({ y, m, d }) => `${y}-${pad2(m)}-${pad2(d)}`;

export function dateWheel(host, { value, min = '1920-01-01', max, fallback, onChange } = {}) {
  const lo = parse(min);
  const hi = parse(max) || parse(fmt({ y: new Date().getFullYear(), m: 12, d: 31 }));
  const clamp = v => (fmt(v) > fmt(hi) ? { ...hi } : fmt(v) < fmt(lo) ? { ...lo } : v);
  let cur = clamp(parse(value) || parse(fallback) || { y: hi.y - 7, m: 6, d: 15 });
  let last = fmt(cur);

  const monthName = i => {
    const s = new Intl.DateTimeFormat(locale(), { month: 'long' }).format(new Date(2000, i, 15));
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const years = Array.from({ length: hi.y - lo.y + 1 }, (_, i) => lo.y + i);
  const spec = {
    d: { list: Array.from({ length: 31 }, (_, i) => i + 1), label: v => v },
    m: { list: Array.from({ length: 12 }, (_, i) => i + 1), label: v => monthName(v - 1) },
    y: { list: years, label: v => v },
  };
  // EN: місяць · день · рік; RU/UA: день · місяць · рік
  const order = getLang() === 'en' ? ['m', 'd', 'y'] : ['d', 'm', 'y'];

  host.classList.add('date-wheel');
  host.innerHTML = `<div class="dw-band"></div>${order.map(k => `
    <div class="dw-col dw-${k}" data-k="${k}" tabindex="0" role="listbox">
      <div class="dw-sp"></div>${spec[k].list.map((v, i) => `<div class="dw-item" data-i="${i}" role="option">${spec[k].label(v)}</div>`).join('')}<div class="dw-sp"></div>
    </div>`).join('')}`;

  const C = {};
  order.forEach(k => {
    const el = host.querySelector(`.dw-${k}`);
    C[k] = { el, items: [...el.querySelectorAll('.dw-item')], idx: -1, raf: 0, t: 0, ready: false };
  });
  const idxOf = k => spec[k].list.indexOf(cur[k]);

  // 3D-барабан: рядки нахиляються й тьмяніють від центру
  function paint(k) {
    const c = C[k];
    const center = c.el.scrollTop / ITEM;
    const idx = Math.max(0, Math.min(c.items.length - 1, Math.round(center)));
    if (idx !== c.idx) { c.idx = idx; if (c.ready) haptic('select'); }
    const from = Math.max(0, Math.floor(center) - 5), to = Math.min(c.items.length - 1, Math.ceil(center) + 5);
    for (let i = from; i <= to; i++) {
      const off = i - center;
      const it = c.items[i];
      it.style.transform = `rotateX(${(-off * 19).toFixed(1)}deg)`;
      it.style.opacity = Math.max(0.12, 1 - Math.abs(off) * 0.27).toFixed(2);
      it.classList.toggle('on', i === idx);
    }
  }

  function markDays() {
    const n = daysIn(cur.y, cur.m);
    C.d.items.forEach((it, i) => it.classList.toggle('off', i + 1 > n));
  }

  function sync(smooth) {
    order.forEach(k => {
      const top = idxOf(k) * ITEM;
      if (Math.abs(C[k].el.scrollTop - top) > 1) C[k].el.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
      else paint(k);
    });
  }

  // Колонка зупинилась — фіксуємо значення, підрізаємо день (31 лютого → 28/29) і межі
  function settle(k) {
    const c = C[k];
    const idx = Math.max(0, Math.min(c.items.length - 1, Math.round(c.el.scrollTop / ITEM)));
    cur = { ...cur, [k]: spec[k].list[idx] };
    cur.d = Math.min(cur.d, daysIn(cur.y, cur.m));
    cur = clamp(cur);
    markDays();
    sync(true);
    const v = fmt(cur);
    if (v !== last) { last = v; onChange?.(v); }
  }

  order.forEach(k => {
    const c = C[k];
    c.el.addEventListener('scroll', () => {
      if (!c.raf) c.raf = requestAnimationFrame(() => { c.raf = 0; paint(k); });
      clearTimeout(c.t);
      c.t = setTimeout(() => settle(k), 120);
    }, { passive: true });
    c.el.addEventListener('click', e => {
      const it = e.target.closest('.dw-item');
      if (it) c.el.scrollTo({ top: Number(it.dataset.i) * ITEM, behavior: 'smooth' });
    });
    c.el.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      c.el.scrollBy({ top: e.key === 'ArrowUp' ? -ITEM : ITEM, behavior: 'smooth' });
    });
  });

  markDays();
  sync(false);
  // Після першого кадру макет точно готовий — ставимо ще раз і вмикаємо вібрацію
  requestAnimationFrame(() => { sync(false); order.forEach(k => { C[k].ready = true; }); });

  return {
    get value() { return fmt(cur); },
    set(v) { const p = parse(v); if (p) { cur = clamp(p); last = fmt(cur); markDays(); sync(true); } },
  };
}
