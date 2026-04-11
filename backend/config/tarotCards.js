'use strict';

// 22 Старших Аркани Таро
const MAJOR_ARCANA = [
  {
    id: 0, name: 'The Fool', nameUa: 'Блазень', nameRu: 'Шут',
    emoji: '🃏',
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
      ru: 'Иерофант является посредником между divine и земным. Он символизирует духовное обучение и соблюдение традиций.',
      en: 'The Hierophant is a mediator between the divine and earthly. He symbolizes spiritual learning and adherence to traditions.'
    }
  },
  {
    id: 6, name: 'The Lovers', nameUa: 'Закохані', nameRu: 'Влюблённые',
    emoji: '❤️',
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
    upright: {
      ua: 'Пауза, здача, нова перспектива, жертва',
      ru: 'Пауза, сдача, новая перспектива, жертва',
      en: 'Pause, surrender, new perspective, sacrifice'
    },
    reversed: {
      ua: 'Затримка, опір, марний жертва',
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
  }
];

module.exports = { MAJOR_ARCANA };
