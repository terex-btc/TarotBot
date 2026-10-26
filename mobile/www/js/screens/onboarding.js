// ══ Онбординг: слайди → анкета → розрахунок → профіль → paywall ═════════════
import { t, getLang, setLang } from '../i18n.js';
import { state, track } from '../state.js';
import { api } from '../api.js';
import { haptic, isNative, notifications, telegramUser, startParam } from '../platform.js';
import { CONFIG } from '../config.js';
import { openFull, closeLayer, el, esc, delay, toast } from '../ui.js';
import { dateWheel } from '../datewheel.js';
import { rescheduleAlerts } from '../reminders.js';
import { cardBack, moonSvg, starsField, clouds, hills, mountains, pines, sparkle, zodiacGlyph, icons } from '../art.js';
import { zodiacOf, lifePath, moonAt, upcomingPhases } from '../astro.js';
import { showPaywall } from './paywall.js';

const FOCUS = ['love', 'career', 'growth', 'balance', 'family', 'spirit'];
const FOCUS_ICON = { love: 'heart', career: 'briefcase', growth: 'sprout', balance: 'lotus', family: 'home', spirit: 'crystal' };

export function runOnboarding({ onDone }) {
  const data = { name: telegramUser?.first_name || '', birth: '', focus: [] };
  const layer = openFull(`<div class="onb">
      <div class="onb-stage"></div>
    </div>`, { cls: 'onb-layer', noBack: true });
  const stage = layer.querySelector('.onb-stage');

  // ── 1. Слайди ──────────────────────────────────────────────────────────────
  const slides = [
    { scene: sceneWelcome, title: 'onbS1Title', sub: 'onbS1Sub' },
    { scene: sceneCards,   title: 'onbS2Title', sub: 'onbS2Sub' },
    { scene: sceneMoon,    title: 'onbS3Title', sub: 'onbS3Sub' },
    { scene: sceneOracle,  title: 'onbS4Title', sub: 'onbS4Sub' },
  ];
  let idx = 0;

  function renderSlides() {
    stage.innerHTML = `<div class="slides">
        <div class="seg mini onb-lang">${['en', 'ru', 'ua'].map(l =>
          `<button class="${l === getLang() ? 'on' : ''}" data-l="${l}">${l.toUpperCase()}</button>`).join('')}</div>
        <div class="slides-track">${slides.map((s, i) => `
          <div class="slide${i === 0 ? ' active' : ''}" data-i="${i}">
            <div class="slide-scene">${s.scene()}</div>
            <div class="slide-copy">
              <h1 class="serif slide-title">${t(s.title)}</h1>
              <p class="slide-sub">${t(s.sub)}</p>
            </div>
          </div>`).join('')}
        </div>
        <div class="slides-foot">
          <div class="dots">${slides.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
          <button class="btn-primary" id="onb-next"><span>${t('continue')}</span>${icons.chevron}</button>
          <p class="legal-note">${t('onbLegal')}</p>
        </div>
      </div>`;
    const track_ = stage.querySelector('.slides-track');
    const go = i => {
      idx = Math.max(0, Math.min(slides.length - 1, i));
      track_.style.transform = `translateX(${-idx * 100}%)`;
      stage.querySelectorAll('.slide').forEach((s, n) => s.classList.toggle('active', n === idx));
      stage.querySelectorAll('.dots i').forEach((d, n) => d.classList.toggle('on', n === idx));
      stage.querySelector('.legal-note').classList.toggle('show', idx === slides.length - 1);
    };
    stage.querySelectorAll('.onb-lang button').forEach(b => b.onclick = () => {
      if (b.dataset.l === getLang()) return;
      haptic('select');
      setLang(b.dataset.l);
      renderSlides();
    });
    stage.querySelector('#onb-next').onclick = () => {
      haptic('light');
      track('onb_slide', idx + 1);
      if (idx < slides.length - 1) go(idx + 1);
      else renderStep('name');
    };
    // свайп
    let sx = null;
    track_.addEventListener('pointerdown', e => { sx = e.clientX; });
    track_.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) { haptic('select'); go(idx + (dx < 0 ? 1 : -1)); }
    });
    // Повертаємось на поточний слайд (після зміни мови або «назад» з анкети) без анімації
    track_.style.transition = 'none';
    go(idx);
    requestAnimationFrame(() => requestAnimationFrame(() => { track_.style.transition = ''; }));
  }

  // ── 2. Анкета ──────────────────────────────────────────────────────────────
  const steps = ['name', 'birth', 'focus'];
  function stepFrame(step, inner, { canNext = false, cta = t('continue') } = {}) {
    const n = steps.indexOf(step);
    stage.innerHTML = `<div class="step">
        ${starsField(30, 3)}
        <header class="step-head">
          <button class="icon-btn" id="step-back" aria-label="Back">${icons.back}</button>
          <div class="progress"><i style="width:${((n + 1) / steps.length) * 100}%"></i></div>
          <span class="step-count">${n + 1}/${steps.length}</span>
        </header>
        <div class="step-body">${inner}</div>
        <div class="step-foot"><button class="btn-primary" id="step-next" ${canNext ? '' : 'disabled'}><span>${cta}</span>${icons.chevron}</button></div>
      </div>`;
    stage.querySelector('#step-back').onclick = () => {
      haptic('light');
      if (n === 0) { renderSlides(); } else renderStep(steps[n - 1]);
    };
    return { next: stage.querySelector('#step-next') };
  }

  function renderStep(step) {
    if (step === 'name') {
      const { next } = stepFrame('name', `
        <h2 class="serif step-title">${t('askName')}</h2>
        <p class="step-sub">${t('askNameSub')}</p>
        <input class="field" id="f-name" maxlength="30" autocomplete="given-name" placeholder="${t('namePlaceholder')}" value="${esc(data.name)}">`,
        { canNext: data.name.trim().length >= 2 });
      const inp = stage.querySelector('#f-name');
      inp.oninput = () => { data.name = inp.value; next.disabled = inp.value.trim().length < 2; };
      inp.onkeydown = e => { if (e.key === 'Enter' && !next.disabled) next.click(); };
      next.onclick = () => { inp.blur(); renderStep('birth'); };
      setTimeout(() => inp.focus(), 350);
    }
    if (step === 'birth') {
      const max = new Date(); max.setFullYear(max.getFullYear() - 18);
      const { next } = stepFrame('birth', `
        <h2 class="serif step-title">${t('askBirth', { name: esc(data.name.trim()) })}</h2>
        <p class="step-sub">${t('askBirthSub')}</p>
        <div id="f-birth"></div>
        <div class="sign-preview" id="sign-preview"></div>
        <p class="hint">${t('ageNote')}</p>`, { canNext: true });
      const preview = stage.querySelector('#sign-preview');
      // Знак зодіаку змінюється, щойно барабан зупинився
      const upd = v => {
        data.birth = v;
        const z = zodiacOf(v);
        preview.innerHTML = `<span class="sp-glyph">${zodiacGlyph(z.key)}</span><span>${z.name[getLang()]}</span>`;
        preview.classList.add('show');
      };
      const wheel = dateWheel(stage.querySelector('#f-birth'), {
        value: data.birth, max: max.toISOString().slice(0, 10), fallback: `${max.getFullYear() - 7}-06-15`, onChange: upd,
      });
      upd(wheel.value);
      next.onclick = () => renderStep('focus');
    }
    if (step === 'focus') {
      const { next } = stepFrame('focus', `
        <h2 class="serif step-title">${t('askFocus')}</h2>
        <p class="step-sub">${t('askFocusSub')}</p>
        <div class="focus-grid">${FOCUS.map(f => `
          <button class="focus-chip${data.focus.includes(f) ? ' on' : ''}" data-f="${f}">
            <span class="fc-emoji">${icons[FOCUS_ICON[f]]}</span><span>${t('focus_' + f)}</span></button>`).join('')}
        </div>`, { canNext: data.focus.length > 0 });
      stage.querySelectorAll('.focus-chip').forEach(b => b.onclick = () => {
        haptic('select');
        const f = b.dataset.f;
        data.focus = data.focus.includes(f) ? data.focus.filter(x => x !== f) : [...data.focus, f];
        b.classList.toggle('on');
        next.disabled = data.focus.length === 0;
      });
      next.onclick = () => submit();
    }
  }

  // ── 3. Збереження + «розрахунок» ───────────────────────────────────────────
  async function submit() {
    const z = zodiacOf(data.birth);
    stage.innerHTML = `<div class="calc">
        ${starsField(50, 11)}
        <div class="calc-orb"><div class="orb-core"></div><div class="orb-ring r1"></div><div class="orb-ring r2"></div>
          <div class="calc-glyph">${zodiacGlyph(z.key, { stroke: 5 })}</div></div>
        <h2 class="serif calc-title">${t('calcTitle')}</h2>
        <ul class="calc-list">
          <li>${t('calc1')}</li><li>${t('calc2')}</li><li>${t('calc3')}</li><li>${t('calc4')}</li>
        </ul>
      </div>`;
    const items = stage.querySelectorAll('.calc-list li');
    const save = api('POST', '/users/init', {
      userId: state.userId, firstName: data.name.trim(), birthDate: data.birth,
      lang: getLang(), source: startParam || '',
    });
    for (const li of items) { await delay(650); li.classList.add('done'); haptic('light'); }
    const res = await save;
    if (!res.ok) {
      toast(t(res.error === 'offline' ? 'errOffline' : 'errGeneric'));
      renderStep('focus');
      return;
    }
    state.user = res.user;
    state.isPremium = !!res.user.isPremium || state.isPremium;
    state.freePro = !!res.user.freePro;
    state.focus = data.focus;
    try { localStorage.setItem('lunara_focus', JSON.stringify(data.focus)); } catch (_) {}
    track('onb_profile', z.key);
    haptic('success');
    renderReveal();
  }

  // ── 4. Профіль ─────────────────────────────────────────────────────────────
  function renderReveal() {
    const L = getLang();
    const z = zodiacOf(data.birth);
    const lp = lifePath(data.birth);
    const m = moonAt();
    stage.innerHTML = `<div class="reveal">
        ${starsField(40, 5)}
        <p class="eyebrow">${t('revealEyebrow')}</p>
        <h2 class="serif reveal-title">${t('revealTitle', { name: esc(data.name.trim()) })}</h2>
        <div class="reveal-cards">
          <div class="rv-card" style="--d:.1s"><div class="rv-glyph">${zodiacGlyph(z.key)}</div>
            <div class="rv-label">${t('sunSign')}</div><div class="rv-value serif">${z.name[L]}</div>
            <div class="rv-sub">${t('element_' + z.element)} · ${t('planet_' + z.ruler)}</div></div>
          <div class="rv-card" style="--d:.25s"><div class="rv-num serif">${lp}</div>
            <div class="rv-label">${t('lifePath')}</div><div class="rv-value serif">${t('lp_' + lp + '_title')}</div>
            <div class="rv-sub">${t('lp_' + lp + '_short')}</div></div>
          <div class="rv-card" style="--d:.4s"><div class="rv-moon">${moonSvg(m.illum, m.waxing, { size: 54 })}</div>
            <div class="rv-label">${t('moonToday')}</div><div class="rv-value serif">${t('phase_' + m.phase)}</div>
            <div class="rv-sub">${t('moonIn', { sign: t('sign_' + m.sign) })}</div></div>
        </div>
        <div class="step-foot"><button class="btn-primary" id="rv-next"><span>${t('continue')}</span>${icons.chevron}</button></div>
      </div>`;
    stage.querySelector('#rv-next').onclick = () => {
      haptic('light');
      if (notifications.supported) renderNotif(); else finish();
    };
  }

  // ── 5. Нагадування (тільки на нативі) ──────────────────────────────────────
  function renderNotif() {
    stage.innerHTML = `<div class="notif-step">
        ${starsField(40, 9)}
        <div class="notif-art">${cardBack()}<span class="notif-bell">${icons.bell}</span></div>
        <h2 class="serif step-title">${t('notifTitle')}</h2>
        <p class="step-sub">${t('notifSub', { time: fmtTime(CONFIG.REMINDER_HOUR, CONFIG.REMINDER_MINUTE) })}</p>
        <div class="step-foot">
          <button class="btn-primary" id="nt-yes"><span>${t('notifAllow')}</span></button>
          <button class="btn-text" id="nt-no">${t('notNow')}</button>
        </div>
      </div>`;
    stage.querySelector('#nt-yes').onclick = async () => {
      const ok = await notifications.request();
      if (ok) {
        await notifications.scheduleDaily({
          hour: CONFIG.REMINDER_HOUR, minute: CONFIG.REMINDER_MINUTE,
          title: t('notifPushTitle'), body: t('notifPushBody'),
        });
        localStorage.setItem('lunara_reminder', '1');
        track('notif_allow');
        rescheduleAlerts();   // Місяць і ретрогради — разом із нагадуванням
      }
      finish();
    };
    stage.querySelector('#nt-no').onclick = finish;
  }

  function finish() {
    track('onb_done');
    showPaywall({
      source: 'onboarding',
      onClose: () => { closeLayer(layer, { silent: true }); onDone(); },
    });
  }

  renderSlides();
}

