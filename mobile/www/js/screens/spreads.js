// ══ Вкладка «Розклади» + сам розклад + історія ══════════════════════════════
import { t, getLang, locale } from '../i18n.js';
import { state, track, onStateChange } from '../state.js';
import { api } from '../api.js';
import { haptic, share } from '../platform.js';
import { pushScreen, openSheet, closeLayer, esc, spinner, toast, typeText, delay } from '../ui.js';
import { cardBack, sparkle, icons } from '../art.js';
import { showPaywall } from './paywall.js';
import { cardName, cardKeywords, cardImg, openCardDetail } from './library.js';
import { userAstro } from './today.js';
import { loadDetails, overallPicture, overallHtml, cardBlocksHtml } from '../reading.js';

const P = (en, ru, ua) => ({ en, ru, ua });
export const SPREADS = [
  { id: 'three_card', count: 3, title: 'sp3Title', desc: 'sp3Desc', long: 'sp3Long', q: ['sp3Q1', 'sp3Q2', 'sp3Q3'],
    positions: [P('Past', 'Прошлое', 'Минуле'), P('Present', 'Настоящее', 'Теперішнє'), P('Future', 'Будущее', 'Майбутнє')] },
  { id: 'love', count: 4, title: 'spLoveTitle', desc: 'spLoveDesc', long: 'spLoveLong', q: ['spLoveQ1', 'spLoveQ2', 'spLoveQ3'],
    positions: [P('Your state', 'Ваше состояние', 'Ваш стан'), P('Partner', 'Партнёр', 'Партнер'), P('Connection', 'Связь', 'Зв’язок'), P('Potential', 'Потенциал', 'Потенціал')] },
  { id: 'month', count: 4, title: 'spMonthTitle', desc: 'spMonthDesc', long: 'spMonthLong', q: ['spMonthQ1', 'spMonthQ2'],
    positions: [P('General energy', 'Общая энергия', 'Загальна енергія'), P('Challenge', 'Вызов месяца', 'Виклик місяця'), P('Opportunities', 'Возможности', 'Можливості'), P('Outcome', 'Итог', 'Підсумок')] },
  { id: 'year', count: 6, title: 'spYearTitle', desc: 'spYearDesc', long: 'spYearLong', q: ['spYearQ1', 'spYearQ2'],
    positions: [P('Year theme', 'Тема года', 'Тема року'), P('Challenges', 'Вызовы', 'Виклики'), P('Opportunities', 'Возможности', 'Можливості'),
      P('Love', 'Любовь', 'Кохання'), P('Career', 'Карьера', 'Кар’єра'), P('Outcome', 'Результат', 'Результат')] },
];

let root;

export function mountSpreads(el) {
  root = el;
  render();
  onStateChange(w => { if (w === 'premium' || w === 'lang') render(); });
}

function render() {
  root.innerHTML = `<div class="scroll tab-scroll">
      <header class="tab-head row">
        <div><h1 class="serif">${t('spreadsTitle')}</h1><p>${t('spreadsSub')}</p></div>
        <button class="icon-btn soft" id="sp-history" aria-label="${t('history')}">${icons.history}</button>
      </header>
      <div class="spread-list">${SPREADS.map((s, i) => `
        <button class="spread-card sc-${s.id}" data-id="${s.id}" style="--i:${i}">
          <span class="sc-fan n${s.count}">${Array.from({ length: Math.min(s.count, 5) }, (_, k) =>
            `<span class="sc-c" style="--k:${k};--n:${Math.min(s.count, 5)}">${cardBack({ glow: false })}</span>`).join('')}</span>
          <span class="sc-text">
            <span class="sc-title serif">${t(s.title)}</span>
            <span class="sc-desc">${t(s.desc)}</span>
            <span class="sc-pos">${s.positions.map(p => esc(p[getLang()] || p.en)).join(' · ')}</span>
            <span class="sc-meta">${t('nCards', { n: s.count })} · ${sparkle()} AI</span>
          </span>
          ${state.isPremium ? '' : `<span class="sc-lock">PRO</span>`}
        </button>`).join('')}
      </div>
      <p class="disclaimer">${t('disclaimer')}</p>
    </div>`;
  root.querySelector('#sp-history').onclick = () => { haptic('light'); openHistory(); };
  root.querySelectorAll('.spread-card').forEach(b => b.onclick = () => {
    haptic('light');
    openSpread(SPREADS.find(s => s.id === b.dataset.id));
  });
}

