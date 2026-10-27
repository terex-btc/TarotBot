# Lunara — застосунок для App Store

Один код (`mobile/www`) працює в трьох місцях:

| Де | Як відкривається | Вхід | Оплата |
|---|---|---|---|
| iOS / Android | Capacitor-обгортка | анонімний акаунт на пристрій (`X-App-Auth`) | App Store / Google Play через RevenueCat |
| Telegram | `https://lunara-tarot.up.railway.app/app/` як Mini App | Telegram initData (той самий акаунт, що й у боті) | немає — показується «скоро в App Store» |
| Браузер | `https://lunara-tarot.up.railway.app/app/` | анонімний акаунт | немає |

Мова за замовчуванням — англійська; російська/українська вмикаються за мовою пристрою або в «Я → Language».

## Локальний перегляд (без бота й бази)

```bash
node mobile/dev/mock-server.js
```
Відкрити http://localhost:4173/app/ (краще у мобільному розмірі вікна).
- Увімкнути/вимкнути PRO: http://localhost:4173/mock/premium?on=1 / `?on=0`
- Показати онбординг ще раз: додати `?onb=1` до адреси.

## Показати в Telegram (демо)

1. Задеплоїти гілку на Railway (сервер віддає застосунок на `/app/`).
2. У @BotFather: `/newapp` → вибрати бота → URL `https://lunara-tarot.up.railway.app/app/` → коротка назва, напр. `lunara`.
3. Посилання на демо: `https://t.me/<бот>/lunara`. Щоб показати онбординг людині, яка вже є в боті: `https://t.me/<бот>/lunara?startapp=onb`.
4. Щоб друг бачив PRO-функції: видати йому преміум в адмінці (`/admin` → «Выдать 👑» за його Telegram ID).

## Збірка iOS

Потрібно: Mac з **Xcode** (App Store, ~15 ГБ), Apple Developer Program ($99/рік).

```bash
cd mobile
npm install
npm run ios:add      # один раз: створює mobile/ios
npm run icons        # іконки й splash з resources/icon.png
npm run ios:sync     # після кожної зміни у www
npm run ios:open     # відкрити в Xcode → вибрати симулятор → Run
```

## Підписки (RevenueCat)

1. **App Store Connect** → створити застосунок з Bundle ID `com.luckytarot.app` (або свій — тоді змінити в `capacitor.config.json`).
2. Subscriptions → група «Lunara PRO» → два продукти:
   - `luckytarot_pro_weekly` — тиждень, intro offer: 3 дні безкоштовно;
   - `luckytarot_pro_yearly` — рік.
3. **RevenueCat** → проєкт → iOS app → підключити App Store Connect (In-App Purchase Key).
   - Entitlement `pro`, Offering `default` з обома продуктами.
   - Скопіювати публічний iOS-ключ (`appl_...`) у `www/js/config.js` → `REVENUECAT_IOS_KEY`.
   - Integrations → Webhooks → URL `https://<railway>/api/app/revenuecat`, Authorization — довгий випадковий рядок.
4. **Railway → Variables**:
   - `APP_AUTH_SECRET` — довгий випадковий рядок (підпис токенів застосунку);
   - `REVENUECAT_WEBHOOK_AUTH` — той самий рядок, що в RevenueCat webhook;
   - `REVENUECAT_SECRET_KEY` — секретний ключ RevenueCat (`sk_...`), для миттєвої звірки після покупки;
   - `ANTHROPIC_API_KEY` — вже є (AI-тлумачення, Оракул, гороскоп).

## Перед подачею в App Store

- [ ] Заповнити `www/legal/terms.html` і `privacy.html` (назва компанії, адреса, дата) і дати юристу.
- [ ] Перевірити, що назва «Lunara» вільна в App Store, або змінити `APP_NAME` / `appName`.
- [x] Свій e-mail підтримки в `config.js` → `SUPPORT_EMAIL` (tarotsupports@gmail.com).
- [ ] Іконка: зараз векторна заглушка `resources/icon.svg` — краще замовити фінальну.
- [ ] App Privacy в App Store Connect: Name, Date of birth (не для трекінгу), User Content, Purchases, Identifiers (device ID), Usage Data.
- [ ] Age rating: 17+ (гадання/астрологія, AI-чат). У застосунку вже є 18+ на даті народження.
- [ ] Скріншоти 6.7" і 6.5", опис, ключові слова, Privacy/Terms URL: `https://<railway>/app/legal/privacy.html`, `.../terms.html`.
- [ ] Протестувати покупку в Sandbox (Xcode → StoreKit або TestFlight).

## Структура

```
mobile/
  www/                 веб-код застосунку (без збирача, ES-модулі)
    js/config.js       усе, що міняється перед релізом
    js/platform.js     Capacitor / Telegram / браузер: сховище, вібро, share, покупки, сповіщення
    js/api.js          запити до сервера + сесія (X-App-Auth або X-Tg-Auth)
    js/i18n.js         тексти EN / RU / UA
    js/astro.js        знак, Місяць (фаза, знак), нумерологія, сумісність — на пристрої
    js/art.js          SVG-ілюстрації та іконки
    js/screens/*       екрани: onboarding, today, spreads, oracle, library, me, paywall
    legal/             Terms / Privacy
  dev/mock-server.js   локальний сервер з тестовими даними
  resources/icon.svg   іконка (джерело)
  capacitor.config.json
```
