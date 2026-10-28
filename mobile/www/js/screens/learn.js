// ══ Вкладка «Навчання»: уроки, «Прочитати мою колоду», картки-тренажер ═════
// Для тих, хто вчиться на власній фізичній колоді: витягнув карти вдома —
// вніс їх сюди — отримав значення й AI-тлумачення.
import { t, getLang } from '../i18n.js';
import { state, track, loadCards, cardSuit, onStateChange, emit } from '../state.js';
import { api } from '../api.js';
import { haptic, storage } from '../platform.js';
import { pushScreen, closeLayer, esc, spinner, typeText, toast } from '../ui.js';
import { sparkle, icons } from '../art.js';
import { play } from '../sound.js';
import { LESSONS, DECK_SPREADS, TRAINER_QUESTIONS } from '../learn-content.js';
import { cardName, cardKeywords, cardImg, openCardDetail } from './library.js';
import { showPaywall } from './paywall.js';
import { userAstro } from './today.js';
import { loadDetails, overallPicture, overallHtml, cardBlocksHtml } from '../reading.js';

const FREE_LESSONS = 3;               // перші уроки безкоштовні, далі — PRO
const DONE_KEY = 'lunara_learn_done';
const KNOWN_KEY = 'lunara_flash_known';

let root;
const readSet = key => { try { return new Set(JSON.parse(storage.get(key) || '[]')); } catch (_) { return new Set(); } };
const saveSet = (key, set) => storage.set(key, JSON.stringify([...set]));

export function mountLearn(el) {
  root = el;
  render();
  onStateChange(w => { if (['premium', 'lang', 'learn'].includes(w)) render(); });
}

function render() {
  const L = getLang();
  const done = readSet(DONE_KEY);
  const known = readSet(KNOWN_KEY);
  const pct = Math.round(done.size / LESSONS.length * 100);
  root.innerHTML = `<div class="scroll tab-scroll">
    <header class="tab-head"><h1 class="serif">${t('learnTitle')}</h1><p>${t('learnSub')}</p></header>

    <div class="learn-progress">
      <div class="lp-ring" style="--p:${pct}"><span class="serif">${done.size}/${LESSONS.length}</span></div>
      <div><b>${t('learnProgress')}</b><span>${done.size === LESSONS.length ? t('learnAllDone') : t('learnKeepGoing')}</span></div>
    </div>

    <h3 class="section-title">${t('practice')}</h3>
    <button class="practice-card pc-trainer" id="lr-trainer">
      <span class="pc-icon">${sparkle()}</span>
      <span class="pc-text"><b class="serif">${t('trainer')}</b><span>${t('trainerSub')}</span></span>
      ${state.isPremium ? icons.chevron : '<span class="sc-lock static">PRO</span>'}
    </button>
    <button class="practice-card pc-deck" id="lr-deck">
      <span class="pc-art">${['card_06', 'card_17', 'cups_02'].map((c, i) =>
        `<span class="pc-c" style="--i:${i}"><img src="/assets/cards/${c}.jpg" alt="" loading="lazy"></span>`).join('')}</span>
      <span class="pc-text"><b class="serif">${t('readMyDeck')}</b><span>${t('readMyDeckSub')}</span></span>
      ${icons.chevron}
    </button>
    <button class="practice-card pc-flash" id="lr-flash">
      <span class="pc-icon">${icons.cards}</span>
      <span class="pc-text"><b class="serif">${t('flashcards')}</b><span>${t('flashcardsSub', { n: known.size })}</span></span>
      ${icons.chevron}
    </button>

    ${[1, 2].map(lv => `<h3 class="section-title">${t('learnLevel' + lv)}</h3>
    <div class="lesson-list">${LESSONS.map((l, i) => ({ l, i })).filter(({ l }) => (l.level || 1) === lv).map(({ l, i }) => {
      const locked = i >= FREE_LESSONS && !state.isPremium;
      return `<button class="lesson-row${done.has(l.id) ? ' done' : ''}" data-i="${i}">
        <span class="lr-num">${done.has(l.id) ? icons.check : `<span>${i + 1}</span>`}</span>
        <span class="lr-text"><b>${esc(l.title[L])}</b><small>${icons.clock}${t('minutes', { n: l.minutes })}</small></span>
        ${locked ? '<span class="sc-lock static">PRO</span>' : icons.chevron}
      </button>`;
    }).join('')}</div>`).join('')}
    <p class="disclaimer">${t('disclaimer')}</p>
  </div>`;

  root.querySelector('#lr-trainer').onclick = () => { haptic('light'); openTrainer(); };
  root.querySelector('#lr-deck').onclick = () => { haptic('light'); openReadMyDeck(); };
  root.querySelector('#lr-flash').onclick = () => { haptic('light'); openFlashcards(); };
  root.querySelectorAll('.lesson-row').forEach(b => b.onclick = () => {
    haptic('light');
    const i = Number(b.dataset.i);
    if (i >= FREE_LESSONS && !state.isPremium) { showPaywall({ source: 'lesson' }); return; }
    openLesson(i);
  });
}

