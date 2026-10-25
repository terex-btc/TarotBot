// ══ Вкладка «Сьогодні»: плитки, карта дня, гороскоп, Місяць, число дня ══════
import { t, getLang, locale } from '../i18n.js';
import { state, track, onStateChange, emit } from '../state.js';
import { api } from '../api.js';
import { haptic, share } from '../platform.js';
import { openSheet, closeLayer, esc, toast, spinner, typeText } from '../ui.js';
import { cardBack, moonSvg, zodiacGlyph, eyeArt, sparkle, clouds, hills, starsField, icons } from '../art.js';
import { zodiacOf, lifePath, personalYear, personalDay, moonAt, upcomingPhases, SIGNS } from '../astro.js';
import { showPaywall } from './paywall.js';
import { openCardDetail, cardName, cardKeywords, cardImg } from './library.js';
import { openCompat, openMe } from './me.js';

let root;

export function mountToday(el, { goTab }) {
  root = el;
  // Карта дня вже витягнута сьогодні — показуємо її одразу
  try {
    const saved = JSON.parse(localStorage.getItem('lunara_daily') || 'null');
    if (saved?.date === localDate() && saved.userId === state.userId) state.daily = saved.reading;
  } catch (_) {}
  render(goTab);
  onStateChange(what => { if (['premium', 'user', 'lang', 'daily'].includes(what)) render(goTab); });
}

function greeting() {
  const h = new Date().getHours();
  return t(h < 5 ? 'greetNight' : h < 12 ? 'greetMorning' : h < 18 ? 'greetDay' : 'greetEvening');
}

export function userAstro() {
  const b = state.user?.birthDate;
  if (!b) return null;
  const z = zodiacOf(b), m = moonAt();
  return {
    zodiac: { name: z.name[getLang()], key: z.key },
    lifePath: lifePath(b),
    personalYear: personalYear(b),
    moonPhase: { name: t('phase_' + m.phase) },
  };
}

function render(goTab) {
  const u = state.user;
  if (!u) return;
  const L = getLang();
  const z = zodiacOf(u.birthDate);
  const now = new Date();
  const m = moonAt(now);
  const yest = moonAt(new Date(now.getTime() - 86400000));
  const tom = moonAt(new Date(now.getTime() + 86400000));
  const pd = personalDay(u.birthDate, now);
  const daily = state.daily?.cards?.[0];

  root.innerHTML = `<div class="scroll tab-scroll">
    <header class="home-head">
      <button class="avatar" id="h-avatar" aria-label="${t('profile')}">${zodiacGlyph(z.key, { stroke: 7 })}</button>
      <div class="home-who">
        <div class="home-greet">${greeting()}</div>
        <div class="home-name serif">${esc(u.firstName || '')}</div>
      </div>
      ${state.isPremium
        ? `<span class="pro-pill on">PRO</span>`
        : `<button class="pro-pill" id="h-pro">PRO</button>`}
      <button class="icon-btn soft" id="h-gear" aria-label="${t('settings')}">${icons.gear}</button>
    </header>

    <div class="tiles">
      <button class="tile tile-daily${daily ? ' drawn' : ''}" id="t-daily">
        <span class="tile-title serif">${t('cardOfDay')}</span>
        ${sparkle('t-sp1')}${sparkle('t-sp2')}
        <span class="tile-art daily-art">${daily
          ? `<span class="mini-card${daily.isReversed ? ' rev' : ''}">${cardImg(daily)}</span>`
          : `<span class="mini-back">${cardBack()}</span><span class="tap-hint">${t('tapToReveal')}</span>`}</span>
      </button>

      <button class="tile tile-spread" id="t-spread">
        <span class="tile-title serif">${t('tarotReading')}</span>
        <span class="chip-ai">${sparkle()}AI</span>
        <span class="tile-art fan3">
          <span class="fc f1">${cardBack({ glow: false })}</span>
          <span class="fc f2">${cardBack()}</span>
          <span class="fc f3">${cardBack({ glow: false })}</span>
        </span>
      </button>

      <button class="tile tile-horo" id="t-horo">
        <span class="tile-title serif">${t('horoscope')}</span>
        <span class="tile-art horo-art">${zodiacGlyph(z.key, { stroke: 5 })}</span>
        <span class="tile-foot">${z.name[L]}</span>
      </button>

      <button class="tile tile-oracle" id="t-oracle">
        ${sparkle('t-sp3')}
        <span class="tile-art eye-wrap">${eyeArt()}</span>
        <span class="tile-title serif bottom">${t('askOracle')}</span>
      </button>
    </div>

    <button class="moon-card" id="t-moon">
      ${starsField(24, 13)}
      <div class="mc-top">
        <span class="mc-eyebrow">${t('moonIn', { sign: t('sign_' + m.sign) })}</span>
        <span class="mc-today">${icons.calendar}${t('today')}</span>
      </div>
      <div class="mc-phase serif">${t('phase_' + m.phase)}</div>
      <div class="mc-moons">
        <span class="mc-side">${moonSvg(yest.illum, yest.waxing, { size: 84 })}</span>
        <span class="mc-main">${moonSvg(m.illum, m.waxing, { size: 132 })}</span>
        <span class="mc-side">${moonSvg(tom.illum, tom.waxing, { size: 84 })}</span>
      </div>
      <div class="mc-illum">${t('illumination', { pct: Math.round(m.illum * 100) })}</div>
    </button>

    <div class="row-cards">
      <div class="num-card">
        <div class="num-big serif">${pd}</div>
        <div><div class="num-label">${t('dayNumber')}</div><div class="num-text">${t('pd_' + pd)}</div></div>
      </div>
    </div>

    <button class="banner-compat" id="t-compat">
      <span class="bc-icon">${icons.heart}</span>
      <span class="bc-text"><b>${t('compatTitle')}</b><span>${t('compatTeaser')}</span></span>
      ${icons.chevron}
    </button>

    <p class="disclaimer">${t('disclaimer')}</p>
  </div>`;

  const $ = s => root.querySelector(s);
  $('#h-avatar').onclick = () => { haptic('light'); openMe(); };
  $('#h-gear').onclick = () => { haptic('light'); openMe(); };
  $('#h-pro')?.addEventListener('click', () => showPaywall({ source: 'home_pro' }));
  $('#t-daily').onclick = () => { haptic('light'); openDaily(); };
  $('#t-spread').onclick = () => { haptic('light'); goTab('spreads'); };
  $('#t-horo').onclick = () => { haptic('light'); openHoroscope(z.key); };
  $('#t-oracle').onclick = () => { haptic('light'); goTab('oracle'); };
  $('#t-moon').onclick = () => { haptic('light'); openMoon(); };
  $('#t-compat').onclick = () => { haptic('light'); openCompat(); };
}

