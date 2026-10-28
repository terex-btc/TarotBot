// ══ Вкладка «Сьогодні»: плитки, карта дня, гороскоп, Місяць, число дня ══════
import { t, getLang, locale } from '../i18n.js';
import { state, track, onStateChange, emit, localDateStr, bumpStreak, currentStreak, msToMidnight } from '../state.js';
import { api } from '../api.js';
import { haptic, share } from '../platform.js';
import { openSheet, closeLayer, esc, toast, spinner, typeText } from '../ui.js';
import { cardBack, moonSvg, zodiacGlyph, eyeArt, sparkle, clouds, hills, starsField, constellation, icons } from '../art.js';
import { play } from '../sound.js';
import { zodiacOf, lifePath, personalYear, personalDay, moonAt, upcomingPhases, SIGNS } from '../astro.js';
import { showPaywall } from './paywall.js';
import { openCardDetail, cardName, cardKeywords, cardImg } from './library.js';
import { openCompat, openMe } from './me.js';
import { loadDetails, cardDetail, yesNo, tx } from '../reading.js';
import { journalHtml, wireJournal } from '../journal.js';
import { openSpread, spreadById, spreadTileHtml, wireSpreadTiles } from './spreads.js';
import { nextLesson, continueLearning } from './learn.js';
import { skyPillHtml, openSky, glyphBubble, skyEventRow } from './cosmic.js';
import { activeRetros, sx, skyEventsBetween } from '../sky.js';
import { readingDone, afterReadingClosed } from '../moments.js';
import { rescheduleAlerts } from '../reminders.js';

let root;

export function mountToday(el, { goTab }) {
  root = el;
  // Карта дня вже витягнута сьогодні — показуємо її одразу
  try {
    const saved = JSON.parse(localStorage.getItem('lunara_daily') || 'null');
    if (saved?.date === localDateStr() && saved.userId === state.userId) state.daily = saved.reading;
  } catch (_) {}
  render(goTab);
  onStateChange(what => { if (['premium', 'user', 'lang', 'daily', 'learn', 'cardback'].includes(what)) render(goTab); });
  // Опівночі карта дня стає «вчорашньою» — перемальовуємо, коли повертаються в застосунок
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !state.daily) return;
    try {
      const saved = JSON.parse(localStorage.getItem('lunara_daily') || 'null');
      if (saved?.date !== localDateStr()) { state.daily = null; render(goTab); }
    } catch (_) {}
  });
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

// Ідеї під інтереси з онбордингу. «Так/Ні» — завжди першою.
const FOR_YOU = {
  yes_no:  { icon: 'yesno', go: () => openSpread(spreadById('yes_no')) },
  love:    { icon: 'heart', go: () => openSpread(spreadById('love'), t('fyLoveQ')) },
  career:  { icon: 'briefcase', go: () => openSpread(spreadById('career_path') || spreadById('month'), t('fyCareerQ')) },
  growth:  { icon: 'sprout', go: (goTab) => { if (!continueLearning()) goTab('learn'); } },
  balance: { icon: 'lotus', go: () => openMoon() },
  family:  { icon: 'home', go: () => openSpread(spreadById('family') || spreadById('three_card'), t('fyFamilyQ')) },
  spirit:  { icon: 'crystal', go: (goTab) => goTab('oracle') },
};
// Популярні розклади на головній — для всіх, незалежно від інтересів з онбордингу
const POPULAR = ['love_true', 'money_flow', 'love_return', 'career_path', 'new_moon', 'week'];

