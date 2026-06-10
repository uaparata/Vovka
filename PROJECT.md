# Fauck Zini — обзор проекта

Тапалка про Вову Зинченко: кликаешь по фото, зарабатываешь зинкоины (💪), покупаешь улучшения и Pokemons. Вход через Google — прогресс в PostgreSQL (или `data/store.json` локально).

## Быстрый старт

```bash
npm install
cp .env.example .env   # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET
npm start              # http://localhost:3000
```

Подробнее: [docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md)

## Структура репозитория

| Путь | Назначение |
|------|------------|
| `index.html` | Разметка UI |
| `game.js` | Клиент: UI, localStorage, синхронизация с API |
| `game-logic.js` | Общая логика (сервер + можно переиспользовать): тап, пассив, покупки, merge сейвов |
| `server.js` | Express, OAuth, REST API |
| `db.js` | PostgreSQL / JSON file |
| `styles.css` | Стили, анимации Pokemons |
| `assets/level-*.png` | Фото Вовы по уровням (1–17) |
| `assets/pokemon/` | Спрайты Mullin и BITCOIN (idle + sheet) |
| `Pokemons/` | Референсы и превью персонажей |
| `scripts/` | Python: сборка спрайтов из Funko-референсов |

## Игровые системы

### Уровень Вовы (`maxLevel`)

- Растёт только вверх: `syncMaxLevel()` берёт `max(levelFromBalance, сохранённый maxLevel)`.
- Пороги баланса — `PHOTO_LEVELS` в `game.js` / `game-logic.js`.
- **Никогда не сбрасывать** при merge сейвов — см. исправления в `savesWithProgress()`.

### Pokemons

- Конфиг: `POKEMONS` в `game.js` и `game-logic.js` (должны совпадать).
- **Mullin** (`kirill`): апперкот, `play-uppercut`, 6 кадров.
- **BITCOIN** (`bitcoin`): световой меч, `play-lightsaber`, 6 кадров (pdstyle poses 1–4, 6, 7).
- Ферма: 4 слота, цены `[0, 100K, 1M, 10M]`.
- Пассивный доход: `applyPokemonPunches()` по `punchIntervalMs`.

### Сохранения

- Гость: `localStorage` (`fauckzini_save_guest`, `fauckzini_save_u_{id}`).
- Google: сервер авторитетен для покупок/тапов; при входе **merge** локального и облачного через `mergeSaveStates` / `mergeSaves`.
- Пустой сейв (все нули) — `isFreshResetSave()`; такие сейвы **не должны** затирать прогресс при merge.

## API (основное)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/me` | Текущий пользователь |
| GET | `/api/save` | Загрузить сейв |
| POST | `/api/tap` | Тап (авторизованный) |
| POST | `/api/tick` | Пассив + энергия (каждые 5 с) |
| POST | `/api/buy-upgrade` | Улучшение |
| POST | `/api/buy-pokemon` | Купить Pokemon |
| POST | `/api/upgrade-pokemon` | Прокачать Pokemon |
| POST | `/api/pokemon-deploy` | В бой / убрать |
| POST | `/api/save/reconcile` | Слияние клиент ↔ сервер |

## Спрайты BITCOIN

Источник: `Pokemons/bitcoin-bts-funko/bitcoin-poses-raw.png` (pdstyle poses 1–4, 6, 7).

```bash
python scripts/process-bitcoin-sprites.py
```

Выход: `assets/pokemon/bitcoin-idle.png`, `bitcoin-sheet.png`.

## Известные проблемы и фиксы

См. [docs/BUGS.md](docs/BUGS.md).

## Для нового чата / бота

1. Прочитай этот файл и `docs/INSTRUCTIONS.md`.
2. Логика сейвов — **критично** в `game-logic.js` (`mergeSaves`, `reconcileSaves`, `isFreshResetSave`).
3. UI покупок — event delegation в `initShopPanels()`, не вешать `click` при каждом `render()`.
4. Анимации Pokemon — только `background-position` в CSS, без `translateY` (иначе «скролл» в слоте).
