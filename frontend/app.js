// ══ Магический кабинет — App ══════════════════════════════════════════════
'use strict';
import { t, T } from './i18n.js';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.requestFullscreen?.();
  tg.setHeaderColor?.('#07030f');
  tg.setBackgroundColor?.('#07030f');
  tg.setBottomBarColor?.('#07030f');
  tg.disableVerticalSwipes?.();

  // Встановлюємо відступ зверху з урахуванням Telegram fullscreen UI кнопок
  function applyTgSafeArea() {
    // contentSafeAreaInset.top — відступ від Telegram кнопок (Закрити і т.д.)
    const tgTop = tg.contentSafeAreaInset?.top ?? 0;
    document.documentElement.style.setProperty('--tg-top', `${tgTop}px`);
  }
  applyTgSafeArea();
  // requestFullscreen() async — повторно зчитуємо після активації
  setTimeout(applyTgSafeArea, 250);
  setTimeout(applyTgSafeArea, 700);
  // Оновлюємо при зміні (напр. поворот екрану або вихід з fullscreen)
  tg.onEvent?.('fullscreenChanged', applyTgSafeArea);
  tg.onEvent?.('safeAreaChanged', applyTgSafeArea);
  tg.onEvent?.('contentSafeAreaChanged', applyTgSafeArea);
}

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  userId: tg?.initDataUnsafe?.user?.id?.toString()
         || localStorage.getItem('tarot_uid')
         || ('u_' + Math.random().toString(36).slice(2)),
  tgUser: tg?.initDataUnsafe?.user || null,
  user:   null,
  lang:   (() => { const l = tg?.initDataUnsafe?.user?.language_code; return (l === 'uk' || l === 'ua') ? 'ua' : 'ru'; })(),
  currentReading:  null,
  currentQuestion: '',
  flippedCount:    0,
  prevScreen:      'home',
  currentSpell:    null,
  spellTimer:      null,
  spellTimerSec:   0,
  moonData:        null,
};

// ── Helpers ────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

// XSS sanitize — екрануємо HTML у рядках з користувацьких полів
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Блокуємо повторний клік до завершення (anti-duplicate payment guard)
const _inFlight = new Set();
function guardedCall(key, fn) {
  if (_inFlight.has(key)) return;
  _inFlight.add(key);
  Promise.resolve(fn()).finally(() => _inFlight.delete(key));
}

// Поллінг після оплати: чекаємо поки predicate(data) стане true (webhook може прийти з затримкою)
async function pollUntil(fetchFn, predicate, { interval = 900, maxMs = 9000 } = {}) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const data = await fetchFn();
      if (predicate(data)) return data;
    } catch (_) { /* мережева помилка — продовжуємо спробу */ }
    await delay(interval);
  }
  return null; // таймаут — повертаємо null
}

// ── i18n shorthand ─────────────────────────────────────────────────────────
const L = key => t(key, state.lang);

// ── DOM локалізація — оновлює всі [data-i18n] елементи ────────────────────
function localizeDOM() {
  const lang = state.lang;
  // Текстовий вміст
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.dataset.i18n, lang);
    if (val) el.textContent = val;
  });
  // innerHTML (для елементів з HTML-розміткою)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const val = t(el.dataset.i18nHtml, lang);
    if (val) el.innerHTML = val;
  });
  // Placeholder
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const val = t(el.dataset.i18nPh, lang);
    if (val) el.placeholder = val;
  });

  // HTML lang attribute
  document.getElementById('html-root')?.setAttribute('lang', lang === 'ua' ? 'uk' : 'ru');

  // Елементи з <br> і <span> — оновлюємо окремо
  if (lang === 'ua') {
    const splashTitle = document.getElementById('splash-title');
    if (splashTitle) splashTitle.innerHTML = 'Магічний<br><span>Кабінет</span>';
    const splashSub = document.getElementById('splash-sub');
    if (splashSub) splashSub.innerHTML = 'Карти Таро · Заговори · Місячна магія<br>Персонально за датою народження';
    const introTitle = document.getElementById('intro-title');
    if (introTitle) introTitle.innerHTML = 'Налаштування<br><span>кабінету</span>';
    const introSub = document.getElementById('intro-sub');
    if (introSub) introSub.innerHTML = 'Введи дані — зірки розрахують<br>твій персональний розклад';
    const premHeroSub = document.getElementById('premium-hero-sub');
    if (premHeroSub) premHeroSub.innerHTML = 'Повна сила магії — персонально<br>за вашим знаком та нумерологією';
    const modalSub = document.getElementById('modal-sub');
    if (modalSub) modalSub.innerHTML = 'Що тебе хвилює? Карти дадуть відповідь,<br>персональну саме для тебе.';
    const dreamsSub = document.getElementById('dreams-sub');
    if (dreamsSub) dreamsSub.innerHTML = 'Дізнайся що означає твій сон<br>через призму карт Таро';
  }
}

// ── API ────────────────────────────────────────────────────────────────────
// initData від Telegram — передаємо в кожен запит для верифікації підпису
const _tgInitData = tg?.initData || '';

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_tgInitData) headers['X-Tg-Auth'] = _tgInitData;
  const r = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  try { return await r.json(); } catch (_) { return { ok: false, error: `http_${r.status}` }; }
}

// ── Роутер ─────────────────────────────────────────────────────────────────
function showScreen(id, dir = 'right') {
  const prev = document.querySelector('.screen.active');
  const next = document.getElementById(`screen-${id}`);
  if (!next || next === prev) return;
  if (prev) {
    prev.classList.remove('active');
    prev.classList.add('slide-out');
    setTimeout(() => prev.classList.remove('slide-out'), 350);
  }
  next.style.opacity   = '0';
  next.style.transform = `translateX(${dir === 'right' ? '40px' : '-40px'})`;
  next.classList.add('active');
  requestAnimationFrame(() => {
    next.style.transition = 'opacity .3s ease, transform .3s ease';
    next.style.opacity    = '';
    next.style.transform  = '';
  });
  state.prevScreen = prev?.id?.replace('screen-', '') || 'home';
}

// ── Toast ──────────────────────────────────────────────────────────────────
let _toastTimer;
function toast(msg) {
  let el = document.getElementById('_toast');
  if (!el) { el = document.createElement('div'); el.id = '_toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Stars canvas ───────────────────────────────────────────────────────────
function initStars() {
  const canvas = document.getElementById('stars-canvas');
  const ctx    = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2,
    a: Math.random() * 0.7 + 0.1, sp: Math.random() * 0.005 + 0.001, ph: Math.random() * Math.PI * 2,
  }));
  const special = Array.from({ length: 16 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 2 + 1,
    hue: Math.random() > 0.5 ? 270 : 45,
    a: Math.random() * 0.5 + 0.2, sp: Math.random() * 0.003 + 0.001, ph: Math.random() * Math.PI * 2,
  }));
  let t = 0, _rafId = null, _paused = false;
  document.addEventListener('visibilitychange', () => {
    _paused = document.hidden;
    if (!_paused && !_rafId) { _rafId = requestAnimationFrame(draw); }
  });
  function draw() {
    _rafId = null;
    if (_paused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.016;
    stars.forEach(s => {
      const alpha = s.a * (0.5 + 0.5 * Math.sin(t * s.sp * 60 + s.ph));
      ctx.beginPath(); ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
    });
    special.forEach(s => {
      const alpha = s.a * (0.5 + 0.5 * Math.sin(t * s.sp * 60 + s.ph));
      ctx.beginPath(); ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue},80%,70%,${alpha})`; ctx.fill();
    });
    _rafId = requestAnimationFrame(draw);
  }
  _rafId = requestAnimationFrame(draw);
}

// ── Splash ─────────────────────────────────────────────────────────────────
function initSplashScreen() {
  document.getElementById('btn-splash-start')?.addEventListener('click', () => {
    tg?.HapticFeedback?.impactOccurred?.('medium');
    showScreen('intro');
  });
}

// ── Intro ──────────────────────────────────────────────────────────────────
function initIntroScreen() {
  const nameIn  = document.getElementById('input-name');
  const birthIn = document.getElementById('input-birth');
  const btn     = document.getElementById('btn-start');
  if (state.tgUser?.first_name && !nameIn.value) nameIn.value = state.tgUser.first_name;
  const maxD = new Date(); maxD.setFullYear(maxD.getFullYear() - 14);
  birthIn.max = maxD.toISOString().split('T')[0];
  const check = () => { btn.disabled = !(nameIn.value.trim().length >= 2 && birthIn.value); };
  nameIn.addEventListener('input', check);
  birthIn.addEventListener('change', check);
  check();

  // Закриваємо клавіатуру тільки для текстового поля при тапі поза ним
  // birthIn.blur() тут не викликаємо — він закриває нативний датапікер при виборі року
  document.getElementById('screen-intro')?.addEventListener('click', e => {
    if (!e.target.closest('input') && !e.target.closest('button')) {
      nameIn.blur();
    }
  });

  // Закриваємо датапікер тільки після повного вибору дати (change = юзер підтвердив)
  birthIn.addEventListener('change', () => { birthIn.blur(); });
  const resetBtn = () => {
    btn.disabled = false;
    btn.innerHTML = `<span>${t('openBtn', state.lang)}</span><span class="btn-icon-r">🔮</span>`;
  };

  btn.onclick = async () => {
    if (!nameIn.value.trim() || !birthIn.value) return;
    btn.disabled = true;
    btn.innerHTML = `<span>${t('connecting', state.lang)}</span>`;
    try {
      const data = await api('POST', '/users/init', {
        userId:    state.userId,
        firstName: nameIn.value.trim(),
        username:  state.tgUser?.username || '',
        birthDate: birthIn.value,
        lang:      state.lang,
      });
      if (data.ok && data.user) {
        state.user = data.user;
        localStorage.setItem('tarot_uid', state.userId);
        try {
          renderOnboarding(data.user);
        } catch (_) {
          // якщо онбординг впав — одразу на головну
          await renderHome();
          showScreen('home');
        }
      } else {
        resetBtn();
        toast(data.error || L('connError'));
      }
    } catch (err) {
      resetBtn();
      toast(L('noConnection'));
    }
  };
}

// ── HOME ───────────────────────────────────────────────────────────────────
async function renderHome() {
  const user = state.user;
  if (!user) return;
  document.getElementById('top-name').textContent = user.firstName || L('defaultName');
  const z = user.astro?.zodiac;
  document.getElementById('top-astro').textContent = z
    ? `${z.emoji} ${z.name} · Путь ${user.astro.lifePath}`
    : '✏️ ' + L('tapToEdit');
  const av = document.getElementById('user-avatar');
  if (av && user.firstName) {
    av.textContent = user.firstName[0].toUpperCase();
    av.classList.add('avatar-letter');
  }
  renderAstroStrip(user);

  // Таро: метадані (синхронно, без запиту)
  const tarotMeta = document.getElementById('tarot-meta');
  if (tarotMeta && user.astro) {
    const m = user.astro;
    tarotMeta.innerHTML = [
      `<div class="meta-pill">${m.zodiac?.emoji} <strong>${m.zodiac?.name}</strong></div>`,
      `<div class="meta-pill">🔢 Путь <strong>${m.lifePath}</strong></div>`,
      `<div class="meta-pill">${m.moonPhase?.emoji} <strong>${m.moonPhase?.name}</strong></div>`,
    ].join('');
  }

  // Паралельні запити: місяць+заговори, преміум-статус, карта дня
  const [moonData, ps] = await Promise.all([
    api('GET', `/spells/today/${state.userId}`),
    api('GET', `/users/${state.userId}/premium-status`),
  ]);

  if (moonData.ok) {
    state.moonData = moonData;
    const pill = document.getElementById('today-moon-pill');
    pill.innerHTML = `${moonData.moon.emoji} ${moonData.moon.name}`;
    document.querySelector('.today-hint').textContent = getMoonTip(moonData.moon.energy);
    renderSpellsPreview(moonData.spells);
  }

  if (ps.ok) {
    state.premiumStatus  = ps;
    state.user.isPremium = ps.isPremium;
    state.spellCredits   = ps.spellCredits || 0;
    updatePremiumBadge(ps);
    updatePremiumCards(ps.isPremium);
    updateThreeCardLock(ps.isPremium);
  } else {
    updatePremiumCards(user.isPremium);
    updateThreeCardLock(user.isPremium);
  }

  await Promise.all([
    loadDailyCard('daily-zone', 'tap-daily'),
    loadDailyCard('daily-zone-tarot', 'tap-daily-tarot'),
  ]);
}

function updatePremiumBadge(ps) {
  const badge = document.getElementById('premium-badge');
  if (!badge) return;
  if (ps.isPremium) {
    badge.classList.remove('hidden');
    badge.textContent = ps.daysLeft !== null ? `👑 ${ps.daysLeft}д` : '👑';
    badge.title = ps.daysLeft !== null ? `${L('premiumBadgeDaysTitle')} ${ps.daysLeft} ${L('premiumBadgeDaysSuffix')}` : L('premiumBadgeTitle');
  } else {
    badge.classList.add('hidden');
  }
}

function updateThreeCardLock(isPremium) {
  const badge = document.getElementById('three-card-badge');
  const lock  = document.getElementById('three-card-lock');
  if (badge) badge.textContent = isPremium ? L('threeCardOpen') : L('threeCardPremium');
  if (badge) badge.className = isPremium ? 'badge-free' : 'badge-premium';
  if (lock)  lock.textContent = isPremium ? '→' : '🔒';
}

function getMoonTip(energy) {
  const tipsRu = {
    new:     'новых начал и желаний 🌑',
    waxing:  'роста, привлечения и успеха 🌒',
    first:   'активных действий 🌓',
    gibbous: 'завершения дел и удачи 🌔',
    full:    'силы, красоты и магии 🌕',
    waning:  'очищения и избавления 🌖',
    last:    'завершения и отпускания 🌗',
    dark:    'защиты и тайных дел 🌘',
  };
  const tipsUa = {
    new:     'нових починань і бажань 🌑',
    waxing:  'зростання, притягнення і успіху 🌒',
    first:   'активних дій 🌓',
    gibbous: 'завершення справ і удачі 🌔',
    full:    'сили, краси і магії 🌕',
    waning:  'очищення і позбавлення 🌖',
    last:    'завершення і відпускання 🌗',
    dark:    'захисту і таємних справ 🌘',
  };
  const tips = state.lang === 'ua' ? tipsUa : tipsRu;
  return `${L('moonTipPrefix')} ` + (tips[energy] || L('moonTipMagic'));
}

function renderAstroStrip(user) {
  const strip = document.getElementById('astro-strip');
  if (!user.astro) { strip.innerHTML = ''; return; }
  const { zodiac, lifePath, personalYear, moonPhase } = user.astro;
  strip.innerHTML = [
    { icon: zodiac.emoji, label: L('zodiacSign'), val: zodiac.name },
    { icon: '🔢', label: L('zodiacPath'), val: lifePath },
    { icon: '🌀', label: L('zodiacYear'), val: personalYear },
    { icon: moonPhase.emoji, label: L('zodiacMoon'), val: moonPhase.name },
    { icon: '🌍', label: L('zodiacElement'), val: zodiac.element },
    { icon: '🪐', label: L('zodiacPlanet'), val: zodiac.planet },
  ].map(p => `
    <div class="astro-pill">
      <span class="astro-pill-icon">${p.icon}</span>
      <span class="astro-pill-label">${p.label}</span>
      <span class="astro-pill-val">${p.val}</span>
    </div>
  `).join('');
}

function renderSpellsPreview(spells) {
  const wrap = document.getElementById('spells-preview');
  if (!wrap) return;
  const isPremium = state.user?.isPremium || false;
  if (!isPremium) {
    // Показуємо тизер — назви заблоковані
    wrap.innerHTML = `
      <div class="spells-locked-banner" id="spells-locked-banner">
        <div class="slb-icon">🔒</div>
        <div class="slb-text"><b>${L('spellsTeaserTitle')}</b><br>${L('spellsTeaserSub')}</div>
        <button class="btn-primary btn-sm slb-btn" id="btn-unlock-spells">${L('spellsTeaserBtn')}</button>
      </div>
    `;
    document.getElementById('btn-unlock-spells')?.addEventListener('click', async () => {
      showScreen('premium'); await loadPremiumScreen();
    });
    return;
  }
  if (!spells?.length) return;
  wrap.innerHTML = spells.slice(0, 6).map(s => `
    <div class="spell-preview-card${s.locked ? ' locked' : ''}" data-spell-id="${s.id}">
      ${s.locked ? '<div class="spc-lock">🔒</div>' : ''}
      <div class="spc-emoji">${s.emoji}</div>
      <div class="spc-title">${s.title}</div>
      <div class="spc-sub">${s.subtitle}</div>
      <div class="spc-moon">${s.moon[0] !== 'any' ? L('spellMoonToday') : ''}</div>
    </div>
  `).join('');
  wrap.querySelectorAll('.spell-preview-card').forEach(el => {
    el.addEventListener('click', () => openSpellById(el.dataset.spellId));
  });
}

function updatePremiumCards(isPremium) {
  document.querySelectorAll('.premium-card[data-spread]').forEach(el => {
    el.classList.toggle('unlocked', !!isPremium);
    if (!isPremium) {
      const spreadType = el.dataset.spread;
      const existing = el.querySelector('.blurred-preview');
      if (!existing) {
        el.insertAdjacentHTML('beforeend', renderBlurredSpreadPreview(spreadType));
      }
    } else {
      el.querySelector('.blurred-preview')?.remove();
    }
  });
}

// ── Карта дня ──────────────────────────────────────────────────────────────
async function loadDailyCard(zoneId, tapId) {
  const zone = document.getElementById(zoneId);
  const tap  = document.getElementById(tapId);
  if (!zone || !tap) return;
  tap.onclick = async () => {
    tap.onclick = null;
    zone.innerHTML = `<div style="text-align:center;padding:50px 0;color:var(--text2);font-size:14px;">${L('cardLoading')}</div>`;
    const data = await api('POST', `/readings/${state.userId}`, { spreadType: 'daily', lang: state.lang });
    if (data.ok && data.reading) renderDailyRevealed(zone, data.reading);
    else zone.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text2);">${L('cardError')}</div>`;
  };
}

