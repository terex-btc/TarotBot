// ══ Магический кабинет — App ══════════════════════════════════════════════
'use strict';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#07030f');
  tg.setBackgroundColor?.('#07030f');
}

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  userId: tg?.initDataUnsafe?.user?.id?.toString()
         || localStorage.getItem('tarot_uid')
         || ('u_' + Math.random().toString(36).slice(2)),
  tgUser: tg?.initDataUnsafe?.user || null,
  user:   null,
  lang:   'ru',
  currentReading: null,
  flippedCount:   0,
  prevScreen:     'home',
  currentSpell:   null,
  spellTimer:     null,
  spellTimerSec:  0,
  moonData:       null,
};

// ── API ────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const r = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
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
  let t = 0;
  (function draw() {
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
    requestAnimationFrame(draw);
  })();
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
  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerHTML = '<span>Соединяемся со звёздами...</span>';
    const data = await api('POST', '/users/init', {
      userId: state.userId, firstName: nameIn.value.trim(),
      username: state.tgUser?.username || '', birthDate: birthIn.value, lang: 'ru',
    });
    if (data.ok) {
      state.user = data.user;
      localStorage.setItem('tarot_uid', state.userId);
      await renderHome();
      showScreen('home');
    } else {
      btn.disabled = false;
      btn.innerHTML = '<span>Войти в кабинет</span><span class="btn-icon-r">🔮</span>';
      toast('Ошибка. Попробуйте ещё раз.');
    }
  };
}

// ── HOME ───────────────────────────────────────────────────────────────────
async function renderHome() {
  const user = state.user;
  if (!user) return;
  document.getElementById('top-name').textContent = user.firstName || 'Провидец';
  const z = user.astro?.zodiac;
  document.getElementById('top-astro').textContent = z ? `${z.emoji} ${z.name} · Путь ${user.astro.lifePath}` : '';
  renderAstroStrip(user);

  // Луна сегодня
  const moonData = await api('GET', `/spells/today/${state.userId}`);
  if (moonData.ok) {
    state.moonData = moonData;
    const pill = document.getElementById('today-moon-pill');
    pill.innerHTML = `${moonData.moon.emoji} ${moonData.moon.name}`;
    document.querySelector('.today-hint').textContent = getMoonTip(moonData.moon.energy);
    renderSpellsPreview(moonData.spells);
  }

  // Таро: копіюємо мету
  const tarotMeta = document.getElementById('tarot-meta');
  if (tarotMeta && user.astro) {
    const m = user.astro;
    tarotMeta.innerHTML = [
      `<div class="meta-pill">${m.zodiac?.emoji} <strong>${m.zodiac?.name}</strong></div>`,
      `<div class="meta-pill">🔢 Путь <strong>${m.lifePath}</strong></div>`,
      `<div class="meta-pill">${m.moonPhase?.emoji} <strong>${m.moonPhase?.name}</strong></div>`,
    ].join('');
  }

  updatePremiumCards(user.isPremium);
  await loadDailyCard('daily-zone', 'tap-daily');
  await loadDailyCard('daily-zone-tarot', 'tap-daily-tarot');
}

function getMoonTip(energy) {
  const tips = {
    new:     'новых начал и желаний 🌑',
    waxing:  'роста, привлечения и успеха 🌒',
    first:   'активных действий 🌓',
    gibbous: 'завершения дел и удачи 🌔',
    full:    'силы, красоты и магии 🌕',
    waning:  'очищения и избавления 🌖',
    last:    'завершения и отпускания 🌗',
    dark:    'защиты и тайных дел 🌘',
  };
  return 'Сегодня особый день для ' + (tips[energy] || 'магии');
}