// Наступний непройдений урок — для картки «Продовжити навчання» на головній
export function nextLesson() {
  const done = readSet(DONE_KEY);
  const i = LESSONS.findIndex(l => !done.has(l.id));
  return i < 0 ? null : { i, lesson: LESSONS[i], done: done.size, total: LESSONS.length };
}
export function continueLearning() {
  const n = nextLesson();
  if (!n) return false;
  if (n.i >= FREE_LESSONS && !state.isPremium) { showPaywall({ source: 'lesson' }); return true; }
  openLesson(n.i);
  return true;
}

// ── Урок ─────────────────────────────────────────────────────────────────────
export function openLesson(i) {
  const L = getLang();
  const l = LESSONS[i];
  track('lesson_open', l.id);
  loadCards().then(cards => {
    const strip = layer.querySelector('#ls-cards');
    if (strip && cards?.length) strip.innerHTML = l.cards.map(id => cards[id]).filter(Boolean)
      .map((c, k) => `<button class="ls-card" data-id="${c.id}" style="--k:${k}">${cardImg(c)}</button>`).join('');
    strip?.querySelectorAll('.ls-card').forEach(b => b.onclick = () => openCardDetail(cards[Number(b.dataset.id)], { fromLibrary: true }));
  });
  const layer = pushScreen(`<article class="lesson">
      <div class="ls-hero"><span class="ls-emoji">${icons[l.icon] || icons.learn}</span>
        <small>${t('lessonN', { n: i + 1, total: LESSONS.length })} · ${t('minutes', { n: l.minutes })}</small>
        <h1 class="serif">${esc(l.title[L])}</h1></div>
      <div class="ls-cards" id="ls-cards"></div>
      ${l.sections.map(s => `<section class="ls-sec"><h3>${esc(s.h[L])}</h3><p>${esc(s.p[L])}</p></section>`).join('')}
      <div class="ls-practice"><div class="ai-box-head">${sparkle()}<span>${t('tryWithDeck')}</span></div><p>${esc(l.practice[L])}</p></div>
      <button class="btn-primary" id="ls-done"><span>${i < LESSONS.length - 1 ? t('completeNext') : t('completeLesson')}</span>${icons.chevron}</button>
    </article>`, { title: '' });
  layer.querySelector('#ls-done').onclick = () => {
    const done = readSet(DONE_KEY);
    done.add(l.id);
    saveSet(DONE_KEY, done);
    haptic('success');
    track('lesson_done', l.id);
    emit('learn');      // перемалює цю вкладку і картку на головній
    closeLayer(layer, { silent: true });
    const next = i + 1;
    if (next < LESSONS.length) {
      if (next >= FREE_LESSONS && !state.isPremium) showPaywall({ source: 'lesson' });
      else openLesson(next);
    } else toast(t('learnAllDone'));
  };
}