export function fmtTime(h, m) {
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(getLang() === 'en' ? 'en-US' : getLang() === 'ua' ? 'uk-UA' : 'ru-RU', { hour: 'numeric', minute: '2-digit' });
}

// ── Сцени слайдів ────────────────────────────────────────────────────────────
function sceneWelcome() {
  return `<div class="scene scene-welcome">
    ${starsField(46, 2)}${clouds('pink')}
    <div class="portal">${cardBack()}<div class="portal-glow"></div></div>
    <div class="tile3d t-moon"><svg viewBox="0 0 40 40"><path d="M27 6a15 15 0 1 0 7 25A13 13 0 0 1 27 6Z" fill="#ffc94d"/></svg></div>
    <div class="tile3d t-star">${sparkle('gold')}</div>
    <div class="tile3d t-heart"><svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" fill="#ff5c8a"/></svg></div>
    ${hills({ a: '#2c1f7a', b: '#1a1250' })}
  </div>`;
}

function sceneCards() {
  const imgs = ['card_19', 'card_17', 'card_10'];
  return `<div class="scene scene-cards">
    ${starsField(40, 4)}${sparkle('s1')}${sparkle('s2')}
    <div class="fan">${imgs.map((c, i) => `
      <div class="fan-card f${i}"><div class="flip">
        <div class="face back">${cardBack({ glow: false })}</div>
        <div class="face front"><img src="/assets/cards/${c}.jpg" alt="" loading="lazy"></div>
      </div></div>`).join('')}
    </div>
    ${mountains()}
  </div>`;
}

