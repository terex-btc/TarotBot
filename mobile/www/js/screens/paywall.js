// ══ Paywall (правила App Store 3.1.2: ціна, період, автопродовження, Terms, Restore) ══
import { t, getLang } from '../i18n.js';
import { state, track, refreshPremium, emit } from '../state.js';
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { purchases, haptic, openUrl, legalUrl, isNative, notifications } from '../platform.js';
import { openFull, openSheet, closeLayer, toast, delay, esc } from '../ui.js';
import { cardBack, starsField, sparkle, icons } from '../art.js';
import { CATALOG } from '../catalog.js';

const FEATURES = [
  ['pwF_daily', true], ['pwF_horo', true], ['pwF_moon', true],
  ['pwF_yesno', false], ['pwF_spreads', false], ['pwF_ai', false], ['pwF_oracle', false], ['pwF_trainer', false],
  ['pwF_compat', false], ['pwF_deep', false], ['pwF_future', false],
];

// Що отримує людина — показуємо до тарифів; рядок, через який відкрили пейвол, підсвічуємо
const BENEFITS = [
  { k: 'spreads', icon: 'grid', c: 'gold' }, { k: 'ai', icon: 'crystal', c: 'violet' }, { k: 'oracle', icon: 'eye', c: 'pink' },
  { k: 'learn', icon: 'learn', c: 'green' }, { k: 'more', icon: 'heart', c: 'blue' },
];
const CLASSIC_TITLES = { yes_no: 'spYnTitle', three_card: 'sp3Title', love: 'spLoveTitle', month: 'spMonthTitle', year: 'spYearTitle', celtic: 'spCelticTitle' };
const REMINDER_ID = 3001;   // нагадування про кінець пробного періоду

// Заголовок і підсвічена перевага — під те, що людина хотіла відкрити
function pitch(source) {
  if (source.startsWith('spread_')) {
    const id = source.slice(7);
    const c = CATALOG.find(x => x.id === id);
    const name = c ? (c.name[getLang()] || c.name.en) : CLASSIC_TITLES[id] ? t(CLASSIC_TITLES[id]) : '';
    return { title: name ? t('pwT_spread', { spread: name }) : t('pwT_spreads'), hl: 'spreads' };
  }
  if (['lesson', 'trainer', 'deck_read'].includes(source)) return { title: t('pwT_learn'), hl: 'learn' };
  if (source === 'oracle') return { title: t('pwT_oracle'), hl: 'oracle' };
  if (['daily_ai', 'after_first_reading'].includes(source)) return { title: t('pwT_ai'), hl: 'ai' };
  if (['compat', 'personal_year', 'card_reversed', 'card_back'].includes(source)) return { title: t('pwT_more'), hl: 'more' };
  const name = state.user?.firstName;
  return { title: name ? t('pwT_name', { name }) : t('pwT_default'), hl: '' };
}

let _open = false;