// ── «Прочитати мою колоду» ───────────────────────────────────────────────────
function openReadMyDeck() {
  track('deck_read_open');
  const L = getLang();
  const st = { spread: null, question: '', picks: [], pos: 0 };
  const layer = pushScreen(`<div id="rmd"></div>`, { title: t('readMyDeck') });
  const box = layer.querySelector('#rmd');

  const step1 = () => {
    box.innerHTML = `<div class="rmd-intro">
        <p class="muted">${t('rmdIntro')}</p>
        <label class="lbl">${t('rmdChooseSpread')}</label>
        <div class="rmd-spreads">${DECK_SPREADS.map(s => `
          <button class="rmd-spread${st.spread?.id === s.id ? ' on' : ''}" data-id="${s.id}">
            <span class="rmd-n">${s.count}</span><span>${esc(s.title[L])}</span></button>`).join('')}
        </div>
        <label class="lbl">${t('rmdQuestion')}</label>
        <textarea class="field area" id="rmd-q" rows="2" maxlength="300" placeholder="${t('questionPlaceholder')}">${esc(st.question)}</textarea>
        <button class="btn-primary" id="rmd-next" ${st.spread ? '' : 'disabled'}><span>${t('rmdPickCards')}</span>${icons.chevron}</button>
      </div>`;
    const next = box.querySelector('#rmd-next');
    box.querySelectorAll('.rmd-spread').forEach(b => b.onclick = () => {
      haptic('select');
      st.spread = DECK_SPREADS.find(s => s.id === b.dataset.id);
      box.querySelectorAll('.rmd-spread').forEach(x => x.classList.toggle('on', x === b));
      next.disabled = false;
    });
    next.onclick = () => {
      st.question = box.querySelector('#rmd-q').value.trim();
      st.picks = []; st.pos = 0;
      pickStep();
    };
  };

  // Вибір карти для поточної позиції з усіх 78
  const pickStep = async () => {
    const cards = await loadCards();
    const pos = st.spread.positions[st.pos];
    let filter = 'all', query = '', reversed = false;
    box.innerHTML = `<div class="rmd-pick">
        <div class="rmd-step">${t('rmdStep', { n: st.pos + 1, total: st.spread.count })} · <b>${esc(pos[L])}</b></div>
        <label class="search">${icons.search}<input id="rmd-search" type="search" placeholder="${t('searchCards')}" autocomplete="off"></label>
        <div class="filter-rail">${['all', 'major', 'wands', 'cups', 'swords', 'pentacles'].map(s =>
          `<button class="filter${s === 'all' ? ' on' : ''}" data-s="${s}">${t('suit_' + s)}</button>`).join('')}</div>
        <label class="rev-toggle"><input type="checkbox" class="toggle" id="rmd-rev"><span>${t('rmdReversed')}</span></label>
        <div class="lib-grid small" id="rmd-grid"></div>
      </div>`;
    const grid = box.querySelector('#rmd-grid');
    const used = new Set(st.picks.map(p => p.id));
    const draw = () => {
      const list = cards.filter(c => !used.has(c.id) && (filter === 'all' || cardSuit(c) === filter) &&
        (!query || String(c.name || '').toLowerCase().includes(query)));
      grid.innerHTML = list.map(c => `<button class="lib-card" data-id="${c.id}">
        <span class="lib-img${reversed ? ' rev' : ''}">${cardImg(c)}</span><span class="lib-name">${esc(cardName(c))}</span></button>`).join('')
        || `<p class="muted center">${t('nothingFound')}</p>`;
      grid.querySelectorAll('.lib-card').forEach(b => b.onclick = () => {
        haptic('medium');
        st.picks.push({ ...cards.find(c => String(c.id) === b.dataset.id), isReversed: reversed });
        st.pos++;
        if (st.pos < st.spread.count) pickStep(); else result();
      });
    };
    box.querySelector('#rmd-search').oninput = e => { query = e.target.value.trim().toLowerCase(); draw(); };
    box.querySelectorAll('.filter').forEach(b => b.onclick = () => {
      haptic('select'); filter = b.dataset.s;
      box.querySelectorAll('.filter').forEach(x => x.classList.toggle('on', x === b)); draw();
    });
    box.querySelector('#rmd-rev').onchange = e => { reversed = e.target.checked; haptic('select'); draw(); };
    layer.querySelector('.push-body').scrollTop = 0;
    draw();
  };

  const result = async () => {
    track('deck_read_done', st.spread.id);
    haptic('success');
    await loadDetails();
    const helpers = { name: cardName, keywords: c => cardKeywords(c), img: cardImg };
    box.innerHTML = `<div class="rmd-result">
        ${st.question ? `<div class="q-badge">“${esc(st.question)}”</div>` : ''}
        <div class="rd-grid n${Math.min(st.picks.length, 3)}">${st.picks.map((c, i) => `
          <div class="rd-slot" style="--i:${i}">
            <div class="rd-card flipped"><div class="flip"><div class="face back"></div>
              <div class="face front"><div class="card-frame${c.isReversed ? ' rev' : ''}">${cardImg(c)}</div></div></div></div>
            <div class="rd-pos">${esc(st.spread.positions[i][L])}</div>
            <div class="rd-name">${esc(cardName(c))}${c.isReversed ? ` · ${t('reversedShort')}` : ''}</div>
          </div>`).join('')}
        </div>
        ${cardBlocksHtml(st.picks, st.spread.positions, { spreadId: st.spread.id, ...helpers })}
        ${overallHtml(overallPicture(st.picks, st.spread.positions, { ...helpers, spreadId: st.spread.id }))}
        <div class="ai-box" id="rmd-ai"><div class="ai-box-head">${sparkle()}<span>${t('aiReadingPersonal')}</span></div>${spinner(t('aiThinking'))}</div>
        <button class="btn-ghost" id="rmd-again">${t('rmdAgain')}</button>
      </div>`;
    box.querySelectorAll('.rb-head').forEach(b => b.onclick = () => openCardDetail(st.picks[Number(b.dataset.i)]));
    box.querySelector('#rmd-again').onclick = () => { st.spread = null; st.question = ''; step1(); };
    layer.querySelector('.push-body').scrollTop = 0;
    const ai = await api('POST', '/ai/interpret', {
      cards: st.picks, positions: st.spread.positions, spreadName: st.spread.title,
      question: st.question, userAstro: userAstro(), lang: L, userId: state.userId,
    });
    const aiBox = box.querySelector('#rmd-ai');
    if (!aiBox) return;
    if (ai.ok && ai.interpretation) {
      aiBox.innerHTML = `<div class="ai-box-head">${sparkle()}<span>${t('aiReadingPersonal')}</span></div><p class="ai-text"></p>`;
      typeText(aiBox.querySelector('.ai-text'), ai.interpretation);
    } else if (ai.error === 'premium_required') {
      aiBox.innerHTML = `<div class="ai-box-head">${sparkle()}<span>${t('aiReadingPersonal')}</span></div><p class="muted">${t('aiFreeUsed')}</p>
        <button class="btn-primary small" id="rmd-unlock"><span>${t('unlockPro')}</span></button>`;
      aiBox.querySelector('#rmd-unlock').onclick = () => showPaywall({ source: 'deck_read' });
    } else {
      aiBox.remove();   // без AI вистачає «Загальної картини»
    }
  };

  step1();
}