function cardImg(card, cls = '') {
  if (card.image) {
    const rot = card.isReversed ? 'style="transform:rotate(180deg)"' : '';
    return `<img src="${card.image}" alt="${card.nameRu || card.name}" class="card-img ${cls}" ${rot} loading="lazy">`;
  }
  return `<span class="dr-emoji">${card.emoji}</span>`;
}

function renderDailyRevealed(zone, reading) {
  const card    = reading.cards[0];
  const name    = card.nameRu || card.name;
  const meaning = card.isReversed ? ru(card.reversed) : ru(card.upright);
  const userName = state.user?.firstName || '';
  const personalLabel = userName ? `<div class="dr-personal">✨ ${t('personalCard', state.lang)} ${userName}</div>` : '';
  zone.innerHTML = `<div class="daily-revealed" id="dr-${zone.id}">
    ${personalLabel}
    ${cardImg(card, 'daily-card-img')}
    <div class="dr-name">${name}</div>
    ${card.isReversed ? `<div class="dr-reversed"><span class="reversed-tag">${L('reversedTag')}</span></div>` : ''}
    <div class="dr-meaning">${meaning}</div>
    <div class="dr-actions">
      <div class="dr-hint">${L('cardTapHint')}</div>
      <button class="dr-share-btn" id="dr-share-${zone.id}">📲</button>
    </div>
  </div>`;
  document.getElementById(`dr-${zone.id}`).addEventListener('click', e => {
    if (e.target.closest('.dr-share-btn')) return;
    openCardDetail(card);
  });
  document.getElementById(`dr-share-${zone.id}`)?.addEventListener('click', e => {
    e.stopPropagation();
    shareCard(card, name, meaning);
  });
}

// ── Питання перед розкладом ────────────────────────────────────────────────
function showQuestionModal(spreadType) {
  const modal = document.getElementById('question-modal');
  const input = document.getElementById('question-input');
  if (!modal) { startReading(spreadType, ''); return; }
  input.value = '';
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 300);

  const doStart = () => {
    modal.classList.add('hidden');
    startReading(spreadType, input.value.trim());
  };
  document.getElementById('btn-ask-cards').onclick = doStart;
  document.getElementById('btn-skip-question').onclick = () => {
    modal.classList.add('hidden');
    startReading(spreadType, '');
  };
  modal.onclick = (e) => { if (e.target === modal) { modal.classList.add('hidden'); startReading(spreadType, ''); } };
}

// ── Таро: розкладання ──────────────────────────────────────────────────────
async function openSpread(spreadType) {
  const needsPremium = ['love', 'month', 'year', 'three_card'].includes(spreadType);
  if (needsPremium && !state.user?.isPremium) { showScreen('premium'); await loadPremiumScreen(); return; }
  showQuestionModal(spreadType);
}

async function startReading(spreadType, question) {
  state.currentQuestion = question;
  showScreen('reading');
  state.flippedCount = 0;
  document.getElementById('reading-meta').innerHTML = '';
  document.getElementById('reading-interpretation').textContent = L('shuffling');
  document.getElementById('reading-cards-wrap').innerHTML = '';
  document.getElementById('reading-summary-btn').classList.add('hidden');
  document.getElementById('ai-interpretation-block')?.classList.add('hidden');

  const badge = document.getElementById('reading-question-badge');
  if (badge) {
    if (question) { badge.textContent = question; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }

  const data = await api('POST', `/readings/${state.userId}`, { spreadType, lang: state.lang });
  if (!data.ok) { document.getElementById('reading-interpretation').textContent = L('readingError'); return; }
  state.currentReading = data.reading;
  renderReading(data.reading);
}

function renderReading(reading) {
  document.getElementById('reading-title').textContent = ru(reading.spreadName);
  const m = reading.meta;
  if (m) {
    document.getElementById('reading-meta').innerHTML = [
      `<div class="meta-pill">${m.zodiac?.emoji} <strong>${m.zodiac?.name}</strong></div>`,
      `<div class="meta-pill">🔢 <strong>${m.lifePath}</strong></div>`,
      `<div class="meta-pill">${m.moonPhase?.emoji} <strong>${m.moonPhase?.name}</strong></div>`,
    ].join('');
  }
  // Verdict badge
  const verdictEl = document.getElementById('reading-verdict');
  if (verdictEl) {
    const cfg = {
      positive: { icon: '✨', text: L('verdictPositive') || 'Энергия на вашей стороне' },
      caution:  { icon: '⚡', text: L('verdictCaution')  || 'День требует осознанности' },
      neutral:  { icon: '🔮', text: L('verdictNeutral')  || 'Всё зависит от ваших действий' },
    }[reading.verdict] || { icon: '🔮', text: L('verdictNeutral') || 'Всё зависит от ваших действий' };
    verdictEl.innerHTML = `<span class="vb-icon">${cfg.icon}</span><span>${cfg.text}</span>`;
    verdictEl.className = `reading-verdict verdict-${reading.verdict || 'neutral'}`;
    verdictEl.classList.remove('hidden');
  }
  document.getElementById('reading-interpretation').textContent = reading.interpretation || '';
  const wrap  = document.getElementById('reading-cards-wrap');
  const isGrid = reading.cards.length >= 4;
  wrap.className = `reading-cards-wrap${isGrid ? ' grid-layout' : ''}`;
  wrap.innerHTML  = reading.cards.map((c, i) => buildFlipCard(c, reading.positions[i], i)).join('');
  wrap.querySelectorAll('.flip-card-outer').forEach((el, i) => {
    el.style.opacity = '0'; el.style.transform = 'translateY(18px)';
    setTimeout(() => { el.style.transition = 'opacity .35s ease, transform .35s ease'; el.style.opacity = '1'; el.style.transform = ''; }, i * 110);
  });
  wrap.querySelectorAll('.flip-card').forEach((el, i) => el.addEventListener('click', () => flipCard(el, i, reading)));
}

function buildFlipCard(card, position, index) {
  return `<div class="flip-card-outer"><div class="flip-card" data-index="${index}" style="min-height:108px;">
    <div class="flip-front"><div class="card-back-face">
      <div class="cbf-pos">${ru(position)}</div><div class="cbf-star">✦</div>
      <div class="cbf-tap">${L('flipHint')}</div>
    </div></div>
    <div class="flip-back"></div>
  </div></div>`;
}

function flipCard(cardEl, index, reading) {
  if (cardEl.classList.contains('flipped')) { openCardDetail(reading.cards[index]); return; }
  const card    = reading.cards[index];
  const name    = card.nameRu || card.name;
  const meaning = card.isReversed ? ru(card.reversed) : ru(card.upright);
  const outer   = cardEl.closest('.flip-card-outer');
  const back    = cardEl.querySelector('.flip-back');
  back.style.display = 'block';
  back.innerHTML = `<div class="card-front-face">
    ${cardImg(card, 'flip-card-img')}
    <div class="cff-info">
      <div class="cff-pos">${ru(reading.positions[index])}</div>
      <div class="cff-name">${name}${card.isReversed ? '<span class="reversed-tag" style="font-size:10px;padding:1px 8px;">🔄</span>' : ''}</div>
      <div class="cff-meaning">${meaning}</div>
    </div>
  </div>`;
  back.querySelector('.card-front-face').addEventListener('click', () => openCardDetail(card));
  requestAnimationFrame(() => {
    const h = Math.max(cardEl.querySelector('.flip-front').offsetHeight, back.querySelector('.card-front-face').scrollHeight);
    cardEl.style.height = `${h}px`; outer.style.height = `${h}px`;
    requestAnimationFrame(() => {
      cardEl.classList.add('flipped');
      tg?.HapticFeedback?.impactOccurred?.('light');
      state.flippedCount++;
      if (state.flippedCount >= reading.cards.length) {
        document.getElementById('reading-summary-btn').classList.remove('hidden');
        setTimeout(() => document.getElementById('reading-scroll').scrollTo({ top: 99999, behavior: 'smooth' }), 400);
      }
    });
  });
}

function openCardDetail(card) {
  document.getElementById('card-detail-title').textContent = card.nameRu || card.name;
  document.getElementById('card-detail-content').innerHTML = `
    <div class="cd-hero">
      ${card.image ? `<img src="${card.image}" alt="${card.nameRu||card.name}" class="card-img cd-card-img" ${card.isReversed?'style="transform:rotate(180deg)"':''}>` : `<span class="cd-emoji">${card.emoji}</span>`}
      <div class="cd-name">${card.name}</div>
      ${card.nameUa ? `<div class="cd-name-sub">${card.nameUa}</div>` : ''}
      ${card.isReversed ? `<span class="reversed-tag">${L('reversedTagFull')}</span>` : ''}
    </div>
    <div class="cd-block"><div class="cd-block-title t-desc">${L('cardDescLabel')}</div><p>${ru(card.description)}</p></div>
    <div class="cd-block"><div class="cd-block-title t-upright">${L('cardUprightLabel')}</div><p>${ru(card.upright)}</p></div>
    <div class="cd-block"><div class="cd-block-title t-rev">${L('cardRevLabel')}</div><p>${ru(card.reversed)}</p></div>
  `;
  showScreen('card');
}

// ══ ЗАГОВОРЫ ════════════════════════════════════════════════════════════════

async function openSpellsScreen() {
  // Заговоры — только Премиум
  const isPremium = state.user?.isPremium || false;
  if (!isPremium) {
    showScreen('premium');
    await loadPremiumScreen();
    toast(L('spellsLockedToast'));
    return;
  }
  showScreen('spells');
  // Баннер фази місяця
  if (state.moonData) {
    const moon = state.moonData.moon;
    document.getElementById('spell-moon-banner').innerHTML = `
      <div class="smb-phase">${moon.emoji}</div>
      <div class="smb-name">${moon.name}</div>
      <div class="smb-desc">${getMoonMagicDesc(moon.energy)}</div>
    `;
  }
  // Категорії
  const data = await api('GET', '/spells/categories');
  if (!data.ok) return;
  document.getElementById('spell-cats').innerHTML = data.categories.map(c => `
    <div class="spell-cat-row" data-cat-id="${c.id}" data-cat-name="${c.name}" data-cat-color="${c.color}">
      <div class="scr-emoji">${c.emoji}</div>
      <div class="scr-info">
        <div class="scr-name">${c.name}</div>
        <div class="scr-desc">${c.desc}</div>
      </div>
      <div class="scr-arrow">→</div>
    </div>
  `).join('');
  document.querySelectorAll('.spell-cat-row').forEach(el => {
    el.addEventListener('click', () => openSpellCategory(el.dataset.catId, el.dataset.catName));
  });
}

function getMoonMagicDesc(energy) {
  const descRu = {
    new:     'Время загадывать желания и начинать новые ритуалы. Новолуние — самое мощное время для притяжения.',
    waxing:  'Растущая луна усиливает привороты, заговоры на деньги и красоту. Всё, что вы начнёте — будет расти.',
    first:   'Время активных действий и решений. Ритуалы на успех и карьеру сейчас особенно сильны.',
    gibbous: 'Луна почти полная. Заговоры достигают пика силы. Идеально для любовной магии.',
    full:    'Полнолуние — максимальная сила. Все заговоры работают в полную мощь. Магическое время!',
    waning:  'Убывающая луна — время очищения, избавления от негатива и снятия порчи.',
    last:    'Время завершения и отпускания. Ритуалы для освобождения от плохих связей.',
    dark:    'Тёмная луна — время тайных дел, защиты и работы с подсознанием.',
  };
  const descUa = {
    new:     'Час загадувати бажання і починати нові ритуали. Новолуння — найпотужніший час для притягнення.',
    waxing:  'Місяць, що росте, посилює привороти, заговори на гроші і красу. Все, що почнете — буде рости.',
    first:   'Час активних дій і рішень. Ритуали на успіх і карʼєру зараз особливо сильні.',
    gibbous: 'Місяць майже повний. Заговори досягають піку сили. Ідеально для любовної магії.',
    full:    'Повнолуння — максимальна сила. Всі заговори працюють на повну потужність. Магічний час!',
    waning:  'Спадний місяць — час очищення, позбавлення від негативу і зняття псування.',
    last:    'Час завершення і відпускання. Ритуали для звільнення від поганих звʼязків.',
    dark:    'Темний місяць — час таємних справ, захисту і роботи з підсвідомістю.',
  };
  const desc = state.lang === 'ua' ? descUa : descRu;
  return desc[energy] || (state.lang === 'ua' ? 'Час магії і ритуалів.' : 'Время магии и ритуалов.');
}

async function openSpellCategory(categoryId, categoryName) {
  showScreen('spell-list');
  document.getElementById('spell-list-title').textContent = categoryName;
  const data = await api('GET', `/spells/category/${categoryId}?userId=${state.userId}`);
  if (!data.ok) return;
  const content = document.getElementById('spell-list-content');
  content.innerHTML = `<div class="spell-list">${data.spells.map(s => buildSpellListItem(s)).join('')}</div>`;
  content.querySelectorAll('.spell-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const s = JSON.parse(el.dataset.spell);
      openSpellDetail(s, el.classList.contains('locked'));
    });
  });
}

