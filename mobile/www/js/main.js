// ══ Точка входу ═════════════════════════════════════════════════════════════
import { initShell, purchases, haptic, isTelegram, startParam, platform } from './platform.js';
import { ensureSession, api } from './api.js';
import { state, refreshPremium, track, onStateChange } from './state.js';
import { initLang, t } from './i18n.js';
import { icons } from './art.js';
import { closeAllLayers, toast } from './ui.js';
import { runOnboarding } from './screens/onboarding.js';
import { mountToday } from './screens/today.js';
import { mountSpreads } from './screens/spreads.js';
import { mountOracle } from './screens/oracle.js';
import { mountLibrary } from './screens/library.js';
import { mountLearn } from './screens/learn.js';

const TABS = [
  { id: 'today',   icon: 'today',   label: 'tabToday' },
  { id: 'spreads', icon: 'spreads', label: 'tabSpreads' },
  { id: 'oracle',  icon: 'oracle',  label: 'tabAsk' },
  { id: 'cards',   icon: 'cards',   label: 'tabCards' },
  { id: 'learn',   icon: 'learn',   label: 'tabLearn' },
];
let current = 'today';
const mounted = new Set();

function renderTabbar() {
  const bar = document.getElementById('tabbar');
  bar.innerHTML = TABS.map(tab => `
    <button class="tab-btn${tab.id === current ? ' on' : ''}${tab.id === 'oracle' ? ' center' : ''}" data-tab="${tab.id}">
      <span class="tab-ic">${icons[tab.icon]}</span><span class="tab-label">${t(tab.label)}</span>
    </button>`).join('');
  bar.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => { haptic('select'); goTab(b.dataset.tab); });
}

export function goTab(id) {
  if (!TABS.some(x => x.id === id)) return;
  closeAllLayers();
  current = id;
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('on', s.id === `tab-${id}`));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  const el = document.getElementById(`tab-${id}`);
  if (!mounted.has(id)) {
    mounted.add(id);
    ({ today: () => mountToday(el, { goTab }), spreads: () => mountSpreads(el), oracle: () => mountOracle(el),
       cards: () => mountLibrary(el), learn: () => mountLearn(el) })[id]();
  }
}

function showMain() {
  document.getElementById('boot').classList.add('gone');
  document.getElementById('tabs').classList.remove('hidden');
  document.getElementById('tabbar').classList.remove('hidden');
  renderTabbar();
  goTab('today');
  onStateChange(w => { if (w === 'lang') renderTabbar(); });
}

async function boot() {
  initShell();
  initLang();
  try { state.focus = JSON.parse(localStorage.getItem('lunara_focus') || '[]'); } catch (_) {}

  try {
    state.userId = await ensureSession();
  } catch (_) {
    document.querySelector('#boot .boot-text').textContent = t('errOffline');
    document.getElementById('boot').insertAdjacentHTML('beforeend', `<button class="btn-primary small" onclick="location.reload()"><span>${t('retry')}</span></button>`);
    return;
  }

  track('open_app', startParam || platform);
  purchases.init(state.userId);

  // Демо-посилання ?demo=<код> — PRO на 7 днів на цьому пристрої (для показу спонсорам/друзям)
  const demo = new URLSearchParams(location.search).get('demo');
  if (demo) {
    const r = await api('POST', '/app/demo-unlock', { code: demo });
    const url = new URL(location.href);
    url.searchParams.delete('demo');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (r.ok) { state.isPremium = true; state.premiumExpiry = r.premiumExpiry; toast(t('demoUnlocked')); }
  }

  // ?onb=1 (або start_param=onb у Telegram) — показати онбординг навіть існуючому юзеру (демо)
  const forceOnb = /[?&#]onb=1/.test(location.href) || startParam === 'onb';
  const res = await api('GET', `/users/${state.userId}`);
  if (res.ok && res.user?.birthDate && !forceOnb) {
    state.user = res.user;
    state.isPremium = !!res.user.isPremium || state.isPremium;
    state.freePro = !!res.user.freePro;
    state.premiumExpiry = res.user.premiumExpiry || null;
    refreshPremium();
    await minDelay;
    showMain();
  } else if (res.ok || res._status === 404) {
    await minDelay;
    document.getElementById('boot').classList.add('gone');
    runOnboarding({ onDone: showMain });
  } else {
    document.querySelector('#boot .boot-text').textContent = t('errOffline');
    document.getElementById('boot').insertAdjacentHTML('beforeend', `<button class="btn-primary small" onclick="location.reload()"><span>${t('retry')}</span></button>`);
  }
}

const minDelay = new Promise(r => setTimeout(r, 700));

// Повернулися в застосунок — оновлюємо статус підписки (могли оформити/скасувати)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.user) refreshPremium();
});

boot();