// ── Тренажер тлумачення: 3 карти під питання → учень пише тлумачення → AI-вчитель оцінює ──
const MIN_ANSWER = 60;
async function openTrainer() {
  track('trainer_open');
  if (!state.isPremium) { showPaywall({ source: 'trainer' }); return; }
  const cards = await loadCards();
  if (!cards?.length) { toast(t('errOffline')); return; }
  await loadDetails();
  const L = getLang();
  const layer = pushScreen(`<div class="trainer" id="tr"></div>`, { title: t('trainer') });
  const box = layer.querySelector('#tr');
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let st;

  const deal = () => {
    const pool = [...cards];
    const picks = Array.from({ length: 3 }, () => ({ ...pool.splice(Math.floor(Math.random() * pool.length), 1)[0], isReversed: Math.random() < 0.15 }));
    st = { spread: pick(DECK_SPREADS.filter(s => s.count === 3)), picks, question: pick(TRAINER_QUESTIONS[L] || TRAINER_QUESTIONS.en), answer: '' };
    ask();
  };

  const cardsHtml = () => `<div class="rd-grid n3">${st.picks.map((c, i) => `
      <div class="rd-slot" style="--i:${i}">
        <button class="rd-card flipped" data-i="${i}"><div class="flip"><div class="face back"></div>
          <div class="face front"><div class="card-frame${c.isReversed ? ' rev' : ''}">${cardImg(c)}</div></div></div></button>
        <div class="rd-pos">${esc(st.spread.positions[i][L])}</div>
        <div class="rd-name">${esc(cardName(c))}${c.isReversed ? ` · ${t('reversedShort')}` : ''}</div>
      </div>`).join('')}</div>`;
  const wireCards = () => box.querySelectorAll('.rd-card').forEach(b => b.onclick = () => openCardDetail(st.picks[Number(b.dataset.i)]));

  const ask = (err = '') => {
    box.innerHTML = `<div class="q-badge">“${esc(st.question)}”</div>
      ${cardsHtml()}
      <p class="muted tr-task">${t('trainerTask')}</p>
      <textarea class="field area" id="tr-a" rows="6" maxlength="1500" placeholder="${t('trainerPh')}">${esc(st.answer)}</textarea>
      <p class="tr-min" id="tr-min">${t('trainerMin', { n: MIN_ANSWER })}</p>
      ${err ? `<p class="tr-err">${esc(err)}</p>` : ''}
      <button class="btn-primary" id="tr-go"><span>${t('trainerCheck')}</span>${sparkle()}</button>
      <button class="btn-text" id="tr-new">${t('trainerNew')}</button>`;
    wireCards();
    const a = box.querySelector('#tr-a'), go = box.querySelector('#tr-go'), min = box.querySelector('#tr-min');
    const upd = () => {
      st.answer = a.value;
      const ok = a.value.trim().length >= MIN_ANSWER;
      go.disabled = !ok;
      min.classList.toggle('hidden', ok);
    };
    a.oninput = upd;
    upd();
    go.onclick = check;
    box.querySelector('#tr-new').onclick = () => { haptic('light'); deal(); layer.querySelector('.push-body').scrollTop = 0; };
  };

  const check = async () => {
    haptic('medium');
    const go = box.querySelector('#tr-go');
    go.disabled = true;
    go.insertAdjacentHTML('afterend', `<div id="tr-wait">${spinner(t('trainerChecking'))}</div>`);
    const res = await api('POST', '/ai/practice', {
      cards: st.picks.map(c => ({ id: c.id, isReversed: c.isReversed })), positions: st.spread.positions,
      question: st.question, answer: st.answer.trim(), lang: L, userId: state.userId,
    });
    if (res.error === 'premium_required') { box.querySelector('#tr-wait')?.remove(); go.disabled = false; showPaywall({ source: 'trainer' }); return; }
    if (!res.ok) { ask(t({ offline: 'errOffline', daily_limit: 'aiDailyLimit', ai_busy: 'aiBusy', rate_limit: 'aiBusy' }[res.error] || 'trainerOff')); return; }
    track('trainer_scored', String(res.score));
    haptic('success');
    result(res);
  };

  const result = r => {
    const lvl = r.score >= 9 ? 4 : r.score >= 7 ? 3 : r.score >= 5 ? 2 : 1;
    const list = (title, items, cls) => items?.length ? `<div class="tr-list ${cls}"><h4>${t(title)}</h4><ul>${items.map(x =>
      `<li>${cls === 'good' ? icons.check : sparkle()}<span>${esc(x)}</span></li>`).join('')}</ul></div>` : '';
    box.innerHTML = `<div class="tr-score">
        <div class="lp-ring" style="--p:${r.score * 10}"><span class="serif">${r.score}<small>/10</small></span></div>
        <div><small>${t('trainerScore')}</small><b class="serif">${t('trainerLvl' + lvl)}</b></div>
      </div>
      ${list('trainerGood', r.good, 'good')}
      ${list('trainerMissed', r.missed, 'miss')}
      ${r.tip ? `<div class="tr-tip"><span>${t('trainerTip')}</span><p>${esc(r.tip)}</p></div>` : ''}
      ${r.model ? `<div class="ai-box"><div class="ai-box-head">${sparkle()}<span>${t('trainerModel')}</span></div><p class="ai-text">${esc(r.model)}</p></div>` : ''}
      <div class="tr-again">${cardsHtml()}</div>
      <div class="ds-actions"><button class="btn-ghost" id="tr-retry">${t('trainerRetry')}</button>
        <button class="btn-primary" id="tr-next"><span>${t('trainerNew')}</span>${icons.chevron}</button></div>`;
    wireCards();
    box.querySelector('#tr-retry').onclick = () => { haptic('light'); ask(); };
    box.querySelector('#tr-next').onclick = () => { haptic('light'); deal(); };
    layer.querySelector('.push-body').scrollTop = 0;
  };

  deal();
}

