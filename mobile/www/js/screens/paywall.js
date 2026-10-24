// ══ Paywall (правила App Store 3.1.2: ціна, період, автопродовження, Terms, Restore) ══
import { t } from '../i18n.js';
import { state, track, refreshPremium, emit } from '../state.js';
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { purchases, haptic, openUrl, legalUrl, isNative } from '../platform.js';
import { openFull, openSheet, closeLayer, toast, delay } from '../ui.js';
import { cardBack, starsField, sparkle, icons } from '../art.js';

const FEATURES = [
  ['pwF_daily', true], ['pwF_horo', true], ['pwF_moon', true],
  ['pwF_spreads', false], ['pwF_ai', false], ['pwF_oracle', false],
  ['pwF_compat', false], ['pwF_deep', false], ['pwF_future', false],
];

let _open = false;

export async function showPaywall({ source = 'unknown', onClose } = {}) {
  if (state.isPremium || _open) { onClose?.(); return; }
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

  const layer = openFull(`<div class="paywall">
      ${starsField(60, 21)}
      <div class="pw-top">
        <button class="icon-btn pw-close" id="pw-close" aria-label="${t('close')}">${icons.close}</button>
        <button class="btn-text pw-restore" id="pw-restore">${t('restore')}</button>
      </div>
      <div class="pw-scroll scroll">
        <div class="pw-hero">
          <div class="pw-fan">
            <div class="pw-c c1">${cardBack({ glow: false })}</div>
            <div class="pw-c c2">${cardBack()}</div>
            <div class="pw-c c3">${cardBack({ glow: false })}</div>
          </div>
          ${sparkle('gold pw-s1')}${sparkle('pw-s2')}
        </div>
        <h1 class="serif pw-title">${t('pwTitle')}</h1>
        <p class="pw-sub">${t('pwSub')}</p>

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
        <div class="pw-table">
          <div class="pw-row pw-head"><span>${t('pwWhatYouGet')}</span><span class="pw-free">${t('free')}</span><span class="pw-pro"><b>PRO</b></span></div>
          ${FEATURES.map(([k, free]) => `<div class="pw-row"><span>${t(k)}</span>
            <span class="pw-free">${free ? icons.check : `<span class="pw-lock">${icons.lock}</span>`}</span>
            <span class="pw-pro">${icons.check}</span></div>`).join('')}
        </div>

      </div>
      <div class="pw-foot">
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
  const renderCta = () => {
    cta.innerHTML = `<span>${selected.trialDays ? t('startTrial') : t('continue')}</span>`;
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
