// ══ Детальне тлумачення: значення карт, текст за позиціями, «Загальна картина» ══
// Працює без AI: усе з розширених описів 78 карт (js/cards/{lang}.js) і шаблонів нижче.
import { getLang } from './i18n.js';
import { cardSuit } from './state.js';
import { esc } from './ui.js';
import { readingSkyLines, sx } from './sky.js';
import { spreadCat } from './catalog.js';

let details = null, detailsLang = null;
export async function loadDetails() {
  const L = getLang();
  if (detailsLang !== L) {
    details = (await import(`./cards/${L}.js`)).default;
    detailsLang = L;
  }
  return details;
}
export const cardDetail = c => details?.[c?.id] || null;

// ── Так / Ні ─────────────────────────────────────────────────────────────────
// y — так, m — можливо, n — ні (у порядку id 0..77)
const YN = ('yymyymyyymymmnynnymyyy' +   // Старші
            'ymyynymymnyyyy' +           // Жезли
            'yyynnymnyyyyyy' +           // Кубки
            'ymnmnmnnnnmymm' +           // Мечі
            'ymymnymyyyyyyy').split(''); // Пентаклі
export function yesNo(card) {
  const v = YN[card.id] || 'm';
  if (!card.isReversed) return v;
  return v === 'y' ? 'm' : 'n';
}

// Позитивні карти — як у сервері (algorithmService.POSITIVE_CARD_IDS_SET)
const POSITIVE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 14, 17, 19, 20, 21, 22, 23, 24, 25, 27, 29, 32, 33, 34, 35,
  36, 37, 38, 41, 44, 45, 46, 47, 48, 49, 50, 55, 60, 62, 63, 64, 66, 69, 70, 71, 72, 73, 74, 75, 76, 77]);

// ── Тексти ───────────────────────────────────────────────────────────────────
const TX = {
  en: {
    pos: {
      past: 'This card shows what has shaped your situation.', present: 'This is the energy around you right now.',
      future: 'This is where things are heading if nothing changes.', day: 'This is the main energy of your day.',
      state: 'This is how you feel and what you bring into the relationship.', partner: 'This reflects the other person’s feelings and attitude.',
      connection: 'This describes what connects you right now.', potential: 'This shows where the relationship can go.',
      energy: 'This is the overall tone of the coming month.', challenge: 'This is the main challenge to work through.',
      opportunities: 'This is the opportunity to notice and use.', outcome: 'This is the likely result.',
      theme: 'This is the central theme of your year.', challenges: 'These are the lessons and obstacles of the year.',
      love: 'This is what the year brings in love.', career: 'This is what the year brings in work and money.',
      message: 'This is the message of the cards for you.', situation: 'This describes the situation as it is.',
      obstacle: 'This is what stands in the way.', advice: 'This is the cards’ advice.',
      you: 'This is your side of the story.', them: 'This is the other person’s side.', relationship: 'This is the relationship itself.',
      foundation: 'This is the root of the situation — what lies beneath it.', recent: 'This is what has just happened and is fading.',
      crown: 'This is your conscious goal — what you are aiming for.', near: 'This is what is coming in the next weeks.',
      self: 'This is your inner attitude.', environment: 'This is the influence of people and circumstances around you.',
      hopes: 'These are your hopes and fears — often two sides of one coin.', final: 'This is where everything leads.',
      answer: 'This card answers your question.', money: 'This is about money and work.',
    },
    lbl: { meaning: 'Meaning', love: 'Love & relationships', work: 'Work & money', advice: 'Advice', yn: 'Yes or no', overall: 'The overall picture',
           story: 'How the cards connect', patterns: 'What stands out', forYou: 'What it means for you', key: 'Key advice', energy: 'Energy of the spread' },
    yn: { y: 'Yes', m: 'Maybe', n: 'No' },
    ynText: { y: 'The cards lean toward “yes.”', m: 'The answer isn’t set yet — it depends on your next steps.', n: 'For now, the cards lean toward “no.”' },
    energy: {
      positive: 'This is a supportive spread. Most cards carry light, constructive energy: circumstances are on your side, and effort now is likely to pay off. Stay open and keep moving.',
      neutral: 'This spread is balanced: there are opportunities and there are tests. The outcome depends largely on your choices — the cards show the road, but you’re in the driver’s seat.',
      caution: 'This spread asks for care and honesty. Several cards point to tension, blocks or something that needs to end. It isn’t a bad omen — it’s a signal to slow down, look at what hurts and choose consciously.',
    },
    majors: n => n >= 2 ? `${n} Major Arcana cards — this is a significant moment with long-term consequences, not a passing episode.` : n === 1 ? 'One Major Arcana card shows the deeper lesson behind everyday events.' : 'Only Minor Arcana cards — the situation is in your hands and can change quickly.',
    suit: { wands: 'Wands dominate: the theme is energy, ambition and action. Your initiative decides a lot.',
            cups: 'Cups dominate: emotions and relationships are at the center. Listen to your feelings.',
            swords: 'Swords dominate: thoughts, decisions and conversations matter most. Clarity and honesty are key.',
            pentacles: 'Pentacles dominate: money, work, body and home are the focus. Practical steps work best.' },
    reversed: n => `${n} reversed cards — some energy is blocked or turned inward; part of the work is internal.`,
    courts: 'Several court cards: other people play an important role — or different sides of your personality are speaking.',
    storyStart: (pos, name, kw) => `${pos}: ${name} brings ${kw}.`,
    storyNext: (pos, name, kw) => `${pos}: ${name} adds ${kw}.`,
    storyEnd: (pos, name, kw) => `${pos}: ${name} points to ${kw}.`,
  },
};
export const tx = () => TX[getLang()] || TX.en;

