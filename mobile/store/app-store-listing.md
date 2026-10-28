# Lucky Tarot (бывшая Lunara) — тексты для App Store Connect

Всё готово для копирования. Приложение только на английском (рынок — США): одна страница **English (U.S.)**, других локализаций нет.
(в App Store Connect: App Information → Localizable Information → добавить языки).
Лимиты Apple проверены: название и подзаголовок ≤ 30 символов, промо-текст ≤ 170, ключевые слова ≤ 100, описание ≤ 4000.

---

## 1. Общие поля

| Поле | Значение |
|---|---|
| Bundle ID | `com.luckytarot.app` (уже прописан в iOS-проекте; если Apple скажет, что занят, — `com.luckytarot.lovemoney`) |
| SKU | `luckytarot-ios-001` (любой уникальный внутренний код) |
| Primary category | **Lifestyle** |
| Secondary category | **Entertainment** |
| Price | Free (деньги — через подписки внутри приложения) |
| Copyright | `2026 <твоё имя, как в Apple ID>` |
| Privacy Policy URL | https://lunara-tarot.up.railway.app/app/legal/privacy.html |
| Terms of Use (EULA) | https://lunara-tarot.up.railway.app/app/legal/terms.html — вставить в конец описания (уже есть ниже) |
| Support URL | https://lunara-tarot.up.railway.app/app/legal/support.html |
| Marketing URL | можно оставить пустым |

---

## 2. English (U.S.) — основная страница

**App Name** (25/30)
```
Lucky Tarot: Love & Money
```
Если название занято: `Lucky Tarot: Love & Luck` или `Lucky Tarot: Daily Card`.

**Subtitle** (29/30)
```
Daily Tarot, Horoscope & Moon
```

**Promotional Text** (131/170) — меняется в любой момент без проверки Apple; обновляй под события неба
```
Mercury and Venus are retrograde until Nov 13. See what it means for your love life and plans — and pull your free card of the day.
```

**Keywords** (98/100) — слова из названия и подзаголовка Apple учитывает сама, их не повторяем
```
zodiac,psychic,oracle,retrograde,numerology,fortune,reading,cards,celtic,lunar,sign,astrology,luck
```

**Description**
```
Lucky Tarot is your personal guide to love, money and luck — through tarot, astrology and the Moon. Beautiful, simple and written just for you.

Start every morning with your Card of the Day, ask a quick yes-or-no question, or go deep with a full Celtic Cross. Every card comes with a clear explanation in plain English, plus the big picture of what your whole spread is telling you.

CARD OF THE DAY
• A new card every morning, with its meaning for love, work and money
• Daily advice and a yes-or-no hint
• Build your streak and see when your next card is ready

30+ TAROT SPREADS
• Yes or No — one card, a clear answer
• Love: Do They Really Love Me?, Will They Come Back?, Why the Silence?, Soulmate Connection and more
• Money & career: Money Flow, Abundance Star, Career Crossroads, Stay or Go?
• Moon rituals: New Moon Intentions and Full Moon Release
• Karma & destiny, self-discovery, family, travel and the Week Ahead
• Save your favorite spreads with one tap
• Past · Present · Future, Your Month Ahead and Your Year Ahead
• The legendary 10-card Celtic Cross
• All 78 Rider-Waite cards, upright and reversed

READINGS THAT MAKE SENSE
• Every card explained for its place in the spread
• The overall picture: the energy of the spread, how the cards connect and what stands out
• Key advice you can act on today

COSMIC WEATHER
• Is Mercury retrograde? See which planets are retrograde right now, how long it lasts and what to do — and avoid
• Eclipses, New Moons and Full Moons on your calendar
• Gentle alerts before big sky events

HOROSCOPE & MOON
• A fresh horoscope for your sign every day: love, career and well-being
• Lunar calendar with today's phase, the Moon's sign and what each phase is good for
• Your life path number, personal year and love compatibility

ASK THE ORACLE
• Chat with your personal AI Oracle about love, work and choices — day or night

LEARN TAROT
• A 20-lesson course in two levels: from your first card to the Fool’s Journey, the four suits, court cards, love and money readings
• Interpretation trainer: read three cards in your own words and get a score and feedback from an AI teacher
• Flashcards to memorize all 78 cards
• Read My Deck: pulled cards from your own deck? Enter them and get their meanings

YOUR READING JOURNAL
• Every reading is saved. Add notes and your mood, and mark what came true


LUCKY TAROT PRO
Unlock every spread, unlimited AI readings, the Oracle chat, reversed meanings, all lessons, custom card backs and every new feature.
• Weekly: $6.99 per week; new subscribers pay $2.79 for the first week
• Yearly: $39.99 per year
Prices are in US dollars and may vary by country.

Payment is charged to your Apple ID at confirmation of purchase. Your subscription renews automatically unless it is canceled at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the end of the current period. You can manage or cancel your subscription in your App Store account settings.

Terms of Use: https://lunara-tarot.up.railway.app/app/legal/terms.html
Privacy Policy: https://lunara-tarot.up.railway.app/app/legal/privacy.html

Lucky Tarot is for entertainment and self-reflection. It does not replace professional medical, legal or financial advice.
```

---

## 3. Подписки (In-App Purchases → Subscriptions)

**Subscription Group:** `Lucky Tarot PRO`

