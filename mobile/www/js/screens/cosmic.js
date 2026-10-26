// ══ «Космічна погода»: плашка на головній + шторка з ретроградами й затемненнями ══
import { t, locale, getLang } from '../i18n.js';
import { track } from '../state.js';
import { haptic } from '../platform.js';
import { openSheet, closeLayer, esc } from '../ui.js';
import { moonSvg, starsField, icons } from '../art.js';
import { moonAt, signByKey } from '../astro.js';
import { GLYPH, sx, activeRetros, eclipseNear, upcomingSky, fmtRange } from '../sky.js';
import { openMoon } from './today.js';

const DAY = 86400000;
const daysUntil = d => Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
const signName = k => t('sign_' + k);
const signNom = k => signByKey(k)?.name[getLang()] || signName(k);   // «Скорпіон → Терези» — у називному відмінку
export const glyphBubble = p => `<i class="pg pg-${p}">${GLYPH[p]}</i>`;
const eclIcon = type => `<i class="pg pg-ecl ecl-${type}"><b></b></i>`;

// ── Плашка під іменем на головній ────────────────────────────────────────────
export function skyPillHtml() {
  const T = sx();
  const rx = activeRetros();
  if (rx.length) {
    const label = rx.length === 1 ? `${T.rx(rx[0].planet)} · ${T.leftShort(rx[0].daysLeft)}` : T.rxBoth(rx.map(r => r.planet));
    return `<button class="sky-pill rx" id="h-sky">${rx.map(r => glyphBubble(r.planet)).join('')}<span>${esc(label)}</span><em>℞</em></button>`;
  }
  const e = eclipseNear(new Date(), 7);
  if (e) return `<button class="sky-pill" id="h-sky">${eclIcon(e.type)}<span>${esc(T.ecl(e))} · ${esc(T.inDays(daysUntil(e.date)))}</span>${icons.chevron}</button>`;
  const m = moonAt();
  return `<button class="sky-pill" id="h-sky"><i class="pg pg-moon">${moonSvg(m.illum, m.waxing, { size: 20 })}</i><span>${esc(t('phase_' + m.phase))} · ${esc(signName(m.sign))}</span>${icons.chevron}</button>`;
}

