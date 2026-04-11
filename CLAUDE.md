# CLAUDE.md — Tarot Bot

## Огляд проекту

Tarot Bot — Telegram Mini App для гадання на картах Таро. Підтримує 22 карти Старшого Аркана, кілька типів розкладів (карта дня, 3 карти, любов, кельтський хрест), збереження історії розкладів та мультимовність (UA/RU/EN).

## Команди

```bash
# Встановити залежності
npm install

# Розробка (автоперезавантаження)
npm run dev

# Продакшен
npm start
```

## Архітектура

### Бекенд (Node.js CommonJS, Express v5)

**Точка входу:** `backend/server.js` — запускає HTTP-сервер та Telegram бота. Порт 3000.

**Маршрути** (`backend/routes/`):
- `cards.js` — GET /api/cards, GET /api/cards/:id, GET /api/cards/draw/random
- `readings.js` — GET/POST /api/readings/:userId, GET /api/readings/spreads
- `users.js` — POST /api/users/init, GET /api/users/:userId

**Сервіси** (`backend/services/`):
- `readingService.js` — логіка розкладів, збереження в JSON

**Конфіг** (`backend/config/`):
- `tarotCards.js` — 22 карти Старшого Аркана з описами UA/RU/EN

**Зберігання:** JSON-файли в `backend/storage/`
- `readings.json` — розклади по userId (до 50 на юзера)
- `users.json` — дані юзерів

### Фронтенд (Vanilla JS, ES6 модулі)

**Точка входу:** `frontend/index.html` + `frontend/app.js`

**Екрани:**
- `loading` — анімація завантаження
- `home` — головний: карта дня + кнопки розкладів
- `reading` — результат розкладу
- `card` — деталі карти
- `history` — історія розкладів юзера

**Мови:** UA (основна), RU, EN — визначаються автоматично з Telegram.

### Типи розкладів

| ID | Назва | Карт |
|---|---|---|
| `daily` | Карта дня | 1 (1 раз/добу) |
| `three_card` | Три карти | 3 |
| `love` | Любов | 3 |
| `celtic` | Кельтський хрест | 6 |

## Змінні оточення

Файл `backend/.env`:
```
PORT=3000
BOT_TOKEN=токен_від_BotFather
WEBAPP_URL=https://your-domain.com
ADMIN_KEY=секретний_ключ
```

## Розгортання

1. Отримати BOT_TOKEN у @BotFather
2. Задеплоїти фронтенд (або роздавати через Express як статику)
3. Встановити WEBAPP_URL на публічний URL
4. Налаштувати Menu Button в боті через @BotFather → Bot Settings → Menu Button