export async function showPaywall({ source = 'unknown', onClose, force = false } = {}) {
  if ((state.isPremium && !force) || _open) { onClose?.(); return; }
  _open = true;
  track('paywall_view', source);

  // Ціни: з App Store (через RevenueCat) або запасні — для прев'ю
  const storePlans = isNative ? await purchases.getPlans() : null;
  const plans = CONFIG.PLANS.map(p => {
    const s = storePlans?.find(x => x.planId === p.id);
    return {
      ...p,
      store: s || null,
      price: s?.priceString || p.fallbackPrice,
      trialDays: s ? s.trialDays : (p.trialDays || 0),
      perWeek: s && p.period === 'year' ? perWeek(s.price, s.currency) : p.fallbackPerWeek,
    };
  });
  const weekly = plans.find(p => p.period === 'week');
  const yearly = plans.find(p => p.period === 'year');
  const save = weekly && yearly ? savePercent(weekly, yearly) : 0;
  let selected = plans.find(p => p.id === CONFIG.DEFAULT_PLAN) || plans[0];
  let closed = false;
  const { title, hl } = pitch(source);
  // Обіцяємо нагадування лише там, де справді можемо його поставити
  const canRemind = notifications.supported && await notifications.granted();

  const layer = openFull(`<div class="paywall">
      ${starsField(60, 21)}
      <div class="pw-top">
        <button class="icon-btn pw-close" id="pw-close" aria-label="${t('close')}">${icons.close}</button>
        <button class="btn-text pw-restore" id="pw-restore">${t('restore')}</button>
      </div>
      <div class="pw-scroll scroll">
        <div class="pw-hero small">
          <div class="pw-fan">
            <div class="pw-c c1">${cardBack({ glow: false })}</div>
            <div class="pw-c c2">${cardBack()}</div>
            <div class="pw-c c3">${cardBack({ glow: false })}</div>
          </div>
          ${sparkle('gold pw-s1')}${sparkle('pw-s2')}
        </div>
        <h1 class="serif pw-title">${esc(title)}</h1>
        <p class="pw-sub">${t('pwSub')}</p>

        <div class="pw-benefits">${BENEFITS.map(b => `
          <div class="pw-ben${b.k === hl ? ' hl' : ''}">
            <span class="pw-ben-ico ${b.c}">${icons[b.icon] || sparkle()}</span>
            <span><b>${t('pwB_' + b.k)}</b><small>${t('pwB_' + b.k + '_s')}</small></span>
          </div>`).join('')}
        </div>

        <div class="pw-plans">${plans.map(p => `
          <button class="pw-plan${p === selected ? ' on' : ''}" data-plan="${p.id}">
            <span class="radio"></span>
            <span class="pw-plan-main">
              <span class="pw-plan-name">${t(p.period === 'year' ? 'planYearly' : 'planWeekly')}</span>
              <span class="pw-plan-desc">${p.trialDays
                ? t('planTrialThen', { days: p.trialDays, price: p.price, period: t('per_' + p.period) })
                : p.perWeek ? t('planPerWeek', { price: p.perWeek }) : t('cancelAnytime')}</span>
            </span>
            <span class="pw-plan-price"><b>${p.price}</b><small>${t('per_' + p.period)}</small></span>
            ${p.period === 'year' && save > 0 ? `<span class="pw-badge">${t('savePct', { pct: save })}</span>` : ''}
            ${p.trialDays ? `<span class="pw-badge trial">${t('freeTrialBadge')}</span>` : ''}
          </button>`).join('')}
        </div>
        <div class="pw-timeline" id="pw-tl"></div>

        <div class="pw-table">
          <div class="pw-row pw-head"><span>${t('pwCompare')}</span><span class="pw-free">${t('free')}</span><span class="pw-pro"><b>PRO</b></span></div>
          ${FEATURES.map(([k, free]) => `<div class="pw-row"><span>${t(k)}</span>
            <span class="pw-free">${free ? icons.check : `<span class="pw-lock">${icons.lock}</span>`}</span>
            <span class="pw-pro">${icons.check}</span></div>`).join('')}
        </div>

      </div>
      <div class="pw-foot">
        <p class="pw-trust"><span>${icons.check}${t('pwTrust')}</span><span>${icons.lock}${t('pwSecure')}</span></p>
        <button class="btn-primary btn-glow" id="pw-cta"></button>
        <p class="pw-terms" id="pw-terms"></p>
        <p class="pw-links"><a id="pw-tos">${t('termsOfUse')}</a> · <a id="pw-privacy">${t('privacyPolicy')}</a></p>
      </div>
    </div>`, {
    cls: 'pw-layer',
    onClose: () => { _open = false; if (!closed) { closed = true; onClose?.(); } },
  });

  const cta = layer.querySelector('#pw-cta');
  const terms = layer.querySelector('#pw-terms');
  const tl = layer.querySelector('#pw-tl');
  const renderCta = () => {
    cta.innerHTML = `<span>${selected.trialDays ? t('startTrial') : t('continue')}</span>`;
    // Як працює пробний період — щоб не боятися натиснути
    const d = selected.trialDays;
    tl.innerHTML = d ? `<h3 class="pw-tl-h">${t('pwTlTitle')}</h3>
      <div class="pw-tl-step on"><i>${icons.check}</i><span><b>${t('pwTlToday')}</b><small>${t('pwTlToday_s')}</small></span></div>
      ${canRemind && d > 1 ? `<div class="pw-tl-step"><i>${icons.bell}</i><span><b>${t('pwTlIn', { n: d - 1 })}</b><small>${t('pwTlRemind_s')}</small></span></div>` : ''}
      <div class="pw-tl-step"><i>${icons.crown}</i><span><b>${t('pwTlIn', { n: d })}</b><small>${t('pwTlCharge_s', { price: selected.price, period: t('per_' + selected.period) })}</small></span></div>` : '';
    terms.textContent = selected.trialDays
      ? t('termsTrial', { days: selected.trialDays, price: selected.price, period: t('per_' + selected.period) })
      : t('termsPlain', { price: selected.price, period: t('per_' + selected.period) });
  };
  renderCta();

  layer.querySelectorAll('.pw-plan').forEach(b => b.onclick = () => {
    haptic('select');
    selected = plans.find(p => p.id === b.dataset.plan);
    layer.querySelectorAll('.pw-plan').forEach(x => x.classList.toggle('on', x === b));
    renderCta();
  });

  // Хрестик з'являється не одразу — але завжди доступний (вимога Apple)
  const closeBtn = layer.querySelector('#pw-close');
  setTimeout(() => closeBtn.classList.add('show'), 900);
  closeBtn.onclick = () => { haptic('light'); track('paywall_close', source); closeLayer(layer); };

  layer.querySelector('#pw-tos').onclick = () => openUrl(legalUrl('terms'));
  layer.querySelector('#pw-privacy').onclick = () => openUrl(legalUrl('privacy'));
  layer.querySelector('#pw-restore').onclick = () => restore(layer);

  cta.onclick = async () => {
    haptic('medium');
    track('buy_click', selected.productId);
    if (!purchases.supported || !selected.store) { previewNotice(); return; }
    cta.disabled = true;
    cta.innerHTML = `<span class="dots"><i></i><i></i><i></i></span>`;
    const res = await purchases.purchase(selected.store);
    if (res.ok) {
      track(selected.trialDays ? 'trial_start' : 'purchase', selected.productId);
      if (selected.trialDays > 1 && canRemind) {
        notifications.replaceRange(REMINDER_ID, REMINDER_ID, [{
          id: REMINDER_ID, title: t('trialRemTitle'),
          body: t('trialRemBody', { price: selected.price, period: t('per_' + selected.period) }),
          at: new Date(Date.now() + (selected.trialDays - 1) * 86400000),
        }]);
      }
      await activate();
      celebrate(layer);
      await delay(1600);
      closeLayer(layer);
    } else {
      if (!res.cancelled) toast(t('purchaseFailed'));
      cta.disabled = false;
      renderCta();
    }
  };
}