function forYouKeys() {
  const f = (state.focus || []).filter(k => FOR_YOU[k]);
  return ['yes_no', ...(f.length ? f : ['love', 'career', 'growth'])].slice(0, 5);
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
  const daily = state.daily?.cards?.[0];
  const streak = currentStreak();
  const nl = nextLesson();

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
    <div class="sky-strip">${skyPillHtml()}</div>

    <div class="tiles">
      <button class="tile tile-daily${daily ? ' drawn' : ''}" id="t-daily">
        <span class="tile-title serif">${t('cardOfDay')}</span>
        ${sparkle('t-sp1')}${sparkle('t-sp2')}
        ${streak > 1 ? `<span class="streak-pill" title="${t('streakDays', { n: streak })}">${icons.flame}${streak}</span>` : ''}
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
        <span class="tile-constel">${constellation()}</span>
        <span class="tile-art horo-art">${zodiacGlyph(z.key, { stroke: 5 })}</span>
        <span class="tile-foot">${z.name[L]}</span>
      </button>

      <button class="tile tile-oracle" id="t-oracle">
        ${sparkle('t-sp3')}
        <span class="tile-art eye-wrap">${eyeArt()}</span>
        <span class="tile-title serif bottom">${t('askOracle')}</span>
      </button>
    </div>

    <h3 class="section-title">${t('forYou')}</h3>
    <div class="fy-rail">${forYouKeys().map(k => `
      <button class="fy-card fy-${k}" data-k="${k}">
        <span class="fy-ico">${icons[FOR_YOU[k].icon]}</span>
        <b class="serif">${t('fy_' + k)}</b>
        <span>${t('fy_' + k + '_sub')}</span>
      </button>`).join('')}
    </div>

    <div class="sec-row"><h3 class="section-title">${t('popularSpreads')}</h3><button class="sec-link" id="t-allsp">${t('seeAll')}${icons.chevron}</button></div>
    <div class="fy-rail sp-rail">${POPULAR.map(spreadById).filter(Boolean).map(spreadTileHtml).join('')}</div>

    ${nl ? `<button class="continue-card" id="t-learn">
      <span class="cc-emoji">${icons[nl.lesson.icon] || icons.learn}</span>
      <span class="cc-text">
        <small>${nl.done ? t('continueLearning') : t('startLearning')}</small>
        <b class="serif">${esc(nl.lesson.title[L])}</b>
        <span class="cc-bar"><i style="width:${Math.round(nl.done / nl.total * 100)}%"></i></span>
        <small>${t('lessonN', { n: nl.i + 1, total: nl.total })} · ${t('minutes', { n: nl.lesson.minutes })}</small>
      </span>
      ${icons.chevron}
    </button>` : ''}

    <button class="moon-card" id="t-moon">
      ${starsField(24, 13)}
      <div class="mc-top">
        <span class="mc-eyebrow">${t('moonIn', { sign: t('sign_' + m.sign) })}</span>
        <span class="mc-today">${icons.calendar}${t('today')}</span>
      </div>
      <div class="mc-phase serif">${t('phase_' + m.phase)}</div>
      <div class="mc-moons">
        <span class="mc-side">${moonSvg(yest.illum, yest.waxing, { size: 62 })}</span>
        <span class="mc-main">${moonSvg(m.illum, m.waxing, { size: 100 })}</span>
        <span class="mc-side">${moonSvg(tom.illum, tom.waxing, { size: 62 })}</span>
      </div>
      <div class="mc-illum">${t('illumination', { pct: Math.round(m.illum * 100) })}</div>
    </button>

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
  $('#t-allsp').onclick = () => { haptic('light'); goTab('spreads'); };
  wireSpreadTiles(root.querySelector('.sp-rail'));
  $('#t-horo').onclick = () => { haptic('light'); openHoroscope(z.key); };
  $('#t-oracle').onclick = () => { haptic('light'); goTab('oracle'); };
  $('#t-moon').onclick = () => { haptic('light'); openMoon(); };
  $('#h-sky').onclick = () => { haptic('light'); openSky(); };
  $('#t-compat').onclick = () => { haptic('light'); openCompat(); };
  $('#t-learn')?.addEventListener('click', () => { haptic('light'); continueLearning(); });
  root.querySelectorAll('.fy-card').forEach(b => b.onclick = () => {
    haptic('light');
    track('foryou_click', b.dataset.k);
    FOR_YOU[b.dataset.k].go(goTab);
  });
}

