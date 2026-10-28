// ══ Вкладка «Запитати»: AI-Оракул ═══════════════════════════════════════════
import { t, getLang } from '../i18n.js';
import { state, track, onStateChange, loadCards } from '../state.js';
import { api } from '../api.js';
import { haptic, storage } from '../platform.js';
import { esc, typeText, openSheet, closeLayer, toast } from '../ui.js';
import { sparkle, starsField, icons } from '../art.js';
import { showPaywall } from './paywall.js';
import { userAstro } from './today.js';
import { cardImg, cardName, openCardDetail } from './library.js';

let root, history = [], busy = false;
const KEY = () => `lunara_chat_${state.userId}`;

export function mountOracle(el) {
  root = el;
  try { history = JSON.parse(storage.get(KEY()) || '[]'); } catch (_) { history = []; }
  render();
  // Карти потрібні, щоб показати в історії, яку карту витягнув Оракул
  if (history.some(m => m.card) && !state.cards) loadCards().then(render);
  onStateChange(w => { if (w === 'lang') render(); });
}

// Підказки: спершу під інтереси з онбордингу, далі — загальні
function suggestions() {
  const own = (state.focus || []).map(f => 'oqf_' + f).filter(k => t(k) !== k).slice(0, 2);
  return [...own, 'oq1', 'oq2', 'oq3', 'oq4'].slice(0, 4);
}

function render() {
  const name = esc(state.user?.firstName || '');
  root.innerHTML = `<div class="oracle-screen">
      ${starsField(36, 31)}
      <header class="oracle-head">
        <div class="orb-avatar"><i></i></div>
        <div class="oh-who"><h1 class="serif">${t('oracleName')}</h1><p><span class="online"></span>${t('oracleStatus')}</p></div>
        ${history.length ? `<button class="icon-btn soft" id="chat-clear" aria-label="${t('clearChat')}">${icons.trash}</button>` : ''}
      </header>
      <div class="chat scroll" id="chat">
        <div class="msg oracle intro">${t('oracleIntro', { name })}</div>
        <div class="suggest" id="suggest">${suggestions().map(k =>
          `<button class="chip btn-chip" data-q="${esc(t(k))}">${t(k)}</button>`).join('')}</div>
        ${history.map(m => bubble(m.role === 'user' ? 'user' : 'oracle', m.content, m.card)).join('')}
      </div>
      <form class="composer" id="composer">
        <textarea id="chat-in" rows="1" maxlength="400" placeholder="${t('oraclePlaceholder')}"></textarea>
        <button class="send" id="chat-send" aria-label="${t('send')}">${icons.send}</button>
      </form>
    </div>`;
  const input = root.querySelector('#chat-in');
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  root.querySelector('#composer').onsubmit = e => { e.preventDefault(); send(); };
  root.querySelectorAll('#suggest .btn-chip').forEach(b => b.onclick = () => {
    haptic('select'); input.value = b.dataset.q; send();
  });
  if (history.length) root.querySelector('#suggest').classList.add('hide');
  root.querySelector('#chat-clear')?.addEventListener('click', confirmClear);
  root.querySelector('#chat').addEventListener('click', e => {
    const b = e.target.closest('.msg-card');
    const c = b && state.cards?.[Number(b.dataset.id)];
    if (c) { haptic('light'); openCardDetail({ ...c, isReversed: b.dataset.rev === '1' }); }
  });
  scrollDown();
}

function bubble(kind, text, card) {
  return `<div class="msg ${kind}">${cardChip(card)}${kind === 'oracle' ? `<span class="msg-ic">${sparkle()}</span>` : ''}${esc(text).replace(/\n/g, '<br>')}</div>`;
}

