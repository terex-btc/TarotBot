// ══ Платформа: iOS/Android (Capacitor) · Telegram · браузер ═════════════════
// Увесь код, що залежить від того, де запущено застосунок, — тільки тут.
import { CONFIG } from './config.js';

const cap = window.Capacitor;
const tg  = window.Telegram?.WebApp;

export const isNative   = !!cap?.isNativePlatform?.();
export const isTelegram = !isNative && !!tg?.initData;
export const platform   = isNative ? cap.getPlatform() : isTelegram ? 'telegram' : 'web';

const plugin = name => cap?.Plugins?.[name];

// ── Сховище ──────────────────────────────────────────────────────────────────
// На iOS localStorage у WKWebView може очиститись — важливе тримаємо в Preferences.
export const storage = {
  get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
  set(key, val) { try { localStorage.setItem(key, val); } catch (_) {} },
  remove(key) { try { localStorage.removeItem(key); } catch (_) {} },
  async getDurable(key) {
    const prefs = plugin('Preferences');
    if (prefs) { try { return (await prefs.get({ key })).value; } catch (_) {} }
    return this.get(key);
  },
  async setDurable(key, value) {
    const prefs = plugin('Preferences');
    if (prefs) { try { await prefs.set({ key, value }); } catch (_) {} }
    this.set(key, value);
  },
  async clearAll() {
    try { await plugin('Preferences')?.clear(); } catch (_) {}
    try { localStorage.clear(); } catch (_) {}
  },
};

// ── Мова пристрою ────────────────────────────────────────────────────────────
export function deviceLang() {
  const code = (tg?.initDataUnsafe?.user?.language_code || navigator.language || 'en').toLowerCase();
  if (code.startsWith('uk')) return 'ua';
  if (/^(ru|be|kk)/.test(code)) return 'ru';
  return 'en';
}

// ── Telegram: ім'я та id з initData ──────────────────────────────────────────
export const telegramUser = isTelegram ? tg.initDataUnsafe?.user || null : null;
export const telegramInitData = isTelegram ? tg.initData : '';
export const startParam = isTelegram ? tg.initDataUnsafe?.start_param || '' : '';

// ── Ініціалізація оболонки ───────────────────────────────────────────────────
export function initShell() {
  const root = document.documentElement;
  root.dataset.platform = platform;
  if (isTelegram) {
    tg.ready();
    tg.expand();
    tg.requestFullscreen?.();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.('#0d0a1f');
    tg.setBackgroundColor?.('#0d0a1f');
    tg.setBottomBarColor?.('#0d0a1f');
    const applyInset = () => {
      const top = (tg.safeAreaInset?.top || 0) + (tg.contentSafeAreaInset?.top || 0);
      root.style.setProperty('--tg-top', `${top}px`);
    };
    applyInset();
    setTimeout(applyInset, 300);
    ['fullscreenChanged', 'safeAreaChanged', 'contentSafeAreaChanged'].forEach(e => tg.onEvent?.(e, applyInset));
  }
  if (isNative) {
    plugin('StatusBar')?.setStyle?.({ style: 'DARK' }).catch(() => {});
    plugin('SplashScreen')?.hide?.().catch(() => {});
  }
}

// Системна кнопка «Назад» (Telegram) — показуємо, коли відкритий шар поверх табів
let _backHandler = null;
export function setBackButton(handler) {
  _backHandler = handler;
  if (!isTelegram || !tg.BackButton) return;
  tg.BackButton.offClick?.(onTgBack);
  if (handler) { tg.BackButton.onClick(onTgBack); tg.BackButton.show(); }
  else tg.BackButton.hide();
}
function onTgBack() { _backHandler?.(); }
if (isNative) {
  plugin('App')?.addListener?.('backButton', () => { _backHandler?.(); });
}

// ── Віброзворотний зв'язок ───────────────────────────────────────────────────
export function haptic(kind = 'light') {
  try {
    if (isTelegram && tg.HapticFeedback) {
      if (kind === 'success' || kind === 'error' || kind === 'warning') tg.HapticFeedback.notificationOccurred(kind);
      else if (kind === 'select') tg.HapticFeedback.selectionChanged();
      else tg.HapticFeedback.impactOccurred(kind);
      return;
    }
    const h = plugin('Haptics');
    if (h) {
      if (kind === 'success') h.notification({ type: 'SUCCESS' });
      else if (kind === 'error') h.notification({ type: 'ERROR' });
      else if (kind === 'select') h.selectionChanged?.();
      else h.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
      return;
    }
    navigator.vibrate?.(kind === 'success' ? [12, 40, 12] : 8);
  } catch (_) {}
}

