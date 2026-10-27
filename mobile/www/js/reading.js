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
  ru: {
    pos: {
      past: 'Эта карта показывает, что сформировало твою ситуацию.', present: 'Это энергия, которая окружает тебя сейчас.',
      future: 'Сюда всё движется, если ничего не менять.', day: 'Это главная энергия твоего дня.',
      state: 'Так ты себя чувствуешь и это ты привносишь в отношения.', partner: 'Это чувства и отношение другого человека.',
      connection: 'Это то, что связывает вас сейчас.', potential: 'Это показывает, куда могут прийти отношения.',
      energy: 'Это общий тон ближайшего месяца.', challenge: 'Это главный вызов, через который нужно пройти.',
      opportunities: 'Это возможность, которую важно заметить и использовать.', outcome: 'Это вероятный итог.',
      theme: 'Это центральная тема твоего года.', challenges: 'Это уроки и препятствия года.',
      love: 'Это то, что год принесёт в любви.', career: 'Это то, что год принесёт в работе и деньгах.',
      message: 'Это послание карт для тебя.', situation: 'Это ситуация такой, какая она есть.',
      obstacle: 'Это то, что мешает.', advice: 'Это совет карт.',
      you: 'Это твоя сторона истории.', them: 'Это сторона другого человека.', relationship: 'Это сами отношения.',
      foundation: 'Это корень ситуации — то, что лежит в её основе.', recent: 'Это то, что недавно произошло и уходит.',
      crown: 'Это твоя сознательная цель — к чему ты стремишься.', near: 'Это то, что придёт в ближайшие недели.',
      self: 'Это твоё внутреннее отношение.', environment: 'Это влияние людей и обстоятельств вокруг тебя.',
      hopes: 'Это твои надежды и страхи — часто две стороны одной медали.', final: 'Это то, к чему всё ведёт.',
      answer: 'Эта карта отвечает на твой вопрос.', money: 'Здесь — про деньги и работу.',
    },
    lbl: { meaning: 'Значение', love: 'Любовь и отношения', work: 'Работа и деньги', advice: 'Совет', yn: 'Да или нет', overall: 'Общая картина',
           story: 'Как карты связаны', patterns: 'Что важно заметить', forYou: 'Что это значит для тебя', key: 'Главный совет', energy: 'Энергия расклада' },
    yn: { y: 'Да', m: 'Возможно', n: 'Нет' },
    ynText: { y: 'Карты склоняются к «да».', m: 'Ответ ещё не определён — он зависит от твоих следующих шагов.', n: 'Пока карты склоняются к «нет».' },
    energy: {
      positive: 'Это поддерживающий расклад. Большинство карт несут светлую, созидательную энергию: обстоятельства на твоей стороне, и усилия сейчас, скорее всего, окупятся. Оставайся открытым(ой) и двигайся вперёд.',
      neutral: 'Расклад сбалансирован: есть и возможности, и испытания. Итог во многом зависит от твоих решений — карты показывают дорогу, но руль в твоих руках.',
      caution: 'Этот расклад просит внимательности и честности. Несколько карт указывают на напряжение, блоки или на то, что должно завершиться. Это не плохое предзнаменование — это сигнал замедлиться, посмотреть на то, что болит, и выбирать осознанно.',
    },
    majors: n => n >= 2 ? `${n} Старших аркана — это значимый момент с долгосрочными последствиями, а не случайный эпизод.` : n === 1 ? 'Один Старший аркан показывает глубокий урок за повседневными событиями.' : 'Только Младшие арканы — ситуация в твоих руках и может быстро измениться.',
    suit: { wands: 'Преобладают Жезлы: тема — энергия, амбиции и действие. Многое решает твоя инициатива.',
            cups: 'Преобладают Кубки: в центре эмоции и отношения. Прислушайся к чувствам.',
            swords: 'Преобладают Мечи: важнее всего мысли, решения и разговоры. Ключ — ясность и честность.',
            pentacles: 'Преобладают Пентакли: в фокусе деньги, работа, тело и дом. Лучше всего работают практичные шаги.' },
    reversed: n => `${n} перевёрнутые карты — часть энергии заблокирована или обращена внутрь; часть работы — внутренняя.`,
    courts: 'Несколько придворных карт: другие люди играют важную роль — или говорят разные стороны твоей личности.',
    storyStart: (pos, name, kw) => `${pos} — ${name}: ${kw}.`,
    storyNext: (pos, name, kw) => `${pos} — ${name}: ${kw}.`,
    storyEnd: (pos, name, kw) => `И ${pos.toLowerCase()} — ${name}: ${kw}.`,
  },
  ua: {
    pos: {
      past: 'Ця карта показує, що сформувало твою ситуацію.', present: 'Це енергія, що оточує тебе зараз.',
      future: 'Сюди все рухається, якщо нічого не змінювати.', day: 'Це головна енергія твого дня.',
      state: 'Так ти почуваєшся й це ти вносиш у стосунки.', partner: 'Це почуття й ставлення іншої людини.',
      connection: 'Це те, що вас поєднує зараз.', potential: 'Це показує, куди можуть прийти стосунки.',
      energy: 'Це загальний тон найближчого місяця.', challenge: 'Це головний виклик, через який треба пройти.',
      opportunities: 'Це можливість, яку важливо помітити й використати.', outcome: 'Це ймовірний підсумок.',
      theme: 'Це центральна тема твого року.', challenges: 'Це уроки й перешкоди року.',
      love: 'Це те, що рік принесе в коханні.', career: 'Це те, що рік принесе в роботі й грошах.',
      message: 'Це послання карт для тебе.', situation: 'Це ситуація така, яка вона є.',
      obstacle: 'Це те, що заважає.', advice: 'Це порада карт.',
      you: 'Це твій бік історії.', them: 'Це бік іншої людини.', relationship: 'Це самі стосунки.',
      foundation: 'Це корінь ситуації — те, що лежить в її основі.', recent: 'Це те, що нещодавно сталося й відходить.',
      crown: 'Це твоя свідома мета — до чого ти прагнеш.', near: 'Це те, що прийде найближчими тижнями.',
      self: 'Це твоє внутрішнє ставлення.', environment: 'Це вплив людей і обставин довкола тебе.',
      hopes: 'Це твої надії та страхи — часто два боки однієї медалі.', final: 'Це те, до чого все веде.',
      answer: 'Ця карта відповідає на твоє питання.', money: 'Тут — про гроші й роботу.',
    },
    lbl: { meaning: 'Значення', love: 'Кохання й стосунки', work: 'Робота й гроші', advice: 'Порада', yn: 'Так чи ні', overall: 'Загальна картина',
           story: 'Як карти пов’язані', patterns: 'Що варто помітити', forYou: 'Що це означає для тебе', key: 'Головна порада', energy: 'Енергія розкладу' },
    yn: { y: 'Так', m: 'Можливо', n: 'Ні' },
    ynText: { y: 'Карти схиляються до «так».', m: 'Відповідь іще не визначена — вона залежить від твоїх наступних кроків.', n: 'Поки карти схиляються до «ні».' },
    energy: {
      positive: 'Це підтримувальний розклад. Більшість карт несуть світлу, творчу енергію: обставини на твоєму боці, і зусилля зараз, найімовірніше, окупляться. Лишайся відкритим(-ою) й рухайся вперед.',
      neutral: 'Розклад збалансований: є і можливості, і випробування. Підсумок значною мірою залежить від твоїх рішень — карти показують дорогу, але кермо в твоїх руках.',
      caution: 'Цей розклад просить уважності й чесності. Кілька карт вказують на напругу, блоки або те, що має завершитися. Це не погане знамення — це сигнал сповільнитися, подивитися на те, що болить, і обирати свідомо.',
    },
    majors: n => n >= 2 ? `${n} Старші аркани — це значущий момент із довгостроковими наслідками, а не випадковий епізод.` : n === 1 ? 'Один Старший аркан показує глибокий урок за щоденними подіями.' : 'Лише Молодші аркани — ситуація в твоїх руках і може швидко змінитися.',
    suit: { wands: 'Переважають Жезли: тема — енергія, амбіції й дія. Багато вирішує твоя ініціатива.',
            cups: 'Переважають Кубки: у центрі емоції та стосунки. Прислухайся до почуттів.',
            swords: 'Переважають Мечі: найважливіші думки, рішення й розмови. Ключ — ясність і чесність.',
            pentacles: 'Переважають Пентаклі: у фокусі гроші, робота, тіло й дім. Найкраще працюють практичні кроки.' },
    reversed: n => `${n} перевернуті карти — частина енергії заблокована або спрямована всередину; частина роботи — внутрішня.`,
    courts: 'Кілька придворних карт: інші люди відіграють важливу роль — або говорять різні сторони твоєї особистості.',
    storyStart: (pos, name, kw) => `${pos} — ${name}: ${kw}.`,
    storyNext: (pos, name, kw) => `${pos} — ${name}: ${kw}.`,
    storyEnd: (pos, name, kw) => `І ${pos.toLowerCase()} — ${name}: ${kw}.`,
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
  const kw = c => keywords(c).slice(0, 2).join(L === 'en' ? ' and ' : L === 'ua' ? ' і ' : ' и ').toLowerCase();
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