// ══ Карта дня ════════════════════════════════════════════════════════════════
export async function openDaily() {
  const L = getLang();
  const dateLabel = new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' });
  const layer = openSheet(`<div class="daily">
      <div class="sky">${clouds('day')}<div class="sun-glow"></div>${hills({ a: '#6aa98c', b: '#4d8a73' })}</div>
      <button class="icon-btn sheet-x" data-close aria-label="${t('close')}">${icons.close}</button>
      <div class="daily-scroll scroll">
        <div class="ds-date">${esc(dateLabel)}</div>
        <div class="ds-stage">
          <div class="deck" id="ds-deck">
            ${[0, 1, 2, 3].map(i => `<div class="deck-card" style="--i:${i}">${cardBack({ glow: false })}</div>`).join('')}
            <div class="burst"></div>
            <div class="sparks">${Array.from({ length: 14 }, (_, i) =>
              `<i style="--a:${Math.round(i * 360 / 14 + Math.random() * 12)}deg;--r:${90 + Math.round(Math.random() * 70)}px;--s:${(Math.random() * .5 + .6).toFixed(2)}"></i>`).join('')}</div>
            <div class="ds-card" id="ds-card">
              <div class="flip">
                <div class="face back">${cardBack()}</div>
                <div class="face front" id="ds-front"></div>
              </div>
            </div>
          </div>
          <p class="ds-hint" id="ds-hint">${t('tapToReveal')}</p>
        </div>
        <div class="ds-info" id="ds-info"></div>
      </div>
    </div>`, { cls: 'daily-layer' });

  const cardEl = layer.querySelector('#ds-card');
  const deck = layer.querySelector('#ds-deck');
  const info = layer.querySelector('#ds-info');
  const hint = layer.querySelector('#ds-hint');

  let reading = state.daily;
  const reveal = (instant) => {
    const card = reading.cards[0];
    layer.querySelector('#ds-front').innerHTML = `<div class="card-frame${card.isReversed ? ' rev' : ''}">${cardImg(card)}</div>`;
    if (instant) { cardEl.classList.add('flipped', 'instant'); deck.classList.add('dealt', 'instant'); }
    else requestAnimationFrame(() => cardEl.classList.add('flipped'));
    hint.remove();
    const kws = cardKeywords(card);
    info.innerHTML = `
      <h2 class="serif ds-name">${esc(cardName(card))}</h2>
      ${card.isReversed ? `<div class="rev-tag">${t('reversed')}</div>` : ''}
      <p class="ds-text">${esc(card.description?.[L] || card.description?.en || '')}</p>
      <div class="chips center">${kws.map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>
      <div class="ds-ai" id="ds-ai">
        <button class="btn-ai" id="ds-ai-btn">${sparkle()}<span>${t('aiInsightBtn')}</span></button>
        <p class="ds-ai-note">${state.isPremium ? t('aiInsightNotePro') : t('aiInsightNoteFree')}</p>
      </div>
      <div class="ds-actions">
        <button class="round-btn" id="ds-share" aria-label="${t('share')}">${icons.share}</button>
        <button class="btn-ghost" id="ds-more"><span>${t('fullMeaning')}</span>${icons.chevron}</button>
      </div>`;
    setTimeout(() => info.classList.add('show'), instant ? 0 : 650);
    info.querySelector('#ds-share').onclick = async () => {
      const ok = await share({ title: t('cardOfDay'), text: t('shareDaily', { card: cardName(card), app: 'Lunara' }) });
      if (ok === 'copied') toast(t('copied'));
    };
    info.querySelector('#ds-more').onclick = () => openCardDetail(card);
    info.querySelector('#ds-ai-btn').onclick = () => dailyAi(info.querySelector('#ds-ai'), reading, card);
    // оновлюємо плитку на головній
    emit('daily');
  };

  if (reading) { reveal(true); return; }

  // Тасування → карта вилітає з колоди → спалах та іскри → переворот. Кожен етап з вібрацією.
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const draw = async () => {
    if (cardEl.dataset.busy) return;
    cardEl.dataset.busy = '1';
    haptic('medium');
    deck.classList.add('shuffling');
    hint.textContent = t('drawing');
    const ticks = setInterval(() => haptic('select'), 160);
    const [res] = await Promise.all([
      api('POST', `/readings/${state.userId}`, { spreadType: 'daily', lang: L }),
      wait(1300),
    ]);
    clearInterval(ticks);
    deck.classList.remove('shuffling');
    if (!res.ok || !res.reading) {
      delete cardEl.dataset.busy;
      hint.textContent = t(res.error === 'offline' ? 'errOffline' : 'errGeneric');
      return;
    }
    reading = state.daily = res.reading;
    try { localStorage.setItem('lunara_daily', JSON.stringify({ date: localDate(), userId: state.userId, reading })); } catch (_) {}
    track('daily_open');
    deck.classList.add('dealt');          // решта колоди відходить, карта злітає
    cardEl.classList.add('flyout');
    haptic('heavy');
    await wait(520);
    deck.classList.add('burst-on');       // спалах + іскри
    haptic('rigid');
    reveal(false);
    await wait(650);
    haptic('success');
  };
  cardEl.onclick = draw;
  deck.onclick = e => { if (!e.target.closest('#ds-card')) draw(); };
}