function renderAstroStrip(user) {
  const strip = document.getElementById('astro-strip');
  if (!user.astro) { strip.innerHTML = ''; return; }
  const { zodiac, lifePath, personalYear, moonPhase } = user.astro;
  strip.innerHTML = [
    { icon: zodiac.emoji, label: 'Знак', val: zodiac.name },
    { icon: '🔢', label: 'Путь', val: lifePath },
    { icon: '🌀', label: 'Год', val: personalYear },
    { icon: moonPhase.emoji, label: 'Луна', val: moonPhase.name },
    { icon: '🌍', label: 'Стихия', val: zodiac.element },
    { icon: '🪐', label: 'Планета', val: zodiac.planet },
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
  if (!wrap || !spells?.length) return;
  wrap.innerHTML = spells.slice(0, 6).map(s => `
    <div class="spell-preview-card${s.locked ? ' locked' : ''}" data-spell-id="${s.id}">
      ${s.locked ? '<div class="spc-lock">🔒</div>' : ''}
      <div class="spc-emoji">${s.emoji}</div>
      <div class="spc-title">${s.title}</div>
      <div class="spc-sub">${s.subtitle}</div>
      <div class="spc-moon">${s.moon[0] !== 'any' ? '🌙 Сегодня' : ''}</div>
    </div>
  `).join('');
  wrap.querySelectorAll('.spell-preview-card').forEach(el => {
    el.addEventListener('click', () => openSpellById(el.dataset.spellId));
  });
}

function updatePremiumCards(isPremium) {
  document.querySelectorAll('.premium-card[data-spread]').forEach(el => el.classList.toggle('unlocked', !!isPremium));
}

// ── Карта дня ──────────────────────────────────────────────────────────────
async function loadDailyCard(zoneId, tapId) {
  const zone = document.getElementById(zoneId);
  const tap  = document.getElementById(tapId);
  if (!zone || !tap) return;
  tap.onclick = async () => {
    tap.onclick = null;
    zone.innerHTML = '<div style="text-align:center;padding:50px 0;color:var(--text2);font-size:14px;">🔮 Карты шепчут...</div>';
    const data = await api('POST', `/readings/${state.userId}`, { spreadType: 'daily', lang: 'ru' });
    if (data.ok && data.reading) renderDailyRevealed(zone, data.reading);
    else zone.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text2);">Ошибка 😢</div>';
  };
}

function renderDailyRevealed(zone, reading) {
  const card    = reading.cards[0];
  const name    = card.nameRu || card.name;
  const meaning = card.isReversed ? ru(card.reversed) : ru(card.upright);
  zone.innerHTML = `<div class="daily-revealed" id="dr-${zone.id}">
    <span class="dr-emoji">${card.emoji}</span>
    <div class="dr-name">${name}</div>
    ${card.isReversed ? '<div class="dr-reversed"><span class="reversed-tag">🔄 Перевёрнута</span></div>' : ''}
    <div class="dr-meaning">${meaning}</div>
    <div class="dr-hint">Нажмите для подробностей →</div>
  </div>`;
  document.getElementById(`dr-${zone.id}`).addEventListener('click', () => openCardDetail(card));
}

