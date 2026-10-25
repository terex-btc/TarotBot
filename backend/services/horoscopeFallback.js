'use strict';
// ══ Гороскоп без AI ═══════════════════════════════════════════════════════════
// Детермінований (той самий для знаку на конкретну дату), з урахуванням стихії
// знаку, фази Місяця й числа дня. Використовується, коли AI недоступний.

const ELEMENT = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire', taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air', cancer: 'water', scorpio: 'water', pisces: 'water',
};

function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = (arr, n) => arr[n % arr.length];

const B = {
  en: {
    open: {
      fire: ['Your fire is bright today, and people feel it.', 'Energy is on your side — use it for something that matters.', 'A bold impulse is worth listening to today.'],
      earth: ['Today rewards patience and practical steps.', 'Solid ground is forming under your plans.', 'Small, steady actions bring more than big promises today.'],
      air: ['Your mind is quick today, and ideas come easily.', 'Conversations open doors — say what you think.', 'A new perspective changes how you see an old question.'],
      water: ['Your intuition is unusually clear today.', 'Feelings guide you better than logic right now.', 'Emotional honesty brings you closer to what you want.'],
    },
    moon: {
      new: 'The New Moon favours fresh intentions — write down one wish.', waxing: 'The growing Moon supports anything you start now.',
      first: 'The First Quarter Moon asks for a decision you have been postponing.', gibbous: 'The Moon is almost full — polish the details and stay patient.',
      full: 'The Full Moon brings emotions and hidden truths to the surface.', waning: 'The waning Moon helps you let go of what drains you.',
      last: 'The Last Quarter Moon is ideal for finishing and forgiving.', dark: 'The dark Moon invites rest and quiet reflection.',
    },
    day: ['A good day to begin something new.', 'Cooperation works better than going solo today.', 'Creativity and joy are your best tools today.',
      'Order and focus help you finish what matters.', 'Expect a change of plans — stay flexible.', 'Care for the people close to you pays back warmly.',
      'Take time for yourself; answers come in silence.', 'Ambition is rewarded — aim a little higher.', 'Close an old chapter to make room for the new.'],
    love: ['A warm word or small gesture means more than usual today.', 'Be the first to reach out — the response may surprise you.',
      'Honest talk clears the air and brings you closer.', 'Single? A friendly conversation could turn into something more.',
      'Give your partner space and they will come closer.', 'Romance hides in ordinary moments — notice them.'],
    career: ['Focus on one important task instead of ten small ones.', 'Your idea deserves to be heard — share it.',
      'Double-check numbers and messages before you send them.', 'A useful contact or tip may appear unexpectedly.',
      'Steady effort today builds a reputation for tomorrow.', 'Say no to one thing that wastes your energy.'],
    well: ['A short walk will clear your head better than coffee.', 'Drink more water and go to bed a little earlier.',
      'Stretch for five minutes — your body will thank you.', 'Breathe slowly before reacting to stress.',
      'Spend some time offline today.', 'Choose food that gives energy, not just comfort.'],
    focus: ['Trust your first instinct', 'One step at a time', 'Say what you feel', 'Finish what you started', 'Open the door to change',
      'Choose calm over drama', 'Invest in yourself', 'Listen more than you speak', 'Be brave and kind', 'Let go of the old'],
    mood: ['Inspired', 'Calm', 'Hopeful', 'Focused', 'Playful', 'Confident', 'Tender', 'Curious', 'Grounded', 'Bright'],
    color: ['Lavender', 'Gold', 'Emerald', 'Sky blue', 'Coral', 'Silver', 'Deep blue', 'Rose', 'White', 'Amber'],
  },
  ru: {
    open: {
      fire: ['Сегодня твой огонь горит ярко, и люди это чувствуют.', 'Энергия на твоей стороне — направь её на что-то важное.', 'Смелый импульс сегодня стоит того, чтобы его послушать.'],
      earth: ['Сегодня вознаграждаются терпение и практичные шаги.', 'Под твоими планами формируется прочная почва.', 'Маленькие уверенные действия сегодня дадут больше громких обещаний.'],
      air: ['Сегодня ум работает быстро, и идеи приходят легко.', 'Разговоры открывают двери — говори, что думаешь.', 'Новый взгляд меняет отношение к старому вопросу.'],
      water: ['Сегодня интуиция особенно ясна.', 'Чувства сейчас ведут лучше логики.', 'Эмоциональная честность приближает тебя к желаемому.'],
    },
    moon: {
      new: 'Новолуние благоволит новым намерениям — запиши одно желание.', waxing: 'Растущая Луна поддерживает всё, что ты начинаешь сейчас.',
      first: 'Первая четверть Луны просит решения, которое ты откладывал(а).', gibbous: 'Луна почти полная — доводи детали и сохраняй терпение.',
      full: 'Полнолуние поднимает на поверхность эмоции и скрытую правду.', waning: 'Убывающая Луна помогает отпустить то, что забирает силы.',
      last: 'Последняя четверть идеальна, чтобы завершать и прощать.', dark: 'Тёмная Луна зовёт к отдыху и тихим размышлениям.',
    },
    day: ['Хороший день, чтобы начать что-то новое.', 'Сегодня сотрудничество работает лучше, чем одиночная игра.', 'Творчество и радость — твои лучшие инструменты сегодня.',
      'Порядок и фокус помогут закончить важное.', 'Жди перемены планов — будь гибким(ой).', 'Забота о близких возвращается теплом.',
      'Удели время себе: ответы приходят в тишине.', 'Амбиции вознаграждаются — целься чуть выше.', 'Закрой старую главу, чтобы освободить место новому.'],
    love: ['Тёплое слово или маленький жест сегодня значат больше обычного.', 'Напиши первым(ой) — ответ может удивить.',
      'Честный разговор разряжает обстановку и сближает.', 'Свободен(на)? Дружеская беседа может перерасти в нечто большее.',
      'Дай партнёру пространство — и он станет ближе.', 'Романтика прячется в обычных моментах — замечай их.'],
    career: ['Сосредоточься на одной важной задаче вместо десяти мелких.', 'Твоя идея заслуживает того, чтобы её услышали, — поделись.',
      'Перепроверь цифры и сообщения перед отправкой.', 'Неожиданно может появиться полезный контакт или подсказка.',
      'Ровные усилия сегодня строят репутацию на завтра.', 'Скажи «нет» одному делу, которое отнимает силы.'],
    well: ['Короткая прогулка прочистит голову лучше кофе.', 'Пей больше воды и ложись чуть раньше.',
      'Потянись пять минут — тело скажет спасибо.', 'Медленно вдохни, прежде чем реагировать на стресс.',
      'Проведи немного времени офлайн.', 'Выбирай еду, которая даёт энергию, а не только утешение.'],
    focus: ['Доверься первому порыву', 'Шаг за шагом', 'Говори, что чувствуешь', 'Заверши начатое', 'Открой дверь переменам',
      'Выбирай спокойствие, а не драму', 'Вложись в себя', 'Слушай больше, чем говоришь', 'Будь смелым(ой) и добрым(ой)', 'Отпусти старое'],
    mood: ['Вдохновение', 'Спокойствие', 'Надежда', 'Собранность', 'Игривость', 'Уверенность', 'Нежность', 'Любопытство', 'Устойчивость', 'Сияние'],
    color: ['Лавандовый', 'Золотой', 'Изумрудный', 'Небесно-голубой', 'Коралловый', 'Серебристый', 'Тёмно-синий', 'Розовый', 'Белый', 'Янтарный'],
  },
  ua: {
    open: {
      fire: ['Сьогодні твій вогонь горить яскраво, і люди це відчувають.', 'Енергія на твоєму боці — спрямуй її на щось важливе.', 'Сміливий імпульс сьогодні вартий того, щоб його послухати.'],
      earth: ['Сьогодні винагороджуються терпіння й практичні кроки.', 'Під твоїми планами формується міцний ґрунт.', 'Маленькі впевнені дії сьогодні дадуть більше за гучні обіцянки.'],
      air: ['Сьогодні розум працює швидко, й ідеї приходять легко.', 'Розмови відчиняють двері — кажи, що думаєш.', 'Новий погляд змінює ставлення до старого питання.'],
      water: ['Сьогодні інтуїція особливо ясна.', 'Почуття зараз ведуть краще за логіку.', 'Емоційна чесність наближає тебе до бажаного.'],
    },
    moon: {
      new: 'Молодик сприяє новим намірам — запиши одне бажання.', waxing: 'Зростаючий Місяць підтримує все, що ти починаєш зараз.',
      first: 'Перша чверть Місяця просить рішення, яке ти відкладав(-ла).', gibbous: 'Місяць майже повний — доводь деталі й зберігай терпіння.',
      full: 'Повня піднімає на поверхню емоції та приховану правду.', waning: 'Спадний Місяць допомагає відпустити те, що забирає сили.',
      last: 'Остання чверть ідеальна, щоб завершувати й пробачати.', dark: 'Темний Місяць кличе до відпочинку й тихих роздумів.',
    },
    day: ['Добрий день, щоб почати щось нове.', 'Сьогодні співпраця працює краще за гру наодинці.', 'Творчість і радість — твої найкращі інструменти сьогодні.',
      'Порядок і фокус допоможуть завершити важливе.', 'Чекай зміни планів — будь гнучким(-ою).', 'Турбота про рідних повертається теплом.',
      'Приділи час собі: відповіді приходять у тиші.', 'Амбіції винагороджуються — цілься трохи вище.', 'Закрий старий розділ, щоб звільнити місце новому.'],
    love: ['Тепле слово чи маленький жест сьогодні важать більше, ніж зазвичай.', 'Напиши першим(-ою) — відповідь може здивувати.',
      'Чесна розмова розряджає атмосферу й зближує.', 'Вільний(-а)? Дружня бесіда може перерости в щось більше.',
      'Дай партнерові простір — і він стане ближчим.', 'Романтика ховається у звичайних моментах — помічай їх.'],
    career: ['Зосередься на одному важливому завданні замість десяти дрібних.', 'Твоя ідея варта того, щоб її почули, — поділися.',
      'Перевір цифри й повідомлення перед надсиланням.', 'Несподівано може з’явитися корисний контакт чи підказка.',
      'Рівні зусилля сьогодні будують репутацію на завтра.', 'Скажи «ні» одній справі, що забирає сили.'],
    well: ['Коротка прогулянка прочистить голову краще за каву.', 'Пий більше води й лягай трохи раніше.',
      'Потягнися п’ять хвилин — тіло подякує.', 'Повільно вдихни, перш ніж реагувати на стрес.',
      'Проведи трохи часу офлайн.', 'Обирай їжу, що дає енергію, а не лише втіху.'],
    focus: ['Довірся першому пориву', 'Крок за кроком', 'Кажи, що відчуваєш', 'Заверши розпочате', 'Відчини двері змінам',
      'Обирай спокій, а не драму', 'Вклади в себе', 'Слухай більше, ніж говориш', 'Будь сміливим(-ою) й добрим(-ою)', 'Відпусти старе'],
    mood: ['Натхнення', 'Спокій', 'Надія', 'Зібраність', 'Грайливість', 'Упевненість', 'Ніжність', 'Цікавість', 'Стійкість', 'Сяйво'],
    color: ['Лавандовий', 'Золотий', 'Смарагдовий', 'Небесно-блакитний', 'Кораловий', 'Сріблястий', 'Темно-синій', 'Рожевий', 'Білий', 'Бурштиновий'],
  },
};

function fallbackHoroscope(sign, date, lang, moonEnergy) {
  const L = B[lang] || B.en;
  const el = ELEMENT[sign] || 'fire';
  const s = seed(`${date}|${sign}`);
  const dayNum = (String(date).replace(/\D/g, '').split('').reduce((a, b) => a + Number(b), 0) + seed(sign)) % 9;
  return {
    overview: [pick(L.open[el], s), L.moon[moonEnergy] || '', L.day[dayNum]].filter(Boolean).join(' '),
    love: pick(L.love, s >>> 3),
    career: pick(L.career, s >>> 5),
    wellbeing: pick(L.well, s >>> 7),
    focus: pick(L.focus, s >>> 9),
    mood: pick(L.mood, s >>> 11),
    luckyColor: pick(L.color, s >>> 13),
    luckyNumber: (s % 99) + 1,
    source: 'fallback',
  };
}

module.exports = { fallbackHoroscope };
