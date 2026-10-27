// ══ Вкладка «Розклади» + сам розклад + щоденник розкладів ═══════════════════
import { t, getLang, locale } from '../i18n.js';
import { state, track, onStateChange } from '../state.js';
import { api } from '../api.js';
import { haptic, share, storage } from '../platform.js';
import { pushScreen, openSheet, closeLayer, esc, spinner, toast, typeText, delay } from '../ui.js';
import { cardBack, sparkle, icons } from '../art.js';
import { play } from '../sound.js';
import { showPaywall } from './paywall.js';
import { cardName, cardKeywords, cardImg, openCardDetail } from './library.js';
import { userAstro } from './today.js';
import { loadDetails, overallPicture, overallHtml, cardBlocksHtml, yesNo, cardDetail, tx } from '../reading.js';
import { journalHtml, wireJournal, moodBadge } from '../journal.js';
import { readingSkyLines } from '../sky.js';
import { readingDone, afterReadingClosed } from '../moments.js';
import { CATEGORIES, CATALOG, spreadCat } from '../catalog.js';

const P = (en, ru, ua) => ({ en, ru, ua });
const CLASSICS = [
  { id: 'yes_no', count: 1, free: true, rows: [1], title: 'spYnTitle', desc: 'spYnDesc', long: 'spYnLong', q: ['spYnQ1', 'spYnQ2', 'spYnQ3'],
    positions: [P('Answer', 'Ответ', 'Відповідь')] },
  { id: 'three_card', count: 3, rows: [3], title: 'sp3Title', desc: 'sp3Desc', long: 'sp3Long', q: ['sp3Q1', 'sp3Q2', 'sp3Q3'],
    positions: [P('Past', 'Прошлое', 'Минуле'), P('Present', 'Настоящее', 'Теперішнє'), P('Future', 'Будущее', 'Майбутнє')] },
  { id: 'love', count: 4, rows: [2, 2], title: 'spLoveTitle', desc: 'spLoveDesc', long: 'spLoveLong', q: ['spLoveQ1', 'spLoveQ2', 'spLoveQ3'],
    positions: [P('Your feelings', 'Ваше состояние', 'Ваш стан'), P('Partner', 'Партнёр', 'Партнер'), P('Connection', 'Связь', 'Зв’язок'), P('Potential', 'Потенциал', 'Потенціал')] },
  { id: 'month', count: 4, rows: [2, 2], title: 'spMonthTitle', desc: 'spMonthDesc', long: 'spMonthLong', q: ['spMonthQ1', 'spMonthQ2'],
    positions: [P('Overall energy', 'Общая энергия', 'Загальна енергія'), P('Main challenge', 'Вызов месяца', 'Виклик місяця'), P('Opportunities', 'Возможности', 'Можливості'), P('Outcome', 'Итог', 'Підсумок')] },
  { id: 'year', count: 6, rows: [3, 3], title: 'spYearTitle', desc: 'spYearDesc', long: 'spYearLong', q: ['spYearQ1', 'spYearQ2'],
    positions: [P('Theme of the year', 'Тема года', 'Тема року'), P('Challenges', 'Вызовы', 'Виклики'), P('Opportunities', 'Возможности', 'Можливості'),
      P('Love', 'Любовь', 'Кохання'), P('Career', 'Карьера', 'Кар’єра'), P('Outcome', 'Результат', 'Результат')] },
  { id: 'celtic', count: 10, title: 'spCelticTitle', desc: 'spCelticDesc', long: 'spCelticLong', q: ['spCelticQ1', 'spCelticQ2'],
    positions: [P('Situation', 'Ситуация', 'Ситуація'), P('Challenge', 'Вызов', 'Виклик'), P('Foundation', 'Корень', 'Корінь'),
      P('Recent past', 'Недавнее прошлое', 'Нещодавнє минуле'), P('Crown', 'Цель', 'Мета'), P('Near future', 'Ближайшее будущее', 'Найближче майбутнє'),
      P('Self', 'Ты', 'Ти'), P('Environment', 'Окружение', 'Оточення'), P('Hopes and fears', 'Надежды и страхи', 'Надії та страхи'), P('Final outcome', 'Итог', 'Підсумок')] },
];