// ══ Карта дня ════════════════════════════════════════════════════════════════
export async function openDaily() {
  const L = getLang();
  loadDetails();   // розширені значення карт — підвантажуємо заздалегідь
  const dateLabel = new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' });
  const layer = openSheet(`<div class="daily">
      <button class="icon-btn sheet-x" data-close aria-label="${t('close')}">${icons.close}</button>
      <div class="daily-scroll scroll">
        <div class="sky">${clouds('day')}<div class="sun-glow"></div>${hills({ a: '#6aa98c', b: '#4d8a73' })}</div>
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
    </div>`, { cls: 'daily-layer', onClose: () => { if (drewNow) afterReadingClosed(); } });
  let drewNow = false;

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
    const st = bumpStreak();
    if (!instant) { drewNow = true; readingDone(); rescheduleAlerts(); }
    const kws = cardKeywords(card);
    const d = cardDetail(card);
    const T = tx();
    const yn = yesNo(card);
    const S = sx();
    const skyNow = activeRetros(reading.createdAt ? new Date(reading.createdAt) : new Date());
    info.innerHTML = `
      <div class="ds-next">
        <span class="streak-pill">${icons.flame}${t('streakDays', { n: st.count })}</span>
        <span class="ds-timer" id="ds-timer">${t('nextCardIn', { time: untilMidnight() })}</span>
      </div>
      <h2 class="serif ds-name">${esc(cardName(card))}</h2>
      ${card.isReversed ? `<div class="rev-tag">${t('reversed')}</div>` : ''}
      <p class="ds-text">${esc(d ? (card.isReversed ? d.rev : d.up) : (card.description?.[L] || card.description?.en || ''))}</p>
      <div class="chips center">${kws.map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>
      ${d ? `<div class="ds-aspects">
        <div class="asp"><span>${T.lbl.love}</span><p>${esc(d.love)}</p></div>
        <div class="asp"><span>${T.lbl.work}</span><p>${esc(d.work)}</p></div>
        <div class="asp asp-adv"><span>${t('adviceOfDay')}</span><p class="serif">${esc(d.advice)}</p></div>
        <div class="asp asp-yn"><span>${T.lbl.yn}</span><b class="yn-${yn}">${T.yn[yn]}</b></div>
      </div>` : ''}
      ${skyNow.length ? `<button class="ds-sky" id="ds-sky">${skyNow.map(r => `<span class="dsk">${glyphBubble(r.planet)}
        <span><b>${esc(S.rx(r.planet))}</b>${esc(S.p[r.planet].tip)}</span></span>`).join('')}</button>` : ''}
      <div class="ds-ai" id="ds-ai">
        <button class="btn-ai" id="ds-ai-btn">${sparkle()}<span>${t('aiInsightBtn')}</span></button>
        <p class="ds-ai-note">${state.isPremium ? t('aiInsightNotePro') : t('aiInsightNoteFree')}</p>
      </div>
      ${journalHtml(reading)}
      <div class="ds-actions">
        <button class="round-btn" id="ds-share" aria-label="${t('share')}">${icons.share}</button>
        <button class="btn-ghost" id="ds-more"><span>${t('fullMeaning')}</span>${icons.chevron}</button>
      </div>`;
    wireJournal(info, reading, saveDaily);
    // Таймер до нової карти — щохвилини, поки шторка відкрита
    const timer = setInterval(() => {
      const el = layer.querySelector('#ds-timer');
      if (!el) { clearInterval(timer); return; }
      el.textContent = t('nextCardIn', { time: untilMidnight() });
    }, 30000);
    setTimeout(() => info.classList.add('show'), instant ? 0 : 650);
    info.querySelector('#ds-share').onclick = async () => {
      const ok = await share({ title: t('cardOfDay'), text: t('shareDaily', { card: cardName(card), app: t('appName') }) });
      if (ok === 'copied') toast(t('copied'));
    };
    info.querySelector('#ds-more').onclick = () => openCardDetail(card);
    info.querySelector('#ds-sky')?.addEventListener('click', () => { haptic('light'); openSky(); });
    info.querySelector('#ds-ai-btn').onclick = () => dailyAi(info.querySelector('#ds-ai'), reading, card);
    // оновлюємо плитку на головній
    emit('daily');
  };

  if (reading) { await loadDetails(); reveal(true); return; }

  // Тасування → карта вилітає з колоди → спалах та іскри → переворот. Кожен етап з вібрацією.
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const draw = async () => {
    if (cardEl.dataset.busy) return;
    cardEl.dataset.busy = '1';
    haptic('medium');
    deck.classList.add('shuffling');
    play('shuffle');
    hint.textContent = t('drawing');
    const ticks = setInterval(() => haptic('select'), 160);
    const [res] = await Promise.all([
      api('POST', `/readings/${state.userId}`, { spreadType: 'daily', lang: L, localDate: localDateStr() }),
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
    saveDaily(reading);
    track('daily_open');
    deck.classList.add('dealt');          // решта колоди відходить, карта злітає
    cardEl.classList.add('flyout');
    haptic('heavy');
    play('flip');
    await wait(520);
    deck.classList.add('burst-on');       // спалах + іскри
    haptic('rigid');
    play('reveal');
    await loadDetails();
    reveal(false);
    await wait(650);
    haptic('success');
  };
  cardEl.onclick = draw;
  deck.onclick = e => { if (!e.target.closest('#ds-card')) draw(); };
}

function saveDaily(reading) {
  try { localStorage.setItem('lunara_daily', JSON.stringify({ date: localDateStr(), userId: state.userId, reading })); } catch (_) {}
}
// «5 год 12 хв» до місцевої півночі
function untilMidnight() {
  const min = Math.max(1, Math.ceil(msToMidnight() / 60000));
  return t('hhmm', { h: Math.floor(min / 60), m: min % 60 });
}

async function dailyAi(box, reading, card) {
  track('daily_ai_click');
  box.innerHTML = spinner(t('aiThinking'));
  const res = await api('POST', '/ai/interpret', {
    cards: [card],
    positions: [{ en: 'Card of the day' }],
    spreadName: { en: 'Card of the day' },
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
    const date = localDateStr();
    body.innerHTML = `
      <div class="horo-hero">
        <div class="horo-glyph">${zodiacGlyph(key, { stroke: 4 })}</div>
        <div class="horo-date">${esc(new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }))}</div>
        <h2 class="serif horo-sign">${sign.name[L]}</h2>
        <div class="horo-meta">${t('element_' + sign.element)} · ${t('planet_' + sign.ruler)}</div>
      </div>
      <div id="horo-content" aria-busy="true">
        <div class="skel skel-pill"></div>
        <div class="skel skel-line"></div><div class="skel skel-line"></div><div class="skel skel-line short"></div>
        <div class="skel skel-block"></div><div class="skel skel-block"></div>
      </div>
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
    const S = sx();
    const rx = activeRetros();
    const pd = personalDay(state.user.birthDate, new Date());
    box.innerHTML = `
      <div class="horo-focus"><span>${t('todayFocus')}</span><b class="serif">${esc(h.focus)}</b></div>
      ${rx.length ? `<button class="horo-sky" id="horo-sky">${rx.map(r => `<span class="dsk">${glyphBubble(r.planet)}
        <span><b>${esc(S.rx(r.planet))}</b>${esc(S.p[r.planet].tip)}</span></span>`).join('')}</button>` : ''}
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
      </div>
      <div class="num-card horo-num">
        <div class="num-big serif">${pd}</div>
        <div><div class="num-label">${t('dayNumber')}</div><div class="num-text">${t('pd_' + pd)}</div></div>
      </div>`;
    box.querySelector('#horo-sky')?.addEventListener('click', () => { haptic('light'); openSky(); });
  }
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
  // Події неба: позначки на днях тижня + спільний список із фазами
  const S = sx();
  const rx = activeRetros(now);
  const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const horizon = Math.max(now.getTime() + 8 * 86400000, (next[next.length - 1]?.date || now).getTime() + 86400000);
  const events = skyEventsBetween(dayStart(now), horizon);
  const marks = d => events.filter(e => dayStart(e.date).getTime() === dayStart(d).getTime())
    .map(e => `<em class="wd-ev ${e.kind === 'eclipse' ? 'ev-ecl' : 'ev-' + e.planet}">${e.kind === 'eclipse' ? '◐' : '℞'}</em>`).join('');
  const rows = [...next.map(p => ({ date: p.date, html: `
          <div class="phase-row">${moonSvg(p.illum, p.waxing, { size: 40 })}
            <div><b>${t('phase_' + p.phase)}</b><span>${esc(p.date.toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }))}</span></div>
          </div>` })), ...events.map(e => ({ date: e.date, html: skyEventRow(e) }))].sort((a, b) => a.date - b.date);
  const layer = openSheet(`<div class="moon">
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
            <b>${x.d.getDate()}</b>${marks(x.d)}
          </div>`).join('')}
        </div>
        ${rx.length ? `<button class="moon-sky" id="moon-sky">${rx.map(r => glyphBubble(r.planet)).join('')}
          <span><b>${esc(rx.length === 1 ? S.rx(rx[0].planet) : S.rxBoth(rx.map(r => r.planet)))}</b>${esc(S.openSky)}</span>${icons.chevron}</button>` : ''}
        <div class="do-dont">
          <div class="dd do"><h4>${t('moonDo')}</h4><ul>${list('phase_' + m.phase + '_do')}</ul></div>
          <div class="dd dont"><h4>${t('moonAvoid')}</h4><ul>${list('phase_' + m.phase + '_avoid')}</ul></div>
        </div>
        <h4 class="section-title">${t('upcomingPhases')}</h4>
        <div class="phase-list">${rows.map(r => r.html).join('')}</div>
      </div>
    </div>`, { cls: 'moon-layer' });
  layer.querySelector('#moon-sky')?.addEventListener('click', () => { haptic('light'); closeLayer(layer, { silent: true }); openSky(); });
}