// ── Поділитися ───────────────────────────────────────────────────────────────
export async function share({ title, text, url }) {
  try {
    const s = plugin('Share');
    if (s) { await s.share({ title, text, url, dialogTitle: title }); return true; }
    if (navigator.share) { await navigator.share({ title, text, url }); return true; }
    if (isTelegram) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url || '')}&text=${encodeURIComponent(text || '')}`);
      return true;
    }
    await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n'));
    return 'copied';
  } catch (_) {
    return false;
  }
}

// ── Відкрити посилання ───────────────────────────────────────────────────────
export function openUrl(url) {
  if (isNative && plugin('Browser')) { plugin('Browser').open({ url }); return; }
  if (isTelegram) { tg.openLink(url); return; }
  window.open(url, '_blank', 'noopener');
}

export function legalUrl(page) {
  const base = isNative ? CONFIG.API_ORIGIN : location.origin;
  return `${base}${CONFIG.LEGAL_PATH}/${page}.html`;
}

// ── Локальні сповіщення (щоденна карта дня) ──────────────────────────────────
// Тільки на нативі: без сервера, без APNs. У Telegram нагадування шле бот.
export const notifications = {
  supported: isNative && !!plugin('LocalNotifications'),
  async request() {
    const ln = plugin('LocalNotifications');
    if (!ln) return false;
    try {
      const res = await ln.requestPermissions();
      return res.display === 'granted';
    } catch (_) { return false; }
  },
  async scheduleDaily({ hour, minute, title, body }) {
    const ln = plugin('LocalNotifications');
    if (!ln) return false;
    try {
      await ln.cancel({ notifications: [{ id: 1001 }] }).catch(() => {});
      await ln.schedule({ notifications: [{
        id: 1001, title, body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      }] });
      return true;
    } catch (_) { return false; }
  },
  async cancel() {
    try { await plugin('LocalNotifications')?.cancel({ notifications: [{ id: 1001 }] }); } catch (_) {}
  },
};

// ── Покупки (App Store / Google Play через RevenueCat) ───────────────────────
// Поза нативом покупок немає: у Telegram/браузері це прев'ю застосунку.
let _rcReady = false;
export const purchases = {
  supported: isNative && !!plugin('Purchases'),
  async init(userId) {
    const P = plugin('Purchases');
    const apiKey = platform === 'android' ? CONFIG.REVENUECAT_ANDROID_KEY : CONFIG.REVENUECAT_IOS_KEY;
    if (!P || !apiKey || _rcReady) return _rcReady;
    try {
      await P.configure({ apiKey, appUserID: String(userId) });
      _rcReady = true;
    } catch (e) { console.warn('[purchases] configure', e); }
    return _rcReady;
  },
  // → [{ planId, productId, priceString, pricePerWeek, trialDays, pkg }]
  async getPlans() {
    const P = plugin('Purchases');
    if (!P || !_rcReady) return null;
    try {
      const { current } = await P.getOfferings();
      const pkgs = current?.availablePackages || [];
      return CONFIG.PLANS.map(plan => {
        const pkg = pkgs.find(p => p.product?.identifier === plan.productId);
        if (!pkg) return null;
        const intro = pkg.product.introPrice;
        const trialDays = intro && intro.price === 0 ? daysOf(intro.periodNumberOfUnits, intro.periodUnit) : 0;
        return {
          planId: plan.id, productId: plan.productId,
          priceString: pkg.product.priceString,
          price: pkg.product.price, currency: pkg.product.currencyCode,
          trialDays, pkg,
        };
      }).filter(Boolean);
    } catch (e) { console.warn('[purchases] offerings', e); return null; }
  },
  async purchase(plan) {
    const P = plugin('Purchases');
    if (!P || !plan?.pkg) return { ok: false, error: 'unsupported' };
    try {
      const { customerInfo } = await P.purchasePackage({ aPackage: plan.pkg });
      return { ok: !!customerInfo?.entitlements?.active?.[CONFIG.ENTITLEMENT] };
    } catch (e) {
      if (e?.userCancelled || e?.code === '1') return { ok: false, cancelled: true };
      return { ok: false, error: e?.message || 'purchase_failed' };
    }
  },
  async restore() {
    const P = plugin('Purchases');
    if (!P) return { ok: false, error: 'unsupported' };
    try {
      const { customerInfo } = await P.restorePurchases();
      return { ok: !!customerInfo?.entitlements?.active?.[CONFIG.ENTITLEMENT] };
    } catch (e) { return { ok: false, error: e?.message || 'restore_failed' }; }
  },
  async manage() {
    // Керування підпискою — системний екран App Store
    openUrl(platform === 'android'
      ? 'https://play.google.com/store/account/subscriptions'
      : 'https://apps.apple.com/account/subscriptions');
  },
};

function daysOf(n, unit) {
  const u = String(unit || '').toUpperCase();
  if (u === 'DAY') return n;
  if (u === 'WEEK') return n * 7;
  if (u === 'MONTH') return n * 30;
  return n;
}