// Тематичні розклади з каталогу (data/spreads.json) — у тому ж форматі, що й класичні
export const SPREADS = [...CLASSICS, ...CATALOG.map(c => ({ ...c, count: c.positions.length, free: !!c.free, catalog: true }))];

// Назва / опис / підказки-питання: у класичних — ключі i18n, у каталозі — тексти {en,ru,ua}
const loc = o => o[getLang()] || o.en;
export const spTitle = sp => sp.catalog ? loc(sp.name) : t(sp.title);
const spLong = sp => sp.catalog ? loc(sp.desc) : t(sp.long);
const spChips = sp => sp.catalog ? loc(sp.q) : sp.q.map(k => t(k));

// Категорії: спершу ті, що людина обрала в онбордингу, але видно всі — і тим, хто нічого не обрав
const FOCUS_CAT = { love: 'love', career: 'money', growth: 'self', balance: 'moon', family: 'family', spirit: 'destiny' };
function orderedCats() {
  const f = (state.focus || []).map(k => FOCUS_CAT[k]).filter(Boolean);
  return [...CATEGORIES].sort((a, b) => f.includes(b.id) - f.includes(a.id));
}
const inCat = id => SPREADS.filter(sp => spreadCat(sp.id) === id);

// Закладки — на пристрої
const FAV_KEY = 'lt_fav_spreads';
const favs = () => { try { return JSON.parse(storage.get(FAV_KEY) || '[]'); } catch (_) { return []; } };
function toggleFav(id) {
  const f = favs();
  const on = !f.includes(id);
  storage.set(FAV_KEY, JSON.stringify(on ? [id, ...f] : f.filter(x => x !== id)));
  return on;
}

// Схема розкладу на плитці: ряди «карт», як вони ляжуть на стіл
function shapeHtml(sp) {
  if (sp.id === 'celtic') return `<span class="sp-shape celtic">${Array.from({ length: 10 }, (_, i) => `<i style="grid-area:c${i + 1}"></i>`).join('')}</span>`;
  const rows = sp.rows || [sp.count];
  return `<span class="sp-shape" style="--r:${rows.length}">${rows.map(n => `<span>${'<i></i>'.repeat(n)}</span>`).join('')}</span>`;
}

export function spreadTileHtml(sp) {
  const on = favs().includes(sp.id);
  return `<div class="sp-tile cat-${spreadCat(sp.id)}" role="button" tabindex="0" data-id="${sp.id}">
      ${shapeHtml(sp)}
      <b class="serif">${esc(spTitle(sp))}</b>
      <small>${t('nCards', { n: sp.count })}${sp.free ? ` · <em class="free-tag">${t('freeTag')}</em>` : ''}</small>
      ${state.isPremium || sp.free ? '' : '<span class="sc-lock">PRO</span>'}
      <button class="sp-fav${on ? ' on' : ''}" data-fav="${sp.id}" aria-label="${t('spSaved')}">${on ? icons.bookmarkOn : icons.bookmark}</button>
    </div>`;
}

// Клік по плитці відкриває розклад, по закладці — зберігає (onFav — перемалювати список «Збережені»)
export function wireSpreadTiles(box, onFav) {
  box.querySelectorAll('.sp-tile').forEach(el => {
    const open = () => { haptic('light'); openSpread(spreadById(el.dataset.id)); };
    el.onclick = open;
    el.onkeydown = e => { if (e.key === 'Enter') open(); };
  });
  box.querySelectorAll('.sp-fav').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const on = toggleFav(b.dataset.fav);
    haptic(on ? 'success' : 'light');
    track('spread_fav', `${b.dataset.fav}:${on ? 1 : 0}`);
    document.querySelectorAll(`.sp-fav[data-fav="${b.dataset.fav}"]`).forEach(x => { x.classList.toggle('on', on); x.innerHTML = on ? icons.bookmarkOn : icons.bookmark; });
    toast(t(on ? 'spSavedOn' : 'spSavedOff'));
    onFav?.();
  });
}

