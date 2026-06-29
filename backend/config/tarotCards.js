'use strict';

// 22 Старших Аркани Таро (Rider-Waite, public domain 1909)
// Зображення зберігаються локально у frontend/assets/cards/
const MAJOR_ARCANA = [
  {
    id: 0, name: 'The Fool', nameUa: 'Блазень', nameRu: 'Шут',
    emoji: '🃏',
    image: '/assets/cards/card_00.jpg',
    upright: {
      ua: 'Нові початки, спонтанність, пригода, свобода духу',
      ru: 'Новые начинания, спонтанность, приключения, свобода духа',
      en: 'New beginnings, spontaneity, adventure, free spirit'
    },
    reversed: {
      ua: 'Безрозсудність, ризик, необдуманість',
      ru: 'Безрассудство, риск, необдуманность',
      en: 'Recklessness, risk, thoughtlessness'
    },
    description: {
      ua: 'Блазень символізує початок нової подорожі, відкритість до нового досвіду та довіру до всесвіту.',
      ru: 'Шут символизирует начало нового путешествия, открытость к новому опыту и доверие к вселенной.',
      en: 'The Fool symbolizes the beginning of a new journey, openness to new experiences and trust in the universe.'
    }
  },
  {
    id: 1, name: 'The Magician', nameUa: 'Маг', nameRu: 'Маг',
    emoji: '🪄',
    image: '/assets/cards/card_01.jpg',
    upright: {
      ua: 'Сила волі, майстерність, концентрація, маніфестація',
      ru: 'Сила воли, мастерство, концентрация, манифестация',
      en: 'Will power, skill, concentration, manifestation'
    },
    reversed: {
      ua: 'Маніпуляція, слабка воля, невикористаний потенціал',
      ru: 'Манипуляция, слабая воля, неиспользованный потенциал',
      en: 'Manipulation, poor planning, untapped potential'
    },
    description: {
      ua: 'Маг має всі інструменти для досягнення своїх цілей. Він втілює здатність перетворювати думки на реальність.',
      ru: 'Маг имеет все инструменты для достижения своих целей. Он воплощает способность превращать мысли в реальность.',
      en: 'The Magician has all the tools to achieve his goals. He embodies the ability to turn thoughts into reality.'
    }
  },
  {
    id: 2, name: 'The High Priestess', nameUa: 'Верховна Жриця', nameRu: 'Верховная Жрица',
    emoji: '🌙',
    image: '/assets/cards/card_02.jpg',
    upright: {
      ua: 'Інтуїція, підсвідомість, таємниця, внутрішнє знання',
      ru: 'Интуиция, подсознание, тайна, внутреннее знание',
      en: 'Intuition, subconscious, mystery, inner knowledge'
    },
    reversed: {
      ua: 'Секрети, відірваність від інтуїції, замовчування',
      ru: 'Секреты, оторванность от интуиции, замалчивание',
      en: 'Secrets, withdrawal of intuition, silence'
    },
    description: {
      ua: 'Верховна Жриця — охоронець таємниць і підсвідомого. Вона закликає прислухатися до внутрішнього голосу.',
      ru: 'Верховная Жрица — хранительница тайн и подсознания. Она призывает прислушиваться к внутреннему голосу.',
      en: 'The High Priestess is the guardian of secrets and the subconscious. She calls to listen to the inner voice.'
    }
  },
  {
    id: 3, name: 'The Empress', nameUa: 'Імператриця', nameRu: 'Императрица',
    emoji: '👑',
    image: '/assets/cards/card_03.jpg',
    upright: {
      ua: 'Родючість, краса, природа, турбота, достаток',
      ru: 'Плодородие, красота, природа, забота, изобилие',
      en: 'Fertility, beauty, nature, nurturing, abundance'
    },
    reversed: {
      ua: 'Залежність, гіперопіка, творчий блок',
      ru: 'Зависимость, гиперопека, творческий блок',
      en: 'Dependence, smothering, creative block'
    },
    description: {
      ua: 'Імператриця — символ материнської любові, родючості та зв\'язку з природою. Час для творчості та розквіту.',
      ru: 'Императрица — символ материнской любви, плодородия и связи с природой. Время для творчества и расцвета.',
      en: 'The Empress symbolizes motherly love, fertility and connection with nature. Time for creativity and flourishing.'
    }
  },
  {
    id: 4, name: 'The Emperor', nameUa: 'Імператор', nameRu: 'Император',
    emoji: '⚔️',
    image: '/assets/cards/card_04.jpg',
    upright: {
      ua: 'Авторитет, структура, контроль, стабільність',
      ru: 'Авторитет, структура, контроль, стабильность',
      en: 'Authority, structure, control, stability'
    },
    reversed: {
      ua: 'Тиранія, негнучкість, надмірний контроль',
      ru: 'Тирания, негибкость, чрезмерный контроль',
      en: 'Tyranny, rigidity, excessive control'
    },
    description: {
      ua: 'Імператор представляє владу, порядок та структуру. Він вчить нас будувати міцні основи.',
      ru: 'Император представляет власть, порядок и структуру. Он учит нас строить прочные основы.',
      en: 'The Emperor represents power, order and structure. He teaches us to build solid foundations.'
    }
  },
  {
    id: 5, name: 'The Hierophant', nameUa: 'Єрофант', nameRu: 'Иерофант',
    emoji: '⛪',
    image: '/assets/cards/card_05.jpg',
    upright: {
      ua: 'Традиції, духовність, освіта, моральні закони',
      ru: 'Традиции, духовность, образование, моральные законы',
      en: 'Tradition, spirituality, education, moral laws'
    },
    reversed: {
      ua: 'Нонконформізм, виклик традиціям, свобода мислення',
      ru: 'Нонконформизм, вызов традициям, свобода мышления',
      en: 'Nonconformity, challenging tradition, freedom of thought'
    },
    description: {
      ua: 'Єрофант є посередником між божественним і земним. Він символізує духовне навчання та дотримання традицій.',
      ru: 'Иерофант является посредником между божественным и земным. Он символизирует духовное обучение и соблюдение традиций.',
      en: 'The Hierophant is a mediator between the divine and earthly. He symbolizes spiritual learning and adherence to traditions.'
    }
  },
  {
    id: 6, name: 'The Lovers', nameUa: 'Закохані', nameRu: 'Влюблённые',
    emoji: '❤️',
    image: '/assets/cards/card_06.jpg',
    upright: {
      ua: 'Любов, гармонія, вибір, відносини, цінності',
      ru: 'Любовь, гармония, выбор, отношения, ценности',
      en: 'Love, harmony, choice, relationships, values'
    },
    reversed: {
      ua: 'Дисгармонія, незбалансованість, погані рішення',
      ru: 'Дисгармония, несбалансированность, плохие решения',
      en: 'Disharmony, imbalance, poor decisions'
    },
    description: {
      ua: 'Закохані символізують союз та важливі вибори в житті. Ця карта нагадує про силу справжньої любові.',
      ru: 'Влюблённые символизируют союз и важные выборы в жизни. Эта карта напоминает о силе настоящей любви.',
      en: 'The Lovers symbolize union and important choices in life. This card reminds us of the power of true love.'
    }
  },
  {
    id: 7, name: 'The Chariot', nameUa: 'Колісниця', nameRu: 'Колесница',
    emoji: '🏆',
    image: '/assets/cards/card_07.jpg',
    upright: {
      ua: 'Перемога, воля, контроль, рішучість, успіх',
      ru: 'Победа, воля, контроль, решимость, успех',
      en: 'Victory, will, control, determination, success'
    },
    reversed: {
      ua: 'Відсутність контролю, агресія, поразка',
      ru: 'Отсутствие контроля, агрессия, поражение',
      en: 'Lack of control, aggression, defeat'
    },
    description: {
      ua: 'Колісниця символізує тріумф через дисципліну та вольову силу. Перемога досяжна!',
      ru: 'Колесница символизирует триумф через дисциплину и силу воли. Победа достижима!',
      en: 'The Chariot symbolizes triumph through discipline and willpower. Victory is achievable!'
    }
  },
  {
    id: 8, name: 'Strength', nameUa: 'Сила', nameRu: 'Сила',
    emoji: '🦁',
    image: '/assets/cards/card_08.jpg',
    upright: {
      ua: 'Сила, мужність, терпіння, внутрішня сила',
      ru: 'Сила, мужество, терпение, внутренняя сила',
      en: 'Strength, courage, patience, inner strength'
    },
    reversed: {
      ua: 'Слабкість, невпевненість, страх',
      ru: 'Слабость, неуверенность, страх',
      en: 'Weakness, self-doubt, fear'
    },
    description: {
      ua: 'Карта Сила нагадує, що справжня могутність — це не фізична сила, а сила духу та серця.',
      ru: 'Карта Сила напоминает, что истинная мощь — это не физическая сила, а сила духа и сердца.',
      en: 'The Strength card reminds us that true power is not physical force, but strength of spirit and heart.'
    }
  },
  {
    id: 9, name: 'The Hermit', nameUa: 'Відлюдник', nameRu: 'Отшельник',
    emoji: '🏔️',
    image: '/assets/cards/card_09.jpg',
    upright: {
      ua: 'Усамітнення, душевний пошук, внутрішнє керівництво',
      ru: 'Уединение, душевный поиск, внутреннее руководство',
      en: 'Solitude, soul searching, inner guidance'
    },
    reversed: {
      ua: 'Ізоляція, самотність, паранойя',
      ru: 'Изоляция, одиночество, паранойя',
      en: 'Isolation, loneliness, paranoia'
    },
    description: {
      ua: 'Відлюдник — мудрець, який знаходить відповіді всередині себе. Час для роздумів та самопізнання.',
      ru: 'Отшельник — мудрец, который находит ответы внутри себя. Время для размышлений и самопознания.',
      en: 'The Hermit is a wise man who finds answers within himself. Time for reflection and self-knowledge.'
    }
  },
  {
    id: 10, name: 'Wheel of Fortune', nameUa: 'Колесо Фортуни', nameRu: 'Колесо Фортуны',
    emoji: '🎡',
    image: '/assets/cards/card_10.jpg',
    upright: {
      ua: 'Удача, карма, доля, поворотний момент',
      ru: 'Удача, карма, судьба, поворотный момент',
      en: 'Luck, karma, fate, turning point'
    },
    reversed: {
      ua: 'Невдача, опір змінам, погана карма',
      ru: 'Неудача, сопротивление переменам, плохая карма',
      en: 'Bad luck, resistance to change, bad karma'
    },
    description: {
      ua: 'Колесо Фортуни нагадує, що все в житті циклічне. Удача сьогодні може змінитись завтра.',
      ru: 'Колесо Фортуны напоминает, что всё в жизни цикличное. Удача сегодня может измениться завтра.',
      en: 'The Wheel of Fortune reminds us that everything in life is cyclical. Luck today may change tomorrow.'
    }
  },
  {
    id: 11, name: 'Justice', nameUa: 'Справедливість', nameRu: 'Справедливость',
    emoji: '⚖️',
    image: '/assets/cards/card_11.jpg',
    upright: {
      ua: 'Справедливість, правда, закон, баланс',
      ru: 'Справедливость, правда, закон, баланс',
      en: 'Justice, truth, law, balance'
    },
    reversed: {
      ua: 'Несправедливість, нечесність, дисбаланс',
      ru: 'Несправедливость, нечестность, дисбаланс',
      en: 'Injustice, dishonesty, imbalance'
    },
    description: {
      ua: 'Справедливість символізує об\'єктивність та правду. Кожна дія має наслідки.',
      ru: 'Справедливость символизирует объективность и правду. Каждое действие имеет последствия.',
      en: 'Justice symbolizes objectivity and truth. Every action has consequences.'
    }
  },
  {
    id: 12, name: 'The Hanged Man', nameUa: 'Повішений', nameRu: 'Повешенный',
    emoji: '🙃',
    image: '/assets/cards/card_12.jpg',
    upright: {
      ua: 'Пауза, здача, нова перспектива, жертва',
      ru: 'Пауза, сдача, новая перспектива, жертва',
      en: 'Pause, surrender, new perspective, sacrifice'
    },
    reversed: {
      ua: 'Затримка, опір, марна жертва',
      ru: 'Задержка, сопротивление, бесполезная жертва',
      en: 'Delay, resistance, futile sacrifice'
    },
    description: {
      ua: 'Повішений закликає зупинитись і подивитись на ситуацію з іншого кута. Пауза — це мудрість.',
      ru: 'Повешенный призывает остановиться и посмотреть на ситуацию с другого угла. Пауза — это мудрость.',
      en: 'The Hanged Man calls to stop and look at the situation from a different angle. Pause is wisdom.'
    }
  },
  {
    id: 13, name: 'Death', nameUa: 'Смерть', nameRu: 'Смерть',
    emoji: '🌑',
    image: '/assets/cards/card_13.jpg',
    upright: {
      ua: 'Кінець, перехід, трансформація, нові початки',
      ru: 'Конец, переход, трансформация, новые начала',
      en: 'Endings, transition, transformation, new beginnings'
    },
    reversed: {
      ua: 'Опір змінам, особистий застій, відмова відпустити',
      ru: 'Сопротивление переменам, личный застой, отказ отпустить',
      en: 'Resistance to change, personal stagnation, inability to let go'
    },
    description: {
      ua: 'Карта Смерть — це не про фізичну смерть. Це про трансформацію та завершення одного циклу.',
      ru: 'Карта Смерть — это не о физической смерти. Это о трансформации и завершении одного цикла.',
      en: 'The Death card is not about physical death. It\'s about transformation and the end of one cycle.'
    }
  },
  {
    id: 14, name: 'Temperance', nameUa: 'Поміркованість', nameRu: 'Умеренность',
    emoji: '🌊',
    image: '/assets/cards/card_14.jpg',
    upright: {
      ua: 'Баланс, поміркованість, терпіння, гармонія',
      ru: 'Баланс, умеренность, терпение, гармония',
      en: 'Balance, moderation, patience, harmony'
    },
    reversed: {
      ua: 'Надмірність, дисбаланс, нестриманість',
      ru: 'Излишество, дисбаланс, несдержанность',
      en: 'Excess, imbalance, lack of restraint'
    },
    description: {
      ua: 'Поміркованість вчить нас знаходити баланс між крайнощами та жити у гармонії.',
      ru: 'Умеренность учит нас находить баланс между крайностями и жить в гармонии.',
      en: 'Temperance teaches us to find balance between extremes and live in harmony.'
    }
  },
  {
    id: 15, name: 'The Devil', nameUa: 'Диявол', nameRu: 'Дьявол',
    emoji: '😈',
    image: '/assets/cards/card_15.jpg',
    upright: {
      ua: 'Прив\'язаність, матеріалізм, залежність, обмеження',
      ru: 'Привязанность, материализм, зависимость, ограничения',
      en: 'Attachment, materialism, addiction, restriction'
    },
    reversed: {
      ua: 'Звільнення, відновлення контролю, пробудження',
      ru: 'Освобождение, восстановление контроля, пробуждение',
      en: 'Release, regaining control, awakening'
    },
    description: {
      ua: 'Диявол символізує наші темні сторони та прив\'язаності. Але ланцюги — у наших руках.',
      ru: 'Дьявол символизирует наши тёмные стороны и привязанности. Но цепи — в наших руках.',
      en: 'The Devil symbolizes our dark sides and attachments. But the chains are in our hands.'
    }
  },
  {
    id: 16, name: 'The Tower', nameUa: 'Вежа', nameRu: 'Башня',
    emoji: '⚡',
    image: '/assets/cards/card_16.jpg',
    upright: {
      ua: 'Раптові зміни, хаос, одкровення, пробудження',
      ru: 'Внезапные изменения, хаос, откровение, пробуждение',
      en: 'Sudden change, chaos, revelation, awakening'
    },
    reversed: {
      ua: 'Уникнення катастрофи, страх змін, відтермінування',
      ru: 'Избегание катастрофы, страх перемен, откладывание',
      en: 'Avoiding disaster, fear of change, delay'
    },
    description: {
      ua: 'Вежа — карта драматичних змін. Руйнується те, що мало впасти. Після бурі приходить ясність.',
      ru: 'Башня — карта драматических изменений. Рушится то, что должно было упасть. После бури приходит ясность.',
      en: 'The Tower is a card of dramatic change. What needed to fall, falls. After the storm comes clarity.'
    }
  },
  {
    id: 17, name: 'The Star', nameUa: 'Зірка', nameRu: 'Звезда',
    emoji: '⭐',
    image: '/assets/cards/card_17.jpg',
    upright: {
      ua: 'Надія, натхнення, духовність, оновлення',
      ru: 'Надежда, вдохновение, духовность, обновление',
      en: 'Hope, inspiration, spirituality, renewal'
    },
    reversed: {
      ua: 'Відчай, відсутність надії, розчарування',
      ru: 'Отчаяние, отсутствие надежды, разочарование',
      en: 'Despair, hopelessness, disappointment'
    },
    description: {
      ua: 'Зірка — знак надії після темряви. Всесвіт підтримує вас на вашому шляху.',
      ru: 'Звезда — знак надежды после тьмы. Вселенная поддерживает вас на вашем пути.',
      en: 'The Star is a sign of hope after darkness. The universe supports you on your path.'
    }
  },
  {
    id: 18, name: 'The Moon', nameUa: 'Місяць', nameRu: 'Луна',
    emoji: '🌕',
    image: '/assets/cards/card_18.jpg',
    upright: {
      ua: 'Ілюзія, страх, підсвідомість, нерозуміння',
      ru: 'Иллюзия, страх, подсознание, непонимание',
      en: 'Illusion, fear, subconscious, misunderstanding'
    },
    reversed: {
      ua: 'Ясність, відновлення, подолання страху',
      ru: 'Ясность, восстановление, преодоление страха',
      en: 'Clarity, recovery, overcoming fear'
    },
    description: {
      ua: 'Місяць — карта таємниць та підсвідомого. Не все є тим, чим здається. Довіряйте інтуїції.',
      ru: 'Луна — карта тайн и подсознания. Не всё является тем, чем кажется. Доверяйте интуиции.',
      en: 'The Moon is a card of mysteries and the subconscious. Not everything is as it seems. Trust your intuition.'
    }
  },
  {
    id: 19, name: 'The Sun', nameUa: 'Сонце', nameRu: 'Солнце',
    emoji: '☀️',
    image: '/assets/cards/card_19.jpg',
    upright: {
      ua: 'Радість, успіх, позитивність, ясність, енергія',
      ru: 'Радость, успех, позитивность, ясность, энергия',
      en: 'Joy, success, positivity, clarity, vitality'
    },
    reversed: {
      ua: 'Надмірний оптимізм, нереалістичні очікування',
      ru: 'Чрезмерный оптимизм, нереалистичные ожидания',
      en: 'Excessive optimism, unrealistic expectations'
    },
    description: {
      ua: 'Сонце — найщасливіша карта Таро! Воно обіцяє радість, успіх та позитивну енергію.',
      ru: 'Солнце — самая счастливая карта Таро! Оно обещает радость, успех и позитивную энергию.',
      en: 'The Sun is the happiest card in Tarot! It promises joy, success and positive energy.'
    }
  },
  {
    id: 20, name: 'Judgement', nameUa: 'Суд', nameRu: 'Суд',
    emoji: '📯',
    image: '/assets/cards/card_20.jpg',
    upright: {
      ua: 'Відродження, прощення, внутрішній поклик',
      ru: 'Возрождение, прощение, внутренний зов',
      en: 'Rebirth, forgiveness, inner calling'
    },
    reversed: {
      ua: 'Самосумнів, відмова від покликання, самокритика',
      ru: 'Самосомнение, отказ от призвания, самокритика',
      en: 'Self-doubt, refusal of calling, self-criticism'
    },
    description: {
      ua: 'Суд закликає прислухатися до вищого покликання і зробити важливий вибір.',
      ru: 'Суд призывает прислушаться к высшему призванию и сделать важный выбор.',
      en: 'Judgement calls to listen to a higher calling and make an important choice.'
    }
  },
  {
    id: 21, name: 'The World', nameUa: 'Світ', nameRu: 'Мир',
    emoji: '🌍',
    image: '/assets/cards/card_21.jpg',
    upright: {
      ua: 'Завершення, інтеграція, досягнення, успіх',
      ru: 'Завершение, интеграция, достижение, успех',
      en: 'Completion, integration, accomplishment, success'
    },
    reversed: {
      ua: 'Незавершеність, незамкнені кола, стагнація',
      ru: 'Незавершённость, незамкнутые круги, стагнация',
      en: 'Incompleteness, unclosed circles, stagnation'
    },
    description: {
      ua: 'Світ — карта завершення та тріумфу. Ви досягли мети! Починається новий цикл.',
      ru: 'Мир — карта завершения и триумфа. Вы достигли цели! Начинается новый цикл.',
      en: 'The World is a card of completion and triumph. You have achieved your goal! A new cycle begins.'
    }
  },

  // ─────────────────── ЖЕЗЛИ / WANDS (вогонь) — id 22-35 ───────────────────
  {
    id: 22, name: 'Ace of Wands', nameUa: 'Туз Жезлів', nameRu: 'Туз Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_01.jpg',
    upright: { ua: 'Натхнення, нова ідея, творча іскра, потенціал', ru: 'Вдохновение, новая идея, творческая искра, потенциал', en: 'Inspiration, new idea, creative spark, potential' },
    reversed: { ua: 'Затримка, брак енергії, згаслий ентузіазм', ru: 'Задержка, нехватка энергии, угасший энтузиазм', en: 'Delays, lack of energy, faded enthusiasm' },
    description: { ua: 'Туз Жезлів — іскра нового починання. Час діяти, поки горить вогонь натхнення.', ru: 'Туз Жезлов — искра нового начинания. Время действовать, пока горит огонь вдохновения.', en: 'The Ace of Wands is the spark of a new venture. Act while the fire of inspiration burns.' }
  },
  {
    id: 23, name: 'Two of Wands', nameUa: 'Двійка Жезлів', nameRu: 'Двойка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_02.jpg',
    upright: { ua: 'Планування, вибір шляху, бачення майбутнього', ru: 'Планирование, выбор пути, видение будущего', en: 'Planning, choosing a path, future vision' },
    reversed: { ua: 'Страх невідомого, брак планів, нерішучість', ru: 'Страх неизвестности, отсутствие планов, нерешительность', en: 'Fear of the unknown, lack of planning, indecision' },
    description: { ua: 'Двійка Жезлів — момент рішення. Ви тримаєте світ у руках і обираєте напрям.', ru: 'Двойка Жезлов — момент решения. Вы держите мир в руках и выбираете направление.', en: 'The Two of Wands is a moment of decision. You hold the world and choose your direction.' }
  },
  {
    id: 24, name: 'Three of Wands', nameUa: 'Трійка Жезлів', nameRu: 'Тройка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_03.jpg',
    upright: { ua: 'Розширення, прогрес, передбачливість, очікування', ru: 'Расширение, прогресс, предвидение, ожидание', en: 'Expansion, progress, foresight, anticipation' },
    reversed: { ua: 'Затримки, перешкоди, обмежене бачення', ru: 'Задержки, препятствия, ограниченное видение', en: 'Delays, obstacles, limited vision' },
    description: { ua: 'Трійка Жезлів — плани втілюються. Ваші зусилля починають приносити плоди.', ru: 'Тройка Жезлов — планы воплощаются. Ваши усилия начинают приносить плоды.', en: 'The Three of Wands sees plans set in motion. Your efforts begin to bear fruit.' }
  },
  {
    id: 25, name: 'Four of Wands', nameUa: 'Четвірка Жезлів', nameRu: 'Четвёрка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_04.jpg',
    upright: { ua: 'Святкування, гармонія, дім, родинна радість', ru: 'Праздник, гармония, дом, семейная радость', en: 'Celebration, harmony, home, joyful gathering' },
    reversed: { ua: 'Нестабільність, конфлікт удома, перехід', ru: 'Нестабильность, конфликт дома, переходный период', en: 'Instability, conflict at home, transition' },
    description: { ua: 'Четвірка Жезлів — свято і відчуття дому. Час радіти досягнутому разом з близькими.', ru: 'Четвёрка Жезлов — праздник и ощущение дома. Время радоваться достигнутому с близкими.', en: 'The Four of Wands is celebration and belonging. Rejoice in achievements with loved ones.' }
  },
  {
    id: 26, name: 'Five of Wands', nameUa: 'П\u2019ятірка Жезлів', nameRu: 'Пятёрка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_05.jpg',
    upright: { ua: 'Суперництво, конфлікт, боротьба, напруга', ru: 'Соперничество, конфликт, борьба, напряжение', en: 'Competition, conflict, struggle, tension' },
    reversed: { ua: 'Уникнення конфлікту, примирення, внутрішня боротьба', ru: 'Избегание конфликта, примирение, внутренняя борьба', en: 'Avoiding conflict, resolution, inner struggle' },
    description: { ua: 'П\u2019ятірка Жезлів — змагання та зіткнення поглядів. Енергія шукає виходу через боротьбу.', ru: 'Пятёрка Жезлов — состязание и столкновение взглядов. Энергия ищет выход через борьбу.', en: 'The Five of Wands is rivalry and clashing views. Energy seeks an outlet through struggle.' }
  },
  {
    id: 27, name: 'Six of Wands', nameUa: 'Шістка Жезлів', nameRu: 'Шестёрка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_06.jpg',
    upright: { ua: 'Перемога, визнання, успіх, тріумф', ru: 'Победа, признание, успех, триумф', en: 'Victory, recognition, success, triumph' },
    reversed: { ua: 'Падіння, брак визнання, сумнів у собі', ru: 'Падение, отсутствие признания, сомнение в себе', en: 'Fall from grace, lack of recognition, self-doubt' },
    description: { ua: 'Шістка Жезлів — заслужена перемога та публічне визнання. Ваші зусилля помічені.', ru: 'Шестёрка Жезлов — заслуженная победа и публичное признание. Ваши усилия замечены.', en: 'The Six of Wands is well-earned victory and public recognition. Your efforts are seen.' }
  },
  {
    id: 28, name: 'Seven of Wands', nameUa: 'Сімка Жезлів', nameRu: 'Семёрка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_07.jpg',
    upright: { ua: 'Захист позиції, стійкість, відстоювання себе', ru: 'Защита позиции, стойкость, отстаивание себя', en: 'Defending your position, perseverance, standing firm' },
    reversed: { ua: 'Виснаження, поступка, втрата позицій', ru: 'Истощение, уступка, потеря позиций', en: 'Exhaustion, giving up, losing ground' },
    description: { ua: 'Сімка Жезлів — ви відстоюєте своє. Тримайте оборону, ваша справедлива позиція варта боротьби.', ru: 'Семёрка Жезлов — вы отстаиваете своё. Держите оборону, ваша справедливая позиция стоит борьбы.', en: 'The Seven of Wands has you standing your ground. Hold firm; your cause is worth defending.' }
  },
  {
    id: 29, name: 'Eight of Wands', nameUa: 'Вісімка Жезлів', nameRu: 'Восьмёрка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_08.jpg',
    upright: { ua: 'Швидкість, рух, новини, стрімкі події', ru: 'Скорость, движение, новости, стремительные события', en: 'Speed, movement, news, swift action' },
    reversed: { ua: 'Затримки, поспіх, хаос, перешкоди', ru: 'Задержки, спешка, хаос, препятствия', en: 'Delays, haste, chaos, obstacles' },
    description: { ua: 'Вісімка Жезлів — все рухається швидко. Чекайте важливих новин і стрімкого розвитку.', ru: 'Восьмёрка Жезлов — всё движется быстро. Ждите важных новостей и стремительного развития.', en: 'The Eight of Wands moves fast. Expect important news and rapid developments.' }
  },
  {
    id: 30, name: 'Nine of Wands', nameUa: 'Дев\u2019ятка Жезлів', nameRu: 'Девятка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_09.jpg',
    upright: { ua: 'Стійкість, наполегливість, останній рубіж', ru: 'Стойкость, упорство, последний рубеж', en: 'Resilience, persistence, last stand' },
    reversed: { ua: 'Виснаження, параноя, відмова продовжувати', ru: 'Истощение, паранойя, отказ продолжать', en: 'Exhaustion, paranoia, refusing to go on' },
    description: { ua: 'Дев\u2019ятка Жезлів — ви втомлені, але близькі до мети. Ще одне зусилля — і перемога ваша.', ru: 'Девятка Жезлов — вы устали, но близки к цели. Ещё одно усилие — и победа ваша.', en: 'The Nine of Wands: weary but close. One more push and victory is yours.' }
  },
  {
    id: 31, name: 'Ten of Wands', nameUa: 'Десятка Жезлів', nameRu: 'Десятка Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_10.jpg',
    upright: { ua: 'Тягар, відповідальність, перевантаження', ru: 'Бремя, ответственность, перегрузка', en: 'Burden, responsibility, being overloaded' },
    reversed: { ua: 'Звільнення від тягаря, делегування, відпускання', ru: 'Освобождение от бремени, делегирование, отпускание', en: 'Releasing the burden, delegating, letting go' },
    description: { ua: 'Десятка Жезлів — ви несете надто багато. Час розподілити вантаж і не тягнути все самотужки.', ru: 'Десятка Жезлов — вы несёте слишком много. Время распределить груз и не тянуть всё в одиночку.', en: 'The Ten of Wands: you carry too much. Time to share the load instead of doing it all alone.' }
  },
  {
    id: 32, name: 'Page of Wands', nameUa: 'Паж Жезлів', nameRu: 'Паж Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_11.jpg',
    upright: { ua: 'Ентузіазм, дослідження, вільний дух, нові ідеї', ru: 'Энтузиазм, исследование, свободный дух, новые идеи', en: 'Enthusiasm, exploration, free spirit, new ideas' },
    reversed: { ua: 'Невизначеність, відкладання, брак напрямку', ru: 'Неопределённость, откладывание, отсутствие направления', en: 'Uncertainty, procrastination, lack of direction' },
    description: { ua: 'Паж Жезлів — звістка про нову захопливу можливість. Дозвольте цікавості вести вас.', ru: 'Паж Жезлов — весть о новой увлекательной возможности. Позвольте любопытству вести вас.', en: 'The Page of Wands brings news of an exciting opportunity. Let curiosity lead you.' }
  },
  {
    id: 33, name: 'Knight of Wands', nameUa: 'Лицар Жезлів', nameRu: 'Рыцарь Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_12.jpg',
    upright: { ua: 'Енергія, пристрасть, пригода, дія', ru: 'Энергия, страсть, приключение, действие', en: 'Energy, passion, adventure, action' },
    reversed: { ua: 'Імпульсивність, нетерпіння, безрозсудність', ru: 'Импульсивность, нетерпение, безрассудство', en: 'Impulsiveness, impatience, recklessness' },
    description: { ua: 'Лицар Жезлів — стрімкий рух уперед. Пристрасть і сміливість штовхають до пригод.', ru: 'Рыцарь Жезлов — стремительное движение вперёд. Страсть и смелость толкают к приключениям.', en: 'The Knight of Wands charges forward. Passion and boldness drive you toward adventure.' }
  },
  {
    id: 34, name: 'Queen of Wands', nameUa: 'Королева Жезлів', nameRu: 'Королева Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_13.jpg',
    upright: { ua: 'Впевненість, харизма, тепло, рішучість', ru: 'Уверенность, харизма, тепло, решительность', en: 'Confidence, charisma, warmth, determination' },
    reversed: { ua: 'Невпевненість, ревнощі, вимогливість', ru: 'Неуверенность, ревность, требовательность', en: 'Insecurity, jealousy, demanding nature' },
    description: { ua: 'Королева Жезлів — яскрава, тепла й самодостатня. Її харизма надихає всіх навколо.', ru: 'Королева Жезлов — яркая, тёплая и самодостаточная. Её харизма вдохновляет всех вокруг.', en: 'The Queen of Wands is radiant, warm and self-assured. Her charisma inspires everyone around.' }
  },
  {
    id: 35, name: 'King of Wands', nameUa: 'Король Жезлів', nameRu: 'Король Жезлов',
    emoji: '🔥', image: '/assets/cards/wands_14.jpg',
    upright: { ua: 'Лідерство, бачення, підприємливість, честь', ru: 'Лидерство, видение, предприимчивость, честь', en: 'Leadership, vision, entrepreneurship, honor' },
    reversed: { ua: 'Імпульсивність, деспотизм, завищені очікування', ru: 'Импульсивность, деспотизм, завышенные ожидания', en: 'Impulsiveness, ruthlessness, high expectations' },
    description: { ua: 'Король Жезлів — природжений лідер з баченням. Він веде за собою силою прикладу.', ru: 'Король Жезлов — прирождённый лидер с видением. Он ведёт за собой силой примера.', en: 'The King of Wands is a natural visionary leader who guides others by example.' }
  },

  // ─────────────────── КУБКИ / CUPS (вода) — id 36-49 ───────────────────
  {
    id: 36, name: 'Ace of Cups', nameUa: 'Туз Кубків', nameRu: 'Туз Кубков',
    emoji: '🍷', image: '/assets/cards/cups_01.jpg',
    upright: { ua: 'Нове кохання, емоції, інтуїція, співчуття', ru: 'Новая любовь, эмоции, интуиция, сострадание', en: 'New love, emotions, intuition, compassion' },
    reversed: { ua: 'Емоційна порожнеча, блокування почуттів', ru: 'Эмоциональная пустота, блокировка чувств', en: 'Emotional emptiness, blocked feelings' },
    description: { ua: 'Туз Кубків — переповнене серце. Відкривається нове джерело любові та чуттєвості.', ru: 'Туз Кубков — переполненное сердце. Открывается новый источник любви и чувственности.', en: 'The Ace of Cups is an overflowing heart. A new source of love and feeling opens.' }
  },
  {
    id: 37, name: 'Two of Cups', nameUa: 'Двійка Кубків', nameRu: 'Двойка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_02.jpg',
    upright: { ua: 'Союз, партнерство, взаємне притягання', ru: 'Союз, партнёрство, взаимное притяжение', en: 'Union, partnership, mutual attraction' },
    reversed: { ua: 'Дисбаланс, розрив, непорозуміння', ru: 'Дисбаланс, разрыв, непонимание', en: 'Imbalance, breakup, miscommunication' },
    description: { ua: 'Двійка Кубків — зустріч двох сердець. Глибокий взаємний зв\u2019язок і гармонія.', ru: 'Двойка Кубков — встреча двух сердец. Глубокая взаимная связь и гармония.', en: 'The Two of Cups is the meeting of two hearts in deep mutual connection.' }
  },
  {
    id: 38, name: 'Three of Cups', nameUa: 'Трійка Кубків', nameRu: 'Тройка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_03.jpg',
    upright: { ua: 'Дружба, святкування, спільнота, радість', ru: 'Дружба, праздник, общность, радость', en: 'Friendship, celebration, community, joy' },
    reversed: { ua: 'Самотність, надмірності, пліткарство', ru: 'Одиночество, излишества, сплетни', en: 'Isolation, excess, gossip' },
    description: { ua: 'Трійка Кубків — радість у колі друзів. Час святкувати та ділитися щастям.', ru: 'Тройка Кубков — радость в кругу друзей. Время праздновать и делиться счастьем.', en: 'The Three of Cups is joy among friends. A time to celebrate and share happiness.' }
  },
  {
    id: 39, name: 'Four of Cups', nameUa: 'Четвірка Кубків', nameRu: 'Четвёрка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_04.jpg',
    upright: { ua: 'Апатія, споглядання, незадоволеність', ru: 'Апатия, созерцание, неудовлетворённость', en: 'Apathy, contemplation, discontent' },
    reversed: { ua: 'Нова мотивація, прийняття можливості, пробудження', ru: 'Новая мотивация, принятие возможности, пробуждение', en: 'New motivation, accepting an offer, awakening' },
    description: { ua: 'Четвірка Кубків — занурення в себе. Не пропустіть можливість, яку пропонує життя.', ru: 'Четвёрка Кубков — погружение в себя. Не пропустите возможность, которую предлагает жизнь.', en: 'The Four of Cups is introspection. Don\u2019t overlook the opportunity life offers you.' }
  },
  {
    id: 40, name: 'Five of Cups', nameUa: 'П\u2019ятірка Кубків', nameRu: 'Пятёрка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_05.jpg',
    upright: { ua: 'Втрата, смуток, розчарування, жаль', ru: 'Потеря, грусть, разочарование, сожаление', en: 'Loss, sadness, disappointment, regret' },
    reversed: { ua: 'Прийняття, прощення, рух уперед', ru: 'Принятие, прощение, движение вперёд', en: 'Acceptance, forgiveness, moving on' },
    description: { ua: 'П\u2019ятірка Кубків — печаль через втрату. Та не все втрачено: озирніться на те, що лишилось.', ru: 'Пятёрка Кубков — печаль из-за потери. Но не всё потеряно: оглянитесь на то, что осталось.', en: 'The Five of Cups grieves a loss. Yet not all is gone — look to what remains.' }
  },
  {
    id: 41, name: 'Six of Cups', nameUa: 'Шістка Кубків', nameRu: 'Шестёрка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_06.jpg',
    upright: { ua: 'Ностальгія, дитинство, невинність, спогади', ru: 'Ностальгия, детство, невинность, воспоминания', en: 'Nostalgia, childhood, innocence, memories' },
    reversed: { ua: 'Застрягання в минулому, наївність', ru: 'Застревание в прошлом, наивность', en: 'Stuck in the past, naivety' },
    description: { ua: 'Шістка Кубків — теплі спогади дитинства. Минуле дарує радість і відчуття безпеки.', ru: 'Шестёрка Кубков — тёплые воспоминания детства. Прошлое дарит радость и чувство безопасности.', en: 'The Six of Cups is warm childhood memory. The past brings joy and a sense of safety.' }
  },
  {
    id: 42, name: 'Seven of Cups', nameUa: 'Сімка Кубків', nameRu: 'Семёрка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_07.jpg',
    upright: { ua: 'Вибір, ілюзії, фантазії, можливості', ru: 'Выбор, иллюзии, фантазии, возможности', en: 'Choices, illusion, fantasy, possibilities' },
    reversed: { ua: 'Ясність, рішучість, реалізм', ru: 'Ясность, решимость, реализм', en: 'Clarity, determination, realism' },
    description: { ua: 'Сімка Кубків — багато спокусливих варіантів. Відрізніть справжнє від ілюзій.', ru: 'Семёрка Кубков — множество заманчивых вариантов. Отличите настоящее от иллюзий.', en: 'The Seven of Cups offers many tempting options. Tell the real from the illusory.' }
  },
  {
    id: 43, name: 'Eight of Cups', nameUa: 'Вісімка Кубків', nameRu: 'Восьмёрка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_08.jpg',
    upright: { ua: 'Відхід, пошук сенсу, залишення позаду', ru: 'Уход, поиск смысла, оставление позади', en: 'Walking away, seeking meaning, leaving behind' },
    reversed: { ua: 'Страх змін, застій, повернення', ru: 'Страх перемен, застой, возвращение', en: 'Fear of change, stagnation, returning' },
    description: { ua: 'Вісімка Кубків — ви залишаєте те, що вже не наповнює. Попереду — глибший сенс.', ru: 'Восьмёрка Кубков — вы оставляете то, что больше не наполняет. Впереди — более глубокий смысл.', en: 'The Eight of Cups leaves behind what no longer fulfills, seeking deeper meaning ahead.' }
  },
  {
    id: 44, name: 'Nine of Cups', nameUa: 'Дев\u2019ятка Кубків', nameRu: 'Девятка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_09.jpg',
    upright: { ua: 'Задоволення, здійснене бажання, достаток', ru: 'Удовлетворение, исполненное желание, достаток', en: 'Contentment, wish fulfilled, abundance' },
    reversed: { ua: 'Незадоволеність, жадібність, порожні бажання', ru: 'Неудовлетворённость, жадность, пустые желания', en: 'Dissatisfaction, greed, empty wishes' },
    description: { ua: 'Дев\u2019ятка Кубків — карта здійсненого бажання. Насолоджуйтесь моментом задоволення.', ru: 'Девятка Кубков — карта исполненного желания. Наслаждайтесь моментом удовлетворения.', en: 'The Nine of Cups is the wish card. Savor this moment of contentment.' }
  },
  {
    id: 45, name: 'Ten of Cups', nameUa: 'Десятка Кубків', nameRu: 'Десятка Кубков',
    emoji: '🍷', image: '/assets/cards/cups_10.jpg',
    upright: { ua: 'Гармонія, щастя, родина, повнота почуттів', ru: 'Гармония, счастье, семья, полнота чувств', en: 'Harmony, happiness, family, emotional fulfillment' },
    reversed: { ua: 'Розлад у родині, розбиті ідеали', ru: 'Разлад в семье, разбитые идеалы', en: 'Family discord, broken ideals' },
    description: { ua: 'Десятка Кубків — повне емоційне щастя. Любов і гармонія в родинному колі.', ru: 'Десятка Кубков — полное эмоциональное счастье. Любовь и гармония в семейном кругу.', en: 'The Ten of Cups is complete emotional happiness — love and harmony in the family.' }
  },
  {
    id: 46, name: 'Page of Cups', nameUa: 'Паж Кубків', nameRu: 'Паж Кубков',
    emoji: '🍷', image: '/assets/cards/cups_11.jpg',
    upright: { ua: 'Творчий початок, інтуїтивні звістки, чутливість', ru: 'Творческое начало, интуитивные вести, чувствительность', en: 'Creative beginnings, intuitive messages, sensitivity' },
    reversed: { ua: 'Емоційна незрілість, блокування творчості', ru: 'Эмоциональная незрелость, блокировка творчества', en: 'Emotional immaturity, creative block' },
    description: { ua: 'Паж Кубків — несподівана звістка від серця. Прислухайтесь до інтуїції та мрій.', ru: 'Паж Кубков — неожиданная весть от сердца. Прислушайтесь к интуиции и мечтам.', en: 'The Page of Cups brings an unexpected message from the heart. Listen to intuition and dreams.' }
  },
  {
    id: 47, name: 'Knight of Cups', nameUa: 'Лицар Кубків', nameRu: 'Рыцарь Кубков',
    emoji: '🍷', image: '/assets/cards/cups_12.jpg',
    upright: { ua: 'Романтика, шарм, ідеалізм, поклик серця', ru: 'Романтика, шарм, идеализм, зов сердца', en: 'Romance, charm, idealism, following the heart' },
    reversed: { ua: 'Примхливість, нереалістичність, розчарування', ru: 'Капризность, нереалистичность, разочарование', en: 'Moodiness, unrealistic, disappointment' },
    description: { ua: 'Лицар Кубків — романтик, що йде за серцем. Приходить з пропозицією чи освідченням.', ru: 'Рыцарь Кубков — романтик, идущий за сердцем. Приходит с предложением или признанием.', en: 'The Knight of Cups is a romantic who follows the heart, arriving with an offer or confession.' }
  },
  {
    id: 48, name: 'Queen of Cups', nameUa: 'Королева Кубків', nameRu: 'Королева Кубков',
    emoji: '🍷', image: '/assets/cards/cups_13.jpg',
    upright: { ua: 'Співчуття, емоційна мудрість, інтуїція, турбота', ru: 'Сострадание, эмоциональная мудрость, интуиция, забота', en: 'Compassion, emotional wisdom, intuition, care' },
    reversed: { ua: 'Емоційна нестабільність, залежність, виснаження', ru: 'Эмоциональная нестабильность, зависимость, истощение', en: 'Emotional instability, dependence, burnout' },
    description: { ua: 'Королева Кубків — глибока інтуїція та чуйність. Вона зцілює оточення своєю любов\u2019ю.', ru: 'Королева Кубков — глубокая интуиция и чуткость. Она исцеляет окружение своей любовью.', en: 'The Queen of Cups has deep intuition and empathy, healing others with her love.' }
  },
  {
    id: 49, name: 'King of Cups', nameUa: 'Король Кубків', nameRu: 'Король Кубков',
    emoji: '🍷', image: '/assets/cards/cups_14.jpg',
    upright: { ua: 'Емоційна рівновага, дипломатія, контроль почуттів', ru: 'Эмоциональное равновесие, дипломатия, контроль чувств', en: 'Emotional balance, diplomacy, control of feelings' },
    reversed: { ua: 'Емоційна маніпуляція, пригнічені почуття', ru: 'Эмоциональная манипуляция, подавленные чувства', en: 'Emotional manipulation, suppressed feelings' },
    description: { ua: 'Король Кубків — майстер емоційного балансу. Спокій і мудрість навіть у бурі.', ru: 'Король Кубков — мастер эмоционального баланса. Спокойствие и мудрость даже в буре.', en: 'The King of Cups masters emotional balance — calm and wise even in a storm.' }
  },

  // ─────────────────── МЕЧІ / SWORDS (повітря) — id 50-63 ───────────────────
  {
    id: 50, name: 'Ace of Swords', nameUa: 'Туз Мечів', nameRu: 'Туз Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_01.jpg',
    upright: { ua: 'Ясність, істина, прорив, сила розуму', ru: 'Ясность, истина, прорыв, сила разума', en: 'Clarity, truth, breakthrough, mental power' },
    reversed: { ua: 'Сум\u2019яття, плутанина, жорстокі слова', ru: 'Смятение, путаница, жестокие слова', en: 'Confusion, muddled thinking, harsh words' },
    description: { ua: 'Туз Мечів — спалах ясності та істини. Розум прорізає туман і знаходить рішення.', ru: 'Туз Мечей — вспышка ясности и истины. Разум прорезает туман и находит решение.', en: 'The Ace of Swords is a flash of clarity and truth. The mind cuts through fog to a solution.' }
  },
  {
    id: 51, name: 'Two of Swords', nameUa: 'Двійка Мечів', nameRu: 'Двойка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_02.jpg',
    upright: { ua: 'Важкий вибір, глухий кут, нерішучість', ru: 'Трудный выбор, тупик, нерешительность', en: 'Difficult choice, stalemate, indecision' },
    reversed: { ua: 'Рішення прийнято, ясність, вихід із глухого кута', ru: 'Решение принято, ясность, выход из тупика', en: 'Decision made, clarity, breaking the deadlock' },
    description: { ua: 'Двійка Мечів — складний вибір із зав\u2019язаними очима. Час зняти пов\u2019язку і подивитись правді в очі.', ru: 'Двойка Мечей — сложный выбор с завязанными глазами. Время снять повязку и взглянуть правде в глаза.', en: 'The Two of Swords is a blindfolded choice. Time to remove the blindfold and face the truth.' }
  },
  {
    id: 52, name: 'Three of Swords', nameUa: 'Трійка Мечів', nameRu: 'Тройка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_03.jpg',
    upright: { ua: 'Сердечний біль, смуток, горе, зрада', ru: 'Сердечная боль, печаль, горе, предательство', en: 'Heartbreak, sorrow, grief, betrayal' },
    reversed: { ua: 'Зцілення, прощення, відпускання болю', ru: 'Исцеление, прощение, отпускание боли', en: 'Healing, forgiveness, releasing pain' },
    description: { ua: 'Трійка Мечів — біль, що пронизує серце. Та сльози очищають і відкривають шлях до зцілення.', ru: 'Тройка Мечей — боль, пронзающая сердце. Но слёзы очищают и открывают путь к исцелению.', en: 'The Three of Swords pierces the heart. Yet tears cleanse and open the way to healing.' }
  },
  {
    id: 53, name: 'Four of Swords', nameUa: 'Четвірка Мечів', nameRu: 'Четвёрка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_04.jpg',
    upright: { ua: 'Відпочинок, відновлення, споглядання, пауза', ru: 'Отдых, восстановление, созерцание, пауза', en: 'Rest, recovery, contemplation, pause' },
    reversed: { ua: 'Виснаження, неспокій, потреба діяти', ru: 'Истощение, беспокойство, потребность действовать', en: 'Burnout, restlessness, need to act' },
    description: { ua: 'Четвірка Мечів — час спокою та відновлення сил. Дозвольте собі перепочинок перед новим етапом.', ru: 'Четвёрка Мечей — время покоя и восстановления сил. Позвольте себе передышку перед новым этапом.', en: 'The Four of Swords is rest and recovery. Allow yourself a pause before the next stage.' }
  },
  {
    id: 54, name: 'Five of Swords', nameUa: 'П\u2019ятірка Мечів', nameRu: 'Пятёрка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_05.jpg',
    upright: { ua: 'Конфлікт, поразка, перемога будь-якою ціною', ru: 'Конфликт, поражение, победа любой ценой', en: 'Conflict, defeat, winning at all costs' },
    reversed: { ua: 'Примирення, каяття, кінець конфлікту', ru: 'Примирение, раскаяние, конец конфликта', en: 'Reconciliation, remorse, ending conflict' },
    description: { ua: 'П\u2019ятірка Мечів — перемога з гірким присмаком. Зважте, чи варта мета зруйнованих стосунків.', ru: 'Пятёрка Мечей — победа с горьким привкусом. Взвесьте, стоит ли цель разрушенных отношений.', en: 'The Five of Swords is a hollow victory. Weigh whether the win is worth the damaged ties.' }
  },
  {
    id: 55, name: 'Six of Swords', nameUa: 'Шістка Мечів', nameRu: 'Шестёрка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_06.jpg',
    upright: { ua: 'Перехід, рух уперед, відновлення, спокій', ru: 'Переход, движение вперёд, восстановление, покой', en: 'Transition, moving on, recovery, calmer waters' },
    reversed: { ua: 'Застрягання, опір змінам, незавершений перехід', ru: 'Застревание, сопротивление переменам, незавершённый переход', en: 'Stuck, resisting change, unfinished transition' },
    description: { ua: 'Шістка Мечів — плавання до спокійніших вод. Найважче позаду, попереду — полегшення.', ru: 'Шестёрка Мечей — плавание к более спокойным водам. Самое тяжёлое позади, впереди — облегчение.', en: 'The Six of Swords sails toward calmer waters. The worst is behind; relief lies ahead.' }
  },
  {
    id: 56, name: 'Seven of Swords', nameUa: 'Сімка Мечів', nameRu: 'Семёрка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_07.jpg',
    upright: { ua: 'Хитрість, стратегія, потайливість, обман', ru: 'Хитрость, стратегия, скрытность, обман', en: 'Cunning, strategy, stealth, deception' },
    reversed: { ua: 'Викриття, каяття, повернення до чесності', ru: 'Разоблачение, раскаяние, возврат к честности', en: 'Exposure, confession, return to honesty' },
    description: { ua: 'Сімка Мечів — гра в обхід правил. Будьте уважні до хитрощів — своїх чи чужих.', ru: 'Семёрка Мечей — игра в обход правил. Будьте внимательны к хитростям — своим или чужим.', en: 'The Seven of Swords plays around the rules. Beware of trickery — yours or another\u2019s.' }
  },
  {
    id: 57, name: 'Eight of Swords', nameUa: 'Вісімка Мечів', nameRu: 'Восьмёрка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_08.jpg',
    upright: { ua: 'Обмеження, відчуття пастки, безпорадність', ru: 'Ограничения, чувство ловушки, беспомощность', en: 'Restriction, feeling trapped, helplessness' },
    reversed: { ua: 'Звільнення, нова перспектива, вихід', ru: 'Освобождение, новая перспектива, выход', en: 'Freedom, new perspective, finding a way out' },
    description: { ua: 'Вісімка Мечів — пастка, створена власними думками. Пов\u2019язка та пута лише у вашій уяві.', ru: 'Восьмёрка Мечей — ловушка, созданная собственными мыслями. Повязка и путы лишь в вашем воображении.', en: 'The Eight of Swords is a trap of your own thinking. The bonds exist only in the mind.' }
  },
  {
    id: 58, name: 'Nine of Swords', nameUa: 'Дев\u2019ятка Мечів', nameRu: 'Девятка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_09.jpg',
    upright: { ua: 'Тривога, страхи, безсоння, переживання', ru: 'Тревога, страхи, бессонница, переживания', en: 'Anxiety, fears, insomnia, worry' },
    reversed: { ua: 'Полегшення, надія, подолання страху', ru: 'Облегчение, надежда, преодоление страха', en: 'Relief, hope, overcoming fear' },
    description: { ua: 'Дев\u2019ятка Мечів — нічні страхи й тривога. Та більшість жахів — лише тіні в темряві.', ru: 'Девятка Мечей — ночные страхи и тревога. Но большинство ужасов — лишь тени в темноте.', en: 'The Nine of Swords is night fears and anxiety. Yet most terrors are only shadows in the dark.' }
  },
  {
    id: 59, name: 'Ten of Swords', nameUa: 'Десятка Мечів', nameRu: 'Десятка Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_10.jpg',
    upright: { ua: 'Болісний фінал, дно, зрада, завершення', ru: 'Болезненный финал, дно, предательство, завершение', en: 'Painful ending, rock bottom, betrayal, closure' },
    reversed: { ua: 'Відродження, відновлення, найгірше позаду', ru: 'Возрождение, восстановление, худшее позади', en: 'Recovery, regeneration, the worst is over' },
    description: { ua: 'Десятка Мечів — болісний, але остаточний кінець. Після найтемнішої ночі завжди настає світанок.', ru: 'Десятка Мечей — болезненный, но окончательный конец. После самой тёмной ночи всегда наступает рассвет.', en: 'The Ten of Swords is a painful but final ending. After the darkest night, dawn always comes.' }
  },
  {
    id: 60, name: 'Page of Swords', nameUa: 'Паж Мечів', nameRu: 'Паж Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_11.jpg',
    upright: { ua: 'Допитливість, нові ідеї, пильність, енергія розуму', ru: 'Любопытство, новые идеи, бдительность, энергия ума', en: 'Curiosity, new ideas, vigilance, mental energy' },
    reversed: { ua: 'Поспішні судження, плітки, обман', ru: 'Поспешные суждения, сплетни, обман', en: 'Hasty judgement, gossip, deception' },
    description: { ua: 'Паж Мечів — гострий розум і спрага знань. Приходить звістка чи нова ідея, що вимагає уваги.', ru: 'Паж Мечей — острый ум и жажда знаний. Приходит весть или новая идея, требующая внимания.', en: 'The Page of Swords is a sharp mind hungry for truth, bringing news or an idea that demands attention.' }
  },
  {
    id: 61, name: 'Knight of Swords', nameUa: 'Лицар Мечів', nameRu: 'Рыцарь Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_12.jpg',
    upright: { ua: 'Амбіції, рішучість, стрімка дія, безстрашність', ru: 'Амбиции, решимость, стремительное действие, бесстрашие', en: 'Ambition, determination, swift action, fearlessness' },
    reversed: { ua: 'Імпульсивність, агресія, необдуманість', ru: 'Импульсивность, агрессия, необдуманность', en: 'Impulsiveness, aggression, recklessness' },
    description: { ua: 'Лицар Мечів — мчить уперед із ясною метою. Сила волі й рішучість зносять усі перешкоди.', ru: 'Рыцарь Мечей — мчится вперёд с ясной целью. Сила воли и решимость сносят все препятствия.', en: 'The Knight of Swords charges with clear purpose, willpower sweeping aside all obstacles.' }
  },
  {
    id: 62, name: 'Queen of Swords', nameUa: 'Королева Мечів', nameRu: 'Королева Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_13.jpg',
    upright: { ua: 'Ясність, незалежність, чесність, проникливість', ru: 'Ясность, независимость, честность, проницательность', en: 'Clarity, independence, honesty, perception' },
    reversed: { ua: 'Холодність, надмірна критичність, гіркота', ru: 'Холодность, чрезмерная критичность, горечь', en: 'Coldness, over-criticism, bitterness' },
    description: { ua: 'Королева Мечів — гострий розум і чесність. Вона бачить істину без ілюзій і говорить прямо.', ru: 'Королева Мечей — острый ум и честность. Она видит истину без иллюзий и говорит прямо.', en: 'The Queen of Swords has a sharp mind and honesty, seeing truth without illusion and speaking plainly.' }
  },
  {
    id: 63, name: 'King of Swords', nameUa: 'Король Мечів', nameRu: 'Король Мечей',
    emoji: '⚔️', image: '/assets/cards/swords_14.jpg',
    upright: { ua: 'Авторитет, інтелект, істина, етичність', ru: 'Авторитет, интеллект, истина, этичность', en: 'Authority, intellect, truth, ethical standards' },
    reversed: { ua: 'Тиранія, маніпуляція, зловживання владою', ru: 'Тирания, манипуляция, злоупотребление властью', en: 'Tyranny, manipulation, abuse of power' },
    description: { ua: 'Король Мечів — холодний розум і справедливість. Він керується логікою та незмінними принципами.', ru: 'Король Мечей — холодный разум и справедливость. Он руководствуется логикой и незыблемыми принципами.', en: 'The King of Swords is cool reason and justice, guided by logic and unshakeable principles.' }
  },

  // ─────────────────── ПЕНТАКЛІ / PENTACLES (земля) — id 64-77 ───────────────────
  {
    id: 64, name: 'Ace of Pentacles', nameUa: 'Туз Пентаклів', nameRu: 'Туз Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_01.jpg',
    upright: { ua: 'Нова можливість, достаток, матеріальний початок', ru: 'Новая возможность, достаток, материальное начало', en: 'New opportunity, prosperity, material beginnings' },
    reversed: { ua: 'Втрачена можливість, фінансова нестабільність', ru: 'Упущенная возможность, финансовая нестабильность', en: 'Missed opportunity, financial instability' },
    description: { ua: 'Туз Пентаклів — насіння майбутнього достатку. Відкривається нова матеріальна можливість.', ru: 'Туз Пентаклей — семя будущего достатка. Открывается новая материальная возможность.', en: 'The Ace of Pentacles is a seed of future prosperity. A new material opportunity opens.' }
  },
  {
    id: 65, name: 'Two of Pentacles', nameUa: 'Двійка Пентаклів', nameRu: 'Двойка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_02.jpg',
    upright: { ua: 'Баланс, гнучкість, керування пріоритетами', ru: 'Баланс, гибкость, управление приоритетами', en: 'Balance, adaptability, juggling priorities' },
    reversed: { ua: 'Перевантаження, дисбаланс, хаос', ru: 'Перегрузка, дисбаланс, хаос', en: 'Overwhelm, imbalance, chaos' },
    description: { ua: 'Двійка Пентаклів — жонглювання справами. Гнучкість допоможе втримати рівновагу.', ru: 'Двойка Пентаклей — жонглирование делами. Гибкость поможет удержать равновесие.', en: 'The Two of Pentacles juggles many demands. Flexibility helps you keep balance.' }
  },
  {
    id: 66, name: 'Three of Pentacles', nameUa: 'Трійка Пентаклів', nameRu: 'Тройка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_03.jpg',
    upright: { ua: 'Командна робота, співпраця, майстерність', ru: 'Командная работа, сотрудничество, мастерство', en: 'Teamwork, collaboration, skill' },
    reversed: { ua: 'Брак злагодженості, конфлікти, посередність', ru: 'Отсутствие слаженности, конфликты, посредственность', en: 'Lack of teamwork, disorganization, mediocrity' },
    description: { ua: 'Трійка Пентаклів — спільна праця дає плоди. Ваша майстерність визнана іншими.', ru: 'Тройка Пентаклей — совместный труд даёт плоды. Ваше мастерство признано другими.', en: 'The Three of Pentacles: collaboration bears fruit. Your skill is recognized by others.' }
  },
  {
    id: 67, name: 'Four of Pentacles', nameUa: 'Четвірка Пентаклів', nameRu: 'Четвёрка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_04.jpg',
    upright: { ua: 'Безпека, контроль, заощадження, утримання', ru: 'Безопасность, контроль, сбережения, удержание', en: 'Security, control, saving, holding on' },
    reversed: { ua: 'Жадібність, скнарість або навпаки — щедрість', ru: 'Жадность, скупость или наоборот — щедрость', en: 'Greed, miserliness, or conversely letting go' },
    description: { ua: 'Четвірка Пентаклів — прагнення стабільності. Та надмірний контроль може стати в\u2019язницею.', ru: 'Четвёрка Пентаклей — стремление к стабильности. Но чрезмерный контроль может стать тюрьмой.', en: 'The Four of Pentacles seeks stability, but clinging too tightly can become a cage.' }
  },
  {
    id: 68, name: 'Five of Pentacles', nameUa: 'П\u2019ятірка Пентаклів', nameRu: 'Пятёрка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_05.jpg',
    upright: { ua: 'Скрута, втрата, ізоляція, тривога', ru: 'Нужда, потеря, изоляция, тревога', en: 'Hardship, loss, isolation, worry' },
    reversed: { ua: 'Відновлення, надія, кінець труднощів', ru: 'Восстановление, надежда, конец трудностей', en: 'Recovery, hope, end of hardship' },
    description: { ua: 'П\u2019ятірка Пентаклів — період скрути. Та допомога ближче, ніж здається — не бійтесь попросити.', ru: 'Пятёрка Пентаклей — период нужды. Но помощь ближе, чем кажется — не бойтесь попросить.', en: 'The Five of Pentacles is hardship. Yet help is nearer than it seems — don\u2019t fear to ask.' }
  },
  {
    id: 69, name: 'Six of Pentacles', nameUa: 'Шістка Пентаклів', nameRu: 'Шестёрка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_06.jpg',
    upright: { ua: 'Щедрість, благодійність, баланс давання й отримання', ru: 'Щедрость, благотворительность, баланс отдачи и получения', en: 'Generosity, charity, giving and receiving' },
    reversed: { ua: 'Борги, нерівність, корисливість', ru: 'Долги, неравенство, корысть', en: 'Debt, inequality, strings attached' },
    description: { ua: 'Шістка Пентаклів — потік щедрості. Те, що ви даєте, повертається до вас сторицею.', ru: 'Шестёрка Пентаклей — поток щедрости. То, что вы отдаёте, возвращается к вам сторицей.', en: 'The Six of Pentacles is a flow of generosity. What you give returns to you manyfold.' }
  },
  {
    id: 70, name: 'Seven of Pentacles', nameUa: 'Сімка Пентаклів', nameRu: 'Семёрка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_07.jpg',
    upright: { ua: 'Терпіння, інвестиція, довгострокова перспектива', ru: 'Терпение, инвестиция, долгосрочная перспектива', en: 'Patience, investment, long-term view' },
    reversed: { ua: 'Нетерплячість, марні зусилля, сумніви', ru: 'Нетерпение, напрасные усилия, сомнения', en: 'Impatience, wasted effort, doubt' },
    description: { ua: 'Сімка Пентаклів — час пожинати посіяне. Терпіння й послідовність приносять винагороду.', ru: 'Семёрка Пентаклей — время пожинать посеянное. Терпение и последовательность приносят награду.', en: 'The Seven of Pentacles reaps what was sown. Patience and consistency bring reward.' }
  },
  {
    id: 71, name: 'Eight of Pentacles', nameUa: 'Вісімка Пентаклів', nameRu: 'Восьмёрка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_08.jpg',
    upright: { ua: 'Майстерність, удосконалення навичок, старанність', ru: 'Мастерство, совершенствование навыков, усердие', en: 'Mastery, skill development, diligence' },
    reversed: { ua: 'Перфекціонізм, рутина, втрата мотивації', ru: 'Перфекционизм, рутина, потеря мотивации', en: 'Perfectionism, repetition, lack of motivation' },
    description: { ua: 'Вісімка Пентаклів — наполеглива праця над майстерністю. Деталь за деталлю ви стаєте профі.', ru: 'Восьмёрка Пентаклей — упорный труд над мастерством. Деталь за деталью вы становитесь профи.', en: 'The Eight of Pentacles is diligent work toward mastery. Detail by detail, you become an expert.' }
  },
  {
    id: 72, name: 'Nine of Pentacles', nameUa: 'Дев\u2019ятка Пентаклів', nameRu: 'Девятка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_09.jpg',
    upright: { ua: 'Достаток, розкіш, самодостатність, незалежність', ru: 'Достаток, роскошь, самодостаточность, независимость', en: 'Abundance, luxury, self-sufficiency, independence' },
    reversed: { ua: 'Залежність, фінансові помилки, самотність', ru: 'Зависимость, финансовые ошибки, одиночество', en: 'Dependence, financial setbacks, loneliness' },
    description: { ua: 'Дев\u2019ятка Пентаклів — плоди власної праці. Насолоджуйтесь комфортом, який заслужили самі.', ru: 'Девятка Пентаклей — плоды собственного труда. Наслаждайтесь комфортом, который заслужили сами.', en: 'The Nine of Pentacles enjoys the fruits of one\u2019s own labor — comfort well earned.' }
  },
  {
    id: 73, name: 'Ten of Pentacles', nameUa: 'Десятка Пентаклів', nameRu: 'Десятка Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_10.jpg',
    upright: { ua: 'Багатство, спадщина, родина, стабільність', ru: 'Богатство, наследие, семья, стабильность', en: 'Wealth, legacy, family, lasting stability' },
    reversed: { ua: 'Фінансові втрати, родинні чвари, нестабільність', ru: 'Финансовые потери, семейные распри, нестабильность', en: 'Financial loss, family conflict, instability' },
    description: { ua: 'Десятка Пентаклів — міцний фундамент і спадщина. Достаток, який передається поколінням.', ru: 'Десятка Пентаклей — прочный фундамент и наследие. Достаток, который передаётся поколениям.', en: 'The Ten of Pentacles is a solid foundation and legacy — wealth passed through generations.' }
  },
  {
    id: 74, name: 'Page of Pentacles', nameUa: 'Паж Пентаклів', nameRu: 'Паж Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_11.jpg',
    upright: { ua: 'Прагнення, навчання, нова можливість, амбіції', ru: 'Стремление, учёба, новая возможность, амбиции', en: 'Aspiration, study, new opportunity, ambition' },
    reversed: { ua: 'Відкладання, нереалізовані плани, лінь', ru: 'Откладывание, нереализованные планы, лень', en: 'Procrastination, unrealized plans, laziness' },
    description: { ua: 'Паж Пентаклів — спрага навчання й нова можливість. Закладіть фундамент майбутнього успіху.', ru: 'Паж Пентаклей — жажда учёбы и новая возможность. Заложите фундамент будущего успеха.', en: 'The Page of Pentacles is eager to learn and brings new opportunity — lay the groundwork for success.' }
  },
  {
    id: 75, name: 'Knight of Pentacles', nameUa: 'Лицар Пентаклів', nameRu: 'Рыцарь Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_12.jpg',
    upright: { ua: 'Працьовитість, надійність, методичність, рутина', ru: 'Трудолюбие, надёжность, методичность, рутина', en: 'Hard work, reliability, routine, methodical effort' },
    reversed: { ua: 'Застій, лінь, надмірна обережність', ru: 'Застой, лень, чрезмерная осторожность', en: 'Stagnation, laziness, over-caution' },
    description: { ua: 'Лицар Пентаклів — повільний, але впевнений рух до мети. Надійність і терпіння — його сила.', ru: 'Рыцарь Пентаклей — медленное, но уверенное движение к цели. Надёжность и терпение — его сила.', en: 'The Knight of Pentacles moves slowly but surely toward goals. Reliability and patience are his strength.' }
  },
  {
    id: 76, name: 'Queen of Pentacles', nameUa: 'Королева Пентаклів', nameRu: 'Королева Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_13.jpg',
    upright: { ua: 'Турбота, практичність, достаток, затишок', ru: 'Забота, практичность, достаток, уют', en: 'Nurturing, practicality, abundance, comfort' },
    reversed: { ua: 'Самозневага, дисбаланс роботи й дому, тривога', ru: 'Самопренебрежение, дисбаланс работы и дома, тревога', en: 'Self-neglect, work-home imbalance, worry' },
    description: { ua: 'Королева Пентаклів — тепла господиня достатку. Вона дбає про близьких і створює затишок.', ru: 'Королева Пентаклей — тёплая хозяйка достатка. Она заботится о близких и создаёт уют.', en: 'The Queen of Pentacles is a warm provider who nurtures loved ones and creates comfort.' }
  },
  {
    id: 77, name: 'King of Pentacles', nameUa: 'Король Пентаклів', nameRu: 'Король Пентаклей',
    emoji: '🪙', image: '/assets/cards/pents_14.jpg',
    upright: { ua: 'Багатство, успіх, лідерство, надійність', ru: 'Богатство, успех, лидерство, надёжность', en: 'Wealth, success, leadership, reliability' },
    reversed: { ua: 'Жадібність, матеріалізм, упертість', ru: 'Жадность, материализм, упрямство', en: 'Greed, materialism, stubbornness' },
    description: { ua: 'Король Пентаклів — майстер матеріального світу. Достаток і стабільність — плід його мудрості.', ru: 'Король Пентаклей — мастер материального мира. Достаток и стабильность — плод его мудрости.', en: 'The King of Pentacles masters the material world; abundance and stability are the fruit of his wisdom.' }
  }
];

module.exports = { MAJOR_ARCANA };