// Карта, через яку відповів Оракул (сервер тягне її на кожне питання)
function cardChip(card) {
  const c = card && state.cards?.[card.id];
  if (!c) return '';
  return `<button class="msg-card" data-id="${c.id}" data-rev="${card.isReversed ? 1 : 0}">
      <span class="mc-img${card.isReversed ? ' rev' : ''}">${cardImg(c)}</span>
      <span><small>${t('oracleDrew')}</small><b class="serif">${esc(cardName(c))}${card.isReversed ? ` · ${t('reversedShort')}` : ''}</b></span>
    </button>`;
}
// Показуємо карту лише тоді, коли Оракул справді відповів через неї (а не на сторонню тему)
const mentions = (reply, c) => reply.toLowerCase().includes(c.name.replace(/^The /, '').toLowerCase());

function scrollDown() {
  const c = root.querySelector('#chat');
  requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
}

async function send() {
  if (busy) return;
  const input = root.querySelector('#chat-in');
  const text = input.value.trim();
  if (!text) return;
  haptic('light');
  if (!state.isPremium) { showPaywall({ source: 'oracle' }); return; }

  busy = true;
  input.value = '';
  input.style.height = 'auto';
  root.querySelector('#suggest')?.classList.add('hide');
  const chat = root.querySelector('#chat');
  chat.insertAdjacentHTML('beforeend', bubble('user', text));
  chat.insertAdjacentHTML('beforeend', `<div class="msg oracle typing" id="typing"><i></i><i></i><i></i></div>`);
  scrollDown();
  history.push({ role: 'user', content: text });
  track('oracle_send');

  const res = await api('POST', '/ai/chat', {
    userId: state.userId, messages: history.slice(-10), userAstro: userAstro(), lang: getLang(),
  });
  root.querySelector('#typing')?.remove();

  if (res.ok && res.reply) {
    const cards = res.card ? await loadCards() : [];
    const drawn = res.card && cards[res.card.id] && mentions(res.reply, cards[res.card.id])
      ? { id: res.card.id, isReversed: !!res.card.isReversed } : null;
    history.push({ role: 'assistant', content: res.reply, ...(drawn ? { card: drawn } : {}) });
    storage.set(KEY(), JSON.stringify(history.slice(-30)));
    addClearButton();
    chat.insertAdjacentHTML('beforeend', `<div class="msg oracle">${cardChip(drawn)}<span class="msg-ic">${sparkle()}</span><span class="txt"></span></div>`);
    const node = chat.lastElementChild.querySelector('.txt');
    await typeText(node, res.reply, { speed: 10 });
    haptic('success');
  } else {
    history.pop();
    if (res.error === 'premium_required') showPaywall({ source: 'oracle' });
    chat.insertAdjacentHTML('beforeend', `<div class="msg system">${t({ rate_limit: 'oracleRateLimit', daily_limit: 'aiDailyLimit', ai_busy: 'aiBusy', offline: 'errOffline' }[res.error] || 'oracleError')}</div>`);
  }
  scrollDown();
  busy = false;
}

// Кнопка «Очистити чат» з’являється після першої відповіді (без перемальовування екрана)
function addClearButton() {
  if (root.querySelector('#chat-clear')) return;
  root.querySelector('.oracle-head').insertAdjacentHTML('beforeend',
    `<button class="icon-btn soft" id="chat-clear" aria-label="${t('clearChat')}">${icons.trash}</button>`);
  root.querySelector('#chat-clear').addEventListener('click', confirmClear);
}

function confirmClear() {
  haptic('light');
  const layer = openSheet(`<div class="notice">
      <div class="notice-icon danger">${icons.trash}</div>
      <h3 class="serif">${t('clearChat')}</h3>
      <p>${t('clearChatConfirm')}</p>
      <button class="btn-danger" id="cc-yes">${t('clearChat')}</button>
      <button class="btn-text" data-close>${t('cancel')}</button>
    </div>`, { tall: false });
  layer.querySelector('#cc-yes').onclick = () => {
    haptic('medium');
    closeLayer(layer);
    clearOracleHistory();
    toast(t('chatCleared'));
  };
}

export function clearOracleHistory() {
  history = [];
  storage.remove(KEY());
  if (root) render();
}