// ── Картки-тренажер: картинка → згадай значення → перевір себе ──────────────
async function openFlashcards() {
  track('flash_open');
  const cards = await loadCards();
  if (!cards?.length) { toast(t('errOffline')); return; }
  const layer = pushScreen(`<div class="flash" id="flash"></div>`, { title: t('flashcards'), onClose: render });
  const box = layer.querySelector('#flash');
  const known = readSet(KNOWN_KEY);
  let current = null;

  const next = () => {
    // спершу ті, що ще не вивчені
    const pool = cards.filter(c => !known.has(c.id));
    const from = pool.length ? pool : cards;
    current = from[Math.floor(Math.random() * from.length)];
    box.innerHTML = `
      <div class="flash-count">${t('flashKnown', { n: known.size, total: cards.length })}</div>
      <div class="flash-track"><i style="width:${known.size / cards.length * 100}%"></i></div>
      <button class="flash-card" id="fc"><div class="flip">
        <div class="face back fc-front">${cardImg(current)}</div>
        <div class="face front fc-back">
          <small>${t('suit_' + cardSuit(current))}</small>
          <h2 class="serif">${esc(cardName(current))}</h2>
          <div class="chips center">${cardKeywords(current, false).map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>
          <p>${esc(current.description?.[getLang()] || current.description?.en || '')}</p>
        </div></div></button>
      <p class="muted center" id="fc-hint">${t('flashHint')}</p>
      <div class="flash-actions hidden" id="fc-actions">
        <button class="btn-ghost" id="fc-again">${t('flashAgain')}</button>
        <button class="btn-primary" id="fc-know"><span>${t('flashKnow')}</span></button>
      </div>`;
    const fc = box.querySelector('#fc');
    fc.onclick = () => {
      if (fc.classList.contains('flipped')) return;
      haptic('medium');
      play('flip');
      fc.classList.add('flipped');
      box.querySelector('#fc-hint').classList.add('hidden');
      box.querySelector('#fc-actions').classList.remove('hidden');
    };
    box.querySelector('#fc-again').onclick = () => { haptic('light'); next(); };
    box.querySelector('#fc-know').onclick = () => {
      known.add(current.id); saveSet(KNOWN_KEY, known); haptic('success'); next();
    };
  };
  next();
}