function buildSpellListItem(s) {
  const powerDots = Array.from({ length: 5 }, (_, i) =>
    `<div class="power-dot${i < s.power ? ' active' : ''}"></div>`).join('');
  const moonLabels = s.moon.filter(m => m !== 'any')
    .map(m => moonPhaseName(m)).slice(0, 2)
    .map(n => `<span class="sli-tag moon">🌙 ${n}</span>`).join('');
  return `<div class="spell-list-item${s.locked ? ' locked' : ''}" data-spell='${JSON.stringify(s).replace(/'/g, '&#39;')}'>
    ${s.locked ? '<div class="sli-lock">🔒</div>' : ''}
    <div class="sli-emoji">${s.emoji}</div>
    <div class="sli-info">
      <div class="sli-title">${s.title}</div>
      <div class="sli-sub">${s.subtitle}</div>
      <div class="sli-tags">
        <span class="sli-tag">⏱ ${s.duration}</span>
        <span class="sli-tag">🕯 ${s.timeOfDay}</span>
        ${moonLabels}
      </div>
      <div class="power-dots">${powerDots}</div>
    </div>
  </div>`;
}

async function openSpellById(spellId) {
  const data = await api('GET', `/spells/${spellId}?userId=${state.userId}`);
  if (!data.ok) {
    if (data.error === 'premium_required') {
      showSpellPaywall(spellId);
      return;
    }
    toast(L('spellNotFound')); return;
  }
  // Якщо був автоматично списаний кредит — показуємо toast
  if (data.usedCredit) {
    state.spellCredits = data.creditsLeft ?? Math.max(0, (state.spellCredits || 0) - 1);
    toast(`${L('spellCreditUsedMsg')} ${state.spellCredits}`);
    tg?.HapticFeedback?.impactOccurred?.('light');
  }
  openSpellDetail(data.spell, false);
}

function showSpellPaywall(spellId) {
  const credits = state.spellCredits || 0;
  const content = document.getElementById('spell-detail-content');
  document.getElementById('spell-detail-title').textContent = L('spellClosed');

  // Якщо є кредити — пропонуємо використати
  const creditsBlock = credits > 0 ? `
    <div class="spw-option spw-credits" id="spw-use-credit">
      <div class="spwo-emoji">🕯️</div>
      <div class="spwo-info">
        <div class="spwo-title">${L('spellUseCreditBtn')}</div>
        <div class="spwo-sub">У вас ${credits} ${L('spellUseCreditSub')}</div>
      </div>
      <div class="spwo-price" style="color:var(--gold)">✨</div>
    </div>
  ` : '';

  content.innerHTML = `
    <div class="spell-paywall">
      <div class="spw-icon">🕯️</div>
      <div class="spw-title">${L('spellLockedTitle').replace('\n','<br>')}</div>
      <div class="spw-sub">${credits > 0 ? `У вас ${credits} ${L('spellHasCreditsNow')}` : L('spellChooseHow')}</div>
      <div class="spw-options">
        ${creditsBlock}
        <div class="spw-option spw-single" id="spw-buy-single" data-spell-id="${spellId}">
          <div class="spwo-emoji">🕯️</div>
          <div class="spwo-info">
            <div class="spwo-title">${L('spellBuyOne')}</div>
            <div class="spwo-sub">${L('spellBuyOneSub')}</div>
          </div>
          <div class="spwo-price">⭐ 30</div>
        </div>
        <div class="spw-option spw-popular" id="spw-buy-pack">
          <div class="spwo-badge">${L('spellPackBadge')}</div>
          <div class="spwo-emoji">✨</div>
          <div class="spwo-info">
            <div class="spwo-title">${L('spellBuyPack')}</div>
            <div class="spwo-sub">${L('spellBuyPackSub')}</div>
          </div>
          <div class="spwo-price">⭐ 99</div>
        </div>
        <div class="spw-option" id="spw-premium">
          <div class="spwo-emoji">👑</div>
          <div class="spwo-info">
            <div class="spwo-title">${L('spellPremium')}</div>
            <div class="spwo-sub">${L('spellPremiumSub')}</div>
          </div>
          <div class="spwo-price">від ⭐ 299</div>
        </div>
      </div>
    </div>
  `;

  // Використати кредит (якщо є)
  document.getElementById('spw-use-credit')?.addEventListener('click', async () => {
    await openSpellById(spellId);
  });

  document.getElementById('spw-buy-single')?.addEventListener('click', async () => {
    await buySpell('spell_single', spellId);
  });
  document.getElementById('spw-buy-pack')?.addEventListener('click', async () => {
    await buySpell('spell_pack5', spellId);
  });
  document.getElementById('spw-premium')?.addEventListener('click', async () => {
    showScreen('premium'); await loadPremiumScreen();
  });

  showScreen('spell-detail');
}

