// ══ Вкладка «Я»: профіль, нумерологія, сумісність, налаштування ═════════════
import { t, getLang, setLang, locale } from '../i18n.js';
import { state, emit, onStateChange, track } from '../state.js';
import { api, resetSession } from '../api.js';
import { haptic, isNative, notifications, purchases, openUrl, legalUrl, storage, platform } from '../platform.js';
import { CONFIG } from '../config.js';
import { pushScreen, openSheet, closeLayer, esc, toast } from '../ui.js';
import { zodiacGlyph, moonSvg, icons, sparkle, cardBack, CARD_BACKS, currentBack } from '../art.js';
import { soundOn, setSound, play } from '../sound.js';
import { zodiacOf, lifePath, personalYear, compatibility } from '../astro.js';
import { showPaywall, restorePurchases } from './paywall.js';
import { openHistory } from './spreads.js';
import { fmtTime } from './onboarding.js';
import { dateWheel } from '../datewheel.js';

let root = null, layerEl = null, unsub = null;

// Профіль відкривається шаром з аватарки / шестерні на головній (як у референсі — без окремого таба)
export function openMe() {
  if (layerEl?.isConnected) return;
  layerEl = pushScreen('<div id="me-root"></div>', {
    title: t('profile'),
    onClose: () => { unsub?.(); unsub = null; root = null; layerEl = null; },
  });
  root = layerEl.querySelector('#me-root');
  render();
  unsub = onStateChange(w => { if (root && ['premium', 'user', 'lang'].includes(w)) render(); });
}