// ── Ілюстрація: Сонце й орбіти, ретроградні планети підсвічені ───────────────
function orbitArt(rx) {
  const on = new Set(rx.map(r => r.planet));
  const P = [['mercury', 46, 18, 205], ['venus', 78, 30, 330], ['mars', 112, 42, 100]];
  const dot = ([p, a, b, deg]) => {
    const x = 130 + a * Math.cos(deg * Math.PI / 180), y = 78 + b * Math.sin(deg * Math.PI / 180);
    return `<g class="op op-${p}${on.has(p) ? ' on' : ''}">
      ${on.has(p) ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" class="op-ring"/>` : ''}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${on.has(p) ? 6 : 4.5}" class="op-dot"/>
      ${on.has(p) ? `<text x="${(x + 13).toFixed(1)}" y="${(y - 8).toFixed(1)}" class="op-rx">℞</text>` : ''}
    </g>`;
  };
  return `<svg class="orbit-art" viewBox="0 0 260 156" aria-hidden="true">
    <defs><radialGradient id="sun-g"><stop offset="0" stop-color="#fff6d0"/><stop offset=".45" stop-color="#ffc94d"/><stop offset="1" stop-color="#ffc94d" stop-opacity="0"/></radialGradient></defs>
    ${P.map(([, a, b]) => `<ellipse cx="130" cy="78" rx="${a}" ry="${b}" class="orbit"/>`).join('')}
    <circle cx="130" cy="78" r="26" fill="url(#sun-g)" opacity=".55"/>
    <circle cx="130" cy="78" r="10" fill="#ffd36b"/>
    ${P.map(dot).join('')}
  </svg>`;
}

function retroCard(r) {
  const T = sx();
  const P = T.p[r.planet];
  const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
  return `<div class="sky-card sc-${r.planet}">
    <div class="skc-top">${glyphBubble(r.planet)}
      <div><b class="serif">${esc(T.rx(r.planet))}</b><small>${esc(r.sign === r.endSign ? T.inSign(signName(r.sign)) : `${signNom(r.sign)} → ${signNom(r.endSign)}`)} · ${esc(fmtRange(r.start, r.end))}</small></div>
      <span class="skc-rx">℞</span></div>
    <div class="skc-bar"><i style="width:${Math.round(r.progress * 100)}%"></i></div>
    <div class="skc-left">${esc(T.left(r.daysLeft))}</div>
    <p class="skc-rules">${esc(P.rules)}</p>
    <p>${esc(P.about)}</p>
    <div class="do-dont"><div class="dd do"><h4>${esc(T.do)}</h4><ul>${li(P.do)}</ul></div>
      <div class="dd dont"><h4>${esc(T.avoid)}</h4><ul>${li(P.avoid)}</ul></div></div>
    <div class="skc-love"><span>${esc(T.love)}</span><p>${esc(P.love)}</p></div>
  </div>`;
}

function eclipseCard(e) {
  const T = sx();
  const d = daysUntil(e.date);
  return `<div class="sky-card sc-ecl">
    <div class="skc-top">${eclIcon(e.type)}
      <div><b class="serif">${esc(T.ecl(e))}</b><small>${esc(T.inSign(signName(e.sign)))} · ${esc(e.date.toLocaleDateString(locale(), { month: 'long', day: 'numeric' }))}</small></div>
      <span class="skc-when">${esc(T.inDays(d))}</span></div>
    <p>${esc(T.eclAbout[e.type])}</p>
  </div>`;
}

export function skyEventRow(ev) {
  const T = sx();
  const title = ev.kind === 'eclipse' ? T.ecl(ev) : ev.kind === 'rx' ? T.goesRx(ev.planet) : T.goesDirect(ev.planet);
  const icon = ev.kind === 'eclipse' ? eclIcon(ev.type) : glyphBubble(ev.planet);
  return `<div class="phase-row sky-row${ev.kind === 'rx' ? ' is-rx' : ''}">${icon}
    <div><b>${esc(title)}</b><span>${esc(ev.date.toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }))} · ${esc(T.inSign(signName(ev.sign)))}</span></div>
    <em>${esc(T.inDays(daysUntil(ev.date)))}</em></div>`;
}

// ── Шторка ───────────────────────────────────────────────────────────────────
export function openSky() {
  const T = sx();
  const rx = activeRetros();
  const ecl = eclipseNear(new Date(), 14);
  const m = moonAt();
  track('sky_open', rx.map(r => r.planet).join(',') || 'calm');
  const layer = openSheet(`<div class="cosmic">
      ${starsField(60, 41)}
      <button class="icon-btn sheet-x" data-close aria-label="${t('close')}">${icons.close}</button>
      <div class="sky-scroll scroll">
        <div class="sky-hero">
          ${orbitArt(rx)}
          <div class="mc-eyebrow">${esc(new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }))}</div>
          <h2 class="serif">${esc(T.title)}</h2>
        </div>
        ${rx.length ? `<h4 class="section-title">${esc(T.now)}</h4>${rx.map(retroCard).join('')}` : `<p class="sky-calm">${esc(T.calm)}</p>`}
        ${ecl ? eclipseCard(ecl) : ''}
        <button class="sky-moon" id="sky-moon">${moonSvg(m.illum, m.waxing, { size: 46 })}
          <span><small>${esc(T.moonToday)}</small><b>${esc(t('phase_' + m.phase))} · ${esc(t('moonIn', { sign: signName(m.sign) }))}</b></span>${icons.chevron}</button>
        <h4 class="section-title">${esc(T.comingUp)}</h4>
        <div class="phase-list">${upcomingSky(new Date(), 6).map(skyEventRow).join('')}</div>
      </div>
    </div>`, { cls: 'sky-layer' });
  layer.querySelector('#sky-moon').onclick = () => { haptic('light'); closeLayer(layer, { silent: true }); openMoon(); };
}