async function buySpell(purchaseId, spellId) {
  const btn = purchaseId === 'spell_single'
    ? document.getElementById('spw-buy-single')
    : document.getElementById('spw-buy-pack');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

  try {
    const data = await api('POST', '/payments/invoice/spell', { purchaseId, userId: state.userId, spellId });
    if (!data.ok) throw new Error(data.error);
    tg?.openInvoice?.(data.link, async (status) => {
      if (status === 'paid') {
        tg?.HapticFeedback?.notificationOccurred?.('success');
        toast(L('paymentSuccess'));

        if (purchaseId === 'spell_single' && spellId) {
          // Чекаємо поки з'явиться в spell_purchases (перевіряємо через /spells/:id)
          const result = await pollUntil(
            () => api('GET', `/spells/${spellId}?userId=${state.userId}`),
            d => d.ok && !d.error
          );
          if (result) {
            toast(L('spellOpenForever'));
            openSpellDetail(result.spell, false);
          } else {
            toast(L('spellOpenSoon'));
          }

        } else if (purchaseId === 'spell_pack5') {
          const prevCredits = state.spellCredits || 0;
          // Чекаємо поки кредити збільшаться
          const ps = await pollUntil(
            () => api('GET', `/users/${state.userId}/premium-status`),
            d => d.ok && (d.spellCredits || 0) > prevCredits
          );
          if (ps) {
            state.spellCredits = ps.spellCredits || 0;
            toast(`✨ ${state.spellCredits} ${L('spellCreditsOnAccount')}`);
          } else {
            toast(L('spellPackCredits'));
          }
          if (spellId) await openSpellById(spellId);
        }
      } else if (status === 'cancelled') {
        toast(L('paymentCancelled'));
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      }
    });
  } catch (e) {
    toast(L('invoiceError'));
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

function openSpellDetail(spell, locked) {
  if (locked) { showSpellPaywall(spell.id); return; }
  state.currentSpell = spell;
  document.getElementById('spell-detail-title').textContent = spell.title;

  const powerDots = Array.from({ length: 5 }, (_, i) =>
    `<div class="sd-power-dot${i < spell.power ? ' active' : ''}"></div>`).join('');
  const moonTags = spell.moon.filter(m => m !== 'any')
    .map(m => `<span class="sd-tag moon-tag">🌙 ${moonPhaseName(m)}</span>`).join('');

  const ingredientsHtml = spell.ingredients
    .map(i => `<li>${i}</li>`).join('');
  const stepsHtml = spell.steps
    .map(s => `<li>${s}</li>`).join('');

  document.getElementById('spell-detail-content').innerHTML = `
    <div class="sd-hero">
      <span class="sd-emoji">${spell.emoji}</span>
      <div class="sd-title">${spell.title}</div>
      <div class="sd-sub">${spell.subtitle}</div>
      <div class="sd-tags">
        <span class="sd-tag time-tag">⏰ ${spell.timeOfDay}</span>
        <span class="sd-tag">📅 ${spell.duration}</span>
        ${moonTags}
      </div>
      <div class="sd-power">${powerDots}</div>
    </div>

    <div class="sd-block">
      <div class="sd-block-title ingr">${L('spellIngrTitle')}</div>
      <ul class="sd-ingredients">${ingredientsHtml}</ul>
    </div>

    <div class="sd-block">
      <div class="sd-block-title steps">${L('spellStepsTitle')}</div>
      <ol class="sd-steps">${stepsHtml}</ol>
    </div>

    <!-- Таймер читання заговору -->
    <div class="sd-timer-block" id="spell-timer-block">
      <div class="timer-label">${L('spellTimerLabel')}</div>
      <div class="timer-display" id="timer-display">0:00</div>
      <div class="timer-repeat" id="timer-repeat">${spell.steps.length > 3 ? L('spellTimerRepeat3') : L('spellTimerRepeat7')}</div>
      <button class="timer-btn" id="timer-btn" onclick="toggleTimer()">${L('spellTimerStart')}</button>
    </div>

    <div class="sd-block">
      <div class="sd-block-title spell-text">${L('spellTextTitle')}</div>
      <div class="sd-spell-text">${spell.spell}</div>
    </div>

    ${spell.warning ? `<div class="sd-block">
      <div class="sd-block-title warn">${L('spellWarningTitle')}</div>
      <div class="sd-warning">${spell.warning}</div>
    </div>` : ''}

    ${spell.tip ? `<div class="sd-block">
      <div class="sd-block-title tip">${L('spellTipTitle')}</div>
      <div class="sd-tip">${spell.tip}</div>
    </div>` : ''}

    <div style="height:20px"></div>
  `;

  showScreen('spell-detail');
}

// ── Таймер заговору ────────────────────────────────────────────────────────
window.toggleTimer = function() {
  const btn = document.getElementById('timer-btn');
  const disp = document.getElementById('timer-display');
  if (state.spellTimer) {
    clearInterval(state.spellTimer);
    state.spellTimer = null;
    btn.textContent = L('spellTimerResume');
    btn.classList.remove('running');
  } else {
    btn.textContent = L('spellTimerPause');
    btn.classList.add('running');
    state.spellTimer = setInterval(() => {
      state.spellTimerSec++;
      const m = Math.floor(state.spellTimerSec / 60);
      const s = state.spellTimerSec % 60;
      disp.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
    tg?.HapticFeedback?.impactOccurred?.('medium');
  }
};

function resetTimer() {
  if (state.spellTimer) { clearInterval(state.spellTimer); state.spellTimer = null; }
  state.spellTimerSec = 0;
}

// ══ ЛУННЫЙ КАЛЕНДАРЬ ════════════════════════════════════════════════════════
async function renderMoonCalendar() {
  const content = document.getElementById('moon-content');
  content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text2);">${L('moonCalLoading')}</div>`;

  const data = await api('GET', `/spells/today/${state.userId}`);
  if (!data.ok) return;
  const moon = data.moon;
  state.moonData = data;

  // 7-денний прогноз
  const weekPills = generateWeekForecast();

  const doItems = getMoonDoList(moon.energy).map(item =>
    `<div class="moon-list-item"><div class="moon-list-item-icon">✅</div><div>${item}</div></div>`).join('');
  const dontItems = getMoonDontList(moon.energy).map(item =>
    `<div class="moon-list-item"><div class="moon-list-item-icon">❌</div><div>${item}</div></div>`).join('');

  const todaySpells = data.spells.slice(0, 4).map(s => `
    <div class="moon-spell-card${s.locked ? ' locked' : ''}" data-spell-id="${s.id}">
      <div class="msc-emoji">${s.emoji}</div>
      <div class="msc-info">
        <div class="msc-title">${s.title}</div>
        <div class="msc-sub">${s.subtitle}</div>
      </div>
      <div class="msc-lock">${s.locked ? '🔒' : '→'}</div>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="moon-today">
      <div class="mt-phase">${moon.emoji}</div>
      <div class="mt-name">${moon.name}</div>
      <div class="mt-date">${todayDateStr()}</div>
      <div class="mt-energy">${getMoonMagicDesc(moon.energy)}</div>
    </div>

    <div class="moon-section-title">${L('moonWeekTitle')}</div>
    <div class="moon-week">${weekPills}</div>

    <div class="moon-section-title">${L('moonDoTitle')}</div>
    <div class="moon-do-list">${doItems}</div>

    <div class="moon-section-title">${L('moonDontTitle')}</div>
    <div class="moon-dont-list">${dontItems}</div>

    <div class="moon-section-title">${L('moonSpellsTitle')}</div>
    <div class="moon-spells-today">${todaySpells}</div>

    <div style="height:32px"></div>
  `;

  content.querySelectorAll('.moon-spell-card').forEach(el => {
    el.addEventListener('click', () => openSpellById(el.dataset.spellId));
  });
}

function calcMoonEmoji(date) {
  const REF = new Date('2000-01-06T00:00:00Z').getTime();
  const CYCLE = 29.530588853;
  const elapsed = (date.getTime() - REF) / (1000 * 60 * 60 * 24);
  const age = ((elapsed % CYCLE) + CYCLE) % CYCLE;
  if (age < 1.85)  return '🌑';
  if (age < 7.38)  return '🌒';
  if (age < 9.22)  return '🌓';
  if (age < 14.77) return '🌔';
  if (age < 16.61) return '🌕';
  if (age < 22.15) return '🌖';
  if (age < 23.99) return '🌗';
  return '🌘';
}

function generateWeekForecast() {
  const days = T[state.lang]?.days || T.ru.days;
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return `<div class="moon-day-pill${i === 0 ? ' today' : ''}">
      <div class="mdp-day">${days[d.getDay()]}</div>
      <div class="mdp-emoji">${calcMoonEmoji(d)}</div>
      <div class="mdp-date">${d.getDate()}</div>
    </div>`;
  }).join('');
}

function getMoonDoList(energy) {
  const listsRu = {
    new:     ['Загадывать желания', 'Начинать новые дела', 'Ставить финансовые цели', 'Медитации на притяжение', 'Покупать новые вещи'],
    waxing:  ['Привороты и заговоры на любовь', 'Ритуалы на деньги', 'Заговоры на красоту', 'Посадка растений', 'Начинать проекты'],
    first:   ['Активные действия', 'Карьерные ритуалы', 'Заговоры на успех', 'Подписание договоров', 'Делать покупки'],
    gibbous: ['Завершать ритуалы', 'Любовная магия', 'Ритуалы на изобилие', 'Благодарственные практики'],
    full:    ['Мощные ритуалы на желание', 'Зарядка воды', 'Ритуалы на красоту', 'Медитации', 'Все виды магии'],
    waning:  ['Снятие порчи', 'Очищение дома', 'Заговоры от болезни', 'Избавление от долгов', 'Разрыв плохих связей'],
    last:    ['Завершение отношений', 'Уборка и очищение', 'Снятие блоков', 'Посты и голодание'],
    dark:    ['Тайные ритуалы', 'Защита и обереги', 'Работа с интуицией', 'Очищение кристаллов'],
  };
  const listsUa = {
    new:     ['Загадувати бажання', 'Починати нові справи', 'Ставити фінансові цілі', 'Медитації на притягнення', 'Купувати нові речі'],
    waxing:  ['Привороти і заговори на кохання', 'Ритуали на гроші', 'Заговори на красу', 'Посадка рослин', 'Починати проекти'],
    first:   ['Активні дії', 'Карʼєрні ритуали', 'Заговори на успіх', 'Підписання договорів', 'Робити покупки'],
    gibbous: ['Завершувати ритуали', 'Любовна магія', 'Ритуали на достаток', 'Практики вдячності'],
    full:    ['Потужні ритуали на бажання', 'Зарядка води', 'Ритуали на красу', 'Медитації', 'Всі види магії'],
    waning:  ['Зняття псування', 'Очищення дому', 'Заговори від хвороби', 'Позбавлення від боргів', 'Розрив поганих звʼязків'],
    last:    ['Завершення стосунків', 'Прибирання і очищення', 'Зняття блоків', 'Піст і голодування'],
    dark:    ['Таємні ритуали', 'Захист і обереги', 'Робота з інтуїцією', 'Очищення кристалів'],
  };
  const lists = state.lang === 'ua' ? listsUa : listsRu;
  return lists[energy] || lists.full;
}

function getMoonDontList(energy) {
  const listsRu = {
    new:     ['Стричь волосы', 'Давать деньги в долг', 'Проводить очистительные ритуалы'],
    waxing:  ['Ритуалы на избавление', 'Снятие порчи', 'Давать деньги взаймы'],
    first:   ['Затяжные медитации', 'Ритуалы на прошлое'],
    gibbous: ['Конфликтовать', 'Начинать диеты'],
    full:    ['Давать деньги в долг', 'Принимать важные решения', 'Конфликтовать'],
    waning:  ['Привороты на любовь', 'Заговоры на деньги', 'Новые начинания'],
    last:    ['Свадьбы и сватовство', 'Начинать бизнес', 'Крупные покупки'],
    dark:    ['Привлекать новых людей', 'Публичные выступления', 'Подписывать договоры'],
  };
  const listsUa = {
    new:     ['Стригти волосся', 'Давати гроші в борг', 'Проводити очищувальні ритуали'],
    waxing:  ['Ритуали на позбавлення', 'Зняття псування', 'Давати гроші позику'],
    first:   ['Тривалі медитації', 'Ритуали на минуле'],
    gibbous: ['Конфліктувати', 'Починати дієти'],
    full:    ['Давати гроші в борг', 'Приймати важливі рішення', 'Конфліктувати'],
    waning:  ['Привороти на кохання', 'Заговори на гроші', 'Нові починання'],
    last:    ['Весілля і сватання', 'Починати бізнес', 'Великі покупки'],
    dark:    ['Залучати нових людей', 'Публічні виступи', 'Підписувати договори'],
  };
  const lists = state.lang === 'ua' ? listsUa : listsRu;
  return lists[energy] || (state.lang === 'ua' ? ['Приймати важливі рішення'] : ['Принимать важные решения']);
}

function moonPhaseName(energy) {
  const n = T[state.lang]?.moonPhaseNames || T.ru.moonPhaseNames;
  return n[energy] || energy;
}

function todayDateStr() {
  const locale = state.lang === 'ua' ? 'uk-UA' : 'ru-RU';
  return new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── История ────────────────────────────────────────────────────────────────
async function loadHistory() {
  const el = document.getElementById('history-content');
  el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text2);">${L('loading2')}</div>`;
  const data = await api('GET', `/readings/${state.userId}`);
  if (!data.ok || !data.readings?.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🃏</div><h3>${L('noReadings')}</h3><p>${L('noReadingsDesc')}</p></div>`;
    return;
  }
  el.innerHTML = data.readings.map(r => {
    const pills = r.cards.map(c => `<span class="h-pill">${c.emoji} ${c.nameRu || c.name}${c.isReversed ? ' 🔄' : ''}</span>`).join('');
    return `<div class="history-item">
      <div class="history-head"><div class="history-spread">${ru(r.spreadName)}</div><div class="history-date">${fmtDate(r.createdAt)}</div></div>
      ${r.interpretation ? `<div class="history-interp">${r.interpretation}</div>` : ''}
      <div class="history-pills">${pills}</div>
    </div>`;
  }).join('');
}

// ── Навігація ──────────────────────────────────────────────────────────────
function initNav() {
  // Назад data-to
  document.querySelectorAll('.back-btn[data-to]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.to, 'left'));
  });

  // Назад з карти Таро
  document.getElementById('btn-back-card').addEventListener('click', () => showScreen(state.prevScreen, 'left'));

  // Назад з деталей заговору — зупиняємо таймер
  document.getElementById('btn-back-spell').addEventListener('click', () => {
    resetTimer();
    showScreen(state.prevScreen, 'left');
  });

  // Навігація з головного екрану (всі клітинки nav-cell)
  document.querySelectorAll('.nav-cell[data-screen]').forEach(el => {
    el.addEventListener('click', async () => {
      const s = el.dataset.screen;
      if (s === 'tarot')        { showScreen('tarot'); }
      else if (s === 'spells')     { await openSpellsScreen(); }
      else if (s === 'moon')       { showScreen('moon'); await renderMoonCalendar(); }
      else if (s === 'dreams')     { showScreen('dreams'); await initDreamsScreen(); }
      else if (s === 'premium')    { showScreen('premium'); await loadPremiumScreen(); }
      else if (s === 'numerology') { showScreen('numerology'); await loadNumerologyScreen(); }
      else if (s === 'horoscope')  { showScreen('horoscope'); loadHoroscopeScreen(); }
      else if (s === 'compat')     { showScreen('compat'); initCompatScreen(); }
      else if (s === 'diary')      { showScreen('diary'); loadDiaryScreen(); }
    });
  });

  // Кнопка «Все заговоры →» на головному
  document.getElementById('btn-all-spells')?.addEventListener('click', () => openSpellsScreen());

  // Розклади Таро
  document.querySelector('[data-spread="three_card"]')?.addEventListener('click', () => openSpread('three_card'));
  document.querySelectorAll('.premium-card[data-spread]').forEach(el => el.addEventListener('click', () => openSpread(el.dataset.spread)));

  // Заговоры → категорія (повторюємо і в tarot-screen)
  document.querySelectorAll('.premium-card[data-spread]').forEach(el => el.addEventListener('click', () => openSpread(el.dataset.spread)));

  // Кнопка AI-інтерпретації
  document.getElementById('btn-show-summary').addEventListener('click', async () => {
    const r = state.currentReading;
    if (!r) return;

    const summaryBtn = document.getElementById('reading-summary-btn');
    const aiBlock    = document.getElementById('ai-interpretation-block');
    const aiText     = document.getElementById('ai-interpretation-text');
    if (!aiBlock || !aiText) return;

    summaryBtn.classList.add('hidden');
    aiBlock.classList.remove('hidden');
    aiText.innerHTML = `<div class="aib-loading"><div class="aib-spinner"></div><span>${L('aiLoading')}</span></div>`;

    tg?.HapticFeedback?.impactOccurred?.('medium');

    try {
      const data = await api('POST', '/ai/interpret', {
        cards:      r.cards,
        positions:  r.positions,
        spreadName: r.spreadName,
        question:   state.currentQuestion || '',
        userAstro:  state.user?.astro || null,
        lang:       state.lang,
      });
      if (data.ok && data.interpretation) {
        aiText.textContent = data.interpretation;
        tg?.HapticFeedback?.notificationOccurred?.('success');
      } else {
        aiText.textContent = r.interpretation || L('aiDefault');
      }
    } catch (_) {
      aiText.textContent = r.interpretation || L('aiDefault');
    }

    // Кнопка "Поделиться" після AI
    document.getElementById('btn-share-reading')?.addEventListener('click', () => {
      shareReading(r, aiText.textContent);
    });

    setTimeout(() => document.getElementById('reading-scroll')?.scrollTo({ top: 99999, behavior: 'smooth' }), 200);
  });

  // Кнопка share розкладу
  document.getElementById('btn-share-reading')?.addEventListener('click', () => {
    const r = state.currentReading;
    const aiText = document.getElementById('ai-interpretation-text')?.textContent || '';
    if (r) shareReading(r, aiText);
  });

  // ── Преміум: вибір плану ──────────────────────────────────────────────────
  let selectedPlan = 'premium_90';
  document.querySelectorAll('.plan-card').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      selectedPlan = el.dataset.plan;
      const labels = T[state.lang]?.premiumPlanLabels || T.ru.premiumPlanLabels;
      document.getElementById('btn-buy-label').textContent = `${L('premiumPayBtn').replace(' 👑', '')} ${labels[selectedPlan]} 👑`;
      tg?.HapticFeedback?.selectionChanged?.();
    });
    if (el.dataset.plan === selectedPlan) el.classList.add('selected');
  });
  document.getElementById('btn-buy-label').textContent = L('premiumDefaultPlan');

  document.getElementById('btn-buy-premium').addEventListener('click', () => guardedCall('buy_premium', async () => {
    const btn = document.getElementById('btn-buy-premium');
    btn.disabled = true;
    document.getElementById('btn-buy-label').textContent = L('premiumCreatingInvoice');
    try {
      const data = await api('POST', '/payments/invoice', { planId: selectedPlan, userId: state.userId });
      if (!data.ok) throw new Error(data.error);
      tg?.openInvoice?.(data.link, async (status) => {
        if (status === 'paid') {
          tg?.HapticFeedback?.notificationOccurred?.('success');
          toast(L('premiumPaySuccess'));
          // Поллінг: чекаємо isPremium=true (webhook може прийти з затримкою до 9с)
          const ps = await pollUntil(
            () => api('GET', `/users/${state.userId}/premium-status`),
            d => d.ok && d.isPremium
          );
          if (ps) {
            state.user.isPremium = ps.isPremium;
            state.spellCredits   = ps.spellCredits || 0;
            updatePremiumBadge(ps);
            updatePremiumCards(ps.isPremium);
            updateThreeCardLock(ps.isPremium);
            if (state.moonData?.spells) renderSpellsPreview(state.moonData.spells);
            toast(L('premiumActivated'));
          } else {
            toast(L('premiumPayPending'));
          }
          showScreen('home', 'left');
        } else if (status === 'cancelled') {
          toast(L('paymentCancelled'));
        }
      });
    } catch (_) {
      toast(L('invoiceError'));
    } finally {
      btn.disabled = false;
      document.getElementById('btn-buy-label').textContent = L('premiumPayBtn');
    }
  }));

  // ── Кнопка "Пригласить подругу" на преміум-екрані ────────────────────────
  document.getElementById('btn-share-ref')?.addEventListener('click', () => shareRefLink());

  // Сонник — кнопка пошуку
  document.getElementById('btn-dream-search')?.addEventListener('click', () => {
    const sym = document.getElementById('dream-input')?.value?.trim();
    if (sym) searchDream(sym);
  });
  document.getElementById('dream-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const sym = e.target.value.trim();
      if (sym) searchDream(sym);
    }
  });

  // Профіль
  document.getElementById('btn-profile')?.addEventListener('click', () => {
    showScreen('profile'); loadProfileScreen();
  });

  // Підтримка
  document.getElementById('btn-support')?.addEventListener('click', async () => {
    showScreen('support');
    await loadSupportMessages();
  });
  document.getElementById('support-send')?.addEventListener('click', sendSupportMessage);
  document.getElementById('support-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSupportMessage(); }
  });

  // Преміум з навігації
  document.querySelectorAll('[data-screen="premium"]').forEach(el => {
    el.addEventListener('click', async () => { showScreen('premium'); await loadPremiumScreen(); });
  });

  // Історія
  document.getElementById('btn-history').addEventListener('click', async () => { showScreen('history'); await loadHistory(); });
}

// ── Преміум екран ──────────────────────────────────────────────────────────
async function loadPremiumScreen() {
  const ps = await api('GET', `/users/${state.userId}/premium-status`);
  if (!ps.ok) return;
  renderReferralProgress(ps.refBonus || 0);
  const invited = document.getElementById('fpb-invited');
  if (invited && ps.refBonus > 0) {
    const single = L('premiumInvitedSingle');
    const many   = L('premiumInvitedMany');
    invited.innerHTML = `${L('premiumInvitedTxt')} <b>${ps.refBonus}</b> ${ps.refBonus === 1 ? single : many} — заробила <b>${ps.refBonus}</b> ${L('premiumEarnedDays')}`;
  }
  if (ps.isPremium && ps.daysLeft !== null) {
    const hero = document.querySelector('.premium-hero .premium-sub');
    if (hero) hero.innerHTML = `${L('premiumStatusActive')} <b>${ps.daysLeft}</b> ${L('premiumStatusDays')}`;
  }
}

// ── Реферальне посилання ───────────────────────────────────────────────────
async function shareRefLink() {
  try {
    const botInfo = await api('GET', '/status');
    const botName = botInfo.botUsername || 'MagicCabinetBot';
    const refLink = `https://t.me/${botName}?start=ref_${state.userId}`;
    const text    = L('refText');
    if (tg?.shareURL) {
      tg.shareURL(refLink, text);
    } else if (navigator.share) {
      await navigator.share({ text: `${text}\n${refLink}` });
    } else {
      await navigator.clipboard.writeText(refLink);
      toast(L('refCopied'));
    }
  } catch (_) { toast(L('shareErr')); }
}

// ── Підтримка ──────────────────────────────────────────────────────────────
async function loadSupportMessages() {
  const wrap = document.getElementById('support-messages');
  const data = await api('GET', `/support/messages/${state.userId}`);
  const msgs = data.ok ? data.messages : [];
  if (!msgs.length) {
    wrap.innerHTML = `<div class="support-intro"><div class="support-intro-icon">🔮</div><div class="support-intro-text">${L('supportIntro')}</div></div>`;
    return;
  }
  wrap.innerHTML = msgs.map(m => `
    <div class="support-msg ${m.from === 'user' ? 'msg-user' : 'msg-admin'}">
      <div class="msg-bubble">${m.text}</div>
      <div class="msg-time">${fmtDate(m.at)}</div>
    </div>
  `).join('');
  wrap.scrollTop = wrap.scrollHeight;
}

async function sendSupportMessage() {
  const inp  = document.getElementById('support-input');
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  inp.style.height = '';
  const wrap = document.getElementById('support-messages');
  // Показуємо одразу
  wrap.insertAdjacentHTML('beforeend', `
    <div class="support-msg msg-user">
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">${L('supportSending')}</div>
    </div>
  `);
  wrap.scrollTop = wrap.scrollHeight;
  tg?.HapticFeedback?.impactOccurred?.('light');
  const data = await api('POST', '/support/message', { userId: state.userId, text });
  if (!data.ok) toast(L('supportSendErr'));
}

// ── Сонник ────────────────────────────────────────────────────────────────
const DREAM_POPULAR = ['вода', 'змея', 'деньги', 'огонь', 'полет', 'зубы', 'дом', 'свадьба', 'кровь', 'беременность'];

async function initDreamsScreen() {
  // Chips (популярні символи)
  const chipsEl = document.getElementById('dreams-chips');
  if (chipsEl && !chipsEl.dataset.init) {
    chipsEl.dataset.init = '1';
    DREAM_POPULAR.forEach(sym => {
      const ch = document.createElement('button');
      ch.className = 'dream-chip';
      ch.textContent = sym;
      ch.addEventListener('click', () => {
        document.getElementById('dream-input').value = sym;
        searchDream(sym);
      });
      chipsEl.appendChild(ch);
    });
  }

  // Список всіх символів
  const listEl = document.getElementById('dreams-list');
  if (listEl && !listEl.dataset.init) {
    listEl.dataset.init = '1';
    const data = await api('GET', '/spells/dreams/list');
    if (data.ok) {
      listEl.innerHTML = data.dreams.map(d => `
        <div class="dream-list-item" data-symbol="${d.symbol}">
          <span class="dli-icon">${d.positive === true ? '✨' : d.positive === false ? '⚠️' : '🌙'}</span>
          <span class="dli-name">${d.symbol}</span>
          <span class="dli-card">${d.card_hint}</span>
        </div>
      `).join('');
      listEl.querySelectorAll('.dream-list-item').forEach(el => {
        el.addEventListener('click', () => {
          const sym = el.dataset.symbol;
          document.getElementById('dream-input').value = sym;
          searchDream(sym);
          document.getElementById('dream-result').scrollIntoView({ behavior: 'smooth' });
        });
      });
    }
  }
}

async function searchDream(symbol) {
  const resultEl = document.getElementById('dream-result');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `<div class="dream-loading">🔮 Читаем сны...</div>`;

  const lang = state.lang || 'ru';
  const data = await api('GET', `/spells/dreams/interpret?symbol=${encodeURIComponent(symbol)}&lang=${lang}&userId=${state.userId}`);

  if (!data.ok || !data.found) {
    resultEl.innerHTML = `<div class="dream-not-found">
      <div class="dnf-icon">🌙</div>
      <div class="dnf-text">Символ <b>${symbol}</b> не найден в базе.<br>Попробуй другое слово.</div>
    </div>`;
    return;
  }

  const posIcon = data.positive === true ? '✨' : data.positive === false ? '⚠️' : '🌙';
  const posText = data.positive === true ? 'Добрый знак' : data.positive === false ? 'Предупреждение' : 'Нейтральный';

  if (data.locked) {
    resultEl.innerHTML = `
      <div class="dream-result-card">
        <div class="drc-symbol">${posIcon} ${data.symbol}</div>
        <div class="drc-badge">${posText}</div>
        <div class="drc-tarot">Карта Таро: <b>${data.card_hint}</b></div>
        <div class="drc-preview">${data.preview}</div>
        <div class="drc-locked">
          <div class="drc-lock-icon">🔒</div>
          <div class="drc-lock-text">Полное толкование — только Премиум</div>
          <button class="btn-primary btn-sm" id="btn-dream-premium">Открыть Премиум 👑</button>
        </div>
      </div>`;
    document.getElementById('btn-dream-premium')?.addEventListener('click', async () => {
      showScreen('premium'); await loadPremiumScreen();
    });
  } else {
    resultEl.innerHTML = `
      <div class="dream-result-card">
        <div class="drc-symbol">${posIcon} ${data.symbol}</div>
        <div class="drc-badge ${data.positive === true ? 'badge-good' : data.positive === false ? 'badge-warn' : ''}">${posText}</div>
        <div class="drc-tarot">Карта Таро: <b>${data.card_hint}</b></div>
        <div class="drc-meaning">${data.meaning}</div>
      </div>`;
  }

  tg?.HapticFeedback?.impactOccurred?.('light');
}

// ── Share card ─────────────────────────────────────────────────────────────
async function shareCard(card, name, meaning) {
  try {
    const botInfo = await api('GET', '/status');
    const botName = botInfo.botUsername || 'MagicCabinetBot';
    const link = `https://t.me/${botName}?start=ref_${state.userId}`;
    const text = `🃏 Моя карта дня — *${name}*\n_${meaning.slice(0, 100)}_\n\n✨ Узнай свою карту в Магическом кабинете!`;
    if (tg?.shareURL) {
      tg.shareURL(link, text);
    } else if (navigator.share) {
      await navigator.share({ text: `${text}\n${link}` });
    } else {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      toast(L('copied'));
    }
  } catch (_) { toast(L('shareErr')); }
}

// ── Share reading (з AI-інтерпретацією) ────────────────────────────────────
async function shareReading(reading, aiText) {
  try {
    const botInfo = await api('GET', '/status');
    const botName = botInfo.botUsername || 'MagicCabinetBot';
    const link = `https://t.me/${botName}?start=ref_${state.userId}`;
    const cardNames = reading.cards.map(c => `${c.emoji} ${c.nameRu || c.name}`).join(', ');
    const spreadName = typeof reading.spreadName === 'object'
      ? (reading.spreadName.ru || reading.spreadName.ua || 'Расклад')
      : reading.spreadName;
    const preview = aiText ? aiText.slice(0, 150) + (aiText.length > 150 ? '...' : '') : '';
    const text = `🔮 Мой расклад Таро — ${spreadName}\n🃏 ${cardNames}\n\n${preview}\n\n✨ Получи своё персональное предсказание!`;
    if (tg?.shareURL) {
      tg.shareURL(link, text);
    } else if (navigator.share) {
      await navigator.share({ text: `${text}\n${link}` });
    } else {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      toast(L('copied'));
    }
  } catch (_) { toast(L('shareErr')); }
}

// ══ ОНБОРДИНГ ═══════════════════════════════════════════════════════════════

function renderOnboarding(user) {
  const nameEl = document.getElementById('onb-name');
  const grid   = document.getElementById('onb-grid');
  const lpBlock = document.getElementById('onb-lp-block');
  const doneBtn = document.getElementById('btn-onboarding-done');
  const titleEl = document.getElementById('onb-title');
  // Якщо екрану онбордингу немає — одразу на головну
  if (!nameEl || !grid) throw new Error('onboarding-screen-missing');

  const lifePathNames = T[state.lang]?.lifePathNames || T.ru.lifePathNames;
  nameEl.textContent = user.firstName || 'Провидец';
  if (titleEl) titleEl.innerHTML = `${L('onbTitle')}<br><span id="onb-name">${user.firstName || ''}</span>`;

  const a = user.astro;
  const cards = [
    { icon: a?.zodiac?.emoji || '⭐', title: a?.zodiac?.name || '...', sub: a?.zodiac?.element ? `${L('elementWord')} ${a.zodiac.element}` : L('zodiacSignWord') },
    { icon: '🔢', title: `${L('myPath')} ${a?.lifePath || '?'}`, sub: lifePathNames[a?.lifePath] || L('numSub') },
    { icon: a?.moonPhase?.emoji || '🌙', title: a?.moonPhase?.name || '...', sub: L('birthMoon') },
    { icon: '🪐', title: a?.zodiac?.planet || '...', sub: L('guardianPlanet') },
  ];
  grid.innerHTML = cards.map((c, i) => `
    <div class="onb-card" style="--delay:${i * 0.12}s">
      <div class="onb-card-icon">${c.icon}</div>
      <div class="onb-card-title">${c.title}</div>
      <div class="onb-card-sub">${c.sub}</div>
    </div>
  `).join('');

  const lp = a?.lifePath;
  if (lp && lpBlock) {
    lpBlock.innerHTML = `<div class="onb-lp"><span class="onb-lp-num">${lp}</span><span class="onb-lp-label">${lifePathNames[lp] || L('myPath')}</span></div>`;
  }

  if (doneBtn) doneBtn.onclick = async () => {
    tg?.HapticFeedback?.impactOccurred?.('medium');
    await renderHome();
    showScreen('home');
  };

  showScreen('onboarding');
  tg?.HapticFeedback?.notificationOccurred?.('success');
}

// ══ НУМЕРОЛОГІЯ ═════════════════════════════════════════════════════════════

const LIFE_PATH_DATA = {
  1:  { title: 'Число 1 — Лидер', desc: 'Вы — первопроходец с сильной волей. Ваш путь — самодостаточность, независимость и лидерство. Вы рождены, чтобы вести других, воплощать смелые идеи и проявлять себя в полную силу.', color: '🔴 Красный, Золотой', lucky: [1, 10, 19, 28], days: 'Воскресенье', stone: 'Рубин' },
  2:  { title: 'Число 2 — Дипломат', desc: 'Вы — миротворец и партнёр. Ваш путь — гармония, сотрудничество и любовь. Вы чувствуете других людей на глубоком уровне и умеете создавать красоту в отношениях.', color: '🌸 Серебряный, Розовый', lucky: [2, 11, 20, 29], days: 'Понедельник', stone: 'Лунный камень' },
  3:  { title: 'Число 3 — Творец', desc: 'Вы — выразитель и художник. Ваш путь — радость, самовыражение и творчество. Вы несёте свет в мир своими словами, искусством и обаянием.', color: '🌞 Жёлтый, Оранжевый', lucky: [3, 12, 21, 30], days: 'Среда', stone: 'Цитрин' },
  4:  { title: 'Число 4 — Строитель', desc: 'Вы — основа и опора. Ваш путь — труд, порядок и надёжность. Вы умеете создавать прочное и долговечное. На вас можно положиться всегда.', color: '🌿 Зелёный, Коричневый', lucky: [4, 13, 22, 31], days: 'Суббота', stone: 'Изумруд' },
  5:  { title: 'Число 5 — Искатель', desc: 'Вы — свободная душа и искатель приключений. Ваш путь — перемены, свобода и разнообразие. Вы умеете адаптироваться и видеть возможности там, где другие теряются.', color: '💙 Голубой, Серебряный', lucky: [5, 14, 23], days: 'Пятница', stone: 'Аквамарин' },
  6:  { title: 'Число 6 — Хранитель', desc: 'Вы — хранитель очага и защитник близких. Ваш путь — забота, красота и ответственность. Вы создаёте тепло и уют везде, где появляетесь.', color: '💜 Синий, Индиго', lucky: [6, 15, 24], days: 'Пятница', stone: 'Сапфир' },
  7:  { title: 'Число 7 — Мудрец', desc: 'Вы — искатель истины и мистик. Ваш путь — познание, духовность и одиночество. Вы обладаете глубокой интуицией и видите то, что скрыто от других.', color: '🔮 Фиолетовый, Белый', lucky: [7, 16, 25], days: 'Воскресенье', stone: 'Аметист' },
  8:  { title: 'Число 8 — Властелин', desc: 'Вы — властелин материального мира. Ваш путь — успех, власть и изобилие. Вы умеете аккумулировать силы и достигать больших целей через упорство.', color: '🖤 Чёрный, Тёмно-синий', lucky: [8, 17, 26], days: 'Суббота', stone: 'Оникс' },
  9:  { title: 'Число 9 — Гуманист', desc: 'Вы — гуманист и завершитель. Ваш путь — служение, мудрость и духовная эволюция. Вы несёте в мир глубокое понимание и compassion.', color: '✨ Золотой, Белый', lucky: [9, 18, 27], days: 'Вторник', stone: 'Гранат' },
  11: { title: 'Число 11 — Мистик', desc: 'Мастер-число! Вы — вдохновитель и духовный проводник. Ваш путь — просветление, интуиция и высшие миссии. Вы несёте свет в мир через искусство, духовность и слово.', color: '🌟 Серебряный, Белый', lucky: [11, 2, 29], days: 'Понедельник', stone: 'Алмаз' },
  22: { title: 'Число 22 — Архитектор', desc: 'Мастер-число! Вы — великий строитель и архитектор судьбы. Ваш путь — грандиозные проекты, наследие и воплощение великих идей в реальность.', color: '🏆 Золотой, Коричневый', lucky: [22, 4, 13], days: 'Суббота', stone: 'Обсидиан' },
};

const PERSONAL_YEAR_DATA = {
  1: 'Год новых начал. Сейчас — лучшее время для старта. Всё, что вы начнёте в этом году, заложит основу следующего 9-летнего цикла.',
  2: 'Год отношений и партнёрства. Укрепляйте связи, будьте терпеливы — сейчас важны союзы, а не одиночные решения.',
  3: 'Год творчества и радости. Выражайте себя, общайтесь, создавайте. Этот год принесёт социальные возможности.',
  4: 'Год труда и фундамента. Время строить, систематизировать и укреплять то, что важно для вашего будущего.',
  5: 'Год перемен и свободы. Ждите неожиданных поворотов. Не сопротивляйтесь изменениям — они ведут к росту.',
  6: 'Год семьи и ответственности. Фокус на доме, близких, здоровье. Год гармонии и заботы о себе и других.',
  7: 'Год рефлексии и духовного роста. Время анализировать, учиться, медитировать. Уединение принесёт мудрость.',
  8: 'Год силы и достижений. Время для карьерных успехов, финансовых решений и реализации амбиций.',
  9: 'Год завершений. Отпустите старое, чтобы освободить место для нового. Прощайте, заканчивайте, подводите итоги.',
};

async function loadNumerologyScreen() {
  const content = document.getElementById('num-content');
  const user = state.user;
  if (!user?.astro) {
    content.innerHTML = `<div class="empty-state"><p>${L('numNoData')}</p></div>`;
    return;
  }
  const a = user.astro;
  const lp = a.lifePath;
  const py = a.personalYear;
  const lpData = LIFE_PATH_DATA[lp] || LIFE_PATH_DATA[9];
  const pyDesc = PERSONAL_YEAR_DATA[py] || PERSONAL_YEAR_DATA[1];

  const isPremium = state.user?.isPremium;

  content.innerHTML = `
    <div class="num-hero">
      <div class="num-number">${lp}</div>
      <div class="num-title">${lpData.title}</div>
      <div class="num-zodiac">${a.zodiac?.emoji} ${a.zodiac?.name} · ${a.zodiac?.element}</div>
    </div>

    <div class="num-block">
      <div class="num-block-title">📖 Ваш жизненный путь</div>
      <p class="num-desc">${lpData.desc}</p>
    </div>

    <div class="num-props">
      <div class="num-prop"><span class="np-icon">🍀</span><div><div class="np-label">Счастливые числа</div><div class="np-val">${lpData.lucky.join(', ')}</div></div></div>
      <div class="num-prop"><span class="np-icon">🎨</span><div><div class="np-label">Цвета удачи</div><div class="np-val">${lpData.color}</div></div></div>
      <div class="num-prop"><span class="np-icon">📅</span><div><div class="np-label">Счастливый день</div><div class="np-val">${lpData.days}</div></div></div>
      <div class="num-prop"><span class="np-icon">💎</span><div><div class="np-label">Камень силы</div><div class="np-val">${lpData.stone}</div></div></div>
    </div>

    <div class="num-block">
      <div class="num-block-title">🌀 Личный год: ${py}</div>
      <p class="num-desc">${pyDesc}</p>
    </div>

    ${!isPremium ? `
    <div class="num-premium-teaser">
      <div class="npt-lock">🔒</div>
      <div class="npt-text"><b>Полный нумерологический анализ</b><br>Матрица Пифагора, кармические числа и предназначение — в Премиум</div>
      <button class="btn-primary btn-sm npt-btn" id="btn-num-premium">Открыть Премиум 👑</button>
    </div>` : `
    <div class="num-block">
      <div class="num-block-title">🔮 Матрица Пифагора</div>
      <div class="num-matrix" id="num-matrix">${buildPythagorasMatrix(user.birthDate)}</div>
    </div>`}

    <div style="height:32px"></div>
  `;

  document.getElementById('btn-num-premium')?.addEventListener('click', async () => {
    showScreen('premium'); await loadPremiumScreen();
  });
}

function buildPythagorasMatrix(birthDate) {
  if (!birthDate) return '';
  const digits = birthDate.replace(/-/g, '').split('').map(Number).filter(n => n > 0);
  const counts = Array(10).fill(0);
  digits.forEach(d => counts[d]++);
  const cell = n => `<div class="pm-cell pm-c${n}">${Array(counts[n]).fill(n).join('') || '—'}</div>`;
  return `
    <div class="pythagor-matrix">
      <div class="pm-row">${cell(1)}${cell(2)}${cell(3)}</div>
      <div class="pm-row">${cell(4)}${cell(5)}${cell(6)}</div>
      <div class="pm-row">${cell(7)}${cell(8)}${cell(9)}</div>
    </div>
  `;
}

// ══ ГОРОСКОП ════════════════════════════════════════════════════════════════

const HOROSCOPE_DATA = {
  Овен:      { emoji:'♈', ru: { love:'Страсть и эмоции зашкаливают. Не торопите события — позвольте чувствам раскрыться естественно.', work:'Ваша энергия на пике. Берите инициативу и не бойтесь сложных задач.', health:'Следите за головными болями и давлением. Больше отдыхайте.', money:'Финансовая удача улыбается. Можно рассмотреть новые вложения.' }, ua: { love:'Пристрасть і емоції зашкалюють. Дозвольте почуттям розкритися природно.', work:'Ваша енергія на піку. Беріть ініціативу.', health:'Стежте за тиском та головними болями.', money:'Фінансова удача всміхається.' }},
  Телец:     { emoji:'♉', ru: { love:'Стабильность в отношениях. Партнёр ценит вашу надёжность и тепло.', work:'Медленно но верно — ваш девиз недели. Проверяйте детали.', health:'Горло и шея требуют внимания. Тёплые напитки и отдых.', money:'Не торопитесь с крупными тратами — дождитесь лучшего момента.' }, ua: { love:'Стабільність у стосунках. Партнер цінує вашу надійність.', work:'Повільно але вірно — ваш девіз тижня.', health:'Горло та шия потребують уваги.', money:'Не поспішайте з великими витратами.' }},
  Близнецы:  { emoji:'♊', ru: { love:'Общение и лёгкость — ключ к сердцу. Флирт принесёт радость.', work:'Многозадачность поможет справиться с горящими делами. Используйте свою гибкость.', health:'Нервная система нуждается в отдыхе. Меньше информационного шума.', money:'Небольшие непредвиденные расходы — будьте готовы.' }, ua: { love:'Спілкування та легкість — ключ до серця.', work:'Багатозадачність допоможе з терміновими справами.', health:'Нервова система потребує відпочинку.', money:'Невеликі непередбачені витрати — будьте готові.' }},
  Рак:       { emoji:'♋', ru: { love:'Интуиция подскажет правильный шаг. Доверяйте своим чувствам, не логике.', work:'Творческий подход даст неожиданные результаты. Доверяйте вдохновению.', health:'Желудок и эмоциональный фон связаны — берегите себя от стрессов.', money:'Деньги могут прийти из неожиданного источника.' }, ua: { love:'Інтуїція підкаже правильний крок.', work:'Творчий підхід дасть несподівані результати.', health:'Шлунок та емоційний фон пов\'язані.', money:'Гроші можуть прийти з несподіваного джерела.' }},
  Лев:       { emoji:'♌', ru: { love:'Вы в центре внимания! Романтика, комплименты и восхищение — ваша неделя.', work:'Лидерские качества помогут решить сложный вопрос в команде.', health:'Сердце и спина — уделите им внимание. Лёгкая зарядка поможет.', money:'Щедрость вернётся к вам сторицей. Но контролируйте импульсивные покупки.' }, ua: { love:'Ви в центрі уваги! Романтика та захоплення — ваш тиждень.', work:'Лідерські якості допоможуть вирішити складне питання.', health:'Серце та спина — приділіть їм увагу.', money:'Щедрість повернеться до вас сторицею.' }},
  Дева:      { emoji:'♍', ru: { love:'Практический подход к романтике даст неожиданно нежные результаты.', work:'Ваша внимательность к деталям будет оценена по достоинству.', health:'Пищеварение — зона внимания. Питайтесь правильно.', money:'Бюджетирование сейчас принесёт дивиденды позже.' }, ua: { love:'Практичний підхід до романтики дасть ніжні результати.', work:'Вашу уважність до деталей оцінять.', health:'Травлення — зона уваги. Харчуйтесь правильно.', money:'Бюджетування зараз принесе дивіденди пізніше.' }},
  Весы:      { emoji:'♎', ru: { love:'Баланс и гармония в отношениях. Отличное время для важных разговоров.', work:'Дипломатия поможет урегулировать конфликт на работе.', health:'Почки и поясница — уделите внимание. Пейте больше воды.', money:'Партнёрские сделки принесут удачу.' }, ua: { love:'Баланс та гармонія у стосунках.', work:'Дипломатія допоможе врегулювати конфлікт.', health:'Нирки та поперек — приділіть увагу.', money:'Партнерські угоди принесуть удачу.' }},
  Скорпион:  { emoji:'♏', ru: { love:'Глубокая связь и страсть. Но берегитесь ревности — она может навредить.', work:'Расследовательские способности помогут раскрыть важную тайну проекта.', health:'Избегайте переутомления. Тёмная энергия накапливается — нужна разгрузка.', money:'Финансовые тайны могут раскрыться. Будьте осторожны с инвестициями.' }, ua: { love:'Глибокий зв\'язок та пристрасть. Бережіться ревнощів.', work:'Дослідницькі здібності допоможуть розкрити таємницю.', health:'Уникайте перевтоми.', money:'Фінансові таємниці можуть розкритися.' }},
  Стрелец:  { emoji:'♐', ru: { love:'Авантюры и приключения сближают. Предложите партнёру что-то необычное.', work:'Ваш оптимизм заразителен — используйте его для мотивации команды.', health:'Бёдра и печень — умеренность в еде и алкоголе.', money:'Удача сопровождает смелые финансовые решения.' }, ua: { love:'Пригоди та захоплення зближують.', work:'Ваш оптимізм заразливий — використовуйте його.', health:'Стегна та печінка — помірність у їжі.', money:'Удача супроводжує сміливі рішення.' }},
  Козерог:   { emoji:'♑', ru: { love:'Терпение — ваша суперсила в любви. Не торопите развитие событий.', work:'Дисциплина и упорство откроют новые карьерные горизонты.', health:'Кости и суставы — следите за осанкой, занимайтесь спортом.', money:'Долгосрочные инвестиции дадут отличный результат.' }, ua: { love:'Терпіння — ваша суперсила в коханні.', work:'Дисципліна відкриє нові кар\'єрні горизонти.', health:'Кістки та суглоби — стежте за поставою.', money:'Довгострокові інвестиції дадуть відмінний результат.' }},
  Водолей:   { emoji:'♒', ru: { love:'Необычные связи и новые знакомства изменят вашу жизнь.', work:'Инновационные идеи будут услышаны — самое время их озвучить.', health:'Голени и кровообращение — движение жизненно необходимо.', money:'Нестандартный подход к заработку принесёт плоды.' }, ua: { love:'Незвичайні зв\'язки та нові знайомства змінять ваше життя.', work:'Інноваційні ідеї будуть почуті.', health:'Гомілки та кровообіг — рух необхідний.', money:'Нестандартний підхід до заробітку принесе плоди.' }},
  Рыбы:      { emoji:'♓', ru: { love:'Романтика и мечты станут реальностью. Открывайте сердце.', work:'Интуиция подскажет верное решение там, где логика зашла в тупик.', health:'Иммунная система требует поддержки — сон и витамины.', money:'Финансовая интуиция на высоте — доверяйте предчувствию.' }, ua: { love:'Романтика та мрії стануть реальністю.', work:'Інтуїція підкаже вірне рішення.', health:'Імунна система потребує підтримки.', money:'Фінансова інтуїція на висоті.' }},
};

// Маппінг знаків: ru-назва → ключ API
const ZODIAC_KEY_MAP = {
  'Овен':'aries','Телец':'taurus','Близнецы':'gemini','Рак':'cancer',
  'Лев':'leo','Дева':'virgo','Весы':'libra','Скорпион':'scorpio',
  'Стрелец':'sagittarius','Козерог':'capricorn','Водолей':'aquarius','Рыбы':'pisces',
};

async function loadHoroscopeScreen() {
  const content = document.getElementById('horo-content');
  const user = state.user;
  const zodiacName = user?.astro?.zodiac?.name;

  if (!zodiacName || !HOROSCOPE_DATA[zodiacName]) {
    content.innerHTML = `<div class="empty-state"><p>${L('horoNoDate')}</p></div>`;
    return;
  }

  content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text2);">${L('horoLoading')}</div>`;

  // Спробуємо отримати дані з API, fallback на локальні
  const signKey = ZODIAC_KEY_MAP[zodiacName];
  let apiData = null;
  if (signKey) {
    try {
      const resp = await api('GET', `/horoscope/${signKey}`);
      if (resp.ok) apiData = resp;
    } catch (_) {}
  }

  renderHoroscopeContent(content, zodiacName, apiData);
}

function renderHoroscopeContent(content, zodiacName, apiData) {
  const lang = state.lang;
  const horo = HOROSCOPE_DATA[zodiacName];
  const localData = horo[lang] || horo.ru;
  const weekRange = apiData?.period || getWeekRange();

  // Дані з API (більш детальні) або локальні
  const love   = apiData?.data?.love   || localData.love;
  const work   = apiData?.data?.work   || localData.work;
  const health = apiData?.data?.health || localData.health;
  const money  = localData.money;
  const weekly = apiData?.data?.weekly || '';
  const lucky  = apiData?.data?.lucky  || null;

  content.innerHTML = `
    <div class="horo-hero">
      <div class="horo-sign-emoji">${horo.emoji}</div>
      <div class="horo-sign-name">${zodiacName}</div>
      <div class="horo-week">${weekRange}</div>
    </div>

    ${weekly ? `<div class="horo-weekly-block">
      <div class="hwb-label">${L('horoWeeklyLabel')}</div>
      <div class="hwb-text">${weekly}</div>
    </div>` : ''}

    <div class="horo-areas">
      <div class="horo-area">
        <div class="ha-icon">❤️</div>
        <div class="ha-info"><div class="ha-title">${L('horoLove')}</div><div class="ha-desc">${love}</div></div>
      </div>
      <div class="horo-area">
        <div class="ha-icon">💼</div>
        <div class="ha-info"><div class="ha-title">${L('horoWork')}</div><div class="ha-desc">${work}</div></div>
      </div>
      <div class="horo-area">
        <div class="ha-icon">🌿</div>
        <div class="ha-info"><div class="ha-title">${L('horoHealth')}</div><div class="ha-desc">${health}</div></div>
      </div>
      <div class="horo-area">
        <div class="ha-icon">💰</div>
        <div class="ha-info"><div class="ha-title">${L('horoMoney')}</div><div class="ha-desc">${money}</div></div>
      </div>
    </div>

    ${lucky ? `<div class="horo-lucky">
      <div class="hl-title">${L('horoLuckyTitle')}</div>
      <div class="hl-grid">
        <div class="hl-item"><div class="hl-label">${L('horoLuckyDay')}</div><div class="hl-val">${lucky.day}</div></div>
        <div class="hl-item"><div class="hl-label">${L('horoLuckyColor')}</div><div class="hl-val">${lucky.color}</div></div>
        <div class="hl-item"><div class="hl-label">${L('horoLuckyNumber')}</div><div class="hl-val">${lucky.number}</div></div>
      </div>
    </div>` : ''}

    <div class="horo-all-signs">
      <div class="horo-all-title">${L('horoAllSigns')}</div>
      <div class="horo-signs-grid">
        ${Object.entries(HOROSCOPE_DATA).map(([name, d]) =>
          `<div class="horo-sign-cell${name === zodiacName ? ' active' : ''}" data-sign="${name}">
            <div class="hsc-emoji">${d.emoji}</div>
            <div class="hsc-name">${name}</div>
          </div>`
        ).join('')}
      </div>
    </div>

    <div style="height:32px"></div>
  `;

  content.querySelectorAll('.horo-sign-cell').forEach(el => {
    el.addEventListener('click', async () => {
      const name = el.dataset.sign;
      const h2   = HOROSCOPE_DATA[name];
      if (!h2) return;
      content.querySelectorAll('.horo-sign-cell').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      tg?.HapticFeedback?.selectionChanged?.();
      const sKey = ZODIAC_KEY_MAP[name];
      let aData = null;
      if (sKey) {
        try { const r = await api('GET', `/horoscope/${sKey}`); if (r.ok) aData = r; } catch (_) {}
      }
      renderHoroscopeContent(content, name, aData);
    });
  });
}

function getWeekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

// ══ СУМІСНІСТЬ ══════════════════════════════════════════════════════════════

const ELEMENT_COMPAT = {
  'Огонь-Огонь':   { score: 85, desc: 'Страстная и энергичная пара. Много общих интересов и взаимного восхищения.' },
  'Огонь-Воздух':  { score: 90, desc: 'Отличная совместимость! Воздух питает огонь. Вас ждут яркие приключения.' },
  'Огонь-Земля':   { score: 55, desc: 'Разные темпераменты. Нужны терпение и уважение к различиям.' },
  'Огонь-Вода':    { score: 60, desc: 'Противоположности притягиваются, но конфликты неизбежны. Нужен баланс.' },
  'Земля-Земля':   { score: 80, desc: 'Надёжный и стабильный союз. Общие ценности и взгляды на жизнь.' },
  'Земля-Вода':    { score: 88, desc: 'Очень гармоничная пара. Вода питает землю, создавая плодородную почву.' },
  'Земля-Воздух':  { score: 50, desc: 'Сложная совместимость. Нужно учиться слышать друг друга.' },
  'Воздух-Воздух': { score: 78, desc: 'Лёгкость, общение и интеллектуальная связь. Но не хватает глубины.' },
  'Воздух-Вода':   { score: 65, desc: 'Эмоциональная и интеллектуальная связь. Разная скорость реакции.' },
  'Вода-Вода':     { score: 82, desc: 'Глубокая эмоциональная связь. Интуитивное понимание без слов.' },
};

const ZODIAC_ELEMENTS = {
  Овен:'Огонь', Лев:'Огонь', Стрелец:'Огонь',
  Телец:'Земля', Дева:'Земля', Козерог:'Земля',
  Близнецы:'Воздух', Весы:'Воздух', Водолей:'Воздух',
  Рак:'Вода', Скорпион:'Вода', Рыбы:'Вода',
};

function getZodiacFromBirth(birthDate) {
  const d = new Date(birthDate);
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Овен';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Телец';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Близнецы';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Рак';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Лев';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Дева';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Весы';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Скорпион';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Стрелец';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Козерог';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Водолей';
  return 'Рыбы';
}

function calcLifePathClient(birthDate) {
  const digits = birthDate.replace(/-/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22) {
    sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

function initCompatScreen() {
  const btn = document.getElementById('btn-compat-calc');
  const inp = document.getElementById('compat-birth');
  if (!btn || !inp || btn.dataset.init) return;
  btn.dataset.init = '1';
  btn.addEventListener('click', () => {
    if (!inp.value) { toast(L('compatEnterPartner')); return; }
    calcCompatibility(inp.value);
  });
  inp.addEventListener('change', () => {
    if (inp.value) calcCompatibility(inp.value);
  });
}

function calcCompatibility(partnerBirth) {
  const result = document.getElementById('compat-result');
  const user = state.user;
  if (!user?.birthDate || !user?.astro) { toast(L('compatUserNotFound')); return; }

  const myZodiac      = user.astro.zodiac?.name || getZodiacFromBirth(user.birthDate);
  const partnerZodiac = getZodiacFromBirth(partnerBirth);
  const myLP          = user.astro.lifePath;
  const partnerLP     = calcLifePathClient(partnerBirth);
  const myElem        = ZODIAC_ELEMENTS[myZodiac] || 'Огонь';
  const partnerElem   = ZODIAC_ELEMENTS[partnerZodiac] || 'Огонь';

  const elemKey = [myElem, partnerElem].sort().join('-');
  const elemKey2 = `${myElem}-${partnerElem}`;
  const compat = ELEMENT_COMPAT[elemKey2] || ELEMENT_COMPAT[elemKey] || { score: 70, desc: 'Гармоничное сочетание с уникальными особенностями.' };

  const lpDiff = Math.abs(myLP - partnerLP);
  const lpBonus = lpDiff === 0 ? 10 : lpDiff <= 2 ? 5 : lpDiff >= 7 ? -5 : 0;
  const finalScore = Math.min(99, Math.max(40, compat.score + lpBonus));

  const myHoro = HOROSCOPE_DATA[myZodiac];
  const partnerHoro = HOROSCOPE_DATA[partnerZodiac];

  result.classList.remove('hidden');
  result.innerHTML = `
    <div class="compat-score-block">
      <div class="csb-pair">
        <div class="csb-person">
          <div class="csb-emoji">${myHoro?.emoji || '⭐'}</div>
          <div class="csb-name">${user.firstName || 'Вы'}</div>
          <div class="csb-sign">${myZodiac} · ${myElem}</div>
          <div class="csb-lp">Путь ${myLP}</div>
        </div>
        <div class="csb-heart">💞</div>
        <div class="csb-person">
          <div class="csb-emoji">${partnerHoro?.emoji || '⭐'}</div>
          <div class="csb-name">Партнёр</div>
          <div class="csb-sign">${partnerZodiac} · ${partnerElem}</div>
          <div class="csb-lp">Путь ${partnerLP}</div>
        </div>
      </div>
      <div class="csb-meter">
        <div class="csb-score">${finalScore}%</div>
        <div class="csb-bar"><div class="csb-bar-fill" style="width:${finalScore}%"></div></div>
        <div class="csb-label">${finalScore >= 80 ? '💫 Очень высокая совместимость' : finalScore >= 65 ? '✨ Хорошая совместимость' : '⚡ Есть над чем работать'}</div>
      </div>
      <div class="csb-desc">${compat.desc}</div>
    </div>

    <div class="compat-spread-btn">
      <button class="btn-primary" id="btn-compat-spread">
        🃏 Расклад для пары
      </button>
    </div>
    <div style="height:32px"></div>
  `;
  result.scrollIntoView({ behavior: 'smooth' });
  tg?.HapticFeedback?.notificationOccurred?.('success');

  document.getElementById('btn-compat-spread')?.addEventListener('click', () => {
    openSpread('love');
  });
}

// ══ МІСЯЧНИЙ ЩОДЕННИК ═══════════════════════════════════════════════════════

async function loadDiaryScreen() {
  const content = document.getElementById('diary-content');
  const moon = state.moonData?.moon;
  const lang = state.lang;

  content.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text2)">${L('loading2')}</div>`;

  // Мігруємо старі записи з localStorage → БД (одноразово)
  const migrateKey = `diary_migrated_${state.userId}`;
  if (!localStorage.getItem(migrateKey)) {
    const old = JSON.parse(localStorage.getItem(`diary_${state.userId}`) || '[]');
    if (old.length) {
      await Promise.allSettled(old.map(e => api('POST', `/diary/${state.userId}`, {
        text: e.text, moonEmoji: e.phase, moonName: e.phaseName,
      })));
      localStorage.removeItem(`diary_${state.userId}`);
    }
    localStorage.setItem(migrateKey, '1');
  }

  const data = await api('GET', `/diary/${state.userId}`);
  const entries = data.ok ? data.entries : [];

  const renderEntries = (list) => list.length ? `
    <div class="diary-entries-title">${L('diaryPastTitle')}</div>
    ${list.map(e => `
      <div class="diary-entry" data-id="${e.id}">
        <div class="de-header">
          <span class="de-phase">${esc(e.moon_emoji || '🌙')} ${esc(e.moon_name || '')}</span>
          <span class="de-date">${fmtDate(e.entry_date)}</span>
          <button class="de-del" data-id="${e.id}" title="${L('close')}">✕</button>
        </div>
        <div class="de-text">${esc(e.text)}</div>
      </div>
    `).join('')}
  ` : `<div class="diary-empty">${L('diaryEmpty')}</div>`;

  content.innerHTML = `
    <div class="diary-moon-phase">
      <span class="dmp-emoji">${moon?.emoji || '🌙'}</span>
      <span class="dmp-name">${moon?.name || 'Луна'}</span>
      <span class="dmp-date">${todayDateStr()}</span>
    </div>
    <div class="diary-write-block">
      <div class="dwb-title">${L('diaryWriteTitle')}</div>
      <textarea id="diary-input" class="diary-textarea"
        placeholder="${L('diaryPlaceholder')}"
        maxlength="1000" rows="4"></textarea>
      <button class="btn-primary btn-sm diary-save-btn" id="btn-diary-save">
        ${L('diarySave')}
      </button>
    </div>
    <div class="diary-entries" id="diary-entries">
      ${renderEntries(entries)}
    </div>
    <div style="height:32px"></div>
  `;

  document.getElementById('btn-diary-save')?.addEventListener('click', async () => {
    const text = document.getElementById('diary-input')?.value?.trim();
    if (!text) { toast(L('diaryWritePrompt')); return; }
    const btn = document.getElementById('btn-diary-save');
    btn.disabled = true;
    const res = await api('POST', `/diary/${state.userId}`, {
      text, moonEmoji: moon?.emoji || '🌙', moonName: moon?.name || '',
    });
    btn.disabled = false;
    if (res.ok) {
      toast(L('diarySaved'));
      tg?.HapticFeedback?.impactOccurred?.('light');
      await loadDiaryScreen();
    } else { toast(L('diarySaveErr')); }
  });

  content.querySelectorAll('.de-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await api('DELETE', `/diary/${state.userId}/${id}`);
      btn.closest('.diary-entry').remove();
    });
  });
}