async function activate() {
  // Сервер дізнається про покупку від RevenueCat; sync — щоб не чекати вебхук
  await api('POST', '/app/iap/sync', {});
  for (let i = 0; i < 6; i++) {
    if (await refreshPremium()) break;
    await delay(1200);
  }
  state.isPremium = true;   // на пристрої доступ уже підтверджено App Store
  emit('premium');
}

async function restore(layer) {
  haptic('light');
  if (!purchases.supported) { previewNotice(); return; }
  toast(t('restoring'));
  const res = await purchases.restore();
  if (res.ok) {
    track('restore');
    await activate();
    toast(t('restored'));
    if (layer) closeLayer(layer);
  } else toast(t('nothingToRestore'));
}

export { restore as restorePurchases };

function previewNotice() {
  openSheet(`<div class="notice">
      <div class="notice-icon">${icons.crown}</div>
      <h3 class="serif">${t('previewTitle')}</h3>
      <p>${t('previewText')}</p>
      <button class="btn-primary" data-close><span>${t('gotIt')}</span></button>
    </div>`, { tall: false });
}

function celebrate(layer) {
  haptic('success');
  const burst = document.createElement('div');
  burst.className = 'celebrate';
  burst.innerHTML = `<div class="celebrate-card">${icons.crown}<h2 class="serif">${t('welcomePro')}</h2><p>${t('welcomeProSub')}</p></div>`;
  layer.appendChild(burst);
}

function perWeek(price, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price / 52);
  } catch (_) { return null; }
}

function savePercent(weekly, yearly) {
  const w = weekly.store?.price ?? parseFloat(String(weekly.price).replace(/[^\d.]/g, ''));
  const y = yearly.store?.price ?? parseFloat(String(yearly.price).replace(/[^\d.]/g, ''));
  if (!w || !y) return 0;
  return Math.round((1 - y / (w * 52)) * 100);
}
