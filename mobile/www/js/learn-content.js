// ══ Курс «Вчимося Таро» — для тих, хто працює з власною фізичною колодою ═══
// Кожен урок: іконка (ключ з art.js icons), хвилини, заголовок, секції (h — підзаголовок, p — текст), практика.
// cards — id карт для ілюстрації (зображення з колоди).

export const LESSONS = [
  {
    id: 'what', icon: 'crystal', minutes: 4, cards: [0, 21],
    title: { en: 'What tarot is (and isn’t)' },
    sections: [
      { h: { en: 'A mirror, not a verdict' },
        p: { en: 'Tarot is a deck of 78 picture cards. Each image is a story about a common human situation — beginnings, love, conflict, loss, success. When you draw a card, you look at your own life through that story. The cards don’t decide your future; they help you notice what you already feel and think.' } },
      { h: { en: 'Why it works' },
        p: { en: 'A random card interrupts your usual thinking. You compare its picture with your situation, and new questions appear: “Where am I carrying too much?” or “What am I ready to start?” That reflection is the real value of a reading.' } },
      { h: { en: 'What you need' },
        p: { en: 'Any 78-card deck works. The classic Rider-Waite deck (the one in this app) is the best for learning — most books and courses use its images. Add a notebook for your readings, and that’s it.' } },
    ],
    practice: { en: 'Take your deck, look through all 78 cards without reading anything. Notice which three images attract you most.' },
  },
  {
    id: 'deck', icon: 'cards', minutes: 6, cards: [1, 22, 36, 50, 64],
    title: { en: 'Your deck: Major & Minor Arcana' },
    sections: [
      { h: { en: '22 Major Arcana — the big themes' },
        p: { en: 'Cards numbered 0–21, from The Fool to The World. They describe major life lessons and turning points. Read in order, they tell “the Fool’s journey” — a path from innocence to wholeness. Many Majors in a reading mean the situation is important.' } },
      { h: { en: '56 Minor Arcana — everyday life' },
        p: { en: 'Four suits of 14 cards. Wands = fire: energy, ambition, creativity. Cups = water: emotions, love, relationships. Swords = air: thoughts, conflict, truth. Pentacles = earth: money, work, body, home.' } },
      { h: { en: 'Numbers tell the stage' },
        p: { en: 'Ace — a seed, a new start. 2 — choice, balance. 3 — growth, teamwork. 4 — stability. 5 — conflict, change. 6 — harmony. 7 — reflection, testing. 8 — movement, mastery. 9 — almost there. 10 — completion. So the Five of Cups is “emotional loss,” and the Ten of Pentacles is “material fulfillment.”' } },
      { h: { en: 'Court cards are people or roles' },
        p: { en: 'Page — a student, a message, curiosity. Knight — action, movement, sometimes haste. Queen — inner mastery, care. King — outer authority, control. They can be another person or a side of you.' } },
    ],
    practice: { en: 'Sort your deck into five piles: Majors, Wands, Cups, Swords, Pentacles. Put each suit in order from Ace to King.' },
  },
  {
    id: 'connect', icon: 'eye', minutes: 4, cards: [17],
    title: { en: 'Getting to know your cards' },
    sections: [
      { h: { en: 'Look before you read' },
        p: { en: 'Before memorizing meanings, describe the picture in your own words: Who is there? What are they doing? What is the weather, the color, the mood? Your description is often closer to the meaning than you think.' } },
      { h: { en: 'Shuffling' },
        p: { en: 'Use any method that feels good: overhand shuffle, riffle (gently, the cards are paper), or spread them face-down on the table and swirl. Shuffle while thinking about your question. Stop when it feels right.' } },
      { h: { en: 'Keep a tarot journal' },
        p: { en: 'Write the date, your question, the cards and your first impression. After a week you’ll see patterns — and your own personal meanings will start to form.' } },
    ],
    practice: { en: 'Pick one card face-up and write five words about its picture before opening its meaning in the Cards tab.' },
  },
  {
    id: 'questions', icon: 'yesno', minutes: 3, cards: [2],
    title: { en: 'Asking good questions' },
    sections: [
      { h: { en: 'Open questions get better answers' },
        p: { en: 'Instead of “Will he come back?” ask “What do I need to understand about this relationship?” Instead of “Will I get the job?” ask “How can I put my best foot forward in the interview?” Questions starting with How, What and Why give the cards room to speak.' } },
      { h: { en: 'Focus on you' },
        p: { en: 'You can’t control other people, so ask about your part: your feelings, choices and next step. Avoid questions about health, death or legal outcomes — tarot is for reflection, not diagnosis.' } },
    ],
    practice: { en: 'Rewrite three yes/no questions you have into open “How” or “What” questions.' },
  },
  {
    id: 'daily', icon: 'today', minutes: 3, cards: [19],
    title: { en: 'Your first habit: one card a day' },
    sections: [
      { h: { en: 'The 5-minute ritual' },
        p: { en: 'In the morning: breathe, shuffle, ask “What do I need to know today?” and draw one card. Look at the picture, read its keywords, write one sentence about how it could show up today.' } },
      { h: { en: 'Check in the evening' },
        p: { en: 'Before bed, reread your note: where did the card appear? This is the fastest way to learn — after 78 days you’ll have lived through the whole deck.' } },
    ],
    practice: { en: 'Draw a card from your deck, then enter it in “Read my deck” to compare your impression with the meaning.' },
  },
  {
    id: 'three', icon: 'spreads', minutes: 5, cards: [6, 7, 10],
    title: { en: 'Three-card spreads' },
    sections: [
      { h: { en: 'Classic layouts' },
        p: { en: 'Past · Present · Future. Situation · Obstacle · Advice. You · The other person · The relationship. Lay the cards left to right and decide the positions before you look.' } },
      { h: { en: 'Read it as a story' },
        p: { en: 'Don’t read three separate meanings — connect them. Do the figures look at each other or away? Does the mood rise or fall from left to right? Which suit dominates? One sentence that links all three cards is your answer.' } },
    ],
    practice: { en: 'Do a Situation · Obstacle · Advice spread with your deck and write one sentence that connects all three cards.' },
  },
  {
    id: 'reversed', icon: 'swap', minutes: 3, cards: [16],
    title: { en: 'Reversed cards' },
    sections: [
      { h: { en: 'Blocked, inner or delayed energy' },
        p: { en: 'A card that lands upside down isn’t simply “bad.” Usually its energy is blocked (the Sun reversed: joy you don’t let yourself feel), turned inward, or not ready yet. Sometimes it softens a hard card: the Tower reversed can mean avoiding a collapse.' } },
      { h: { en: 'Use them — or not' },
        p: { en: 'Many readers skip reversals while learning. It’s your choice: just decide before shuffling and stay consistent.' } },
    ],
    practice: { en: 'Turn three cards upside down on purpose and describe how their energy feels blocked or inward.' },
  },
  {
    id: 'patterns', icon: 'grid', minutes: 5, cards: [10, 20],
    title: { en: 'Reading patterns like a pro' },
    sections: [
      { h: { en: 'Look at the whole spread first' },
        p: { en: 'Before single cards, scan the spread: many Majors — a turning point. Mostly one suit — the area of life in focus. Many court cards — other people are involved. Repeating numbers — a theme (three 5s: a period of change).' } },
      { h: { en: 'Trust your first impression' },
        p: { en: 'Books give the base meaning, but your intuition adds context. If a detail in the picture catches your eye — a cliff, a child, a closed door — include it. That’s how readers develop their own voice.' } },
    ],
    practice: { en: 'Lay out five cards and, before reading any meaning, name the dominant suit, number and mood.' },
  },

  // ── Рівень 2 · Глибше ──────────────────────────────────────────────────────
  {
    id: 'journey1', level: 2, icon: 'sprout', minutes: 6, cards: [0, 1, 2, 3, 4, 5, 6, 7],
    title: { en: 'The Fool’s Journey I: setting out (0–7)' },
    sections: [
      { h: { en: 'One story, 22 chapters' },
        p: { en: 'The Major Arcana read like a novel. The Fool (0) is the hero — you — stepping into the unknown with an open heart. Each next card is someone the Fool meets or a lesson the Fool learns. When a Major appears in your reading, ask: which chapter of my story am I living right now?' } },
      { h: { en: 'The first teachers (1–5)' },
        p: { en: 'The Magician (1) shows that you already have the tools: will and skill. The High Priestess (2) teaches inner knowing and patience. The Empress (3) is abundance, care and creativity; the Emperor (4) is structure, rules and protection. The Hierophant (5) brings tradition, teachers and shared values. Together they are the parents and mentors who shape the Fool.' } },
      { h: { en: 'First choices (6–7)' },
        p: { en: 'The Lovers (6) is the first real choice — not only romance, but choosing what you value. The Chariot (7) is the Fool’s first victory: willpower that pulls opposing forces in one direction. In a reading, cards 0–7 often point to a beginning, learning a new role, or a decision that sets the course.' } },
    ],
    practice: { en: 'Lay out cards 0–7 in a row. Tell the Fool’s story out loud in eight sentences, one per card.' },
  },
  {
    id: 'journey2', level: 2, icon: 'clock', minutes: 6, cards: [8, 9, 10, 11, 12, 13, 14],
    title: { en: 'The Fool’s Journey II: looking inward (8–14)' },
    sections: [
      { h: { en: 'Strength and solitude (8–9)' },
        p: { en: 'After outer victories, the Fool turns inward. Strength (8) is gentle courage: taming fear with patience instead of force. The Hermit (9) steps away from the crowd to find his own light. In a reading they suggest: slow down, trust yourself, and look for answers within.' } },
      { h: { en: 'Fate and fairness (10–11)' },
        p: { en: 'The Wheel of Fortune (10) reminds you that life moves in cycles: what goes down comes back up. Justice (11) adds responsibility — cause and effect, honest decisions, consequences. Together they say: you can’t control every turn of the wheel, but you can choose how you act.' } },
      { h: { en: 'Letting go (12–14)' },
        p: { en: 'The Hanged Man (12) sees the world upside down — a pause that brings a new perspective. Death (13) is rarely literal: it’s an ending that makes room for something new. Temperance (14) heals and blends opposites into balance. This part of the journey is about surrender, transformation and finding the middle way.' } },
    ],
    practice: { en: 'Shuffle cards 8–14, draw one for yourself and write: what is this card asking me to accept or let go of?' },
  },
  {
    id: 'journey3', level: 2, icon: 'crystal', minutes: 6, cards: [15, 16, 17, 18, 19, 20, 21],
    title: { en: 'The Fool’s Journey III: into the light (15–21)' },
    sections: [
      { h: { en: 'Shadow and shock (15–16)' },
        p: { en: 'The Devil (15) shows what binds you — habits, fears, unhealthy attachments. Look closely: the chains on the card are loose. The Tower (16) is a sudden shake-up that destroys false structures. It feels scary, but it clears the ground for the truth.' } },
      { h: { en: 'Healing lights (17–19)' },
        p: { en: 'After the storm comes the Star (17): hope, healing and quiet faith. The Moon (18) walks you through confusion, dreams and intuition — not everything is clear yet. The Sun (19) is joy, success and clarity, one of the happiest cards in the deck.' } },
      { h: { en: 'Awakening and wholeness (20–21)' },
        p: { en: 'Judgement (20) is a wake-up call: you see your path clearly and answer it. The World (21) completes the journey — fulfillment, integration, a circle closed. Then the Fool sets out again, wiser, into a new cycle. In a reading, 20 and 21 mean a chapter is ending well.' } },
    ],
    practice: { en: 'Find the Major Arcana card that best describes your life this year. Write why — and which card you think comes next.' },
  },
  {
    id: 'wands', level: 2, icon: 'flame', minutes: 5, cards: [22, 24, 28, 31],
    title: { en: 'Wands: fire, drive and passion' },
    sections: [
      { h: { en: 'The energy of fire' },
        p: { en: 'Wands are living branches — growth, ambition, creativity and desire. They answer questions about projects, career moves, inspiration and passion. Many Wands in a reading: things are moving fast, so act while the fire is hot.' } },
      { h: { en: 'Key cards' },
        p: { en: 'Ace of Wands — a spark: a new idea or a burst of motivation. Three of Wands — looking ahead, expansion, plans bearing fruit. Seven of Wands — standing your ground under pressure. Ten of Wands — carrying too much: delegate or put something down.' } },
      { h: { en: 'When the fire burns too hot' },
        p: { en: 'The shadow side of Wands is burnout, impatience and starting ten things without finishing one. Reversed Wands often mean delays or energy turned against yourself. Ask: where do I need to focus my fire?' } },
    ],
    practice: { en: 'Lay out the Wands from Ace to Ten. Describe how the fire changes along the way: spark, flame, struggle, burden.' },
  },
  {
    id: 'cups', level: 2, icon: 'lotus', minutes: 5, cards: [36, 37, 40, 45],
    title: { en: 'Cups: feelings, love and intuition' },
    sections: [
      { h: { en: 'The language of water' },
        p: { en: 'Cups hold emotions: love, friendship, joy, grief, dreams and intuition. They are the main suit for relationship questions. Many Cups in a reading mean the heart is in charge — feelings matter more than logic right now.' } },
      { h: { en: 'Key cards' },
        p: { en: 'Ace of Cups — an overflowing heart: new love or emotional renewal. Two of Cups — mutual attraction, partnership, a meaningful bond. Five of Cups — grief over what was lost, while two cups still stand behind you. Ten of Cups — family happiness and emotional fulfillment.' } },
      { h: { en: 'When the water overflows' },
        p: { en: 'The shadow of Cups is living in fantasy, emotional dependence or drowning in moods. Reversed Cups can point to blocked feelings or love you don’t let in. Ask: what am I really feeling — and what do I need?' } },
    ],
    practice: { en: 'Shuffle only the Cups and draw one card about a relationship that matters to you. Write what it says about the feelings on both sides.' },
  },
  {
    id: 'swords', level: 2, icon: 'eye', minutes: 5, cards: [50, 52, 58, 59],
    title: { en: 'Swords: mind, truth and conflict' },
    sections: [
      { h: { en: 'The sharp edge of air' },
        p: { en: 'Swords are thoughts, words and decisions. A sword can cut through confusion to the truth — or cut deeply. This suit speaks about communication, stress, conflict and clarity. Many Swords: your mind is busy, and words matter.' } },
      { h: { en: 'Key cards' },
        p: { en: 'Ace of Swords — a breakthrough idea, a clear truth. Three of Swords — heartbreak or painful words; it hurts, and it heals. Nine of Swords — sleepless worry: often the fear is bigger than reality. Ten of Swords — rock bottom and an ending; on the card, the sun is already rising.' } },
      { h: { en: 'Read them with care' },
        p: { en: 'Swords look scary, but they are honest helpers. They show where your thinking hurts you and where a clear conversation is needed. When reading for others, phrase Swords gently: name the challenge, then the way through.' } },
    ],
    practice: { en: 'Pick the Swords card that looks most like your biggest worry right now. Then find a card in the deck that answers it.' },
  },
  {
    id: 'pentacles', level: 2, icon: 'coin', minutes: 5, cards: [64, 67, 71, 73],
    title: { en: 'Pentacles: money, work and the body' },
    sections: [
      { h: { en: 'The solid ground of earth' },
        p: { en: 'Pentacles are coins with a star — the material world: money, work, home, health and the results of patient effort. This is the slowest suit: things grow like a garden, not overnight. Many Pentacles: practical matters are in focus.' } },
      { h: { en: 'Key cards' },
        p: { en: 'Ace of Pentacles — a new opportunity for income or stability. Four of Pentacles — holding on tight: security, but also fear of loss. Eight of Pentacles — mastering a skill through steady work. Ten of Pentacles — lasting wealth, family and legacy.' } },
      { h: { en: 'Grounded, not stuck' },
        p: { en: 'The shadow of Pentacles is greed, workaholism or fear of change. Reversed Pentacles can mean money worries or neglecting your body. Ask: what small, steady step would make me feel more secure?' } },
    ],
    practice: { en: 'Shuffle only the Pentacles and draw one card: “What will help my finances this month?” Write down one concrete action.' },
  },
  {
    id: 'courts', level: 2, icon: 'crown', minutes: 5, cards: [46, 33, 76, 63],
    title: { en: 'Court cards decoded' },
    sections: [
      { h: { en: 'Rank + suit = personality' },
        p: { en: 'Each court card mixes its rank with its suit’s element. Page — learning and curiosity. Knight — action and movement. Queen — mature, inward mastery. King — outward leadership. So the Queen of Cups is emotional wisdom, while the King of Pentacles is a successful provider.' } },
      { h: { en: 'Who is it?' },
        p: { en: 'A court card can be another person, a side of you, or the style of action the situation needs. Ask three questions: Do I know someone like this? Am I acting like this? Should I act like this? The first answer that feels true is usually right.' } },
      { h: { en: 'Pages bring news, Knights set the pace' },
        p: { en: 'Pages often mean news: an invitation (Wands), a message from the heart (Cups), information or gossip (Swords), an offer or a chance to study (Pentacles). Knights show how fast things move: the Knight of Wands rushes, the Knight of Pentacles takes his time.' } },
    ],
    practice: { en: 'Take the 16 court cards and match each one to someone you know. Notice which ones remind you of yourself.' },
  },
  {
    id: 'elements', level: 2, icon: 'swap', minutes: 5, cards: [22, 36, 50, 64],
    title: { en: 'Elements: how cards help or clash' },
    sections: [
      { h: { en: 'Four elements' },
        p: { en: 'Wands are fire, Cups are water, Swords are air, Pentacles are earth. The Major Arcana have elements too, through astrology: the Emperor is fire (Aries), the Moon is water (Pisces), Justice is air (Libra), the Hermit is earth (Virgo).' } },
      { h: { en: 'Friends and rivals' },
        p: { en: 'Fire and air feed each other; water and earth support each other. Fire and water clash, and so do air and earth. When neighboring cards are friendly, their energy grows stronger. When they clash, there is tension to resolve — a passionate Wand next to a tender Cup can mean desire versus feelings.' } },
      { h: { en: 'A missing element speaks too' },
        p: { en: 'In a five-card spread, notice which element is missing. No Pentacles in a money question? The practical side is being ignored. No Cups in a love question? The heart may be closed. What’s absent can be the real advice.' } },
    ],
    practice: { en: 'Lay out three cards and mark each one’s element. Are the neighbors friends or rivals? Write how that changes the story.' },
  },
  {
    id: 'love', level: 2, icon: 'heart', minutes: 5, cards: [6, 37, 45, 52],
    title: { en: 'Reading for love' },
    sections: [
      { h: { en: 'Cards that speak about the heart' },
        p: { en: 'The Lovers — a deep connection and a choice of the heart. Two of Cups — mutual feelings. Ten of Cups — a happy future together. Three of Swords — hurt that needs healing. Knight of Cups — romance and an invitation. As a rule, Cups and the Lovers bring warmth, while Swords bring tension.' } },
      { h: { en: 'Asking about someone else' },
        p: { en: 'People often ask, “What does he think of me?” Tarot can reflect the energy between you, but it can’t read minds or control anyone. Turn the question toward the relationship and your choices: “What can I do to build trust?” is a question the cards answer well.' } },
      { h: { en: 'A simple love spread' },
        p: { en: 'Three cards: You · Them · What connects you. Read the first two side by side: do the figures face each other? Are their suits the same element? The third card is the bridge — or the wall — between you.' } },
    ],
    practice: { en: 'Do the You · Them · Connection spread for a relationship in your life. Then try “Do They Really Love Me?” in the Spreads tab and compare.' },
  },
  {
    id: 'money', level: 2, icon: 'briefcase', minutes: 5, cards: [64, 71, 68, 10],
    title: { en: 'Reading for money and career' },
    sections: [
      { h: { en: 'Money cards' },
        p: { en: 'Ace of Pentacles — a new source of income. Eight of Pentacles — a skill that will pay off. Five of Pentacles — a tight period; help is closer than it seems. Wheel of Fortune — luck is turning. The Sun and the Ten of Pentacles — success and abundance.' } },
      { h: { en: 'Career by suit' },
        p: { en: 'Wands — starting, leading, selling, creative work. Pentacles — steady jobs, finance, building something that lasts. Swords — negotiation, strategy, tough decisions. Cups — teamwork, helping professions, doing what you love. The dominant suit shows where your career energy wants to go.' } },
      { h: { en: 'Ask about actions, not amounts' },
        p: { en: 'Tarot won’t give you lottery numbers or stock tips — and it isn’t financial advice. Ask instead: “What should I focus on to grow my income?” or “What is holding my career back?” Then turn the answer into one real step.' } },
    ],
    practice: { en: 'Try the Money Flow spread in the Spreads tab, then write down one action for this week based on the advice card.' },
  },
  {
    id: 'moon', level: 2, icon: 'crescent', minutes: 4, cards: [2, 18, 17],
    title: { en: 'Tarot and the Moon' },
    sections: [
      { h: { en: 'Read with the lunar cycle' },
        p: { en: 'The Moon’s cycle is a natural rhythm for readings. New Moon — set intentions and start. Waxing Moon — act and build. Full Moon — see results, release and celebrate. Waning Moon — rest, clear out and reflect. The Today screen shows the current phase.' } },
      { h: { en: 'Lunar cards' },
        p: { en: 'The High Priestess has a crescent at her feet — intuition and hidden knowledge. The Moon card is the night road: dreams, doubts, things not yet clear. The Star shines after the darkness — hope. When these cards appear, trust your feelings, but check the facts before big decisions.' } },
      { h: { en: 'A monthly ritual' },
        p: { en: 'On the New Moon, do the New Moon Intentions spread and write your intention down. On the Full Moon, do Full Moon Release and reread what you wrote. In a few months you’ll see your own cycles — the best tarot teacher there is.' } },
    ],
    practice: { en: 'Check the current Moon phase on the Today screen and choose the matching spread: intentions or release.' },
  },
];

// Тренажер тлумачення: питання, під які застосунок розкладає 3 карти
export const TRAINER_QUESTIONS = {
  en: ['What do I need to know about my love life right now?', 'How can I grow at work this year?', 'What is holding me back from moving forward?',
       'How can I improve my finances?', 'What should I focus on this month?', 'How can I heal after a breakup?',
       'Should I start a new project now?', 'How can I make my home life happier?'],
};

// Схеми для «Прочитати мою колоду»
export const DECK_SPREADS = [
  { id: 'one', count: 1, title: { en: 'One card' },
    positions: [{ en: 'Message' }] },
  { id: 'ppf', count: 3, title: { en: 'Past · Present · Future' },
    positions: [{ en: 'Past' }, { en: 'Present' }, { en: 'Future' }] },
  { id: 'soa', count: 3, title: { en: 'Situation · Obstacle · Advice' },
    positions: [{ en: 'Situation' }, { en: 'Obstacle' }, { en: 'Advice' }] },
  { id: 'love', count: 3, title: { en: 'You · Them · Relationship' },
    positions: [{ en: 'You' }, { en: 'Them' }, { en: 'Relationship' }] },
];