// Тип позиції з англійської назви (сервер і схеми «моєї колоди» шлють {en,ru,ua})
const POS_MAP = {
  past: 'past', present: 'present', future: 'future', 'your day': 'day', 'your state': 'state', partner: 'partner',
  connection: 'connection', potential: 'potential', 'general energy': 'energy', 'month challenge': 'challenge', challenge: 'challenge',
  opportunities: 'opportunities', outcome: 'outcome', 'year theme': 'theme', challenges: 'challenges', love: 'love', career: 'career',
  message: 'message', situation: 'situation', obstacle: 'obstacle', advice: 'advice', you: 'you', them: 'them', relationship: 'relationship',
  'card of the day': 'day', 'your feelings': 'state', 'overall energy': 'energy', 'main challenge': 'challenge', 'theme of the year': 'theme', foundation: 'foundation', 'recent past': 'recent', crown: 'crown', 'near future': 'near',
  self: 'self', environment: 'environment', 'hopes and fears': 'hopes', 'final outcome': 'final', answer: 'answer',
};
export function posType(p) {
  if (p && typeof p === 'object' && p.t) return p.t;   // тематичні розклади шлють тип позиції явно
  const en = String((p && typeof p === 'object' ? p.en : p) || '').toLowerCase().trim();
  return POS_MAP[en] || null;
}
const LOVE_POS = new Set(['state', 'partner', 'connection', 'potential', 'you', 'them', 'relationship', 'love']);
const ADVICE_POS = ['advice', 'outcome', 'future', 'message', 'day', 'final', 'near', 'answer'];
const isLoveSpread = id => id === 'love' || spreadCat(id) === 'love';

// Текст картки для конкретної позиції: вступ + значення + доречний аспект
export function positionText(card, pos, { spreadId } = {}) {
  const d = cardDetail(card);
  const T = tx();
  const type = posType(pos);
  const intro = type ? T.pos[type] : '';
  if (!d) return { intro, main: '', extra: '', extraLabel: '' };
  const main = card.isReversed ? d.rev : d.up;
  let extra = '', extraLabel = '';
  if (LOVE_POS.has(type) || isLoveSpread(spreadId)) { extra = d.love; extraLabel = T.lbl.love; }
  else if (['career', 'energy', 'opportunities', 'money'].includes(type) || (spreadCat(spreadId) === 'money' && !ADVICE_POS.includes(type))) { extra = d.work; extraLabel = T.lbl.work; }
  else if (ADVICE_POS.includes(type)) { extra = d.advice; extraLabel = T.lbl.advice; }
  return { intro, main, extra, extraLabel };
}