async function dailyAi(box, reading, card) {
  track('daily_ai_click');
  box.innerHTML = spinner(t('aiThinking'));
  const res = await api('POST', '/ai/interpret', {
    cards: [card],
    positions: [{ en: 'Card of the day', ru: 'Карта дня', ua: 'Карта дня' }],
    spreadName: { en: 'Card of the day', ru: 'Карта дня', ua: 'Карта дня' },
    question: '',
    userAstro: userAstro(),
    lang: getLang(),
    userId: state.userId,
    freeDaily: true,
  });
  if (res.ok && res.interpretation) {
    box.innerHTML = `<div class="ai-box"><div class="ai-box-head">${sparkle()}<span>${t('aiInsight')}</span></div><p class="ai-text"></p></div>`;
    typeText(box.querySelector('.ai-text'), res.interpretation);
    haptic('success');
  } else if (res.needPremium) {
    box.innerHTML = `<div class="ai-box locked"><p>${t('aiFreeUsed')}</p>
      <button class="btn-primary small" id="ai-unlock"><span>${t('unlockPro')}</span></button></div>`;
    box.querySelector('#ai-unlock').onclick = () => showPaywall({ source: 'daily_ai' });
  } else {
    box.innerHTML = `<p class="ds-ai-note">${t('aiUnavailable')}</p>`;
  }
}