| | Weekly | Yearly |
|---|---|---|
| Product ID | `luckytarot_pro_weekly` | `luckytarot_pro_yearly` |
| Reference Name | PRO Weekly | PRO Yearly |
| Duration | 1 week | 1 year |
| Price | $6.99 | $39.99 |
| Introductory offer | Pay as you go: $2.79 за 1 неделю, 1 период (только новые подписчики). Если цены $2.79 нет в списке — ближайшая к ней | — |
| Display Name | Lucky Tarot PRO Weekly | Lucky Tarot PRO Yearly |
| Description (≤45) | Every spread, AI readings and the Oracle | Every spread, AI readings and the Oracle |

Product ID должны совпадать именно так — они уже прописаны в приложении (`mobile/www/js/config.js`).
Для проверки Apple к каждой подписке нужен скриншот экрана подписки из приложения — могу снять его в симуляторе.

---

## 4. App Privacy (анкета «что собирает приложение»)

Tracking: **No** — данные не используются для слежки за пользователем и не продаются.

| Тип данных | Что именно | Связано с пользователем | Цель |
|---|---|---|---|
| Contact Info → Name | Имя из знакомства | Да | App Functionality |
| User Content → Other User Content | Вопросы к раскладам, заметки дневника, чат с Оракулом | Да | App Functionality |
| Identifiers → User ID | Анонимный ID аккаунта | Да | App Functionality |
| Purchases → Purchase History | Статус подписки (через RevenueCat) | Да | App Functionality |
| Usage Data → Product Interaction | Какие экраны и функции открываются | Да | Analytics |
| Other Data | Дата рождения (для знака и нумерологии) | Да | App Functionality |

---

## 5. Age Rating

В анкете отвечаем честно: насилия, азартных игр и т. п. нет. Так как в самом приложении указано «18+»,
рекомендую выбрать возрастной рейтинг **18+** — это совпадает с условиями и снимает вопросы по ИИ-чату.

---

## 6. Заметки для проверяющего Apple (App Review Information → Notes)

```
What makes Lucky Tarot different from a typical tarot app:
- The Oracle: a conversational AI reader that answers the user's own questions with their zodiac sign in mind and keeps the conversation history on the device.
- Cosmic Weather: exact astronomical dates of Mercury, Venus and Mars retrogrades and of solar and lunar eclipses (calculated in advance for 2026–2030). Active events are shown at the top of the Today screen, noted in readings, woven into the daily horoscope and marked in the Moon calendar; optional local notifications announce them.
- A daily ritual in one place: Card of the Day, a horoscope and the Moon phase, personalized with the user's zodiac sign, chosen focus and today's sky.
- Learning, not just readings: a 20-lesson course and an interpretation trainer where an AI teacher scores the user’s own reading of three cards.
- More than 30 spreads organized by topic (love, money and career, Moon rituals, karma, family, travel), with a picture of each layout and bookmarks.
- A reading journal: every spread is saved with notes, mood and a "came true" mark, so users can look back at what actually happened.
- Native experience: local notifications, haptics, sharing, and in-app purchases through StoreKit. All screens and content are bundled in the app; it is not a website wrapper.

Lucky Tarot does not require a login. On first launch the app creates an anonymous account on our server, and onboarding asks for a first name and birth date (used only for the zodiac sign and numerology).

Subscriptions (Lucky Tarot PRO, weekly with a discounted first week ($2.79) for new subscribers, and yearly) are sold through StoreKit and validated with RevenueCat. The paywall appears after onboarding and after the first reading; it can also be opened from Profile.

AI features (the Oracle chat and personal AI readings) are generated by Anthropic Claude on our server. Card meanings, horoscopes and all spreads also work without AI.

Lucky Tarot is for entertainment and self-reflection only and does not give medical, legal or financial advice.
```
Contact Information: твоё имя, телефон и рабочая почта (проверяющий может написать).

---

## 7. Перед отправкой на проверку — обязательно

- [x] **Почта поддержки:** tarotsupports@gmail.com — вписана в приложение (Профиль → «Написать в поддержку»), на страницу поддержки, в terms и privacy.
- [x] **Support URL.** Страница поддержки готова: `https://lunara-tarot.up.railway.app/app/legal/support.html` (English), почта вписана.
- [ ] **Условия и политика конфиденциальности — сейчас шаблоны.** На страницах `terms.html` и `privacy.html` стоят пустые поля [DATE], [COMPANY NAME], [ADDRESS], [JURISDICTION] и пометка «Template». Почта уже вписана. Нужны: имя продавца (как в Apple Developer) и страна — я заполню.
- [ ] **Ключ Claude (ANTHROPIC_API_KEY) на Railway.** Без него Оракул и ИИ-толкования выдают ошибку — проверяющий Apple это увидит и отклонит приложение.
- [ ] **Выключить бесплатный PRO** (`LUNARA_FREE_PRO`) хотя бы для iOS — иначе пейвол не показывается и проверяющий не сможет протестировать покупку.
- [ ] **Проверить, свободно ли название** «Lucky Tarot: Love & Money» при создании приложения в App Store Connect (поиск 27.10.2026 точных совпадений не нашёл; запасные варианты — выше). Адрес сайта пользователи почти не видят — его пока не меняем.
- [ ] Скриншоты: `mobile/store/screenshots/` (7 шт., 6.9", 1320×2868) — загрузить в раздел iPhone 6.9".
