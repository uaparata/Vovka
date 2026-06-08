# Fauck Zini — тапалка про Вову Зинченко 💪

Кликер в стиле Hamster Kombat. Тапай Вову, зарабатывай зинкоины, качай улучшения. Вход через Google — прогресс сохраняется в облаке.

## Локальный запуск

```bash
npm install
cp .env.example .env
# заполни GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET
npm start
```

Открой http://localhost:3000

Без `DATABASE_URL` используется SQLite (`data/game.db`) — удобно для разработки.

## Google OAuth — настройка

1. Открой [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Создай проект (или выбери существующий)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
4. Тип: **Web application**
5. **Authorized redirect URIs** — добавь оба:
   - `http://localhost:3000/auth/google/callback`
   - `https://ТВОЙ-ДОМЕН.up.railway.app/auth/google/callback`
6. Скопируй **Client ID** и **Client Secret**

## Деплой на Railway

### 1. PostgreSQL (обязательно для продакшена)

В проекте Railway: **+ New → Database → PostgreSQL**

Railway автоматически добавит переменную `DATABASE_URL` в сервис с игрой.

### 2. Переменные окружения

В сервисе с игрой → **Variables**:

| Переменная | Значение |
|------------|----------|
| `GOOGLE_CLIENT_ID` | из Google Console |
| `GOOGLE_CLIENT_SECRET` | из Google Console |
| `SESSION_SECRET` | случайная строка (32+ символа) |
| `BASE_URL` | публичный URL Railway, напр. `https://vovka-production.up.railway.app` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | подставится автоматически из Postgres |

### 3. Деплой

```bash
git add .
git commit -m "Add Google auth and cloud saves"
git push
```

Railway пересоберёт проект автоматически.

## Как работает сохранение

- **Без входа** — прогресс только в `localStorage` на устройстве
- **С Google** — прогресс синхронизируется с сервером каждую секунду
- При входе: если локальный прогресс больше облачного — он загружается в облако
- Сессия живёт 30 дней

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/auth/google` | Вход через Google |
| POST | `/auth/logout` | Выход |
| GET | `/api/me` | Текущий пользователь |
| GET | `/api/save` | Загрузить прогресс |
| PUT | `/api/save` | Сохранить прогресс |

## Стек

HTML/CSS/JS + Express + Passport (Google OAuth) + PostgreSQL / SQLite