function sceneMoon() {
  const L = getLang();
  const loc = L === 'en' ? 'en-US' : L === 'ua' ? 'uk-UA' : 'ru-RU';
  const phases = upcomingPhases(new Date(), 4);
  const items = [{ date: new Date(), ...moonAt() }, ...phases];
  return `<div class="scene scene-moon">
    ${starsField(50, 8)}
    <div class="moon-rail">${items.concat(items).map((p, i) => `
      <div class="moon-chip">${moonSvg(p.illum, p.waxing, { size: 74 })}
        <span>${p.date.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</span></div>`).join('')}
    </div>
    ${pines()}
    <div class="fireflies">${'<i></i>'.repeat(9)}</div>
  </div>`;
}

function sceneOracle() {
  return `<div class="scene scene-oracle">
    ${starsField(40, 6)}
    <div class="crystal"><div class="crystal-ball"><i></i><i></i><i></i></div><div class="crystal-base"></div></div>
    <div class="chat-demo">
      <div class="cd-input"><span class="cd-typed" data-text="${esc(t('onbS4Question'))}"></span>
        <span class="cd-send">${icons.send}</span></div>
      <div class="cd-answer">${esc(t('onbS4Answer'))}</div>
    </div>
  </div>`;
}

// Анімація «друку» на 4-му слайді запускається, коли слайд стає активним
const typer = new MutationObserver(muts => {
  for (const m of muts) {
    const s = m.target;
    if (!s.classList?.contains('slide') || !s.classList.contains('active')) continue;
    const typed = s.querySelector('.cd-typed');
    if (!typed || typed.dataset.done) continue;
    typed.dataset.done = '1';
    const text = typed.dataset.text;
    let i = 0;
    const tick = () => {
      typed.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, 45);
      else setTimeout(() => s.querySelector('.chat-demo')?.classList.add('answered'), 500);
    };
    setTimeout(tick, 500);
  }
});
typer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
