'use strict';
const express = require('express');
const router  = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/ai/interpret — персональна AI-інтерпретація розкладу
router.post('/interpret', async (req, res) => {
  try {
    const { cards, positions, spreadName, question, userAstro, lang } = req.body;
    if (!cards || !cards.length) return res.status(400).json({ ok: false, error: 'cards required' });

    const l = lang || 'ru';

    const cardList = cards.map((c, i) => {
      const pos = positions?.[i] ? (l === 'ua' ? positions[i].ua : positions[i].ru) || positions[i] : '';
      const name = l === 'ua' ? (c.nameUa || c.name) : (c.nameRu || c.name);
      const meaning = c.isReversed
        ? (c.reversed?.[l] || c.reversed?.ru || c.reversed?.en || '')
        : (c.upright?.[l] || c.upright?.ru || c.upright?.en || '');
      return `${pos ? pos + ': ' : ''}${name}${c.isReversed ? ' (перевёрнута)' : ''} — ${meaning}`;
    }).join('\n');

    const astroInfo = userAstro ? [
      `Знак: ${userAstro.zodiac?.name}`,
      `Жизненный путь: ${userAstro.lifePath}`,
      `Личный год: ${userAstro.personalYear}`,
      `Фаза луны: ${userAstro.moonPhase?.name}`,
    ].join(', ') : '';

    const userQuestion = question?.trim() || '';

    const systemPrompt = l === 'ua'
      ? `Ти — мудрий таро-майстер з 30-річним досвідом. Даєш глибокі, персональні інтерпретації, які резонують з людиною. Говори тепло, містично, але конкретно та практично. Звертайся на "ти". Не більше 180 слів.`
      : `Ты — мудрый мастер Таро с 30-летним опытом. Даёшь глубокие, персональные интерпретации, которые резонируют с человеком. Говори тепло, мистично, но конкретно и практично. Обращайся на "ты". Не более 180 слов.`;

    const parts = [
      `Расклад: ${typeof spreadName === 'object' ? (spreadName.ru || spreadName.ua || spreadName.en || 'Расклад') : spreadName}`,
    ];
    if (astroInfo) parts.push(`Астрология: ${astroInfo}`);
    if (userQuestion) parts.push(`Вопрос: ${userQuestion}`);
    parts.push(`\nКарты:\n${cardList}`);
    parts.push(`\nДай глубокое персональное толкование${userQuestion ? ' в контексте этого вопроса' : ''}. Сначала общий посыл, затем главный совет.`);

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: parts.join('\n') }],
    });

    const finalMsg = await stream.finalMessage();
    const text = finalMsg.content.find(b => b.type === 'text')?.text || '';
    res.json({ ok: true, interpretation: text });
  } catch (e) {
    console.error('[AI] interpret error:', e.message);
    res.status(500).json({ ok: false, error: 'ai_error' });
  }
});

module.exports = router;