// ══ Гороскоп ═════════════════════════════════════════════════════════════════
export async function openHoroscope(signKey) {
  track('horoscope_open', signKey);
  const layer = openSheet(`<div class="horo">
      ${starsField(40, 17)}
      <button class="icon-btn sheet-x" data-close aria-label="${t('close')}">${icons.close}</button>
      <div class="horo-scroll scroll" id="horo-body"></div>
    </div>`, { cls: 'horo-layer' });
  const body = layer.querySelector('#horo-body');
  const own = zodiacOf(state.user.birthDate).key;
  loadSign(signKey);

  async function loadSign(key) {
    const L = getLang();
    const sign = SIGNS.find(s => s.key === key);
    const date = localDate();
    body.innerHTML = `
      <div class="horo-hero">
        <div class="horo-glyph">${zodiacGlyph(key, { stroke: 4 })}</div>
        <div class="horo-date">${esc(new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }))}</div>
        <h2 class="serif horo-sign">${sign.name[L]}</h2>
        <div class="horo-meta">${t('element_' + sign.element)} · ${t('planet_' + sign.ruler)}</div>
      </div>
      <div id="horo-content">${spinner(t('horoLoading'))}</div>
      <div class="horo-others-title">${t('otherSigns')}</div>
      <div class="sign-rail">${SIGNS.slice().sort((a, b) => (a.key === own ? -1 : b.key === own ? 1 : 0)).map(s => `
        <button class="sign-pill${s.key === key ? ' on' : ''}" data-k="${s.key}">${zodiacGlyph(s.key, { stroke: 7 })}<span>${s.name[L]}</span></button>`).join('')}
      </div>`;
    body.querySelectorAll('.sign-pill').forEach(b => b.onclick = () => { haptic('select'); body.scrollTo({ top: 0, behavior: 'smooth' }); loadSign(b.dataset.k); });
    const res = await api('GET', `/app/horoscope/${key}?lang=${L}&date=${date}`);
    const box = body.querySelector('#horo-content');
    if (!box) return;
    if (!res.ok) { box.innerHTML = `<p class="muted center">${t('horoUnavailable')}</p>`; return; }
    const h = res.horoscope;
    box.innerHTML = `
      <div class="horo-focus"><span>${t('todayFocus')}</span><b class="serif">${esc(h.focus)}</b></div>
      <p class="horo-overview">${esc(h.overview)}</p>
      <div class="horo-areas">
        <div class="area"><div class="area-head">${icons.heart}<b>${t('areaLove')}</b></div><p>${esc(h.love)}</p></div>
        <div class="area"><div class="area-head">${icons.crown}<b>${t('areaCareer')}</b></div><p>${esc(h.career)}</p></div>
        <div class="area"><div class="area-head">${sparkle()}<b>${t('areaWellbeing')}</b></div><p>${esc(h.wellbeing)}</p></div>
      </div>
      <div class="lucky">
        <div><span>${t('luckyNumber')}</span><b class="serif">${esc(h.luckyNumber)}</b></div>
        <div><span>${t('luckyColor')}</span><b class="serif">${esc(h.luckyColor)}</b></div>
        <div><span>${t('mood')}</span><b class="serif">${esc(h.mood)}</b></div>
      </div>`;
  }
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ══ Місячний календар ════════════════════════════════════════════════════════
export function openMoon() {
  track('moon_open');
  const now = new Date();
  const m = moonAt(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000);
    return { d, ...moonAt(d) };
  });
  const next = upcomingPhases(now, 4);
  const list = key => (t(key) || []).map(x => `<li>${esc(x)}</li>`).join('');
  openSheet(`<div class="moon">
      ${starsField(60, 23)}
      <button class="icon-btn sheet-x" data-close aria-label="${t('close')}">${icons.close}</button>
      <div class="moon-scroll scroll">
        <div class="moon-hero">
          <div class="moon-big">${moonSvg(m.illum, m.waxing, { size: 190 })}</div>
          <div class="mc-eyebrow">${t('moonIn', { sign: t('sign_' + m.sign) })} · ${t('illumination', { pct: Math.round(m.illum * 100) })}</div>
          <h2 class="serif moon-phase">${t('phase_' + m.phase)}</h2>
          <p class="moon-desc">${t('phase_' + m.phase + '_desc')}</p>
        </div>
        <div class="week">${days.map((x, i) => `
          <div class="week-day${i === 0 ? ' on' : ''}">
            <span>${x.d.toLocaleDateString(locale(), { weekday: 'short' })}</span>
            ${moonSvg(x.illum, x.waxing, { size: 34 })}
            <b>${x.d.getDate()}</b>
          </div>`).join('')}
        </div>
        <div class="do-dont">
          <div class="dd do"><h4>${t('moonDo')}</h4><ul>${list('phase_' + m.phase + '_do')}</ul></div>
          <div class="dd dont"><h4>${t('moonAvoid')}</h4><ul>${list('phase_' + m.phase + '_avoid')}</ul></div>
        </div>
        <h4 class="section-title">${t('upcomingPhases')}</h4>
        <div class="phase-list">${next.map(p => `
          <div class="phase-row">${moonSvg(p.illum, p.waxing, { size: 40 })}
            <div><b>${t('phase_' + p.phase)}</b><span>${esc(p.date.toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }))}</span></div>
          </div>`).join('')}
        </div>
      </div>
    </div>`, { cls: 'moon-layer' });
}