// ── «Загальна картина» з усіх карт ───────────────────────────────────────────
export function overallPicture(cards, positions, { name, keywords, spreadId, date } = {}) {
  const T = tx();
  const L = getLang();
  // енергія розкладу
  const score = cards.reduce((s, c) => {
    const pos = POSITIVE.has(c.id);
    return s + (c.isReversed ? (pos ? -0.4 : 0.25) : (pos ? 1 : -1));
  }, 0) / cards.length;
  const verdict = score >= 0.3 ? 'positive' : score <= -0.3 ? 'caution' : 'neutral';

  // історія від першої карти до останньої
  const posName = i => {
    const p = positions?.[i];
    return p ? (typeof p === 'object' ? (p[L] || p.en) : p) : '';
  };
  const kw = c => keywords(c).slice(0, 2).join(' and ').toLowerCase();
  const story = cards.length > 1 ? cards.map((c, i) => {
    const fn = i === 0 ? T.storyStart : i === cards.length - 1 ? T.storyEnd : T.storyNext;
    return fn(posName(i), name(c), kw(c));
  }).join(' ') : '';

  // закономірності
  const patterns = [];
  const majors = cards.filter(c => c.id < 22).length;
  if (cards.length > 1) patterns.push(T.majors(majors));
  const suits = {};
  cards.forEach(c => { const s = cardSuit(c); if (s !== 'major') suits[s] = (suits[s] || 0) + 1; });
  const top = Object.entries(suits).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2 && Object.values(suits).filter(v => v === top[1]).length === 1) patterns.push(T.suit[top[0]]);
  const rev = cards.filter(c => c.isReversed).length;
  if (rev >= 2 || (rev === 1 && cards.length <= 2)) patterns.push(T.reversed(rev));
  const courts = cards.filter(c => c.id >= 22 && ((c.id - 22) % 14) >= 10).length;
  if (courts >= 2) patterns.push(T.courts);

  // так/ні за більшістю
  const votes = { y: 0, m: 0, n: 0 };
  cards.forEach(c => votes[yesNo(c)]++);
  const yn = votes.y > votes.n && votes.y >= votes.m ? 'y' : votes.n > votes.y && votes.n >= votes.m ? 'n' : 'm';

  // головна порада — з позиції «порада» або з останньої карти
  const advIdx = cards.findIndex((c, i) => posType(positions?.[i]) === 'advice');
  const advCard = cards[advIdx >= 0 ? advIdx : cards.length - 1];
  const advice = cardDetail(advCard)?.advice || '';

  // що це означає в коханні й роботі — за підсумковою картою (майбутнє / потенціал / підсумок / остання)
  const outIdx = cards.findIndex((c, i) => ['future', 'outcome', 'potential', 'relationship', 'final'].includes(posType(positions?.[i])));
  const outCard = cards[outIdx >= 0 ? outIdx : cards.length - 1];
  const od = cardDetail(outCard);
  const forecast = [];
  if (od && cards.length > 1) {
    forecast.push({ label: T.lbl.love, text: od.love, card: name(outCard) });
    if (!isLoveSpread(spreadId)) forecast.push({ label: T.lbl.work, text: od.work, card: name(outCard) });
  }

  // ретрогради й затемнення на момент розкладу
  const sky = readingSkyLines(date ? new Date(date) : new Date(), { love: isLoveSpread(spreadId) });

  return { verdict, energy: T.energy[verdict], story, patterns, sky, yn, ynText: T.ynText[yn], advice, advCard, forecast };
}

// HTML блоку «Загальна картина»
export function overallHtml(o) {
  const T = tx();
  return `<div class="overall">
    <div class="ov-head"><span class="ov-badge ov-${o.verdict}"></span><h3 class="serif">${T.lbl.overall}</h3></div>
    <h4>${T.lbl.energy}</h4><p>${esc(o.energy)}</p>
    ${o.story ? `<h4>${T.lbl.story}</h4><p>${esc(o.story)}</p>` : ''}
    ${o.patterns.length ? `<h4>${T.lbl.patterns}</h4><ul>${o.patterns.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${o.sky?.length ? `<h4>${esc(sx().title)}</h4><ul class="ov-sky">${o.sky.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${o.forecast?.length ? `<h4>${T.lbl.forYou}</h4><div class="ov-forecast">${o.forecast.map(f =>
      `<div class="asp"><span>${esc(f.label)}</span><p>${esc(f.text)}</p></div>`).join('')}</div>` : ''}
    <div class="ov-yn"><span>${T.lbl.yn}</span><b class="yn-${o.yn}">${T.yn[o.yn]}</b><small>${esc(o.ynText)}</small></div>
    ${o.advice ? `<div class="ov-advice"><span>${T.lbl.key}</span><p class="serif">${esc(o.advice)}</p></div>` : ''}
  </div>`;
}

// HTML детальних блоків для кожної карти розкладу (name/keywords/img передаються ззовні — без циклічних імпортів)
export function cardBlocksHtml(cards, positions, { spreadId, name, keywords, img }) {
  const L = getLang();
  const T = tx();
  return `<div class="rblocks">${cards.map((c, i) => {
    const p = positions?.[i];
    const posLabel = p ? (typeof p === 'object' ? (p[L] || p.en) : p) : '';
    const tt = positionText(c, p, { spreadId });
    const yn = yesNo(c);
    return `<div class="rb">
      <button class="rb-head" data-i="${i}">
        <span class="rd-thumb${c.isReversed ? ' rev' : ''}">${img(c)}</span>
        <span class="rb-title">${posLabel ? `<small>${esc(posLabel)}</small>` : ''}<b>${esc(name(c))}</b>
          <span class="rb-kw">${esc(keywords(c).slice(0, 4).join(' · '))}</span></span>
        <span class="rb-yn yn-${yn}">${T.yn[yn]}</span>
      </button>
      ${tt.intro ? `<p class="rb-intro">${esc(tt.intro)}</p>` : ''}
      ${tt.main ? `<p class="rb-main">${esc(tt.main)}</p>` : ''}
      ${tt.extra ? `<div class="rb-extra"><span>${esc(tt.extraLabel)}</span><p>${esc(tt.extra)}</p></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}
