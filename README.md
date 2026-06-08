# Fauck Zini — тапалка про Вову Зинченко 💪

Кликер в стиле Hamster Kombat. Тапай Вову, зарабатывай зинкоины, качай улучшения.

## Локальный запуск

```bash
npm install
npm start
```

Открой http://localhost:3000

Или просто открой `index.html` в браузере.

## Деплой на Railway

1. Залей репозиторий на GitHub (инструкция ниже).
2. Зайди на [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Выбери репозиторий `fauck-zini` (или как назовёшь).
4. Railway сам определит Node.js по `package.json` и запустит `npm start`.
5. В настройках сервиса: **Settings → Networking → Generate Domain** — получишь публичную ссылку.

Дополнительная настройка не нужна: порт берётся из переменной `PORT`, healthcheck — `/`.

## Залить на GitHub

```bash
cd D:\FauckZini
git init
git add .
git commit -m "Initial commit: Fauck Zini tap game"
git branch -M main
git remote add origin https://github.com/ТВОЙ_ЮЗЕР/fauck-zini.git
git push -u origin main
```

Создай пустой репозиторий на GitHub заранее (без README, чтобы не было конфликта).

## Механики

- **Тап** — зарабатываешь зинкоины (тратится энергия)
- **Энергия** — восстанавливается со временем
- **Улучшения** — протеин, зал, креатин, футболка и др.
- **Прогресс** — сохраняется в браузере автоматически

## Стек

Статический фронтенд (HTML/CSS/JS) + минимальный Node-сервер для Railway.