let root;
let filter = 'all';

export function mountSpreads(el) {
  root = el;
  render();
  onStateChange(w => { if (['premium', 'lang', 'cardback'].includes(w)) render(); });
}

function heroYesNo() {
  const sp = spreadById('yes_no');
  return `<button class="spread-card sc-yes_no" data-id="yes_no">
      <span class="sc-fan n1"><span class="sc-c" style="--k:0;--n:1">${cardBack({ glow: false })}</span></span>
      <span class="sc-text">
        <span class="sc-title serif">${t(sp.title)}</span>
        <span class="sc-desc">${t(sp.desc)}</span>
        <span class="sc-meta"><b class="free-tag">${t('freeTag')}</b><span>· ${t('nCards', { n: 1 })}</span><span>· ${sparkle()} AI</span></span>
      </span>
    </button>`;
}

function render() {
  const L = getLang();
  const grid = list => `<div class="sp-grid">${list.map(spreadTileHtml).join('')}</div>`;
  let body;
  if (filter === 'saved') {
    const saved = favs().map(spreadById).filter(Boolean);
    body = saved.length ? grid(saved) : `<div class="sp-empty">${icons.bookmark}<p>${t('spSavedEmpty')}</p></div>`;
  } else if (filter !== 'all') {
    body = grid(inCat(filter));
  } else {
    body = heroYesNo() + orderedCats().map(c => {
      const list = inCat(c.id).filter(sp => sp.id !== 'yes_no');
      return list.length ? `<section class="sp-sec cat-${c.id}">
          <h3 class="sp-sec-h"><span class="sp-sec-ico">${icons[c.icon] || ''}</span>${esc(c[L] || c.en)}<small>${list.length}</small></h3>
          ${grid(list)}
        </section>` : '';
    }).join('');
  }
  const chip = (id, label, ico = '') => `<button class="sp-chip${filter === id ? ' on' : ''} cat-${id}" data-f="${id}">${ico}${esc(label)}</button>`;
  root.innerHTML = `<div class="scroll tab-scroll">
      <header class="tab-head row">
        <div><h1 class="serif">${t('spreadsTitle')}</h1><p>${t('spreadsSub')}</p></div>
        <button class="icon-btn soft" id="sp-history" aria-label="${t('journal')}">${icons.history}</button>
      </header>
      <div class="sp-cats">${chip('all', t('spAll'))}${chip('saved', t('spSaved'), icons.bookmark)}${orderedCats().map(c => chip(c.id, c[L] || c.en, icons[c.icon] || '')).join('')}</div>
      <div class="sp-body">${body}</div>
      <p class="disclaimer">${t('disclaimer')}</p>
    </div>`;
  root.querySelector('#sp-history').onclick = () => { haptic('light'); openHistory(); };
  root.querySelector('.sc-yes_no')?.addEventListener('click', () => { haptic('light'); openSpread(spreadById('yes_no')); });
  root.querySelectorAll('.sp-chip').forEach(b => b.onclick = () => {
    haptic('select');
    filter = b.dataset.f;
    track('spread_filter', filter);
    const x = root.querySelector('.scroll').scrollTop;
    render();
    const sc = root.querySelector('.scroll');
    sc.scrollTop = Math.min(x, root.querySelector('.sp-cats').offsetTop - 8);
    root.querySelector(`.sp-chip[data-f="${filter}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  });
  wireSpreadTiles(root, () => { if (filter === 'saved') render(); });
}

export function spreadById(id) { return SPREADS.find(s => s.id === id); }

export function openSpread(spread, prefill = '') {
  track(spread.id === 'yes_no' ? 'yesno_open' : 'spread_open', spread.id);
  if (!state.isPremium && !spread.free) { showPaywall({ source: `spread_${spread.id}` }); return; }
  const layer = openSheet(`<div class="ask">
      <h2 class="serif">${esc(spTitle(spread))}</h2>
      <p class="ask-long">${esc(spLong(spread))}</p>
      ${spread.count > 1 ? `<div class="ask-pos">${spread.positions.map((p, i) => `<span><b>${i + 1}</b>${esc(p[getLang()] || p.en)}</span>`).join('')}</div>` : ''}
      <p class="muted">${t(spread.id === 'yes_no' ? 'ynAskSub' : 'askQuestionSub')}</p>
      <textarea id="q-input" class="field area" maxlength="300" rows="3" placeholder="${t(spread.id === 'yes_no' ? 'ynPlaceholder' : 'questionPlaceholder')}">${esc(prefill)}</textarea>
      <div class="chips wrap">${spChips(spread).map(q => `<button class="chip btn-chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <button class="btn-primary" id="q-go"><span>${t(spread.count === 1 ? 'drawCard' : 'drawCards')}</span>${icons.chevron}</button>
      <button class="btn-text" id="q-skip">${t('skipQuestion')}</button>
    </div>`, { tall: false, cls: 'ask-layer' });
  const input = layer.querySelector('#q-input');
  layer.querySelectorAll('.btn-chip').forEach(b => b.onclick = () => { haptic('select'); input.value = b.dataset.q; });
  const go = q => { closeLayer(layer, { silent: true }); startReading(spread, q); };
  layer.querySelector('#q-go').onclick = () => go(input.value.trim());
  layer.querySelector('#q-skip').onclick = () => go('');
}

async function startReading(spread, question) {
  const L = getLang();
  const celtic = spread.id === 'celtic';
  const rows = spread.catalog ? spread.rows : null;
  const numbered = celtic || (rows && spread.count >= 5);
  const slot = i => `
        <div class="rd-slot" style="--i:${i}${celtic ? `;grid-area:c${i + 1}` : ''}">
          <div class="rd-card"><div class="flip"><div class="face back">${cardBack()}</div><div class="face front"></div></div></div>
          ${numbered ? `<span class="rd-num">${i + 1}</span>${rows ? '<div class="rd-name"></div>' : ''}` : '<div class="rd-pos"></div><div class="rd-name"></div>'}
        </div>`;
  let k = 0;
  const gridHtml = rows
    ? `<div class="rd-grid rows" id="rd-grid" style="--cols:${Math.max(...rows)}">${rows.map(n => `<div class="rd-line">${Array.from({ length: n }, () => slot(k++)).join('')}</div>`).join('')}</div>`
    : `<div class="rd-grid n${spread.count}${celtic ? ' celtic' : ''}" id="rd-grid">${Array.from({ length: spread.count }, (_, i) => slot(i)).join('')}</div>`;
  const legend = rows && numbered
    ? `<ol class="rd-legend">${spread.positions.map(p => `<li>${esc(p[getLang()] || p.en)}</li>`).join('')}</ol>` : '';
  const layer = pushScreen(`<div class="reading">
      ${question ? `<div class="q-badge">“${esc(question)}”</div>` : ''}
      <p class="reading-hint" id="rd-hint">${t('shuffling')}</p>
      ${gridHtml}
      ${celtic ? `<p class="muted center celtic-note">${t('celticTapNote')}</p>` : legend}
      <div class="rd-result" id="rd-result"></div>
    </div>`, { title: esc(spTitle(spread)), cls: 'reading-layer', onClose: () => { if (layer?.dataset.done) afterReadingClosed(); } });

  const grid = layer.querySelector('#rd-grid');
  grid.classList.add('dealing');
  play('shuffle');
  // вібро-тік на кожну карту, що «падає» на стіл
  for (let i = 0; i < spread.count; i++) setTimeout(() => haptic('select'), 110 * i + 80);
  const [res] = await Promise.all([
    api('POST', `/readings/${state.userId}`, { spreadType: spread.id, lang: L, fresh: true }),
    delay(1100),
  ]);
  grid.classList.remove('dealing');
  const hint = layer.querySelector('#rd-hint');

  if (res.error === 'premium_required') { closeLayer(layer, { silent: true }); showPaywall({ source: `spread_${spread.id}` }); return; }
  if (!res.ok) { hint.textContent = t(res.error === 'offline' ? 'errOffline' : 'errGeneric'); return; }

  const reading = res.reading;
  loadDetails();
  hint.textContent = t(spread.count === 1 ? 'tapCard' : 'tapEachCard');
  let revealed = 0;
  layer.querySelectorAll('.rd-slot').forEach((slot, i) => {
    const card = reading.cards[i];
    const pos = slot.querySelector('.rd-pos');
    if (pos) pos.textContent = posLabel(reading.positions?.[i]);
    slot.querySelector('.face.front').innerHTML = `<div class="card-frame${card.isReversed ? ' rev' : ''}">${cardImg(card)}</div>`;
    const c = slot.querySelector('.rd-card');
    c.onclick = () => {
      if (c.classList.contains('flipped')) { openCardDetail(card); return; }
      haptic('medium');
      play('flip');
      c.classList.add('flipped');
      const nm = slot.querySelector('.rd-name');
      if (nm) nm.textContent = cardName(card) + (card.isReversed ? ` · ${t('reversedShort')}` : '');
      if (++revealed === reading.cards.length) {
        setTimeout(() => { haptic('heavy'); play('reveal'); }, 250);
        setTimeout(() => haptic('success'), 650);
        showResult(layer, reading, question, spread);
      }
    };
  });
}

// Назва розкладу в щоденнику — як на екрані розкладів (сервер шле назви старого бота з емодзі)
function spreadTitle(r) {
  if (r.spreadType === 'daily') return t('cardOfDay');
  const sp = spreadById(r.spreadType);
  return sp ? spTitle(sp) : posLabel(r.spreadName);
}

function posLabel(p) {
  if (!p) return '';
  return typeof p === 'object' ? (p[getLang()] || p.en || p.ru) : p;
}

// Великий результат «Так / Ні / Можливо»
function yesNoHero(card, date) {
  const T = tx();
  const yn = yesNo(card);
  const sky = readingSkyLines(date ? new Date(date) : new Date());
  return `<div class="yn-hero yn-${yn}">
    <small>${t('theAnswer')}</small>
    <b class="serif">${T.yn[yn]}</b>
    <p>${esc(t('ynReason_' + yn, { card: cardName(card) }))}</p>
    ${sky.map(l => `<p class="yn-sky">℞ ${esc(l)}</p>`).join('')}
  </div>`;
}

async function showResult(layer, reading, question, spread) {
  const L = getLang();
  layer.dataset.done = '1';
  readingDone();
  layer.querySelector('#rd-hint').textContent = t('readingReady');
  const box = layer.querySelector('#rd-result');
  await loadDetails();
  const helpers = { name: cardName, keywords: c => cardKeywords(c), img: cardImg };
  const isYn = reading.spreadType === 'yes_no';
  const overall = reading.cards.length > 1 ? overallPicture(reading.cards, reading.positions, { ...helpers, spreadId: reading.spreadType, date: reading.createdAt }) : null;
  box.innerHTML = `
    ${isYn ? yesNoHero(reading.cards[0], reading.createdAt) : ''}
    <h3 class="section-title">${t(reading.cards.length > 1 ? 'yourCards' : 'yourCard')}</h3>
    ${cardBlocksHtml(reading.cards, reading.positions, { spreadId: reading.spreadType, ...helpers })}
    ${overall ? overallHtml(overall) : ''}
    <div class="ai-box hidden" id="rd-ai"><div class="ai-box-head">${sparkle()}<span>${t('aiReadingPersonal')}</span></div>${spinner(t('aiThinking'))}</div>
    ${journalHtml(reading)}
    <div class="ds-actions"><button class="round-btn" id="rd-share">${icons.share}</button>
      <button class="btn-ghost" id="rd-again">${t('newReading')}</button></div>`;
  box.querySelectorAll('.rb-head').forEach(b => b.onclick = () => openCardDetail(reading.cards[Number(b.dataset.i)]));
  wireJournal(box, reading);
  box.querySelector('#rd-share').onclick = async () => {
    const names = reading.cards.map(cardName).join(', ');
    const ok = await share({ title: t('appName'), text: t('shareReading', { cards: names }) });
    if (ok === 'copied') toast(t('copied'));
  };
  box.querySelector('#rd-again').onclick = () => { closeLayer(layer, { silent: true }); openSpread(spread || spreadById(reading.spreadType)); };
  setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);

  // Персональне AI-тлумачення — доповнення до «Загальної картини», якщо AI доступний
  const aiBox = box.querySelector('#rd-ai');
  aiBox.classList.remove('hidden');
  const ai = await api('POST', '/ai/interpret', {
    cards: reading.cards, positions: reading.positions, spreadName: reading.spreadName,
    question, userAstro: userAstro(), lang: L, userId: state.userId,
  });
  if (ai.ok && ai.interpretation) {
    aiBox.innerHTML = `<div class="ai-box-head">${sparkle()}<span>${t('aiReadingPersonal')}</span></div><p class="ai-text"></p>`;
    typeText(aiBox.querySelector('.ai-text'), ai.interpretation);
    haptic('success');
  } else {
    aiBox.remove();
  }
}

// ── Щоденник розкладів (історія + нотатки) ───────────────────────────────────
export async function openHistory() {
  const layer = pushScreen(`<div id="hist"><div class="hist-list">${'<div class="skel skel-row"></div>'.repeat(5)}</div></div>`, { title: t('journal') });
  const res = await api('GET', `/readings/${state.userId}?limit=50`);
  const box = layer.querySelector('#hist');
  const items = res.ok ? res.readings || [] : [];
  if (!items.length) {
    box.innerHTML = `<div class="empty">${cardBack()}<h3 class="serif">${t('historyEmpty')}</h3><p class="muted">${t('historyEmptySub')}</p></div>`;
    return;
  }
  const draw = () => {
    box.innerHTML = `<p class="muted jr-hint">${t('journalHint')}</p><div class="hist-list">${items.map((r, i) => `
      <button class="hist-item" data-i="${i}">
        <span class="hist-thumbs">${r.cards.slice(0, 4).map(c => `<span class="${c.isReversed ? 'rev' : ''}">${cardImg(c)}</span>`).join('')}</span>
        <span class="hist-text"><b>${moodBadge(r.mood)}${esc(spreadTitle(r))}</b>
          <small>${esc(new Date(r.createdAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}
            ${r.outcome ? ` · <em class="oc-${r.outcome}">${t('outcome_' + r.outcome)}</em>` : ''}</small>
          <span>${esc(r.note ? r.note : r.cards.map(cardName).join(' · '))}</span></span>
      </button>`).join('')}</div>`;
    box.querySelectorAll('.hist-item').forEach(b => b.onclick = () => openJournalEntry(items[Number(b.dataset.i)], draw));
  };
  draw();
}

async function openJournalEntry(r, onChange) {
  await loadDetails();
  const helpers = { name: cardName, keywords: c => cardKeywords(c), img: cardImg };
  const l2 = pushScreen(`
    ${r.spreadType === 'yes_no' ? yesNoHero(r.cards[0], r.createdAt) : ''}
    ${cardBlocksHtml(r.cards, r.positions, { spreadId: r.spreadType, ...helpers })}
    ${r.cards.length > 1 ? overallHtml(overallPicture(r.cards, r.positions, { ...helpers, spreadId: r.spreadType, date: r.createdAt })) : ''}
    ${journalHtml(r, { withOutcome: true })}`,
    { title: esc(spreadTitle(r)) });
  l2.querySelectorAll('.rb-head').forEach(x => x.onclick = () => openCardDetail(r.cards[Number(x.dataset.i)]));
  wireJournal(l2, r, onChange);
}
