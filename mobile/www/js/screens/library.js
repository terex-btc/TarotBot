// ══ Вкладка «Карти»: бібліотека значень 78 карт ═════════════════════════════
import { t, getLang } from '../i18n.js';
import { state, track, loadCards, cardSuit, onStateChange } from '../state.js';
import { haptic } from '../platform.js';
import { pushScreen, esc } from '../ui.js';
import { icons } from '../art.js';
import { showPaywall } from './paywall.js';
import { loadDetails, cardDetail, yesNo, tx } from '../reading.js';

export const cardName = c => (getLang() === 'ru' ? c.nameRu : getLang() === 'ua' ? c.nameUa : c.name) || c.name;
export const cardKeywords = (c, reversed = c.isReversed) => {
  const src = reversed ? c.reversed : c.upright;
  return String(src?.[getLang()] || src?.en || '').split(/,\s*/).filter(Boolean).slice(0, 6);
};
export const cardImg = c => `<img src="${esc(c.image)}" alt="${esc(cardName(c))}" loading="lazy" draggable="false">`;

const SUITS = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'];
let root, filter = 'all', query = '';

let langHooked = false;
export function mountLibrary(el) {
  root = el;
  root.innerHTML = `<div class="scroll tab-scroll">
      <header class="tab-head"><h1 class="serif">${t('cardsTitle')}</h1><p>${t('cardsSub')}</p></header>
      <label class="search">${icons.search}<input id="lib-q" type="search" placeholder="${t('searchCards')}" autocomplete="off"></label>
      <div class="filter-rail">${SUITS.map(s => `<button class="filter${s === filter ? ' on' : ''}" data-s="${s}">${t('suit_' + s)}</button>`).join('')}</div>
      <div class="lib-grid" id="lib-grid">${state.cards ? '' : Array.from({ length: 12 }, () =>
        '<span class="lib-card skel-card"><span class="lib-img skel"></span><span class="skel skel-line short"></span></span>').join('')}</div>
    </div>`;
  root.querySelector('#lib-q').oninput = e => { query = e.target.value.trim().toLowerCase(); renderGrid(); };
  root.querySelectorAll('.filter').forEach(b => b.onclick = () => {
    haptic('select');
    filter = b.dataset.s;
    root.querySelectorAll('.filter').forEach(x => x.classList.toggle('on', x === b));
    renderGrid();
  });
  if (state.cards) renderGrid(); else loadCards().then(renderGrid);
  if (!langHooked) { langHooked = true; onStateChange(w => { if (w === 'lang') mountLibrary(el); }); }
}

function renderGrid() {
  const grid = root.querySelector('#lib-grid');
  const cards = (state.cards || []).filter(c =>
    (filter === 'all' || cardSuit(c) === filter) &&
    (!query || [c.name, c.nameRu, c.nameUa].some(n => String(n || '').toLowerCase().includes(query))));
  if (!state.cards) { grid.innerHTML = `<p class="muted center">${t('errOffline')}</p>`; return; }
  if (!cards.length) { grid.innerHTML = `<p class="muted center">${t('nothingFound')}</p>`; return; }
  grid.innerHTML = cards.map(c => `
    <button class="lib-card" data-id="${c.id}">
      <span class="lib-img">${cardImg(c)}</span>
      <span class="lib-name">${esc(cardName(c))}</span>
    </button>`).join('');
  grid.querySelectorAll('.lib-card').forEach(b => b.onclick = () => {
    haptic('light');
    openCardDetail(state.cards.find(c => String(c.id) === b.dataset.id), { fromLibrary: true });
  });
}

export function openCardDetail(card, { fromLibrary = false } = {}) {
  if (!card) return;
  track('card_view', card.id);
  const L = getLang();
  let showRev = !!card.isReversed && !fromLibrary;
  const layer = pushScreen(`<div class="card-detail">
      <div class="cd-stage"><div class="cd-img${showRev ? ' rev' : ''}" id="cd-img">${cardImg(card)}</div></div>
      <div class="cd-arcana">${t('suit_' + cardSuit(card))}</div>
      <h1 class="serif cd-name">${esc(cardName(card))}</h1>
      ${L !== 'en' ? `<div class="cd-en">${esc(card.name)}</div>` : ''}
      <div class="seg" id="cd-seg">
        <button class="${showRev ? '' : 'on'}" data-v="up">${t('upright')}</button>
        <button class="${showRev ? 'on' : ''}" data-v="rev">${t('reversed')}</button>
      </div>
      <div id="cd-body"></div>
    </div>`, { title: '', cls: 'detail-layer' });

  const body = layer.querySelector('#cd-body');
  const renderBody = () => {
    const locked = showRev && !state.isPremium;
    const d = cardDetail(card);
    const T = tx();
    const yn = yesNo({ ...card, isReversed: showRev });
    body.innerHTML = `
      <div class="chips center">${cardKeywords(card, showRev).map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>
      <div class="cd-section${locked ? ' locked' : ''}">
        <h3>${t(showRev ? 'meaningReversed' : 'meaningUpright')}</h3>
        <p>${esc(d ? (showRev ? d.rev : d.up) : (card.description?.[L] || card.description?.en || ''))}</p>
        ${!d && showRev ? `<p>${esc(t('reversedNote', { keywords: cardKeywords(card, true).join(', ').toLowerCase() }))}</p>` : ''}
        ${locked ? `<div class="lock-over"><span>${icons.lock}</span><p>${t('reversedLocked')}</p>
          <button class="btn-primary small" id="cd-unlock"><span>${t('unlockPro')}</span></button></div>` : ''}
      </div>
      ${d ? `<div class="cd-grid${locked ? ' locked' : ''}">
        <div class="cd-section"><h3>${T.lbl.love}</h3><p>${esc(d.love)}</p></div>
        <div class="cd-section"><h3>${T.lbl.work}</h3><p>${esc(d.work)}</p></div>
        <div class="cd-section cd-adv"><h3>${T.lbl.advice}</h3><p class="serif">${esc(d.advice)}</p></div>
        <div class="cd-section cd-yn"><h3>${T.lbl.yn}</h3><b class="yn-${yn}">${T.yn[yn]}</b></div>
      </div>` : ''}`;
    body.querySelector('#cd-unlock')?.addEventListener('click', () => showPaywall({ source: 'card_reversed' }));
    layer.querySelector('#cd-img').classList.toggle('rev', showRev);
  };
  layer.querySelectorAll('#cd-seg button').forEach(b => b.onclick = () => {
    haptic('select');
    showRev = b.dataset.v === 'rev';
    layer.querySelectorAll('#cd-seg button').forEach(x => x.classList.toggle('on', x === b));
    renderBody();
  });
  renderBody();
  loadDetails().then(() => { if (layer.isConnected) renderBody(); });
  const off = onStateChange(w => { if (w === 'premium') renderBody(); });
  layer.addEventListener('transitionend', () => { if (!layer.isConnected) off(); });
}