export function openSpread(spread) {
  track('spread_open', spread.id);
  if (!state.isPremium) { showPaywall({ source: `spread_${spread.id}` }); return; }
  const layer = openSheet(`<div class="ask">
      <h2 class="serif">${t(spread.title)}</h2>
      <p class="ask-long">${t(spread.long)}</p>
      <div class="ask-pos">${spread.positions.map((p, i) => `<span><b>${i + 1}</b>${esc(p[getLang()] || p.en)}</span>`).join('')}</div>
      <p class="muted">${t('askQuestionSub')}</p>
      <textarea id="q-input" class="field area" maxlength="300" rows="3" placeholder="${t('questionPlaceholder')}"></textarea>
      <div class="chips wrap">${spread.q.map(k => `<button class="chip btn-chip" data-q="${esc(t(k))}">${t(k)}</button>`).join('')}</div>
      <button class="btn-primary" id="q-go"><span>${t('drawCards')}</span>${icons.chevron}</button>
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
  const layer = pushScreen(`<div class="reading">
      ${question ? `<div class="q-badge">“${esc(question)}”</div>` : ''}
      <p class="reading-hint" id="rd-hint">${t('shuffling')}</p>
      <div class="rd-grid n${spread.count}" id="rd-grid">${Array.from({ length: spread.count }, (_, i) => `
        <div class="rd-slot" style="--i:${i}">
          <div class="rd-card"><div class="flip"><div class="face back">${cardBack()}</div><div class="face front"></div></div></div>
          <div class="rd-pos"></div><div class="rd-name"></div>
        </div>`).join('')}
      </div>
      <div class="rd-result" id="rd-result"></div>
    </div>`, { title: t(spread.title), cls: 'reading-layer' });

  const grid = layer.querySelector('#rd-grid');
  grid.classList.add('dealing');
  // вібро-тік на кожну карту, що «падає» на стіл
  for (let i = 0; i < spread.count; i++) setTimeout(() => haptic('select'), 120 * i + 80);
  const [res] = await Promise.all([
    api('POST', `/readings/${state.userId}`, { spreadType: spread.id, lang: L, fresh: true }),
    delay(1100),
  ]);
  grid.classList.remove('dealing');
  const hint = layer.querySelector('#rd-hint');

  if (res.error === 'premium_required') { closeLayer(layer, { silent: true }); showPaywall({ source: `spread_${spread.id}` }); return; }
  if (!res.ok) { hint.textContent = t(res.error === 'offline' ? 'errOffline' : 'errGeneric'); return; }

  const reading = res.reading;
  hint.textContent = t('tapEachCard');
  let revealed = 0;
  layer.querySelectorAll('.rd-slot').forEach((slot, i) => {
    const card = reading.cards[i];
    slot.querySelector('.rd-pos').textContent = posLabel(reading.positions?.[i]);
    slot.querySelector('.face.front').innerHTML = `<div class="card-frame${card.isReversed ? ' rev' : ''}">${cardImg(card)}</div>`;
    const c = slot.querySelector('.rd-card');
    c.onclick = () => {
      if (c.classList.contains('flipped')) { openCardDetail(card); return; }
      haptic('medium');
      c.classList.add('flipped');
      slot.querySelector('.rd-name').textContent = cardName(card) + (card.isReversed ? ` · ${t('reversedShort')}` : '');
      if (++revealed === reading.cards.length) {
        setTimeout(() => haptic('heavy'), 250);
        setTimeout(() => haptic('success'), 650);
        showResult(layer, reading, question);
      }
    };
  });
}

function posLabel(p) {
  if (!p) return '';
  return typeof p === 'object' ? (p[getLang()] || p.en || p.ru) : p;
}

async function showResult(layer, reading, question) {
  const L = getLang();
  layer.querySelector('#rd-hint').textContent = t('readingReady');
  const box = layer.querySelector('#rd-result');
  await loadDetails();
  const helpers = { name: cardName, keywords: c => cardKeywords(c), img: cardImg };
  const overall = overallPicture(reading.cards, reading.positions, { ...helpers, spreadId: reading.spreadType });
  box.innerHTML = `
    <h3 class="section-title">${t('yourCards')}</h3>
    ${cardBlocksHtml(reading.cards, reading.positions, { spreadId: reading.spreadType, ...helpers })}
    ${overallHtml(overall)}
    <div class="ai-box hidden" id="rd-ai"><div class="ai-box-head">${sparkle()}<span>${t('aiReadingPersonal')}</span></div>${spinner(t('aiThinking'))}</div>
    <div class="ds-actions"><button class="round-btn" id="rd-share">${icons.share}</button></div>`;
  box.querySelectorAll('.rb-head').forEach(b => b.onclick = () => openCardDetail(reading.cards[Number(b.dataset.i)]));
  box.querySelector('#rd-share').onclick = async () => {
    const names = reading.cards.map(cardName).join(', ');
    const ok = await share({ title: t('appName'), text: t('shareReading', { cards: names }) });
    if (ok === 'copied') toast(t('copied'));
  };
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

// ── Історія ──────────────────────────────────────────────────────────────────
export async function openHistory() {
  const layer = pushScreen(`<div id="hist">${spinner()}</div>`, { title: t('history') });
  const res = await api('GET', `/readings/${state.userId}`);
  const box = layer.querySelector('#hist');
  const items = res.ok ? res.readings || [] : [];
  if (!items.length) {
    box.innerHTML = `<div class="empty">${cardBack()}<h3 class="serif">${t('historyEmpty')}</h3><p class="muted">${t('historyEmptySub')}</p></div>`;
    return;
  }
  box.innerHTML = `<div class="hist-list">${items.map((r, i) => `
    <button class="hist-item" data-i="${i}">
      <span class="hist-thumbs">${r.cards.slice(0, 4).map(c => `<span class="${c.isReversed ? 'rev' : ''}">${cardImg(c)}</span>`).join('')}</span>
      <span class="hist-text"><b>${esc(posLabel(r.spreadName))}</b>
        <small>${esc(new Date(r.createdAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</small>
        <span>${esc(r.cards.map(cardName).join(' · '))}</span></span>
    </button>`).join('')}</div>`;
  box.querySelectorAll('.hist-item').forEach(b => b.onclick = async () => {
    const r = items[Number(b.dataset.i)];
    await loadDetails();
    const helpers = { name: cardName, keywords: c => cardKeywords(c), img: cardImg };
    const l2 = pushScreen(`${cardBlocksHtml(r.cards, r.positions, { spreadId: r.spreadType, ...helpers })}
      ${r.cards.length > 1 ? overallHtml(overallPicture(r.cards, r.positions, { ...helpers, spreadId: r.spreadType })) : ''}`,
      { title: esc(posLabel(r.spreadName)) });
    l2.querySelectorAll('.rb-head').forEach(x => x.onclick = () => openCardDetail(r.cards[Number(x.dataset.i)]));
  });
}