function render() {
  const u = state.user;
  if (!u) return;
  const L = getLang();
  const z = zodiacOf(u.birthDate);
  const lp = lifePath(u.birthDate);
  const py = personalYear(u.birthDate);
  const birth = new Date(`${u.birthDate}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const reminderOn = storage.get('lunara_reminder') === '1';

  layerEl.querySelector('.push-title').textContent = t('profile');
  root.innerHTML = `<div class="me-inner">
    <header class="me-head">
      <div class="me-avatar">${zodiacGlyph(z.key, { stroke: 6 })}</div>
      <h1 class="serif">${esc(u.firstName || '')}</h1>
      <p>${z.name[L]} · ${esc(birth)}</p>
      <button class="btn-ghost small" id="me-edit">${t('editProfile')}</button>
    </header>

    ${state.isPremium ? `
      <div class="pro-card on">
        <div class="pro-card-top"><span class="pro-pill on">PRO</span><b>${t('proActive')}</b></div>
        ${state.freePro ? `<p>${t('freeProNote')}</p><button class="btn-ghost small" id="me-pw-preview">${t('seePaywall')}</button>` : ''}
        ${!state.freePro && state.premiumExpiry ? `<p>${t('proUntil', { date: new Date(state.premiumExpiry).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>` : ''}
        ${isNative ? `<button class="btn-ghost small" id="me-manage">${t('manageSub')}</button>` : ''}
      </div>` : `
      <button class="pro-card" id="me-upgrade">
        <div class="pro-card-top"><span class="pro-pill">PRO</span><b>${t('upgradeTitle')}</b></div>
        <p>${t('upgradeSub')}</p>
        <span class="btn-primary small"><span>${t('tryFree')}</span></span>
      </button>`}

    <h3 class="section-title">${t('yourChart')}</h3>
    <div class="chart-grid">
      <div class="chart-item"><span class="ci-glyph">${zodiacGlyph(z.key, { stroke: 7 })}</span><small>${t('sunSign')}</small><b>${z.name[L]}</b><span>${t('element_' + z.element)} · ${t('planet_' + z.ruler)}</span></div>
      <div class="chart-item"><span class="ci-num serif">${lp}</span><small>${t('lifePath')}</small><b>${t('lp_' + lp + '_title')}</b></div>
    </div>
    <div class="info-card">
      <h4>${t('lifePath')} ${lp} · ${t('lp_' + lp + '_title')}</h4>
      <p>${t('lp_' + lp + '_text')}</p>
    </div>
    <div class="info-card${state.isPremium ? '' : ' locked'}" id="me-py">
      <h4>${t('personalYear')} ${py}</h4>
      <p>${t('py_' + py)}</p>
      ${state.isPremium ? '' : `<div class="lock-over"><span>${icons.lock}</span><button class="btn-primary small" id="me-py-unlock"><span>${t('unlockPro')}</span></button></div>`}
    </div>

    <div class="menu">
      <button class="menu-item" id="me-compat">${icons.heart}<span>${t('compatTitle')}</span>${icons.chevron}</button>
      <button class="menu-item" id="me-history">${icons.history}<span>${t('journal')}<small>${t('journalMenuSub')}</small></span>${icons.chevron}</button>
    </div>

    <h3 class="section-title">${t('cardBack')}${state.isPremium ? '' : ' <span class="sc-lock static">PRO</span>'}</h3>
    <div class="back-picker" id="me-backs">${Object.keys(CARD_BACKS).map(k => {
      const locked = k !== 'violet' && !state.isPremium;
      return `<button class="bp-item${k === currentBack() ? ' on' : ''}${locked ? ' locked' : ''}" data-b="${k}" aria-label="${t('back_' + k)}">
        <span class="bp-card">${cardBack({ glow: false, style: k })}</span>
        <small>${locked ? icons.lock : ''}${t('back_' + k)}</small>
      </button>`;
    }).join('')}</div>

    <h3 class="section-title">${t('settings')}</h3>
    <div class="menu">
      <div class="menu-item static">${icons.globe}<span>${t('language')}</span>
        <div class="seg mini" id="me-lang">${['en', 'ru', 'ua'].map(l => `<button class="${l === L ? 'on' : ''}" data-l="${l}">${l === 'ua' ? 'UA' : l.toUpperCase()}</button>`).join('')}</div>
      </div>
      <label class="menu-item static">${icons.sound}<span>${t('sounds')}<small>${t('soundsSub')}</small></span>
        <input type="checkbox" class="toggle" id="me-sound" ${soundOn() ? 'checked' : ''}></label>
      ${notifications.supported ? `
      <label class="menu-item static">${icons.bell}<span>${t('dailyReminder')}<small>${fmtTime(CONFIG.REMINDER_HOUR, CONFIG.REMINDER_MINUTE)}</small></span>
        <input type="checkbox" class="toggle" id="me-remind" ${reminderOn ? 'checked' : ''}></label>` : ''}
      <button class="menu-item" id="me-restore">${icons.restore}<span>${t('restore')}</span>${icons.chevron}</button>
      <button class="menu-item" id="me-support">${icons.mail}<span>${t('contactSupport')}</span>${icons.chevron}</button>
      <button class="menu-item" id="me-terms">${icons.doc}<span>${t('termsOfUse')}</span>${icons.chevron}</button>
      <button class="menu-item" id="me-privacy">${icons.doc}<span>${t('privacyPolicy')}</span>${icons.chevron}</button>
      <button class="menu-item danger" id="me-delete">${icons.trash}<span>${t('deleteAccount')}</span>${icons.chevron}</button>
    </div>
    <p class="disclaimer">${t('disclaimer')}</p>
    <p class="version">${CONFIG.APP_NAME} · ${platform} · v1.0</p>
    <button class="version account-id" id="me-id">${t('accountId')}: ${esc(state.userId)}</button>
  </div>`;

  const $ = s => root.querySelector(s);
  $('#me-edit').onclick = editProfile;
  $('#me-upgrade')?.addEventListener('click', () => showPaywall({ source: 'me' }));
  $('#me-py-unlock')?.addEventListener('click', () => showPaywall({ source: 'personal_year' }));
  $('#me-manage')?.addEventListener('click', () => purchases.manage());
  $('#me-pw-preview')?.addEventListener('click', () => showPaywall({ source: 'preview', force: true }));
  $('#me-compat').onclick = () => openCompat();
  $('#me-history').onclick = () => openHistory();
  $('#me-restore').onclick = () => restorePurchases();
  $('#me-support').onclick = () => openUrl(`mailto:${CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(CONFIG.APP_NAME + ' support')}&body=${encodeURIComponent('\n\nID: ' + state.userId)}`);
  $('#me-terms').onclick = () => openUrl(legalUrl('terms'));
  $('#me-privacy').onclick = () => openUrl(legalUrl('privacy'));
  $('#me-delete').onclick = confirmDelete;
  // ID акаунта — щоб підтримка/адмін могли видати PRO (адмінка → «Выдать 👑»)
  $('#me-id').onclick = async () => {
    try { await navigator.clipboard.writeText(state.userId); toast(t('copied')); } catch (_) {}
  };
  root.querySelectorAll('#me-lang button').forEach(b => b.onclick = () => {
    if (b.dataset.l === getLang()) return;
    haptic('select');
    setLang(b.dataset.l);
    api('POST', '/users/init', { userId: state.userId, lang: b.dataset.l });
    emit('lang');
  });
  $('#me-sound').addEventListener('change', e => {
    setSound(e.target.checked);
    haptic('select');
    if (e.target.checked) play('reveal');
  });
  root.querySelectorAll('#me-backs .bp-item').forEach(b => b.onclick = () => {
    const k = b.dataset.b;
    if (k !== 'violet' && !state.isPremium) { showPaywall({ source: 'card_back' }); return; }
    if (k === currentBack()) return;
    haptic('select');
    play('flip');
    storage.set('lunara_back', k);
    track('card_back', k);
    root.querySelectorAll('#me-backs .bp-item').forEach(x => x.classList.toggle('on', x === b));
    emit('cardback');
  });
  $('#me-remind')?.addEventListener('change', async e => {
    if (e.target.checked) {
      const ok = await notifications.request();
      if (!ok) { e.target.checked = false; toast(t('notifDenied')); return; }
      await notifications.scheduleDaily({ hour: CONFIG.REMINDER_HOUR, minute: CONFIG.REMINDER_MINUTE, title: t('notifPushTitle'), body: t('notifPushBody') });
      storage.set('lunara_reminder', '1');
      track('notif_allow');
    } else {
      await notifications.cancel();
      storage.set('lunara_reminder', '0');
    }
  });
}

function editProfile() {
  const u = state.user;
  const max = new Date(); max.setFullYear(max.getFullYear() - 18);
  const layer = openSheet(`<div class="ask">
      <h2 class="serif">${t('editProfile')}</h2>
      <label class="lbl">${t('nameLabel')}</label>
      <input class="field" id="ep-name" maxlength="30" value="${esc(u.firstName || '')}">
      <label class="lbl">${t('birthLabel')}</label>
      <div id="ep-birth"></div>
      <button class="btn-primary" id="ep-save"><span>${t('save')}</span></button>
    </div>`, { tall: false });
  const wheel = dateWheel(layer.querySelector('#ep-birth'), { value: u.birthDate, max: max.toISOString().slice(0, 10) });
  layer.querySelector('#ep-save').onclick = async () => {
    const firstName = layer.querySelector('#ep-name').value.trim();
    const birthDate = wheel.value;
    if (firstName.length < 2 || !birthDate) { toast(t('fillAll')); return; }
    const res = await api('PATCH', `/users/${state.userId}`, { firstName, birthDate });
    if (!res.ok) { toast(t('errGeneric')); return; }
    state.user = res.user;
    emit('user');
    haptic('success');
    toast(t('saved'));
    closeLayer(layer);
  };
}

function confirmDelete() {
  const layer = openSheet(`<div class="notice">
      <div class="notice-icon danger">${icons.trash}</div>
      <h3 class="serif">${t('deleteTitle')}</h3>
      <p>${t('deleteText')}</p>
      <button class="btn-danger" id="del-yes">${t('deleteConfirm')}</button>
      <button class="btn-text" data-close>${t('cancel')}</button>
    </div>`, { tall: false });
  layer.querySelector('#del-yes').onclick = async () => {
    const res = await api('DELETE', `/users/${state.userId}/self`);
    if (!res.ok) { toast(t('errGeneric')); return; }
    await notifications.cancel();
    await resetSession();
    location.reload();
  };
}

// ══ Сумісність ═══════════════════════════════════════════════════════════════
export function openCompat() {
  const max = new Date(); max.setFullYear(max.getFullYear() - 14);
  const layer = pushScreen(`<div class="compat">
      <div class="compat-hero">${icons.heart}<h1 class="serif">${t('compatTitle')}</h1><p>${t('compatSub')}</p></div>
      <label class="lbl">${t('partnerName')}</label>
      <input class="field" id="cp-name" maxlength="30" placeholder="${t('partnerNamePh')}">
      <label class="lbl">${t('partnerBirth')}</label>
      <div id="cp-birth"></div>
      <button class="btn-primary" id="cp-go"><span>${t('compatCalc')}</span>${icons.chevron}</button>
      <div id="cp-result"></div>
    </div>`, { title: '' });
  const birth = dateWheel(layer.querySelector('#cp-birth'), { max: max.toISOString().slice(0, 10), fallback: `${(state.user.birthDate || '').slice(0, 4) || max.getFullYear() - 10}-06-15` });
  const go = layer.querySelector('#cp-go');
  go.onclick = () => {
    haptic('medium');
    const L = getLang();
    const partner = esc(layer.querySelector('#cp-name').value.trim()) || t('partner');
    const c = compatibility(state.user.birthDate, birth.value);
    const band = c.total >= 85 ? 'high' : c.total >= 70 ? 'good' : c.total >= 55 ? 'mixed' : 'low';
    const box = layer.querySelector('#cp-result');
    const locked = !state.isPremium;
    box.innerHTML = `
      <div class="cp-pair">
        <div>${zodiacGlyph(c.a.key, { stroke: 7 })}<b>${esc(state.user.firstName)}</b><small>${c.a.name[L]}</small></div>
        <div class="cp-ring" style="--p:${c.total}"><span class="serif">${c.total}%</span></div>
        <div>${zodiacGlyph(c.b.key, { stroke: 7 })}<b>${partner}</b><small>${c.b.name[L]}</small></div>
      </div>
      <h3 class="serif center">${t('compatBand_' + band)}</h3>
      <div class="cp-details${locked ? ' locked' : ''}">
        ${[['love', c.love], ['talk', c.talk], ['trust', c.trust]].map(([k, v]) => `
          <div class="bar"><span>${t('compat_' + k)}</span><div class="bar-track"><i style="width:${v}%"></i></div><b>${v}%</b></div>`).join('')}
        <p>${t('compatText_' + band, { a: c.a.name[L], b: c.b.name[L], ea: t('element_' + c.a.element).toLowerCase(), eb: t('element_' + c.b.element).toLowerCase() })}</p>
        ${locked ? `<div class="lock-over"><span>${icons.lock}</span><p>${t('compatLocked')}</p><button class="btn-primary small" id="cp-unlock"><span>${t('unlockPro')}</span></button></div>` : ''}
      </div>`;
    box.querySelector('#cp-unlock')?.addEventListener('click', () => showPaywall({ source: 'compat' }));
    setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };
}