// ══ ПРОФІЛЬ ══════════════════════════════════════════════════════════════════

async function loadProfileScreen() {
  const content = document.getElementById('profile-content');
  if (!content) return;
  const user = state.user;
  const ps   = state.premiumStatus;

  const premBlock = ps?.isPremium
    ? `<div class="profile-premium-block">
        <div class="ppb-status">${L('profilePremiumActive')}</div>
        <div class="ppb-sub">${ps.daysLeft !== null ? `${L('premiumDaysLeft')} ${ps.daysLeft} ${L('premiumStatusDays')}` : L('profilePremiumActive')}</div>
      </div>`
    : `<div class="profile-premium-block" style="background:rgba(255,255,255,.04)">
        <div class="ppb-status" style="color:var(--text2)">${L('profileFreePlan')}</div>
        <div class="ppb-sub"><button class="btn-link" id="profile-go-premium">${L('upgradePremium')}</button></div>
      </div>`;

  content.innerHTML = `
    <div class="profile-card">
      <h3>${L('profileEditTitle')}</h3>
      <div class="profile-field">
        <label>${L('profileNameLabel')}</label>
        <input id="pf-name" type="text" maxlength="30" value="${esc(user?.firstName || '')}" placeholder="${L('namePlaceholder')}">
      </div>
      <div class="profile-field">
        <label>${L('profileBirthLabel')}</label>
        <input id="pf-birth" type="date" value="${esc(user?.birthDate || '')}" max="${new Date(Date.now()-441504e6).toISOString().split('T')[0]}" min="1920-01-01">
      </div>
      <button class="btn-primary" id="btn-profile-save">${L('profileSaveBtn')}</button>
    </div>

    ${premBlock}

    <div class="profile-card">
      <h3>${L('profileDocsTitle')}</h3>
      <button class="btn-link" id="profile-terms" style="font-size:14px;color:var(--text2)">${L('profileTermsBtn')}</button>
    </div>

    <div class="profile-danger">
      <p>${L('profileDangerText')}</p>
      <button class="btn-danger" id="btn-delete-account">${L('profileDeleteBtn')}</button>
    </div>
    <div style="height:32px"></div>
  `;

  document.getElementById('btn-profile-save')?.addEventListener('click', async () => {
    const name  = document.getElementById('pf-name')?.value?.trim();
    const birth = document.getElementById('pf-birth')?.value;
    if (!name && !birth) { toast(L('nothingToSave')); return; }
    const btn = document.getElementById('btn-profile-save');
    btn.disabled = true; btn.textContent = L('profileSaving');
    const res = await api('PATCH', `/users/${state.userId}`, { firstName: name, birthDate: birth || undefined });
    btn.disabled = false; btn.textContent = L('profileSaveBtn');
    if (res.ok) {
      state.user = res.user;
      toast(L('profileSaved'));
      tg?.HapticFeedback?.notificationOccurred?.('success');
    } else { toast(L('profileSaveErr')); }
  });

  document.getElementById('profile-go-premium')?.addEventListener('click', async () => {
    showScreen('premium'); await loadPremiumScreen();
  });

  document.getElementById('profile-terms')?.addEventListener('click', () => {
    showScreen('terms');
  });

  document.getElementById('btn-delete-account')?.addEventListener('click', async () => {
    if (!confirm(L('deleteConfirm'))) return;
    const res = await api('DELETE', `/users/${state.userId}/self`);
    if (res.ok) {
      toast(L('deletedOk'));
      localStorage.clear();
      setTimeout(() => tg?.close?.(), 2000);
    } else { toast(L('deleteErr')); }
  });
}