// ── Таро: розкладання ──────────────────────────────────────────────────────
async function openSpread(spreadType) {
  const isPremium = ['love', 'month', 'year'].includes(spreadType);
  if (isPremium && !state.user?.isPremium) { showScreen('premium'); return; }
  showScreen('reading');
  state.flippedCount = 0;
  document.getElementById('reading-meta').innerHTML = '';
  document.getElementById('reading-interpretation').textContent = '🔮 Тасуем карты...';
  document.getElementById('reading-cards-wrap').innerHTML = '';
  document.getElementById('reading-summary-btn').classList.add('hidden');
  const data = await api('POST', `/readings/${state.userId}`, { spreadType, lang: 'ru' });
  if (!data.ok) { document.getElementById('reading-interpretation').textContent = 'Ошибка.'; return; }
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
      <div class="cbf-tap">Коснитесь, чтобы открыть</div>
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
    <div class="cff-emoji">${card.emoji}</div>
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
      <span class="cd-emoji">${card.emoji}</span>
      <div class="cd-name">${card.name}</div>
      ${card.nameUa ? `<div class="cd-name-sub">${card.nameUa}</div>` : ''}
      ${card.isReversed ? '<span class="reversed-tag">🔄 Перевёрнутая</span>' : ''}
    </div>
    <div class="cd-block"><div class="cd-block-title t-desc">📖 Описание</div><p>${ru(card.description)}</p></div>
    <div class="cd-block"><div class="cd-block-title t-upright">⬆️ Прямое положение</div><p>${ru(card.upright)}</p></div>
    <div class="cd-block"><div class="cd-block-title t-rev">🔄 Перевёрнутое положение</div><p>${ru(card.reversed)}</p></div>
  `;
  showScreen('card');
}

// ══ ЗАГОВОРЫ ════════════════════════════════════════════════════════════════

async function openSpellsScreen() {
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
  const desc = {
    new:     'Время загадывать желания и начинать новые ритуалы. Новолуние — самое мощное время для притяжения.',
    waxing:  'Растущая луна усиливает привороты, заговоры на деньги и красоту. Всё, что вы начнёте — будет расти.',
    first:   'Время активных действий и решений. Ритуалы на успех и карьеру сейчас особенно сильны.',
    gibbous: 'Луна почти полная. Заговоры достигают пика силы. Идеально для любовной магии.',
    full:    'Полнолуние — максимальная сила. Все заговоры работают в полную мощь. Магическое время!',
    waning:  'Убывающая луна — время очищения, избавления от негатива и снятия порчи.',
    last:    'Время завершения и отпускания. Ритуалы для освобождения от плохих связей.',
    dark:    'Тёмная луна — время тайных дел, защиты и работы с подсознанием.',
  };
  return desc[energy] || 'Время магии и ритуалов.';
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
    if (data.error === 'premium_required') { showScreen('premium'); return; }
    toast('Заговор не найден'); return;
  }
  openSpellDetail(data.spell, false);
}

function openSpellDetail(spell, locked) {
  if (locked) { showScreen('premium'); return; }
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
      <div class="sd-block-title ingr">✦ Что нужно</div>
      <ul class="sd-ingredients">${ingredientsHtml}</ul>
    </div>

    <div class="sd-block">
      <div class="sd-block-title steps">📋 Как проводить</div>
      <ol class="sd-steps">${stepsHtml}</ol>
    </div>

    <!-- Таймер читання заговору -->
    <div class="sd-timer-block" id="spell-timer-block">
      <div class="timer-label">Читайте заговор вслух</div>
      <div class="timer-display" id="timer-display">0:00</div>
      <div class="timer-repeat" id="timer-repeat">Прочитайте ${spell.steps.length > 3 ? '3' : '7'} раз подряд</div>
      <button class="timer-btn" id="timer-btn" onclick="toggleTimer()">▶ Начать читать</button>
    </div>

    <div class="sd-block">
      <div class="sd-block-title spell-text">🔮 Текст заговора</div>
      <div class="sd-spell-text">${spell.spell}</div>
    </div>

    ${spell.warning ? `<div class="sd-block">
      <div class="sd-block-title warn">⚠️ Важно</div>
      <div class="sd-warning">${spell.warning}</div>
    </div>` : ''}

    ${spell.tip ? `<div class="sd-block">
      <div class="sd-block-title tip">💡 Совет</div>
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
    btn.textContent = '▶ Продолжить';
    btn.classList.remove('running');
  } else {
    btn.textContent = '⏸ Пауза';
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
  content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2);">🌙 Загрузка...</div>';

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

    <div class="moon-section-title">7 дней — фазы луны</div>
    <div class="moon-week">${weekPills}</div>

    <div class="moon-section-title">✅ Что можно сегодня</div>
    <div class="moon-do-list">${doItems}</div>

    <div class="moon-section-title">❌ Чего избегать</div>
    <div class="moon-dont-list">${dontItems}</div>

    <div class="moon-section-title">🕯️ Заговоры на сегодня</div>
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
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
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
  const lists = {
    new:     ['Загадывать желания', 'Начинать новые дела', 'Ставить финансовые цели', 'Медитации на притяжение', 'Покупать новые вещи'],
    waxing:  ['Привороты и заговоры на любовь', 'Ритуалы на деньги', 'Заговоры на красоту', 'Посадка растений', 'Начинать проекты'],
    first:   ['Активные действия', 'Карьерные ритуалы', 'Заговоры на успех', 'Подписание договоров', 'Делать покупки'],
    gibbous: ['Завершать ритуалы', 'Любовная магия', 'Ритуалы на изобилие', 'Благодарственные практики'],
    full:    ['Мощные ритуалы на желание', 'Зарядка воды', 'Ритуалы на красоту', 'Медитации', 'Все виды магии'],
    waning:  ['Снятие порчи', 'Очищение дома', 'Заговоры от болезни', 'Избавление от долгов', 'Разрыв плохих связей'],
    last:    ['Завершение отношений', 'Уборка и очищение', 'Снятие блоков', 'Посты и голодание'],
    dark:    ['Тайные ритуалы', 'Защита и обереги', 'Работа с интуицией', 'Очищение кристаллов'],
  };
  return lists[energy] || lists.full;
}

function getMoonDontList(energy) {
  const lists = {
    new:     ['Стричь волосы', 'Давать деньги в долг', 'Проводить очистительные ритуалы'],
    waxing:  ['Ритуалы на избавление', 'Снятие порчи', 'Давать деньги взаймы'],
    first:   ['Затяжные медитации', 'Ритуалы на прошлое'],
    gibbous: ['Конфликтовать', 'Начинать диеты'],
    full:    ['Давать деньги в долг', 'Принимать важные решения', 'Конфликтовать'],
    waning:  ['Привороты на любовь', 'Заговоры на деньги', 'Новые начинания'],
    last:    ['Свадьбы и сватовство', 'Начинать бизнес', 'Крупные покупки'],
    dark:    ['Привлекать новых людей', 'Публичные выступления', 'Подписывать договоры'],
  };
  return lists[energy] || ['Принимать важные решения'];
}

function moonPhaseName(energy) {
  const n = { new:'Новолуние', waxing:'Растущая', first:'I четверть', gibbous:'Растущая', full:'Полнолуние', waning:'Убывающая', last:'IV четверть', dark:'Тёмная' };
  return n[energy] || energy;
}

function todayDateStr() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── История ────────────────────────────────────────────────────────────────
async function loadHistory() {
  const el = document.getElementById('history-content');
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2);">Загрузка...</div>';
  const data = await api('GET', `/readings/${state.userId}`);
  if (!data.ok || !data.readings?.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🃏</div><h3>Нет расскладов</h3><p>Сделайте первый расклад — он сохранится здесь</p></div>`;
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

  // Навігація з головного екрану (4 клітинки)
  document.querySelectorAll('.nav-cell[data-screen]').forEach(el => {
    el.addEventListener('click', async () => {
      const s = el.dataset.screen;
      if (s === 'tarot')   { showScreen('tarot'); }
      else if (s === 'spells') { await openSpellsScreen(); }
      else if (s === 'moon')   { showScreen('moon'); await renderMoonCalendar(); }
      else if (s === 'premium') { showScreen('premium'); loadRefStats(); }
    });
  });

  // Кнопка «Все заговоры →» на головному
  document.getElementById('btn-all-spells')?.addEventListener('click', () => openSpellsScreen());

  // Розклади Таро
  document.querySelector('[data-spread="three_card"]')?.addEventListener('click', () => openSpread('three_card'));
  document.querySelectorAll('.premium-card[data-spread]').forEach(el => el.addEventListener('click', () => openSpread(el.dataset.spread)));

  // Заговоры → категорія (повторюємо і в tarot-screen)
  document.querySelectorAll('.premium-card[data-spread]').forEach(el => el.addEventListener('click', () => openSpread(el.dataset.spread)));

  // Кнопка підсумку
  document.getElementById('btn-show-summary').addEventListener('click', () => {
    const r = state.currentReading;
    if (!r) return;
    const lines = [`🔮 ${ru(r.spreadName)}`, r.interpretation || '', '',
      ...r.cards.map((c, i) => `${c.emoji} ${ru(r.positions[i])}: ${c.nameRu || c.name}\n${c.isReversed ? ru(c.reversed) : ru(c.upright)}`)
    ].join('\n');
    tg?.showPopup?.({ title: ru(r.spreadName), message: lines.slice(0, 600), buttons: [{ type: 'close' }] }) || alert(lines);
  });

  // ── Преміум: вибір плану ──────────────────────────────────────────────────
  let selectedPlan = 'premium_90'; // за замовчуванням "3 місяці"
  document.querySelectorAll('.plan-card').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      selectedPlan = el.dataset.plan;
      const labels = { premium_30: '1 месяц — ⭐ 299', premium_90: '3 месяца — ⭐ 699', premium_365: '1 год — ⭐ 1990' };
      document.getElementById('btn-buy-label').textContent = `Оплатить ${labels[selectedPlan]} 👑`;
      tg?.HapticFeedback?.selectionChanged?.();
    });
    // Виділяємо дефолт
    if (el.dataset.plan === selectedPlan) el.classList.add('selected');
  });
  document.getElementById('btn-buy-label').textContent = 'Оплатить 3 месяца — ⭐ 699 👑';

  document.getElementById('btn-buy-premium').addEventListener('click', async () => {
    const btn = document.getElementById('btn-buy-premium');
    btn.disabled = true;
    btn.querySelector('#btn-buy-label').textContent = '⭐ Создаём счёт...';
    try {
      const data = await api('POST', '/payments/invoice', { planId: selectedPlan, userId: state.userId });
      if (!data.ok) throw new Error(data.error);
      tg?.openInvoice?.(data.link, (status) => {
        if (status === 'paid') {
          toast('✨ Премиум активирован! Перезайди в кабинет.');
          setTimeout(() => location.reload(), 1500);
        } else if (status === 'cancelled') {
          toast('Оплата отменена');
        }
      });
    } catch (e) {
      toast('Ошибка создания счёта. Попробуй позже.');
    } finally {
      btn.disabled = false;
      document.getElementById('btn-buy-label').textContent = 'Оплатить 👑';
    }
  });

  // ── Реферальна система ────────────────────────────────────────────────────
  document.getElementById('btn-ref')?.addEventListener('click', async () => {
    try {
      const botInfo = await api('GET', '/status');
      const botName = botInfo.botUsername || 'MagicCabinetBot';
      const refLink = `https://t.me/${botName}?start=ref_${state.userId}`;
      if (tg?.shareURL) {
        tg.shareURL(refLink, '🔮 Присоединяйся к Магическому кабинету — карты Таро, заговоры и лунный календарь персонально!');
      } else if (navigator.share) {
        await navigator.share({ text: `🔮 Магический кабинет — Таро, заговоры и лунная магия!\n${refLink}` });
      } else {
        await navigator.clipboard.writeText(refLink);
        toast('Ссылка скопирована! 🔗');
      }
      // Показуємо статистику
      const refData = await api('GET', `/users/${state.userId}/ref`);
      if (refData.ok && refData.refBonus > 0) {
        document.getElementById('ref-stats').innerHTML =
          `✨ Уже пригласила: <b>${refData.refBonus}</b> подруг${refData.refBonus === 1 ? 'у' : 'и'}`;
      }
    } catch (_) { toast('Не удалось поделиться'); }
  });

  // Завантажуємо реф-статистику при відкритті
  async function loadRefStats() {
    const refData = await api('GET', `/users/${state.userId}/ref`);
    if (refData.ok && refData.refBonus > 0) {
      document.getElementById('ref-stats').innerHTML =
        `✨ Уже пригласила: <b>${refData.refBonus}</b> подруг${refData.refBonus === 1 ? 'у' : 'и'}`;
    }
  }

  // Історія
  document.getElementById('btn-history').addEventListener('click', async () => { showScreen('history'); await loadHistory(); });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function ru(obj) { if (!obj) return ''; return obj.ru || obj.ua || obj.en || String(obj); }
function fmtDate(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  initStars();
  initNav();
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
  setTimeout(() => showScreen('intro'), 900);
}

init().catch(() => setTimeout(() => showScreen('intro'), 1000));