// ══ РЕФЕРАЛЬНИЙ ПРОГРЕС БАР ══════════════════════════════════════════════════

function renderReferralProgress(refBonus) {
  const counter = document.getElementById('fpb-counter');
  if (!counter) return;
  const goals = [1, 3, 7];
  const next = goals.find(g => g > refBonus) || 7;
  const prev = goals.filter(g => g <= refBonus).pop() || 0;
  const pct = next === prev ? 100 : Math.round(((refBonus - prev) / (next - prev)) * 100);
  counter.innerHTML = `
    <div class="ref-progress-wrap">
      <div class="ref-progress-bar">
        <div class="ref-progress-fill" style="width:${Math.min(100, pct)}%"></div>
      </div>
      <div class="ref-progress-labels">
        <span>${refBonus} ${L('premiumInvitedMany')}</span>
        <span>${L('refNextGoal')}: ${next} 🎁</span>
      </div>
    </div>
    <div class="ref-steps">
      ${goals.map(g => `
        <div class="ref-step${refBonus >= g ? ' done' : ''}">
          <div class="rs-icon">${refBonus >= g ? '✅' : '👤'}</div>
          <div class="rs-val">${g} ${g === 1 ? L('premiumInvitedSingle') : L('premiumInvitedMany')}</div>
          <div class="rs-reward">${g === 1 ? L('refReward1') : g === 3 ? L('refReward3') : L('refReward7')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ══ БЛЮР РОЗКЛАДІВ (превью для замкнутих) ════════════════════════════════════

function renderBlurredSpreadPreview(spreadType) {
  const fakeCards = ['🌟','🌙','⭐','✨','🔮'];
  return `
    <div class="blurred-preview">
      ${fakeCards.slice(0, spreadType === 'celtic' ? 5 : 3).map(e => `
        <div class="bp-card">
          <div class="bp-card-inner">${e}</div>
        </div>
      `).join('')}
      <div class="bp-overlay">
        <div class="bp-lock">👑</div>
        <div class="bp-text">${L('premiumOnly')}</div>
      </div>
    </div>
  `;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function ru(obj) { if (!obj) return ''; return obj.ru || obj.ua || obj.en || String(obj); }
function fmtDate(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  localizeDOM(); // Одразу перекладаємо всі статичні тексти
  initStars();
  initNav();
  initSplashScreen();
  initIntroScreen();

  const savedId = localStorage.getItem('tarot_uid');
  const uid     = state.tgUser?.id?.toString() || savedId;
  if (uid) {
    state.userId = uid;
    const data = await api('GET', `/users/${uid}`);
    if (data.ok && data.user?.birthDate) {
      state.user = data.user;
      await renderHome();
      setTimeout(() => showScreen('home'), 900);
      return;
    }
  }
  setTimeout(() => showScreen('splash'), 900);
}

init().catch(() => setTimeout(() => showScreen('intro'), 1000));
